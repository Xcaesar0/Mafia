"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import {
  GameConfig, GameEvent, GameState, NightActions, Player, Role,
  createGame, currentShooter, mulberry32, resolveNight, resolveVoteCounts, MAX_MAFIA, TEAM_OF,
} from "@/lib/game";

export type Stage = "names" | "config" | "reveal" | "night" | "morning" | "news" | "day" | "vote" | "voteResult" | "ended";

export interface NightTask { kind: "kill" | "silence" | "heal" | "snipe" | "decoy" }

export interface VoteOutcome { eliminatedId: string | null; tied: boolean; counts: Record<string, number> }

export interface Session {
  stage: Stage;
  names: string[];
  config: GameConfig;
  game: GameState | null;
  revealIdx: number;
  nightIdx: number;
  nightActions: NightActions;
  lastEvents: GameEvent[];
  daySeconds: number;
  dayEndsAt: number | null;
  speakerIdx: number;
  voteCounts: Record<string, number>;
  vote: VoteOutcome | null;
  roundsPlayed: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  mafiaCount: 2,
  special: { silencer: false, doctor: true, sniper: false, mayor: false, goodboy: false },
};

export const initialSession = (): Session => ({
  stage: "names",
  names: ["", "", "", "", ""],
  config: DEFAULT_CONFIG,
  game: null,
  revealIdx: 0,
  nightIdx: 0,
  nightActions: {},
  lastEvents: [],
  daySeconds: 150,
  dayEndsAt: null,
  speakerIdx: 0,
  voteCounts: {},
  vote: null,
  roundsPlayed: 0,
});

type Action =
  | { t: "reset" }
  | { t: "hydrate"; s: Session }
  | { t: "rematch" }
  | { t: "names"; names: string[] }
  | { t: "config"; config: GameConfig }
  | { t: "start"; seed: number }
  | { t: "stage"; stage: Stage }
  | { t: "revealNext" }
  | { t: "nightDone"; patch: NightActions }
  | { t: "dayStart" }
  | { t: "dayAdd"; seconds: number }
  | { t: "speaker" }
  | { t: "voteCount"; id: string; delta: number }
  | { t: "voteConfirm" };

export const livingOrder = (g: GameState): Player[] => g.players.filter((p) => p.alive);

export function tasksFor(g: GameState, p: Player): NightTask[] {
  const shooter = currentShooter(g);
  const isShooter = shooter?.id === p.id;
  const tasks: NightTask[] = [];
  if (p.role === "silencer") tasks.push({ kind: "silence" });
  if (isShooter) tasks.push({ kind: "kill" });
  if (p.role === "doctor") tasks.push({ kind: "heal" });
  if (p.role === "sniper" && !g.sniperUsed) tasks.push({ kind: "snipe" });
  return tasks.length ? tasks : [{ kind: "decoy" }];
}

function reducer(s: Session, a: Action): Session {
  switch (a.t) {
    case "reset": return initialSession();
    case "hydrate": return a.s;
    case "rematch": return { ...initialSession(), names: s.names, config: s.config, stage: "config" };
    case "names": return { ...s, names: a.names };
    case "config": return { ...s, config: a.config };
    case "stage": return { ...s, stage: a.stage };
    case "start": {
      const names = s.names.map((n) => n.trim()).filter(Boolean);
      const game = createGame(names, s.config, mulberry32(a.seed));
      return { ...s, game, stage: "reveal", revealIdx: 0, nightIdx: 0, nightActions: {}, lastEvents: [], voteCounts: {}, vote: null, roundsPlayed: 0 };
    }
    case "revealNext": {
      if (!s.game) return s;
      const next = s.revealIdx + 1;
      return next >= s.game.players.length ? { ...s, revealIdx: 0, stage: "night", nightIdx: 0, nightActions: {} } : { ...s, revealIdx: next };
    }
    case "nightDone": {
      if (!s.game) return s;
      const nightActions = { ...s.nightActions, ...a.patch };
      const order = livingOrder(s.game);
      const nextIdx = s.nightIdx + 1;
      if (nextIdx < order.length) return { ...s, nightActions, nightIdx: nextIdx };
      let res;
      try { res = resolveNight(s.game, nightActions); } catch { res = resolveNight(s.game, {}); }
      return { ...s, game: res.state, lastEvents: res.events, nightActions: {}, nightIdx: 0, stage: res.state.winner ? "ended" : "morning", roundsPlayed: s.roundsPlayed + 1 };
    }
    case "dayStart": return { ...s, stage: "day", dayEndsAt: Date.now() + s.daySeconds * 1000, speakerIdx: 0 };
    case "dayAdd": return { ...s, dayEndsAt: (s.dayEndsAt ?? Date.now()) + a.seconds * 1000 };
    case "speaker": return { ...s, speakerIdx: s.speakerIdx + 1 };
    case "voteCount": {
      const cur = s.voteCounts[a.id] ?? 0;
      return { ...s, voteCounts: { ...s.voteCounts, [a.id]: Math.max(0, Math.min(30, cur + a.delta)) } };
    }
    case "voteConfirm": {
      if (!s.game) return s;
      const res = resolveVoteCounts(s.game, s.voteCounts);
      const killed = res.events.find((e) => e.type === "killed");
      const eliminatedId = killed && killed.type === "killed" ? killed.id : null;
      return {
        ...s, game: res.state, voteCounts: {}, roundsPlayed: s.roundsPlayed,
        vote: { eliminatedId, tied: res.result.tied || res.result.leaders.length === 0, counts: res.result.counts },
        stage: "voteResult",
      };
    }
  }
}

const KEY = "mafia-shared-session-v1";
interface Ctx { s: Session; d: (a: Action) => void; ready: boolean }
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, undefined, initialSession);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // hydrate once (replace via reset+start is cheap; we restore by dispatching a custom hydrate through names/config/game)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) d({ t: "hydrate", s: { ...initialSession(), ...(JSON.parse(raw) as Session) } });
    } catch { /* ignore */ }
    hydrated.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);

  const value = useMemo(() => ({ s, d, ready }), [s, ready]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("SessionProvider missing");
  return c;
}

export const useDispatch = () => useSession().d;

export function useCountdown(endsAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}

export const fmtTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
export { MAX_MAFIA, TEAM_OF };
export type { Role };
