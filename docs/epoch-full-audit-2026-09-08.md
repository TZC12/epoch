# EPOCH FULL AUDIT REPORT（2026-09-08）

> 依据用户 43 节审计大纲落成的总审计报告。整合：本次全仓库扫描（2 轮独立探查 + 逐点代码验证）、docs/product-audit-2026-09-07.md（产品）、docs/design-audit-2026-09-07.md + design-system-proposal.md + form-audit-2026-09-08.md（设计）、docs/visual-system-research-2026-09-08.md（图标/动效选型）。
> 审计期间未修改任何产品代码。本文档第 23 节 Refactor Plan 已获用户批准（决策记录见 §24）。

---

## 1. Product Summary

**Epoch / 时 — A Personal Operating System for Becoming.** Shape your time. Shape yourself.

Epoch 不是 Todo、不是 Habit Tracker、不是 Calendar、不是 Life OS 仪表盘。核心价值：**把一个人的长期方向，逐渐转化成现实中的目标、计划、行动，并根据真实行动结果持续调整未来。**

核心闭环：Direction → Goals → Routines → Tasks → Today → Action → Evidence → Progress → Review → Adjustment → …

核心问题不是"我今天完成了多少任务"，而是"我今天做的事情，是否让我更接近我想成为的人"。

目标用户（产品作者即首位用户）：有固定主业、用早晚空档推进长期方向的人。需要的是"每天最多 3 件重点 + 失败后修复而非惩罚 + 周复盘用真实数据回答方向对不对"。

## 2. Current Product State

- **线上形态**：单文件 `index.html`（4,125 行 ≈ 245KB：CSS 951 行 + HTML 510 行 + JS 2,639 行），零运行时 npm 依赖，部署 Cloudflare Pages（`scripts/inject.mjs` 注入占位符），Supabase 承担认证 + 整个状态以一坨 JSON 存 `app_state` 表（800ms 防抖 upsert）。
- **导航**：底部 4 Tab（Today / Plan / Progress / Me）+ 5 个 push 面板（goal/weekly/settings/health-connect/health）+ 5 个底部 Sheet + Focus 全屏 + Onboarding 覆盖层 + hash 深链路由。
- **已成立的闭环**：日级闭环（Capture→Schedule→Today→Complete→快照）端到端为真。M1 数据统一已落地（详见 §16 KEEP 列）。
- **已断裂的闭环**：周级闭环（Review→Adjust）只有 oneThing→Inbox 一条窄路；目标闭环（Goal 自治）缺 CRUD；例程闭环双写未合。
- **死端清单**（onboarding 之后无入口）：Direction 编辑、Goal 创建/编辑/删除、例程创建/编辑、习惯独立于例程的创建。Plan My Day 是固定模板假生成且 `.md-row` 无 CSS。周复盘重进不回填（旧答案被覆盖丢失）。健康数据为未标注硬编码假值、断开无确认。signOut/resetDemo 未绑定任何 UI。
- **技术债**：整个产品状态是 JSON blob（无关系查询/无派生/无并发合并）；i18n 靠中文 DOM 文本遍历器（ZH2EN ~120 词条 + MutationObserver）硬翻，23 处 toast 中文游离字典外；13 个 jsdom 测试套件无聚合 runner；无 lockfile、无 CI；`src.legacy/` 是死掉的 React 旧实现（50 文件）。

## 3. Core Product Problem

**"真实的 Today + 一圈半成品系统"**：Today 是全 App 唯一完全成立的页面；Me/Plan/Progress 布满"看得出想做但没做完"的部分——不是缺功能，是**承诺了的数据关系没有兑现**（Direction 说"判断是否值得"但不可编辑、Goal 说"进度"但曾硬编码、Review 说"改变未来"但只有一条窄路、Plan My Day 说"生成建议"但是固定模板）。产品逻辑问题 > 视觉问题 > 工程问题，但三者互相纠缠：JSON blob 数据层使"派生"不可能，单文件使组件统一不可能。

## 4. Current Strengths（必须保留的资产）

1. **修复式姿态贯穿**：删除可撤销（4.2s undo toast）、跳过不惩罚（skip≠done 已解耦）、改期有推荐位、跨日自动 rollover 且保留昨日快照、文案永无"你失败了"。
2. **无假数据原则**（日级）：仪表盘/70 天点阵/goal pct 全部真实计算。
3. **唯一强调色纪律**：accent 绿只用于"完成/活跃"语义；墨色主按钮（N1 定版）。
4. **能量感知**：睡不好 → Run 改 Walk 的降强度建议（规则真实，输入 Demo）。
5. **完整 token 地基**：语义色浅深双套、七级字阶、八档间距、四级 elevation 已定义（docs §11 定版）。
6. **Lucide 图标统一 + 0 依赖 Canvas 粒子背景**（reduced-motion 感知、失焦暂停）。
7. **测试文化**：13 套 jsdom 套件（正则字面量 gate + 行为断言）。

