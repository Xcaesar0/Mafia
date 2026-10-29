"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Screen, TopBar, StepDots, cx } from "@/components/ui";
import { ChevronLeft, Users } from "@/components/icons";
import { useDispatch } from "@/lib/session";

function ModeCard({ tone, badge, title, sub, range, art, onClick, disabled }: {
  tone: "red" | "gold"; badge: string; title: string; sub: string; range: string; art: string; onClick?: () => void; disabled?: boolean;
}) {
  const red = tone === "red";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "relative flex h-[200px] w-full flex-col items-end gap-2 rounded-[28px] border p-5 pb-[18px] pl-[164px] text-right active:scale-[0.99] transition-transform",
        red ? "border-[var(--brand-hot)] bg-gradient-to-b from-[var(--brand-deep)] to-[var(--surface)]" : "border-gold bg-gradient-to-b from-[#33240d] to-[var(--surface)]",
        disabled && "opacity-60",
      )}
    >
      <span className={cx("rounded-full border px-[10px] py-[3px] t-caption", red ? "border-[#e23b3b73] bg-[#e23b3b29] text-[var(--brand-hot)]" : "border-[#f2c46d73] bg-[#f2c46d29] text-gold")}>{badge}</span>
      <b className="t-title block w-full">{title}</b>
      <span className="t-caption block w-full text-[var(--text-muted)]">{sub}</span>
      <span className="flex-1" />
      <span className="flex w-full items-center justify-end gap-[5px]">
        <span className="flex size-8 items-center justify-center rounded-2xl border border-white/16 bg-white/[0.06]"><ChevronLeft size={16} /></span>
        <span className="t-caption flex items-center gap-[6px] rounded-full border border-white/16 bg-white/[0.06] px-[10px] py-1">{range}<Users size={14} /></span>
      </span>
      <Image src={art} alt="" width={166} height={170} className="absolute -left-[9px] -top-[13px] h-[170px] w-[166px] object-contain" priority />
    </button>
  );
}

export default function Create() {
  const router = useRouter();
  const d = useDispatch();
  return (
    <Screen>
      <TopBar title="إنشاء غرفة" onBack={() => router.push("/")} />
      <div className="flex flex-col gap-3 px-6 pt-5">
        <div className="flex items-center justify-end gap-[10px]">
          <StepDots step={1} total={2} />
          <span className="t-caption text-gold">إنشاء غرفة · الخطوة 1 من 2</span>
        </div>
        <div className="text-right">
          <h2 className="t-heading">كيف تحب تلعب؟</h2>
          <p className="t-body text-[var(--text-muted)]">اختر طريقة اللعب، وتقدر تغيّرها لاحقًا</p>
        </div>
        <div className="flex flex-col gap-10 pt-12">
          <ModeCard tone="red" badge="أونلاين" title="عدة أجهزة" sub="كل لاعب بجواله وغرفة بكود" range="4 – 24 لاعب" art="/art/mode-multi.webp" onClick={() => router.push("/room")} />
          <ModeCard
            tone="gold" badge="للطاولة" title="جهاز واحد" sub="مرّر الجوال بين اللاعبين" range="4 – 12 لاعب" art="/art/mode-shared.webp"
            onClick={() => { d({ t: "reset" }); router.push("/play"); }}
          />
        </div>
      </div>
    </Screen>
  );
}
