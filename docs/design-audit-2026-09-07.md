# Epoch 商业就绪审计 · 设计系统统一分析（2026-09-07）

> 定位：**分析报告，非实施记录。** 遵循约束「先分析、后改码」：本文档完成前未修改任何产品代码。
> 审查基准：把 Epoch 当作准备上架 App Store / Google Play 的商业软件审查。
> 方法：SoftwareCompany 工作流 —— 产品经理（许清楚）产品侧审计 + 架构师（高见远）设计侧审计 + 交付总监合成。
> 总原则：**Delete / Merge / Simplify / Unify / Connect，禁止 Add。** 收敛而非推翻：保留 Soft Glass + Aurora 气质，只做归一化。

---

## 1. Design System Audit（设计系统审计）

**结论先行**：视觉气质是对的（玻璃、柔光、低阴影都在），问题全是「量纲失控」——同一个概念有 3~22 种写法。归一化是减法，不需要重设计。

| 类别 | 现状取值散布 | 违规典型 | 归一目标 |
|---|---|---|---|
| **Typography** | font-size 22 种（10.5~46px）；正文级 5 种并存（13/12.5/13.5/14/14.5/15）；字重 400×3 / 500×28 / 600×36 / 700×5 无规则；letter-spacing 8 种；line-height 10 种 | 26×3、27×2、32×2、46×2 混用作页面标题；同一列表正文 13px 与 14.5px 混排 | 十级→**七级 type scale**（display/h1/h2/h3/body/small/caption，2026-09-08 修订），每级固定 size/weight/line-height/letter-spacing/color 五项；字重只用 400/500/600/700 且 700 仅限 display/h1 |
| **Color** | 近灰硬编码 5 个近似值并存（#F1F3F6/#F2F4F8/#E7EBF3/#E5EAF1/#ECEFF5）；#5BAE82/#E0655A/#E8A13D 散落；rgba(255,255,255,α) 20+ 种透明度，深色模式尤其失控；游离的第二个 `:root` 的 --urgent:#7C5CFF 未入体系 | 同一「浅灰填充」5 种写法；成功色一处 token 一处硬编码；深色白 alpha .03~.92 无档位 | 语义色全套（bg/surface/border/divider/text 4 级/accent/success/warning/danger/info/urgent）浅+深两套；白色 alpha 收敛为 9 个档位 |
| **Radius** | 22 种取值（2/5/7/8/10/11/12/16/22/27/30/44/99px、50%）；token 化仅 18 处，硬编码约 20 处 | 30/27/28 三种「大圆角」并存；44px 与 99px 混作胶囊 | 5 档+圆形：--r-sm/md/lg/xl/pill + 50%；2/5/7/8px 微圆角一律改 pill |
| **Shadow** | 7 种一次性阴影 + 1 个 --sh（0 6px 22px / 0 8px 28px / 0 10px 34px / 0 32px 80px…），无 elevation 体系 | 相邻层级卡片两套不同阴影，层级感随机 | 4 级 elevation：flat/surface/floating/modal，深色模式单独定值 |
| **Spacing** | 无 spacing token，组件 padding/margin/gap 随手写 | 相邻区块间距 18px 与 20px 类混用 | 11 档 spacing（4/8/12/16/20/24/32/40/48/64/80）→ **8 档 spacing**（4/8/12/16/24/32/48/64，2026-09-08 修订），组件只允许取档位值 |
| **State** | hover 基本齐全；:active 部分；:focus-visible 全局（好）；disabled/loading/error 大多缺失；toast 有语义但样式单一 | 按钮无 disabled 态；异步无 loading；失败静默（云同步失败无反馈） | 8 态标准矩阵逐组件定义；loading 不引入 spinner，用「文案+opacity」统一处理 |

---

## 2. UX Audit（逐页五问）

> 每页五问：① 这页解决什么问题？② 用户 3 秒内能明白吗？③ 最重要的一个动作是什么？④ 当前设计是否支持它？⑤ 删掉什么会更好？

**Today（现在）**
① 回答「现在几点 / 今天什么日子 / 接下来做什么」。② 达标（真实日期行+仪表盘+时间轴一眼可读）。③ 开始今天的 Main Task。④ 支持。⑤ 删：任务类型 chips（类型不改变行为，只增加视觉噪音）。

**Plan（计划）**
① 收集→排期。② 达标（收集箱/今天/已排三段清晰）。③ 把收集箱的东西排进某天。④ 支持（左滑 Reschedule 写真实日期）。⑤ 删：无（M1 已收敛）。