## 5. Critical Problems（P0，按严重度）

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| C1 | 周级闭环 Review→Adjust 只有 oneThing→Inbox 一条路；复盘重进不回填（覆盖丢失） | `wr-save` L3909-3924 无回填 | 复盘价值存疑，产品核心承诺落空 |
| C2 | Direction/Goal/例程 onboarding 后零 CRUD（死端） | direction 卡无绑定；goal 仅 onboarding 创建 L3562 | 长期层不可维护 = 不是 OS 是快照 |
| C3 | 数据层是一坨 JSON blob（app_state） | 0004 迁移；`save()` 全量 upsert | 派生/关系/并发全不可能，是一切上层问题的根 |
| C4 | Plan My Day 固定模板假生成 + `.md-row` 零 CSS 裸奔 | `buildSuggested` L3120；grep 无 .md-row | "AI Planning"承诺为空，UI 破相 |
| C5 | Goal 面板"关联例程(2)/关联任务(4)"是静态演示 HTML | L1236-1247 永不重渲染 | 假数据伤害信任（违背自身无假数据原则） |
| C6 | 健康数据未标注 Demo + 断开连接无确认 | L1573-1579 硬编码；L3048 直接 wipe | 无假数据原则破口 + 误操作不可逆 |
| C7 | i18n 架构脆弱：中文遍历器 + 23 处游离 toast 中文 + renderProgress 硬编码 | L1925-2056；'真实进度' L2892 | 英文体验随时破，新增字符串必然漏 |

## 6. UX Problems

1. **死端**：见 §2 死端清单——每个死端都是"进得去出不来/写了就丢"。
2. **状态缺失**：todayState 的 empty/loading/error/completed 四态不可达（生产代码从不赋值）；按钮无 disabled/loading 态；云同步失败静默（60s 节流 toast 有，但无重试入口）。
3. **可逆性不均**：删除有 undo；但 md-accept **整条时间轴替换无确认**、断开健康无确认、跳过无 undo。
4. **表单体验**：周复盘 placeholder 当 label；reschedule 仅 4 个固定日期无自定义；sheet 底部 6 按钮过挤且三个完成语义动作同屏（skip 解耦后已缓解，布局未收敛）。
5. **空态/引导**：Onboarding 后无"下一步"指引；Plan 下半屏空白健康但缺主动作引导。
6. **流程长度**：创建目标 4 步（仅 onboarding）、安排 inbox 3 步（好）、复盘 3 步（好）；主要问题不在步数在断路。

## 7. UI Problems

1. 112 处硬编码 font-size vs 8 处 token 引用；132 处硬编码间距 vs 10 处；35 处硬编码动效时长 vs token 3 处引用。
2. 11 种按钮形态（btn-p/g/q/d/sm/auth-btn-dark/toast-act/focus-start/dtp-nav/back/tl-add）；9 种玻璃卡面；chip 三语义混用 + 双重定义残留（.chip.sel 另立选中态 L874）。
3. ~25 处游离 hex（#E0655A/#E8A13D/#C4453C 三种红并存）。
4. 71 处 inline style（HTML）+ 46 处（JS 模板串）。
5. 死 CSS：.tag-now/.tag-next、enterIn、.note .acts 等。
6. 对比度：--text-tertiary(45%≈3.4:1) 大量用于 meta 正文级信息、disabled(30%≈2.2:1) 出现在可读场景；对比度纪律只约束了 caption 用 45%，未约束"哪些信息允许用 caption 级"。

## 8. Information Architecture Problems

导航 4 Tab 结构正确（spec 验证过），问题在内容归位：
1. **Me 页仍有半假区**：Direction 卡不可点、例例行只读无入口、空行残留（L1207）。
2. **Progress 页职责已矫正**（点阵+目标+反思，重复的今日% 已删）但页题硬编码中文、缺周维度切换。
3. **桌面形态缺失**：>1024px 只是居中手机框（设计文档有意为之），用户大纲 §16 明确要求桌面左侧边栏——本轮迁移按大纲执行。
4. **层级总体健康**：screen→panel→sheet→inline picker 最深 4 级 + Escape 逐级回退 + 全层 hash 深链，无需推翻，迁移时保持该层级语义。

## 9. Data Model Problems

