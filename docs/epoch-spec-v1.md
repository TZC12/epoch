# Epoch · 时 — 第一阶段设计规范 v1

> A personal system for becoming. / 一套帮助人持续成为自己的个人生活系统。
> 品牌核心：Shape your time. Shape yourself. / 掌握时间，塑造自己。

线上版本：`index.html`（仓库根，20 屏，含深浅色，Supabase 云同步）。

---

## 一、产品本质

不是 Todo、不是 Habit Tracker、不是 Calendar、不是 Life OS Dashboard。

**本质：把「长期方向」转化为「今天可以执行的行动」。**

核心链路：

```
Direction → Goals → Routines → Tasks → Today
    ↑                                    ↓
Reflection ← Progress ← Completion ← 完成
```

设计思想：**Reduce decisions. Reduce noise. Increase clarity. Build consistency.**

用户不是来管理 App 的，App 是来帮用户管理生活的。

### 三条行为红线

| 不要说 | 要说 |
|---|---|
| 「你今天只完成了 62%，继续努力！」 | 「今天还有 2 个重要任务。」 |
| 「You failed your habit.」 | 「Move to tomorrow?」 |
| 「请重新安排今天。」 | 「Here's a suggested day.」 |

---

## 二、目标用户与核心问题

年轻成年人：工作时间长、兴趣多、想提升自己，但行动力与规划能力不稳定，容易一次安排过多然后放弃。

他们真正缺的不是更多功能，而是两个答案：

1. **今天到底应该做什么？**
2. **我为什么现在做这个？**

Epoch 只解决这两件事。

---

## 三、信息架构（IA）

```
Epoch
├── Today          今天（核心页，打开即见）
├── Plan           规划空间
├── Progress       进展（非鸡血 Dashboard）
└── Me             个人长期系统
```

底部导航**只有**这 4 个 Tab，不增加一级入口。次级页面用 push 导航，进入时底部 Tab 收起。

---

## 四、页面树

### Today（主）
- Header：问候语 · 日期 · 今日进度 `3 / 6 completed`
- Timeline：时间作为结构线索，**不包在卡片里**
- Main：最多 3 项
- Secondary：次要任务（无玻璃背景，弱化）
- Habits：今日习惯小卡
- 负载提醒：`Your day looks heavy.` → Move / Reduce / Skip
- 空状态：`Your day is clear.`
- 完成态：`Everything is done.`

### Plan（主）
- 分段：Inbox / Today / This Week / Upcoming / Unscheduled
- 周条（7 天，今日高亮）
- Adaptive 建议卡：修复计划，不惩罚
- Plan My Day 入口 → Suggested Day → Accept / Adjust

### Progress（主）
- 分段：This Week / This Month
- Completion 大数字
- This Week 指标：Learning / Exercise / Habits / Sleep
- 7-day rhythm（细柱，无网格无坐标轴）
- Insight（一句判断 + 一个可执行建议）
- Reflection：`One thing to improve next week.`

### Me（主）
- Direction 卡 + 链路可视化 `Direction → Goals → Routines → Today`
- Goals（当前层级）
- Routines & Habits
- System：Weekly Review / Preferences / 查看首次引导

### 次级页面（push）
- **Direction** — Where are you going + 链路健康度 + 未关联任务提醒
- **Goal Detail** — 3Y / 1Y / Quarter / Month / Week 层级（只展开当前层）+ Progress + Current Focus + Next Step + Associated Routines / Tasks
- **Routine Detail** — 频率 / 时间 / 命中率 + Routine Items + Skip / Reschedule / Duplicate
- **Habit Detail** — Consistency / Frequency / Reminder + Calendar 点阵 + 节奏建议
- **Weekly Review** — 三个问题，重点一个
- **Preferences** — Appearance / Schedule / Planning Preferences / Notifications / Data

### 弹层（Bottom Sheet）
- **Task Detail** — Duration / Goal / Routine / 时间 / Notes
  操作优先级：`Complete > Reschedule > Skip > Delete`，Delete 用 destructive
- **Quick Add** — 只输入标题 → Inbox → 建议时段
- **Plan My Day** — Suggested Day → Accept / Adjust
- **Reschedule** — 推荐空档，附判断依据

