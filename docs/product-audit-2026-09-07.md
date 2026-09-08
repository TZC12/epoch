# Epoch 产品审计与重构方案（2026-09-07）

> 审计范围：index.html 全部 3857 行（CSS/HTML/JS）、7 个测试套件（175 断言）、docs/epoch-spec-v1.md、git 历史。
> 方法：先代码级审计（Phase 1）→ 开源研究（Phase 2）→ 产品模型（Phase 3）→ 架构与实施计划（Phase 4）。**本文档不修改任何产品代码**；实施需在方案确认后进行。

---

## 1. Product Diagnosis（产品诊断）

**一句话结论：Epoch 的「今天」做得真实且安静，是全 App 唯一真正成立的闭环；但它周身的 Me / Plan / Progress 页布满了"样板间"——看起来有系统，实际没有数据在流动。当前状态是"一个真实的 Today + 一圈静态演示"，尚未形成完整产品系统。**

三个结构性病灶（详见 §8/§9）：

1. **六套并存的"事情"容器**：`tasks / secondary / inbox / week / upcoming / unscheduled` 六个数组各自为政，互通桥只有 3 条单向窄路。安排进"本周"的东西永远到不了 Today（数据只有展示字符串 hint，没有日期字段）。
2. **Goal→Routine→Task 链路是布景**：Goal pct 硬编码 62%/40%，从不因任务完成而变；Routine 不生成任务（Onboarding"生成第一周"是 setTimeout 剧场，`applyOnboarding` 甚至丢弃用户输入的季度目标）；Routine/Habit/Learning/Journal 四个详情面板是纯静态 HTML。
3. **承诺与实现脱节**：设置页的"通知 / 导出 / Main 上限 3 / 日程时段"全是不可点的假行；Weekly Review 三个输入框没有保存逻辑（关闭即丢失）；Focus 计时器与任务无任何数据连接；健康数据是模拟值（规则真实、输入为假）。

---

## 2. Core User（核心用户）

一个有固定主业、用晚上和周末推进长期方向的人（用户画像即产品作者本人）：时间被工作切成两段，真正可控的是早晚空档；不需要团队协作，不需要多设备强同步，最需要的是「今晚这两小时别被随机事件浪费掉」。

## 3. Core Problem（核心问题）

**不是"事情记不下来"（Inbox 到处都有），而是两件事：**
1. 今天：可支配时间有限，事情互相挤——需要一个会说"今天只能做这三件、其余让路"的系统，而不是一个无限清单。
2. 长期：做的事与方向脱节——周复一周，说不清"我这周做的事有没有让我离想成为的人更近"。

现有工具解决 1 的方式是"全列出来+提醒"（制造焦虑）；解决 2 的方式是"目标打卡"（数字游戏）。两者都以惩罚失败为前提。

## 4. Value Proposition（价值主张）

**Shape your time. Shape yourself. —— 一个替你守护"每天最多 3 件重点"、失败时帮你修复计划而不是惩罚你的系统；它记得你做的每件事，并在每周结束时用真实数据回答"方向对不对"。**

支撑点（三个都已有雏形）：
- Main ≤3 + 修复式文案（Move/Reduce/Skip，永无"你失败了"）
- 能量感知（睡不好 → Run 变 Walk，降低强度也算完成）
- 真实记录（无假数据原则：仪表盘/点阵全部来自真实完成）

## 5. Core Advantage（核心优势）

竞品最难复制的不是功能，是**三组一致性**：
1. **修复式姿态贯穿所有交互**（删除可撤销、跳过不追问、改期有推荐位、跨日自动重置且保留昨日快照）——竞品的 streak/惩罚模型与此相反，改过来等于推翻自己。
2. **健康数据只读 + 影响计划而非打分**（低能量 → 降强度建议条；好状态 → 不打扰）。Garmin/Oura 走 Open Wearables 统一接入，不重复造轮子。
3. **Direction 一句话锚点**：所有任务可挂 Goal，Goal 挂 Direction——这是"为什么做"的判断依据，市面 planner 几乎都停在"什么时候做"。

## 6. Core Loop（核心闭环）

**应然闭环（目标态）：**

