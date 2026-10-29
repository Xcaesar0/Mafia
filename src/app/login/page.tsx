"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen, TopBar, PrimaryButton, SecondaryButton, Logo } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const { signInGuest, signInGoogle } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const guest = async () => {
    setBusy(true); setErr(null);
    const e = await signInGuest(name.trim().slice(0, 14) || "لاعب");
    setBusy(false);
    if (e) setErr("تعذّر الدخول، حاول مرة أخرى"); else router.replace("/account");
  };
  const google = async () => { setBusy(true); const e = await signInGoogle(); if (e) { setErr("تعذّر الدخول عبر Google"); setBusy(false); } };

  return (
    <Screen>
      <TopBar title="تسجيل الدخول" onBack={() => router.push("/")} />
      <div className="flex flex-col items-center gap-6 px-6 pt-10">
        <Logo width={72} />
        <div className="text-center">
          <h2 className="t-heading">انضم إلى اللعبة</h2>
          <p className="t-body text-[var(--text-muted)]">سجّل لتحفظ مستواك وتظهر في الترتيب</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <SecondaryButton onClick={google} disabled={busy}>المتابعة عبر Google</SecondaryButton>
          <div className="t-caption flex items-center gap-3 text-[var(--text-muted)]"><span className="h-px flex-1 bg-white/16" />أو<span className="h-px flex-1 bg-white/16" /></div>
          <input
            value={name} onChange={(e) => setName(e.target.value)} maxLength={14} placeholder="اسمك المستعار"
            aria-label="اسمك المستعار"
            className="t-body h-14 w-full rounded-2xl border border-white/16 bg-white/[0.06] px-4 text-right outline-none focus:border-gold"
          />
          <PrimaryButton onClick={guest} disabled={busy}>الدخول كضيف</PrimaryButton>
          {err && <p role="alert" className="t-caption text-center text-[var(--brand-hot)]">{err}</p>}
        </div>
      </div>
    </Screen>
  );
}
