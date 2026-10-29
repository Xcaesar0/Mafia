"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hash, QrCode } from "@/components/icons";
import { api } from "@/lib/rooms/client";
import { useAuth } from "@/lib/auth";

export function JoinBar() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const go = async () => {
    if (code.length !== 6) return;
    if (ready && !user) return router.push("/login?next=/room");
    const r = await api("POST", { kind: "join", code });
    if (r.ok) router.push(`/room/${code}`); else setErr(r.data.error ?? "تعذّر الانضمام");
  };
  return (
    <>
      <div className="relative z-10 -mt-6 mx-6 flex h-[60px] items-center gap-3 rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] pl-2 pr-4 shadow-[0_4px_8px_rgba(0,0,0,0.28)]">
        <Hash size={22} className="shrink-0 text-[var(--text-muted)]" />
        <input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && go()}
          inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="أدخل رمز الغرفة" aria-label="رمز الغرفة"
          className="t-body flex-1 bg-transparent text-right text-ink outline-none placeholder:text-[var(--text-placeholder)]" />
        <QrCode size={22} className="shrink-0 text-[var(--text-muted)]" />
        <button onClick={go} disabled={code.length !== 6} className="relative flex h-11 w-[92px] shrink-0 items-center justify-center gap-1 rounded-[18px] bg-gradient-to-b from-[#f2c46d] to-[#b8791f] text-[15px] font-medium text-[var(--bg)] shadow-[0_6px_8px_rgba(242,196,109,0.35)] disabled:opacity-60">
          <ArrowLeft size={18} /> انضم
        </button>
      </div>
      {err && <p role="alert" className="t-caption mx-6 mt-2 text-center text-[var(--brand-hot)]">{err}</p>}
    </>
  );
}