**Progress（回顾/Evidence）**
① 让用户看见证据并复盘。② 不达标——页内出现与 Today 重复的「今日 %」（46px 大数字）和 Habits 区块，用户会疑惑「这页和 Today 有什么区别」。③ 看 70 天点阵 + 做周回顾。④ 部分支持：点阵在 Me 页（藏太深），Weekly Review 是假保存（见 §10）。⑤ 删：与 Today 重复的今日% 与 Habits 区块；把点阵与周回顾上移成为本页主体。

**Me（我的）**
① 管理目标/数据源/设置。② 表面达标，实际信任崩塌——5 个面板点进去是假内容（Learning/Journal/Direction/Routine/Habit 全是静态展示），设置里 6 个死行点了没反应。③ 进入真实设置。④ 不支持。⑤ 删：全部假面板与死行，只留 5 个全真入口（goal/health-connect/health/settings/weekly）。

**Focus（专注）**
① 陪伴完成一件事。② 达标。③ 计时。④ 部分支持：计时不接任务时长、退出无提示即丢进度。⑤ 改：接任务 dur + 退出可撤销 toast。

**Onboarding（引导）**
① 建立初始方向。② 达标。③ 让用户写下目标。④ **不支持**：用户输入的目标（#ob-goal）被直接丢弃，不写入任何数据；例程被写进 `state.habits`（数据源错误，应为 `state.routines`）。⑤ 删：假剧场步骤；只保留「写目标→选例程→（可选）连健康」且每步落库。

**Sheet（弹层）**
① 编辑/创建。② 达标。③ 保存。④ 支持。⑤ 统一标题层级与 label 规范（现 17/19/21 三种并存）。

---

## 3. Interaction Audit（交互审计）

**做得对的**：左滑删除 + toast 撤销（4.2s）已全局统一；触控 44px 已达成；:focus-visible 全局；touch-action:manipulation；动效 token --dur-1/2/3 已建（新代码引用）；深浅双模式。

**系统性缺失（状态层）**：

| 组件 | default | hover | pressed | focus | disabled | loading | error | success |
|---|---|---|---|---|---|---|---|---|
| btn 系列 | ✓ | ✓ | △ | ✓(全局) | ✗ | ✗ | ✗ | ✗ |
| seg | ✓ | ✓ | ✗ | ✓ | ✗ | — | — | — |
| filter-chip | ✓ | ✓ | ✗ | ✓ | ✗ | — | — | ✗(选中态缺) |
| tab | ✓ | ✓ | ✗ | ✓ | — | — | — | ✓(选中) |
| tl-row | ✓ | ✓ | △ | ✓ | ✗ | ✗ | ✗ | △(完成划线弱) |
| habit-chip | ✓ | ✓ | △ | ✓ | ✗ | ✗ | ✗ | ✗(打卡成功态缺) |
| field | ✓ | — | — | △(仅全局 outline) | ✗ | — | ✗ | — |
| sheet | ✓ | — | — | — | — | — | ✗ | — |
| toast | ✓ | — | — | — | — | — | △(语义有样式弱) | △ |
| cap-in | ✓ | — | — | △ | ✗ | — | ✗ | — |

纯展示组件不需要交互态——「不做」是设计不是缺失。

**交互谎言（最高优先级）**：
1. **Weekly Review「保存并关闭」按钮绑定 `data-back`——只关闭、不保存。** 用户以为保存了周回顾，数据实际丢失。这是「说谎的 UI」，商业软件不可接受。
2. **跳过（td-skip）直接置 `t.done=true`**：跳过≠完成，却计入完成率、每日快照与日历热力图——污染全部证据链。
3. **云同步失败静默**：无 error toast、无重试入口，用户以为数据已同步。
4. **Onboarding 输入丢弃**：交互闭环断裂的极端案例（「接受/生成」没有落到可见的下一步）。

**状态补全规范（不新增组件）**：loading = 内容 opacity + 文案后缀「…」+ pointer-events:none + 一次 800ms 呼吸动画；disabled = --op-disabled(.38) + cursor:not-allowed；不引入 spinner。

---

## 4. Product Logic Audit（产品逻辑审计）

核心链路：`Direction → Goals → Routines → Tasks → Today → Completion → Evidence → Progress → Review → Adjustment`

