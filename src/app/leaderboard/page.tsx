"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Screen, TopBar, BottomNav, Avatar } from "@/components/ui";
import { LevelBadge, TierName } from "@/components/level";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface Row { id: string; nickname: string; ring: string; level: number; wins: number; rank: number }

export default function Leaderboard() {
  const { ready, user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!ready || !user) return;
    supabase().from("leaderboard").select("id,nickname,ring,level,wins,rank").order("rank").limit(50)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [ready, user]);

  return (
    <Screen className="pb-[140px]">
      <TopBar title="الترتيب" />
      {ready && !user ? (
        <div className="flex flex-col items-center gap-4 px-6 pt-16 text-center">
          <p className="t-body text-[var(--text-muted)]">سجّل الدخول لترى الترتيب.</p>
          <Link href="/login" className="t-label text-gold">تسجيل الدخول</Link>
        </div>
      ) : (
        <ol className="flex flex-col gap-2 px-6 pt-5">
          {(rows ?? []).map((r) => (
            <li key={r.id} className={"flex items-center gap-3 rounded-2xl border bg-white/[0.06] p-3 " + (r.id === user?.id ? "border-gold" : "border-white/16")}>
              <span className="t-title w-8 text-center">{r.rank}</span>
              <Avatar name={r.nickname} ring={r.ring} size={44} />
              <div className="flex-1 text-right"><b className="t-label block">{r.nickname}</b><span className="t-caption"><TierName level={r.level} /> · {r.wins} فوز</span></div>
              <LevelBadge level={r.level} size={40} />
            </li>
          ))}
          {rows && rows.length === 0 && <p className="t-body text-center text-[var(--text-muted)]">لا يوجد لاعبون بعد.</p>}
        </ol>
      )}
      <BottomNav active="leaderboard" />
    </Screen>
  );
}