```
Capture（随手记 → Inbox）
   ↓
Schedule（Inbox 项 → 带真实日期的任务；Main ≤3 强制）
   ↓
Execute（Today 时间轴：勾选 / 专注 / 改期 / 跳过，全可撤销）
   ↓
Record（每日快照 history[date] = {done,total,urgent}）
   ↓
Review（周复盘：读取真实 history + 完成率 + 惯例节奏，写下"下周只改的一件事"）
   ↓
Adjust（那件事变成下周的一个真实调整：改例行时间 / 降上限 / 换时段 → 回到 Schedule）
```

**实然现状（代码级验证）：**

| 环节 | 状态 | 证据 |
|---|---|---|
| Capture | ⚠️ 断 | Inbox **没有主动添加入口**（快速捕获 sheet 已删，只剩 CSS/i18n 尸体）；唯一来源是建议卡"移回"和 Progress 反思 |
| Schedule | ❌ 断 | Reschedule 选项硬编码；结果写入 `week[]`（纯文案 hint），**永远到不了 Today** |
| Execute | ✅ 通 | 时间轴+勾选+编辑+左滑删除+撤销，全真实 |
| Record | ✅ 通 | snapshotFor + rollover + Me 70 格点阵，全真实 |
| Review | ❌ 断 | Weekly Review 输入无处保存；Progress 与 Today 数据重复；habit 无历史 |
| Adjust | ❌ 断 | 无任何"复盘结论→修改计划"的通路；Direction 不可编辑 |

**结论：日级闭环成立（Execute↔Record↔Today），周级闭环（Capture→Schedule→Review→Adjust）全部断裂。**

## 7. North Star Metric（北极星）

**周计划完成率**：`本周完成的计划项 / 本周排入的计划项`（从 history 真实计算，无手工录入）。
- 守护指标（护栏）：**Inbox 腐败率**（入箱 >7 天未安排的条目占比）——防止"先收集"变成心理负担（App 自己的文案承诺了这一点）。
- 反指标（刻意不追踪）：streak、总任务数、打开时长。完成率低于 40% 时，系统的动作是建议减量，而不是显示红色。

## 8. Feature Audit（功能审计：真/假清单）

### 真（端到端可用）
| 功能 | 备注 |
|---|---|
| Auth（登录/注册/忘记密码/用户名解析） | Supabase 真实现 |
| 云同步 + 本地持久化 | app_state 表，800ms 防抖，19 键白名单 |
| 任务 CRUD（sheet-task 全字段表单） | 时间/日期/时长/Goal/Routine/紧急/备注 |
| 完成/删除（左滑+表单）+ 撤销 | deleteTaskUndoable / deletePlanItemUndoable |
| 次要事项勾选 / 习惯当日勾选 | |
| 每日 0 点 rollover + 快照 | 30s 定时 + visibilitychange + boot |
| Me Calendar 70 格四色点阵 | 来自真实 history |
| Today 仪表盘 | 真实计算 |
| 上下文建议卡 ×4 | overdue/heavy/energy/inbox 规则真实（能量输入为模拟） |
| 反思 → Inbox（Progress 页） | 真写回 |
| i18n 中英切换 / 主题切换 / URL 深链 | 主题选择**不持久化**（boot 硬编码 light，bug） |
| 健康连接状态机 + 能量规则 | 规则真实，数据模拟（原型性质，spec 已规划真接路径） |

### 假（静态展示 / 无后续 / 死数据）
| 功能 | 问题 | 定性 |
|---|---|---|
| Me→Direction 面板 | 4 个链路 metric + insight 全硬编码；两个按钮无 handler | 样板间 |
| Goal 详情 | pct 从不重算；Associated Routines/Tasks 静态 | 样板间 |
| Routine 详情 | 100% 静态演示页；跳过/Reschedule/Duplicate/Delete 全死 | 样板间 |
| Habit 详情 | Consistency 84% 假；点阵渲染的是**任务**历史却标成习惯日历；按钮死 | 样板间+语义错位 |
| Weekly Review 面板 | 3 输入框无保存，关闭即丢 | 假承诺 |
| Learning 面板 | 时长假、主题硬编码 | 样板间 |
| Journal 面板 | 2 条假周记，无写入路径 | 样板间 |
| 设置：日程/规划偏好/通知/导出/同步 | 全部静态行，chev 无响应；Main 上限 3 无强制 | 假承诺 |
| Reschedule 弹层 | 选项硬编码（今晚/周四/周六）；结果进 `week[]` 死列表 | 死路 |
| `week[]` `upcoming[]` `unscheduled[]` | 无日期字段；无回 Today 的路；unscheduled 永远为空 | 死数据 |
| Focus 计时器 | 固定 40min 不读任务 dur；结束不回写任何数据 | 孤岛 |
| Onboarding"生成第一周" | setTimeout 剧场；**用户输入的季度目标被直接丢弃**（#ob-goal 无绑定，applyOnboarding 不处理）；"今天有 3 个 Main Task"是文案不是事实 | 假承诺 |
| 通知系统 | 零实现（无 manifest/无 SW/无 Notification API） | 假承诺 |
| `#state:` 调试路由 | 演示工具暴露在生产路由 | 泄漏 |
| 任务 type chips（工作/日常/娱乐…） | 存储了但全 App 无处显示 | 无效字段 |

