# AI 架构（Phase 6 定版）

> 状态：Phase 6 实施期定版。后续变更请改本文件并 PR。
> 适用范围：所有 AI 调用走本文定义的契约；新增能力必须扩 `src/shared/ai-schema.ts` 的 `AI_ABILITIES` 枚举与 `aiContextSchema` 输入边界。

---

## 1. 目标与红线

**目标**：在不暴露密钥、不直写库、不阻塞核心流程的前提下，让 LLM 把用户真实数据（direction / goals / tasks / inbox / routines / energy / 14 天历史）转成可逐条确认的 Proposal。

**红线**（任一违反 = 拒绝合并）：
1. **密钥永远只出现在服务端**（`functions/api/ai.ts` + Cloudflare 环境变量）。前端 bundle 不得含 `AI_API_KEY` / `AI_API_TOKEN` 任何字符串。
2. **AI 只产 Proposal**，永不直接写库。所有"落库"动作必须由用户在前端逐条点确认触发。
3. **输出经 zod 白名单校验**。任何超出 `proposalTypeSchema` 枚举的动作类型一律 `502 bad_model_output`，前端据此提示。
4. **AI 不可用不影响产品其余功能**。503 / 502 时 `requestAI` 返回 `{ ok: false, error }`，UI 走"AI 暂不可用"占位，不 throw、不破坏 Today / Plan 路由。

---

## 2. 三能力清单

定义在 `src/shared/ai-schema.ts` 的 `AI_ABILITIES` 常量。当前三个：

| Ability | 用途 | 输入边界 | 输出期望 |
|---|---|---|---|
| `plan_day` | 给今天生成现实可行的计划：填空白、把 open inbox 转 scheduled task、把过期主任务往后挪。 | 完整 `AIContextDTO` | 0–6 个 proposal（多为 `create_task` / `move_task`） |
| `sort_inbox` | 把 Inbox 里 open item 三选一：转 create_task（必带 date + time + refInboxId）/ 暂缓 / 丢弃。 | Inbox 列表 + today 时间窗 | 0–6 个 proposal（**每条必须带 `refInboxId`**） |
| `review_observer` | 周复盘观察者：输出 0–3 条 observations + **恰好 1 条** `adjust_note` proposal。 | 14 天 `recentStats` + goals pct | observations + 1 个 adjust_note |

> 调用频次：三个能力均为**低频单次**调用，**不流式**（await fetch 一次性拿结果，max_tokens=1200）。

---

## 3. 数据契约（共享 schema）

**位置**：`src/shared/ai-schema.ts`（前后端共享；服务端 import 校验输出，客户端 import 校验输入）。

### 3.1 Request

```ts
{ ability: 'plan_day' | 'sort_inbox' | 'review_observer', context: AIContextDTO }
```

### 3.2 Context（输入）

由 `src/lib/ai-client.ts` 的 `buildAIContext()` 从 Zustand store 序列化：

| 字段 | 范围上限 | 用途 |
|---|---|---|
| `lang` | `'zh' \| 'en'` | 输出语言（提示词用） |
| `today` | `YYYY-MM-DD` | 时间锚 |
| `direction` | statement 200 字 + wake/sleep/work HH:MM | 行为窗口 |
| `goals` | ≤ 10 个 active goal + pct 派生 | 战略目标 |
| `todayTasks` | ≤ 20 个 | 今日冲突点 |
| `inbox` | ≤ 20 个 open item + ageDays | 待分流原始材料 |
| `routines` | ≤ 20 个 | 固定习惯 |
| `energy` | `'low' \| 'normal'` | 决定建议密度 |
| `recentStats` | 14 天 | 趋势信号 |

**安全约束**：context 字段均为用户自己产生的本地数据；不含凭据 / 第三方标识 / IP。

### 3.3 Response（输出）

```ts
{
  proposals: Array<{
    id: string,
    type: 'create_task' | 'move_task' | 'create_routine' | 'adjust_note',
    title: string (≤120),
    detail?: string (≤280),
    date?: 'YYYY-MM-DD',
    time?: 'HH:MM',
    durMin?: integer 5–240,
    goalId?, refInboxId?, refTaskId?
  }> (≤8),
  observations?: string[] (≤3, ≤240 each)
}
```

