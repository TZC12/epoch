-- 0007_note_folders.sql — 备忘成组关系上云
-- 承接 0006 里刻意留空的"云端保留位"（sync.ts push 侧注释）：把本机的文件夹
-- （note.folder_id + note_folders 分片）变成可跨设备恢复的数据。
-- 模式与 0005/0006 完全一致：user_id 归属 + RLS（auth.uid()）+ grant authenticated。
-- 前置：0006 必须先跑过（notes 表由它创建）。整个文件可重复执行。

create table if not exists public.note_folders (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);
alter table public.note_folders enable row level security;
drop policy if exists note_folders_all on public.note_folders;
create policy note_folders_all on public.note_folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.note_folders to authenticated;

/* 先加裸列再挂 FK：这样重复执行时 add column 走 if not exists，
   约束用 drop-if-exists + add 重建，不会第二次报 "already exists"。 */
alter table public.notes add column if not exists folder_id text;

/* on delete set null：删夹只让成员退回散卡，绝不连带删掉用户的备忘内容。 */
alter table public.notes drop constraint if exists notes_folder_id_fkey;
alter table public.notes add constraint notes_folder_id_fkey
  foreign key (folder_id) references public.note_folders(id) on delete set null;

create index if not exists notes_folder_id_idx on public.notes (folder_id);
