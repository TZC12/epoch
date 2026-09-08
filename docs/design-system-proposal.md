# Epoch Design System 提案与实施顺序

> 作者：架构师 高见远（Bob）｜输入：许清楚产品审计 + CSS 一致性普查数据 + 用户强制 token taxonomy
> 原则：**收敛而非推翻**——保留 Soft Glass + Aurora 气质，只做归一化；单文件、无构建、增量实施、每步可独立验证（事故 648f1f3 教训）。

---

## 1. Design System Audit

六类问题归纳（现状取值散布 → 违规典型 → 归一目标）：

| 类别 | 现状取值散布 | 违规典型 | 归一目标 |
|---|---|---|---|
| **Typography** | font-size 22 种（10.5~46px）；正文级 5 种并存（13/12.5/13.5/14/14.5/15）；字重 400×3 / 500×28 / 600×36 / 700×5 无使用规则；letter-spacing 8 种随手写；line-height 10 种 | 26px×3、27px×2、32px×2、46px×2 混用作页面标题；同一列表里正文 13px 与 14.5px 混排 | 十级→**七级 type scale**（display/h1/h2/h3/body/small/caption，2026-09-08 修订），每级固定 size/weight/line-height/letter-spacing/color 五项；字重只用 400/500/600/700 且 700 仅限 display/h1 |
| **Color** | 硬编码 hex 近灰 5 个近似值并存（#F1F3F6/#F2F4F8/#E7EBF3/#E5EAF1/#ECEFF5）；#5BAE82/#E0655A/#E8A13D 语义色散落；rgba(255,255,255,α) 20+ 种透明度，深色模式尤其失控；游离的第二个 :root 里 --urgent:#7C5CFF 未入体系 | 同一"浅灰填充"有 5 种写法；成功色一处 token 一处硬编码；深色模式白色 alpha 从 .03 到 .92 无档位 | 语义色全套（bg/surface/border/divider/text 4 级/accent/success/warning/danger/info/urgent）浅+深两套；白色 alpha 收敛为 9 个档位 |
| **Radius** | 22 种取值（2/5/7/8/10/11/12/16/22/27/30/44/99px、50%）；token 化仅 18 处，硬编码约 20 处 | 30/27/28 三种"大圆角"并存；44px 与 99px 混作胶囊 | 5 档 + 圆形：--r-sm/md/lg/xl/pill + 50%；2/5/7/8px 微圆角一律改 pill（进度条、微型元素） |
| **Shadow** | 7 种一次性阴影 + 1 个 --sh token（0 6px 22px / 0 8px 28px / 0 10px 34px / 0 32px 80px…），无 elevation 体系 | 相邻层级卡片用了两套不同阴影，层级感随机 | 4 级 elevation：flat/surface/floating/modal，全部收敛进 token，深色模式单独定值 |
| **Spacing** | 无 spacing token，组件 padding/margin/gap 随手写（推测散布在 2~48px 的非规则值上） | 相邻两区块间距 18px 与 20px 混用类情况 | **8 档 spacing**（4/8/12/16/24/32/48/64，2026-09-08 修订），组件只允许取档位值 |
| **State** | hover 基本齐全（桌面）；:active 部分有；:focus-visible 全局（好）；disabled/loading/error 大多缺失；toast 有 success/error 语义但样式单一 | 按钮无 disabled 态（点了没反应但看不出）；异步操作无 loading 态；失败静默（对应"云同步失败无反馈"） | 8 态标准矩阵（default/hover/pressed/focus/disabled/loading/error/success），每类组件逐一定义；loading 不引入 spinner，用"文案 + opacity"统一处理 |

**结论**：视觉气质是对的（玻璃、柔光、低阴影都在），问题全部是"量纲失控"——同一个概念有 3~22 种写法。归一化是减法，不需要重设计。

---

## 2. Component Audit

### 2.1 实际存在的组件盘点（按 Epoch 现有类名）

