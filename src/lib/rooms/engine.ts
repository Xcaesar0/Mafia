import {
  createGame, currentShooter, resolveNight, resolveVote, validateNight, validateConfig, byId, alive, mulberry32,
  TEAM_OF, ROLE_NAME_AR,
  type GameConfig, type GameEvent, type GameState, type NightActions, type Role, type Team,
} from "../game";

export type RoomPhase = "lobby" | "reveal" | "night" | "morning" | "day" | "vote" | "voteResult" | "ended";

export interface RoomPlayerRow { user_id: string; name: string; ring: string; seat: number }
export interface PubPlayer { id: string; userId: string; name: string; ring: string; alive: boolean }

export interface PublicState {
  phase: RoomPhase;
  round: number;
  players: PubPlayer[];
  config: GameConfig;
  daySeconds: number;
  dayEndsAt: number | null;
  ackCount: number;
  submitted: number;
  needed: number;
  events: GameEvent[];
  silencedId: string | null;
  vote: { counts: Record<string, number>; eliminatedId: string | null; tied: boolean } | null;
  deadRoles: Record<string, Role>;
  winner: Team | null;
  allRoles?: Record<string, Role>;
  lobbyTick?: number;
}

export interface PrivateState {
  game: GameState | null;
  night: Record<string, NightActions>; // keyed by player id
  votes: Record<string, string>; // voter id -> target id
  acks: string[]; // player ids
  actions: Record<string, number>; // role actions count per player id
  rounds: number;
}

export interface RoomData {
  code: string;
  hostId: string;
  status: RoomPhase;
  config: GameConfig;
  pub: PublicState;
  priv: PrivateState;
  players: RoomPlayerRow[]; // lobby roster
}

export const DEFAULT_CONFIG: GameConfig = {
  mafiaCount: 1,
  special: { silencer: false, doctor: true, sniper: false, mayor: false, goodboy: false },
};

export const emptyPublic = (config: GameConfig = DEFAULT_CONFIG): PublicState => ({
  phase: "lobby", round: 0, players: [], config, daySeconds: 180, dayEndsAt: null, ackCount: 0, submitted: 0, needed: 0,
  events: [], silencedId: null, vote: null, deadRoles: {}, winner: null,
});
export const emptyPrivate = (): PrivateState => ({ game: null, night: {}, votes: {}, acks: [], actions: {}, rounds: 0 });

export class RoomError extends Error {}
const fail = (m: string): never => { throw new RoomError(m); };

export type Action =
  | { op: "config"; config: GameConfig }
  | { op: "start"; seed?: number }
  | { op: "ack" }
  | { op: "night"; picks: { kill?: string | null; heal?: string | null; snipe?: string | null; silence?: string | null } }
  | { op: "force" }
  | { op: "dayStart" }
  | { op: "dayAdd"; seconds: number }
  | { op: "toVote" }
  | { op: "vote"; target: string }
  | { op: "next" };

const pidOf = (room: RoomData, userId: string) => room.pub.players.find((p) => p.userId === userId)?.id ?? null;

export type TaskKind = "kill" | "heal" | "snipe" | "silence";
export function tasksOf(g: GameState, playerId: string): TaskKind[] {
  const p = byId(g, playerId);
  if (!p || !p.alive) return [];
  const t: TaskKind[] = [];
  if (p.role === "silencer") t.push("silence");
  if (currentShooter(g)?.id === p.id) t.push("kill");
  if (p.role === "doctor") t.push("heal");
  if (p.role === "sniper" && !g.sniperUsed) t.push("snipe");
  return t;
}

function syncPublic(room: RoomData) {
  const g = room.priv.game;
  if (!g) return;
  room.pub.players = room.pub.players.map((pp) => ({ ...pp, alive: byId(g, pp.id)?.alive ?? pp.alive }));
  room.pub.round = g.round;
  room.pub.winner = g.winner;
  const dead: Record<string, Role> = {};
  for (const p of g.players) if (!p.alive) dead[p.id] = p.role;
  room.pub.deadRoles = dead;
  room.pub.silencedId = g.silencedToday;
}

function setPhase(room: RoomData, phase: RoomPhase) {
  room.pub.phase = phase;
  room.status = phase;
  room.pub.submitted = 0;
  const g = room.priv.game;
  if (phase === "night" && g) room.pub.needed = alive(g).length;
  else if (phase === "vote" && g) room.pub.needed = alive(g).length;
  else if (phase === "reveal" && g) room.pub.needed = g.players.length;
  else room.pub.needed = 0;
}

