# Epoch 十镜形式审查（2026-09-08）

> 方法：用户指定的十镜审查法——Zoom out → Ignore content → Hierarchy → Spacing → Typography → Color → Density → Component consistency → Interaction → Compare with design system。
> 对象：index.html 线上版（430px 视口，浅色 5 屏 + 深色 1 屏，截图 .deploy/f1~f6-*.png）。**本轮纯形式审查，不改代码。**
> 前置：设计系统量化规格已由用户定版（文字 alpha 100/65/45/30 · 七级字阶 48/32/24/20/16/14/12 · 间距八档 4/8/12/16/24/32/48/64）。

---

## 1. Zoom out（拉远看整体）

每页骨架健康：单列、上信息下操作、底 Tab 常驻；Today=状态→建议→时间轴，Plan=分段→捕获→清单，Progress=页头→指标块，Me=页头→方向→目标→例程。**问题不在骨架，在「部件家族失控」**：同一概念（进度）有 4 种可视化、同一概念（主操作）有 3 种 CTA 形态、同一概念（节标题）有 3 种样式。拉远看，页面像「同一个产品的不同工程师做的」——气质统一（玻璃、柔光、绿点缀都在），部件语言不统一。

## 2. Ignore content（忽略内容看形式）

- 行节奏统一：时间轴行、收集箱行、例例行都是「左标签+中主体+右槽」结构 ✓
- 空态留白健康：Plan 下半屏全空无焦虑感 ✓
- 纯装饰噪音（形状上即可判定，与内容无关）：sheet 的类型 chips 行（6 个 pill 占两行）、Me Direction 卡的 tag chips + 「Direction → Goals → Routines → Today」链条图——这些块的形状本身就是噪音，与「Chrome stays quiet」冲突（均在既定删除清单内）✓ 已立项
- 已查证（2026-09-08）：Today 建议卡轮播圆点为**真交互**——代码仅在 `cards.length > 1` 时渲染 dots，且每个 dot 绑定真实切换（sug-dot click → 换卡 + on 态同步）。保留。

## 3. Look at hierarchy（层级）

| 页 | 发现 | 判定 |
|---|---|---|
| Today | 日期(约20px/700) 与 33%(约40px) 双焦点略抢；建议卡的黑按钮是全页对比度最高元素，视觉地位超过任务行 | 日期→caption 后解决前者；后者取决于主按钮颜色决策（见 §6/§10） |
| Progress | **层级倒挂**：页内 Today 33% 大数字（约46px）比页题「真实进度」（约28px）大——子块比页题响 | 已立项：删与 Today 重复的今日% 区块 |
| Me | Direction 卡引言（约22px）是全页第二大文本——**假内容占据最高层级** | 假面板删除后自然解决 |
| 全局 | 节标签三种并存：英文大写 eyebrow（PROGRESS/ME/Direction/CAREER…）、中文区块题（收集箱/Goals，约15px/600）、右侧灰 hint（今天/当前焦点/点击看详情） | **新发现，需收敛**（建议见 §10 映射表） |

## 4. Look at spacing（间距）

视觉测量（430px 宽）：卡片内距约 16px ✓；行内垂直约 12-14px（14 非档位 ✗）；区块间约 24px ✓；sheet 顶部留白约 24px（spec 48 ✗）；建议卡与时间轴的间距 ≈ 时间轴行距（区块感弱，节奏单调）。sheet 底部按钮区（保存+已完成·撤销+专注/改期/跳过/删除）过挤。→ 全部由 Phase 4 的「间距 ∈ 8 档」校验门强制归一，无需逐个手调。

## 5. Look at typography（字阶）

视觉测量：日期 ≈20px、33% ≈40px、H1（真实进度/我的系统）≈28px、Direction 引言 ≈22px、行题 ≈15px、按钮 ≈14px/600、meta ≈12px、goal pct ≈16px。
对照七级（48/32/24/20/16/14/12）：40→display 48、28→h1 32、22→h3 20、20(日期)→caption 12（既定映射）、15→body 16 或 small 14、14→small 14、12→caption 12。**无新冲突，全部落入既定 P2 映射表**。字重 600/700 用法与健康度符合预期。唯一新问题：英文 eyebrow 的字号/字距不在七级内（约11-12px + 0.1em 大写），需并入 caption 或作为「页头 eyebrow」唯一特例（见 §10）。

## 6. Look at color（颜色）

- 浅色：Aurora 柔和 ✓、玻璃卡 ✓、**accent 绿目前只出现在 gauge/完成 check/建议 hint/生成链接——严格符合「绿=完成·活跃」语义** ✓
- **主按钮是近黑 pill（#1A1D21 附近），不是 accent**：Today 移回一件、Progress 存入 Inbox、sheet 保存——三处完全一致；深色模式自动反白。**内部一致性高于审计文本的预期**；冲突的是与新 spec（btn-primary=accent 底白字）——这是本次审查最大的决策点（见 §10）。
- 删除=红文字 ✓；深色模式整体成立，无失控裸 alpha 视觉（待 Phase 4 量化）。

## 7. Look at density（密度）