| 组件 | 现有形态 | 判定 |
|---|---|---|
| Button | btn-p ~ btn-q 系列变体，各自带独立样式 | 保留但收敛为 3 变体：primary / quiet / ghost |
| Seg（分段控制） | seg，4 Tab 与 sheet 内切换两用 | 保留，补齐 pressed/disabled |
| Chip | **双重定义冲突**：一处 32px 高圆角 16，另一处 padding 8/14 圆角 99，后者全层覆盖前者；chip 承担了"筛选""信息标签""可点操作"三种语义 | **拆分为两个语义 + 删一个**：filter-chip（筛选，pill 可点）、tag（信息标签，只读小胶囊）；任务类型 chips（工作/日常/娱乐/居家/自定义）按 PM 清单整体删除 |
| Sheet | 5 个底部弹层 | 保留，统一 elevation-modal + overlay |
| Panel | 10 个二级面板（Me 页为主） | 按 PM 清单缩到 5 个全真面板：goal / health-connect / health / settings / weekly |
| Tab | 底部 4 Tab | 保留，补齐 pressed |
| tl-row | 任务/时间线行 | 保留，补 disabled/loading（完成任务动效中） |
| habit-chip | 惯例打卡 chip | 保留，补 success（已完成）态视觉差异化 |
| metric | 数据指标块 | 多尺寸散布 → 收敛为 metric + metric-lg 两档 |
| Glass 卡 | 通用玻璃容器 | 与 panel 容器统一为一个 card 基类 + surface/thin/strong 三档 |
| empty | 空状态 | 保留，统一文案层级（body + caption） |
| toast | 提示条，success/error 有语义但样式单一 | 保留，按语义色补 success/error/info 三变体样式 |
| insight | 洞察卡 | 保留（Progress 页重定位后是核心组件），accent-soft 填充 |
| note | 备注块 | 保留 |
| field | 输入域 | 保留，**补齐 error/disabled/focus 态**（现有 focus 依赖全局 focus-visible，输入域需要独立描边） |
| row/item | 通用列表行 | 两者合并为 row 一种 |
| cap-in | 胶囊输入/快速添加 | 保留，补 error 态 |
| Focus 全屏 / Onboarding 覆盖层 | 全屏层 | 保留，Onboarding 按 PM 清单去假剧场 |

### 2.2 状态覆盖矩阵（✓ 有 / △ 部分 / ✗ 缺）

| 组件 | default | hover | pressed | focus | disabled | loading | error | success |
|---|---|---|---|---|---|---|---|---|
| btn 系列 | ✓ | ✓ | △ | ✓(全局) | ✗ | ✗ | ✗ | ✗ |
| seg | ✓ | ✓ | ✗ | ✓(全局) | ✗ | — | — | — |
| chip(拆分后 filter-chip) | ✓ | ✓ | ✗ | ✓(全局) | ✗ | — | — | ✗(选中态=active，补) |
| tab | ✓ | ✓ | ✗ | ✓(全局) | — | — | — | ✓(选中) |
| tl-row | ✓ | ✓ | △ | ✓(全局) | ✗ | ✗ | ✗ | △(完成划线有，弱) |
| habit-chip | ✓ | ✓ | △ | ✓(全局) | ✗ | ✗ | ✗ | ✗ |
| metric | ✓ | — | — | — | ✗ | — | — | — |
| glass card / panel | ✓ | △ | — | — | — | — | — | — |
| sheet | ✓ | — | — | — | — | — | ✗(表单校验无) | — |
| field | ✓ | — | — | △(仅全局 outline，无边框变化) | ✗ | — | ✗ | — |
| row/item | ✓ | ✓ | ✗ | ✓(全局) | ✗ | — | — | — |
| toast | ✓ | — | — | — | — | — | ✓(语义有样式弱) | ✓(同左) |
| cap-in | ✓ | — | — | △ | ✗ | — | ✗ | — |

**规则说明**：纯展示组件（metric/empty/note/insight）不需要交互态，"不做"是设计不是缺失。

### 2.3 应合并的同功能多形态

