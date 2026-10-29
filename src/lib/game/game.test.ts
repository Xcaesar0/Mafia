import { describe, expect, it } from "vitest";
import {
  GameConfig, GameState, createGame, mulberry32, validateConfig, buildRoleList, currentShooter, checkWinner,
  resolveNight, resolveVote, tally, winXp, levelFromXp, totalXpForLevel, xpToNext, tierOf, sizeFactor, dailyFactor,
} from "./index";

const cfg = (over: Partial<GameConfig> = {}, sp: Partial<GameConfig["special"]> = {}): GameConfig => ({
  mafiaCount: 2,
  special: { silencer: false, doctor: true, sniper: false, mayor: false, goodboy: false, ...sp },
  ...over,
});
const names = (n: number) => Array.from({ length: n }, (_, i) => `L${i + 1}`);

/** Build a state with explicit roles for deterministic tests. */
function stateWith(roles: string[], extra: Partial<GameState> = {}): GameState {
  return {
    players: roles.map((r, i) => ({ id: `p${i + 1}`, name: `L${i + 1}`, role: r as never, alive: true })),
    config: cfg(),
    phase: "night",
    round: 1,
    shooterCursor: 0,
    lastHealed: null,
    sniperUsed: false,
    goodboyShieldUsed: false,
    silencedToday: null,
    winner: null,
    ...extra,
  };
}

describe("setup & validation", () => {
  it("requires 5..24 players", () => {
    expect(validateConfig(4, cfg())).toBeTruthy();
    expect(validateConfig(5, cfg({ mafiaCount: 1 }))).toBeNull();
    expect(validateConfig(25, cfg())).toBeTruthy();
  });
  it("mafia count 1..6 and below half of players", () => {
    expect(validateConfig(8, cfg({ mafiaCount: 0 }))).toBeTruthy();
    expect(validateConfig(24, cfg({ mafiaCount: 7 }))).toBeTruthy();
    expect(validateConfig(6, cfg({ mafiaCount: 3 }))).toBeTruthy();
    expect(validateConfig(7, cfg({ mafiaCount: 3 }))).toBeNull();
  });
  it("silencer needs at least 2 mafia", () => {
    expect(validateConfig(8, cfg({ mafiaCount: 1 }, { silencer: true }))).toBeTruthy();
    expect(validateConfig(8, cfg({ mafiaCount: 2 }, { silencer: true }))).toBeNull();
  });
  it("builds role list counting silencer inside mafia count", () => {
    const r = buildRoleList(10, cfg({ mafiaCount: 3 }, { silencer: true, doctor: true, mayor: true }));
    expect(r.filter((x) => x === "mafia")).toHaveLength(2);
    expect(r.filter((x) => x === "silencer")).toHaveLength(1);
    expect(r.filter((x) => x === "doctor")).toHaveLength(1);
    expect(r.filter((x) => x === "mayor")).toHaveLength(1);
    expect(r.filter((x) => x === "civilian")).toHaveLength(10 - 3 - 2);
    expect(r).toHaveLength(10);
  });
  it("assigns roles deterministically for a seed and starts at night 1", () => {
    const a = createGame(names(8), cfg(), mulberry32(7));
    const b = createGame(names(8), cfg(), mulberry32(7));
    expect(a.players.map((p) => p.role)).toEqual(b.players.map((p) => p.role));
    expect(a.phase).toBe("night");
    expect(a.round).toBe(1);
  });
  it("throws on invalid config", () => {
    expect(() => createGame(names(4), cfg(), mulberry32(1))).toThrow();
  });
});

