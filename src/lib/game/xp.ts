import { Team } from "./types";

export const MAX_LEVEL = 100;
export const MAX_MATCH_XP = 250;

export interface WinXpInput {
  winnerTeam: Team; // the player's team (only called for winners)
  playerCount: number;
  survived: boolean;
  roleActions: number; // successful role actions this match
  winsToday: number; // wins already earned today BEFORE this one
  completedRounds: number;
  quit: boolean;
  mafiaFactor?: number; // server-tunable, default 1.3
  townFactor?: number; // default 1.0
}

export function sizeFactor(n: number): number {
  if (n <= 7) return 0.8;
  if (n <= 11) return 1.0;
  return 1.2;
}

export function dailyFactor(winsToday: number): number {
  if (winsToday < 5) return 1;
  if (winsToday < 10) return 0.5;
  return 0.25;
}

/** XP for a WIN. Losses never call this (they earn 0). */
export function winXp(i: WinXpInput): number {
  if (i.quit || i.playerCount < 5 || i.completedRounds < 2) return 0;
  const team = i.winnerTeam === "mafia" ? (i.mafiaFactor ?? 1.3) : (i.townFactor ?? 1.0);
  const base = Math.round(100 * team * sizeFactor(i.playerCount));
  const bonus = Math.min(40, (i.survived ? 15 : 0) + Math.min(25, i.roleActions * 8));
  return Math.round(Math.min(MAX_MATCH_XP, base + bonus) * dailyFactor(i.winsToday));
}

/** XP needed to go from level n to n+1. */
export const xpToNext = (n: number) => 300 + 24 * (n - 1);

/** Total XP required to reach level L (level 1 = 0). */
export const totalXpForLevel = (L: number) => 300 * (L - 1) + 12 * (L - 1) * (L - 2);

export function levelFromXp(totalXp: number): { level: number; xpInto: number; xpNeeded: number } {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= totalXpForLevel(level + 1)) level++;
  return { level, xpInto: totalXp - totalXpForLevel(level), xpNeeded: level >= MAX_LEVEL ? 0 : xpToNext(level) };
}

export type Tier = "bronze" | "silver" | "gold" | "crimson";
export function tierOf(level: number): Tier {
  if (level >= 50) return "crimson";
  if (level >= 25) return "gold";
  if (level >= 10) return "silver";
  return "bronze";
}
export const TIER_NAME_AR: Record<Tier, string> = { bronze: "مبتدئ", silver: "محقق", gold: "زعيم", crimson: "أسطورة" };