1. **chip 双重定义 → filter-chip + tag**（先删冲突定义，这是唯一一个"现状即 bug"的项）
2. **btn-p~btn-q → btn 基类 + 3 变体**（primary/quiet/ghost），危险操作用 primary 换 danger 色，不新增变体
3. **row + item → row**
4. **metric 多尺寸 → metric + metric-lg**
5. **glass 卡与 panel 容器 → card 基类三档**（surface/thin/strong）
6. **明确不做**（用户 DO NOT ADD，Epoch 无场景）：Drawer、Popover、CommandMenu、Tooltip、Calendar、DataTable——以上一律不进设计系统

---

## 3. Visual Hierarchy Audit

### 3.1 逐页层级错乱清单

| 页面/区域 | 现状错乱 | 归一映射 |
|---|---|---|
| Today | 日期头与 hero 数字抢层级；正文 13/14.5 混排 | 日期→caption；问候语→h2；one-thing 卡标题→h3；任务行→small；今日 % hero→display |
| Plan | 区块标题 21/19 混用；目标卡数字 32 与 27 混用 | 区块标题→h2；目标卡 pct→display；惯例行→small；说明→caption |
| Progress | 70 天点阵标签 10.5/11/12 混用；与 Today 重复的今日 % 用了 46px | 页题→h1；点阵日期→caption；周总结卡题→h3；证据行→body |
| Me | 面板入口行标题 15.5/16/17 混用；说明文字 12/12.5/13 混用 | 入口行题→small；行说明→caption；面板内页题→h2 |
| Focus | 46px 计时 + 26px 副题 | 计时→display；任务名→h3；提示→caption |
| Sheet（5 个） | 标题 17/19/21 三种；表单 label 11.5/12 混用 | sheet 题→h3；label→caption；输入值→small |
| Onboarding | 32/27/26 标题混用 | 引导题→h2；主问题→h1；选项→small |

### 3.2 全局归一映射表（旧值 → 新级）

| 旧 font-size | 出现场景 | 新级（七级，语义优先） |
|---|---|---|
| 46px | hero 数字、今日 %、计时 | display(48) |
| 32 / 27 / 26 / 24 | 页题、面板标题 | h1(32) |
| 21 / 19 | 区块标题、问候 | h2(24) |
| 17 / 16 | 卡片标题、sheet 题 | h3(20) |
| 15.5 / 15 / 14.5 | 正文、证据行 | body(16) |
| 14 / 13.5 / 13 / 12.5 | 任务行、入口题、选项、输入值 | small(14) |
| 12 / 11.5 / 11 / 10.5 | 日期、label、徽标、最弱元信息 | caption(12) |

**字重规则**：400=正文；500=强调正文/按钮/选中项/caption（组件级）；600=h2/h3；700=仅 display/h1。删除一切 800+ 与混排。

---

## 4. Responsive Audit

| 断点 | 现状评估 | 建议 |
|---|---|---|
| 375 / 390 | 安全区已处理、触控 44px 已达成，状态良好 | 维持，回归确认即可 |
| 430 | 主设计域，无问题 | 维持 |
| 520–767 | ≥520 手机框 calc(100dvh-64px)+min-height 640px 生效 | 维持 |
| 768 | 落在 ≥520 与 ≥1024 之间，按 430 宽度全幅手机布局渲染 | 可接受；不做平板双栏（禁仪表盘感），仅确认居中与背景 aurora 表现 |
| 1024–1440 | ≥1024 宽 430→480px 居中 | 维持 |
| 1920 | 同上，背景大范围柔和填充 | 维持；不需为超宽屏加任何布局 |

**px → rem/clamp 迁移判断：不迁移，维持 px。** 理由：
1. 无构建单文件，rem 收益（整体缩放、无障碍字号跟随）依赖根字号方案改造，触面太大；
2. 有效设计域只有 375–480px 一个"手机框"，不存在流式缩放需求，clamp 在固定框内反而引入断点间抖动；
3. 正则字面量测试依赖 px 源码断言（事故先例 648f1f3），px→rem 属纯机械替换，收益趋近于零而风险集中。

