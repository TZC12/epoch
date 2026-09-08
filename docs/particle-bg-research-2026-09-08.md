# 极简动态点阵网络背景系统 — 研究报告

日期：2026-09-08 ｜ 状态：**待批准，未安装任何依赖**
数据检索：GitHub API + bundlephobia API（均为实时取数，非记忆值）

---

## 0. TL;DR

**推荐：原生 Canvas 自定义实现（~3KB 内联，0 依赖），不引入 tsParticles。**

理由：简报 §03 预设的 tsParticles 路线基于 React/构建生态；Epoch 是**单文件 HTML、零框架、无构建**（内联 CSS/JS + localStorage/Supabase），tsParticles slim 需引入 107KB min / **29.8KB gzip 的 CDN 运行时**（约占当前整站 gzip 体积的 40%+），换来的是远超需求的交互引擎。而本需求（15–55 个点、1–2.5px、低透明度、少量连线、慢漂移）用 ~150 行 vanilla Canvas 即可达到，且性能、参数控制、可达性、主题联动全部更优——满足 §03 "纯 Canvas 自定义实现性能和控制明显更好" 的评估通过条件。

**唯一引擎原则（§03）不变**：全 App 只会有这一个背景引擎，不存在第二套。

---

## 1. 候选对比（GitHub API 实测，2026-09-08）

| 项目 | Stars | 最后推送 | License | 维护状态 | 结论 |
|---|---|---|---|---|---|
| **tsparticles/tsparticles** | 8,978 | **2026-09-02** | MIT | 活跃，v4.4.0（2026-08-31 发布） | 唯一合格的现成库 |
| VincentGarreau/particles.js | 30,205 | 2024-03-28 | MIT | 停更 ~2.5 年，367 open issues | 拒（死项目；tsParticles 是其继任者） |
| marcbruederlin/particles.js | 1,667 | 2019-06 | MIT | **已归档** | 拒 |
| JulianLaval/canvas-particle-network | 227 | 2018-08 | **无 License** | 死 | 拒（无协议=法律上不可复用，§26） |
| vanta.js 等 three.js 系 | — | — | — | 依赖 three.js 600KB+ | 拒（数量级不符） |

不单纯按 Stars 决策（§02）：particles.js 星最高但已死；tsParticles 星数第三但唯一活跃。

## 2. 体积与性能对比

| 维度 | @tsparticles/slim v4.4.0 | 自研 Canvas（估） |
|---|---|---|
| 体积 | 107KB min / **29.8KB gzip**（CDN 加载） | ~3–4KB min，**内联进 index.html** |
| 网络请求 | +1 CDN（CSP 已允许 jsdelivr，无需改头） | 0 |
| 运行时抽象 | engine + interaction layers，为通用场景设计 | 只做本需求：无多余路径 |
| 每帧成本 | 60 粒子 + 连线：双方都 <1ms（此规模下均无压力） | 相同量级；DPR cap ≤2 可控省电 |
| 移动端 | 良好 | 良好（更少的 GC/抽象开销） |
| React/TS | 原生契合 | 不适用（Epoch 无 React） |
| reduced-motion / 页面隐藏暂停 | 需配置 | 内建（几行） |
| 主题（浅/深）联动 | 需手写 | 内建（读 CSS 变量） |

**判定**：满足 §03 的"明显更好"条款 → 走原生 Canvas。tsParticles 作为备选记录在案（若未来 App 框架化可重评估）。

## 3. 架构映射（简报 React 架构 → Epoch 单文件现实）

| 简报要求 | Epoch 落地形态 |
|---|---|
| `<ParticleNetworkBackground />`（§04） | `<canvas id="netbg">` 放进 `.aurora` 层内（z0、pointer-events:none、aria-hidden，与 §13/§24 一致；`.stage` 已是 z1，零侵入） |
| `particleNetworkConfig.ts`（§22） | 内联 `NET_PRESETS` 数据对象（ambient/subtle/featured，§23） |
| `tokens/motion.ts` + `colors.ts`（§14） | CSS 变量：`--net-dot / --net-link` 颜色 + `--net-dot-a / --net-link-a` 透明度，`:root` 与 `[data-mode="dark"]` 各一套；JS 启动/切主题时 `getComputedStyle` 取值 |
| `styles/motion.css` | 内联 CSS 小节（约 10 行） |
| 页面分级（§16） | `.phone[data-net="subtle|ambient|featured"]`，切 tab/进面板时改属性；CSS 只切 `--net-*` 不动引擎 |
| 不写死在页面组件（§04/§22） | 引擎为独立 IIFE/函数 + 单初始化入口，页面零粒子逻辑 |

## 4. Epoch Preset 规范（按简报 §05–§15 全文对齐）