## 9. Features to Remove / Merge / Keep（处置清单）

### REMOVE（删除或立即降为不显示）
| 项 | 理由 |
|---|---|
| `week[]` `upcoming[]` `unscheduled[]` 三个数组及对应 seg | 与 tasks.date 双轨制是最大混乱源；统一后由 date 派生视图 |
| Learning / Journal 面板 | 无数据来源，无后续价值；Learning 内容可由挂 Goal 的任务天然呈现 |
| Direction/Habit 面板的假 metric 与假 insight | 用真实计算替换，算不出来就不显示（无假数据原则） |
| 设置页全部不可实现的假行（通知×3、导出、同步、日程时段、上限） | 实现一个亮一个；未实现的不展示 |
| `#state:` 调试路由 | 演示泄漏 |
| type chips | 要么在任务行显示 type，要么删（当前两头不沾） |
| CSS/i18n 尸体（.rhythm、qa.*、FAB 残留、adapt.q/d 等无引用键） | 减负 |

### MERGE（合并）
| 项 | 合并到 |
|---|---|
| Progress 页的反思输入 + Me 的 Weekly Review | **一个** Weekly Review（真实读取 history，结论真实保存） |
| Progress 页 Today% / Habits 区块 | 与 Today 仪表盘重复 → Progress 页整体改造（见 §13） |
| `unscheduled` 语义 | 并入 Inbox（都是"没日期"） |
| `routines[]` 中 type:'habit' 的重复条目 | 并入 `habits[]`（数据双写消除） |
| Journal 的存在感 | 由 Weekly Review 的历史记录承担 |

### KEEP（保留并补强）
| 项 | 理由 / 缺什么 |
|---|---|
| Today 全套（时间轴/仪表盘/建议卡/rollover） | 产品心脏，已完成度高 |
| Inbox 概念 | 缺"入口"；补捕获后成为 Schedule 环节的正确起点 |
| Goal（数量克制：onboarding 只写一件） | pct 改为"本周相关任务完成率"自动计算 |
| Habits | 加 frequency 字段 + 真实历史（借鉴 Loop：错过不归零，定性节奏展示） |
| Plan My Day | 生成器改真：从 Inbox 未安排项 + habits 频率 + 空档生成（当前是固定模板） |
| Focus | 接任务 dur；结束时回写"本次完成"或至少累计时长 |
| 健康模块 | 规则层保留；数据接入留待 RN/Expo 阶段（spec 已定 HealthKit/Health Connect 路径），模拟值标注 Demo |
| 方向链 Direction→Goal | Direction 卡可编辑；链路 metric 用真实关联计算 |

### NEW REQUIRED（必须新增的缺失功能）
1. **快速捕获入口**（Inbox 的 +）：Plan 页常驻轻量输入或全局动作；不做表单，一行回车入箱。
2. **真实的安排动作**：Inbox 项 → 日期选择（今天/明天/周几/自定义）→ 写 `tasks.date` → 出现在对应日的 Today。
3. **周复盘数据面板**：本周完成率、与上周对比、Inbox 腐败数、habit 节奏（全部从 history/tasks 计算）。
4. **主题持久化**（一行 bug 修复，单列是因为它属于"承诺了却没做"）。

## 10. Information Architecture（信息架构）

**导航保持 4 Tab（结论：结构正确，内容需归位）：**

```
Today（执行：时间轴 + 仪表盘 + 建议卡）      ← 不动，已是心脏
Plan（收集与安排：Inbox + 快速捕获 + 排程）   ← 五段 seg 收缩为：收集箱 / 本周视图（由 tasks.date 派生）
Progress → Review（周复盘：数据面板 + 三问 + 结论落地）  ← 从"进度复述"变成"闭环的回顾环节"
Me（系统：Direction 卡 + Goals + Habits + Health + Settings）← 删四个样板间面板
```

