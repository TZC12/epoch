# Epoch React/Vite 迁移与数据迁移记录（2026-09-09）

> 七阶段重构完成记录。决策与审计见 docs/epoch-full-audit-2026-09-08.md §24。

## 1. 架构迁移（legacy 单文件 → React/Vite）

| 旧（legacy.html，4125 行单文件） | 新（M0-M8） |
|---|---|
| 原生 JS + 全局 state + 各自 render | React 19 + Vite 7 + TS strict；zustand（本地事实源）+ TanStack Query（外壳） |
| hash 路由 + data-screen 切换 | react-router（/today /plan /progress /me /goal/:id /health /dev/style） |
| 中文 DOM 文本遍历器 i18n | i18next 全字典（zh/en 对齐，组件零硬文案） |
| app_state JSON blob（全量 upsert） | 0005_norm.sql 八表（directions/goals/routines/tasks/habit_logs/inbox_items/reviews/day_stats，RLS owner-only）+ services/sync.ts 镜像 |
| 布尔 done + 30s rollover 定时器 | completedAt 时间戳；跨日=查询派生（isDoneToday），rollover 只做昨日定格 |
| habits=routines 物化副本 | routines(定义) + habit_logs(打卡日志，unique routineId+date) |
| 13 套 jsdom 正则测试 | 67 个 vitest（组件/服务/Today/Focus/Onboarding/AI/PlanMyDay）+ Playwright E2E 三主线 + a11y 扫描 |

## 2. 数据迁移（一次性，幂等）

- 触发：boot() → migrateLocal()。旧 `localStorage['epoch-state']` → 备份至 `epoch-backup-legacy`（永不删原键）→ mapLegacyState 逐字段映射（tasks/status 补 default、tier 归一、habits→routines+logs、inbox、goals、direction、history→dayStats）→ 写标记 `epoch-migrated-v2`。
- 云端：登录后 migrateCloudLegacy() 读 `app_state['state.full']`（本地无数据时），同样映射。
- 回滚：旧 blob 原样保留 + git 历史保留 legacy.html（M0-M4 提交）。

## 3. 产品闭环终态

日级：Capture→Schedule→Today→Complete→快照 ✅（legacy 已通，语义 1:1 保留）
周级：Capture→Schedule→Execute→Record→Review(回填+历史+AI 观察)→Adjust(oneThing 入箱/计划变更) ✅
目标闭环：Goal CRUD+状态机→Task 挂靠→pct 实时派生（无存储 pct）✅
例程闭环：Routines 定义→habit_logs 打卡→节奏展示 ✅
能量闭环：健康(Demo 明示)→energyOf 可解释规则→Plan My Day 低能量上限+建议 ✅
AI 闭环：真实上下文→Proposal→Preview→Confirm→Apply（拒绝记忆）✅

## 4. 验收记录

- 单测 67 绿（vitest）；E2E 三主线 10/10（Playwright 真浏览器：周级闭环/Inbox 安排/AI preview-apply）
- 视觉验收（judge）：设计系统页、四 Tab+数据态、Goal/Focus/Onboarding、闭环五面、响应式七档——全部 pass（修复循环记录在各轮 verdict）
- a11y 扫描：icon-only 按钮 aria-label 全覆盖、nav/h1/语言属性齐备、触控目标达标
- 性能：vendor 分包（react 95K / supabase 224K / i18n 48K / icons 2.7K / 主包 226K，gzip 计 74K 主包）
- CI：.github/workflows/ci.yml（tsc + vitest + build + functions typecheck）
- legacy 清理：legacy.html / src.legacy / tests/*.test.mjs / 注入与图标脚本已退役

## 5. 已知边界（后续候选）

PWA（manifest+SW，Vite 化后随手可加）；通知系统（依赖 PWA）；真实健康接入（需原生层）；全局搜索/CommandMenu（docs 明令缓议）；Projects 实体（闭环稳定前不加）。

## 6. 增补：M9/M10（2026-09-12）

- **M9 IA 改版**（commit 2f18674）：主页=Today+Plan 合并（DateNavigator 月份+五日条驱动三卡【任务|事件|收集箱】）、DayProgress 日航程条取代仪表盘、天气卡（Open-Meteo，定位拒绝即隐藏）+事件提醒卡、Progress 点阵数据表（日/周/月）、Me 图六重排、导航 4→3。聚合单一来源 completedForKeys/completedAllTime（judge 三轮复核根除周/累计口径漂移）。E2E 10/10、72 测试、视觉验收 9 图 pass。
- **M10 PWA**：manifest + 手写 SW（版本化缓存、导航回退、API/跨域不缓存）、仅生产注册；_headers 适配（geolocation=(self)、Open-Meteo 入 CSP、sw.js no-cache）。真浏览器验证 registered+activated+controller。76 测试。
- **上线替换旧版**（本节随部署更新状态）：Pages 构建配置切换为 `npm run build` → `dist`；推送 main 触发自动部署；旧 inject.mjs 构建链路退役。
