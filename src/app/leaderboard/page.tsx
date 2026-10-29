import { Screen, TopBar, BottomNav } from "@/components/ui";

export default function Page() {
  return (
    <Screen>
      <TopBar title="الترتيب" />
      <p className="t-body px-6 pt-10 text-center text-[var(--text-muted)]">سيتوفر هذا القسم عند ربط الحسابات.</p>
      <BottomNav active="leaderboard" />
    </Screen>
  );
}