| 闭环 | 现状 | 判定 |
|---|---|---|
| 日级闭环（Capture→Schedule→Today→Complete） | M1 已打通：收集箱→真实日期→今天执行→完成落快照 | ✅ 闭环成立 |
| 周级闭环（Capture→Schedule→**Review→Adjust**） | Review 假保存；Adjust 不存在——回顾结果从不反哺下周计划 | ❌ **断裂点** |
| 目标闭环（Goal→Task→Progress→Goal） | Goal 无真实进度数据，pct 无来源；Onboarding 目标丢弃 | ❌ 断裂 |
| 例程闭环（Routine→Habit 打卡→统计） | 例程与打卡数据源混用（routines/habits）；无频次概念 | ❌ 半断裂 |
| 证据闭环（Action→Evidence→Calendar） | skip 污染完成统计；紧急污染（urgent 一旦为真当日保持是已知设计，但 skip 是 bug） | ⚠️ 被 bug 污染 |

**修复优先级**：周级闭环（Review 真保存 → 生成下周 oneThing 调整）> 目标真 pct > 例程频次与归属 > 跳过独立状态。

**产品系统收敛蓝图（4 Tab 同一批组件重排）**：
- **Today（现在）**：日期 caption+问候 h2；One-thing 卡（card+accent-soft）；任务列表 tl-row；快速添加置底。删任务类型 chips。
- **Plan（计划）**：页题 h1+区块 h2；目标卡接真 pct（display 级数字）；惯例区 habit-chip 网格（含 success 打卡态）。
- **Progress（回顾）**：页题 h1「回顾」；70 天点阵自 Me 上移（caption 标签+pill 圆点）；Weekly Review 卡（insight）成为本页核心——保存后生成下周调整；证据列表 row+note。删与 Today 重复区块。
- **Me（我的）**：5 个全真面板入口 row（题 small+说明 caption+箭头）。删 5 假面板+6 死行。
- **横切**：4 Tab seg、toast 三变体（含云同步 error）、Focus 接任务时长+退出可撤销、Onboarding 去假剧场每步落库。

---

## 5. Responsive Audit（响应式审计）

| 断点 | 现状评估 | 建议 |
|---|---|---|
| 375/390 | 安全区已处理、触控 44px 已达成 | 维持，回归确认 |
| 430 | 主设计域 | 维持 |
| 520–767 | ≥520 手机框 calc(100dvh-64px)+min-height 640px 生效 | 维持 |
| 768 | 落在 ≥520 与 ≥1024 之间，按 430 宽全幅渲染 | 可接受；**不做平板双栏**（禁仪表盘感） |
| 1024–1440 | 宽 430→480px 居中 | 维持 |
| 1920 | 背景大范围柔和填充 | 维持，不为超宽屏加布局 |

**px→rem/clamp 判断：不迁移，维持 px。** 理由：① 无构建单文件，rem 改造触面太大；② 有效设计域只有 375–480px 一个手机框，不存在流式缩放需求，clamp 在固定框内反而引入抖动；③ 正则字面量测试依赖 px 断言，px→rem 是纯机械替换，收益趋零风险集中。唯一让步：未来若需系统字号跟随，用独立 media 层做，不碰现有 px。

---

## 6. Component Audit（组件审计）

### 6.1 组件盘点（按现有类名）

| 组件 | 现有形态 | 判定 |
|---|---|---|
| Button | btn-p~btn-q 系列变体 | 收敛为 3 变体：primary/quiet/ghost |
| Seg | 分段控制，Tab 与 sheet 两用 | 保留，补 pressed/disabled |
| Chip | **双重定义冲突**（一处 32px 高圆角 16，另一处 padding 8/14 圆角 99，后者全层覆盖前者）；承担筛选/信息标签/可点操作三种语义 | **拆分+删**：filter-chip（筛选，pill 可点）、tag（只读小标签）；任务类型 chips 整体删除 |
| Sheet | 5 个底部弹层 | 保留，统一 elevation-modal + overlay |
| Panel | 10 个二级面板 | 缩到 5 个全真面板：goal/health-connect/health/settings/weekly |
| Tab | 底部 4 Tab | 保留，补 pressed |
| tl-row | 任务/时间线行 | 保留，补 disabled/loading |
| habit-chip | 惯例打卡 chip | 保留，补 success（已完成）态 |
| metric | 数据指标块 | 多尺寸散布 → metric + metric-lg 两档 |
| Glass 卡 | 通用玻璃容器 | 与 panel 容器统一为 card 基类 + thin/surface/strong 三档 |
| empty | 空状态 | 保留，统一文案层级（body+caption） |
| toast | success/error 有语义但样式单一 | 补 success/error/info 三变体 |
| insight | 洞察卡 | 保留（Progress 重定位后是核心组件） |
| note | 备注块 | 保留 |
| field | 输入域 | **补齐 error/disabled/focus 态**（现仅全局 focus-visible） |
| row/item | 通用列表行 | 合并为 row 一种 |
| cap-in | 胶囊快速添加 | 保留，补 error 态 |
| Focus 全屏 / Onboarding | 全屏层 | 保留，Onboarding 去假剧场 |

