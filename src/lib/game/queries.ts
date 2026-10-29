import { GameState, Player, Role, TEAM_OF, Team } from "./types";

export const alive = (s: GameState) => s.players.filter((p) => p.alive);
export const byId = (s: GameState, id: string) => s.players.find((p) => p.id === id);
export const aliveWithRole = (s: GameState, role: Role) => alive(s).filter((p) => p.role === role);

/** Rotating kill turn: living regular mafia in seat order; silencer inherits only when no regular mafia remain. */
export function currentShooter(s: GameState): Player | null {
  const regular = aliveWithRole(s, "mafia");
  if (regular.length > 0) return regular[s.shooterCursor % regular.length];
  const silencers = aliveWithRole(s, "silencer");
  return silencers[0] ?? null;
}

export function teamCounts(s: GameState): Record<Team, number> {
  const a = alive(s);
  return { mafia: a.filter((p) => TEAM_OF[p.role] === "mafia").length, town: a.filter((p) => TEAM_OF[p.role] === "town").length };
}

/** Town wins when no mafia remain; mafia wins when they equal or outnumber the town. */
export function checkWinner(s: GameState): Team | null {
  const c = teamCounts(s);
  if (c.mafia === 0) return "town";
  if (c.mafia >= c.town) return "mafia";
  return null;
}