**白名单动作**：
- `create_task`：新增任务（落库需用户点确认）
- `move_task`：改时间/日期（必带 `refTaskId`）
- `create_routine`：新增 routine
- `adjust_note`：只改 goal/period 的 note 字段

**禁止动作**（即便模型"想"做也拒）：`delete_*` / `archive_*` / `change_*_id` / 任何外溢字段。服务端 parseModelOutput 后 zod `safeParse` 失败一律 502。

---

## 4. Provider 抽象（服务端）

**位置**：`functions/api/ai.ts`

```
请求进入 → aiRequestSchema.safeParse → 选 provider → provider.complete(prompt) → parseModelOutput → zod 校验 → 200 / 4xx / 5xx
```

### 4.1 Provider 选择

```
if (env.AI_BASE_URL && env.AI_API_KEY && env.AI_MODEL)  →  OpenAI 兼容
else if (env.AI_ACCOUNT_ID && env.AI_API_TOKEN)           →  Cloudflare Workers AI（默认）
else                                                        →  503 ai_not_configured
```

### 4.2 Cloudflare Workers AI（默认）

- 模型：`@cf/meta/llama-3.1-8b-instruct`
- 端点：`https://api.cloudflare.com/client/v4/accounts/<id>/ai/run/<model>`
- 鉴权：`Authorization: Bearer <AI_API_TOKEN>`
- 入参：`{ messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], max_tokens: 1200, temperature: 0.3 }`
- 提取：`data.result.response`（Worker AI 包装层）
- 计费：免费额度内（llama-3.1-8b ~$0 / 1000 req）

### 4.3 OpenAI 兼容适配器（备选）

- 触发：环境变量三件套齐（`AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL`）
- 端点：`<AI_BASE_URL>/chat/completions`
- 鉴权：`Authorization: Bearer <AI_API_KEY>`
- 入参：同上 + `response_format: { type: 'json_object' }`（强制 JSON 模式）
- 适用：DeepSeek / GLM / OpenAI / 自部署 vLLM 等

### 4.4 切换方法（运维）

```
# 切到 DeepSeek 免费档
wrangler pages secret put AI_BASE_URL    # https://api.deepseek.com/v1
wrangler pages secret put AI_API_KEY     # sk-...
wrangler pages secret put AI_MODEL       # deepseek-chat
```

---

## 5. SYSTEM 提示词（与 provider 解耦）

```
You are the planning assistant inside Epoch, a calm personal-OS app. You read the user's real data
(direction, goals, today's tasks, inbox, routines, energy, recent completion) and output ONLY strict
JSON — no markdown, no prose.

Schema:
{"proposals":[{"id":"p1","type":"create_task|move_task|create_routine|adjust_note","title":"...",
"detail":"...","date":"YYYY-MM-DD","time":"HH:MM","durMin":30,"refInboxId":"...","refTaskId":"..."}],
"observations":["..."]}

Rules:
- At most 6 proposals; at most 3 observations.
- Every proposal must reference real context items when moving/creating (use refInboxId / refTaskId
  when applicable).
- Respect wake/sleep/work windows; never schedule outside them; prefer gaps; low energy => suggest
  fewer/lighter items.
- Calm, non-judgmental tone. Never punish. Titles in the user's language (context.lang).
```

能力级 prompt 模板（`buildPrompt(ability, ctxJson)`）：

| Ability | 模板 |
|---|---|
| `plan_day` | "Task: suggest a realistic plan for TODAY. Fill free gaps: order by importance; convert open inbox items (refInboxId) into scheduled tasks; reschedule overdue main tasks (refTaskId) if the day is heavy." |
| `sort_inbox` | "Task: triage the open inbox items. For each, propose either create_task (with a concrete time/duration that fits the day or tomorrow) — always set refInboxId." |
| `review_observer` | "Task: weekly review observer. Output up to 3 observations (patterns from recentStats/pct, e.g. overload days) and exactly 1 proposal of type adjust_note describing the one change for next week." |

---

## 6. 降级与错误码