1. **app_state JSON blob**：无关系、无类型、无派生、全量重写、无并发合并——P0 之根。
2. **habits 是 routines 的物化副本**：applyOnboarding 时一次性派生，之后例程变更永不反映到 Today（双写）。
3. **goals.pct 字段死存**：显示永远用 goalPct() 计算，存储值是死重。
4. **完成=布尔翻转**：rollover 靠 30s 定时器重置数组——用 completed_at 日期记录后此 hack 可整体删除。
5. **Event 无实体**：现由带 time 的 task 承担（正确方向），应显式定档"Event=带时间的 Task"而非新表。
6. **history 快照手工维护**：应由 tasks+habit_logs 查询派生。
7. **旧表废弃**：0001/0002 的 day_themes/routine_templates/daily_tasks/goals/reflections 等表与线上 app_state 双轨，从未被线上代码使用（RPC generate_daily_tasks/apply_completion 亦死）。

## 10. Architecture Problems

1. 4,125 行单文件：CSS/HTML/JS 混居，改一处回归全身；正则字面量测试是症状不是解。
2. 状态管理 = 全局对象 + 各 handler 各自改数组再各自 render：无唯一写入口（M1 已收敛数据形状，但写入仍散）。
3. 无包管理器 lockfile、node_modules 与 package.json 脱节（395 个孤儿包含 MUI/tailwind/vite，wrangler 反而缺失）、jsdom 未声明却在使用。
4. supabase-js 走 CDN 动态加载（jsdelivr，2 次重试）——CDN 失败则云同步/登录全灭。
5. 无 CI、无 lint、构建=字符串替换。
6. `src.legacy/` 死代码 50 文件在库。
7. CSP 依赖 'unsafe-inline'（注入版本脚本）。

## 11. AI Problems

- **现状：零 AI**（grep AI/assistant/copilot/llm/openai 无命中；"生成建议日程"是规则模板）。
- 产品审计 §15 判断"先闭环后 AI"仍成立，但用户已决策本轮引入真实 LLM（决策记录 §24）。
- 引入必须满足的红线（全部继承自既有原则）：AI 是 context-aware system component 不是聊天框；Understand→Generate→**Preview→Confirm**→Apply；拒绝被记住；建议必须可落成真实数据变更；无 AI 感装饰；key 永不进前端。

## 12. Responsive Problems

1. 375-480 主设计域健康（safe-area、44px 触控、reduced-motion）。
2. 桌面=居中手机框（480px 封顶），无桌面布局；用户大纲要求 ≥1024 左侧边栏。
3. 768 平板区间落 430 全幅渲染（可接受，维持单列不做双栏）。
4. `#tl-add` 34px 触控偏小（hit inset 补偿存在）；chips 32px 偏小。
5. 无横屏处理（手机框形态下可接受）。

## 13. Accessibility Problems

1. 全文件仅 10 处 aria-label；习惯 chips、建议 dots、目标卡是不可聚焦/无标签的可点 div。
2. 时间轴行/收集行/目标行均 div+click，无键盘路径。
3. 表单 placeholder 当 label（capture/复盘/反思）。
4. 对比度：45%/30% ink alpha 用于可读文字场景（§7.6）。
5. 做得对的：:focus-visible 全局 ring、toast role=status aria-live、auth 错误 role=alert、<nav>/<section> 语义、44px 触控、reduced-motion 全覆盖。
6. i18n 遍历器不翻 aria（有 ZH2EN_ARIA 补丁即症状）。

## 14. Performance Problems

1. 单文件 245KB 无压缩无分割（gzip 后估 ~55KB，尚可但无缓存分层）。
2. supabase-js CDN 动态加载阻塞 boot（2 次重试）。
3. MutationObserver 全 DOM 遍历（i18n）常驻。
4. 粒子背景已有 DPR cap 2、失焦暂停、reduced-motion 静帧（合规，保留）。
5. 无代码分割、无图片（无图片可优化项）、字体全系统栈（合规）。
6. 迁移后收益：按路由分割、tree-shaken lucide-react、无遍历器。

## 15. Design System Problems

docs/design-audit §1 六类量纲失控问题中，**已解决**：语义 token 全量定义（P1）、白 alpha 9 档、radius 5+1 档、elevation 4 级、进度可视化 4→2（.pbar）、节标签三样式收敛、主按钮墨色定版、skip 解耦。**未解决**：字阶/间距/动效时长的存量迁移（112/132/35 处）、按钮 11 形态收敛、游离 hex、inline style、组件八态矩阵（disabled/loading/error 普遍缺失）。
**迁移语境下的结论**：不在旧文件上继续打磨，将 docs §11 定版 token 逐字移植进新工程，组件从第一行起按八态矩阵建——存量问题随旧文件退役自然清零。

