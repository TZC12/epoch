-- 0004_app_state.sql — 应用全量状态存储
-- 修复：此前代码向 user_settings 写 key/value 列（表中不存在，400）
-- 专用表：一行存一个用户的全量 state JSON

create table if not exists public.app_state (
  user_id    uuid not null references auth.users (id) on delete cascade,
  key        text not null,
  value      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_state enable row level security;

drop policy if exists app_state_all on public.app_state;
create policy app_state_all
  on public.app_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.app_state to authenticated;
