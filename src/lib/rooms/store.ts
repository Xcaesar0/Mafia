import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyAction, emptyPrivate, emptyPublic, DEFAULT_CONFIG, RoomError, viewFor, type Action, type RoomData, type PlayerView } from "./engine";
import { winXp, TEAM_OF } from "../game";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.SERVER_SECRET!;

const anon = (): SupabaseClient => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export async function userFromToken(token: string | null) {
  if (!token) return null;
  const sb = createClient(URL_, KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.auth.getUser(token);
  if (!data.user) return null;
  const { data: prof } = await sb.from("profiles").select("nickname,ring").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, name: (prof?.nickname as string) ?? "لاعب", ring: (prof?.ring as string) ?? "#f2c46d" };
}

interface Loaded { data: RoomData; version: number }

async function load(sb: SupabaseClient, code: string): Promise<Loaded | null> {
  const { data, error } = await sb.rpc("srv_load", { p_secret: SECRET, p_code: code });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data.room;
  const p = data.private ?? {};
  return {
    version: r.version,
    data: {
      code: r.code, hostId: r.host_id, status: r.status, config: r.config ?? DEFAULT_CONFIG,
      pub: { ...emptyPublic(r.config ?? DEFAULT_CONFIG), ...(r.public ?? {}) },
      priv: { ...emptyPrivate(), game: p.game ?? null, night: p.night ?? {}, votes: p.votes ?? {}, acks: p.acks ?? [], actions: p.actions ?? {}, rounds: p.rounds ?? 0 },
      players: data.players,
    },
  };
}

export async function createRoom(user: { id: string; name: string; ring: string }): Promise<string> {
  const sb = anon();
  for (let i = 0; i < 12; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await sb.rpc("srv_create_room", {
      p_secret: SECRET, p_code: code, p_host: user.id, p_name: user.name, p_ring: user.ring, p_config: DEFAULT_CONFIG, p_public: emptyPublic(),
    });
    if (!error) return code;
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  throw new Error("تعذّر إنشاء الغرفة");
}

export async function joinRoom(code: string, user: { id: string; name: string; ring: string }) {
  const { data, error } = await anon().rpc("srv_join", { p_secret: SECRET, p_code: code, p_user: user.id, p_name: user.name, p_ring: user.ring });
  if (error) throw new Error(error.message);
  return data as "ok" | "not_found" | "started" | "full";
}

export async function leaveRoom(code: string, userId: string) {
  await anon().rpc("srv_leave", { p_secret: SECRET, p_code: code, p_user: userId });
}

export async function getView(code: string, userId: string): Promise<PlayerView | null> {
  const l = await load(anon(), code);
  if (!l) return null;
  if (!l.data.players.some((p) => p.user_id === userId)) return null;
  return viewFor(l.data, userId);
}

async function award(sb: SupabaseClient, room: RoomData) {
  const g = room.priv.game;
  if (!g || !g.winner) return;
  const users = room.pub.players.map((p) => p.userId);
  const { data: wins } = await sb.rpc("srv_wins_today", { p_secret: SECRET, p_users: users });
  const rows = room.pub.players.map((pp) => {
    const p = g.players.find((x) => x.id === pp.id)!;
    const won = TEAM_OF[p.role] === g.winner;
    const xp = won
      ? winXp({ winnerTeam: g.winner!, playerCount: g.players.length, survived: p.alive, roleActions: room.priv.actions[pp.id] ?? 0, winsToday: (wins?.[pp.userId] as number) ?? 0, completedRounds: room.priv.rounds, quit: false })
      : 0;
    return { user_id: pp.userId, won, team: TEAM_OF[p.role], role: p.role, player_count: g.players.length, rounds: room.priv.rounds, xp };
  });
  await sb.rpc("srv_award", { p_secret: SECRET, p_code: room.code, p_rows: rows });
}

export async function act(code: string, userId: string, action: Action): Promise<PlayerView> {
  const sb = anon();
  for (let attempt = 0; attempt < 6; attempt++) {
    const l = await load(sb, code);
    if (!l) throw new RoomError("الغرفة غير موجودة");
    if (!l.data.players.some((p) => p.user_id === userId)) throw new RoomError("لست في هذه الغرفة");
    const next = applyAction(l.data, userId, action);
    const { error } = await sb.rpc("srv_save", {
      p_secret: SECRET, p_code: code, p_expected: l.version, p_status: next.status, p_config: next.config, p_public: next.pub, p_private: next.priv,
    });
    if (error) {
      if (/conflict/.test(error.message)) continue;
      throw new Error(error.message);
    }
    if (next.pub.phase === "ended") await award(sb, next);
    return viewFor(next, userId);
  }
  throw new RoomError("حدث تعارض، حاول مرة أخرى");
}
