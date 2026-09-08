# Epoch 视觉资产与动态交互系统 — 研究报告与实施提案

> 2026-09-08 · 阶段：研究→评估→提案（**未实施**，待批准）
> 数据来源：GitHub API 实取（2026-09-08）、代码库全量扫描、许可原文核验

---

## 0. 一句话结论

**引入 0 个 npm 运行时依赖**，用「Lucide（ISC）精选图标内联为 sprite + 原生 CSS/WAAPI 动效 token 化」替代现状的 17 个手写 SVG 与 12 种散装时长，预计 index.html 净增 ~6KB，六阶段迁移，全部可回退。

---

## 1. GitHub 研究表（14 个候选，API 实取 2026-09-08）

评分模型：GitHub 热度 15% / 维护 15% / 代码质量 15% / 设计质量 20% / 动画质量(或动效适配度) 20% / 文档 5% / 许可适配 10%

### 图标库候选

| 项目 | Stars | Forks | 最近活动 | 许可 | 设计质量 | 总分 | 判定 |
|---|---|---|---|---|---|---|---|
| **lucide-icons/lucide** | 24,399 | 1,558 | 2026-09-07（日更级） | **ISC**（原文核验，非 NOASSERTION 疑虑） | 19/20 | **95** | ✅ **选用（主）** |
| tabler/tabler-icons | 21,624 | 1,201 | 2026-09-03 | MIT | 17/20 | 90 | 备选 |
| tailwindlabs/heroicons | 23,786 | 1,315 | 2026-05-12（放缓） | MIT | 16/20 | 86 | 拒 |
| twbs/icons | 8,122 | 1,120 | 2026-09-03 | MIT | 15/20 | 84 | 拒 |
| iconoir-icons/iconoir | 4,543 | 197 | 2026-08-12 | MIT | 17/20（默认 1.5px 需改） | 85 | 拒 |
| phosphor-icons/core | 371(core) | 52 | 2026-01-06（慢） | MIT | 18/20（多字重优秀） | 83 | 备用保留 |
| react-icons/react-icons | 12,653 | 810 | 2026-09-06 | 聚合多许可 | — | — | ❌ React 专用，框架不符 |
| iconify/iconify | 6,299 | 202 | 2026-09-07 | MIT | — | — | 仅作图标溯源工具，非 family |

### 动画引擎候选

| 项目 | Stars | 最近活动 | 许可 | 总分 | 判定与理由 |
|---|---|---|---|---|---|
| **原生 CSS transitions + Web Animations API** | — | — | — | — | ✅ **选用（唯一引擎）**：零体积、GPU 合成、已在使用 |
| motiondivision/motion | 33,526 | 2026-09-02 | MIT | 91 | ❌ React-first（vanilla 包 ~18KB gz），对无构建单文件是纯开销 |
| anime.js | 72,720 | 2026-08-21 | MIT(v4) | 87 | ❌ v4 仅 ESM/npm 形态，无 UMD，单文件引入需打包器 |
| greensock/GSAP | 28,293 | 2026-04-13 | **自有许可（非 OSI）**，2024 起免费商用 | 89* | ❌ 最小核 ~27KB gz vs 需求；morph/scroll 场景 Epoch 不存在；许可非 MIT 家族 |
| airbnb/lottie-web | 32,085 | 2025-09 | MIT | 85 | ❌ 需要 AE 设计管线产出 JSON，我们无此管线 |
| svgdotjs/svg.js | 11,821 | 2026-08 | 自有文件(MIT 系) | 78 | ❌ 动态生成 SVG 用，我们只消费静态图标 |
| animate.css | 82,781 | 2024-07（停更） | Hippocratic 2.1（非标模板） | 64 | ❌ 类名堆叠式 keyframe 包，与 token 体系冲突 |

\* GSAP 若单看动画能力可满分，但「许可 10%」一栏仅得 2/10，且 27KB 对单文件应用是 11% 的体积税。

---

## 2. 选型结论（第 04/11/37 条：越少越好）

| 角色 | 选择 | 形态 | 运行时依赖 |
|---|---|---|---|
| Icon family（唯一） | **Lucide** | 精选 ~18 枚，构建期从 lucide 静态文件拷贝为 `<symbol>` sprite 内联 | **0**（源头入库标注，node 脚本仅 dev 工具） |
| Secondary icon 源 | 暂不启用 | 若未来需要 fill/duotone，预授权 Phosphor(MIT)；需先过第 44 条决策门 | 0 |
| 动画引擎（唯一） | **CSS + WAAPI** | token 化 + ~1KB motion 工具函数（可选，纯原生封装） | 0 |
| 高级引擎 | **无** | Epoch 无 morph/scroll/路径动画场景；出现时再过决策门 | 0 |
| 加载系统 | Skeleton 优先（已有 shimmer 保留为 content-heavy 专用） | CSS | 0 |

