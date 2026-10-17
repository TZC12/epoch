# Epoch 滚动交互系统 · 实现说明

- 日期：2026-10-17
- 范围：移动端 PWA（`C:\Users\24801\Documents\ChatGPT\New project`）
- 验收：`node spark-output/prototype/verify-scroll.mjs` → 真实断言 32/32，探测器自检按预期 FAIL

## 一、技术选型（先体检后动手）

现有栈：Vite + React 19 + react-router + zustand + 自研设计系统（Tailwind v4 桥接）+ `motion`（framer-motion）。

规范里"不引入职责重叠的第二套动画库"这条直接决定了选型：**不装 GSAP / ScrollTrigger**。

| 能力 | 用什么 | 为什么不用 JS |
| --- | --- | --- |
| 吸顶（sticky nav / 筛选区） | 原生 `position: sticky` | JS 模拟只会更贵且会抖 |
| 横向吸附（习惯行） | 原生 `scroll-snap-type` + `mask-image` 渐隐 | 手势、惯性、可达性全归浏览器 |
| 滚动进度联动（进度线、视差、背景降强度） | 一个共享派发器发布 CSS 变量，效果写在 CSS 里 | 每帧只在 JS 里读一次值，其余交给合成层 |
| 进入视口揭示 | 共享单个 `IntersectionObserver` | 逐元素挂观察器 = 列表一长就失控 |
| 滚轮/触摸劫持 | **不做** | 规范红线，也违反平台惯性 |

派发器每帧只做三件事：读一次 `scrollTop/scrollHeight`、比较后写三个自定义属性、把值广播给订阅者（目前只有矩阵背景）。值没变就直接 return，所以橡皮筋回弹那些同值帧不产生样式重算。

## 二、改动文件

新增
- `src/lib/scroll/scroller.ts` — 全站唯一滚动派发器（`attachScroller` / `resetScroll` / `subscribeScroll` / `readScroll` / `prefersReducedMotion`）
- `src/components/scroll/Reveal.tsx` + `reveal.css` — 一次性揭示，共享一个 IO
- `src/components/scroll/SnapRow.tsx` + `snap-row.css` — 横向吸附行（溢出检测 + 两端渐隐）
- `spark-output/prototype/verify-scroll.mjs` — 32 条可观测断言 + 自检
- `spark-output/prototype/shots-scroll.mjs` — 8 张滚动态实拍

修改
- `src/app/app-shell.css` — `.app` 声明 `--scroll-*` 初值；删掉 `.app-main` 的 `overflow-y: auto`（见第四节）；新增 `.app-progress` 与 `.parallax`
- `src/app/AppShell.tsx` — attach 派发器（宿主 `.app`）、进度线 DOM、切页改用 `resetScroll()`
- `src/features/plan/plan-page.css` / `PlanPage.tsx` — 周条 + chips + 计数包成 `.plan-filter` 吸顶
- `src/features/today/home.css` / `HomePage.tsx` — 页头视差、习惯行换 `SnapRow`、MODULES 区块 `Reveal`
- `src/components/netbg.css` — 背景视差层（≤10px，同向慢移）
- `src/components/MatrixBackground.tsx` — 自带的 `document` capture 监听换成订阅派发器（同屏一个滚动监听）
- `src/components/ui/insight.css` — 实拍发现的窄屏挤压（滚动系统顺手抓到，见第五节）

## 三、每个效果的触发逻辑

**进度线**：`.app-progress` 是 `.app-main` 的第一个子元素，`position: sticky; top: env(safe-area-inset-top)`；填充条 `transform: scaleX(var(--scroll-p))`（只动 transform，不动 width）。显隐由 `.app-main[data-scrolled='1']` 控制——一屏装得下的页面不会出现一条永远 0 或 1 的线。

**吸顶筛选区**：`.plan-filter { position: sticky; top: calc(env(safe-area-inset-top,0px) + 2px) }`，让开状态栏安全区和 2px 进度线；背景必须是实色 `var(--bg)` 且左右出血到 `--page-x` 之外，否则行内容穿过时两侧留缝。描边由 `data-scrolled` 驱动，不在 JS 里加类。

**视差（两层，反向分离）**：页头 `translate3d(0, calc(var(--scroll-y) * -0.05), 0)`（快、反向），背景 `min(10px, calc(var(--scroll-y) * 0.02))`（慢、同向、封顶 10px）。幅度压在 ±12px 内——这是层次，不是营销页。

**揭示（Reveal）**：`useLayoutEffect` 先量一次，首帧就在视口内的直接落到可见态（不与路由层淡入叠成两层动效）；屏下的才注册进共享 IO，`rootMargin: 0 0 -8% 0`，进场即 `unobserve`。初始隐藏态只写在 `@media (prefers-reduced-motion: no-preference)` 里——JS 没跑起来时内容照样可读。

**横向吸附行（SnapRow）**：`scroll-snap-type: x proximity`（刻意不用 mandatory：轻扫时能停在两项之间看到"还有半个"）+ `overscroll-behavior-x: contain` + `touch-action: pan-x`（纵向手势仍归页面）。每个实例一个 passive scroll 监听 + ResizeObserver，写 `data-overflow/atStart/atEnd`，CSS 据此切换 `mask-image` 两端渐隐——放得下就完全不渐隐。