唯一让步：若未来需要系统字号跟随，用 `@media (prefers-reduced-transparency)` 同级的独立层做，不碰现有 px。

---

## 5. Proposed Design System（核心交付）

### 5.1 语义色 token（浅色）

```css
:root {
  /* background */
  --bg: #F7F8FF;
  --bg-aurora-1: #DCE8FF;          /* aurora 主体 */
  --bg-aurora-2: #E6E0FF;          /* aurora 副色 */
  /* surface（玻璃三档 + 实底） */
  --surface-thin: rgba(255,255,255,.34);   /* 旧 --glass-thin */
  --surface: rgba(255,255,255,.50);        /* 旧 --glass */
  --surface-strong: rgba(255,255,255,.68); /* 旧 --glass-2(.62)→归一 .68 */
  --surface-solid: #FFFFFF;
  /* border / divider */
  --border: rgba(255,255,255,.72);         /* 旧 --brd */
  --border-soft: rgba(255,255,255,.55);    /* 旧 --brd-soft */
  --divider: rgba(34,37,42,.07);           /* 旧 --hair(.055)→归一 .07 */
  /* text（2026-09-08 修订：同一墨色的 alpha 四档——Primary 100 / Secondary 65 / Tertiary 45 / Disabled 30） */
  --ink: #22252A;                          /* 墨色基色（唯一） */
  --text-primary: rgba(34,37,42,1);        /* 旧 --ink-1 */
  --text-secondary: rgba(34,37,42,.65);    /* 旧 --ink-2（旧 hex #4B5058 废止） */
  --text-tertiary: rgba(34,37,42,.45);     /* 旧 --ink-3（旧 hex #8A9099 废止） */
  --text-disabled: rgba(34,37,42,.30);     /* 旧 --ink-4（旧 hex #B2B8C1 废止） */
  /* accent（唯一强调色，柔绿） */
  --accent: #5BAE82;
  --accent-strong: #3C8A61;                /* 旧 --accent-ink */
  --accent-soft: rgba(91,174,130,.13);
  --accent-line: rgba(91,174,130,.28);
  /* 语义色 */
  --success: #5BAE82;                      /* 与 accent 同源，成功态复用柔绿 */
  --success-soft: rgba(91,174,130,.13);
  --warning: #E8A13D;
  --warning-soft: rgba(232,161,61,.14);
  --danger: #C46464;                       /* 散落的 #E0655A 全部归一到 #C46464 */
  --danger-strong: #B04E4E;                /* 浅底上的危险文字 */
  --danger-soft: rgba(196,100,100,.11);
  --info: #5B7FD7;
  --info-soft: rgba(91,127,215,.12);
  --urgent: #7C5CFF;                       /* 收编第二个 :root 进主体系 */
  /* overlay / glass */
  --overlay: rgba(28,33,48,.32);           /* sheet/sheet 遮罩 */
  --blur: blur(26px);
  --blur-strong: blur(34px) saturate(1.7); /* 旧 --blur-l */
}
```

### 5.2 语义色 token（深色，`.phone[data-mode="dark"]` 覆盖）

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
  --ink: #F0F2F6;                  /* 深色墨色基色（2026-09-08 修订） */
  --text-primary: rgba(240,242,246,1);
  --text-secondary: rgba(240,242,246,.65);
  --text-tertiary: rgba(240,242,246,.45);
  --text-disabled: rgba(240,242,246,.30);
  --accent: #6FBF93;
  --accent-strong: #85C9A3;        /* 深底强调文字改用提亮值 */
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

**白色 alpha 档位规则**：全文件 `rgba(255,255,255,x)` 只允许出现 **.04 / .07 / .11 / .16（深色 surface 系）+ .34 / .50 / .68（浅色玻璃）+ .72 / .55（border）**。20+ 种透明度逐一落到这 9 档；深色模式由语义 token 自动接管，禁止在深色块里再写裸 rgba。

