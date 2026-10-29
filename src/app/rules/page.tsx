import Link from "next/link";
import { Screen, TopBar } from "@/components/ui";

const RULES = [
  ["الهدف", "المافيا تريد أن يتساوى عددها مع عدد الصالحين. الصالحون يريدون كشف المافيا وإخراجهم جميعاً."],
  ["الليل", "يمرّر اللاعبون الجهاز واحداً واحداً. المافيا (بالتناوب) تختار ضحية، والطبيب يحمي لاعباً، والقناص يملك رصاصة واحدة، ومافيا التسكيت تُسكت لاعباً."],
  ["الصباح", "تُعلَن نتائج الليل أمام الجميع: من خرج، ومن نجا، ومن مُنع من الكلام."],
  ["النقاش والتصويت", "يتناقش الجميع ثم يرفعون أيديهم. اللاعب الأعلى أصواتاً يخرج. عند التعادل لا يخرج أحد. صوت عمدة الصالحين يعدّ بثلاثة."],
  ["الطبيب", "يحمي لاعباً كل ليلة، ويمكنه حماية نفسه، لكن لا يحمي نفس اللاعب ليلتين متتاليتين."],
  ["الخصوصية", "اللعبة تُلعب وجهاً لوجه: لا يظهر دورك إلا وأنت تضغط الزر، فاحرص ألا ينظر أحد."],
];

export default function Rules() {
  return (
    <Screen>
      <TopBar title="كيف تلعب؟" />
      <div className="flex flex-col gap-3 px-6 pb-12">
        {RULES.map(([t, b]) => (
          <section key={t} className="rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] p-4 text-right">
            <h2 className="t-label text-gold">{t}</h2>
            <p className="t-body mt-1 text-[var(--text-support)]">{b}</p>
          </section>
        ))}
        <Link href="/" className="t-label mt-2 text-center text-gold">العودة</Link>
      </div>
    </Screen>
  );
}
