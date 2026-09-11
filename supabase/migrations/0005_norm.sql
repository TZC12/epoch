-- 0005_norm.sql — 规范化数据层（React 迁移正式表）
-- 依据：docs/epoch-full-audit-2026-09-08.md §18 实体模型（已批准）
-- 关键裁决：
--   * Event ≡ Task(time ≠ null)，不建独立表
--   * habits 双写废除：routines 存定义，habit_logs 存打卡（打卡=日志，非布尔翻转）
--   * goals 不存 pct（永远由 tasks/habit_logs 派生，goalPct()）
--   * 70 天点阵/日统计由 tasks.completed_at + habit_logs 派生；day_stats 仅作 legacy 导入与跨日定格缓存
--   * Direction 1─1 User（statement + domains + wake/sleep/work）
--   * Review 按 (user_id, week_key) 唯一（复盘可回填，不再覆盖丢失）
-- RLS 模式照 0004：enable + policy using auth.uid() + grant authenticated。
-- 执行方式：Supabase Dashboard SQL Editor（或 supabase db push）。0001-0004 旧表暂不删除（Phase 6 清理）。

-- ───────────────────────── directions ─────────────────────────
create table if not exists public.directions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  statement  text not null default '',
  domains    jsonb not null default '[]'::jsonb,   -- string[]
  wake       text,                                  -- '06:50'
  sleep      text,                                  -- '23:20'
  work       text,                                  -- 自由文本（如 '08:00 – 18:30'）
  updated_at timestamptz not null default now()
);

alter table public.directions enable row level security;
drop policy if exists directions_all on public.directions;
create policy directions_all on public.directions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.directions to authenticated;

-- ───────────────────────── goals ─────────────────────────
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  kicker     text,                 -- 'CAREER' / 'HEALTH' 域标签（展示用）
  note       text,
  focus      text,                 -- 本季焦点
  next       text,                 -- 下一步
  ladder     jsonb not null default '[]'::jsonb,   -- [{lv,t,cur}]
  status     text not null default 'active'
             check (status in ('draft','active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id, status);

alter table public.goals enable row level security;
drop policy if exists goals_all on public.goals;
create policy goals_all on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.goals to authenticated;

-- ───────────────────────── routines ─────────────────────────
create table if not exists public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  goal_id    uuid references public.goals (id) on delete set null,
  name       text not null,
  sub        text,                 -- 'Mon / Wed / Fri' 等（展示用）
  frequency  jsonb,                -- 结构化频率（可空，Phase 4 细化）
  time       text,                 -- '22:00'
  dur_min    integer check (dur_min is null or dur_min > 0),
  kind       text not null default 'routine' check (kind in ('habit','routine')),
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routines_user_idx on public.routines (user_id, archived);

alter table public.routines enable row level security;
drop policy if exists routines_all on public.routines;
create policy routines_all on public.routines for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.routines to authenticated;

-- ───────────────────────── tasks（全 App 唯一任务存储） ─────────────────────────
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  goal_id      uuid references public.goals (id) on delete set null,
  routine_id   uuid references public.routines (id) on delete set null,
  title        text not null,
  tier         text not null default 'block' check (tier in ('main','block','anytime')),
  status       text not null default 'planned'
               check (status in ('planned','scheduled','completed','skipped','cancelled')),
  date         text,                -- 'YYYY-MM-DD'（null=今天/随时，与 legacy 对齐）
  time         text,                -- 'HH:MM'（非 null ⇒ Event，显式定档）
  dur_min      integer check (dur_min is null or dur_min > 0),
  urgent       boolean not null default false,
  completed_at timestamptz,         -- 打卡时刻；日复位=查询派生，不再有重置 hack
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tasks_user_date_idx    on public.tasks (user_id, date);
create index if not exists tasks_user_cplat_idx   on public.tasks (user_id, completed_at);
create index if not exists tasks_user_status_idx  on public.tasks (user_id, status);

alter table public.tasks enable row level security;
drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.tasks to authenticated;

-- ───────────────────────── habit_logs（打卡=日志） ─────────────────────────
create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  date       text not null,        -- 'YYYY-MM-DD'
  value      integer not null default 1,   -- 预留数值打卡；布尔=1/0
  created_at timestamptz not null default now(),
  unique (routine_id, date)
);

create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, date);

alter table public.habit_logs enable row level security;
drop policy if exists habit_logs_all on public.habit_logs;
create policy habit_logs_all on public.habit_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.habit_logs to authenticated;

-- ───────────────────────── inbox_items ─────────────────────────
create table if not exists public.inbox_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null,
  hint              text,          -- 建议位文案（如 '周四 22:00'）
  status            text not null default 'open' check (status in ('open','converted','dismissed')),
  source            text,          -- 'capture' | 'review_one_thing' | 'ai'
  converted_task_id uuid references public.tasks (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists inbox_user_status_idx on public.inbox_items (user_id, status);

alter table public.inbox_items enable row level security;
drop policy if exists inbox_items_all on public.inbox_items;
create policy inbox_items_all on public.inbox_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.inbox_items to authenticated;

-- ───────────────────────── reviews（周复盘，可回填） ─────────────────────────
create table if not exists public.reviews (
  user_id    uuid not null references auth.users (id) on delete cascade,
  week_key   text not null,        -- '2026-W37'（ISO 周，周一为始）
  wins       text not null default '',
  drained    text not null default '',
  one_thing  text not null default '',   -- → Inbox（source='review_one_thing'）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_key)
);

alter table public.reviews enable row level security;
drop policy if exists reviews_all on public.reviews;
create policy reviews_all on public.reviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.reviews to authenticated;

-- ───────────────────────── day_stats（跨日定格缓存 + legacy 导入落点） ─────────────────────────
-- 审计 §18：DaySnapshot 应由查询派生、不设缓存表——但 legacy history 无法反推逐任务 completed_at，
-- 且任务会被增删（回溯漂移）。折衷：新数据按日定格写入此表（rollover 时），历史数据从 legacy history 导入。
create table if not exists public.day_stats (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       text not null,        -- 'YYYY-MM-DD'
  done       integer not null default 0,
  total      integer not null default 0,
  urgent     boolean not null default false,
  primary key (user_id, date)
);

alter table public.day_stats enable row level security;
drop policy if exists day_stats_all on public.day_stats;
create policy day_stats_all on public.day_stats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.day_stats to authenticated;