### 全屏
- **Focus** — 任务名 / 倒计时 / Start。无装饰
- **Onboarding** — 7 步

---

## 五、首次使用流程（7 步，约 40 秒）

```
Welcome（选默认作息 / 自己设置）
  → Schedule（起床 · 睡觉 · 工作时间）
  → Routines（勾选想开始的）
  → Direction（一句话 + 领域）
  → Goals（本季度一件事）
  → Generating（生成第一周）
  → Today
```

原则：**用户第一次进入 App 必须很快得到一个可工作的 Today。**
写不出 Goal 可以跳过，Today 依然可用。

---

## 六、数据模型

```
User 1 ── 1 Direction ── N Goal ── N Routine ── N RoutineItem
                                      │
                                      └─ N Task ── 1 TimeBlock
                                                 └─ N Completion

Habit ── N Completion
Week ── 1 Reflection
Settings / Notification / Schedule
```

| 实体 | 关键字段 |
|---|---|
| Direction | statement, domains[] |
| Goal | level(3Y/1Y/Q/M/W), title, progress, currentFocus, nextStep, domainId, routineIds[] |
| Routine | name, repeat(Daily/Weekly/Monthly/Custom), time, duration, goalId, hitRate |
| RoutineItem | routineId, time, title, note |
| Task | title, time, duration, tier(main/secondary/block), goalId, routineId, notes, done |
| Habit | name, frequency, reminder, consistency, calendar[] |
| Completion | taskId/habitId, date, value |
| Reflection | weekKey, wentWell, wastedTime, oneThing |

关系：`Direction 1→N Goals`、`Goal 1→N Routines`、`Routine 1→N RoutineItems`、`Routine → Tasks`、`Task → TimeBlock`、`Task → Completion`、`Week → Reflection`

---

## 六之二、健康助手（Health Assistant）

> 对应长期方向中的 **Energy-aware planning**。不是把 Epoch 做成健康 App，而是让身体数据**影响今天的规划**。

### 产品定位

- Epoch 不记录健康数据，只**读取**系统健康层已有的数据。
- 不做健康 Dashboard。健康数据只回答一个问题：**今天的身体，适合什么样的日程？**
- **不打分**（不做 Readiness Score / 恢复指数）。参考 Gentler Streak 的做法：定性描述 + 具体行动建议。
  - ❌「你的恢复分是 62」
  - ✅「昨晚 6h 20m，比平时少 1h。Run 改成 Walk 20 min？」
- **数据背书的休息**：睡眠不足时，系统是建议减量而不是鼓励硬撑——休息是计划的一部分，不是失败。
- **隐私红线**：健康数据只读、留在设备本地处理、不用于任何广告/画像。App Store 5.1.3 合规。

### 数据来源（避免重复造轮子）

| 平台 | 方案 | 说明 |
|---|---|---|
| iOS / Apple Watch | `@kingstinct/react-native-healthkit`（首选）或 `react-native-health` | HealthKit，需 Expo development build（Expo Go 不支持原生模块）。只申请读权限，且**在使用场景里才弹授权**，不在启动时弹 |
| Android / 小米 / 华为 / 三星 | `react-native-health-connect` | Google Health Connect，安卓生态统一健康层 |
| Garmin / Polar / Suunto / Whoop / Oura / Fitbit | **Open Wearables**（开源，MIT） | 统一 REST API + OAuth 连接 + 数据归一化/去重，47 种数据类型。参考实现：github.com/bartmichalak/open-wearables-demo |

原则：**用户已有的健康层（Apple 健康 / Health Connect）就是数据源，Epoch 只做一次系统级授权，不需要用户逐个设备绑定。** 第三方表环走 Open Wearables 兜底。

### 数据模型

```
HealthSource ── N HealthDailySummary ── 1 EnergyState（派生）
```

| 实体 | 关键字段 |
|---|---|
| HealthSource | type(apple-health / health-connect / garmin / oura...), connected, lastSyncAt, scopes[](sleep / heartRate / workouts / steps) |
| HealthDailySummary | date, sleepHours, sleepStages{}, restingHR, hrv, steps, activeEnergy, workouts[] |
| EnergyState（派生，不落库也可） | date, level(low / normal / high), reasons[], suggestion |

