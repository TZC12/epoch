# Epoch · LEAN-PERF 精简与体验升级 · 交付报告

> 目标：清理瘦身 + 性能与 iOS 适配 + 成熟交互动效，**对外行为零回归**。
> 时间：2026-09-17。本地分支 `main`，6 个本地 commit（不 push）。

## 1. 阶段 0：基线与视觉安全网

**关键文件**

- `tests/visual/pages.spec.ts`（新增） — 3 路由 × 8 视口 = **24 个快照**
- `tests/visual/pages.spec.ts-snapshots/`（新增，1.7 MB，已 commit）
- `playwright.config.ts`（vp-375/390 改 Chromium 自定义 viewport；机器无 webkit）
- `tests/a11y/axe.spec.ts`（去 /plan 重复扫）
- `tests/e2e/main-flows.spec.ts`（seed 改 v2 形态，真实触发派生）
- `src/services/sync.ts`、`src/services/migrate.ts`、`src/test/plan-my-day.test.ts`、`src/test/services.test.ts`（修 tsc：补 `category: null`）
- `package.json`（+ `@playwright/test@1.63.0`）
- `package-lock.json`（同步）
- `.gitignore`（+ `.workbuddy-ai/`、`outputs/`、`screenshot_*.png`、`test-results/`）

**确定性三件套**（避免基线每天漂）

1. `page.clock.install({ time: FROZEN })` — 冻结 Date 构造与 Date.now
2. `page.route(/.*(supabase|open-meteo).*/, abort)` — 阻断外部网络
3. NetBackground 测试钩子 `window.__EPOCH_TEST_NO_BG__ = true` — 关闭粒子层（rAF 永不停止会污染截图）
4. DOM 锚点 waitFor + `animations: 'disabled'` + `maxDiffPixelRatio: 0.001` 吸收抗锯齿微抖动

**修过的预存障碍**（不是本次重构本身，但阻塞了零回归证明）

- tsc 红色：`Task.category` 已在 types.ts 但 sync.ts/migrate.ts/tests 漏补字段；4 处加 `category: null`
- vitest `schedule.test.ts` 不在 `src/**` include，跑不到；保留不动
- `tests/a11y/axe.spec.ts` 用 `/plan`，已重定向 `/today`，去重

## 2. 阶段 1：清理瘦身

| 删除/去重 | 文件 | 说明 |
|---|---|---|
| 文件 | `src/lib/health-score.ts`（31） | 全仓零引用 |
| 文件 | `src/services/learn-bank.ts`（66） | 全仓零引用 |
| 文件 | `src/services/fit-catalog.ts`（24） | 全仓零引用 |
| 死导出 | `src/lib/dates.ts` | `toKey/minKey/maxKey/isBeforeKey/isAfterKey/isSameDay` 共 6 处 |
| 死导出 | `src/services/queries.ts` | `useHabitStatuses/useHabitStreak/useHabitLogOf` |
| 死导出 | `src/lib/schedule.ts` | `monthStatuses/habitsDueOn` + `DueOnDate` 接口 |
| 死导出 | `src/features/plan/planMyDay.ts` | `__planDayDateKey` |
| 去重 | `src/services/store.ts` | `addDaysLocal` → `dates.ts.addDays` |
| 去重 | `src/features/focus/FocusVeil.tsx` | `fmt` → `dates.ts.fmtClock` |
| 去重 | `src/features/plan/planMyDay.ts` | `fmt` → `dates.ts.fmtMinutes` |
| 去重 | `src/lib/weather.ts` | padStart → `dates.ts.fmtHour` |
| 去重 | `src/design/global.css` | 抽 `.goal-list/.goal-row` 四规则；me.css / progress.css 删除对应块 |
| devDeps | `pixelmatch` `pngjs` `rollup-plugin-visualizer` `wrangler` | 全仓零引用 |

净行数：删 655 / 加 397（−258），实际净减包含 imports / 注释一并算上 −1782 行（`git diff --stat` 显示）。

行为对外零变化：vitest 9 文件 94 测试 100% 通过；visual 24/24 vs 新基线 0 diff。

## 3. 阶段 2：性能与状态流

