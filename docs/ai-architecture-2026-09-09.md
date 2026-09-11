# Epoch AI 架构（2026-09-09 实施）

> 原则继承：AI 是 context-aware system component，不是聊天框；AI assists, user decides。
> 参考佐证：shadkhan/LifeOps（MIT）的 review-before-save 模式与本实现逐条同构。

## 1. 数据流

```
真实实体(store) → lib/ai-client.buildAIContext() 序列化（direction/goals+pct/今日任务/inbox 年龄/例程/能量/14 天统计）
  → POST /api/ai（Cloudflare Pages Function，key 仅服务端）
    → provider 抽象：
        ① Cloudflare Workers AI（默认免费）：env.AI_ACCOUNT_ID + AI_API_TOKEN → @cf/meta/llama-3.1-8b-instruct
        ② OpenAI 兼容：env.AI_BASE_URL + AI_API_KEY + AI_MODEL（DeepSeek/GLM 免费档一键切换）
    → zod 白名单校验（shared/ai-schema.ts：create_task/move_task/create_routine/adjust_note）
  → AIPreview（Preview→Confirm）：逐条勾选，观察项只读
  → Apply：复用 services/actions（refInboxId→convertInboxItem；create→createTask…）——AI 永不直接写库
```

## 2. 三能力

| 能力 | ability | 入口 | 输出 |
|---|---|---|---|
| Plan My Day AI 档 | plan_day | 规划今天 sheet 底部「AI 规划建议」 | ≤6 条建议（排任务/改期/转收集箱项） |
| 收集箱分拣 | sort_inbox | Plan 收集箱「AI 分拣」 | 每条 inbox 项一个带时段的 create_task |
| 周复盘观察员 | review_observer | Progress 周复盘「AI 观察」 | ≤3 条观察 + 1 条 adjust_note |

## 3. 红线（测试锁定，src/test/ai.test.tsx）

1. 未确认绝不落库（预览阶段断言 tasks/inbox 不变）。
2. 白名单外动作类型 / 非法 JSON / 损坏输出 → 前端提示并丢弃，零副作用。
3. 拒绝记忆：未采纳建议（type+title）记入 `epoch-ai-rejected`，再次生成被过滤。
4. key 永不出服务端；前端仅知 503=未配置。

## 4. 环境变量（Cloudflare Pages 设置）

- 免费默认：`AI_ACCOUNT_ID`、`AI_API_TOKEN`（Workers AI）
- 切换 OpenAI 兼容：`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`
- 未配置：功能整体降级为提示，不影响产品其余部分。
