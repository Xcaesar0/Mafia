"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Screen, StepDots, cx } from "@/components/ui";
import { Check, Eye, EyeOff, Fingerprint, Phone } from "@/components/icons";

/** Press-and-hold to complete (used to pass the device on). */
export function HoldCircle({ onComplete, label = "اضغط مطولاً للمتابعة", ms = 700 }: { onComplete: () => void; label?: string; ms?: number }) {
  const [p, setP] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const done = useRef(false);

  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; if (!done.current) setP(0); };
  const tick = () => {
    const v = Math.min(1, (performance.now() - start.current) / ms);
    setP(v);
    if (v >= 1) { done.current = true; onComplete(); return; }
    raf.current = requestAnimationFrame(tick);
  };
  const down = () => { done.current = false; start.current = performance.now(); raf.current = requestAnimationFrame(tick); };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        aria-label={label}
        onPointerDown={down} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onComplete(); }}
        className="relative flex size-[112px] touch-none items-center justify-center rounded-full"
        style={{ boxShadow: "0 0 40px rgba(242,196,109,0.25)" }}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 112 112" aria-hidden>
          <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(242,196,109,0.25)" strokeWidth="3" />
          <circle cx="56" cy="56" r={R} fill="none" stroke="#f2c46d" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
        </svg>
        <span className={cx("flex size-[88px] items-center justify-center rounded-full gold-gradient shadow-[0_8px_16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.5)] transition-transform", p > 0 && "scale-95")}>
          <Fingerprint size={40} className="text-[#1b1208]" />
        </span>
      </button>
      <span className="t-label text-[var(--text-support)]">{label}</span>
    </div>
  );
}

/** "Pass the device to X" screen. */
export function PassDevice({ name, index, step, total, kicker, onContinue, glowRing }: {
  name: string; index: number; step?: number; total?: number; kicker: string; onContinue: () => void; glowRing: string;
}) {
  return (
    <Screen glow="#2ee6b6">
      <div className="flex flex-1 flex-col items-center px-6 pt-8">
        {step ? <StepDots step={step} total={total} /> : null}
        <p className="t-caption mt-3 text-[var(--text-muted)]">{kicker}</p>
        <span className="mt-10 flex size-12 items-center justify-center rounded-full border border-[#2ee6b680] bg-[#2ee6b61f] text-[#2ee6b6]"><Phone size={22} /></span>
        <p className="t-label mt-4 text-[var(--text-muted)]">مرّر الجهاز إلى</p>
        <div className="relative mt-5 flex size-[200px] items-center justify-center">
          <span aria-hidden className="absolute inset-0 rounded-full border" style={{ borderColor: `${glowRing}33` }} />
          <span aria-hidden className="absolute inset-[20px] rounded-full border" style={{ borderColor: `${glowRing}55`, boxShadow: `0 0 60px ${glowRing}33` }} />
          <Avatar name={name} ring={glowRing} size={112} />
        </div>
        <h2 className="t-display mt-6 text-center">{name}</h2>
        <p className="t-label mt-1" style={{ color: glowRing }}>هل أنت {name}؟</p>
        <p className="t-caption mt-4 rounded-full bg-white/[0.08] px-4 py-2 text-[var(--text-support)]">لن يظهر شيء قبل أن تضغط — لا تخبر أحداً</p>
        <div className="flex-1" />
        <div className="pb-10"><HoldCircle onComplete={onContinue} /></div>
      </div>
    </Screen>
  );
}

/** Hold to reveal; releases hide. */
export function HoldPill({ idleLabel = "اضغط مطولاً لإظهار", onChange, hint }: { idleLabel?: string; onChange: (pressed: boolean) => void; hint?: string }) {
  const [pressed, setPressed] = useState(false);
  const set = (v: boolean) => { setPressed(v); onChange(v); };
  return (
    <div className="px-6 pb-8">
      <button
        aria-pressed={pressed}
        onPointerDown={() => set(true)} onPointerUp={() => set(false)} onPointerLeave={() => pressed && set(false)} onPointerCancel={() => set(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={cx(
          "relative flex h-[76px] w-full touch-none items-center justify-between gap-3 rounded-[38px] border px-3 transition-colors",
          pressed ? "border-gold bg-gradient-to-b from-[#f6d489] to-[#d9993a] text-[#1b1208] shadow-[0_0_30px_rgba(242,196,109,0.4)]" : "border-gold/60 bg-white/[0.04]",
        )}
      >
        <span className={cx("flex size-14 shrink-0 items-center justify-center rounded-full", pressed ? "bg-[#1b1208] text-gold" : "gold-gradient text-[#1b1208]")}><Fingerprint size={28} /></span>
        <span className="t-title flex-1 text-right">{pressed ? "اترك الزر للإخفاء" : idleLabel}</span>
        <span className="t-caption w-16 text-left opacity-70">{pressed ? "يظهر الآن" : ""}</span>
      </button>
      {hint && <p className="t-caption mt-3 text-center text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

/** Small bar at the bottom of the night picker: hold to peek at the task text. */
export function PeekBar({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      onPointerDown={() => setOn(true)} onPointerUp={() => setOn(false)} onPointerLeave={() => setOn(false)} onPointerCancel={() => setOn(false)}
      onContextMenu={(e) => e.preventDefault()}
      className="flex h-14 w-full touch-none items-center justify-center gap-2 rounded-[22px] border border-gold/60 bg-[#f2c46d14] px-4 text-gold"
    >
      {on ? <><Eye size={18} /><span className="t-label-s">{text}</span></> : <><EyeOff size={18} /><span className="t-label-s">اضغط مطولاً لتعرف مهمتك</span></>}
    </button>
  );
}

export function TargetRow({ name, glyph, status, ring, selected, disabled, onClick }: {
  name: string; glyph?: string; status: string; ring: string; selected?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex h-16 w-full items-center gap-3 rounded-[22px] border px-4 text-right transition-colors",
        selected ? "border-gold bg-[#f2c46d1a]" : "border-white/16 bg-[var(--surface-elevated)]",
        disabled && "opacity-40",
      )}
    >
      <Avatar name={glyph ?? name} ring={ring} size={44} />
      <span className="flex-1">
        <b className="t-label block">{name}</b>
        <span className="t-caption block text-[var(--text-muted)]">{status}</span>
      </span>
      <span className={cx("flex size-6 items-center justify-center rounded-full border-2", selected ? "border-gold bg-gold text-black" : "border-white/30")}>
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Eyebrow({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "red" }) {
  return <span className={cx("t-caption rounded-full border px-[14px] py-[6px]", tone === "gold" ? "border-gold/50 bg-gold/10 text-gold" : "border-[#dc2f4599] bg-[#dc2f452e] text-[#ff8a98]")}>{children}</span>;
}