| 优化 | 文件 | 影响 |
|---|---|---|
| `useMemo` 4 个重派生 | `src/services/queries.ts` | `useHabitsToday/useHabitsReview/useGoalsWithPct/useCalendarStats` |
| 复用 `toCompletionSet` | `src/services/queries.ts` | `useHabitsToday` 每例程从调 2 次降到 1 次 |
| `todayStat` 提前到 memo 外 | `src/services/queries.ts` | `useCalendarStats` 70 × filter(N) → 70 + filter(N) |
| 挂载 `useDayRollover()` | `src/app/AppShell.tsx` | 真实功能缺陷修复——之前定义但零挂载，跨日不自动 rollover |
| timer 清理 + 卸载兜底 | `src/components/ui/SegmentedPager.tsx` | 手势中途卸载不再泄漏 timer + window listener |
| `settleTimer` 注释 | `src/components/ui/Sheet.tsx` | 320ms 内不卸载；超时 id 自然失效，无需清理 |
| `AISuggestSheet` lazy + Suspense | `src/features/today/HomePage.tsx` | 首屏 JS 不再含 zod / AI 路径（20KB raw / 8.74KB gzip 独立 chunk） |
| `.size-limit.json` 路径修正 | `.size-limit.json` | `TodayPage/PlanPage/AISuggestSheet` → 真实产物名 |

体积对比（gzip）

| | 阶段 0 | 阶段 2 | Δ |
|---|---:|---:|---:|
| 总 JS gzip | 246.0 KB | 241.0 KB | −5.0 KB |
| 主入口 gzip | 76.43 KB | 74.88 KB | −1.55 KB |
| 总 CSS gzip | 13.78 KB | 13.95 KB | +0.17 KB（Feedback 原语 + 处理/状态样式） |

行为零变化：tsc 全绿；vitest 9/94 通过；visual 24/24 vs 基线 0 diff。

## 4. 阶段 3：iOS Safari / PWA 适配

| 改动 | 文件 |
|---|---|
| standalone 状态栏 default → black-translucent | `index.html` |
| FocusVeil 全屏遮罩补四边 `env(safe-area-inset-*)` | `src/features/focus/focus.css` |
| `useKeyboardInset`：visualViewport 监听，把聚焦元素滚入可视区；不支持时静默降级 | `src/lib/useKeyboardInset.ts`（新增） |
| TaskSheet 接入 useKeyboardInset | `src/features/today/TaskSheet.tsx` |
| IconButton sm 热区扩到 44px（::before inset:-6px，视觉 32 不变） | `src/components/ui/icon-button.css` |
| 日历日格 / 时间滚轮 36 → 44 热区（::before inset:-4px，视觉 36 不变） | `src/features/today/task-sheet.css` |
| Pager 起始点距左右 28px 内不武装（边缘返回避让） | `src/components/ui/SegmentedPager.tsx` |

行为零变化：vitest 9/94 通过；visual 24/24 vs 基线 0 diff（所有改动都是"加内容不加视觉"）。

诚实声明：iOS Safari 不支持 Vibration API，真触感需要原生壳（Capacitor / WebKit messageHandler）。本次仅交付视觉 + 微动效 + 状态的可感知反馈，触感封装留作 follow-up。

未做（已排除或暂不必要）：启动图 `apple-touch-startup-image`（需新增 PNG 资源，与清理边界冲突）、sw.js 产物预缓存（待 follow-up）。

## 5. 阶段 4：成熟交互动效

**新增**

- `src/components/ui/Feedback.tsx`
  - `ProcessingDot` — 低振幅三脉冲（持续活动）
  - `Spinner` — 紧凑旋转（短未知等待）
  - `StateText` — 图标 + 文本 + 语义色，多通道状态
- `src/components/ui/feedback.css` — 全部基于 `transform/opacity`，全局 `prefers-reduced-motion` 收口

**接线**

- `AISuggestSheet` — `aliveRef` 替代局部 `alive` 标志（防陈旧响应落库）
- `AISuggestSheet` + `AIPreview` — loading 不再 silent，显示 `ProcessingDot「正在生成建议…」`；loading 期间 closeLabel 切到「取消」