**次级面板取舍**：Goal 详情保留（真实化）；Routine 详情改为轻量编辑 sheet（频率/时间），不做展示页；Habit 详情并入 Goal 或做成只读真实节奏卡；Health & Devices / Health 摘要保留现状结构。

**页面删除**：Learning、Journal、Direction 大面板（Direction 收进 Me 卡 + 轻编辑 sheet）。

## 11. Data Model（数据模型）与 §12 Entity Relationship

**单一事实来源：`state.tasks` 是唯一任务存储。**

```
Direction(1 句) ──< Goal(数量克制) ──< Task(goal 字段引用)
                        │
                        └──< Habit(goal 可选关联)   ← frequency: 'daily'|'week:3'|'Mon,Wed,Fri'
                                                        history: 每日完成随快照记录
Task { id, title, date|null, time|null, dur, tier:'main'|'block'|'anytime',
       done, urgent?, goal?, routine?, notes? }
       ├── date=null 且 tier=anytime → Today 的"随时"区（原 secondary 并入）
       ├── date=今天 → Today 时间轴
       ├── date=未来 → Plan 本周/以后视图（派生，不另存）
       └── 完成后 → history[dateKey] 快照

Inbox { id, title, created_at, source }   ← 唯一"未决区"，安排即转为 Task 并出箱
history[dateKey] { done, total, urgent, habits?:{habitId:bool}, review?:string }
review[weekKey] { wins, drained, oneThing, appliedTo?:taskId }
```

**派生视图（不再有独立数组）**：今天 = tasks.filter(date==today)；本周 = date∈本周；以后 = date>本周；未安排 = inbox。**展示是查询，不是存储。**

**谁读谁写**：Today/Plan/Review 全部只读派生；写入口收敛为 4 个动作（capture / schedule / toggle / reschedule）+ 1 个生成器（Plan My Day）。

## 13. Event / State Model（事件模型）

单文件 App 不需要事件总线框架，但需要**单一变更函数族**，杜绝"每个 handler 各自改数组再各自 render"：

```
capture(title)            → inbox.unshift            → save+renderPlan
schedule(inboxId, date)   → inbox.remove + tasks.push→ save+renderPlan+renderToday
toggleTask(id)            → task.done 取反           → save(snapshot)+updateDash+goals.recompute
reschedule(id, date)      → task.date 写真实日期      → save+render*
completeHabit(id)         → habit.done + history     → save
rollover()                → snapshotFor(yesterday)+重置 → save+toast
saveWeeklyReview(r)       → review[weekKey] 写入 + oneThing → 下周生成轻提醒任务
recomputeGoalPct(g)       → g.pct = 本周挂该 Goal 的任务完成率（toggleTask 内自动触发）
```

其中 `toggleTask → recomputeGoalPct → save` 这条链是打通 Goal 闭环的最小实现。

## 14. Interaction Matrix（功能连接矩阵，关键行）

| A → B | 关联 | 数据流 | 现状 | 目标 |
|---|---|---|---|---|
| Goal → Task | 双向 | task.goal 引用；goal.pct 由 task 完成率派生 | 单向可选、pct 死 | pct 自动 |
| Task → Today | ✅ | date 过滤 | 通 | 通 |
| Task → Progress(history) | ✅ | snapshot | 通 | 通 |
| Inbox → Task | 断 | reschedule 写死列表 | 死路 | 写 date 成 Task |
| Review → Plan | 断 | oneThing 应化为下周调整 | 无 | 保存 + 转轻提醒/调整项 |
| Habit → Today | 半 | habits 当日勾选，无频率 | 通但无节奏 | frequency 决定出现 |
| Habit → Review | 断 | 无 habit 历史 | 无 | history.habits |
| Health → Plan My Day | ✅ | energyOf → 降强度 | 通（模拟输入） | 通（真输入待 RN） |
| Focus → Task | 断 | 结束不回写 | 孤岛 | 回写完成/时长 |
| Direction → 任务判断 | 断 | 文案承诺"判断是否值得" | 无实现 | task 放弃时显示 Direction 对照（轻实现） |

**整个 App 是否已成为系统？—— 日级是，周级否。本方案的全部工作量就是在补周级。**

## 15. AI Architecture（AI 架构）

**现状：零 AI。判断：这不是缺陷，先闭环后 AI。**

