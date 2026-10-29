"use client";
import Image from "next/image";
import { cx } from "@/components/ui";
import { Minus, Plus } from "@/components/icons";
import { MAX_MAFIA, ROLE_NAME_AR, validateConfig, type GameConfig, type Role, type SpecialRoles } from "@/lib/game";

const ART: Record<Role, string> = {
  civilian: "/art/role-civilian.webp", mafia: "/art/role-mafia.webp", silencer: "/art/role-silencer.webp",
  doctor: "/art/role-doctor.webp", sniper: "/art/role-sniper.webp", mayor: "/art/role-mayor.webp", goodboy: "/art/role-goodboy.webp",
};
const SPECIALS: { key: keyof SpecialRoles; role: Role; sub: string }[] = [
  { key: "doctor", role: "doctor", sub: "ينقذ لاعباً كل ليلة" },
  { key: "sniper", role: "sniper", sub: "رصاصة واحدة" },
  { key: "mayor", role: "mayor", sub: "صوته بثلاثة" },
  { key: "goodboy", role: "goodboy", sub: "ينجو من أول هجوم" },
  { key: "silencer", role: "silencer", sub: "يُسكت لاعباً (مافيا)" },
];

export function configError(n: number, c: GameConfig) { return validateConfig(n, c); }

export function ConfigPanel({ n, config, onChange, readOnly }: { n: number; config: GameConfig; onChange: (c: GameConfig) => void; readOnly?: boolean }) {
  const maxMafia = Math.max(1, Math.min(MAX_MAFIA, Math.floor((n - 1) / 2)));
  const mafia = Math.min(config.mafiaCount, maxMafia);
  const cfg: GameConfig = { ...config, mafiaCount: mafia };
  const set = (c: GameConfig) => !readOnly && onChange(c);
  return (
    <div>
      <div className="flex items-center justify-between rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] p-4">
        <div className="flex items-center gap-3">
          <button aria-label="أقل" disabled={readOnly || mafia <= 1} onClick={() => set({ ...cfg, mafiaCount: mafia - 1, special: { ...cfg.special, silencer: mafia - 1 < 2 ? false : cfg.special.silencer } })} className="flex size-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><Minus size={18} /></button>
          <span className="t-heading w-8 text-center text-gold">{mafia}</span>
          <button aria-label="أكثر" disabled={readOnly || mafia >= maxMafia} onClick={() => set({ ...cfg, mafiaCount: mafia + 1 })} className="flex size-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><Plus size={18} /></button>
        </div>
        <div className="text-right"><b className="t-label block">عدد المافيا</b><span className="t-caption text-[var(--text-muted)]">من 1 إلى {maxMafia}</span></div>
      </div>
      <h3 className="t-title mt-6 text-right">الأدوار الخاصة</h3>
      <div className="mt-3 flex flex-col gap-3">
        {SPECIALS.map(({ key, role, sub }) => {
          const on = cfg.special[key];
          const lock = key === "silencer" && mafia < 2;
          return (
            <button key={key} disabled={lock || readOnly} aria-pressed={on} onClick={() => set({ ...cfg, special: { ...cfg.special, [key]: !on } })}
              className={cx("flex h-[68px] items-center gap-3 rounded-[22px] border px-4 text-right transition-colors", on ? "border-gold bg-[#f2c46d14]" : "border-white/16 bg-[var(--surface-elevated)]", (lock || readOnly) && "opacity-60")}>
              <Image src={ART[role]} alt="" width={52} height={52} className="size-[52px] object-contain" />
              <span className="flex-1"><b className="t-label block">{ROLE_NAME_AR[role]}</b><span className="t-caption text-[var(--text-muted)]">{lock ? "تحتاج مافيا اثنين على الأقل" : sub}</span></span>
              <span className={cx("flex h-7 w-12 items-center rounded-full p-[3px] transition-colors", on ? "justify-start bg-gold" : "justify-end bg-white/15")}><span className="size-[22px] rounded-full bg-white shadow" /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