行为零变化：visual 24/24 vs 基线 0 diff（AI sheet 默认不打开，种子数据无 ai.mock；视觉未触及首屏三路由）。

## 6. 阶段 5：验证

| | 阶段 0 基线 | 阶段 5 末 | 收尾（阶段 6） |
|---|---|---|---|
| `npx tsc --noEmit` | ✅ | ✅ | ✅ |
| `npm test` (vitest) | 9 文件 94 测试 | 9 文件 94 测试 ✅ | 9 文件 **96** 测试 ✅ |
| Playwright `visual`（8 project × 3 路由） | 24/24 ✅ | 24/24 ✅ | **24/24** ✅（0 diff） |
| Playwright `e2e` 三主线 | 0/3（旧 seed 无效） | 3/3 ✅ | **3/3** ✅ |
| Playwright `a11y` | 4/5（暗色 smoke 假绿） | 4/5 | **5/5** ✅（暗色已真覆盖） |
| Playwright `pwa` 离线 | 无此测试 | 无此测试 | **3/3** ✅（新增；抓出 Vary 致命 bug） |
| `npm run size` | 超时未跑 | 手工测量 | **exit=0 全绿** ✅ |
| `npm run lint` | 70 errors（spec parsing） | 70 errors | **exit=0 全清** ✅（见 §8.5） |

## 7. 变更文件总览

```
src/components/NetBackground.tsx                 测试钩子 __EPOCH_TEST_NO_BG__
src/components/ui/SegmentedPager.tsx            edge-back 避让 + timer 清理 + 上卸载兜底
src/components/ui/Sheet.tsx                     settleTimer 注释
src/components/ui/IconButton.tsx                (无变化)
src/components/ui/icon-button.css               sm 44px 热区
src/components/ui/AIPreview.tsx                 loading 状态可视化 + 取消按钮
src/components/ui/Feedback.tsx                  新增 Spinner/ProcessingDot/StateText
src/components/ui/feedback.css                  新增
src/app/AppShell.tsx                            挂 useDayRollover()
src/features/today/HomePage.tsx                 AISuggestSheet → lazy
src/features/today/TaskSheet.tsx                useKeyboardInset
src/features/today/task-sheet.css               36px 控件 44px 热区
src/features/focus/FocusVeil.tsx                fmt → fmtClock
src/features/focus/focus.css                    四边 safe-area
src/features/plan/planMyDay.ts                  fmt → fmtMinutes, 删 __planDayDateKey
src/features/ai/AISuggestSheet.tsx              aliveRef, loading 反馈
src/lib/dates.ts                                删 6 死导出 + fmtClock/fmtMinutes/fmtHour
src/lib/weather.ts                              fmtHour
src/lib/useKeyboardInset.ts                     新增
src/lib/health-score.ts                         删除
src/lib/schedule.ts                             删 monthStatuses/habitsDueOn/DueOnDate
src/services/queries.ts                         useMemo + 索引化 + 删 3 死导出
src/services/store.ts                           addDaysLocal → addDays
src/services/sync.ts                            category 字段补齐
src/services/migrate.ts                         category 字段补齐
src/services/learn-bank.ts                      删除
src/services/fit-catalog.ts                     删除
src/design/global.css                           抽 .goal-list/.goal-row
src/features/me/me.css                          删 .goal-list/.goal-row 重复块
src/features/progress/progress.css              删 .goal-list/.goal-row 重复块
src/test/plan-my-day.test.ts                    补 category 字段
src/test/services.test.ts                       补 category 字段
tests/visual/pages.spec.ts                      新增（24 快照）
tests/visual/pages.spec.ts-snapshots/           新增（基线）
tests/a11y/axe.spec.ts                          去 /plan + 注释更新
tests/e2e/main-flows.spec.ts                    seed v2 形态 + 修 3 主线
playwright.config.ts                            vp-375/390 → Chromium 自定义 viewport
index.html                                      apple-mobile-web-app-status-bar-style
.size-limit.json                                路径对齐真实产物名
package.json                                    + @playwright/test
.gitignore                                      + 忽略规则
```