| 状态 | 触发 | 前端处理 |
|---|---|---|
| `200` | 成功且 zod 校验通过 | 渲染 `AIPreview`（逐条勾选） |
| `400 bad_json` | 请求体不是合法 JSON | 几乎不会发生（前端发） |
| `400 bad_request` | zod 校验请求体失败 | 同上 |
| `502 provider_error` | provider.fetch 非 2xx（`workers_ai_<status>` / `openai_compat_<status>`） | "AI 服务暂时不可用" + 重试按钮 |
| `502 bad_model_output` | 模型输出 JSON 不在 schema 内 | 同上 |
| `503 ai_not_configured` | 两个 provider 都没配置 | "AI 暂未启用" + 隐藏建议入口 |
| `network`（客户端 catch） | fetch 抛错（CSP / 离线 / 域名） | "AI 暂不可用，请检查网络" |

**降级原则**：**AI 失败不影响产品其余功能**。Today / Plan / Goals / Inbox 路由都不依赖 AI。`AISuggestSheet` 在 AI 不可用时整体不显示入口，**不显示半成品 UI**。

---

## 7. CSP 与前端调用

`_headers` 已配置：

```
connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net
```

> 注意：当前 CSP **未含** `https://api.cloudflare.com` 与 OpenAI 兼容端点。这是有意的——所有 AI 流量都经 `same-origin` 的 `/api/ai` 代理，前端**永远不直连** LLM 端点。Pages Function 在服务端发起 fetch，绕开浏览器 CSP。

`src/lib/ai-client.ts` 的请求：

```ts
fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ability, context }) })
```

---

## 8. 拒绝记忆（rejection memory）

**位置**：`src/lib/ai-client.ts`，localStorage key `epoch-ai-rejected`。

**机制**：用户点过"拒绝"某条 Proposal（按 `type::title` 哈希），下次同 key 不再出现在结果里。保留最近 100 条。

**用途**：避免"AI 反复提同一建议"——审计 §22 的"非羞辱、可退出"原则。

**清理**：提供 `clearRejectionMemory()` 工具函数（在 Me 页"重置 AI 建议"按钮调用，Phase 7 计划）。

---

## 9. E2E 模拟（CI）

`VITE_AI_MOCK=1` 环境变量 → `src/lib/ai-client.ts` 检测到后**不发真请求**，改走固定 fixture（3 个 create_task Proposal + 1 个 observation）。

**位置**：`src/lib/ai-client.ts` 的 stub 分支（实施 PR-5 E2E 时落地）。

**CI 注入**：`.github/workflows/ci.yml` 的 e2e job 加 `env: VITE_AI_MOCK: '1'`。

**本地开关**：`localStorage.setItem('epoch-ai-mock', '1')` 也可触发（用于手测）。

---

## 10. 安全审计清单（Phase 6 必查）

- [ ] `grep -r "AI_API_KEY\|AI_API_TOKEN" dist/` → 0 命中（前端的 `VITE_` 前缀过滤已生效，但需在 build 后确认）
- [ ] `grep -r "sk-" functions/ src/` → 仅命中 `functions/api/ai.ts` 的 `Bearer <key>` 模板字符串
- [ ] `_headers` 中 `connect-src` 不含 LLM 端点
- [ ] `aiRequestSchema` / `aiResponseSchema` 两侧 import 同源（`src/shared/ai-schema.ts`）
- [ ] `parseModelOutput` 不放过任何越权字段（`delete_*` / `archive_*` / `update_*_id`）

---

## 11. 已知限制

- **不能流式**：当前 await 一次性拿结果；大 context（接近 20 个 goal）+ 长 prompt 可能 2–5s 延迟。Phase 7 评估 SSE 化。
- **不能记忆对话**：每个 request 独立，无 chat history 概念。需要历史走 localStorage。
- **不能跨用户**：单租户，所有 context 是当前用户本地数据。
- **不能改 schema**：AI 不产 migration SQL；schema 变更走 `supabase/migrations/0006+`。

---
*定版于 Phase 6。`src/shared/ai-schema.ts` 与 `functions/api/ai.ts` 是唯一权威源；本文件是规约说明。*