- Today 时间轴行高约 64px（含 meta 两行）——舒展 ✓
- Progress：Habits 卡整宽只承载一行「Habits 2/3」——密度浪费（该区块本就在删除/合并清单）
- Me：Routines 行紧凑 ✓；Direction 卡装饰密度高信息密度低（假面板，删）
- Sheet：底部 6 个动作按钮密度过高，且「保存 / 已完成·撤销 / 跳过」三个完成语义动作同屏——这是 skip=done bug 的 UI 土壤（已立项：跳过独立状态不记完成 + 动作收敛）

## 8. Look at component consistency（组件一致性）——本轮核心发现

| 家族 | 现状形态 | 收敛目标 |
|---|---|---|
| **进度可视化 ×4** | 弧 gauge（Today）、46px 大数字+副句（Progress）、分段进度条（Me goals）、纯数字（Habits 2/3 / Goals 62%） | 收敛为 **2 种**：gauge（今日进度，唯一保留 display 级数字）+ pill 进度条（goal pct）。→ P2/P4 落地 |
| **CTA ×3** | 黑 pill 主按钮、绿文字链接（生成 →）、浅灰 pill 次按钮 | btn 三变体（primary/quiet/ghost）归一；「生成 →」从文字链接改为 quiet/primary 按钮（可点区域 <44px 是可达性问题） |
| **节标签 ×3** | 英文大写 eyebrow、中文区块题、右侧灰 hint | 收敛为一种：页头 eyebrow 最多保留一处（页题上方），页内节标题统一「中文 h3(20) + 右侧 caption hint」组合 |
| **行 ×3** | tl-row（时间+题+meta+右槽）、inbox row（题+右 hint）、goal row（题+pct） | row 基类 + 变体（M3 已立项） |
| **chips ×2** | 类型 chips（sheet）、tag chips（Me Direction） | 全部删除（既定） |

## 9. Look at interaction（交互）

- 做对的：完成 check + 删除线弱化 ✓、sheet 拖拽 handle ✓、seg 白 pill 活动态 ✓、深浅双主题一键切换 ✓
- 问题：① sheet 三个完成语义动作同屏（保存/已完成·撤销/跳过）——跳过必须与完成解耦（既定 P4）；② 「生成 →」：已查证整卡（.myday）绑定 data-open 可点，触达面积达标，.go 仅为视觉引导——无需改（2026-09-08）；③ 轮播 dots 已查证为真交互（见 §2）；④ 按钮 disabled/loading 态全缺（既定 P4 状态矩阵）

## 10. Compare with design system（对照设计系统）

**差距全部可映射进既定 P1-P5**，本轮审查新增 4 项：

| # | 新增项 | 去向 |
|---|---|---|
| N1 | ~~主按钮颜色决策~~ **已定版（2026-09-08）：墨色主按钮**——--ink 底 + --bg 字，深色自动反白；现状三处黑 pill 与 spec 从此一致，accent 只保留给完成/活跃语义 | 已回写两份设计文档 §5.8/§11.8 状态矩阵 |
| N2 | ~~进度可视化 4→2 收敛（gauge + pill 进度条）~~ **已落地（2026-09-08）**：46px 大数字与 Habits 纯数字随 P3 删除；Me 分段 .lv 与 goal 面板无样式死条统一为新 `.pbar` pill 进度条（track+i+pct，dark 规则齐）；Goal pct 数字真实化待 P2 | 已落地（pct 真实化待 P2） |
| N3 | ~~节标签三样式收敛~~ **已落地（2026-09-08）**：页头 eyebrow 每页至多一处（现状即满足）；页内节标题统一「中文 h3 + 右侧 caption hint」——目标/例程与习惯/健康/系统/进展/当前焦点/关联例程/关联任务/回顾全部中文化，ZH2EN 词条补齐；从未接线的 sec.*/gd.*/rt.*/hb.*/dir.*/jn.* key 词条 46 行清退 | 已落地 |
| N4 | ~~建议 carousel dots 真伪查证；「生成 →」按钮化~~ **已查证（2026-09-08）**：dots 为真交互（见 §2）；「生成 →」整卡可点、触达达标（见 §9），均无需改代码 | 已查证，无需改 |

**跨镜总评**：现状的内部一致性（主按钮、行节奏、玻璃气质、绿语义纪律）高于 13 节审计文本的措辞印象；真正的混乱集中在「进度可视化、CTA、节标签」三个部件家族，加上间距/字号从未量化——而这两件事正是设计系统八档/七级要解决的。设计系统方向正确，实施顺序无需调整。

---

## 附：证据截图

| 文件 | 内容 |
|---|---|
| .deploy/f1-today.png | Today 浅色（gauge+建议卡+时间轴） |
| .deploy/f2-plan.png | Plan 收集箱（seg+捕获+生成卡） |
| .deploy/f3-progress.png | Progress（33% 重复块+Habits/Goals/反思） |
| .deploy/f4-me.png | Me（Direction 假卡+目标分段条+例程） |
| .deploy/f5-sheet.png | 任务 sheet（类型 chips+双排按钮） |
| .deploy/f6-dark.png | Today 深色（主按钮反白验证） |

*审查完成于 2026-09-08。未修改产品代码；规格修订全部落入 docs/design-audit-2026-09-07.md 与 docs/design-system-proposal.md。*