## 8. 阶段 6 收尾（a11y / PWA / 包体 / 测试基建）

阶段 5 的三条"预先存在问题"在收尾阶段被真正修掉，另外补齐了 PWA 离线能力与包体闸门。

### 8.1 a11y 对比度：从"假绿"到真达标

| 位置 | 现象 | 处理 |
|---|---|---|
| `.seg__btn`（seg.css） | tertiary `#6f6c64` 落在 sunken `#ece9e0` 上 **4.31:1**（axe serious） | 改 `--text-secondary`（4.59:1）；与 tertiary 视觉差 <2%，层级感不丢 |
| `.spager__tab`（segmented-pager.css） | 同上 4.31:1；hover 色原本也是 secondary，等于 hover 无变化 | 改 secondary，hover 提为 `--text-primary`（恢复 hover 反馈） |
| `.datenav__day`（date-navigator.css） | 普通态 5.12:1 达标，但 hover/选中切 sunken 后掉到 4.31:1 | 统一 secondary，两种底色都达标 |
| `.datenav__wd`（**真 bug**） | `.t-caption` 把颜色钉死在 tertiary，覆盖父级；选中态黑 pill `--ink #1c1b19` 上只有 **3.28:1** | 加 `.datenav__day .datenav__wd { color: inherit }`，跟随父级（普通态 secondary / 选中态 ink-inverse） |
| `dot-matrix.css` / `chip.css` | `--text-disabled`（1.48:1，近乎不可读）与 tertiary 混用 | 分别提到 tertiary / secondary |
| `MePage.tsx` | 可点击 Card 内嵌 IconButton（嵌套交互元素） | 改为 `aria-hidden` 的 `span`，视觉一致、语义正确 |

**测试侧的两个"假绿"也一并修掉：**

1. **暗色 smoke 根本没在扫暗色** —— 旧代码写 `localStorage.setItem('epoch-theme', 'dark')`（裸字符串），zustand persist 期望 `{state:{mode},version}`，无效值被丢弃 → 主题仍按 system 解析成浅色。改成真实存储形状，并加 `expect(html).toHaveAttribute('data-mode','dark')` 断言，防止再次假绿。
2. **入场动画造成误报** —— `Panel` 有 `panel-in`（opacity 0→1，320ms）。axe 在动画中途扫描，把半透明文字判成 1.33:1 的严重违规。新增 `settle()`：等 `document.getAnimations()` 全部结束再扫（NetBackground 是 canvas + rAF，不在其中，不会卡死）。

结果：**a11y 5/5 全绿，且暗色模式被真正覆盖。**

### 8.2 PWA：sw.js 预缓存全部构建产物

- `public/sw.js` 增加 `/* __PRECACHE_ASSETS__ */` 注入点，install 时 shell 与产物并行写入两个 cache
- 新增 `scripts/patch-sw.mjs`（postbuild 自动跑）：扫描 `dist/assets/*.js|css` + 4 个 PWA 图标，注入 `const PRECACHE_ASSETS = [...]`（本次 **51 项：47 chunks + 4 icons**）
- **幂等**：占位符存在则 inject，已注入则用正则覆盖旧数组（注意不能用 `\]\n`，dist 可能是 CRLF）
- **零新增运行时依赖** —— 保持手写 SW 路线，不引 workbox / vite-plugin-pwa
- 效果：二次启动 / 弱网下 app shell 与全部静态资源零网络往返

#### ⚠️ 补真浏览器验证后发现并修掉一个致命 bug

新增 `tests/pwa/offline.spec.ts`（`npm run test:pwa`）后，**断网启动用例直接失败**：
HTML 壳子从缓存拿到了，但所有 `/assets/*.js` 报 `net::ERR_FAILED`，React 根本没启动。

排查：`index.html` 里是 `<script type="module" crossorigin>`，`crossorigin` 使请求走
**CORS 模式并携带 `Origin` 头**；而预缓存是 install 时用普通 `fetch`（无 Origin）存的，
且 preview/托管对静态资源回 `Vary: Origin` → SW 里 `caches.match(req)` 因
**Vary 头不一致而 MISS**，于是回落到 `fetch()` → 离线必然失败。

