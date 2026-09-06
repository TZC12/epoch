-- 0003_profiles.sql — 用户名登录支持
-- profiles: 每个auth用户一行，保存 username（唯一）与 email
-- 登录时：输入不含 '@' → 按 username 查 email → 再用 email+密码登录

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read"
  on public.profiles for select
  using (true);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id);

-- 注册时自动建档：username 从 signUp 的 options.data.username 读取
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'username', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