describe("rotating mafia kill turn", () => {
  it("rotates among living regular mafia each night", () => {
    let s = stateWith(["mafia", "mafia", "civilian", "civilian", "civilian", "civilian", "civilian", "doctor"]);
    expect(currentShooter(s)!.id).toBe("p1");
    s = resolveNight(s, { kill: null }).state;
    s.phase = "night";
    expect(currentShooter(s)!.id).toBe("p2");
    s = resolveNight(s, { kill: null }).state;
    s.phase = "night";
    expect(currentShooter(s)!.id).toBe("p1");
  });
  it("silencer inherits the turn only when regular mafia are dead", () => {
    const s = stateWith(["mafia", "silencer", "civilian", "civilian", "civilian", "civilian", "civilian"]);
    expect(currentShooter(s)!.role).toBe("mafia");
    s.players[0].alive = false;
    expect(currentShooter(s)!.role).toBe("silencer");
    s.players[1].alive = false;
    expect(currentShooter(s)).toBeNull();
  });
});

describe("night resolution", () => {
  const base = () => stateWith(["mafia", "mafia", "doctor", "civilian", "civilian", "civilian", "civilian", "civilian"]);
  it("kills the target", () => {
    const { state, events } = resolveNight(base(), { kill: "p4" });
    expect(state.players[3].alive).toBe(false);
    expect(events).toContainEqual({ type: "killed", id: "p4", by: "mafia" });
    expect(state.phase).toBe("morning");
  });
  it("doctor heal prevents the death", () => {
    const { state, events } = resolveNight(base(), { kill: "p4", heal: "p4" });
    expect(state.players[3].alive).toBe(true);
    expect(events).toContainEqual({ type: "saved", id: "p4" });
    expect(events).toContainEqual({ type: "no_death" });
  });
  it("doctor can heal himself", () => {
    const { state } = resolveNight(base(), { kill: "p3", heal: "p3" });
    expect(state.players[2].alive).toBe(true);
  });
  it("doctor cannot heal the same player two nights in a row", () => {
    const first = resolveNight(base(), { heal: "p4" }).state;
    first.phase = "night";
    expect(() => resolveNight(first, { heal: "p4" })).toThrow();
    expect(() => resolveNight(first, { heal: "p3" })).not.toThrow();
  });
  it("doctor can heal again after a gap night", () => {
    let s = resolveNight(base(), { heal: "p4" }).state;
    s.phase = "night";
    s = resolveNight(s, { heal: "p5" }).state;
    s.phase = "night";
    expect(() => resolveNight(s, { heal: "p4" })).not.toThrow();
  });
  it("mafia cannot kill a mafia member", () => {
    expect(() => resolveNight(base(), { kill: "p2" })).toThrow();
  });
  it("cannot target dead players", () => {
    const s = base();
    s.players[3].alive = false;
    expect(() => resolveNight(s, { kill: "p4" })).toThrow();
  });
  it("silence is recorded for the day", () => {
    const { state, events } = resolveNight(base(), { silence: "p5" });
    expect(state.silencedToday).toBe("p5");
    expect(events).toContainEqual({ type: "silenced", id: "p5" });
  });
  it("no kill means no death event", () => {
    expect(resolveNight(base(), {}).events).toContainEqual({ type: "no_death" });
  });
});

describe("sniper", () => {
  const base = () => stateWith(["mafia", "mafia", "sniper", "civilian", "civilian", "civilian", "civilian", "civilian"]);
  it("hitting mafia kills it and the sniper lives", () => {
    const { state } = resolveNight(base(), { snipe: "p1" });
    expect(state.players[0].alive).toBe(false);
    expect(state.players[2].alive).toBe(true);
    expect(state.sniperUsed).toBe(true);
  });
  it("hitting town kills the target and the sniper", () => {
    const { state, events } = resolveNight(base(), { snipe: "p4" });
    expect(state.players[3].alive).toBe(false);
    expect(state.players[2].alive).toBe(false);
    expect(events).toContainEqual({ type: "killed", id: "p3", by: "sniper_recoil" });
  });
  it("only one bullet", () => {
    const s = resolveNight(base(), { snipe: "p1" }).state;
    s.phase = "night";
    expect(() => resolveNight(s, { snipe: "p2" })).toThrow();
  });
  it("doctor can save the sniper's target", () => {
    const { state } = resolveNight(base(), { snipe: "p1", heal: "p1" });
    expect(state.players[0].alive).toBe(true);
  });
});