### 6.2 应合并的同功能多形态

1. chip 双重定义 → filter-chip + tag（唯一「现状即 bug」项，最先处理）
2. btn-p~btn-q → btn 基类 + 3 变体（危险操作用 primary 换 danger 色，不新增变体）
3. row + item → row
4. metric 多尺寸 → metric + metric-lg
5. glass 卡与 panel 容器 → card 基类三档
6. **明确不做**（DO NOT ADD，无场景）：Drawer / Popover / CommandMenu / Tooltip / Calendar / DataTable

---

## 7. Visual Hierarchy Audit（视觉层级审计）

### 7.1 逐页层级错乱与归一

| 页面/区域 | 现状错乱 | 归一映射 |
|---|---|---|
| Today | 日期头与 hero 数字抢层级；正文 13/14.5 混排 | 日期→caption；问候→h2；one-thing 标题→h3；任务行→small；今日 %→display |
| Plan | 区块标题 21/19 混用；目标卡数字 32 与 27 混用 | 区块标题→h2；目标 pct→display；惯例行→small；说明→caption |
| Progress | 点阵标签 10.5/11/12 混用；与 Today 重复的今日 % 用 46px | 页题→h1；点阵日期→caption；周总结卡题→h3；证据行→body |
| Me | 面板入口行标题 15.5/16/17 混用；说明 12/12.5/13 混用 | 入口题→small；说明→caption；面板内页题→h2 |
| Focus | 46px 计时+26px 副题 | 计时→display；任务名→h3；提示→caption |
| Sheet（5 个） | 标题 17/19/21 三种；label 11.5/12 混用 | sheet 题→h3；label→caption；输入值→small |
| Onboarding | 32/27/26 标题混用 | 引导题→h2；主问题→h1；选项→small |

### 7.2 全局归一映射（旧值→新级）

46 → display(48)；32/27/26/24 → h1(32)；21/19 → h2(24)；17/16 → h3(20)；15.5/15/14.5 → body(16)；14/13.5/13/12.5 → small(14)；12/11.5/11/10.5 → caption(12)。**不看旧值看语义**：display=今日 %/计时/hero 数字；h1=页题/面板标题；h2=问候/区块标题；h3=卡题/sheet 题/任务名；body=正文/证据行；small=任务行/入口题/选项/输入值；caption=日期/label/元数据。（2026-09-08 修订为七级：48/32/24/20/16/14/12）

**字重规则**：400=正文；500=强调正文/按钮/选中项/caption（组件级）；600=h2/h3；700=仅 display/h1。

---

## 8. Features to Remove（应删除清单）

| # | 删除项 | 理由 |
|---|---|---|
| R1 | Me 页 5 个假面板：Learning / Journal / Direction / Routine / Habit | 静态展示无数据源，伤害产品信任——用户点进去发现是假的 |
| R2 | 设置页 6 个死行 | 点击无响应，同上 |
| R3 | 任务类型 chips（Today/Plan 任务行的类型标签） | 类型不改变任何行为，纯视觉噪音 |
| R4 | Progress 页与 Today 重复的「今日 %」大数字与 Habits 区块 | 页面职责重叠，让 Progress 失去存在理由 |
| R5 | Onboarding 假剧场步骤 | 输入被丢弃、写入错数据源，比没有更糟 |
| R6 | 第二个游离 `:root`（--urgent） | 收编进主 token 表 |
| R7 | 7 种一次性 box-shadow、5 种硬编码近灰、全部游离 rgba 白 alpha | 归一进 token（删除的是「写法」，不是功能） |

## 9. Features to Merge（应合并清单）

| # | 合并项 | 结果 |
|---|---|---|
| M1 | chip 双重定义 | filter-chip（可点筛选）+ tag（只读标签）两个明确组件 |
| M2 | btn-p~btn-q 全家族 | btn 基类 + primary/quiet/ghost 三变体 |
| M3 | row + item | row 一种 |
| M4 | metric 多尺寸 | metric + metric-lg 两档 |
| M5 | glass 卡与 panel 容器 | card 基类 + thin/surface/strong 三档 |
| M6 | 22 种圆角 | --r-sm(12)/md(16)/lg(22)/xl(28)/pill(99)/full(50%) 六档 |
| M7 | 7+1 种阴影 | --elev-flat/surface/floating/modal 四级 |
| M8 | 22 种字号 + 无规则字重 | 七级 type scale（48/32/24/20/16/14/12），字重 ∈{400,500,600,700} |
| M9 | Progress 的回顾职责与 Me 的点阵职责 | 全部归入 Progress（点阵+周回顾），Me 只留真实入口 |
| M10 | 例程/打卡数据源（routines vs habits 混用） | 明确归属：Routines=定义（频率），Habits=打卡记录 |