| 参数 | featured（Onboarding/登录） | ambient（Progress；默认档） | subtle（Today/Plan/Me） |
|---|---|---|---|
| 粒子数 | desktop 55 / tablet 40 / mobile 25（按 min(w,h) 面积分档，不固定 §05） | 45 / 32 / 20 | 35 / 25 / 15 |
| 粒径 | 1–2.5px 随机（§06） | 同 | 同 |
| 点透明度 | 0.14–0.30（§07） | 0.12–0.26 | 0.10–0.22 |
| 呼吸 | 少数粒子极慢 opacity 波动，无高频闪烁（§07） | 同 | 同 |
| 连线距离 | 150px | 130px | 110px（§08） |
| 线透明度 | 0.10 | 0.07 | **0.05**（mobile 再 ×0.7） |
| 线宽 | 0.6–1px（§08） | 同 | 同 |
| 速度 | 0.1–0.35（§09），慢漂移无定向 | 同 | 同 |
| 鼠标 repulse | 半径 90px、力度极轻（§10）；触摸设备默认关 | 同 | 同 |
| 点击交互 | 关（§11） | 关 | 关 |
| blur/glow | 无（§15） | 无 | 无 |

颜色（§12/§21）：Light 点 `#7C8AA5` / 线 `#A7B2C4`；Dark 点 `#8A94A8` / 线 `#7C8AA5`（低亮度灰蓝，禁高饱和蓝/紫/青/红）。全部经 CSS 变量 + 低 alpha 输出，token 统一管理（§14），组件内零裸 rgba。

## 5. 性能与可达性设计（§19/§20/§24）

- 单 rAF 循环；`document.hidden` / `visibilitychange` → 停帧；恢复时重置时间基线
- `prefers-reduced-motion: reduce` → 只绘制一帧静态点阵（含连线），永不运动
- `devicePixelRatio` cap 2.0；canvas 尺寸随 resize 防抖重建
- 位置更新用 O(n) 漂移 + O(n²) 连线（n≤55，每帧 ≤1,485 次比较，忽略不计）
- `aria-hidden="true"` + `pointer-events:none` + z0（永不影响点击 §13/§24）
- 内容保护（§17）：透明度上限本身保证可读性；另加"自动降档"钩子——sheet 打开时整层 opacity ×0.6（纯 CSS 过渡）

## 6. STOP CONDITION 评估（§28，诚实版）

- Epoch 的空间感目前由 **Aurora 弥散光**承担（品牌资产）。点阵网络的边际价值 = 给光晕增加一层"安静的结构"，属于锦上添花而非刚需。
- 风险真实存在：参数稍强就会破坏"背景不应被注意到"（§27）。缓解：Preset 上限已在 §4 压到简报允许区间的**下限侧**，且引擎+画布+初始化只接触 3 个互不相邻的代码块——**一次 `git revert` 即整体下线**。
- **降级预案（如果实施后评审不过）**：Static Ambient Dot Grid——纯 CSS `radial-gradient` 平铺（0 JS），复用同一套 `--net-*` token，替换成本 ≈ 0。这是评审不过时的 B 计划，不是并行选项。

## 7. 实施计划（获批后执行，预估 1 个 commit）

1. `index.html`：
   - `:root` + dark 增加 4 个 `--net-*` token；`.aurora` 内加 `<canvas id="netbg">` + 样式（absolute/pointer-events none/aria-hidden）
   - 内联 `NET_PRESETS` + 引擎（rAF/漂移/连线/呼吸/repulse/暂停/静态降级，~150 行）
   - tab 切换与 boot/onboarding 处设置 `data-net` 档位（Today=subtle、Plan=subtle、Progress=ambient、Me=subtle、auth/onboarding=featured）
2. 验证：
   - `tests/netbg.test.mjs`：canvas 存在且 aria-hidden/pointer-events、preset 参数在简报区间、reduced-motion 分支、token 存在且组件零裸 rgba、页面分级映射正确
   - CDP：5 档视口（§25 的 375/390/430/1440/1920）断言点数档位、z-index、`document.hidden` 停帧、`prefers-reduced-motion` 静态。**注**：本模型不能读图，§25 的六问评审以数值断言 + 你真机目检双通道完成
   - 全量 277+ 断言 GREEN → commit → 上线 → verify_deploy
3. 回滚：单 commit revert 即完全下线

## 8. 风险

- 手机 Safari 低电量模式 rAF 节流 → 已由 visibility 暂停 + 低帧需求覆盖，实际影响可忽略
- CDN 方案被否后无需 CSP/依赖变更；自研方案无供应链风险
- 与 Aurora 叠加后如果整体观感"过了"：先降档（featured→ambient→subtle），再退 B 计划