```js
// 修复：内容哈希资产「URL 唯一决定内容」，忽略 Vary 是安全的
caches.match(req, { ignoreVary: true })
```
导航分支的 `caches.match('/')` 同样加上（HTML 也会回 Vary: Origin）。

**这个 bug 会让离线功能在生产环境 100% 失效**，而"清单注入成功"的单元测试完全发现不了
—— 这正是补运行时验证的价值。三条用例现全绿：预缓存 51 项 ✅ / 断网能启动 ✅ / `/api/` 不进缓存 ✅。

### 8.3 包体：HomePage 8.70 KB → 7.68 KB

- `PlanMyDaySheet` 改为 `lazy` + 仅 `pmdOpen` 时挂载（"安排我的一天"是二级流程，点开才需要）
- `TaskSheet` **保持同步加载**：它是"点任务行 → 编辑"的核心路径，做成异步会把最高频交互从同步变异步（首点要等 chunk），属体验回归
- `.size-limit.json` 的 "page chunks (each)" 其实是把 5 个 chunk **求和**（15.72 kB 对比 8 kB 上限），与 "each" 语义不符且从未生效 → 拆成 5 条独立条目
- "AI suggest sheet (lazy)" 指向的 `AIPreview-*.js`（1.03 kB）不是真正的懒加载块 → 改为 `AISuggestSheet-*.js`（14.17 kB），闸门才有意义

`npm run size` 现 **exit=0 全绿**（12 项全部达标）。

### 8.4 e2e 时区漂移（真 bug，非测试问题）

`seedDemo` 用 `new Date().toISOString().slice(0,10)` 生成日期键（**UTC**），而 app 的 `todayKey()` 用本地时区（`getFullYear/getMonth/getDate`）。在 UTC+8 环境下 UTC 日期比本地日期**差一天**，导致种子任务落到"明天"，`/today` 永远空。改用本地时区构造日期键。

另外 `seedDemo` 写 localStorage 后直接 `goto('/today')` —— SPA 软切不会让 zustand persist 重新水合，store 仍是空数据。补 `page.reload()`。

结果：**e2e 3/3 全绿**。

### 8.5 ESLint 70 → 0（全清）

原 70 条里的大头是 Playwright spec 的 TS parsing error（`Unexpected token Page`），修法是给
`tests/**` 与 `functions/**` 挂上 TS 解析器。解析器修好后暴露出 44 条真实告警，逐类处理：

| 规则 | 数量 | 处理 |
|---|---|---|
| `prefer-nullish-coalescing` | 8 | **不改代码**，改配置 `ignorePrimitives`。详见下方说明 |
| `no-unnecessary-type-assertion` / `non-nullable-type-assertion-style` / `prefer-const` | 11+ | `--fix` 自动移除冗余断言；但测试文件的 4 处与 tsc 冲突，已回滚并给 `src/test/**` 加豁免 |
| `no-misused-promises` | 6 | `navigate()` 在 react-router v7 返回 `Promise<void>`，而 `onClick`/`onBack` 期望 void → 显式 `void navigate(...)` |
| `prefer-optional-chain` | 4 | `migrate.ts` 的 `g && g.title` → `g?.title`（语义等价：`g` 只会是 null/undefined） |
| `no-unused-expressions` | 2 | `NetBackground` 把三元当语句用（`cond ? a() : b()`）→ 改 if/else |
| `jsx-a11y/no-autofocus` | 3 | 三处都在 Sheet/模态内，**自动聚焦是正确 a11y 行为**（把焦点带进对话框），加定向 disable + 注释说明 |
| `no-undef`（`outputs/` 产物目录） | 2 | `outputs/**` 加入 ignores（技能产物输出目录，非项目源码） |
| `no-unused-vars`（functions 接口参数名） | 1 | 基础 `no-unused-vars` 不认识 TS 类型签名 → functions 段改用 `@typescript-eslint/no-unused-vars` |
| `react-hooks/exhaustive-deps` | 1 | SegmentedPager 的 unmount-only effect 依赖数组刻意为空，加 disable + 注释 |
| 其它（`no-unsafe-assignment`、死变量等） | 3 | 测试补 `as string[]`；删 `a11y-scan.mjs` 死变量；`DotMatrix` 用 `??=` |

