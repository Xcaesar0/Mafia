-- Multi-device rooms. All writes go through server-only RPCs guarded by a shared server secret.

create table if not exists public.server_secret (
  id int primary key default 1 check (id = 1),
  value text not null
);
alter table public.server_secret enable row level security;
revoke all on public.server_secret from anon, authenticated;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'lobby',
  config jsonb not null default '{}'::jsonb,
  public jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  awarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 14),
  ring text not null default '#f2c46d',
  seat integer not null,
  primary key (room_id, user_id)
);
create index if not exists room_players_user_idx on public.room_players (user_id);

-- Secret game state (roles, night picks, votes). No policies and no grants: only server RPCs touch it.
create table if not exists public.room_private (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  game jsonb,
  night jsonb not null default '{}'::jsonb,
  votes jsonb not null default '{}'::jsonb,
  acks jsonb not null default '[]'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  rounds integer not null default 0
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_private enable row level security;
revoke all on public.rooms, public.room_players, public.room_private from anon, authenticated;

create or replace function public.is_room_member(rid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.room_players where room_id = rid and user_id = (select auth.uid()));
$$;
revoke execute on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

create policy "members read their room" on public.rooms for select to authenticated using (public.is_room_member(id));
create policy "members read room players" on public.room_players for select to authenticated using (public.is_room_member(room_id));
grant select on public.rooms, public.room_players to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.room_players;
exception when duplicate_object then null; end $$;

-- ---------- server RPCs ----------
create or replace function public.srv_check(p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or not exists (select 1 from public.server_secret where value = p_secret) then
    raise exception 'forbidden';
  end if;
end $$;

create or replace function public.srv_load(p_secret text, p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rooms; res jsonb;
begin
  perform public.srv_check(p_secret);
  select * into r from public.rooms where code = p_code;
  if not found then return null; end if;
  select jsonb_build_object(
    'room', to_jsonb(r),
    'players', coalesce((select jsonb_agg(to_jsonb(p) order by p.seat) from public.room_players p where p.room_id = r.id), '[]'::jsonb),
    'private', coalesce((select to_jsonb(x) from public.room_private x where x.room_id = r.id), '{}'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function public.srv_create_room(p_secret text, p_code text, p_host uuid, p_name text, p_ring text, p_config jsonb, p_public jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  perform public.srv_check(p_secret);
  delete from public.rooms where host_id = p_host and status <> 'ended' and created_at < now() - interval '12 hours';
  insert into public.rooms (code, host_id, config, public) values (p_code, p_host, p_config, p_public) returning id into rid;
  insert into public.room_players (room_id, user_id, name, ring, seat) values (rid, p_host, p_name, p_ring, 0);
  insert into public.room_private (room_id) values (rid);
  return rid;
end $$;

create or replace function public.srv_join(p_secret text, p_code text, p_user uuid, p_name text, p_ring text)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.rooms; n int;
begin
  perform public.srv_check(p_secret);
  select * into r from public.rooms where code = p_code for update;
  if not found then return 'not_found'; end if;
  if exists (select 1 from public.room_players where room_id = r.id and user_id = p_user) then
    update public.room_players set name = p_name, ring = p_ring where room_id = r.id and user_id = p_user;
    return 'ok';
  end if;
  if r.status <> 'lobby' then return 'started'; end if;
  select count(*) into n from public.room_players where room_id = r.id;
  if n >= 24 then return 'full'; end if;
  insert into public.room_players (room_id, user_id, name, ring, seat)
    values (r.id, p_user, p_name, p_ring, coalesce((select max(seat) + 1 from public.room_players where room_id = r.id), 0));
  update public.rooms set version = version + 1, public = jsonb_set(public, '{lobbyTick}', to_jsonb(version + 1)) where id = r.id;
  return 'ok';
end $$;

create or replace function public.srv_leave(p_secret text, p_code text, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.rooms; nh uuid;
begin
  perform public.srv_check(p_secret);
  select * into r from public.rooms where code = p_code for update;
  if not found or r.status <> 'lobby' then return; end if;
  delete from public.room_players where room_id = r.id and user_id = p_user;
  select user_id into nh from public.room_players where room_id = r.id order by seat limit 1;
  if nh is null then delete from public.rooms where id = r.id; return; end if;
  update public.rooms set host_id = nh, version = version + 1, public = jsonb_set(public, '{lobbyTick}', to_jsonb(version + 1)) where id = r.id;
end $$;

create or replace function public.srv_save(p_secret text, p_code text, p_expected int, p_status text, p_config jsonb, p_public jsonb, p_private jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare r public.rooms;
begin
  perform public.srv_check(p_secret);
  update public.rooms set status = p_status, config = p_config, public = p_public, version = version + 1
    where code = p_code and version = p_expected returning * into r;
  if not found then raise exception 'conflict'; end if;
  if p_private is not null then
    insert into public.room_private (room_id, game, night, votes, acks, actions, rounds)
    values (r.id, p_private -> 'game', coalesce(p_private -> 'night', '{}'), coalesce(p_private -> 'votes', '{}'),
            coalesce(p_private -> 'acks', '[]'), coalesce(p_private -> 'actions', '{}'), coalesce((p_private ->> 'rounds')::int, 0))
    on conflict (room_id) do update set game = excluded.game, night = excluded.night, votes = excluded.votes,
      acks = excluded.acks, actions = excluded.actions, rounds = excluded.rounds;
  end if;
  return r.version;
end $$;

create or replace function public.srv_wins_today(p_secret text, p_users uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  perform public.srv_check(p_secret);
  select coalesce(jsonb_object_agg(u, c), '{}'::jsonb) into res from (
    select u, (select count(*) from public.match_results m where m.user_id = u and m.won and m.xp_awarded > 0 and m.created_at > now() - interval '24 hours') as c
    from unnest(p_users) u) t;
  return res;
end $$;

create or replace function public.srv_award(p_secret text, p_code text, p_rows jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.rooms; x jsonb;
begin
  perform public.srv_check(p_secret);
  update public.rooms set awarded = true where code = p_code and not awarded returning * into r;
  if not found then return false; end if;
  for x in select * from jsonb_array_elements(p_rows) loop
    insert into public.match_results (user_id, won, team, role, player_count, rounds, xp_awarded)
    values ((x ->> 'user_id')::uuid, (x ->> 'won')::boolean, x ->> 'team', x ->> 'role', (x ->> 'player_count')::int, (x ->> 'rounds')::int, (x ->> 'xp')::int);
    update public.profiles set total_xp = total_xp + (x ->> 'xp')::int, games_played = games_played + 1,
      wins = wins + case when (x ->> 'won')::boolean then 1 else 0 end
      where id = (x ->> 'user_id')::uuid;
  end loop;
  return true;
end $$;

revoke execute on function public.srv_check(text), public.srv_load(text, text), public.srv_create_room(text, text, uuid, text, text, jsonb, jsonb),
  public.srv_join(text, text, uuid, text, text), public.srv_leave(text, text, uuid), public.srv_save(text, text, int, text, jsonb, jsonb, jsonb),
  public.srv_wins_today(text, uuid[]), public.srv_award(text, text, jsonb) from public;
grant execute on function public.srv_load(text, text), public.srv_create_room(text, text, uuid, text, text, jsonb, jsonb),
  public.srv_join(text, text, uuid, text, text), public.srv_leave(text, text, uuid), public.srv_save(text, text, int, text, jsonb, jsonb, jsonb),
  public.srv_wins_today(text, uuid[]), public.srv_award(text, text, jsonb) to anon, authenticated;