function finishIfOver(room: RoomData) {
  const g = room.priv.game!;
  if (g.winner) {
    room.pub.allRoles = Object.fromEntries(g.players.map((p) => [p.id, p.role]));
    setPhase(room, "ended");
  }
}

function countAction(room: RoomData, pid: string) {
  room.priv.actions[pid] = (room.priv.actions[pid] ?? 0) + 1;
}

function resolveNightNow(room: RoomData) {
  const g = room.priv.game!;
  const merged: NightActions = {};
  const shooter = currentShooter(g);
  for (const [pid, a] of Object.entries(room.priv.night)) {
    const p = byId(g, pid);
    if (!p?.alive) continue;
    const tasks = tasksOf(g, pid);
    if (tasks.includes("kill") && a.kill && shooter?.id === pid) { merged.kill = a.kill; countAction(room, pid); }
    if (tasks.includes("heal") && a.heal) { merged.heal = a.heal; countAction(room, pid); }
    if (tasks.includes("snipe") && a.snipe) { merged.snipe = a.snipe; countAction(room, pid); }
    if (tasks.includes("silence") && a.silence) { merged.silence = a.silence; countAction(room, pid); }
  }
  let res;
  try { res = resolveNight(g, merged); } catch { res = resolveNight(g, {}); }
  room.priv.game = res.state;
  room.pub.events = res.events;
  room.priv.night = {};
  room.priv.rounds += 1;
  syncPublic(room);
  setPhase(room, "morning");
  finishIfOver(room);
}

function resolveVoteNow(room: RoomData) {
  const g = room.priv.game!;
  const res = resolveVote(g, room.priv.votes);
  const killed = res.events.find((e) => e.type === "killed");
  room.priv.game = res.state;
  room.pub.events = res.events;
  room.pub.vote = { counts: res.result.counts, eliminatedId: killed && killed.type === "killed" ? killed.id : null, tied: res.result.tied || res.result.leaders.length === 0 };
  room.priv.votes = {};
  syncPublic(room);
  setPhase(room, "voteResult");
  // the next phase after the result is decided when the host continues, unless the game is over
  if (res.state.winner) finishIfOver(room);
}

