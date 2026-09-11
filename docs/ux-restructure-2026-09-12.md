# Epoch UX 架构重构 · 审计与实施计划（2026-09-12）

> 定位：UX Architecture + Interaction System + Motion System 整体重构的实施依据。
> 执行纪律：本文件先于一切代码修改；每个问题按「现象 → 原因 → 策略」映射；完成后由 judge 视觉验收 + 测试回归关闭。

---

## 1. Current UI Audit（现象 → 原因 → 策略）

| # | 现象 | 分类 | 根因 | 策略 |
|---|---|---|---|---|
| A1 | 首页内容前连续堆叠 3 个大型视觉块：DateNavigator（大）→ DayProgress（白卡）→ WeatherCard + EventsReminder（两卡并列） | Visual Hierarchy / Density | 上下文组件被提升到卡片级地位；「上下文」与「内容」争夺第一视觉 | 日期区只做 Temporal Navigation；DayProgress 去卡化为细条（服务时间轴）；天气降级为 header 内一行 `☀16° 晴`；完整天气卡移入 Progress；EventsReminder 删除（与事件卡重复） |
| A2 | 三卡切换仅 Tap，指示器瞬间跳变 | Interaction / Motion | 分段控件只实现了选择态，没实现空间态 | SegmentedPager：内容区手势跟手拖动、指示 pill 连续位移、松手按距离+速度吸附 |
| A3 | 完成控制在标题左侧，视觉抢占阅读起点 | Interaction / Visual | 沿用清单类 App 惯性 | Trailing CompletionControl：标题=Primary 左，完成=Trailing 右；44pt 命中区；○→◉→✓ 分段动画 |
| A4 | Sheet 打开生硬、只能点遮罩关闭、无拖拽 | Interaction / Motion | Sheet 只有进场关键帧，无手势层、无退场动画 | Sheet v2：拖柄+头部可下拖跟手，位移/速度双阈值判定 dismiss 或回弹；统一退场动画；所有弹层继承 |
| A5 | 新建任务表单：每字段一个块、垂直松散、字段长得都像按钮 | Component / Density | 未区分 Data Field 与 Action Button；无分组语义 | Field Groups（身份/分类/日程/对齐）；日期/时间/时长改为「数据行」（label+value+chevron，内联展开选择器）；仅真正的快速多选保留 Chip |
| A6 | 动画各自为政、无退场、无弹簧语言 | Motion | token 只有时长/ease，无组件级 motion 规范 | Motion tokens（进场/退场/吸附/完成）+ 统一 easing；退场=进场镜像 |
| A7 | 手势只有行内左滑删除；页面切换无手势 | Gesture | 手势系统未定义 | 统一手势语言：横滑=翻卡（空白区）、长按+横拖=任意处翻卡（与行左滑用 pagerLock 仲裁）、下拖=关 Sheet、行左滑=删除（保留） |
| A8 | 二级（表单）过松 vs 首页过密 | Density Rhythm | 单一间距节奏套所有页面 | Density Rhythm：Today=Dense / Create=Medium-Dense（组内 sp-3、组间 sp-5）/ Detail=Medium / Me=Sparse |
| A9 | DayProgress 独立白卡抢视觉 | Visual Hierarchy | 容器暗示「主角」 | 去容器、细线化、宽度贴内容列，紧贴 tab 区上方——它是时间轴的刻度，不是英雄区 |
| A10 | 玻璃材质使用已有纪律但浮层退场无动画削弱「层」感 | Motion / Material | 同 A4 | Sheet v2 覆盖；玻璃仍只用于 nav/sheet/toast/AI 面 |

**不做**：IA 级导航变更（3 Tab 已正确）；新增页面；任何玻璃扩张。

## 2. Information Architecture Map（不变，补归属标注）

```
Today（执行层·Dense）
  Header：今天 · 9月12日 [☀ 16° 晴]        ← Temporal Context + Secondary Context(一行)
  DayProgress（细条，无卡）                  ← Time Horizon，服务下方时间轴
  SegmentedPager ─┬─ 任务（待办/已完成/随时 seg + TlRow 列表 + heavy 守护）
                  ├─ 事件（Timeline：有时间任务的行列表）
                  └─ 收集箱（捕获 + 规划今天 + AI 分拣 + 行列表）
  Habits（今日打卡条）
Progress（回顾层·Analytical）: 数据表 → 70天点阵 → 天气卡（Secondary Context 完整形态）→ 目标 → 周复盘 → 反思 → 历史
Me（身份层·Sparse）: 头像指标 → 方向卡 → 记录组 → 系统组
浮层: TaskSheet(large, G1-G4) / GoalSheet / RoutineSheet / 安排 Sheet / AISuggestSheet / Focus
```

## 3. Before / After（Today 结构）

