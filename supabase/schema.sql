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

-- ---------------------------------------------------------------------------
-- Dojô: XP, troféus e ranking (regras em src/features/dojo/progression/REGRAS.md)
-- ---------------------------------------------------------------------------

-- Totais de cada pessoa que já treinou no Dojô (o ranking lê daqui).
create table if not exists public.dojo_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  trophies integer not null default 0 check (trophies >= 0),
  best_trophies integer not null default 0 check (best_trophies >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cada sessão contada (a chave impede contar a mesma sessão duas vezes).
create table if not exists public.dojo_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null check (char_length(source_id) between 1 and 120),
  activity text not null check (activity in ('scrolls', 'reflexes', 'exam', 'seals', 'brush')),
  xp integer not null check (xp between 0 and 3000),
  trophies integer not null check (trophies between -30 and 45),
  outcome text not null check (outcome in ('win', 'draw', 'loss', 'unranked')),
  created_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

create index if not exists dojo_players_ranking_idx on public.dojo_players (trophies desc, xp desc);

alter table public.dojo_players enable row level security;
alter table public.dojo_results enable row level security;

-- Ninguém escreve direto nas tabelas: só pela função dojo_record_result (que confere as regras).
revoke all on table public.dojo_players from anon, authenticated, public;
revoke all on table public.dojo_results from anon, authenticated, public;
grant select on table public.dojo_players to authenticated;
grant select on table public.dojo_results to authenticated;

drop policy if exists "Users can read their own dojo totals" on public.dojo_players;
create policy "Users can read their own dojo totals"
on public.dojo_players
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own dojo results" on public.dojo_results;
create policy "Users can read their own dojo results"
on public.dojo_results
for select
to authenticated
using ((select auth.uid()) = user_id);

drop trigger if exists set_dojo_players_updated_at on public.dojo_players;
create trigger set_dojo_players_updated_at
before update on public.dojo_players
for each row
execute function public.set_updated_at();

-- Registra o resultado de uma sessão e devolve os totais. Repetir a mesma sessão não muda nada.
-- O cálculo da partida é feito no app; aqui só se conferem as faixas e a coerência do resultado.
create or replace function public.dojo_record_result(
  p_source_id text,
  p_activity text,
  p_xp integer,
  p_trophies integer,
  p_outcome text
)
returns table (xp bigint, trophies integer, best_trophies integer, wins integer, draws integer, losses integer, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_inserted integer := 0;
begin
  if v_user is null then
    raise exception 'Sessão expirada.' using errcode = '28000';
  end if;

  if p_source_id is null or char_length(p_source_id) not between 1 and 120
    or p_activity is null or p_activity not in ('scrolls', 'reflexes', 'exam', 'seals', 'brush')
    or p_xp is null or p_xp not between 0 and 3000
    or p_trophies is null or p_trophies not between -30 and 45
    or p_outcome is null or p_outcome not in ('win', 'draw', 'loss', 'unranked')
    -- Coerência: vitória ganha, derrota perde (ou fica em 0 sem troféus), empate e treino não mexem.
    or (p_outcome = 'win' and p_trophies < 1)
    or (p_outcome = 'loss' and p_trophies > 0)
    or (p_outcome in ('draw', 'unranked') and p_trophies <> 0)
    -- Pergaminhos são autoavaliados: nunca valem troféus.
    or (p_activity = 'scrolls' and p_outcome <> 'unranked')
  then
    raise exception 'Resultado fora das regras do Dojô.' using errcode = '22023';
  end if;

  insert into public.dojo_players (user_id) values (v_user) on conflict (user_id) do nothing;

  insert into public.dojo_results (user_id, source_id, activity, xp, trophies, outcome)
  values (v_user, p_source_id, p_activity, p_xp, p_trophies, p_outcome)
  on conflict (user_id, source_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.dojo_players as p
    set
      xp = p.xp + p_xp,
      trophies = greatest(0, p.trophies + p_trophies),
      best_trophies = greatest(p.best_trophies, greatest(0, p.trophies + p_trophies)),
      wins = p.wins + (p_outcome = 'win')::integer,
      draws = p.draws + (p_outcome = 'draw')::integer,
      losses = p.losses + (p_outcome = 'loss')::integer
    where p.user_id = v_user;
  end if;

  return query
  select p.xp, p.trophies, p.best_trophies, p.wins, p.draws, p.losses, v_inserted > 0
  from public.dojo_players as p
  where p.user_id = v_user;
end;
$$;

-- Ranking: os primeiros (por troféus; no empate, mais XP) e a própria linha se estiver fora deles.
-- Só nome, troféus e XP: e-mail e id da conta não saem daqui.
create or replace function public.dojo_leaderboard(p_limit integer default 50)
returns table (rank_position bigint, name text, trophies integer, xp bigint, is_me boolean, in_top boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      p.user_id,
      coalesce(nullif(btrim(pr.name), ''), 'Estudante HideNihon') as name,
      p.trophies,
      p.xp,
      rank() over (order by p.trophies desc, p.xp desc) as rank_position,
      row_number() over (order by p.trophies desc, p.xp desc, p.created_at asc) as row_index
    from public.dojo_players as p
    left join public.profiles as pr on pr.id = p.user_id
  )
  select
    r.rank_position,
    r.name,
    r.trophies,
    r.xp,
    r.user_id = (select auth.uid()) as is_me,
    r.row_index <= least(greatest(coalesce(p_limit, 50), 1), 100) as in_top
  from ranked as r
  where r.row_index <= least(greatest(coalesce(p_limit, 50), 1), 100)
     or r.user_id = (select auth.uid())
  order by r.row_index;
$$;

revoke execute on function public.dojo_record_result(text, text, integer, integer, text) from public, anon;
revoke execute on function public.dojo_leaderboard(integer) from public, anon;
grant execute on function public.dojo_record_result(text, text, integer, integer, text) to authenticated;
grant execute on function public.dojo_leaderboard(integer) to authenticated;