若引入，只允许两个位置（Context-aware component，不做 chatbot）：
1. **Plan My Day 生成器**：规则引擎先行（作息+频率+空档+能量，可解释）；AI 仅当 inbox 积压/冲突复杂时做排序建议，且每条建议必须可落成真实 task 变更。
2. **周复盘观察员**：把 history 变成 ≤3 条观察 + 1 个建议调整（"周三执行率低是因为排了 4 项"），一键应用为计划修改。

红线沿用既有原则：无 AI 感装饰、无对话流、无"看起来智能"的空建议；所有建议可拒绝且拒绝被记住。

## 16. Responsive Strategy（响应式策略）

已完成：520/1024 断点（高度贴合窗口 + 大屏加宽 480px）、safe-area、44px 触控、reduced-motion、暗色。移动端为第一设计（非桌面缩小版），方向正确。
待办：① 720–1024 平板区间维持居中手机框即可（单列是该产品的身份，不做双栏仪表盘）；② 尺寸单位审计（px→rem/clamp 迁移列为低优先技术债，视觉输出稳定的前提下不动）；③ 超宽屏（>1600）保持 480px 框，不随波加宽。

## 17. Design System（设计系统）

已有 token 体系（ink×4 / accent×4 / glass×3 / r×4 / dur×3）与复用组件（btn/seg/sheet/empty/metric/insight/toast），基础健康。
需修：① `.chip` 双重定义冲突（32px 圆角16 vs 8px padding 圆角99，后者全层覆盖）——合并为一套；② 删除无引用的组件 CSS（.rhythm、qa、FAB）；③ empty/loading/error 三态在剩余页面全覆盖检查（Plan 派生视图、Review 新面板必须三态齐备）。

## 18. GitHub Research（开源研究）

| 项目 | 学到什么 | 用 / 不用 |
|---|---|---|
| **Super Productivity**（MIT，21k★） | Day-plan 一等公民；**Daily Summary 仪式**（一天结束出总结）；错过的任务**自动顺延**而非消失；plan→track→review 全部基于同一份任务数据 | 用：日总结仪式、顺延式修复。不用：时间账单级追踪、集成生态、复杂度 |
| **Life_OS**（MIT，agent 驱动） | "You do the doing, the agent does the designing"——系统设计/维护与执行分离；两个名词（Habits+Tasks）撑起全部模型；明确拒绝 XP/排行/因糟糕一天而变红 | 用：修复式姿态的验证、实体极简主义。不用：MCP agent 基础设施（远超当前阶段） |
| **Loop Habit Tracker**（GPLv3） | habit 强度衰减但不归零（错过几天不清零）；灵活频率（每周 N 次）；不羞辱设计 | 用：frequency 字段 + 真实历史、定性节奏展示。不用：数值化强度分（违反 Epoch "不打分"原则——展示"节奏稳定/不稳"，不展示分数） |
| **Life-os-project / Re-Life / LifeOS**（反面教材组） | 11 模块 + 小组件墙 + 每日名言 = 典型"功能集合不系统"；dashboard 堆积正是 Epoch 立项时反对的东西 | 验证定位：Epoch 的"少而连"即差异化。全部不采纳其形态 |
| **lifeOS**（ghassanelgendy） | "intent 与 evidence 住在一起"；Plan week → Run today → Review trends → Adjust 的表述与 Epoch 应然闭环一致 | 佐证架构方向 |

**Inspired by 总结**：周级闭环的每一个环节（日总结、顺延、频率习惯、复盘观察）都被上述项目验证过"为什么成立"；Epoch 的差异化在于把四者缝进一个 4 Tab 的安静系统，并用能量与方向层做别人没有的两条连接线。

## 19. Architecture Proposal（架构提案）

保持单文件 + localStorage + Supabase 云同步（当前阶段正确；工程复杂度与应用规模匹配）。改动是**结构性的，不是重写**：
1. 数据层：state 收缩（删 3 数组、合并 habits/routines 双写）+ 派生函数族（todayTasks/weekTasks/inboxTasks 已有雏形）。
2. 动作层：§13 的 8 个变更函数成为唯一写路径；render 函数只读。
3. 视图层：删 4 个静态面板 + Plan seg 收缩 + Progress→Review 改造；新增 capture 输入与 review 数据面板。
4. i18n：renderProgress 硬编码中文收敛进 I18N 字典（消灭 ZH2EN 对动态内容的兜底依赖面）。

