import { tierOf, TIER_NAME_AR, type Tier } from "@/lib/game/xp";

export const TIER_COLOR: Record<Tier, string> = { bronze: "#c98a5a", silver: "#c9d2dc", gold: "#f2c46d", crimson: "#e23b3b" };

export function LevelBadge({ level, size = 48 }: { level: number; size?: number }) {
  const c = TIER_COLOR[tierOf(level)];
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center font-bold text-ink"
      style={{ width: size, height: size * 1.12, fontSize: size * 0.4 }}
      aria-label={`المستوى ${level}`}
    >
      <svg viewBox="0 0 48 54" className="absolute inset-0 size-full" aria-hidden>
        <path d="M24 2 44 9v18c0 12-8 21-20 25C12 48 4 39 4 27V9z" fill="#111" stroke={c} strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <span className="relative">{level}</span>
    </span>
  );
}

export function TierName({ level }: { level: number }) {
  const t = tierOf(level);
  return <span style={{ color: TIER_COLOR[t] }}>{TIER_NAME_AR[t]}</span>;
}

export function XpBar({ into, needed }: { into: number; needed: number }) {
  const pct = Math.min(100, Math.round((into / needed) * 100));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full border border-white/16 bg-white/[0.06]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full gold-gradient" style={{ width: `${pct}%` }} />
    </div>
  );
}
