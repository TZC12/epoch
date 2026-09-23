-- 0006_cloud_sync_slices.sql — 健身/学习/备忘/健康 上云
-- 模式与 0005 完全一致：user_id 归属 + RLS（auth.uid()）+ grant authenticated。
-- 注意：AI 接口配置（baseUrl/apiKey/model）刻意 NOT 入云——密钥只存用户本机浏览器。

create table if not exists public.fit_sessions (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  course_id  text not null,
  date       date not null,
  minutes    integer not null default 0,
  kcal       integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.fit_sessions enable row level security;
drop policy if exists fit_sessions_all on public.fit_sessions;
create policy fit_sessions_all on public.fit_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.fit_sessions to authenticated;

create table if not exists public.learn_langs (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  goal       integer not null default 30,
  created_at timestamptz not null default now()
);
alter table public.learn_langs enable row level security;
drop policy if exists learn_langs_all on public.learn_langs;
create policy learn_langs_all on public.learn_langs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.learn_langs to authenticated;

create table if not exists public.learn_entries (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  lang_id    text not null,
  date       date not null,
  words      integer not null default 0,
  minutes    integer not null default 0,
  mode       text not null,
  created_at timestamptz not null default now()
);
alter table public.learn_entries enable row level security;
drop policy if exists learn_entries_all on public.learn_entries;
create policy learn_entries_all on public.learn_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.learn_entries to authenticated;

create table if not exists public.learn_words (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  lang_id    text not null,
  word       text not null,
  meaning    text not null,
  example    text,
  tag        text,
  box        integer not null default 1,
  due        date not null,
  source     text not null default 'manual',
  created_at timestamptz not null default now()
);
alter table public.learn_words enable row level security;
drop policy if exists learn_words_all on public.learn_words;
create policy learn_words_all on public.learn_words for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.learn_words to authenticated;

create table if not exists public.notes (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  tags       text[] not null default '{}',
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.notes to authenticated;

create table if not exists public.health_days (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  steps      integer not null default 0,
  resting_hr integer not null default 0,
  sleep_min  integer not null default 0,
  deep_min   integer not null default 0,
  weight     numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.health_days enable row level security;
drop policy if exists health_days_all on public.health_days;
create policy health_days_all on public.health_days for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.health_days to authenticated;

-- 学习活跃语言指针（单行/用户）
create table if not exists public.learn_active (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  lang_id    text,
  updated_at timestamptz not null default now()
);
alter table public.learn_active enable row level security;
drop policy if exists learn_active_all on public.learn_active;
create policy learn_active_all on public.learn_active for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.learn_active to authenticated;
