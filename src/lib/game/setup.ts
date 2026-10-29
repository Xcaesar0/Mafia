import { GameConfig, GameState, MAX_MAFIA, MAX_PLAYERS, MIN_PLAYERS, Player, Role } from "./types";
import { Rng, shuffle } from "./rng";

export function validateConfig(playerCount: number, config: GameConfig): string | null {
  if (playerCount < MIN_PLAYERS) return "الحد الأدنى 4 لاعبين";
  if (playerCount > MAX_PLAYERS) return "الحد الأقصى 24 لاعباً";
  const { mafiaCount, special } = config;
  if (mafiaCount < 1 || mafiaCount > MAX_MAFIA) return "عدد المافيا من 1 إلى 6";
  if (mafiaCount * 2 >= playerCount) return "عدد المافيا يجب أن يكون أقل من نصف اللاعبين";
  if (special.silencer && mafiaCount < 2) return "مافيا التسكيت تحتاج مافيا اثنين على الأقل";
  const townSpecials = [special.doctor, special.sniper, special.mayor, special.goodboy].filter(Boolean).length;
  if (mafiaCount + townSpecials > playerCount) return "عدد الأدوار أكبر من عدد اللاعبين";
  return null;
}

export function buildRoleList(playerCount: number, config: GameConfig): Role[] {
  const roles: Role[] = [];
  const regularMafia = config.mafiaCount - (config.special.silencer ? 1 : 0);
  for (let i = 0; i < regularMafia; i++) roles.push("mafia");
  if (config.special.silencer) roles.push("silencer");
  if (config.special.doctor) roles.push("doctor");
  if (config.special.sniper) roles.push("sniper");
  if (config.special.mayor) roles.push("mayor");
  if (config.special.goodboy) roles.push("goodboy");
  while (roles.length < playerCount) roles.push("civilian");
  return roles;
}

export function createGame(names: string[], config: GameConfig, rng: Rng): GameState {
  const err = validateConfig(names.length, config);
  if (err) throw new Error(err);
  const roles = shuffle(buildRoleList(names.length, config), rng);
  const players: Player[] = names.map((name, i) => ({ id: `p${i + 1}`, name, role: roles[i], alive: true }));
  return {
    players,
    config,
    phase: "night",
    round: 1,
    shooterCursor: 0,
    lastHealed: null,
    sniperUsed: false,
    goodboyShieldUsed: false,
    silencedToday: null,
    winner: null,
  };
}