**依赖总数：0 个 npm 运行时依赖，0 个 CDN 脚本。** Bundle 净变化估算：sprite ~18 枚 × ~140B ≈ **+5~7KB（raw）**；删旧散装 SVG 与死 CSS 后预计净增 <4KB（<2%）。

---

## 3. 为什么 Lucide（而不选其他）

1. **视觉语言同源**：24×24 / 2px stroke / round cap+join、几何中性、16px 可读性最佳——正是第 33 条要求的语言；比 Tabler 更「柔和」，贴合 Soft Glass。
2. **维护顶级**：单仓库严格流水线，日级活跃、周级发版（API pushed_at=昨天）。
3. **许可干净**：ISC（原文核验），商用/内联/修改均可，仅需在文档保留版权声明。
4. **Tabler 为什么输**：质量分布不均（6100+ 枚中长尾粗糙）、拐角复杂度略高、更「工程蓝图」气质；Epoch 只需 ~18 枚，数量无优势。
5. **Heroicons 为什么输**：Tailwind 生态绑定气质 + 3 个月活动放缓；Phosphor 为什么输：core 仓库推进慢、多字重优势用不上。

---

## 4. 现状审计（第 38 条，全量扫描 index.html）

### SVG / Icon
- 17 个内联 SVG：15× 24×24 + favicon(96) + 插画(200×112)
- 身份盘点：eye、arrow-right、chevron-left×5+right×1（**6 个重复箭头**）、plus、clock、text、bar-chart、smile、check
- **stroke-width 五种并存**：1.7 / 2 / 2.1 / 2.2 / 2.6（CSS 里写死）
- **视觉尺寸五种并存**：11 / 13 / 19 / 20 / 22px（不在任何 scale 上）
- 颜色全部 currentColor ✓（唯一合规项）

### Motion
- **transition 时长 12 种并存**：.14/.15/.16/.18/.2/.22/.26/.3/.32/.34/.38/.5s——`--dur-1/2/3` token 存在但仅 3 处引用，**12 处时长全部硬编码**
- easing：3 条近似 cubic-bezier（(.32,.72,.24,1)×2 + (.32,.72,0,1)×1）
- @keyframes：d1/d2/d3（Aurora 环境动画，48-66s，合规保留）、enterIn、pulse、shimmer、spin
- prefers-reduced-motion：已有 2 处基础覆盖（animation:none），但 transition 不受控
- 动画目的审查（第 15 条）：Aurora=氛围(保留)、sheet/scrim=continuity(保留)、pulse/spin=loading(保留)、enterIn=orientation(保留)、chip:active=feedback(保留)——**无纯装饰动画需删除** ✓

### CURRENT → TARGET（时长映射表）

| 现状硬编码 | 目标 token | 语义 |
|---|---|---|
| .14/.15/.16/.18s | `--dur-1: 150ms` | Micro（按压/icon/checkbox） |
| .2/.22s | `--dur-2: 200ms` | Component（chip/tab 切换） |
| .26/.3s | `--dur-3: 250ms` | Component 慢档（卡片浮现） |
| .32/.34/.38s | `--dur-4: 350ms` | Page/sheet（现 --dur-3 合并） |
| .5s | `--dur-5: 500ms` | Large visual（Goal 进度弧） |
| — | `--dur-0: 0ms` | reduced-motion 兜底 |

（现有 .16/.24/.32 三档取整归入，视觉差异 ≤20ms 无感知；全库一次性扫换——上次「存量不扫换」例外，因本次目标就是消灭散装时长。）

### Easing TARGET

| Token | 值 | 用途 |
|---|---|---|
| `--ease`（保留现值） | cubic-bezier(.32,.72,.24,1) | 默认 ease-out，全库唯一出场曲线 |
| `--ease-inout` | cubic-bezier(.6,.05,.28,.95) | 状态互转（toggle/移动） |
| `--ease-spring` | cubic-bezier(.34,1.35,.6,1) | 仅 success 确认（轻微、无 bounce 堆叠） |
| `--ease-linear` | linear | 旋转/进度 |

---

## 5. Icon 系统规格（第 05-09 条）