## 四、桌面 / 移动差异

| 点 | 移动（<1024） | 桌面（≥1024） |
| --- | --- | --- |
| 滚动者 | 文档（见下） | 文档；侧栏 `.app-sidebar` 自身 `sticky; height:100dvh` |
| 进度线 | 全宽出血到内容列边 | 只在 720px 内容列内，不压侧栏 |
| 吸顶带 | 状态栏安全区 + 2px | 安全区为 0，行为一致 |
| 习惯行 | 横向可滚 + 两端渐隐 | 同一条规则，通常一屏放得下 → `data-overflow=0`，不渐隐 |
| 触摸 | `pan-x` 限横向、不劫持滚轮 | 滚轮/触控板走原生 |
| 减弱动效 | 视差归零、揭示直接可见、路由淡入关闭；进度线保留（它是位置信息，不是装饰） | 同 |

## 五、两个实测才发现的坑（下次别再猜）

**① `.app-main` 的 `overflow-y: auto` 一直在静默杀死 sticky。**
`.app` 只有 `min-height: 100dvh`、没给内容列定高，所以内容一长是**文档在滚**，`.app-main` 自己从不滚动——但 `overflow-y: auto` 让它**仍然是后代的 scrollport**，于是 `position: sticky` 相对一个永不滚动的框定位，看起来"吸顶完全失效"（实测滚到底 `.plan-filter` 还停在 top=101）。删掉这一行即可；边距塌陷不受影响（flex item 本身已建立独立格式化上下文，且四边都有 padding）。
同一原因让第一版派发器只监听传入元素时 `--scroll-p` 恒为 0。修法：监听一律 `window` + `capture`（元素的 scroll 不冒泡，但会在捕获路径上经过 window），读数侧 `source()` 现读"谁真的能滚"。MatrixBackground 一直用 `document` capture 收 scroll，正是这个事实的旁证。

**② 观察卡（Insight）在窄屏被自己的按钮挤扁。**
`.insight__main { flex: 1 }` 的基准是 0，而今天页"你的今天有点重"守护条有 3 颗按钮（≈280px），375 宽下标题只剩 ~40px → **一字一行**。改成 `flex: 1 1 120px` + 容器 `flex-wrap: wrap`：文案至少两行可读，装不下时动作整组下移。这条不是滚动系统的问题，只有在把数据加厚、页面真的滚起来时才露脸——所以顺手固化成 `verify-scroll.mjs` 的 375/320 两条回归断言。

**③（工具侧）验收脚本自己也会静默死。**
`page.evaluate` 里 `new Promise` + rAF 回调，一旦回调抛错（例如 `getComputedStyle(null)`），Promise 永不 settle → 整套脚本挂死 5 分钟、一行输出都没有。现在 `open()` 会先确认 `.app .app-main` 存在、不存在就带着控制台错误抛出，帧回调内部一律 try/catch 把错误当结果返回。

## 六、验收口径

`verify-scroll.mjs` 每条断言都必须是"没做之前会失败"的可观测量，不看截图主观判断；最后一条故意读不存在的变量，**必须 FAIL**，否则说明整套探测失效。关键实测值：

- `--scroll-p` 0.0000 → 0.5000 → 1.0000，`--scroll-y` 与 `scrollTop` 误差 0px
- 吸顶 top=2（= safe-area 0 + 进度线 2），命中测试仍在筛选区内，行内按钮可点
- 视差：页头 −15.0px / 背景 +6.0px；`reduce` 下两者 0
- 监听器：切 6 次页 scroll 7→7、wheel 6→6、touchmove 6→6；合成 wheel/touchmove 无人 `preventDefault`
- 帧间隔：live p95 16.7ms vs 冻结对照 16.7ms（ratio 1.00）→ 效果层不是瓶颈
- 其余门禁：`eslint` 0 警告、`tsc -b && vite build` 通过、入口 87.57 kB gz（预算 90）、`vitest` 192/192、`audit-layout.mjs` 0 问题（SELFTEST 仍能抓到 7）、`verify-optimizations.mjs` 34/34

## 七、追加（同日第二批）：按页记忆滚动位置

派发器多了 `setScrollScope(pathname)` 与 `scrollToTop()`，行为对齐 iOS/Android 的标签页约定：

- 切走再切回 = 回到当初读到的位置；首次进入 = 顶部；**再点当前标签 = 平滑回顶**（减弱动效下直达）。
- 记录点必须放在 `measure()` 里（每帧 `memory.set(scope, top)`），不能放在"离开时保存"：React 的 cleanup 跑在新页 DOM 提交之后，那时 `scrollTop` 已被新内容改写，存下来的是脏值。
- 恢复分两段：layout effect 先落一次（绘制前，用户看不到跳），再补最多两帧——内容高度可能还没稳定（图片/字体/折叠），一次赋值会被夹到当时上限。补帧只在"还没到位"时进行，用户已经开始滚就不跟他抢。
- `resetScroll()` 已退役，只留这一条路径；切页归零的旧行为由"无记录 = 0"承担。