**文字 alpha 档位规则（2026-09-08 用户修订）**：文字层级不再用 4 个明度灰 hex，统一为**同一墨色 `--ink` 的 alpha 四档**——Primary 100% / Secondary 65% / Tertiary 45% / Disabled 30%；深色模式只换基色（#F0F2F6）、档位不变。旧 hex 灰（#4B5058/#8A9099/#B2B8C1）废止。对比度备注：65% ≈ 4.9:1（AA ✓）；45% ≈ 2.7:1，仅限 caption 小字使用（原 label/metadata 已并入 caption；接受的取舍）；30% 仅用于 disabled 非可读态。

### 5.3 Typography 七级（2026-09-08 用户修订：48/32/24/20/16/14/12，每级五项齐全）

| 级 | token | font-size | font-weight | line-height | letter-spacing | color |
|---|---|---|---|---|---|---|
| display | --fs-display | 48px | 700 | 1.08 | -0.02em | --text-primary |
| h1 | --fs-h1 | 32px | 700 | 1.2 | -0.015em | --text-primary |
| h2 | --fs-h2 | 24px | 600 | 1.3 | -0.01em | --text-primary |
| h3 | --fs-h3 | 20px | 600 | 1.35 | -0.005em | --text-primary |
| body | --fs-body | 16px | 400 | 1.55 | 0 | --text-secondary |
| small | --fs-small | 14px | 400 | 1.5 | 0 | --text-secondary |
| caption | --fs-caption | 12px | 500 | 1.4 | 0.01em | --text-tertiary |

- 22 种字号全部映射进七级（映射表见第 3 章）；原 body-medium/label/metadata 三档并入（body-medium→small；label/metadata→caption）；字号下限从 10.5px 提到 12px。
- 实施形式：七级先以 utility 类（`.t-display` … `.t-caption`）落地，存量样式逐页替换，**不删旧 font-size 声明直到该页迁移完成**。强调正文（按钮/选中项）用组件级 font-weight:500，不单设档位。

### 5.4 Spacing（8 档，2026-09-08 用户修订：4/8/12/16/24/32/48/64，禁止组件自定）

| token | 值 | 典型用途 |
|---|---|---|
| --sp-1 | 4px | 图标与文字微距 |
| --sp-2 | 8px | 行内元素间距、chip 内距 |
| --sp-3 | 12px | 列表行内距、紧凑卡片 |
| --sp-4 | 16px | 卡片内距（默认） |
| --sp-5 | 24px | 卡片内距（大）、sheet 内距、区块之间 |
| --sp-6 | 32px | 大区块之间 |
| --sp-7 | 48px | sheet 顶部留白、页面段落 |
| --sp-8 | 64px | 全屏层留白（Onboarding/Focus） |

- 原 20/40/80 三档废止：20→16 或 24（看松紧语境）、40→48、80→64。
- **硬性规则**：padding/margin/gap 只允许取这 8 档；例外仅 0、1px（hairline/描边）、-1px（光学对齐）与 auto/百分比等非节奏值。

### 5.5 Radius（5 档 + 圆形）

| token | 值 | 吸收旧值 |
|---|---|---|
| --r-sm | 12px | 2/5/7/8/10/11/12px 中"小型元素"升档；2/5/7px 一律改 --r-pill |
| --r-md | 16px | 16px |
| --r-lg | 22px | 22px |
| --r-xl | 28px | 24/27/30px |
| --r-pill | 99px | 44/99px（胶囊、进度条、微型元素） |
| --r-full | 50% | 50%（圆形头像/圆点） |

### 5.6 Elevation（4 级）

| token | 浅色值 | 深色值 | 用途 |
|---|---|---|---|
| --elev-flat | none | none | 行、chip、metric |
| --elev-surface | 0 8px 32px rgba(60,70,100,.055)（=旧 --sh） | 0 8px 32px rgba(0,0,0,.30) | 卡片、panel |
| --elev-floating | 0 10px 34px rgba(60,70,100,.09) | 0 10px 34px rgba(0,0,0,.42) | toast、悬浮按钮、cap-in 弹出 |
| --elev-modal | 0 32px 80px rgba(60,70,100,.14) | 0 32px 80px rgba(0,0,0,.55) | sheet、Focus 全屏层 |