describe("good boy shield", () => {
  it("survives the first mafia attack, dies on the second", () => {
    let s = stateWith(["mafia", "mafia", "goodboy", "civilian", "civilian", "civilian", "civilian", "civilian"]);
    let r = resolveNight(s, { kill: "p3" });
    expect(r.state.players[2].alive).toBe(true);
    expect(r.events).toContainEqual({ type: "shield_held", id: "p3" });
    s = r.state;
    s.phase = "night";
    r = resolveNight(s, { kill: "p3" });
    expect(r.state.players[2].alive).toBe(false);
  });
});

describe("win conditions", () => {
  it("town wins when all mafia are dead", () => {
    const s = stateWith(["mafia", "civilian", "civilian", "civilian", "civilian"]);
    s.players[0].alive = false;
    expect(checkWinner(s)).toBe("town");
  });
  it("mafia wins when equal to town", () => {
    const s = stateWith(["mafia", "mafia", "civilian", "civilian", "civilian"]);
    s.players[4].alive = false;
    expect(checkWinner(s)).toBe("mafia");
  });
  it("game continues otherwise", () => {
    expect(checkWinner(stateWith(["mafia", "civilian", "civilian", "civilian", "civilian"]))).toBeNull();
  });
  it("silencer counts as mafia", () => {
    const s = stateWith(["mafia", "silencer", "civilian", "civilian", "civilian"]);
    s.players[4].alive = false;
    expect(checkWinner(s)).toBe("mafia");
  });
  it("night ends the game when mafia reaches parity", () => {
    const s = stateWith(["mafia", "mafia", "civilian", "civilian", "civilian"]);
    const { state } = resolveNight(s, { kill: "p3" });
    expect(state.winner).toBe("mafia");
    expect(state.phase).toBe("ended");
  });
});

describe("voting", () => {
  const base = () => stateWith(["mafia", "mafia", "mayor", "civilian", "civilian", "civilian", "civilian", "doctor"]);
  it("eliminates the top voted player and moves to night", () => {
    const votes = { p1: "p4", p2: "p4", p3: "p6", p4: "p1" };
    const { state, events } = resolveVote(base(), votes);
    expect(state.players[5].alive).toBe(false); // mayor's x3 vote outweighs two votes
    expect(events).toContainEqual({ type: "killed", id: "p6", by: "vote" });
    expect(state.phase).toBe("night");
    expect(state.round).toBe(2);
  });
  it("mayor vote counts three", () => {
    const r = tally(base(), { p3: "p5", p1: "p6", p2: "p6" });
    expect(r.counts.p5).toBe(3);
    expect(r.counts.p6).toBe(2);
    expect(r.leaders).toEqual(["p5"]);
  });
  it("tie eliminates nobody", () => {
    const { state, events, result } = resolveVote(base(), { p1: "p4", p2: "p5" });
    expect(result.tied).toBe(true);
    expect(events).toContainEqual({ type: "tie" });
    expect(state.players.every((p) => p.alive)).toBe(true);
  });
  it("dead voters and dead targets are ignored", () => {
    const s = base();
    s.players[0].alive = false;
    expect(tally(s, { p1: "p4" }).counts).toEqual({});
    expect(tally(s, { p2: "p1" }).counts).toEqual({});
  });
  it("silent day clears after vote", () => {
    const s = base();
    s.silencedToday = "p4";
    expect(resolveVote(s, { p1: "p5" }).state.silencedToday).toBeNull();
  });
  it("voting out the last mafia ends the game with town win", () => {
    const s = stateWith(["mafia", "civilian", "civilian", "civilian", "civilian"]);
    const { state } = resolveVote(s, { p2: "p1", p3: "p1" });
    expect(state.winner).toBe("town");
    expect(state.phase).toBe("ended");
  });
});