- **尺寸 token（7 档）**：12/16/18/20/24/28/32px → CSS 变量 `--ic-*`；映射：inline 16、nav 20（现 22→20）、action 20-24、visual 28-32；现有 11/13px 图标升档到 12/16 并做光学补偿
- **Stroke（3 档）**：默认 2（=Lucide 原生）、small(≤16px) 1.75、large(≥28) 2.25；现状 1.7/2.1/2.2/2.6 全部消灭
- **光学对齐**：sprite 统一 24 viewBox + wrapper；11px check 这类「用小尺寸撑大 stroke」的写法改为标准 check@16 + stroke 1.75
- **颜色**：仅 currentColor + 语义 token（text-primary/secondary/tertiary/disabled/accent/success/warning/danger），禁止 hex（现状合规，写入规范防回退）
- **形态**：`<svg class="ic"><use href="#i-check"/></svg>` sprite，aria-hidden 装饰 / aria-label 交互（第 29 条），Touch target ≥44px（已有 gate）
- **动效标准（第 09 条）**：hover opacity/scale≤1.05 @150ms；press scale .96；check reveal = stroke-dashoffset @250ms --ease-spring；loading=rotate @--ease-linear；pulse 幅度 ≤.06 opacity；**图标不自行发明动画**

## 6. Motion 系统（第 12-22 条）

- 层级：Micro 120-180 / Component 180-250 / Page 250-400 / Large 400-700 → 由上面 5+1 token 承载
- 页面切换：opacity+4px translateY（quiet/fast），禁止飞入
- Progress 数值：`--dur-4` 缓慢更新，禁大数字跳动（现有 dash 已合规）
- AI 建议：fade-in→highlight→按钮组；apply 即时确认；dismiss quiet fade（现建议卡基本合规，token 化即可）
- Scroll：不新增 parallax；reduced-motion 全覆盖（第 26 条：@media 收口所有 transition/animation → --dur-0 + opacity-only）

## 7. 许可与登记（第 30/36 条）

- Lucide **ISC**：允许商用/修改/内联/再分发；义务=保留版权与许可声明 → 落在 `docs/github-assets.md` 与 sprite 文件头注释
- Phosphor MIT（备用预授权，未使用）；Tabler MIT（备查）
- 拒用记录：GSAP（自有许可非 OSI + 体积）、animate.css（Hippocratic 2.1 非标 + 风格冲突）、react-icons（框架不符）
- Registry：asset/source/version/license/usage 五元组登记（见 docs/github-assets.md 骨架，随实施填充）

## 8. 迁移计划（第 39 条，六阶段，每阶段独立可验证）

| Stage | 内容 | 验证 |
|---|---|---|
| 1 | Icon 系统：sprite + .ic 体系 + 18 枚精选替换 17 个散装 SVG + stroke/size token | 视觉走查 + use 引用断言 + stroke/size 正则 gate |
| 2 | Motion tokens：时长/easing 12→6 全量扫换 + reduced-motion 收口 | 正则 gate（零硬编码时长）+ 243 断言 + 双模式走查 |
| 3 | 核心组件：checkbox reveal/进度弧 token 接线（tab 切换**已剔除**，见下方用户决策） | CDP 程序化动效断言（getComputedStyle） |
| 4 | 页面切换统一（opacity+translateY） | 走查 |
| 5 | SVG 动画（check reveal 等**内容级** AnimatedIcon 集） | jsdom+CDP |
| 6 | 文档收口：4 篇 docs + registry | 评审 |

> **用户决策（2026-09-08，优先级高于本表）**：导航栏（tabbar）**不做动态 SVG、不参与任何动效工作**，保持原样（静态图标 + 激活变色 + 按压缩放，即当前线上形态）。"动态交互"的预算只投给**内容级微交互**：左滑出现删除→点击删除（已上线）、点击界面内图标/功能出现面板或可见反馈（sheet/panel 既有模式）、check reveal 等组件内动效。

每阶段：独立 commit、243+ 断言 GREEN、深浅双模式 CDP 走查、正则出门标准（沿用既有 gate 机制）。

## 9. 修改范围预估（第 43-H 条）

- `index.html`：CSS 块 +~60 行（tokens/.ic/sprite 样式/reduced-motion 收口）、HTML 替换 17 处 SVG 引用、删除死 CSS（.fab 等）
- `scripts/sync-icons.mjs`（新增 dev 工具，node 现成运行时，拉取/校验精选图标）
- `tests/`：+8~12 断言（sprite 存在、stroke/size 档位、reduced-motion、无硬编码时长）
- `docs/`：icon-system / motion-system / svg-guidelines / github-assets（+registry）4 篇
- 不动：业务 JS 逻辑、数据模型、现有 243 断言语义（仅追加）

## 10. 性能与可访问性承诺（第 27/28/29 条）

- 全部动效 = transform/opacity（GPU 合成），无 filter/blur 动画、无 JS 逐帧循环
- Aurora 现有环境动画保留（低频、reduced-motion 已关）
- reduced-motion：全局 media query 一处收口（transition-duration→0、保留 opacity 瞬时切换、Aurora/已有关停逻辑合并）
- 移动端=同 token 少层级，桌面端不增加额外动效（保持一致优先）