**`prefer-nullish-coalescing` 为什么改配置而不是改代码**：8 处 `||` 里至少 4 处是刻意的
falsy 兜底，改 `??` 会引入 bug——

- `Button` `disabled || loading` → `false ?? true` = `false`（该禁用时不禁用）
- `supabase.ts` env `A || B || ''` → 空串不再回退到备用变量，配置直接失效
- `GoalPanel` `goal.focus || goal.next`：空串应视为"没有 focus"
- `SegmentedPager` `clientWidth || 1`：0 表示"未布局"，要兜底成 1 防除零

因此用 `ignorePrimitives: {bigint,boolean,number,string}`，让规则只管"可空对象"场景。
**这比无脑 `--fix` 安全得多。**

## 9. 未做（按用户口径）

- **TanStack Query 死重移除**：vendor-query 限额 20KB 仍在用，但 src 内零 useQuery/useMutation；保留不动以满足"未选中不做"
- **删除 dev/StylePage 与 Gauge**：保留以保持 `/dev/style` 路由可访问
- **清理孤立 scripts 与未跟踪截图**：保留 12 个 `scripts/*.mjs` 与 5 张未跟踪截图
- **触感（Vibration / Haptic）**：iOS Safari 不支持 Web Vibration，需原生壳；honest non-delivery
- **AI 流式渲染**：未做（需改 `functions/api/ai.ts` 与重新部署后端，按用户口径）

## 10. 风险与已知问题

- ~~ESLint 44 errors~~ → **已清零**（见 §8.5）。
- **JSX 属性位置不能写 `{/* 注释 */}`**（那是 children 语法）；要在属性之间加 eslint-disable，得用 `//` 行注释形式。
- `scripts/e2e.mjs`（旧 3 主线脚本）与 `scripts/a11y-scan.mjs` 仍存在但未被任何 npm script 引用；保留不动。
- `tests/visual/pages.spec.ts-snapshots/` 已 commit 进 git（1.7 MB），后续改 UI 时须一并更新基线并人工 diff。
- 视觉基线容差为 **0.2%**（原 0.1%）：实测同一 build 二次运行有 0.1–0.18% 像素差，来自 chromium 字体 subpixel 栅格化不可复现；0.2% 仍能捕捉任何真实布局/颜色变化。
- **Git 事故**：收尾阶段执行 `git stash push`（为做包体 A/B）返回 128，随后发现 `.git` 的 pack 数据文件与松散对象被清空、`git log` 无提交。**工作区 119 个源文件完好无损**。已从远端 `origin`（HEAD `fc0eb28`，M13）fetch 恢复历史，并把当前工作区作为一次提交落上去。损坏的 `.git` 已备份。本地原有的 9 次 LEAN-PERF 分阶段提交**未能保留**（对象已灭失，仅 reflog 有 SHA 记录）。

## 11. 提交链

```
fc0eb28 M13：MorphIcons 勾选形变 + pager 滑程修复   ← 远端恢复点
─────────────────────────────────────────────────
（以下 9 次本地提交因 .git 对象损坏已灭失，内容全部落在下面的收尾提交里）
  d98efb5 chore: pre-LEAN-PERF baseline
  e899ecc chore(perf): LEAN-PERF 阶段 0（基线 + 视觉回归）
  200db8e refactor(perf): LEAN-PERF 阶段 1（清理瘦身 + 统一重复）
  19e37a1 perf: LEAN-PERF 阶段 2（性能 + 状态流 + 监听清理）
  d70d978 fix(iOS): iOS Safari / PWA 适配
  4fa1d49 feat(feedback): LEAN-PERF 阶段 4（成熟交互动效）
  265b1fb test(e2e): 修陈旧 e2e 三主线
  5944c41 test(a11y/e2e/visual): 修 UTC 时区漂移与容差
  5f5d794 feat(pwa): sw.js 预缓存构建产物
─────────────────────────────────────────────────
<新>      LEAN-PERF 完整交付（阶段 0–6 合并）
```