describe("XP & levels", () => {
  const w = { winnerTeam: "town" as const, playerCount: 9, survived: false, roleActions: 0, winsToday: 0, completedRounds: 3, quit: false };
  it("base town win with 9 players is 100", () => expect(winXp(w)).toBe(100));
  it("mafia win is 130", () => expect(winXp({ ...w, winnerTeam: "mafia" })).toBe(130));
  it("size factors", () => {
    expect(sizeFactor(5)).toBe(0.8);
    expect(sizeFactor(11)).toBe(1);
    expect(sizeFactor(12)).toBe(1.2);
  });
  it("survival + role bonus capped at 40", () => {
    expect(winXp({ ...w, survived: true, roleActions: 1 })).toBe(123);
    expect(winXp({ ...w, survived: true, roleActions: 9 })).toBe(140);
  });
  it("match cap 250", () => expect(winXp({ ...w, winnerTeam: "mafia", playerCount: 24, survived: true, roleActions: 9 })).toBe(196));
  it("daily diminishing returns", () => {
    expect(dailyFactor(4)).toBe(1);
    expect(dailyFactor(5)).toBe(0.5);
    expect(dailyFactor(10)).toBe(0.25);
    expect(winXp({ ...w, winsToday: 5 })).toBe(50);
  });
  it("no XP for quitters, tiny or short games", () => {
    expect(winXp({ ...w, quit: true })).toBe(0);
    expect(winXp({ ...w, playerCount: 4 })).toBe(0);
    expect(winXp({ ...w, completedRounds: 1 })).toBe(0);
  });
  it("level curve matches the spec", () => {
    expect(xpToNext(1)).toBe(300);
    expect(xpToNext(6)).toBe(420);
    expect(totalXpForLevel(10)).toBe(3564);
    expect(totalXpForLevel(25)).toBe(13824);
    expect(totalXpForLevel(50)).toBe(42924);
    expect(totalXpForLevel(100)).toBe(146124);
  });
  it("derives level from total XP", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpInto: 0, xpNeeded: 300 });
    expect(levelFromXp(299).level).toBe(1);
    expect(levelFromXp(300).level).toBe(2);
    expect(levelFromXp(totalXpForLevel(10)).level).toBe(10);
    expect(levelFromXp(10_000_000).level).toBe(100);
  });
  it("tiers", () => {
    expect(tierOf(9)).toBe("bronze");
    expect(tierOf(10)).toBe("silver");
    expect(tierOf(25)).toBe("gold");
    expect(tierOf(50)).toBe("crimson");
  });
});

describe("full simulated games never break invariants", () => {
  it("random 200 games terminate with a winner", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry32(seed);
      const n = 5 + Math.floor(rng() * 20);
      const mafiaCount = Math.max(1, Math.min(6, Math.floor((n - 1) / 2) - 1 - Math.floor(rng() * 2)));
      let s = createGame(names(n), cfg({ mafiaCount }, { doctor: true, sniper: rng() > 0.5, mayor: rng() > 0.5, goodboy: rng() > 0.5, silencer: mafiaCount > 1 && rng() > 0.5 }), rng);
      let guard = 0;
      while (s.phase !== "ended" && guard++ < 100) {
        const live = s.players.filter((p) => p.alive);
        const town = live.filter((p) => p.role !== "mafia" && p.role !== "silencer");
        const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
        const doc = live.find((p) => p.role === "doctor");
        const heal = doc ? pick(live.filter((p) => p.id !== s.lastHealed)).id : null;
        s = resolveNight(s, { kill: currentShooter(s) ? pick(town).id : null, heal }).state;
        if (s.phase === "ended") break;
        const votes: Record<string, string> = {};
        for (const p of s.players.filter((q) => q.alive)) votes[p.id] = pick(s.players.filter((q) => q.alive && q.id !== p.id)).id;
        s = resolveVote(s, votes).state;
      }
      expect(s.phase).toBe("ended");
      expect(s.winner).not.toBeNull();
    }
  });
});
