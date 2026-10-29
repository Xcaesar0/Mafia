import Image from "next/image";
import Link from "next/link";
import { Screen, BottomNav, Logo, Avatar } from "@/components/ui";
import { ArrowLeft, Hash, Help, Plus, QrCode, ChevronLeft } from "@/components/icons";

const ROLES = [
  { id: "silencer", name: "مافيا التسكيت", sub: "يُسكت لاعباً", glow: "#dca4af" },
  { id: "mafia", name: "عضو مافيا", sub: "يتناوب على القتل", glow: "#dca4af" },
  { id: "doctor", name: "الطبيب", sub: "ينقذ لاعباً", glow: "#a3bfdc" },
  { id: "sniper", name: "القناص", sub: "رصاصة واحدة", glow: "#a3bfdc" },
  { id: "mayor", name: "عمدة الصالحين", sub: "صوته بثلاثة", glow: "#a3bfdc" },
  { id: "goodboy", name: "الولد الصالح", sub: "ينجو من أول هجوم", glow: "#a3bfdc" },
  { id: "civilian", name: "مواطن صالح", sub: "يكشف المافيا", glow: "#a3bfdc" },
];

export default function Home() {
  return (
    <Screen className="pb-[140px]">
      {/* Hero */}
      <section className="relative h-[330px] overflow-hidden rounded-b-[36px] border border-white/16 bg-gradient-to-b from-[var(--brand-deep)] to-[var(--surface)]">
        <Image src="/art/sunburst.svg" alt="" width={720} height={720} className="absolute -left-[261px] -top-[171px] max-w-none opacity-100" />
        <Image src="/art/hero.webp" alt="" width={203} height={259} className="absolute -left-[14px] top-[70px] h-[259px] w-[203px] max-w-none object-cover" priority />
        <div className="absolute left-[23px] top-[17px] flex flex-row-reverse gap-[10px]">
          <Link href="/account" aria-label="حسابي"><Avatar name="ق" size={44} /></Link>
          <Link href="/rules" aria-label="كيف تلعب" className="flex size-11 items-center justify-center rounded-full border border-white/16 bg-white text-black"><Help size={22} /></Link>
        </div>
        <div className="absolute right-[25px] top-[15px]"><Logo width={46} /></div>
        <div className="absolute right-[25px] top-[101px] w-[196px] text-right">
          <p className="t-caption text-gold">أهلاً بعودتك يا قيصر</p>
          <h2 className="t-display text-ink">جاهز <span className="text-gold">للخداع؟</span></h2>
          <p className="t-body text-[var(--text-support)]">اكذب، أقنع، واكشف المافيا قبل أن يكشفوك</p>
        </div>
        <Link href="/create" className="absolute right-[25px] top-[237px] flex h-[56px] w-[196px] items-center justify-center gap-2 overflow-hidden rounded-[22px] border border-white brand-gradient text-[18px] font-semibold text-white shadow-[0_10px_13px_rgba(226,59,59,0.6)]">
          <span aria-hidden className="absolute inset-x-0 top-0 h-[26px] rounded-t-[22px] bg-gradient-to-b from-white/35 to-transparent" />
          <Plus size={26} className="relative" />
          <span className="relative">إنشاء غرفة</span>
        </Link>
      </section>

      {/* Join room bar */}
      <div className="relative z-10 -mt-6 mx-6 flex h-[60px] items-center gap-3 rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] pl-2 pr-4 shadow-[0_4px_8px_rgba(0,0,0,0.28)]">
        <Hash size={22} className="shrink-0 text-[var(--text-muted)]" />
        <input inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="أدخل رمز الغرفة" aria-label="رمز الغرفة" className="t-body flex-1 bg-transparent text-right text-ink outline-none placeholder:text-[var(--text-placeholder)]" />
        <QrCode size={22} className="shrink-0 text-[var(--text-muted)]" />
        <button className="relative flex h-11 w-[92px] shrink-0 items-center justify-center gap-1 rounded-[18px] bg-gradient-to-b from-[#f2c46d] to-[#b8791f] text-[15px] font-medium text-[var(--bg)] shadow-[0_6px_8px_rgba(242,196,109,0.35)]">
          <ArrowLeft size={18} /> انضم
        </button>
      </div>

      {/* Cards */}
      <div className="mx-6 mt-5 flex gap-6">
        <Link href="/rules" className="relative h-[140px] flex-1 rounded-[22px] border-[1.5px] border-[#f2c46dd9] bg-gradient-to-b from-[var(--surface-elevated)] to-[var(--bg)]">
          <Image src="/art/card-howto.webp" alt="" width={88} height={88} className="absolute -top-[17px] right-[8px] size-[88px] object-contain" priority />
          <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-gold text-black"><ArrowLeft size={18} /></span>
          <span className="absolute bottom-3 right-4 text-right"><b className="t-title block">كيف تلعب؟</b><span className="t-caption text-[var(--text-muted)]">القواعد في دقيقتين</span></span>
        </Link>
        <Link href="/leaderboard" className="relative h-[140px] flex-1 rounded-[22px] border-[1.5px] border-white gold-gradient shadow-[0_10px_12px_rgba(242,196,109,0.3)]">
          <Image src="/art/card-rank.webp" alt="" width={77} height={77} className="absolute -top-[11px] right-[14px] size-[77px] object-contain" priority />
          <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-[var(--bg)] text-white"><ArrowLeft size={18} /></span>
          <span className="absolute bottom-3 right-4 text-right"><b className="t-title block">لوحة الصدارة</b><span className="t-caption">تنافس على القمة</span></span>
        </Link>
      </div>

      {/* Roles */}
      <div className="mx-6 mt-6 flex h-7 items-center justify-between">
        <h3 className="t-title">شخصيات اللعبة</h3>
        <Link href="/rules" className="t-caption flex items-center gap-1 text-[var(--focus)]">عرض الكل <ChevronLeft size={16} /></Link>
      </div>
      <div className="mt-8 flex gap-3 overflow-x-auto px-6 pb-3 [scrollbar-width:none]">
        {ROLES.map((r) => (
          <div key={r.id} className="relative flex h-[146px] w-[132px] shrink-0 flex-col items-end justify-end rounded-[22px] border border-[var(--border)] bg-gradient-to-b from-[var(--surface-elevated)] to-[var(--bg)] p-3">
            <span aria-hidden className="absolute left-[17px] top-[-5px] h-[72px] w-[96px] rounded-full blur-2xl" style={{ background: `${r.glow}55` }} />
            <Image src={`/art/role-${r.id}.webp`} alt="" width={92} height={92} className="absolute left-[19px] top-[-15px] size-[92px] object-contain" />
            <b className="t-label">{r.name}</b>
            <span className="t-caption text-[var(--text-muted)]">{r.sub}</span>
          </div>
        ))}
      </div>
      <BottomNav active="play" />
    </Screen>
  );
}
