create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Estudante HideNihon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists id uuid;
alter table public.profiles add column if not exists name text not null default 'Estudante HideNihon';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.user_progress add column if not exists user_id uuid;
alter table public.user_progress add column if not exists progress jsonb not null default '{}'::jsonb;
alter table public.user_progress add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_pkey'
      and conrelid = 'public.profiles'::regclass
      and contype = 'p'
  ) then
    if exists (select 1 from public.profiles where id is null) then
      raise exception 'Cannot add profiles primary key: existing rows have null id. Fix or remove invalid profile rows first.';
    end if;

    alter table public.profiles
      alter column id set not null,
      add constraint profiles_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_auth_users_fkey'
      and conrelid = 'public.profiles'::regclass
      and contype = 'f'
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_name_not_blank' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_name_not_blank check (length(btrim(name)) > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_name_size' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_name_size check (char_length(name) <= 120) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_progress_pkey'
      and conrelid = 'public.user_progress'::regclass
      and contype = 'p'
  ) then
    if exists (select 1 from public.user_progress where user_id is null) then
      raise exception 'Cannot add user_progress primary key: existing rows have null user_id. Fix or remove invalid progress rows first.';
    end if;

    alter table public.user_progress
      alter column user_id set not null,
      add constraint user_progress_pkey primary key (user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_progress_user_id_auth_users_fkey'
      and conrelid = 'public.user_progress'::regclass
      and contype = 'f'
  ) then
    alter table public.user_progress
      add constraint user_progress_user_id_auth_users_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_progress_progress_is_object' and conrelid = 'public.user_progress'::regclass
  ) then
    alter table public.user_progress
      add constraint user_progress_progress_is_object check (jsonb_typeof(progress) = 'object') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_progress_progress_size' and conrelid = 'public.user_progress'::regclass
  ) then
    alter table public.user_progress
      add constraint user_progress_progress_size check (octet_length(progress::text) <= 100000) not valid;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;

grant usage on schema public to authenticated;
revoke all on table public.profiles from anon, authenticated, public;
revoke all on table public.user_progress from anon, authenticated, public;
grant select on table public.profiles to authenticated;
grant update (name) on table public.profiles to authenticated;
grant select, insert, update on table public.user_progress to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own progress" on public.user_progress;
create policy "Users can read their own progress"
on public.user_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own progress" on public.user_progress;
create policy "Users can insert their own progress"
on public.user_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own progress" on public.user_progress;
create policy "Users can update their own progress"
on public.user_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      nullif(left(btrim(new.raw_user_meta_data ->> 'name'), 120), ''),
      nullif(left(btrim(split_part(coalesce(new.email, ''), '@', 1)), 120), ''),
      'Estudante HideNihon'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_progress_updated_at on public.user_progress;
create trigger set_user_progress_updated_at
before update on public.user_progress
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
