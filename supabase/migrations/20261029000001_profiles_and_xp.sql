-- Profiles, match history and leaderboard. XP is written only by the server (service role).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default 'لاعب' check (char_length(nickname) between 1 and 14),
  ring text not null default '#f2c46d',
  total_xp integer not null default 0 check (total_xp >= 0),
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  won boolean not null,
  team text not null check (team in ('mafia', 'town')),
  role text not null,
  player_count integer not null check (player_count between 4 and 24),
  rounds integer not null check (rounds >= 0),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now()
);
create index if not exists match_results_user_created_idx on public.match_results (user_id, created_at desc);

-- Level from total XP: XP to go from level n to n+1 = 300 + 24 (n - 1); max level 100.
create or replace function public.level_from_xp(xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(100, 1 + floor((-288 + sqrt(82944 + 48 * greatest(xp, 0))) / 24)::integer);
$$;

create or replace function public.total_xp_for_level(lvl integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 300 * (lvl - 1) + 12 * (lvl - 1) * (lvl - 2);
$$;

-- Public leaderboard: ranked by level, then XP inside the level, then wins. No points shown to players.
create or replace view public.leaderboard
with (security_invoker = true) as
select
  p.id,
  p.nickname,
  p.ring,
  public.level_from_xp(p.total_xp) as level,
  p.total_xp - public.total_xp_for_level(public.level_from_xp(p.total_xp)) as xp_in_level,
  p.wins,
  p.games_played,
  rank() over (
    order by public.level_from_xp(p.total_xp) desc, p.total_xp desc, p.wins desc, p.created_at asc
  ) as rank
from public.profiles p;

alter table public.profiles enable row level security;
alter table public.match_results enable row level security;

-- Anyone signed in can read the (non sensitive) profile columns used by the leaderboard.
create policy "profiles are readable by signed in users"
  on public.profiles for select to authenticated using (true);

create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "users can read their own matches"
  on public.match_results for select to authenticated
  using ((select auth.uid()) = user_id);

-- Players may only change nickname and ring; XP, wins and games are server-only.
revoke all on public.profiles from anon, authenticated;
revoke all on public.match_results from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (nickname, ring) on public.profiles to authenticated;
grant select on public.match_results to authenticated;
grant select on public.leaderboard to authenticated;

-- Create a profile automatically for every new auth user (guest or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      nullif(left(new.raw_user_meta_data ->> 'nickname', 14), ''),
      nullif(left(new.raw_user_meta_data ->> 'full_name', 14), ''),
      'لاعب'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