---

## 10. Critical Problems（十大关键问题，按严重度排序）

1. **Weekly Review「保存并关闭」只关闭不保存**（按钮绑定 data-back）——说谎 UI，周级闭环断裂点，商业软件不可接受。
2. **跳过=完成**（td-skip 置 t.done=true）——完成率、每日快照、日历热力全部被污染，证据链失真。
3. **Onboarding 输入丢弃**（#ob-goal 不落库）+ **例程写错数据源**（写入 habits 应为 routines）——引导期建立的期望与真实数据脱节。
4. **Me 页 5 假面板 + 设置 6 死行**——「假功能」直接摧毁商业软件可信度。
5. **云同步失败静默**——用户以为数据已同步，实际丢失且无重试入口。
6. **chip 双重定义**（后者全层覆盖前者）——唯一的「现状即 bug」样式冲突，影响所有 chip 场景。
7. **Typography 失控**（22 种字号、字重无规则）——视觉层级随机，直接导致「每页不像一个产品」。
8. **色彩失控**（5 个近似灰、20+ 白 alpha、深色模式无档位、游离第二个 :root）。
9. **组件状态缺失**（disabled/loading/error/success 普遍没有）——可感知质量低于商业基准线。
10. **Me→routines 硬编码 r5 id**——路由脆弱，数据结构一变即断。

---

## 11. Proposed Design System（精确 token 值）

### 11.1 语义色（浅色）

```css
:root {
  --bg: #F7F8FF;
  --bg-aurora-1: #DCE8FF;
  --bg-aurora-2: #E6E0FF;
  --surface-thin: rgba(255,255,255,.34);   /* 旧 --glass-thin */
  --surface: rgba(255,255,255,.50);        /* 旧 --glass */
  --surface-strong: rgba(255,255,255,.68); /* 旧 --glass-2(.62)→归一 .68 */
  --surface-solid: #FFFFFF;
  --border: rgba(255,255,255,.72);         /* 旧 --brd */
  --border-soft: rgba(255,255,255,.55);    /* 旧 --brd-soft */
  --divider: rgba(34,37,42,.07);           /* 旧 --hair(.055)→.07 */
  --ink: #22252A;                          /* 墨色基色（唯一，2026-09-08 修订） */
  --text-primary: rgba(34,37,42,1);        /* 旧 --ink-1 · Primary 100% */
  --text-secondary: rgba(34,37,42,.65);    /* 旧 --ink-2 · Secondary 65%（旧 hex #4B5058 废止） */
  --text-tertiary: rgba(34,37,42,.45);     /* 旧 --ink-3 · Tertiary 45%（旧 hex #8A9099 废止） */
  --text-disabled: rgba(34,37,42,.30);     /* 旧 --ink-4 · Disabled 30%（旧 hex #B2B8C1 废止） */
  --accent: #5BAE82;
  --accent-strong: #3C8A61;                /* 旧 --accent-ink */
  --accent-soft: rgba(91,174,130,.13);
  --accent-line: rgba(91,174,130,.28);
  --success: #5BAE82;                      /* 与 accent 同源 */
  --success-soft: rgba(91,174,130,.13);
  --warning: #E8A13D;
  --warning-soft: rgba(232,161,61,.14);
  --danger: #C46464;                       /* 散落 #E0655A 全部归一 */
  --danger-strong: #B04E4E;
  --danger-soft: rgba(196,100,100,.11);
  --info: #5B7FD7;
  --info-soft: rgba(91,127,215,.12);
  --urgent: #7C5CFF;                       /* 收编第二个 :root */
  --overlay: rgba(28,33,48,.32);
  --blur: blur(26px);
  --blur-strong: blur(34px) saturate(1.7); /* 旧 --blur-l */
}
```

### 11.2 语义色（深色，.phone[data-mode="dark"] 覆盖）

