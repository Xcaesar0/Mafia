"use client";
import Link from "next/link";
import { useState } from "react";
import { Screen, TopBar, BottomNav, Avatar, PrimaryButton, SecondaryButton, RING_COLORS } from "@/components/ui";
import { LevelBadge, TierName, XpBar } from "@/components/level";
import { useAuth } from "@/lib/auth";
import { levelFromXp } from "@/lib/game/xp";

export default function Account() {
  const { ready, user, profile, isGuest, signOut, updateProfile, signInGoogle } = useAuth();
  const [name, setName] = useState<string | null>(null);

  if (!ready) return <Screen><TopBar title="حسابي" /><BottomNav active="account" /></Screen>;
  if (!user || !profile) {
    return (
      <Screen>
        <TopBar title="حسابي" />
        <div className="flex flex-col items-center gap-4 px-6 pt-16 text-center">
          <h2 className="t-heading">سجّل لتحفظ تقدمك</h2>
          <p className="t-body text-[var(--text-muted)]">مستواك يرتفع بالفوز فقط، وتظهر في لوحة الترتيب.</p>
          <Link href="/login" className="w-full"><PrimaryButton>تسجيل الدخول</PrimaryButton></Link>
        </div>
        <BottomNav active="account" />
      </Screen>
    );
  }
  const lv = levelFromXp(profile.total_xp);
  const winRate = profile.games_played ? Math.round((profile.wins / profile.games_played) * 100) : 0;
  return (
    <Screen className="pb-[140px]">
      <TopBar title="حسابي" />
      <div className="flex flex-col items-center gap-3 px-6 pt-6">
        <Avatar name={profile.nickname} ring={profile.ring} size={96} />
        <div className="flex items-center gap-2">
          <LevelBadge level={lv.level} size={40} />
          <div className="text-right">
            <h2 className="t-heading">{profile.nickname}</h2>
            <p className="t-caption"><TierName level={lv.level} />{isGuest && <span className="text-[var(--text-muted)]"> · ضيف</span>}</p>
          </div>
        </div>
        <div className="w-full rounded-3xl border border-white/16 bg-white/[0.06] p-4">
          <div className="t-caption mb-2 flex justify-between text-[var(--text-muted)]"><span>المستوى {lv.level + 1}</span><span>{lv.xpInto} / {lv.xpNeeded}</span></div>
          <XpBar into={lv.xpInto} needed={lv.xpNeeded} />
        </div>
        <div className="grid w-full grid-cols-3 gap-2">
          {[["مباريات", profile.games_played], ["انتصارات", profile.wins], ["نسبة الفوز", `${winRate}%`]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border border-white/16 bg-white/[0.06] py-3 text-center"><b className="t-title block">{v}</b><span className="t-caption text-[var(--text-muted)]">{l}</span></div>
          ))}
        </div>
        <div className="w-full">
          <p className="t-label mb-2 text-right">الاسم</p>
          <input
            value={name ?? profile.nickname} maxLength={14} aria-label="الاسم المستعار"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { const n = (name ?? "").trim(); if (n && n !== profile.nickname) updateProfile({ nickname: n }); setName(null); }}
            className="t-body h-12 w-full rounded-2xl border border-white/16 bg-white/[0.06] px-4 text-right outline-none focus:border-gold"
          />
          <div className="mt-3 flex justify-end gap-2" role="radiogroup" aria-label="لون الإطار">
            {RING_COLORS.map((c) => (
              <button key={c} role="radio" aria-checked={profile.ring === c} aria-label={c} onClick={() => updateProfile({ ring: c })}
                className="size-9 rounded-full border-2" style={{ background: c, borderColor: profile.ring === c ? "#fff" : "transparent" }} />
            ))}
          </div>
        </div>
        {isGuest && <SecondaryButton onClick={() => signInGoogle()}>الدخول بحساب Google</SecondaryButton>}
        <SecondaryButton onClick={signOut}>تسجيل الخروج</SecondaryButton>
      </div>
      <BottomNav active="account" />
    </Screen>
  );
}
