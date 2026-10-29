import { describe, expect, it } from "vitest";
import { applyAction, emptyPrivate, emptyPublic, viewFor, tasksOf, DEFAULT_CONFIG, type RoomData } from "./engine";
import { byId, currentShooter, TEAM_OF } from "../game";

const mk = (n: number): RoomData => ({
  code: "123456", hostId: "u0", status: "lobby", config: DEFAULT_CONFIG, pub: emptyPublic(), priv: emptyPrivate(),
  players: Array.from({ length: n }, (_, i) => ({ user_id: `u${i}`, name: `لاعب${i}`, ring: "#fff", seat: i })),
});

function started(n = 6, seed = 7) {
  let r = mk(n);
  r = applyAction(r, "u0", { op: "start", seed });
  for (let i = 0; i < n; i++) r = applyAction(r, `u${i}`, { op: "ack" });
  return r;
}

describe("rooms engine", () => {
  it("only host starts; needs min players", () => {
    expect(() => applyAction(mk(5), "u1", { op: "start" })).toThrow();
    expect(() => applyAction(mk(3), "u0", { op: "start" })).toThrow();
  });

  it("reveal -> night after everyone acks; views never leak other roles", () => {
    const r = started();
    expect(r.pub.phase).toBe("night");
    const v = viewFor(r, "u1");
    expect(JSON.stringify(v)).not.toContain("allRoles");
    expect(v.me?.role).toBeTruthy();
    expect(Object.keys(v.pub.deadRoles)).toHaveLength(0);
  });

  it("night resolves when all alive submit; mafia kill needs a target", () => {
    let r = started();
    const g = r.priv.game!;
    const shooter = currentShooter(g)!;
    const victim = g.players.find((p) => TEAM_OF[p.role] === "town" && p.role !== "doctor" && p.role !== "goodboy")!;
    for (const p of g.players) {
      const uid = r.pub.players.find((x) => x.id === p.id)!.userId;
      const tasks = tasksOf(g, p.id);
      if (tasks.includes("kill")) {
        expect(() => applyAction(r, uid, { op: "night", picks: {} })).toThrow();
        r = applyAction(r, uid, { op: "night", picks: { kill: victim.id } });
      } else r = applyAction(r, uid, { op: "night", picks: {} });
    }
    expect(shooter).toBeTruthy();
    expect(r.pub.phase).toBe("morning");
    expect(byId(r.priv.game!, victim.id)!.alive).toBe(false);
    expect(r.pub.deadRoles[victim.id]).toBe(victim.role);
  });

  it("full game reaches ended with a winner and role reveal", () => {
    let r = started(5, 3);
    for (let guard = 0; guard < 30 && r.pub.phase !== "ended"; guard++) {
      const g = r.priv.game!;
      if (r.pub.phase === "night") {
        for (const p of g.players.filter((x) => x.alive)) {
          const uid = r.pub.players.find((x) => x.id === p.id)!.userId;
          const tasks = tasksOf(g, p.id);
          const townTarget = g.players.find((x) => x.alive && TEAM_OF[x.role] === "town" && x.id !== p.id);
          r = applyAction(r, uid, { op: "night", picks: tasks.includes("kill") ? { kill: townTarget!.id } : {} });
          if (r.pub.phase !== "night") break;
        }
      } else if (r.pub.phase === "morning") r = applyAction(r, "u0", { op: "dayStart" });
      else if (r.pub.phase === "day") r = applyAction(r, "u0", { op: "toVote" });
      else if (r.pub.phase === "vote") {
        const alive = g.players.filter((x) => x.alive);
        const tgt = alive.find((x) => TEAM_OF[x.role] === "town") ?? alive[0];
        for (const p of alive) {
          if (p.id === tgt.id) continue;
          const uid = r.pub.players.find((x) => x.id === p.id)!.userId;
          r = applyAction(r, uid, { op: "vote", target: tgt.id });
          if (r.pub.phase !== "vote") break;
        }
        if (r.pub.phase === "vote") r = applyAction(r, "u0", { op: "force" });
      } else if (r.pub.phase === "voteResult") r = applyAction(r, "u0", { op: "next" });
    }
    expect(r.pub.phase).toBe("ended");
    expect(r.pub.winner).toBeTruthy();
    expect(Object.keys(r.pub.allRoles ?? {})).toHaveLength(5);
  });

  it("rejects self vote and non-host controls", () => {
    let r = started(6);
    // fast-forward to vote
    r = { ...r, pub: { ...r.pub, phase: "vote", needed: 6, submitted: 0 }, status: "vote" };
    expect(() => applyAction(r, "u1", { op: "vote", target: "p2" })).toThrow();
    expect(() => applyAction(r, "u1", { op: "force" })).toThrow();
  });
});
