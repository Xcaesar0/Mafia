"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen, TopBar, PrimaryButton, SecondaryButton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/rooms/client";

export default function RoomEntry() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && !user) router.replace("/login?next=/room"); }, [ready, user, router]);

  const create = async () => {
    setBusy(true); setErr(null);
    const r = await api<{ code: string }>("POST", { kind: "create" });
    setBusy(false);
    if (r.ok) router.push(`/room/${r.data.code}`); else setErr(r.data.error ?? "تعذّر إنشاء الغرفة");
  };
  const join = async () => {
    setBusy(true); setErr(null);
    const r = await api<{ code: string }>("POST", { kind: "join", code });
    setBusy(false);
    if (r.ok) router.push(`/room/${code}`); else setErr(r.data.error ?? "تعذّر الانضمام");
  };

  return (
    <Screen>
      <TopBar title="لعب أونلاين" onBack={() => router.push("/")} />
      <div className="flex flex-col gap-5 px-6 pt-8">
        <div className="text-right"><h2 className="t-heading">أنشئ غرفة أو انضم</h2><p className="t-body text-[var(--text-muted)]">كل لاعب بجهازه — ويظهر دوره له وحده.</p></div>
        <PrimaryButton onClick={create} disabled={busy || !user}>إنشاء غرفة جديدة</PrimaryButton>
        <div className="t-caption flex items-center gap-3 text-[var(--text-muted)]"><span className="h-px flex-1 bg-white/16" />أو انضم برمز<span className="h-px flex-1 bg-white/16" /></div>
        <input
          inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} aria-label="رمز الغرفة" placeholder="000000"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="t-display h-16 w-full rounded-2xl border border-white/16 bg-white/[0.06] text-center tracking-[0.4em] outline-none focus:border-gold"
          dir="ltr"
        />
        <SecondaryButton onClick={join} disabled={busy || code.length !== 6 || !user}>انضمام</SecondaryButton>
        {err && <p role="alert" className="t-caption text-center text-[var(--brand-hot)]">{err}</p>}
      </div>
    </Screen>
  );
}
