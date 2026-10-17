# Epoch 成熟度批次 · 交互基线与"像 App"的细节

- 日期：2026-10-17（滚动系统之后的第二批）
- 口径：用户原话「怎么美观用起来丝滑流畅，像一个成熟的应用」——只做出戏点与手感，不加装饰性效果
- 验收：`node spark-output/prototype/verify-polish.mjs` → 真实断言 26/26，探测器自检按预期 FAIL

## 改了什么（七件，全部可测）

**1. 触控基线补洞（`src/design/global.css`）**
`touch-action: manipulation` 以前只给 `button`，而底部胶囊与桌面侧栏是 `<a>`（NavLink）——在允许捏合缩放的 viewport 下它们仍可能吃双击缩放判定，点一下要先"等一下"。现在 `a` 也进这一行。
`html { -webkit-tap-highlight-color: transparent }`：App 已有自己的按压反馈（各组件 `:active` 的 scale 档位），iOS 那层灰块是第二重反馈，而且一眼"网页感"。关掉后裸链接会失去反馈，全站只有导航是 `<a>`，所以补 `.app-tab:active / .app-sidebar__link:active { color: --text-primary }`——导航维持"仅颜色过渡"的零装饰约定。
长按选中：只给纯控件（导航/筹码/图标钮/滑轨/开关/FAB/备忘卡）加 `user-select: none`。**刻意不写 `button`**——任务行的行身就是 `<button class="tl-row__body">`，一竿子打尽会把用户真正想复制的标题也禁掉。备忘卡是例外：它的长按手势=拖拽成组，选择手柄一起来就把手势抢了；要复制正文本来就该进编辑器。

**2. 浏览器外壳跟随应用内主题（`src/lib/theme.ts`）**
`index.html` 的静态 `theme-color` 带 `media=(prefers-color-scheme)`，等于让"系统偏好"凌驾于"应用内三轴自选"之上：系统浅色 + 应用内深色 = 状态栏一条白。现在 `apply()` 之后把解析出的 `--bg` 写回，只留一颗 meta 并摘掉 media。
坑：theme.ts 在模块层就被求值（persist rehydrate），那一刻样式表可能还没进文档，读到空值不能放弃——下一帧再试，最多 8 帧。

**3. 切页滚动位置按页记忆（`src/lib/scroll/scroller.ts` + `AppShell.tsx`）**
对齐 iOS/Android 标签页约定：切走再切回=回到当初读到的位置；首次进入=顶部；**再点当前标签=平滑回顶**（减弱动效下直达）。
记录点必须在派发器的 `measure()` 里每帧写 `memory.set(scope, top)`，不能"离开时保存"——React cleanup 跑在新页 DOM 提交之后，那时 `scrollTop` 已被新内容改写，存下来的是脏值。恢复分两段：layout effect 先落（绘制前），再补最多两帧（内容高度可能还没稳定），且只在"还没到位"时补，用户已经开始滚就不跟他抢。`resetScroll()` 退役。

**4. 路由标题**：`document.title = 页面名 · Epoch`，浏览器历史与多任务卡片里能认出是哪一页。

**5. 最后一个原生 `window.confirm` 消失（`actions.ts` + `LearnPage.tsx`）**
「移除语言」以前是 confirm 后级联永久删除。原生确认框卡主线程、样式与 App 脱节，而且它挡不住真正的后悔——撤销才挡得住。现在与删任务/删备忘/删生词同一套：即时移除 + toast「已移除「英语」· 撤销」，`removeLearnLang` 返回快照、新增 `restoreLearnLang` 把语言连同生词与学习记录一起带回。

**6. 常驻合成层清理**：`.tgl__thumb`（/plan 一屏十几行）与 `.reel__strip` 上的 `will-change` 删除——列表级元素常驻提层 = 行数线性带走层数。动画一跑浏览器自己会提层。官方件（stepper/wheel-picker）内部的不动。

**7. 观察卡窄屏挤压**（上一批实拍发现，已随滚动系统提交）：`.insight__main` 的 `flex: 1` 基准为 0，3 颗按钮在 375 下把标题挤成一字一行 → `flex: 1 1 120px` + 容器 `flex-wrap: wrap`。

## 实测数字

| 断言 | 结果 |
| --- | --- |
| 点按 → 画面开始动 | 40.8ms（感知阈值 100ms） |
| 切页累计布局位移 | CLS = 0 |
| 任务行内部常驻合成层 | 0 个（整页 7 个，全是固定数量的小部件） |
| theme-color | 浅 mono #f6f6f7 / 深 mono #0f0f11 / 温馨浅 #f3f2ed / 温馨深 #161511，恒等于画布色 |
| 移除语言 | dialogs=0，撤销后语言 1、生词 4、记录 2 全部回来 |
| 滚动记忆 | 离开 52px → 切两页 → 回来 52px；点当前标签 326 → 0 |

## 两次"错的是断言，不是 App"

- 探针拿 `.tl-row__title` 判断"内容还能不能选中"，报 FAIL。查下来禁选来自官方 swipeable-list 的 `TOUCH_GESTURE_CONTENT_CLASS`（只在有平台按压机势的环境生效，鼠标仍可框选复制）——是正确行为，探针选错了目标，改判 `.eyebrow`。
- 切深色后 theme-color 得到 `#161511` 而非断言里写死的 `#0f0f11`。因为这一步的上下文是"温馨色板 + 深色"，画布本就是 #161511。契约应该是"外壳色 = 当前画布色"，不是某个固定十六进制——写死等于把 palette 轴漏在断言之外。

## 门禁

`eslint` 0 警告 · `tsc -b && vite build` 通过 · 入口 87.97 kB gz（预算 90，余量已不足 2.1 kB，下次往入口图里加东西前先掂量）· `vitest` 192/192 · `verify-scroll` 32/32 · `verify-optimizations` 34/34 · `verify-polish` 26/26 · `audit-layout` 0 问题（SELFTEST 仍能抓到 7，探测器没瞎）。