## 16. Feature Inventory · Keep / Merge / Delete

| 处置 | 功能 | 理由/去向 |
|---|---|---|
| **KEEP** | Today 全套（时间轴/仪表/建议卡/rollover/左滑删除+undo/专注计时） | 产品心脏，语义 1:1 移植 |
| **KEEP** | Inbox + 快速捕获 + 安排流（→真实 date） | M1 已真，Schedule 环节正确起点 |
| **KEEP** | 任务 CRUD/tier/紧急/undo；Goal 挂靠 + goalPct 派生 | 闭环已通，补 CRUD（§C2） |
| **KEEP** | 70 天点阵 + 每日快照 | 改为查询派生 |
| **KEEP** | 周复盘（真保存 + oneThing→Inbox） | 补回填 + 历史 + Adjust 多通道 |
| **KEEP** | 能量感知规则 + 健康连接状态机 | 规则真；输入标 Demo（§C6） |
| **KEEP** | Onboarding 7 步（目标已真落库） | 步骤落库语义保留 |
| **KEEP** | i18n 中英 / 主题三态 / 深链路由 / auth+云同步 | 架构换血：i18next / 新表 / react-router |
| **MERGE** | Event → Task(time)（显式定档，不建独立表） | 不为一事建两模 |
| **MERGE** | habits ← routines 物化副本 → routines(定义)+habit_logs(打卡) | docs M10 裁决 |
| **MERGE** | Progress 反思输入 → 周复盘（已完成合并，保留语义） | 单一复盘入口 |
| **MERGE** | 11 种按钮→3 变体+danger；9 种卡面→card 三档；row/item→row | docs §6.2 |
| **DELETE** | todayState 不可达四态（empty/loading/error/completed） | 重写为真状态机（不是删是接线） |
| **DELETE** | .tag-now/.tag-next、enterIn、.note.acts、st.*/ln.*/notif.* 死 i18n 键 | 尸体清扫 |
| **DELETE** | src.legacy/（Phase 6 后）、旧 0001/0002 死表引用、`#state:` 类调试面（若有） | 死代码 |
| **DEFER** | 全局搜索/CommandMenu（docs 明令不做）；通知；PWA SW；Projects 实体 | 见计划"明确不做" |
| **NEW** | Direction/Goal/例程 CRUD、复盘回填+历史、Plan My Day 规则真生成、AI 三能力（preview→confirm） | 均为闭环必需，非功能堆叠 |

## 17. Recommended Information Architecture

```
Today（执行层）: 日期/问候 → 仪表 → 建议卡(条件) → 时间轴(重点≤3 视觉分层) → 习惯条 → 快速添加
Plan（规划层）: 收集箱 / 今天 / 已排 三段 + 捕获输入 + Plan My Day 入口（规则/AI 双档）
Progress（回顾层）: 70 天点阵 → 目标真实 pct → 周复盘卡（回填+历史+oneThing 落地状态）→ 反思
Me（身份层）: Direction 卡(可点编辑) → Goals(真实 pct+状态) → 例程与习惯(入口) → 健康 → 系统(周复盘/偏好/退出)
次级: goal/:id（真实关联数据）/ weekly / settings / health* 面板 + task sheet / direction sheet / routine sheet / reschedule sheet / AI preview sheet
层级规则不变: Tab → Panel(push) → Sheet(bottom) → inline picker；Escape 逐级回退
导航: <768 底部 4 Tab；≥1024 左侧边栏（同 4 项 + 用户区）；768-1024 底部导航单列
```

## 18. Recommended Entity Model

```
Direction 1─1 User（statement, domains[], wake/sleep/work）
Direction 1─N Goal(status: draft/active/paused/completed/archived; ladder jsonb)
Goal 1─N Task(tier: main/block/anytime; status: planned/scheduled/completed/skipped/cancelled; date/time/dur/urgent/completed_at)
Goal 1─N Routine(frequency jsonb; time/dur) ; Routine 1─N Task
Routine 1─N HabitLog(date, value) ← 打卡=日志，非布尔翻转
InboxItem(status: open/converted/dismissed; source) →(converted)→ Task
Review(week_key 唯一; wins/drained/one_thing) →Adjust→ Task/Routine 变更
Event ≡ Task(time≠null)（显式定档）
DaySnapshot → 由 tasks.completed_at + habit_logs 查询派生，不设缓存表
HealthDaily(date, sleep/hr/hrv/steps, source='demo') → EnergyState(派生, 规则可解释)
AIProposal(transient) — AI 只产 Proposal，Apply 复用用户动作
Progress ≡ 派生视图（goalPct / 70天点阵 / 周完成率），零人工维护
```

