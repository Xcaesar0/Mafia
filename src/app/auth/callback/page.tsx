"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Screen } from "@/components/ui";

export default function Callback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const code = new URL(location.href).searchParams.get("code");
    (async () => {
      if (code) {
        const { error } = await supabase().auth.exchangeCodeForSession(code);
        if (error) return setErr(error.message);
      }
      router.replace("/account");
    })();
  }, [router]);
  return (
    <Screen>
      <p className="t-body px-6 pt-40 text-center text-[var(--text-muted)]">{err ? `تعذّر تسجيل الدخول: ${err}` : "جارٍ تسجيل الدخول…"}</p>
    </Screen>
  );
}