```css
.phone[data-mode="dark"] {
  --bg: #0D0F13;
  --bg-aurora-1: #141C33;
  --bg-aurora-2: #191631;
  --surface-thin: rgba(255,255,255,.04);
  --surface: rgba(255,255,255,.07);
  --surface-strong: rgba(255,255,255,.11);
  --surface-solid: #16181D;
  --border: rgba(255,255,255,.10);
  --border-soft: rgba(255,255,255,.07);
  --divider: rgba(255,255,255,.08);
  --ink: #F0F2F6;                          /* 深色墨色基色（2026-09-08 修订） */
  --text-primary: rgba(240,242,246,1);
  --text-secondary: rgba(240,242,246,.65);
  --text-tertiary: rgba(240,242,246,.45);
  --text-disabled: rgba(240,242,246,.30);
  --accent: #6FBF93;
  --accent-strong: #85C9A3;
  --accent-soft: rgba(111,191,147,.16);
  --accent-line: rgba(111,191,147,.30);
  --success: #6FBF93;
  --success-soft: rgba(111,191,147,.16);
  --warning: #EDB268;
  --warning-soft: rgba(237,178,104,.16);
  --danger: #D57C7C;
  --danger-strong: #E29B9B;
  --danger-soft: rgba(213,124,124,.16);
  --info: #7E96DF;
  --info-soft: rgba(126,150,223,.16);
  --urgent: #9B82FF;
  --overlay: rgba(0,0,0,.52);
}
```

**白 alpha 档位规则**：全文件 rgba(255,255,255,x) 只允许 .04/.07/.11/.16（深色系）+ .34/.50/.68（浅玻璃）+ .72/.55（border）共 9 档；深色模式由语义 token 自动接管，禁止深色块里再写裸 rgba。

**文字 alpha 档位规则（2026-09-08 用户修订）**：文字层级不再用 4 个明度灰 hex，统一为**同一墨色 `--ink` 的 alpha 四档**——Primary 100% / Secondary 65% / Tertiary 45% / Disabled 30%；深色模式只换基色（#F0F2F6）、档位不变。旧 hex 灰（#4B5058/#8A9099/#B2B8C1）废止。对比度备注：65% ≈ 4.9:1（AA ✓）；45% ≈ 2.7:1，仅限 caption 小字使用（原 label/metadata 已并入 caption；接受的取舍）；30% 仅用于 disabled 非可读态。

### 11.3 Typography 七级（2026-09-08 用户修订：48/32/24/20/16/14/12，五项齐全）

| 级 | token | size | weight | line-height | letter-spacing | color |
|---|---|---|---|---|---|---|
| display | --fs-display | 48px | 700 | 1.08 | -0.02em | --text-primary |
| h1 | --fs-h1 | 32px | 700 | 1.2 | -0.015em | --text-primary |
| h2 | --fs-h2 | 24px | 600 | 1.3 | -0.01em | --text-primary |
| h3 | --fs-h3 | 20px | 600 | 1.35 | -0.005em | --text-primary |
| body | --fs-body | 16px | 400 | 1.55 | 0 | --text-secondary |
| small | --fs-small | 14px | 400 | 1.5 | 0 | --text-secondary |
| caption | --fs-caption | 12px | 500 | 1.4 | 0.01em | --text-tertiary |

实施形式：先以 utility 类（.t-display… .t-caption）落地，存量逐页替换，**不删旧 font-size 声明直到该页迁移完成**。原 body-medium/label/metadata 三档并入（body-medium→small；label/metadata→caption）；字号下限从 10.5px 提到 12px；强调正文（按钮/选中项）用组件级 font-weight:500，不单设档位。

### 11.4 Spacing（8 档，2026-09-08 修订）

--sp-1:4px（图标微距）/ --sp-2:8px（行内、chip 内距）/ --sp-3:12px（列表行内距）/ --sp-4:16px（卡片内距默认）/ --sp-5:24px（大卡、sheet 内距、区块间）/ --sp-6:32px（大区块间）/ --sp-7:48px（sheet 顶部、页面段落）/ --sp-8:64px（全屏层，Onboarding/Focus）。**padding/margin/gap 只允许取这 8 档**（例外仅 0、1px hairline、-1px、auto）；原 20/40/80 三档废止（20→16 或 24、40→48、80→64）。

### 11.5 Radius（5 档+圆形）

| token | 值 | 吸收旧值 |
|---|---|---|
| --r-sm | 12px | 8/10/11/12px；2/5/7px 一律改 --r-pill |
| --r-md | 16px | 16px |
| --r-lg | 22px | 22px |
| --r-xl | 28px | 24/27/30px |
| --r-pill | 99px | 44/99px（胶囊、进度条、微型元素） |
| --r-full | 50% | 圆形头像/圆点 |

### 11.6 Elevation（4 级）

