-- Our Little World: private, owner-scoped schema
create extension if not exists pgcrypto;

create type public.date_status as enum ('planned', 'ongoing', 'completed', 'cancelled');
create type public.place_category as enum ('restaurant', 'cafe', 'mall', 'cinema', 'park', 'entertainment', 'nature', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Nasywa',
  email text,
  created_at timestamptz not null default now()
);
create table public.dates (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150), description text, date date not null,
  planned_start_time time not null, planned_finish_time time not null, actual_start_at timestamptz, actual_finish_at timestamptz,
  status public.date_status not null default 'planned', location_name text, address text, latitude double precision, longitude double precision,
  google_place_id text, google_maps_url text, budget numeric(14,2) check (budget >= 0), cover_image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint valid_planned_order check (planned_finish_time > planned_start_time),
  constraint valid_actual_time check (actual_finish_at is null or actual_start_at is not null),
  constraint valid_actual_order check (actual_finish_at is null or actual_finish_at >= actual_start_at),
  constraint valid_tracking_status check (
    (status in ('planned','cancelled') and actual_start_at is null and actual_finish_at is null) or
    (status = 'ongoing' and actual_start_at is not null and actual_finish_at is null) or
    (status = 'completed' and actual_start_at is not null and actual_finish_at is not null)
  )
);
create table public.date_activities (
  id uuid primary key default gen_random_uuid(), date_id uuid not null references public.dates(id) on delete cascade,
  title text not null, description text, start_time time not null, finish_time time, location_name text,
  order_index integer not null default 0 check (order_index >= 0), created_at timestamptz not null default now(),
  constraint valid_activity_order check (finish_time is null or finish_time > start_time)
);
create table public.places (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, address text, latitude double precision, longitude double precision, google_place_id text, google_maps_url text,
  category public.place_category not null default 'other', rating_food smallint check (rating_food between 0 and 5),
  rating_atmosphere smallint check (rating_atmosphere between 0 and 5), rating_service smallint check (rating_service between 0 and 5),
  rating_price smallint check (rating_price between 0 and 5), rating_overall smallint check (rating_overall between 0 and 5),
  review text, visit_date date, is_favorite boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.photos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null unique, image_url text, caption text, date date, location text, is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  unique(id, user_id)
);
create table public.moments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null, description text, date date not null, location text, image_url text,
  photo_id uuid,
  rating smallint check (rating between 0 and 5), is_favorite boolean not null default false, created_at timestamptz not null default now(),
  foreign key (photo_id, user_id) references public.photos(id, user_id) on delete set null (photo_id)
);
create table public.spin_wheel_places (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, category text, is_active boolean not null default true, created_at timestamptz not null default now(),
  unique(id, user_id)
);
create table public.spin_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id uuid, selected_place_name text not null, created_at timestamptz not null default now(),
  foreign key (place_id, user_id) references public.spin_wheel_places(id, user_id) on delete set null (place_id)
);

create index dates_user_date_idx on public.dates(user_id, date);
create index activities_date_order_idx on public.date_activities(date_id, order_index);
create index places_user_category_idx on public.places(user_id, category);
create index photos_user_created_idx on public.photos(user_id, created_at desc);
create index moments_user_date_idx on public.moments(user_id, date desc);
create index wheel_user_active_idx on public.spin_wheel_places(user_id, is_active);
create index history_user_created_idx on public.spin_history(user_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger dates_updated before update on public.dates for each row execute function public.set_updated_at();
create trigger places_updated before update on public.places for each row execute function public.set_updated_at();

create or replace function public.start_couple_date(p_date_id uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.dates set actual_start_at = now(), actual_finish_at = null, status = 'ongoing'
  where id = p_date_id and user_id = auth.uid() and status = 'planned';
$$;
create or replace function public.finish_couple_date(p_date_id uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.dates set actual_finish_at = now(), status = 'completed'
  where id = p_date_id and user_id = auth.uid() and status = 'ongoing';
$$;

create or replace function public.reorder_date_activities(p_date_id uuid, p_activity_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
  update public.date_activities as activity
  set order_index = ordered.position - 1
  from unnest(p_activity_ids) with ordinality as ordered(id, position)
  where activity.id = ordered.id and activity.date_id = p_date_id;
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id, name, email) values(new.id, coalesce(new.raw_user_meta_data->>'name','Nasywa'), new.email); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.dates enable row level security;
alter table public.date_activities enable row level security;
alter table public.places enable row level security;
alter table public.photos enable row level security;
alter table public.moments enable row level security;
alter table public.spin_wheel_places enable row level security;
alter table public.spin_history enable row level security;

-- Direct owner policies: every operation is constrained by auth.uid().
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "dates_select_own" on public.dates for select using (user_id = auth.uid());
create policy "dates_insert_own" on public.dates for insert with check (user_id = auth.uid());
create policy "dates_update_own" on public.dates for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dates_delete_own" on public.dates for delete using (user_id = auth.uid());

create policy "activities_select_own" on public.date_activities for select using (exists(select 1 from public.dates d where d.id = date_id and d.user_id = auth.uid()));
create policy "activities_insert_own" on public.date_activities for insert with check (exists(select 1 from public.dates d where d.id = date_id and d.user_id = auth.uid()));
create policy "activities_update_own" on public.date_activities for update using (exists(select 1 from public.dates d where d.id = date_id and d.user_id = auth.uid())) with check (exists(select 1 from public.dates d where d.id = date_id and d.user_id = auth.uid()));
create policy "activities_delete_own" on public.date_activities for delete using (exists(select 1 from public.dates d where d.id = date_id and d.user_id = auth.uid()));

create policy "places_select_own" on public.places for select using (user_id = auth.uid());
create policy "places_insert_own" on public.places for insert with check (user_id = auth.uid());
create policy "places_update_own" on public.places for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "places_delete_own" on public.places for delete using (user_id = auth.uid());
create policy "photos_select_own" on public.photos for select using (user_id = auth.uid());
create policy "photos_insert_own" on public.photos for insert with check (user_id = auth.uid());
create policy "photos_update_own" on public.photos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "photos_delete_own" on public.photos for delete using (user_id = auth.uid());
create policy "moments_select_own" on public.moments for select using (user_id = auth.uid());
create policy "moments_insert_own" on public.moments for insert with check (user_id = auth.uid());
create policy "moments_update_own" on public.moments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "moments_delete_own" on public.moments for delete using (user_id = auth.uid());
create policy "wheel_select_own" on public.spin_wheel_places for select using (user_id = auth.uid());
create policy "wheel_insert_own" on public.spin_wheel_places for insert with check (user_id = auth.uid());
create policy "wheel_update_own" on public.spin_wheel_places for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "wheel_delete_own" on public.spin_wheel_places for delete using (user_id = auth.uid());
create policy "history_select_own" on public.spin_history for select using (user_id = auth.uid());
create policy "history_insert_own" on public.spin_history for insert with check (user_id = auth.uid());
create policy "history_update_own" on public.spin_history for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "history_delete_own" on public.spin_history for delete using (user_id = auth.uid());

-- Private bucket: files must live under {auth.uid()}/year/month/file.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('couple-photos','couple-photos',false,20971520,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "photo_objects_select_own" on storage.objects for select to authenticated using (bucket_id = 'couple-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photo_objects_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'couple-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photo_objects_update_own" on storage.objects for update to authenticated using (bucket_id = 'couple-photos' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'couple-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photo_objects_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'couple-photos' and (storage.foldername(name))[1] = auth.uid()::text);