/** Pure transition: returns a new RoomData or throws RoomError. */
export function applyAction(input: RoomData, userId: string, a: Action, now = Date.now()): RoomData {
  const room: RoomData = structuredClone(input);
  const isHost = room.hostId === userId;
  const phase = room.pub.phase;
  const pid = pidOf(room, userId);

  switch (a.op) {
    case "config": {
      if (!isHost) fail("للمضيف فقط");
      if (phase !== "lobby") fail("بدأت اللعبة");
      room.config = a.config; room.pub.config = a.config;
      return room;
    }
    case "start": {
      if (!isHost) fail("للمضيف فقط");
      if (phase !== "lobby") fail("بدأت اللعبة");
      const ordered = [...room.players].sort((x, y) => x.seat - y.seat);
      const err = validateConfig(ordered.length, room.config);
      if (err) fail(err);
      const seed = a.seed ?? Math.floor(Math.random() * 2 ** 32);
      const g = createGame(ordered.map((p) => p.name), room.config, mulberry32(seed));
      room.priv = { ...emptyPrivate(), game: g };
      room.pub = {
        ...emptyPublic(room.config),
        players: ordered.map((p, i) => ({ id: `p${i + 1}`, userId: p.user_id, name: p.name, ring: p.ring, alive: true })),
        round: 1,
      };
      setPhase(room, "reveal");
      return room;
    }
    case "ack": {
      if (phase !== "reveal" || !pid) fail("غير متاح الآن");
      if (!room.priv.acks.includes(pid!)) room.priv.acks.push(pid!);
      room.pub.ackCount = room.priv.acks.length;
      room.pub.submitted = room.pub.ackCount;
      if (room.priv.acks.length >= room.priv.game!.players.length) { room.priv.acks = []; room.pub.ackCount = 0; setPhase(room, "night"); }
      return room;
    }
    case "night": {
      const g = room.priv.game;
      if (phase !== "night" || !g || !pid) return fail("غير متاح الآن");
      const me = byId(g, pid!);
      if (!me?.alive) fail("أنت خارج اللعبة");
      const tasks = tasksOf(g, pid!);
      const picks: NightActions = {};
      if (tasks.includes("kill")) { if (!a.picks.kill) fail("اختر ضحية الليلة"); picks.kill = a.picks.kill; }
      if (tasks.includes("heal")) picks.heal = a.picks.heal ?? null;
      if (tasks.includes("snipe")) picks.snipe = a.picks.snipe ?? null;
      if (tasks.includes("silence")) picks.silence = a.picks.silence ?? null;
      const e = validateNight(g, picks);
      if (e) fail(e);
      room.priv.night[pid!] = picks;
      room.pub.submitted = Object.keys(room.priv.night).length;
      if (room.pub.submitted >= room.pub.needed) resolveNightNow(room);
      return room;
    }
    case "force": {
      if (!isHost) fail("للمضيف فقط");
      if (phase === "night") resolveNightNow(room);
      else if (phase === "vote") resolveVoteNow(room);
      else fail("غير متاح الآن");
      return room;
    }
    case "dayStart": {
      if (!isHost || phase !== "morning") fail("غير متاح الآن");
      room.pub.dayEndsAt = now + room.pub.daySeconds * 1000;
      setPhase(room, "day");
      return room;
    }
    case "dayAdd": {
      if (!isHost || phase !== "day") fail("غير متاح الآن");
      room.pub.dayEndsAt = (room.pub.dayEndsAt ?? now) + Math.max(-60, Math.min(120, a.seconds)) * 1000;
      return room;
    }
    case "toVote": {
      if (!isHost || phase !== "day") fail("غير متاح الآن");
      room.pub.dayEndsAt = null; room.priv.votes = {};
      setPhase(room, "vote");
      return room;
    }
    case "vote": {
      const g = room.priv.game;
      if (phase !== "vote" || !g || !pid) return fail("غير متاح الآن");
      if (!byId(g, pid!)?.alive) fail("أنت خارج اللعبة");
      const t = byId(g, a.target);
      if (!t?.alive) fail("هدف غير صالح");
      if (t!.id === pid) fail("لا يمكنك التصويت لنفسك");
      room.priv.votes[pid!] = a.target;
      room.pub.submitted = Object.keys(room.priv.votes).length;
      if (room.pub.submitted >= room.pub.needed) resolveVoteNow(room);
      return room;
    }
    case "next": {
      if (!isHost || phase !== "voteResult") fail("غير متاح الآن");
      room.pub.vote = null;
      room.pub.events = [];
      setPhase(room, "night");
      return room;
    }
  }
}

export interface PlayerView {
  pub: PublicState;
  hostId: string;
  me: null | {
    id: string; role: Role | null; roleName: string | null; team: Team | null; alive: boolean;
    tasks: TaskKind[]; submitted: boolean; voted: boolean; acked: boolean; mates: string[]; isHost: boolean; lastHealed: string | null;
  };
  lobby: { userId: string; name: string; ring: string; seat: number }[];
}

export function viewFor(room: RoomData, userId: string): PlayerView {
  const pid = pidOf(room, userId);
  const g = room.priv.game;
  const mePlayer = g && pid ? byId(g, pid) : null;
  const showRole = !!mePlayer;
  const mates = mePlayer && TEAM_OF[mePlayer.role] === "mafia" ? g!.players.filter((p) => TEAM_OF[p.role] === "mafia" && p.id !== mePlayer.id).map((p) => p.id) : [];
  const pub: PublicState = { ...room.pub };
  return {
    pub,
    hostId: room.hostId,
    lobby: room.players.map((p) => ({ userId: p.user_id, name: p.name, ring: p.ring, seat: p.seat })),
    me: pid
      ? {
          id: pid,
          role: showRole ? mePlayer!.role : null,
          roleName: showRole ? ROLE_NAME_AR[mePlayer!.role] : null,
          team: showRole ? TEAM_OF[mePlayer!.role] : null,
          alive: mePlayer?.alive ?? true,
          tasks: g && room.pub.phase === "night" ? tasksOf(g, pid) : [],
          submitted: room.pub.phase === "night" ? pid in room.priv.night : false,
          voted: room.pub.phase === "vote" ? pid in room.priv.votes : false,
          acked: room.priv.acks.includes(pid),
          mates,
          isHost: room.hostId === userId,
          lastHealed: g?.lastHealed ?? null,
        }
      : room.hostId === userId ? { id: "", role: null, roleName: null, team: null, alive: true, tasks: [], submitted: false, voted: false, acked: false, mates: [], isHost: true, lastHealed: null } : null,
  };
}