### 能量感知规则（第一版，简单可解释）

```
low：    sleep < usual - 1h，或 hrv 连续 3 天下降
         → 建议：Run 改 Walk 20 min；晚间 Learning 减半；Main 上限 3 → 2
normal： 正常生成
high：   sleep ≥ usual 且 hrv 上升趋势
         → 不额外鼓励加量（Epoch 不推人）
```

usual = 近 14 天均值（**基线需要约 2 周数据**，首次接入时明确告诉用户）。

### 健康助手出现在哪里

| 位置 | 形态 |
|---|---|
| Me → Health & Devices | 数据源管理：连接 / 断开 / 同步范围 / 最近同步时间 / 隐私说明 |
| Me → Health | 今日身体摘要：睡眠、静息心率、HRV 趋势、步数（四行，不做图表墙） |
| Today | 能量低时，时间轴上方出现一条**温和建议**（与 Adaptive 同形态）：「昨晚睡得少。Run 改成 Walk 20 min？」Accept / 保持 |
| Plan My Day | 生成时带入 EnergyState，自动降强度 |
| Progress | Sleep / HRV / 静息心率标注数据来源；周节奏中加入睡眠节奏 |
| Onboarding | 新增可选一步：连接健康数据（可跳过） |

### 文案示例（保持 Epoch 语气）

- 「昨晚 6h 20m，比平时少 1h。今天把 Run 改成 Walk 20 min？」
- 「连续 3 天 HRV 下降。这周的训练量可以收一点。」
- 「身体状态不错。照常就好。」（状态好时不推任何东西）
- 「数据来自 Apple 健康 · 刚刚同步」（来源透明）

---

## 七、设计系统

### 视觉定位
Soft Glass + Frosted Glass + Aurora Gradient + Pastel Gradient + Minimal UI

**Soft Glass 只是视觉材质，不是产品核心。**

明确不要：紫蓝霓虹、高亮发光、玻璃卡片堆满页面、AI SaaS Dashboard 感、科技感过重、大量 icon、复杂渐变按钮、粒子、3D 装饰、过度圆角。

### 颜色

Aurora 背景（大范围 / 柔和 / 低透明度 / 模糊 / 缓慢移动 / 不形成明显圆形色块）：

```
#DCE8FF  #E6E0FF  #F7F8FF  #FFFFFF
```

文字层级（用明度而非颜色建立层级）：

```
--ink-1 #22252A  标题 / 任务
--ink-2 #4B5058  正文
--ink-3 #8A9099  次要
--ink-4 #B2B8C1  弱提示
```

唯一强调色（只用于「完成 / 进行中 / 活跃」）：

```
--accent      #5BAE82
--accent-ink  #3C8A61
--accent-soft rgba(91,174,130,.13)
```

Destructive：`#C46464`

Glass：

```
surface  rgba(255,255,255,.50 ~ .62)
border   1px rgba(255,255,255,.55 ~ .72)
blur     26px ~ 34px
shadow   0 8px 32px rgba(60,70,100,.055)   ← 极低强度，禁止厚重阴影
```

### 排版

| 级别 | 字号 / 行高 | 字重 |
|---|---|---|
| 页面标题 | 32 / 1.14 | 600 |
| 面板标题 | 26 / 1.20 | 600 |
| 卡片标题 | 19 / 1.34 | 600 |
| 正文 / 任务 | 16 / 1.45 | 500 |
| 次要 | 14 / 1.50 | 400 |
| Caption | 12 / 1.50 | 400 |

字体：SF Pro / Inter / Noto Sans SC。
禁止：超粗体、大段粗黑文字、营销式大标题、大量全大写、过度字重对比。

### 圆角与动效

```
--r-xl 28  --r-lg 24  --r-md 20  --r-sm 14
--ease cubic-bezier(.32,.72,.24,1)
页面切换 .26s · 弹层 .38s · 状态 .18s
```

尊重 `prefers-reduced-motion`。

### 深色模式

