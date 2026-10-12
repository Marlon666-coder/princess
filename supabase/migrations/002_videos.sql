-- Our Little World — video moments (private, owner-scoped), mirroring the photo design.
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null unique,
  title text,
  caption text,
  date date,
  location text,
  duration_seconds numeric,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);
create index videos_user_created_idx on public.videos(user_id, created_at desc);

alter table public.videos enable row level security;
create policy "videos_select_own" on public.videos for select using (user_id = auth.uid());
create policy "videos_insert_own" on public.videos for insert with check (user_id = auth.uid());
create policy "videos_update_own" on public.videos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "videos_delete_own" on public.videos for delete using (user_id = auth.uid());

-- Private bucket: files must live under {auth.uid()}/year/month/file.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('couple-videos','couple-videos',false,209715200,array['video/mp4','video/webm','video/quicktime','video/ogg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "video_objects_select_own" on storage.objects for select to authenticated using (bucket_id = 'couple-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'couple-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_update_own" on storage.objects for update to authenticated using (bucket_id = 'couple-videos' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'couple-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'couple-videos' and (storage.foldername(name))[1] = auth.uid()::text);
