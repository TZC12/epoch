# Epoch 视觉方向定版 · Paper Mono（2026-09-08）

> 依据：用户提供的 8 张参考图（Ollama 官网气质 + 6 个同类极简产品截屏）+ 用户初始审计大纲 §10 色板 + 既有 N1 决策（墨色主按钮）。
> **本文档取代 docs/design-system-proposal.md §5.1/5.2 的玻璃色板**；token 架构（七级字阶/八档间距/五档圆角/四级 elevation/组件八态矩阵）不变，材质与配色换血。

## 1. 参考研究结论（8 图分析 + Ollama）

7/8 张图解析成功，风格高度一致，与 Ollama 官网气质同源：

1. **单色纸面**：浅灰画布 + 纯白卡片，深色模式近黑画布 + 深灰卡。**无一例外**。
2. **无边界分层**：卡片不用边框也不用阴影——靠色阶（白浮在 #F2F2F7 上）分离。阴影只出现在真正悬浮物（底部导航、Sheet）。
3. **黑即强调**：黑色 pill 是唯一主 CTA；激活态 = 黑底白字；最多保留一个微小彩色点缀（一个黄色闪电、一对红绿导航灯）。
4. **排版驱动层级**：超大细字重数字（hero 指标）、小号大写字距拉开的标签（eyebrow）、半粗标题。数字用 tabular-nums。
5. **大圆角**：卡 20-32px、控件 pill。
6. **线性数据可视化**：刻度线仪表、实线→虚线进度线、细描边弧——无填充色块、无彩虹图表。
7. **编辑感点缀**（1/8 图）：一行衬线斜体副题。中文无对应且易腻，**不采纳**。

## 2. 取舍裁决

| 项 | 旧（Soft Glass 时代） | 新（Paper Mono） | 理由 |
|---|---|---|---|
| 画布 | Aurora 渐变斑 + 玻璃叠玻璃 | **纯色 #F7F8FA / #0D0F12**，Aurora 全局删除 | 参考图 8/8 纯色；旧实现"整页磨砂"正是大纲 §10 明令禁止的形态 |
| 卡片 | rgba 白玻璃 + blur + 白边 | **实心白卡 #FFFFFF，无边框无阴影**；暗色 #14171B | 色阶分层（Ollama 式）；blur 只留给悬浮层 |
| Glass 保留区 | 到处 | **仅**：底部导航、Sheet、Modal、AI 面板、浮层 | 大纲 §10 原文清单 |
| 主强调 | 墨色按钮（N1 已定） | 不变：**墨色 pill**（浅色 #17191D 底白字，深色 #F5F6F7 底黑字） | 参考图 7/8 印证 N1 |
| accent 绿 #5BAE82 | 泛用 | **降为纯语义**：仅完成态/活跃态（check 圆环、进度填充、打卡成功） | 参考图只允许一个彩色点缀 |
| 文字 | ink alpha 4 档 | **大纲 §10 hex 直采**：#17191D / #666B73 / #9DA2AA / #C4C8CE（深色 #F5F6F7 / #A4A9B1 / #6E737B / #4A4F57） | 大纲优先级最高且与参考图吻合 |
| 字体 | 系统栈 | **Inter Variable 本地打包**（@fontsource-variable/inter，OFL 可商用）+ 中文系统栈（PingFang SC / Noto Sans SC / HarmonyOS / YaHei）；数字 tabular-nums | Ollama 气质核心；无 CDN、离线可用 |
| 图标 | lucide sprite（内联） | **lucide-react**（tree-shaken，同 family 同语言，0 体积税） | 蓝图不变、工程更优 |
| 粒子背景 | subtle 三档 | **保留**（已是"存在但不被注意到"档），点色改中性灰 | 大纲 §15 允许且现引擎达标 |
| hero 数字 | 46px/700 | **34-40px/300-400 细字重** + 紧字距 | 参考图 8/8 细字重大数字 |
| 数据可视化 | 弧 gauge + pill 条 | gauge 改**细描边弧**（stroke 4px，无填充渐变）；进度条改**细线 + 圆点标记** | 线性化（参考图 6/8） |
| eyebrow 标签 | 中文 h3 + 灰 hint | **12px 字距 0.08em**（中文加字距、英文大写）单一样式 | 参考图 7/8 |

## 3. 新 token 总表（tokens.css 依据）