## 19. Recommended Interaction Model

继承现有三层级（Tab/Panel/Sheet/inline）+ 补状态规则：
- **八态矩阵**（docs §11.8 定版）：所有交互组件 default/hover/pressed/focus/disabled/loading/error/success 全定义；loading=文案+…+opacity，不引入 spinner。
- **可逆性规则**：删除=undo toast；md-accept 与断开健康加确认；skip 提供"改回来"路径。
- **表单规则**：label 显式（不再 placeholder 当 label）；错误内联 field 态；保存按钮 loading 态。
- **键盘/读屏**：行可聚焦（role=button + tabIndex + Enter/Space）、icon-only 必带 aria-label、对比度纪律（正文级信息禁用 45%/30% 档）。

## 20. Recommended Design System

**逐字移植 docs/design-audit §11 + design-system-proposal §5 定版规格**（语义色浅深双套 / 七级字阶 48-32-24-20-16-14-12 / 八档间距 4-8-12-16-24-32-48-64 / radius 5+1 / elevation 4 / opacity + loading 规范 / 九档白 alpha / 动效 6 token：--dur-0/1/2/3/4/5 + 4 ease）。UX Principles（brief §32）写入 design/README 作为组件评审门。

## 21. Recommended Component System

`components/ui`（自建，0 UI 库）：Button(3变体+danger) · IconButton · Field/Input/Textarea · Checkbox · Seg · Chip(filter)/Tag · Sheet · Panel · Toast(3变体) · Row · Card(3档) · Metric · Insight · Note · EmptyState · Gauge · Pbar · TlRow · HabitChip · FocusTimer · AIPreview · Skeleton。明确不做：Drawer/Popover/CommandMenu/Tooltip/DataTable（docs 裁决维持）。图标唯一 family = Lucide（lucide-react，tree-shaken）。

## 22. Recommended AI Architecture

```
用户数据(Supabase) → lib/ai-context.ts 序列化真实上下文
  → POST /api/ai (Cloudflare Pages Function)
    → provider 抽象: ① Cloudflare Workers AI（默认，免费额度，零第三方账号）
                     ② OpenAI 兼容适配器（AI_BASE_URL/AI_API_KEY/AI_MODEL → DeepSeek/GLM 免费档）
    → zod 严格校验 → Proposal[]（仅白名单动作类型: create_task/move_task/create_routine/adjust_note）
  → AIPreview Sheet: 逐条 接受/拒绝 + 全部应用 → Apply 复用 services/actions（AI 永不直接写库）
  → 拒绝记录（proposals_log 本地表）→ 不再重复建议
三能力: Plan My Day AI 档（与规则引擎同一 preview 流）/ Inbox 分拣 / 周复盘观察员(≤3 观察+1 调整)
红线: 无聊天框、无自动写库、无 AI 感装饰、key 仅服务端环境变量
```

## 23. Recommended Development Roadmap（= 已批准的重构计划执行版）

Phase 0 审计文档（本文）→ Phase 1 工程地基+设计系统 → Phase 2 数据层（0005 正式表+迁移器）→ Phase 3 四 Tab 移植（视觉归一）→ Phase 4 闭环补全（死端清理）→ Phase 5 LLM 三能力 → Phase 6 QA/CI/退役 legacy。每阶段出门标准：build+测试全绿+真机截图走查。详见已批准计划（会话记录）。

## 24. 决策记录（2026-09-08 用户确认）

1. **迁移 React/Vite**（放弃单文件延续）；
2. **本轮引入真实 LLM，免费优先**（默认 Cloudflare Workers AI，预留 OpenAI 兼容适配器）；
3. **视觉归一优先**（新代码从设计系统长出，不在旧文件上做存量迁移）；
4. LLM 走 Cloudflare Pages Function 服务端代理，key 只存环境变量。

## 25. 开源参考研究（汇总，详表见 product-audit §18 / visual-system-research §1）

Super Productivity（日总结仪式/顺延修复）、Life_OS（实体极简/修复式姿态验证）、Loop Habit Tracker（频率+不归零+不羞辱，但不采纳数值强度分）、Karim/J0hnWIcks/lifeOS 组（反面验证"模块堆≠系统"）、Lucide（图标唯一 family，ISC）、动效=原生 CSS+WAAPI（拒绝 Motion/GSAP/anime 的具体理由见 visual-system-research §1-3）。

---
*Phase 0 完成。未修改任何产品代码。*