| token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| --elev-flat | none | none | 行、chip、metric |
| --elev-surface | 0 8px 32px rgba(60,70,100,.055)（=旧 --sh） | 0 8px 32px rgba(0,0,0,.30) | 卡片、panel |
| --elev-floating | 0 10px 34px rgba(60,70,100,.09) | 0 10px 34px rgba(0,0,0,.42) | toast、悬浮件、cap-in 弹出 |
| --elev-modal | 0 32px 80px rgba(60,70,100,.14) | 0 32px 80px rgba(0,0,0,.55) | sheet、Focus 全屏层 |

玻璃卡以 blur+border+极低阴影表达层级，阴影只做补充——与既有气质一致，不做重阴影。

### 11.7 Opacity

--op-disabled: .38（disabled 统一，配 cursor:not-allowed）｜ --op-secondary: .68 ｜ 玻璃即 surface 三档（不另设）｜ --overlay 见 11.1/11.2。
**loading 规范**：不引入 spinner。loading = 内容 opacity:var(--op-disabled) + 文案后缀「…」，区别于 disabled 是 pointer-events:none 且带一次 800ms 呼吸动画。

### 11.8 组件状态矩阵（目标态）

| 组件 | default | hover | pressed | focus | disabled | loading | error | success |
|---|---|---|---|---|---|---|---|---|
| btn-primary | **ink 底白字（N1 定版：墨色主按钮——浅色近黑、深色反白；accent 只用于完成/活跃，不作按钮底色）** | 亮度+3% | scale(.98) | outline accent-line | --op-disabled | 文案+…+op | danger 底变体 | — |
| btn-quiet/ghost | surface/透明 | surface 升档 | scale(.98) | 同上 | --op-disabled | 同上 | — | — |
| filter-chip | surface-thin | surface | scale(.97) | outline | --op-disabled | — | — | 选中=accent-soft+accent-line 边 |
| seg/tab | text-tertiary | text-secondary | scale(.97) | outline | — | — | — | 选中=accent-strong 文字+accent-soft 底 |
| tl-row | surface | surface-strong | scale(.99) | outline | --op-disabled | 行级 op+… | 左边条 --danger | 完成=划线+text-disabled |
| habit-chip | surface-thin | surface | scale(.97) | outline | --op-disabled | — | — | success=accent-soft 填充+✓ |
| field | surface-thin 底 border-soft | — | — | 边框 accent-line | --op-disabled | — | 边框 --danger+danger-soft 底 | — |
| sheet | surface-strong+elev-modal | — | — | — | — | — | 内部 field 错误态 | — |
| toast | surface-strong | — | — | — | — | — | 左边条 --danger | 左边条 --accent |

全局既有 :focus-visible outline、min-height:44px、touch-action:manipulation **原样保留**（正则测试依赖）。

### 11.9 旧 token → 新 token 映射

| 旧 | 新 |
|---|---|
| --ink-1 / --ink-2 / --ink-3 / --ink-4 | --text-primary/secondary/tertiary/disabled（值改为墨色 alpha 1/.65/.45/.30，见 11.1/11.2） |
| --accent-ink | --accent-strong |
| --glass / --glass-2 / --glass-thin | --surface / --surface-strong / --surface-thin |
| --brd / --brd-soft | --border / --border-soft |
| --blur-l | --blur-strong |
| --hair | --divider |
| --sh | --elev-surface |
| --r-sm/md/lg/xl | 名不变；sm 升档至 12px |
| 第二个 :root 的 --urgent | 收编进主 :root |
| 硬编码 #F1F3F6/#F2F4F8/#E7EBF3/#E5EAF1/#ECEFF5 | --surface-thin 或 --bg 分档 |
| 硬编码 #E0655A / #E8A13D | --danger / --warning |

--accent、--accent-soft、--accent-line、--danger、--danger-soft、--blur 名值均保留。

---

## 12. Proposed Product System（产品系统提案）

见 §4「产品系统收敛蓝图」。要点重申：
- 同一批 card / row / typography 状态在 4 个 Tab 重排，而非每页一套样式——这就是「每页属于同一个产品」。
- Progress 重定位为「回顾/Evidence 页」：点阵+周回顾是主体；Weekly Review 真保存后生成下周 oneThing 调整，打通最高优先级的周级闭环。
- Me 只留 5 个全真入口；Onboarding 每步落库；Focus 接任务时长；跳过是独立状态不记完成。
- 例程/打卡数据归属：Routines=定义（频率），Habits=打卡记录。

---

## 13. Implementation Order（实施顺序）

```
P1 地基token+Review真保存 ─► P2 排版归一+Goal真pct ─► P3 结构收缩+组件合并 ─► P4 色彩阴影状态收敛 ─► P5 响应式回归+收尾
```

