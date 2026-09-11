# Epoch

**A Personal Operating System for Becoming.** Shape your time. Shape yourself.

把长期方向转化为今天可执行的行动，并用真实行动结果持续调整未来。修复式姿态（不惩罚失败）、能量感知（不打分）、Evidence > vanity metrics。

## 技术栈

React 19 · Vite 7 · TypeScript (strict) · react-router 7 · Zustand（本地事实源）· TanStack Query · i18next（zh/en）· Supabase（认证 + 八表 RLS + 云镜像）· Cloudflare Pages（托管 + `/api/ai` Pages Function）· PWA（manifest + 手写 SW，零依赖）。

## 常用命令

```bash
npm run dev          # 开发（http://localhost:5173）
npm test             # vitest 全量（76 断言）
npm run build        # tsc + vite build → dist/
node scripts/e2e.mjs # Playwright 三主线 E2E（需 dev server :5188）
node scripts/a11y-scan.mjs  # a11y 程序化扫描
```

## 部署（Cloudflare Pages，Git 连接自动构建）

Pages 项目连接 GitHub `TZC12/epoch`（main 分支），推送即部署。**构建配置必须是：**

| 项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| 环境变量 | `SUPABASE_URL`、`SUPABASE_ANON_KEY`（必须）；`NODE_VERSION=22`（Vite 7 要求 ≥20.19）；可选 AI：`AI_ACCOUNT_ID`+`AI_API_TOKEN`（Workers AI 免费额度）或 `AI_BASE_URL`+`AI_API_KEY`+`AI_MODEL`（OpenAI 兼容） |

- `public/_headers` 随构建进 `dist/`：CSP（含 api.open-meteo.com）、`geolocation=(self)`（天气卡需要）、`/sw.js` no-cache。
- `functions/api/ai.ts` 由 Pages 自动编译为 `/api/ai`；key 只在服务端环境变量，前端零 key。
- 未配置 AI 变量时 AI 三能力安静降级，不影响其他功能。

## 里程碑记录

M0-M8（React 迁移七阶段）与 M9（IA 改版：主页三卡/日进度条/天气事件组件/点阵数据表/Me 重排）、M10（PWA）详见 `docs/`——完整审计 `docs/epoch-full-audit-2026-09-08.md`，视觉方向 `docs/design-direction-2026-09-08.md`，迁移与部署 `docs/migration-2026-09-09.md`，AI 架构 `docs/ai-architecture-2026-09-09.md`。