```css
:root {
  /* 表面（实心，无边框无阴影） */
  --bg: #F7F8FA;            /* 画布 */
  --surface: #FFFFFF;       /* 卡 */
  --surface-sunken: #F2F4F7;/* 内嵌块（输入底、次级区） */
  --surface-raised: #FFFFFF;/* 悬浮物底（配合 blur 用） */
  /* 文字（大纲 §10 直采） */
  --text-primary: #17191D;
  --text-secondary: #666B73;
  --text-tertiary: #9DA2AA;
  --text-disabled: #C4C8CE;
  /* 强调与语义（黑 = 主操作；绿 = 完成/活跃；语义色仅状态条/边使用） */
  --ink: #17191D;           /* 主按钮底、激活态 */
  --accent: #5BAE82;        /* 仅完成/活跃 */
  --accent-strong: #3C8A61;
  --accent-soft: rgba(91,174,130,.12);
  --success/--warning #E8A13D/--danger #C46464/--info #5B7FD7（+soft 档）
  /* 线与分隔 */
  --divider: rgba(23,25,29,.07);
  --border: rgba(23,25,29,.10);   /* 仅悬浮层描边用 */
  /* 悬浮层 glass（唯一 blur 区：导航/Sheet/Modal/AI） */
  --glass: rgba(255,255,255,.72); --glass-border: rgba(23,25,29,.06); --blur: 24px;
  /* 字阶/间距/圆角/阴影/动效 token 不变（七级/八档/5+1/4 级/6 token） */
  --elev-floating: 0 8px 32px rgba(23,25,29,.10);
  --elev-modal: 0 24px 64px rgba(23,25,29,.16);
}
[data-mode="dark"] {
  --bg:#0D0F12; --surface:#14171B; --surface-sunken:#1A1E23; --surface-raised:#1A1E23;
  --text-primary:#F5F6F7; --text-secondary:#A4A9B1; --text-tertiary:#6E737B; --text-disabled:#4A4F57;
  --ink:#F5F6F7;           /* 主按钮反白 */
  --accent:#6FBF93; --accent-strong:#85C9A3; --accent-soft:rgba(111,191,147,.14);
  --divider:rgba(245,246,247,.07); --border:rgba(245,246,247,.10);
  --glass:rgba(20,23,27,.72); --glass-border:rgba(245,246,247,.07);
  --elev-floating: 0 8px 32px rgba(0,0,0,.40); --elev-modal: 0 24px 64px rgba(0,0,0,.55);
}
```

主按钮墨色规则：`background: var(--ink); color: var(--bg);`（深色模式因 --ink/--bg 互换自动反白）。

## 4. 字体与图标供给（回答"是否需要提供文件"）

**不需要用户提供任何文件。**
- Inter Variable：npm `@fontsource-variable/inter`（OFL 1.1，免费商用、可修改可内嵌），构建期打包进 dist，无 CDN、离线可用。
- 中文：不打包（Noto Sans SC 全量 >4MB），用系统栈：`PingFang SC → HarmonyOS Sans SC → MiSans → Noto Sans SC → Microsoft YaHei`。
- 图标：`lucide-react`（ISC），tree-shaking 只打包用到的图标。
- 数字：`font-variant-numeric: tabular-nums`（Inter 内建特性）。

## 5. GitHub 参考补录（用户指定 3 项）

| 项目 | 结论 | 用/不用 |
|---|---|---|
| shadkhan/LifeOps（MIT，MVP 期） | Future Self→Goals→Habits/Tasks→Daily→Weekly Review→回灌 identity 的闭环表述与 Epoch 同构；**AI 产物=Zod 校验 JSON+review-before-save+key 只在服务端+成本可见**——与已批准的 Epoch AI 架构逐条一致 | 佐证架构；不抄代码（Next/Prisma 栈不同） |
| lunanoir21/Life-os-project（MIT，早期） | Next+Rust+SQLite 本地优先；11 模块（Dashboard/Tasks/Notes/Habits/Journal/Finance/Goals/Learning/Calendar/TimeTracker/Settings）= 模块堆，模块间数据流 README 自己都说不清 | **反面教材**：验证 Epoch"少而连"定位；TimeTracker/Pomodoro 不进 Epoch |
| J0hnWIcks/life-os（抓取被限流，已有旧研究） | Projects/KB/Analytics/Weekly Review/Focus | 已在 product-audit §18 记录：工作流设计参考 |

## 6. 对组件系统的直接影响（Phase 1 落地清单）

- Card：`background: var(--surface); border-radius: var(--r-lg);` **无 border 无 shadow**（elev-flat）。
- 输入控件：sunken 底（--surface-sunken）+ 无边框，focus 时 1.5px --ink 描边。
- Sheet/Modal/Tabbar：glass 三件套（--glass + blur + --glass-border）+ elev。
- Seg 激活态：黑 pill 白字（不再是 accent-soft）。
- Tab 激活态：文字 primary + 图标 primary（无背景块）。
- 完成态唯一用绿：check 圆环、进度填充、打卡 chip 成功态。
- Gauge：细描边弧（stroke var(--ink) 12% 作轨道、--accent 或 --ink 作值弧、4px 线宽、无填充）。
- eyebrow：`.eyebrow { font-size:12px; letter-spacing:.08em; color:var(--text-tertiary); font-weight:500; }`（en 大写）。

---
*定版于 2026-09-08。实施即 Phase 1 tokens.css；旧玻璃色板随 legacy.html 退役。*
