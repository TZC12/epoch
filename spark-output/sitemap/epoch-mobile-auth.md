# Sitemap — Epoch 移动端 · 账号体系与数据上云

- **生成时间**：2026-09-21
- **平台**：Mobile（5-Tab 不变）
- **数据源**：用户直接需求（真实 DB + 账号密码登录）
- **页面总数**：9 · **最大深度**：2

## 主导航

- ☀️ 今天 — /today（sun）
- 📋 计划 — /plan（list-todo）
- 🏋️ 健身 — /fit（dumbbell）
- 📖 学习 — /learn（book-open）
- 📝 备忘 — /notes（sticky-note）
- 👤 我的 — /me（user，含「登录/注册」子项）

## 站点树

```
/login (登录/注册) [public]
/today (今天) [auth]
/plan (计划) [auth]
/fit (健身) [auth]
/learn (学习) [auth]
/notes (备忘) [auth]
/health (健康) [auth]
/progress (进展) [auth]
/me (我的·账号/退出/AI接口) [auth]
```

## 关键 Flow

1. **注册并进入**：/login(注册 tab：用户名+可选邮箱+密码) → /today
2. **登录并恢复云端数据**：/login(用户名或邮箱+密码 → profiles 查档 → signInWithPassword → pullIfEmpty) → /today
3. **本机模式逃生（DNS 污染/离线）**：/login「仅本机使用」→ /today（sessionStorage 豁免守卫）
4. **退出并切换账号**：/me 退出登录 → /login

## 账号方案要点（成熟模式）

- Supabase Auth（GoTrue）邮箱+密码；用户名登录 = profiles 表 username→email 查档（0003 触发器已内置，参考 supabase-community auth-ui 与 handle_new_user 模式）
- 无邮箱注册用保留域合成 `<user>@user.epoch`；要求项目关闭 Email Confirmation
- 全部业务表 RLS `auth.uid() = user_id`；0006 新增 fit_sessions / learn_langs / learn_entries / learn_words / learn_active / notes / health_days
- **AI API Key 永不上云**（仅本机 localStorage）