7 种一次性阴影全部归入 4 级；玻璃卡以"blur + border + 极低阴影"表达层级，阴影只做补充——这与既有气质一致，不做重阴影。

### 5.7 Opacity

| token | 值 | 用途 |
|---|---|---|
| --op-disabled | .38 | disabled 态统一透明度（配 cursor:not-allowed） |
| --op-secondary | .68 | 次要内容压暗/压淡 |
| --op-glass | （即 surface 三档，见 5.1，不另设） | 玻璃 |
| --overlay | 见 5.1/5.2 | 遮罩 |

**loading 态规范**：不引入 spinner 组件。loading = 内容置为 `opacity: var(--op-disabled)` + 文案后缀"…"，与 disabled 的区别是保留 pointer-events:none 但视觉带 800ms 呼吸动画一次——够用且零新增组件。

### 5.8 组件状态矩阵（标准）

| 组件类 | default | hover | pressed | focus | disabled | loading | error | success |
|---|---|---|---|---|---|---|---|---|
| btn-primary | **--ink 底 + --bg 字（2026-09-08 N1 定版：墨色主按钮，深色模式自动反白；accent 保留给完成/活跃语义，不作按钮底色）** | 亮度+3% | scale(.98) | outline accent-line | --op-disabled | 文案+…+op | danger 底变体 | — |
| btn-quiet / ghost | surface/透明 | surface 升档 | scale(.98) | 同上 | --op-disabled | 同上 | — | — |
| filter-chip | surface-thin | surface | scale(.97) | outline | --op-disabled | — | — | 选中=accent-soft+accent-line 边 |
| seg / tab | text-tertiary | text-secondary | scale(.97) | outline | — | — | — | 选中=accent-strong 文字+accent-soft 底 |
| tl-row | surface | surface-strong | scale(.99) | outline | --op-disabled | 行级 op+… | 左边条 --danger | 完成=划线+text-disabled |
| habit-chip | surface-thin | surface | scale(.97) | outline | --op-disabled | — | — | success=accent-soft 填充+✓ |
| field | surface-thin 底 border-soft | — | — | 边框 accent-line | --op-disabled | — | 边框 --danger+--danger-soft 底 | — |
| sheet | surface-strong+elev-modal | — | — | — | — | — | 内部 field 错误态 | — |
| toast | surface-strong | — | — | — | — | — | 左边条 --danger+danger-soft | 左边条 --accent+success-soft |

全局既有 `:focus-visible` outline、`min-height:44px`、`touch-action:manipulation` **必须原样保留**（正则测试依赖这些字面量）。

### 5.9 旧 token → 新 token 映射表

| 旧 | 新 |
|---|---|
| --ink-1 | --text-primary（值 = rgba(34,37,42,1)） |
| --ink-2 | --text-secondary（值 = rgba(34,37,42,.65)，非旧 hex） |
| --ink-3 | --text-tertiary（值 = rgba(34,37,42,.45)，非旧 hex） |
| --ink-4 | --text-disabled（值 = rgba(34,37,42,.30)，非旧 hex） |
| --accent | --accent |
| --accent-ink | --accent-strong |
| --accent-soft / --accent-line | 不变名 |
| --danger / --danger-soft | 不变名 |
| --glass | --surface |
| --glass-2 | --surface-strong |
| --glass-thin | --surface-thin |
| --brd | --border |
| --brd-soft | --border-soft |
| --blur | --blur |
| --blur-l | --blur-strong |
| --hair | --divider |
| --sh | --elev-surface |
| --r-sm/md/lg/xl | 值不变，语义保留（sm=12 建议升档，见 5.5） |
| 第二个 :root 的 --urgent | 收编进主 :root |
| （硬编码 #F1F3F6/#F2F4F8/#E7EBF3/#E5EAF1/#ECEFF5） | 近灰填充统一为 --surface-thin 或 --bg 分档，视场景二选一 |
| （硬编码 #E0655A） | --danger |
| （硬编码 #E8A13D） | --warning |

---

