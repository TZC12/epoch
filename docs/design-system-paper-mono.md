# Epoch 设计系统 · Paper Mono（实现版）

> 2026-09-09 定版实施。方向依据 docs/design-direction-2026-09-08.md（用户参考 Ollama 拍板）。
> 代码位置：src/design/tokens.css（token 单一来源）、src/design/global.css（排版/交互基线）、src/components/ui/（组件实现）。

## 1. Token 架构（组件层零 hex/零硬字号/零硬时长）

| 类别 | token | 值 |
|---|---|---|
| 表面 | --bg / --surface / --surface-sunken / --surface-raised | #F7F8FA / #FFF / #F2F4F7（深色 #0D0F12 / #14171B / #1A1E23） |
| 文字 | --text-primary/secondary/tertiary/disabled | #17191D / #666B73 / #9DA2AA / #C4C8CE（深色 #F5F6F7 / #A4A9B1 / #6E737B / #4A4F57） |
| 强调 | --ink / --ink-inverse / --accent(+strong/soft/line) | 墨色主按钮；accent 绿仅完成/活跃语义 |
| 语义 | success / warning / danger(+strong/soft) / info / urgent | 仅状态提示；urgent 紫仅紧急任务标记 |
| 线 | --divider / --border / --border-strong | 7% / 10% / 16% ink |
| Glass | --glass / --glass-border / --blur | 唯一 blur 区：底部导航/Sheet/Modal/AI 面/浮层 |
| 字阶 | --fs-display…caption | 40/32/24/20/16/14/12（七级 utilities .t-*） |
| 间距 | --sp-1…8 | 4/8/12/16/24/32/48/64（例外仅 0/1px/-1px/auto） |
| 圆角 | --r-sm/md/lg/xl/pill/full | 12/16/22/28/99/50% |
| Elevation | --elev-flat/surface/floating/modal | 卡片 flat；阴影只给真悬浮物 |
| 动效 | --dur-0…5 + --ease/-inout/-spring | 0/150/200/250/350/500ms；reduced-motion 一处收口（--dur-0） |

深色：`[data-mode='dark']` 整表覆盖，档位结构不变。

## 2. 组件族（components/ui，0 UI 库）

Button(primary/quiet/ghost/danger/danger-text + sm/block/loading) · IconButton（强制 aria-label）· Card(flat/sunken/glass) · Field/Textarea（显式 label + error 态）· Seg（激活=黑 pill）· Chip/Tag · Sheet（唯一弹层，glass+modal）· Panel（唯一次级页）· Toast（success/error/info 左边条 + undo 动作）· Row · EmptyState（必有出口）· Gauge（细描边弧+数字下置）· Pbar（细线+圆端）· Checkbox · Metric · Insight · Note · TlRow（左滑删除+幽灵窗）· HabitChip · AIPreview（Preview→Confirm 环）。

状态矩阵：交互组件 default/hover/pressed/focus(:focus-visible 全局)/disabled(.is-disabled)/loading(.is-loading，无 spinner) 全覆盖。

## 3. 硬规则（token gate，CI 可验）

组件 CSS 禁止：hex（tokens.css 除外）、px 字号、非档位 px 间距、裸时长（须 var(--dur-*））。扫描命令见 scripts（gate 在提交前跑）。

## 4. 明确不做

Drawer / Popover / CommandMenu / Tooltip / DataTable / 渐变彩色块 / 有边框又有阴影的卡片 / loader spinner。
