"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Screen } from "@/components/ui";

export default function Callback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      // supabase-js exchanges the ?code= itself (PKCE); we only wait for the session.
      let session = (await supabase().auth.getSession()).data.session;
      for (let i = 0; i < 20 && !session; i++) {
        await new Promise((r) => setTimeout(r, 300));
        session = (await supabase().auth.getSession()).data.session;
      }
      if (!session) return setErr("تعذّر إكمال الدخول، حاول مرة أخرى");
      let n = "/account"; try { n = localStorage.getItem("mafia-next") || n; localStorage.removeItem("mafia-next"); } catch {}
      router.replace(n);
    })();
  }, [router]);
  return (
    <Screen>
      <p className="t-body px-6 pt-40 text-center text-[var(--text-muted)]">{err ? `تعذّر تسجيل الدخول: ${err}` : "جارٍ تسجيل الدخول…"}</p>
    </Screen>
  );
}