## 6. Proposed Product System（4 Tab 收敛蓝图）

设计系统在此的角色：**同一批 card/row/typography 状态，在 4 个 Tab 上重排，而非每页一套样式**——这就是"每页属于同一个产品"的实现方式。

### Today（现在）
- 顶部：日期 caption + 问候 h2
- One-thing 卡：card(surface) + accent-soft，h3 标题，入口按钮 btn-primary
- 今日任务列表：tl-row × N，正文 small；完成后 success 划线态
- 快速添加：cap-in 置底
- **删**：任务类型 chips

### Plan（计划）
- 页题 h1 + 区块标题 h2
- 目标卡：card(surface-strong)，display 级真 pct（接 Goal 真数据），进度条 --r-pill
- 惯例区：habit-chip 网格（success 打卡态）
- sheet：新建任务 / 编辑目标（field + label + btn-primary 保存）

### Progress（回顾 / Evidence）
- 页题 h1「回顾」；副题 small
- 70 天点阵（从 Me 上移）：caption 标签 + --r-pill 圆点
- Weekly Review 卡：insight 组件（accent-soft），Review 保存 → 生成下周 oneThing 调整（最高优先级闭环）
- 证据列表：row（备注 note、完成记录）
- **删**：与 Today 重复的今日 % 区块、Habits 区块

### Me（我的）
- 顶部：头像/名 h3
- 5 个全真面板入口（row：题 small + 说明 caption + 箭头）：goal / health-connect / health / settings / weekly
- **删**：Learning / Journal / Direction / Routine / Habit 展示面板 + 设置页 6 个死行

### 横切
- 全局：4 Tab（seg 状态）、toast（含云同步失败 error）、Focus 全屏（display 计时 + dur 接任务 + 退出可撤销 toast）、Onboarding（h1 主问题 + small 选项，去假剧场）

---

## 7. Implementation Order（统一时间线：设计系统 × 产品修复，5 个 Phase）

```
P1 地基token+Review真保存 ──► P2 排版归一+Goal真pct ──► P3 结构收缩+组件合并 ──► P4 色彩阴影状态收敛 ──► P5 响应式回归+Onboarding
```

