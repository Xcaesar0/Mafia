"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Action, PlayerView } from "./engine";

export async function api<T = unknown>(method: "GET" | "POST", body?: unknown, query = ""): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const { data: s } = await supabase().auth.getSession();
  const res = await fetch(`/api/room${query}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export function useRoom(code: string, enabled: boolean) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    const r = await api<PlayerView>("GET", undefined, `?code=${code}`);
    if (r.ok) { setView(r.data); setMissing(false); }
    else if (r.status === 404) setMissing(true);
  }, [code]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const sb = supabase();
    const ch = sb.channel(`room-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, () => refresh())
      .subscribe();
    const poll = setInterval(refresh, 4000);
    return () => { clearInterval(poll); sb.removeChannel(ch); };
  }, [code, enabled, refresh]);

  const send = useCallback(async (action: Action): Promise<boolean> => {
    busy.current = true; setError(null);
    const r = await api<PlayerView>("POST", { kind: "act", code, action });
    busy.current = false;
    if (r.ok) { setView(r.data); return true; }
    setError(r.data.error ?? "حدث خطأ"); refresh();
    return false;
  }, [code, refresh]);

  return { view, error, setError, missing, send, refresh };
}