## 20. Implementation Roadmap（实施路线）

| 里程碑 | 内容 | 验收 |
|---|---|---|
| **M1 数据统一**（先行，1-2 天） | 删 week/upcoming/unscheduled；reschedule 写真实 date；inbox→task 安排流；快速捕获入口；secondary 并入 tasks(tier:'anytime')；theme 持久化修复 | 旧测试改造后全绿；"Inbox 安排→明天 Today 出现"端到端测试 |
| **M2 闭环补全**（2-3 天） | toggleTask→goal.pct 自动；habit.frequency + 真实节奏；Weekly Review 保存 + oneThing 化为下周调整；Direction 可编辑 + 链路 metric 真实计算 | 周级六环节矩阵全"通"；新增闭环测试套件 |
| **M3 生成器与专注**（1-2 天） | Plan My Day 从 inbox+routines+空档真生成；Focus 读 dur、结束回写 | 接受建议后 Today 与建议一致 |
| **M4 清理**（1 天） | 删静态面板/假行/死 CSS/调试路由；type chips 决策落地；.chip 合并；i18n 收敛 | 假数据扫描测试（断言 DOM 无硬编码演示值） |
| **M5 远期** | PWA manifest+离线、真健康接入（RN 阶段）、通知（先做 1 条 20:30 规划建议） | — |

## 21. Testing Strategy（测试策略）

延续 jsdom 断言套件（现有 7 套 175 断言全部保留并随 M1 改造）：
- **M1 新增**：`flow.test.mjs`——capture→schedule→次日 rollover→出现在 Today 的全链路；死数组不存在的结构断言。
- **M2 新增**：`loop.test.mjs`——任务完成→goal.pct 变化；weekly review 保存→oneThing 出现；habit 频率出现规则。
- **M4 新增**：`no-fake.test.mjs`——扫描 DOM/初始化 state，断言无硬编码演示数据（62%、84%、4h 20m 等）。
- CDP 真机验证沿用（每里程碑三档视口 + 关键交互走查）。

---

## 22. 最重要的最终判断（15 问）

1. **这个产品到底是什么？** 一个替你把"每天可支配的两小时"和"季度方向"连起来的安静执行系统。
2. **它不是什么？** 不是 Todo 清单、不是习惯打卡器、不是日历、不是 Life OS 仪表盘、不是 AI 聊天产品。
3. **用户为什么需要它？** 因为所有现有工具要么无限罗列制造焦虑，要么用 streak 惩罚失败；没有任何工具替用户做"减到 3 件 + 失败后修复"这两个决定。
4. **为什么每天打开？** 早上：知道今天只有哪几件、现在该做哪件；晚上：看见真实的完成。
5. **为什么持续使用？** 因为周复盘用他自己的真实数据说话，且每次复盘都会落成下周的一个具体改变——数据变成调整，调整变成计划，计划值得被打开。
6. **最核心的功能是什么？** Today 时间轴（含 ≤3 重点与完成记录）。
7. **最大的竞争优势？** 修复式姿态 × 能量感知 × 方向锚定的一致性——单点都可抄，三者的贯穿性抄不走。
8. **当前最没用的功能？** Learning 与 Journal 两个静态面板；其次是 `week/upcoming/unscheduled` 三张死列表。
9. **当前最混乱的地方？** Plan 页：五个分段下面是四套互不相通的数据，其中"安排"动作把事情送进永远看不见的地方。
10. **只留 5 个功能？** Today 时间轴、Inbox+真实安排、每日快照点阵、Weekly Review（真）、Goal（自动 pct）。
11. **只留 3 个？** Today、Inbox+真实安排、Weekly Review。
12. **只留 1 个？** Today 时间轴 + 勾选。
13. **最值得继续投入？** 周级闭环（M2）：它把已成立的日级闭环升级为系统。
14. **应立即停止投入？** 任何新面板/新统计/新 AI 功能；通知系统（在真 PWA 之前是空承诺）。
15. **当前是否已形成闭环？** **日级闭环成立，周级闭环断裂——产品尚未成为它文案里承诺的那个系统。** 按本路线补齐 M1+M2 后，闭环即成立。

---

*审计人：产品/架构/QA 三视角复核。本文档为 Phase 1–4 产物；Phase 5（实施）等待对 §9 处置清单（尤其 REMOVE/MERGE 项）的确认。*
