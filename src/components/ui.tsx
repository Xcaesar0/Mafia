"use client";
import Image from "next/image";
import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { ArrowLeft, Play, Trophy, User } from "./icons";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/* ---------- Buttons ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; full?: boolean };

export function PrimaryButton({ children, icon, disabled, className, full = true, ...r }: BtnProps) {
  return (
    <button
      {...r}
      disabled={disabled}
      className={cx(
        "relative h-[56px] rounded-[22px] border text-[18px] font-semibold leading-7 flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-[0.98]",
        full && "w-full",
        disabled
          ? "bg-white/[0.06] border-white/10 text-white/40"
          : "brand-gradient border-white text-white shadow-[0_10px_20px_rgba(226,59,59,0.45)]",
        className,
      )}
    >
      {!disabled && <span aria-hidden className="absolute inset-x-0 top-0 h-[26px] bg-gradient-to-b from-white/35 to-transparent rounded-t-[22px]" />}
      <span className="relative flex items-center gap-2">{children}{icon ?? <ArrowLeft size={22} />}</span>
    </button>
  );
}

export function SecondaryButton({ children, className, full = true, icon, ...r }: BtnProps) {
  return (
    <button
      {...r}
      className={cx(
        "h-[56px] rounded-[22px] border border-white/16 bg-white/[0.06] text-white text-[16px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform",
        full && "w-full",
        className,
      )}
    >
      {children}{icon}
    </button>
  );
}

export function GoldButton({ children, className, full = true, ...r }: BtnProps) {
  return (
    <button
      {...r}
      className={cx(
        "h-[56px] rounded-[22px] gold-gradient border border-white/80 text-[18px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_18px_rgba(242,196,109,0.3)] active:scale-[0.98] transition-transform",
        full && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TextButton({ children, className, ...r }: BtnProps) {
  return <button {...r} className={cx("h-12 px-4 text-gold text-[15px] font-medium", className)}>{children}</button>;
}

/* ---------- Layout ---------- */
export function Screen({ children, className, glow = "#e23b3b", style }: { children: ReactNode; className?: string; glow?: string; style?: CSSProperties }) {
  return (
    <div className={cx("app-frame flex flex-col", className)} style={style}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px]" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${glow}26, transparent 70%)` }} />
      <div className="relative flex min-h-dvh flex-1 flex-col">{children}</div>
    </div>
  );
}

export function TopBar({ title, onBack, trailing }: { title: string; onBack?: () => void; trailing?: ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between px-6">
      {onBack ? (
        <button aria-label="رجوع" onClick={onBack} className="size-10 rounded-full border border-white/16 bg-white/[0.06] flex items-center justify-center"><ArrowLeft size={20} className="rotate-180" /></button>
      ) : <span className="size-10" />}
      <h1 className="t-title">{title}</h1>
      {trailing ?? <span className="size-10" />}
    </header>
  );
}

export function StepDots({ step, total = 6 }: { step: number; total?: number }) {
  return (
    <div className="flex gap-[6px] justify-center" role="progressbar" aria-valuenow={step} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx("h-[3px] w-9 rounded-full", i < step ? "bg-gold" : "bg-white/15")} />
      ))}
    </div>
  );
}

/* ---------- Avatar / players ---------- */
export const RING_COLORS = ["#f2c46d", "#2ee6b6", "#4cc9ff", "#ff5fa2", "#a78bfa", "#ff9f4a"];
export const ringFor = (i: number) => RING_COLORS[i % RING_COLORS.length];

export function Avatar({ name, ring = "#f2c46d", size = 44, className }: { name: string; ring?: string; size?: number; className?: string }) {
  return (
    <span
      className={cx("flex shrink-0 items-center justify-center rounded-full bg-[var(--surface)] font-semibold text-ink", className)}
      style={{ width: size, height: size, border: `${size > 80 ? 3.5 : 2}px solid ${ring}`, fontSize: size * 0.4 }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}

/* ---------- Bottom nav ---------- */
export function BottomNav({ active }: { active: "play" | "account" | "leaderboard" }) {
  const tabs = [
    { id: "play", label: "العب", href: "/", icon: <Play size={24} /> },
    { id: "account", label: "حسابي", href: "/account", icon: <User size={24} /> },
    { id: "leaderboard", label: "الترتيب", href: "/leaderboard", icon: <Trophy size={24} /> },
  ] as const;
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed bottom-0 left-1/2 h-[150px] w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-b from-transparent via-[#050505e6] to-[#050505]" />
      <nav className="fixed bottom-24 left-1/2 z-20 -translate-x-1/2 max-w-[430px] w-full px-6" style={{ bottom: "max(24px, env(safe-area-inset-bottom))" }}>
        <div className="flex h-[72px] items-center gap-0 rounded-[36px] border border-white/16 bg-white/[0.07] p-[6px] shadow-[0_10px_24px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          {tabs.map((t) => {
            const on = t.id === active;
            return (
              <Link
                key={t.id}
                href={t.href}
                className={cx(
                  "relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[30px] text-[11px] leading-5",
                  on ? "text-[#fff5f2] bg-gradient-to-b from-[#e23b3b] to-[#b22222] shadow-[0_6px_9px_rgba(226,59,59,0.45),inset_0_1px_1px_rgba(255,255,255,0.28)]" : "text-[#b8b2bf]",
                )}
              >
                {t.icon}
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function Logo({ width = 46 }: { width?: number }) {
  return <Image src="/art/logo.webp" alt="MAFIA مافيا" width={width} height={Math.round(width * 1.04)} priority />;
}