**Phase 1（P0）Token 地基 + Weekly Review 真保存**
- 范围：在既有 :root 后**追加**新语义 token 全量定义（暂无组件引用）；同批完成 Review 真保存+oneThing 化（纯 JS，零 CSS 依赖）
- 区域：`<style>` 顶部 :root；Review 相关 JS 与 sheet
- 验证：正则字面量断言（/min-height:\s*44px/、/:focus-visible[^{]*outline/、/touch-action:\s*manipulation/）通过；Review 保存后 localStorage 断言；页面视觉 diff 应为零
- 风险：低。先做原因：最高优先级功能零样式依赖；token 并存使后续全是「增量引用」而非「批量替换」，结构性规避 648f1f3 式事故

**Phase 2（P0/P1）Typography 归一 + Goal 真 pct**
- 范围：落地七级 type 类；逐页（Today→Plan→Me→Progress→sheet）映射 22 种字号与无规则字重；Goal 接真 pct（配 display 级数字）
- 验证：grep font-size 去重 ≤7；字重 ∈{400,500,600,700}；逐页深浅双模式人工走查；正则复跑
- 风险：中。纯视觉、可逐页独立替换，最低风险批量迁移，先建立迁移节奏

**Phase 3（P1）结构收缩 + 组件合并**
- 范围：删 5 假面板+设置 6 死行+任务类型 chips；chip 双定义拆 filter-chip/tag；btn 三变体、row+item、metric、card 基类合并；Onboarding 去假剧场+ob-goal 写真实 Goal
- 验证：每删一类先 grep JS querySelector 引用（类名变更影响 JS）；i18n 文字节点回归；427 类计数显著下降；全 panel 打开路径走查
- 风险：中高。在色彩之前原因：**先删后收敛**——删掉的面板无需迁移样式，减少 Phase 4 约 30% 工作量与回归面；结构问题比视觉问题更伤产品

**Phase 4（P1）色彩/玻璃/阴影/状态收敛**
- 范围：旧 token 逐批改引用新 token（映射表 §11.9）；白 alpha 归 9 档；7 阴影归 4 级；radius 归 5 档；按 §11.8 矩阵补全 disabled/loading/error/success；Focus 接任务 dur+退出可撤销；跳过独立状态不记完成；云同步失败 toast(error)；toast 三变体
- 验证：白 alpha 去重 ≤9；box-shadow 声明 ≤4 token；间距值 ∈ 8 档 {4,8,12,16,24,32,48,64}（例外 0/1px/-1px/auto）；深浅双模式全页状态矩阵抽查；云同步断网模拟；正则复跑
- 风险：中。状态色依赖语义色板（P1）与组件形态稳定（P3），否则返工

**Phase 5（P2）响应式体检 + 回归收尾**
- 范围：375~1920 七档走查（维持 px，§5）；深色终审；Onboarding 终版；清理孤儿类；token 表+状态矩阵沉淀入 docs/
- 走查规程：**十镜法**（Zoom out → Ignore content → Hierarchy → Spacing → Typography → Color → Density → Component consistency → Interaction → Compare with design system），2026-09-08 定为标准评审法；首轮执行报告 docs/form-audit-2026-09-08.md（新增 N1 主按钮颜色决策 / N2 进度可视化 4→2 / N3 节标签收敛 / N4 carousel dots 查证）
- 验证：全断点截图对比；深浅×全页矩阵；正则套件终跑；localStorage 旧数据兼容抽查
- 风险：低

**顺序理由**：① P1 先行——最高优先级功能零样式依赖先交付价值，token 并存是结构性防御；② P2 在 P3 前——排版迁移先在页面齐全时练熟；③ P3 在 P4 前——先删后收敛省 30% 迁移量；④ P4 需要稳定后的色板与组件形态；⑤ P5 只做验证收尾，不排结构性改动。

---

## 附：硬约束（实施时全程有效）

1. 不新增功能，只 Delete/Merge/Simplify/Unify/Connect。
2. 单文件架构，禁止大爆炸式重写；每 Phase 独立可验证、可交付。
3. 类名/结构变更前必须 grep JS querySelector 引用；i18n 对类名与文案敏感（ZH2EN 键不带前导空格；`data-user` 永不翻译）。
4. 正则字面量测试（min-height:44px / :focus-visible outline / touch-action:manipulation）必须始终通过；jsdom 全套 206 断言 GREEN 为每 Phase 出门标准。
5. `data-mode` 写入小写；`.phone[data-mode="dark"]` 深色覆盖。
6. 本文档与 docs/product-audit-2026-09-07.md、docs/design-system-proposal.md 均保持**未提交**（部署仓库公开）。

*分析完成于 2026-09-07。未修改任何产品代码。*