深色 Frosted Glass：背景 `#0D0F13`，glass 改为 `rgba(255,255,255,.055~.085)`，Aurora 换成低亮度冷色 `#1B2740 / #241F3D / #16283A`。支持 System / Light / Dark。

---

## 八、核心视觉原则

1. **Task is the hero. Chrome stays quiet.** 任务是主角，界面保持安静。
2. 不为填空白而增加内容。
3. 不每个模块都放进卡片。
4. 不每个组件都做玻璃效果。
5. 不用颜色代替层级。
6. 用空间、字号、位置和明暗建立层级。
7. 信息少 ≠ 功能少。
8. 极简不是删除产品能力，而是让当前不需要的信息不出现。
9. 每个页面都有明确的第一 / 第二 / 第三视觉。

新增任何 UI 前先问：

- 用户此时真正需要什么？
- 这个信息是否影响当前决策？
- 删掉它，用户还能完成当前操作吗？
- 它是否只是为了让页面看起来更丰富？

---

## 九、组件清单

```
AppShell · BottomTabBar · GlassSurface · Timeline · TimelineItem
TaskRow · HabitChip · RoutineRow · CalendarStrip · ProgressSection
BottomSheet · QuickAdd · FocusTimer · GoalSection · DirectionSection
Insight · Reflection · SegmentControl · LoadNote · EmptyState
```

不为「组件化」制造无意义组件，不使用默认 Card Grid 铺满页面。

---

## 十、状态清单

| 状态 | 文案 | 说明 |
|---|---|---|
| Inbox 空 | `Nothing waiting.` | 无插画、无营销话术 |
| Today 空 | `Your day is clear.` | 提供 Plan My Day 出口 |
| 全完成 | `Everything is done.` | 一句「去生活」 |
| 加载 | Skeleton | 不跳动、不闪烁 |
| 错误 | 说明数据没丢 | 提供重试，不指责 |
| 负载过重 | `Your day looks heavy.` | Move / Reduce / Skip |
| 任务未完成 | 建议改期，附判断依据 | 不显示 Failed |

---

## 十一、通知原则

只允许三类：Important task / Routine reminder / Planning suggestion。

不要：每小时提醒、焦虑式文案、连续天数警告、排行榜、XP、Badges、Productivity score。

---

## 十二、技术架构（目标形态）

```
React Native · Expo · Expo Router · TypeScript
本地优先：SQLite（expo-sqlite / op-sqlite）
状态：Zustand      数据获取：TanStack Query
结构：Feature-based
  /features/today  /features/plan  /features/progress  /features/me
  /features/goals  /features/routines  /features/habits  /features/focus
共享：/components  /design-system  /lib  /data
```

不要把代码写进 `App.tsx`，App 只负责组合页面。

### 当前仓库状态

现有 `src/` 是一套旧的 SOP 任务应用（MUI + Supabase + 3 Tab），与 Epoch 愿景不一致：

- 只有 Today / Plan / Profile 三 Tab，缺 Progress 与 Me 体系
- 数据模型是 `daily_tasks + templates`，无 Direction / Goal / Routine / Habit
- 视觉是 MUI 卡片 + Tailwind，与 Soft Glass / Aurora 设计语言无关
- 工程本身健康：`tsc -b` 通过、28 个测试全绿、`vite build` 成功

**当前状态**：`index.html` 已作为线上版本部署（Cloudflare Pages + Supabase）。旧 React 版源码归档于 `src.legacy/`，仅作参考。

---

## 十三、验收标准

1. 第一眼知道当前最重要的任务
2. 页面不拥挤，有明显呼吸空间
3. Glass 不成为视觉噪音
4. Aurora 只负责氛围
5. 文本层级明显
6. 任务比 UI chrome 更突出
7. 无无意义 icon
8. 无无意义 badge
9. 无 fake metrics
10. 无为「高级」而加的元素
11. 所有核心操作可单手完成
12. 交互路径简单
13. 不需要理解复杂产品逻辑就能开始用

---

## 十四、长期方向（第一阶段不实现）

Smart planning · Adaptive schedule · Context-aware suggestions · Energy-aware planning · Travel planning · Learning planning · Career planning

第一阶段先把 **Today / Plan / Progress / Me / Direction / Goals / Routines / Tasks** 做扎实。
