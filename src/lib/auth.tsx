"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface Profile { id: string; nickname: string; ring: string; total_xp: number; games_played: number; wins: number }
interface AuthCtx {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  isGuest: boolean;
  signInGuest: (nickname: string) => Promise<string | null>;
  signInGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (p: Partial<Pick<Profile, "nickname" | "ring">>) => Promise<string | null>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) return setProfile(null);
    const { data } = await supabase().from("profiles").select("id,nickname,ring,total_xp,games_played,wins").eq("id", u.id).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setTimeout(() => loadProfile(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<AuthCtx>(() => ({
    ready, user, profile,
    isGuest: !!user?.is_anonymous,
    async signInGuest(nickname) {
      const { data, error } = await supabase().auth.signInAnonymously({ options: { data: { nickname } } });
      if (error) return error.message;
      if (data.user) {
        await supabase().from("profiles").update({ nickname }).eq("id", data.user.id);
        await loadProfile(data.user);
      }
      return null;
    },
    async signInGoogle() {
      const { error } = await supabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      return error?.message ?? null;
    },
    async signOut() { await supabase().auth.signOut(); setProfile(null); },
    async updateProfile(p) {
      if (!user) return "not signed in";
      const { error } = await supabase().from("profiles").update(p).eq("id", user.id);
      if (!error) await loadProfile(user);
      return error?.message ?? null;
    },
    refresh: () => loadProfile(user),
  }), [ready, user, profile, loadProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
