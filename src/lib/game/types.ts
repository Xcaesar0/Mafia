export type Role = "civilian" | "mafia" | "silencer" | "doctor" | "sniper" | "mayor" | "goodboy";
export type Team = "mafia" | "town";
export type Phase = "night" | "morning" | "day" | "vote" | "ended";

export const TEAM_OF: Record<Role, Team> = {
  civilian: "town",
  mafia: "mafia",
  silencer: "mafia",
  doctor: "town",
  sniper: "town",
  mayor: "town",
  goodboy: "town",
};

export const ROLE_NAME_AR: Record<Role, string> = {
  civilian: "مواطن صالح",
  mafia: "عضو مافيا",
  silencer: "مافيا التسكيت",
  doctor: "الطبيب",
  sniper: "القناص",
  mayor: "عمدة الصالحين",
  goodboy: "الولد الصالح",
};

export interface Player {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
}

export interface SpecialRoles {
  silencer: boolean;
  doctor: boolean;
  sniper: boolean;
  mayor: boolean;
  goodboy: boolean;
}

export interface GameConfig {
  mafiaCount: number; // includes the silencer if enabled
  special: SpecialRoles;
}

export interface GameState {
  players: Player[];
  config: GameConfig;
  phase: Phase;
  round: number; // starts at 1 (first night)
  shooterCursor: number; // rotating kill turn among mafia
  lastHealed: string | null;
  sniperUsed: boolean;
  goodboyShieldUsed: boolean;
  silencedToday: string | null;
  winner: Team | null;
}

export interface NightActions {
  kill?: string | null; // target chosen by tonight's shooter
  heal?: string | null; // doctor target
  snipe?: string | null; // sniper target (optional, one bullet)
  silence?: string | null; // silencer target
}

export type GameEvent =
  | { type: "killed"; id: string; by: "mafia" | "sniper" | "sniper_recoil" | "vote" }
  | { type: "saved"; id: string }
  | { type: "shield_held"; id: string }
  | { type: "silenced"; id: string }
  | { type: "no_death" }
  | { type: "tie" };

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 24;
export const MAX_MAFIA = 6;