**Before**：日期条 → [DayProgress 白卡] → [WeatherCard][EventsReminder] → seg(瞬切) → 各自内容 → 习惯条
**After**：日期条 → DayProgress 细条 → SegmentedPager(任务|事件|收集箱，跟手) → 内容页 → 习惯条；天气压缩进 header 一行；天气完整卡、EventsReminder 移出首页。

## 4. Component Hierarchy（重构后）

```
design/tokens（+motion tokens）
components/ui
  primitives: Button IconButton Chip Tag Field Note Checkbox Row EmptyState Metric Insight
  surfaces:   Card Sheet(v2: 拖拽关闭+退场+tall) Panel
  patterns:   SegmentedPager(跟手 pager+滑动 pill) DateNavigator DayProgress TlRow
              CompletionControl(新, trailing 44pt) TaskFieldRow(新, 数据行) HabitChip
              Gauge Pbar DotMatrix WeatherCard(→Progress) AIPreview
features/pages: HomePage TaskSheet(G1-G4) ProgressPage MePage GoalPanel HealthPanel Focus Onboarding
```

## 5. Motion System（新增 token + 规范）

| 场景 | 规范 |
|---|---|
| Sheet 进场 | translateY 100%→0，`--dur-4` `--ease`；scrim fade 同步 |
| Sheet 退场 | 0→100%，240ms `--ease`（进场镜像）；scrim fade-out |
| Sheet 拖拽 | 跟手无过渡；松手回弹 300ms `--ease`；dismiss 按 `dy>120 或 v>0.6px/ms` |
| Pager 吸附 | 260ms `--ease`；拖拽期无过渡、track/指示 pill 同一 `--pager-x` 变量驱动 |
| Completion | ○ 缩放 .92→1 + accent-soft 填充 200ms；✓ 描边 250ms `--ease-spring`；标题划线 200ms |
| 列表切换 | 页内容 fade+translateY(4px) 200ms（pager 自带） |
| Edge case | reduced-motion：全部降为瞬时 |

## 6. Gesture System（统一语言）

| 手势 | 作用域 | 行为 |
|---|---|---|
| 横滑（起点=非行区/空白/标题） | Pager 内容区 | 翻卡，跟手 |
| 长按 400ms + 横拖 | Pager 内容区任意处（含行上） | 翻卡；期间 body 标记 pagerLock，行左滑让位 |
| 行内横滑 | TlRow/InboxRow | 左滑露删除（保留原语义） |
| 下拖 | Sheet 拖柄+头部 | 跟手下移，双阈值 dismiss/回弹 |
| 遮罩点击 | 保留为次要关闭 | 主关闭=下拖 |
| Esc | 全部浮层 | 保留 |

仲裁规则：pointerdown 落在 input/button/checkbox/role=tab 上→pager 不接管；行内起点→行优先；长按武装后 pager 优先（pagerLock）。

## 7. Design Token Strategy

新增（tokens.css motion 段）：`--dur-out: 240ms`（退场）、`--dur-snap: 260ms`（吸附）、`--ease-drag: cubic-bezier(.2,.9,.25,1)`（跟手回弹）。其余复用既有 `--dur-1..5 / --ease / --ease-spring`；间距沿用八档（组内 sp-3、组间 sp-5 的 Medium-Dense 节奏属用法规范，不新增档位）。

## 8. Implementation Order

P1 tokens → P2 Sheet v2（拖拽+退场+tall）→ P3 CompletionControl + TlRow 重排 → P4 SegmentedPager（含长按仲裁+pagerLock）→ P5 TaskSheet G1-G4 重组（数据行）→ P6 HomePage 重构（header 合并天气、DayProgress 细条、接入 pager、删 EventsReminder 用法）→ P7 天气完整卡迁 Progress → P8 测试/E2E 适配 → P9 QA（门禁+截图 judge）。

## 9. Potential Regression Risks

| 风险 | 缓解 |
|---|---|
| Sheet 退场动画延迟卸载 → 既有测试断言 dialog 立即消失会挂 | 测试改 `waitFor(queryByRole('dialog'))`；e2e 已有 400ms+ 等待 |
| Pager 横滑与行左滑冲突 | 起点仲裁 + pagerLock；e2e 行操作起点都在行上（不受影响） |
| TlRow 完成控件换边 → a11y/测试选择器破坏 | CompletionControl 用 role="checkbox"+aria-checked+同 label，位置无关 |
| TaskSheet DOM 重组 → getByLabelText/按钮名破坏 | 保留「标题」label、「保存」按钮名；仅外观分组 |
| 删 EventsReminder → 事件提醒信息丢失 | 信息由「事件」tab 承担（同一数据源），无信息损失 |
| 天气卡迁 Progress → Progress 过载 | 放页首作为环境 Secondary Context，密度 Analytical 可容纳 |
| pagerLock 残留导致行左滑失效 | pointerup/cancel 必清；E2E 覆盖行左滑删除用例 |

---
*批准后按 §8 顺序实施；每阶段出门=tsc+vitest+build 绿。*
