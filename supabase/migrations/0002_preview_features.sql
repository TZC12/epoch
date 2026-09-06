-- ============================================================
-- Epoch — 阶段二扩表
--   Goals / Reflections / Health（每日摘要 + 数据源连接）
--
-- 与 0001_init.sql 一致的安全模型：RLS 仅所有者读写；anon 无权限；
-- 已通过 0001 在生产部署，跑此迁移不会影响既有表。
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) Goals：方向目标
--    category: direction | outcome | area | quarter
-- ------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kicker text,                              -- 大写小标题：CAREER / HEALTH …
  category text not null check (category in ('direction','outcome','area','quarter')),
  note text,                                -- 当前季度的简短说明
  focus text,                               -- 当前焦点（来自 Onboarding）
  next_step text,                           -- 下一步
  pct integer not null default 0 check (pct between 0 and 100),
  ladder jsonb not null default '[]'::jsonb, -- 3-Year / 1-Year / Quarter / Month / Week
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_goals_user on public.goals (user_id) where archived_at is null;

-- ------------------------------------------------------------
-- 2) Reflections：日复盘（每周只问三个问题）
-- ------------------------------------------------------------
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,                 -- ISO 周一
  week_end date not null,
  went_well text,
  wasted text,
  one_thing text,                           -- 下周只改一件事
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists idx_reflections_user_week on public.reflections (user_id, week_start desc);

-- ------------------------------------------------------------
-- 3) Health Daily：每日健康摘要（只读，Epoch 不记录原始数据）
-- ------------------------------------------------------------
create table if not exists public.health_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  sleep_hours numeric,
  hrv_avg numeric,
  resting_hr numeric,
  steps integer,
  active_energy_kcal integer,
  energy_label text check (energy_label in ('restored','balanced','low')),
  source text,                              -- 'apple_health' | 'health_connect' | 'garmin' | 'oura' | 'manual'
  raw jsonb,
  synced_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ------------------------------------------------------------
-- 4) Health Connections：数据源连接状态
-- ------------------------------------------------------------
create table if not exists public.health_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,                    -- 'apple_health' | 'health_connect' | 'garmin' | 'oura'
  connected boolean not null default false,
  granted_at timestamptz,
  last_sync_at timestamptz,
  scopes text[] not null default '{}',
  primary key (user_id, provider)
);

-- ------------------------------------------------------------
-- 5) Progress Weekly Cache：周聚合缓存（v1 不写入，结构预留）
-- ------------------------------------------------------------
create table if not exists public.progress_weekly_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  completion_pct numeric,
  planned_count integer,
  done_count integer,
  metrics jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ============================================================
-- updated_at 自动更新触发器（与 0001 风格一致）
-- ============================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

drop trigger if exists reflections_updated_at on public.reflections;
create trigger reflections_updated_at before update on public.reflections
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS：所有表仅所有者读写
-- ============================================================
alter table public.goals enable row level security;
alter table public.reflections enable row level security;
alter table public.health_daily enable row level security;
alter table public.health_connections enable row level security;
alter table public.progress_weekly_cache enable row level security;

-- goals
drop policy if exists goals_select on public.goals;
drop policy if exists goals_insert on public.goals;
drop policy if exists goals_update on public.goals;
drop policy if exists goals_delete on public.goals;
create policy goals_select on public.goals for select using (auth.uid() = user_id);
create policy goals_insert on public.goals for insert with check (auth.uid() = user_id);
create policy goals_update on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy goals_delete on public.goals for delete using (auth.uid() = user_id);

-- reflections
drop policy if exists reflections_select on public.reflections;
drop policy if exists reflections_insert on public.reflections;
drop policy if exists reflections_update on public.reflections;
drop policy if exists reflections_delete on public.reflections;
create policy reflections_select on public.reflections for select using (auth.uid() = user_id);
create policy reflections_insert on public.reflections for insert with check (auth.uid() = user_id);
create policy reflections_update on public.reflections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reflections_delete on public.reflections for delete using (auth.uid() = user_id);

-- health_daily
drop policy if exists health_daily_select on public.health_daily;
drop policy if exists health_daily_insert on public.health_daily;
drop policy if exists health_daily_update on public.health_daily;
create policy health_daily_select on public.health_daily for select using (auth.uid() = user_id);
create policy health_daily_insert on public.health_daily for insert with check (auth.uid() = user_id);
create policy health_daily_update on public.health_daily for update using (auth.uid() = user_id);

-- health_connections
drop policy if exists health_connections_select on public.health_connections;
drop policy if exists health_connections_insert on public.health_connections;
drop policy if exists health_connections_update on public.health_connections;
create policy health_connections_select on public.health_connections for select using (auth.uid() = user_id);
create policy health_connections_insert on public.health_connections for insert with check (auth.uid() = user_id);
create policy health_connections_update on public.health_connections for update using (auth.uid() = user_id);

-- progress_weekly_cache
drop policy if exists progress_weekly_cache_select on public.progress_weekly_cache;
drop policy if exists progress_weekly_cache_insert on public.progress_weekly_cache;
drop policy if exists progress_weekly_cache_update on public.progress_weekly_cache;
create policy progress_weekly_cache_select on public.progress_weekly_cache for select using (auth.uid() = user_id);
create policy progress_weekly_cache_insert on public.progress_weekly_cache for insert with check (auth.uid() = user_id);
create policy progress_weekly_cache_update on public.progress_weekly_cache for update using (auth.uid() = user_id);

-- ============================================================
-- 最小授权（与 0001 风格一致）
-- ============================================================
revoke all on public.goals from anon;
revoke all on public.reflections from anon;
revoke all on public.health_daily from anon;
revoke all on public.health_connections from anon;
revoke all on public.progress_weekly_cache from anon;

grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.reflections to authenticated;
grant select, insert, update on public.health_daily to authenticated;
grant select, insert, update on public.health_connections to authenticated;
grant select, insert, update on public.progress_weekly_cache to authenticated;