### Phase 1：Token 地基 + Weekly Review 真保存（P0）
- **范围**：在既有 :root 后**追加**新语义 token 层（5.1/5.2/5.4/5.5/5.6 全量定义，暂无组件引用）；同批完成 Weekly Review 真保存 + oneThing 化为下周调整（纯 JS 逻辑，零 CSS 依赖）
- **涉及区域**：<style> 顶部 :root 区块；Review 相关 JS 与 sheet
- **验证**：全部正则字面量断言（/min-height:\s*44px/、/:focus-visible[^{]*outline/、/touch-action:\s*manipulation/）通过；Review 保存后 localStorage 数据断言；页面视觉 diff 应为零（token 未被引用）
- **风险**：低。为什么先做：逻辑修复与样式完全解耦，是最高优先级功能且零视觉风险；token 先行并存，后续 Phase 只做"引用切换"，永不批量删除——直接规避 648f1f3 式大扫荡

### Phase 2：Typography 归一 + Goal 真 pct（P0/P1）
- **范围**：落地七级 type 类；逐页（Today→Plan→Me→Progress→sheet）把 22 种字号/无规则字重映射到七级；Goal 面板接真 pct 数据（配合 display 级数字样式）
- **涉及区域**：各页标题/正文 font-size、font-weight、letter-spacing、line-height 声明；goal 面板 JS
- **验证**：grep `font-size:\s*\d` 去重计数 ≤ 7；字重计数 ∈ {400,500,600,700}；逐页人工走查（深浅双模式）；正则断言复跑
- **风险**：中。为什么第二：字号是纯视觉、可逐页独立替换、可用人工截图验证，是最低风险的批量迁移，先练手建立迁移节奏

### Phase 3：结构收缩 + 组件合并（P1，与产品删减同步）
- **范围**：删 Learning/Journal/Direction/Routine/Habit 展示面板与设置 6 死行、删任务类型 chips；chip 双定义拆解为 filter-chip/tag；btn 三变体合并、row+item 合并、metric 收敛、card 基类统一；Onboarding 去假剧场 + ob-goal 写真实 Goal
- **涉及区域**：Me/Plan 页 HTML 区块、对应 CSS 类块、关联 JS querySelector、i18n 遍历节点
- **验证**：JS 选择器清单逐一确认（class 改名影响 querySelector——每删一类先 grep JS 引用）；i18n 文字节点回归（样式删减不应影响，类名删减必须核对）；427 类计数显著下降；各 Tab/panel 打开路径全走一遍
- **风险**：中高。为什么在色彩之前：**先删后收敛**——删掉的面板不需要迁移样式，直接减少 Phase 4 约 30% 的工作量与回归面；且结构问题（假面板）比视觉问题更伤产品

### Phase 4：色彩 / 玻璃 / 阴影 / 状态收敛（P1）
- **范围**：旧 token 逐批改为引用新 token（--ink-1→--text-primary 等，按映射表）；20+ 种白 alpha 归 9 档；7 种阴影归 4 级 elevation；radius 归 5 档；补齐全组件 disabled/loading/error/success 态（按 5.8 矩阵）；Focus 接任务 dur + 退出可撤销；跳过需独立状态不记完成；云同步失败 toast(error) 反馈；toast success/error/info 三变体
- **涉及区域**：<style> 全部色值/阴影/圆角声明；tl-row/habit-chip/btn/field/cap-in/toast 状态块；Focus 与同步 JS
- **验证**：`rgba(255,255,255,` 去重 alpha 计数 ≤ 9；`box-shadow` 声明计数 ≤ 4 token + 少量继承；**间距值校验：padding/margin/gap ∈ {4,8,12,16,24,32,48,64}（例外仅 0/1px/-1px/auto）**；深浅双模式全页人工矩阵（每组件 8 态抽查关键 4 态）；云同步断网模拟测试；正则断言复跑
- **风险**：中。为什么放 Phase 3 后：状态色（danger-soft 等）引用新语义 token，必须等色板地基（P1）与组件形态稳定（P3）后才做，否则返工

### Phase 5：响应式体检 + Onboarding/整固回归（P2）
- **范围**：375/390/430/768/1024/1280/1440/1920 七档走查（维持 px 不迁移，见第 4 章）；深色模式终审；Onboarding 最终视觉；清理未被引用的孤儿类；文档沉淀（token 表 + 组件状态矩阵入 docs/）
- **走查规程（十镜法，2026-09-08 定为标准评审法）**：Zoom out → Ignore content → Hierarchy → Spacing → Typography → Color → Density → Component consistency → Interaction → Compare with design system。首轮执行报告见 docs/form-audit-2026-09-08.md（新增工作项 N1 主按钮颜色决策 / N2 进度可视化 4→2 / N3 节标签收敛 / N4 carousel dots 查证）
- **涉及区域**：@media 区块核对；孤儿 CSS；docs
- **验证**：全断点截图对比；深浅 × 全页矩阵；完整正则测试套件终跑；localStorage 数据兼容性抽查（旧数据在新结构下可读）
- **风险**：低

### 顺序理由总结
1. **P1 先行**：产品最高优先级（Review 闭环）零样式依赖，先交付价值；token 并存策略让后续所有改动都是"增量引用"而非"批量替换"，这是对事故 648f1f3 的结构性防御。
2. **P2 在 P3 前**：排版迁移需要每页走查，先在页面齐全时练熟迁移流程；若先删页面，节奏反而乱。
3. **P3 在 P4 前**：删减先行 = 少迁移 30% 样式；结构（假面板）对产品的伤害大于视觉（色值散乱）。
4. **P4 收敛状态**：状态态依赖稳定后的组件形态与语义色板。
5. **P5 只做验证与收尾**：不给收尾阶段安排结构性改动。

---

*本提案所有 token 值为确定值，无待定项；"不做"清单：Drawer / Popover / CommandMenu / Tooltip / Calendar / DataTable。*
