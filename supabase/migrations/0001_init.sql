-- ============================================================
-- 个人工作台 · 第一阶段初始化迁移（幂等，可重复执行）
--
-- 使用方法：
--   1. Supabase Dashboard → SQL Editor → 粘贴整个文件 → Run
--   2. 执行后到 Settings → Data API 确认 public 在 Exposed schemas
--
-- 登录方式：账号 + 密码（前端将账号名映射为 账号名@users.local 的
-- 合成邮箱，调用 Supabase Email provider 注册/登录）。
-- ⚠️ 必须：Authentication → Sign In / Providers 关闭 Confirm email，
--    否则注册后会卡在「等待确认邮件」（合成邮箱收不到信）。
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) 注册策略：邮箱 + 密码自由注册
--    数据按账号隔离（下方 RLS），不同账号互不可见
--    兼容旧版：清理旧的注册门禁触发器与配置表（幂等）
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.app_config;

-- ------------------------------------------------------------
-- 2) 每日「当日主题」
-- ------------------------------------------------------------
create table if not exists public.day_themes (
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=周一 … 6=周日
  theme text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, weekday)
);

-- ------------------------------------------------------------
-- 3) 每周 SOP 任务模板（可编辑，改动只影响未来日期）
-- ------------------------------------------------------------
create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  time_of_day time,
  category text not null check (category in ('rhythm','exercise','study','supplement','skincare','review')),
  weekdays smallint[] not null check (weekdays <> '{}' and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  is_minimum_standard boolean not null default false,
  notes text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_routine_templates_user on public.routine_templates (user_id);

-- ------------------------------------------------------------
-- 4) 每日任务快照（模板改动不回写历史）
-- ------------------------------------------------------------
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_date date not null,
  template_id uuid references public.routine_templates (id) on delete set null,
  title text not null,
  time_of_day time,
  category text not null,
  is_minimum_standard boolean not null default false,
  notes text,
  status text not null default 'pending' check (status in ('pending','done')),
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_date, template_id)
);

create index if not exists idx_daily_tasks_user_date on public.daily_tasks (user_id, task_date);

-- ------------------------------------------------------------
-- 5) 打卡操作日志（追加式，client_op_id 保证幂等）
-- ------------------------------------------------------------
create table if not exists public.task_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.daily_tasks (id) on delete cascade,
  action text not null check (action in ('complete','undo')),
  client_op_id uuid not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_op_id)
);

create index if not exists idx_task_completions_task on public.task_completions (task_id);

-- ------------------------------------------------------------
-- 6) 个人设置
-- ------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'Asia/Shanghai',
  locale text not null default 'zh-CN',
  holiday_region text not null default 'CN',
  notifications jsonb not null default '{}'::jsonb,
  data_version integer not null default 1,
  template_seed_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RPC 函数
-- ============================================================

-- 幂等生成某日任务快照（打开某日页面时调用）
create or replace function public.generate_daily_tasks(p_date date)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.daily_tasks
    (user_id, task_date, template_id, title, time_of_day, category, is_minimum_standard, notes, sort_order)
  select auth.uid(), p_date, t.id, t.title, t.time_of_day, t.category, t.is_minimum_standard, t.notes, t.sort_order
  from public.routine_templates t
  where t.user_id = auth.uid()
    and t.enabled
    and (extract(isodow from p_date) - 1)::smallint = any (t.weekdays)
  on conflict (user_id, task_date, template_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 幂等打卡/撤销（同一 client_op_id 只应用一次）
create or replace function public.apply_completion(
  p_task_id uuid,
  p_action text,
  p_client_op_id uuid,
  p_occurred_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_action not in ('complete', 'undo') then
    raise exception 'invalid action: %', p_action;
  end if;

  if exists (
    select 1 from public.task_completions
    where user_id = auth.uid() and client_op_id = p_client_op_id
  ) then
    return; -- 已应用过，幂等返回（离线重放/重复点击安全）
  end if;

  insert into public.task_completions (user_id, task_id, action, client_op_id, occurred_at)
  values (auth.uid(), p_task_id, p_action, p_client_op_id, p_occurred_at);

  if p_action = 'complete' then
    update public.daily_tasks
    set status = 'done', completed_at = p_occurred_at, updated_at = now()
    where id = p_task_id and user_id = auth.uid();
  else
    update public.daily_tasks
    set status = 'pending', completed_at = null, updated_at = now()
    where id = p_task_id and user_id = auth.uid();
  end if;
end;
$$;

-- ============================================================
-- RLS：所有表仅所有者读写
-- ============================================================
alter table public.day_themes enable row level security;
alter table public.routine_templates enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.user_settings enable row level security;

-- day_themes
drop policy if exists day_themes_select on public.day_themes;
drop policy if exists day_themes_insert on public.day_themes;
drop policy if exists day_themes_update on public.day_themes;
create policy day_themes_select on public.day_themes
  for select using (auth.uid() = user_id);
create policy day_themes_insert on public.day_themes
  for insert with check (auth.uid() = user_id);
create policy day_themes_update on public.day_themes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- routine_templates
drop policy if exists routine_templates_select on public.routine_templates;
drop policy if exists routine_templates_insert on public.routine_templates;
drop policy if exists routine_templates_update on public.routine_templates;
create policy routine_templates_select on public.routine_templates
  for select using (auth.uid() = user_id);
create policy routine_templates_insert on public.routine_templates
  for insert with check (auth.uid() = user_id);
create policy routine_templates_update on public.routine_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- daily_tasks
drop policy if exists daily_tasks_select on public.daily_tasks;
drop policy if exists daily_tasks_insert on public.daily_tasks;
drop policy if exists daily_tasks_update on public.daily_tasks;
create policy daily_tasks_select on public.daily_tasks
  for select using (auth.uid() = user_id);
create policy daily_tasks_insert on public.daily_tasks
  for insert with check (auth.uid() = user_id);
create policy daily_tasks_update on public.daily_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- task_completions：select + insert（追加式日志，不可修改）
drop policy if exists task_completions_select on public.task_completions;
drop policy if exists task_completions_insert on public.task_completions;
create policy task_completions_select on public.task_completions
  for select using (auth.uid() = user_id);
create policy task_completions_insert on public.task_completions
  for insert with check (auth.uid() = user_id);

-- user_settings
drop policy if exists user_settings_select on public.user_settings;
drop policy if exists user_settings_insert on public.user_settings;
drop policy if exists user_settings_update on public.user_settings;
create policy user_settings_select on public.user_settings
  for select using (auth.uid() = user_id);
create policy user_settings_insert on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy user_settings_update on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 最小授权（显式 GRANT，网页只使用 publishable key）
-- ============================================================
revoke all on public.day_themes from anon;

grant usage on schema public to authenticated;
grant select, insert, update on public.day_themes to authenticated;
grant select, insert, update on public.routine_templates to authenticated;
grant select, insert, update on public.daily_tasks to authenticated;
grant select, insert on public.task_completions to authenticated;
grant select, insert, update on public.user_settings to authenticated;

grant execute on function public.generate_daily_tasks(date) to authenticated;
grant execute on function public.apply_completion(uuid, text, uuid, timestamptz) to authenticated;
