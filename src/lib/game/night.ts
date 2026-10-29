import { GameEvent, GameState, NightActions, TEAM_OF } from "./types";
import { alive, byId, checkWinner, currentShooter } from "./queries";

export interface NightResult {
  state: GameState;
  events: GameEvent[];
}

export function validateNight(s: GameState, a: NightActions): string | null {
  const ok = (id?: string | null) => !id || !!byId(s, id)?.alive;
  if (!ok(a.kill) || !ok(a.heal) || !ok(a.snipe) || !ok(a.silence)) return "الهدف غير صالح";
  if (a.heal && a.heal === s.lastHealed) return "لا يمكن حماية نفس اللاعب ليلتين متتاليتين";
  if (a.kill && byId(s, a.kill) && TEAM_OF[byId(s, a.kill)!.role] === "mafia") return "لا يمكن للمافيا قتل أحد أفرادها";
  if (a.snipe && s.sniperUsed) return "استخدم القناص رصاصته";
  return null;
}

export function resolveNight(s: GameState, a: NightActions): NightResult {
  const err = validateNight(s, a);
  if (err) throw new Error(err);
  const next: GameState = { ...s, players: s.players.map((p) => ({ ...p })) };
  const events: GameEvent[] = [];
  const kill = (id: string, by: "mafia" | "sniper" | "sniper_recoil") => {
    const p = byId(next, id)!;
    if (!p.alive) return;
    p.alive = false;
    events.push({ type: "killed", id, by });
  };
  const healed = a.heal ?? null;

  // Mafia kill
  if (a.kill) {
    const t = byId(next, a.kill)!;
    if (healed === t.id) events.push({ type: "saved", id: t.id });
    else if (t.role === "goodboy" && !next.goodboyShieldUsed) {
      next.goodboyShieldUsed = true;
      events.push({ type: "shield_held", id: t.id });
    } else kill(t.id, "mafia");
  }

  // Sniper (one bullet). Hitting a mafia kills it; hitting town also kills the sniper.
  if (a.snipe) {
    next.sniperUsed = true;
    const t = byId(next, a.snipe)!;
    if (healed === t.id) events.push({ type: "saved", id: t.id });
    else {
      kill(t.id, "sniper");
      if (TEAM_OF[t.role] === "town") {
        const sn = alive(next).find((p) => p.role === "sniper");
        if (sn) kill(sn.id, "sniper_recoil");
      }
    }
  }

  next.silencedToday = a.silence ?? null;
  if (a.silence) events.push({ type: "silenced", id: a.silence });
  if (!events.some((e) => e.type === "killed")) events.push({ type: "no_death" });

  next.lastHealed = healed;
  if (currentShooter(s)) next.shooterCursor = s.shooterCursor + 1;
  next.phase = "morning";
  next.winner = checkWinner(next);
  if (next.winner) next.phase = "ended";
  return { state: next, events };
}
