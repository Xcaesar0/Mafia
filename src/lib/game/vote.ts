import { GameEvent, GameState } from "./types";
import { byId, checkWinner } from "./queries";

export const MAYOR_WEIGHT = 3;

export interface VoteResult {
  counts: Record<string, number>;
  leaders: string[];
  tied: boolean;
}

/** votes: voterId -> targetId. Only living voters count; the mayor's vote counts triple. */
export function tally(s: GameState, votes: Record<string, string>): VoteResult {
  const counts: Record<string, number> = {};
  for (const [voterId, targetId] of Object.entries(votes)) {
    const voter = byId(s, voterId);
    const target = byId(s, targetId);
    if (!voter?.alive || !target?.alive) continue;
    counts[targetId] = (counts[targetId] ?? 0) + (voter.role === "mayor" ? MAYOR_WEIGHT : 1);
  }
  const max = Math.max(0, ...Object.values(counts));
  const leaders = Object.keys(counts).filter((id) => counts[id] === max && max > 0);
  return { counts, leaders, tied: leaders.length > 1 };
}

/** Hand-count mode (shared device): counts per living target, entered by the group. The mayor's x3 is applied by the group. */
export function tallyCounts(s: GameState, counts: Record<string, number>): VoteResult {
  const clean: Record<string, number> = {};
  for (const [id, n] of Object.entries(counts)) if (byId(s, id)?.alive && n > 0) clean[id] = Math.floor(n);
  const max = Math.max(0, ...Object.values(clean));
  const leaders = Object.keys(clean).filter((id) => clean[id] === max && max > 0);
  return { counts: clean, leaders, tied: leaders.length > 1 };
}

export function resolveVote(s: GameState, votes: Record<string, string>) {
  return applyVote(s, tally(s, votes));
}

export function resolveVoteCounts(s: GameState, counts: Record<string, number>) {
  return applyVote(s, tallyCounts(s, counts));
}

function applyVote(s: GameState, result: VoteResult): { state: GameState; events: GameEvent[]; result: VoteResult } {
  const next: GameState = { ...s, players: s.players.map((p) => ({ ...p })) };
  const events: GameEvent[] = [];
  if (result.leaders.length === 1) {
    byId(next, result.leaders[0])!.alive = false;
    events.push({ type: "killed", id: result.leaders[0], by: "vote" });
  } else events.push({ type: "tie" });
  next.silencedToday = null;
  next.winner = checkWinner(next);
  if (next.winner) next.phase = "ended";
  else {
    next.phase = "night";
    next.round = s.round + 1;
  }
  return { state: next, events, result };
}
