"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar, GoldButton, PrimaryButton, Screen, SecondaryButton, StepDots, TextButton, TopBar, cx, ringFor } from "@/components/ui";
import { Check, Close, Crown, EyeOff, Moon, Plus, Sun, Users, Skull, Minus, ArrowLeft, Lock, Eye, Sun as SunIcon } from "@/components/icons";
import { fmtTime, livingOrder, tasksFor, useCountdown, useDispatch, useSession, type NightTask } from "@/lib/session";
import { MAX_MAFIA, MAX_PLAYERS, MIN_PLAYERS, type GameEvent, ROLE_NAME_AR, TEAM_OF, validateConfig, type GameConfig, type GameState, type Player, type Role, type SpecialRoles } from "@/lib/game";
import { PassDevice, HoldPill, PeekBar, TargetRow, Eyebrow } from "./parts";

const SHARED_MAX = 12;
const ringOf = (g: GameState, p: Player) => ringFor(g.players.findIndex((x) => x.id === p.id));
const ROLE_ART: Record<Role, string> = {
  civilian: "/art/role-civilian.webp", mafia: "/art/role-mafia.webp", silencer: "/art/role-silencer.webp",
  doctor: "/art/role-doctor.webp", sniper: "/art/role-sniper.webp", mayor: "/art/role-mayor.webp", goodboy: "/art/role-goodboy.webp",
};
const ROLE_HINT: Record<Role, string> = {
  civilian: "مهمتك: اكشف المافيا بالنقاش والتصويت",
  mafia: "مهمتك: تخلّص من الصالحين دون أن تُكشف",
  silencer: "مهمتك: تُسكت لاعباً كل ليلة",
  doctor: "مهمتك: تنقذ لاعباً كل ليلة",
  sniper: "مهمتك: رصاصة واحدة — فكّر قبل أن تطلق",
  mayor: "مهمتك: صوتك في التصويت يعدّ بثلاثة",
  goodboy: "مهمتك: تنجو من أول هجوم للمافيا",
};

/* ====================================================================== */
export default function Flow() {
  const { s, ready } = useSession();
  if (!ready) return <Screen><div /></Screen>;
  switch (s.stage) {
    case "names": return <Names />;
    case "config": return <Config />;
    case "reveal": return <Reveal key={s.revealIdx} />;
    case "night": return <Night key={s.nightIdx + "-" + (s.game?.round ?? 0)} />;
    case "morning": return <MorningGather />;
    case "news": return <News />;
    case "day": return <Day />;
    case "vote": return <Vote />;
    case "voteResult": return <VoteResult />;
    case "ended": return <Ended />;
  }
}

/* ============================ Names ================================== */
function Names() {
  const { s } = useSession();
  const d = useDispatch();
  const router = useRouter();
  const names = s.names;
  const set = (n: string[]) => d({ t: "names", names: n });
  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  const dup = new Set(trimmed.map((n) => n.toLowerCase())).size !== trimmed.length;
  const can = trimmed.length >= MIN_PLAYERS && !dup;
  return (
    <Screen>
      <TopBar title="جهاز مشترك" onBack={() => router.push("/create")} />
      <div className="flex flex-1 flex-col px-6 pt-2">
        <h2 className="t-heading text-right">من يلعب؟</h2>
        <p className="t-body text-right text-[var(--text-muted)]">اكتب أسماء اللاعبين بالترتيب الذي يجلسون به</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="t-caption text-[var(--text-muted)]">الحد الأدنى {MIN_PLAYERS} · الأقصى {SHARED_MAX}</span>
          <span className="t-label rounded-full border border-gold/60 bg-gold/10 px-4 py-1 text-gold">{trimmed.length} لاعبين</span>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {names.map((n, i) => (
            <div key={i} className={cx("flex h-14 items-center gap-3 rounded-[22px] border px-3", n.trim() ? "border-white/16 bg-[var(--surface-elevated)]" : "border-dashed border-white/20")}>
              <span className="flex size-8 items-center justify-center rounded-full bg-white/[0.08] t-caption text-gold">{i + 1}</span>
              <input
                value={n} maxLength={14} placeholder="اسم اللاعب" aria-label={`اسم اللاعب ${i + 1}`}
                onChange={(e) => set(names.map((x, j) => (j === i ? e.target.value : x)))}
                className="t-label flex-1 bg-transparent text-right outline-none placeholder:text-[var(--text-placeholder)]"
                style={{ userSelect: "text", WebkitUserSelect: "text" }}
              />
              {names.length > MIN_PLAYERS && (
                <button aria-label="حذف" onClick={() => set(names.filter((_, j) => j !== i))} className="flex size-8 items-center justify-center rounded-full bg-white/10"><Close size={14} /></button>
              )}
            </div>
          ))}
          {names.length < SHARED_MAX && (
            <button onClick={() => set([...names, ""])} className="t-label flex h-12 items-center justify-center gap-2 rounded-[22px] border border-dashed border-gold/60 text-gold">
              <Plus size={18} /> إضافة لاعب
            </button>
          )}
          {dup && <p className="t-caption text-[var(--error)]">لا يمكن تكرار الأسماء</p>}
        </div>
        <div className="flex-1" />
        <div className="sticky bottom-0 -mx-6 border-t border-white/10 bg-[var(--bg)] px-6 pb-8 pt-4">
          <PrimaryButton disabled={!can} onClick={() => d({ t: "stage", stage: "config" })}>متابعة</PrimaryButton>
        </div>
      </div>
    </Screen>
  );
}

/* ============================ Config ================================= */
const SPECIALS: { key: keyof SpecialRoles; role: Role; sub: string }[] = [
  { key: "doctor", role: "doctor", sub: "ينقذ لاعباً كل ليلة" },
  { key: "sniper", role: "sniper", sub: "رصاصة واحدة" },
  { key: "mayor", role: "mayor", sub: "صوته بثلاثة" },
  { key: "goodboy", role: "goodboy", sub: "ينجو من أول هجوم" },
  { key: "silencer", role: "silencer", sub: "يُسكت لاعباً (مافيا)" },
];

function Config() {
  const { s } = useSession();
  const d = useDispatch();
  const n = s.names.map((x) => x.trim()).filter(Boolean).length;
  const c = s.config;
  const maxMafia = Math.max(1, Math.min(MAX_MAFIA, Math.floor((n - 1) / 2)));
  const mafia = Math.min(c.mafiaCount, maxMafia);
  const cfg: GameConfig = { ...c, mafiaCount: mafia };
  const err = validateConfig(n, cfg);
  const set = (nc: GameConfig) => d({ t: "config", config: nc });
  return (
    <Screen>
      <TopBar title="إعدادات اللعبة" onBack={() => d({ t: "stage", stage: "names" })} />
      <div className="flex flex-1 flex-col px-6 pt-2">
        <h2 className="t-heading text-right">اختر الأدوار</h2>
        <p className="t-body text-right text-[var(--text-muted)]">{n} لاعبين · الباقي مواطنون صالحون تلقائياً</p>

        <div className="mt-5 flex items-center justify-between rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] p-4">
          <div className="flex items-center gap-3">
            <button aria-label="أقل" disabled={mafia <= 1} onClick={() => set({ ...cfg, mafiaCount: mafia - 1, special: { ...cfg.special, silencer: mafia - 1 < 2 ? false : cfg.special.silencer } })} className="flex size-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><Minus size={18} /></button>
            <span className="t-heading w-8 text-center text-gold">{mafia}</span>
            <button aria-label="أكثر" disabled={mafia >= maxMafia} onClick={() => set({ ...cfg, mafiaCount: mafia + 1 })} className="flex size-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30"><Plus size={18} /></button>
          </div>
          <div className="text-right">
            <b className="t-label block">عدد المافيا</b>
            <span className="t-caption text-[var(--text-muted)]">من 1 إلى {maxMafia}</span>
          </div>
        </div>

        <h3 className="t-title mt-6 text-right">الأدوار الخاصة</h3>
        <div className="mt-3 flex flex-col gap-3">
          {SPECIALS.map(({ key, role, sub }) => {
            const on = cfg.special[key];
            const lock = key === "silencer" && mafia < 2;
            return (
              <button
                key={key} disabled={lock} aria-pressed={on}
                onClick={() => set({ ...cfg, special: { ...cfg.special, [key]: !on } })}
                className={cx("flex h-[68px] items-center gap-3 rounded-[22px] border px-4 text-right transition-colors", on ? "border-gold bg-[#f2c46d14]" : "border-white/16 bg-[var(--surface-elevated)]", lock && "opacity-40")}
              >
                <Image src={ROLE_ART[role]} alt="" width={52} height={52} className="size-[52px] object-contain" />
                <span className="flex-1"><b className="t-label block">{ROLE_NAME_AR[role]}</b><span className="t-caption text-[var(--text-muted)]">{lock ? "تحتاج مافيا اثنين على الأقل" : sub}</span></span>
                <span className={cx("flex h-7 w-12 items-center rounded-full p-[3px] transition-colors", on ? "justify-start bg-gold" : "justify-end bg-white/15")}>
                  <span className="size-[22px] rounded-full bg-white shadow" />
                </span>
              </button>
            );
          })}
        </div>
        {err && <p className="t-caption mt-3 text-[var(--error)]">{err}</p>}
        <div className="flex-1" />
        <div className="sticky bottom-0 -mx-6 border-t border-white/10 bg-[var(--bg)] px-6 pb-8 pt-4">
          <PrimaryButton disabled={!!err} onClick={() => { d({ t: "config", config: cfg }); d({ t: "start", seed: (Math.random() * 2 ** 32) >>> 0 }); }}>ابدأ اللعبة</PrimaryButton>
        </div>
      </div>
    </Screen>
  );
}

/* ============================ Reveal ================================= */
function Reveal() {
  const { s } = useSession();
  const d = useDispatch();
  const g = s.game!;
  const p = g.players[s.revealIdx];
  const [phase, setPhase] = useState<"pass" | "view">("pass");
  const [pressed, setPressed] = useState(false);
  const [seen, setSeen] = useState(false);
  const ring = ringOf(g, p);
  if (phase === "pass")
    return <PassDevice name={p.name} index={s.revealIdx} step={Math.ceil(((s.revealIdx + 1) / g.players.length) * 6)} total={6} kicker={`كشف الأدوار · اللاعب ${s.revealIdx + 1} من ${g.players.length}`} glowRing={ring} onContinue={() => setPhase("view")} />;

  const mates = g.players.filter((x) => x.id !== p.id && TEAM_OF[x.role] === "mafia").map((x) => x.name);
  const lines = [
    `دورك: ${ROLE_NAME_AR[p.role]}`,
    `الفريق: ${TEAM_OF[p.role] === "mafia" ? "المافيا" : "الصالحون"}`,
    TEAM_OF[p.role] === "mafia" ? (mates.length ? `زملاؤك: ${mates.join("، ")}` : "أنت وحدك في المافيا") : ROLE_HINT[p.role],
  ];
  return (
    <Screen glow="#f2c46d">
      <div className="flex flex-1 flex-col px-6 pt-8">
        <StepDots step={Math.ceil(((s.revealIdx + 1) / g.players.length) * 6)} total={6} />
        <p className="t-caption mt-3 text-center text-[var(--text-muted)]">كشف الأدوار · اللاعب {s.revealIdx + 1} من {g.players.length}</p>
        <div className="mt-6 flex h-16 items-center gap-3 rounded-[28px] border border-white/16 bg-white/[0.05] px-3">
          <EyeOff size={20} className="ml-1 text-[var(--text-muted)]" />
          <span className="flex-1 text-right"><b className="t-label block">{p.name}</b><span className="t-caption text-[var(--text-muted)]">دورك سرّي · لا أحد ينظر</span></span>
          <Avatar name={p.name} ring={ring} size={40} />
        </div>

        {/* Private card: identical look for every role while hidden */}
        <div className="relative mx-auto mt-6 flex h-[372px] w-[280px] items-center justify-center overflow-hidden rounded-[22px] border-[3px] border-gold bg-gradient-to-b from-[#16130b] to-[#0a0a0a]">
          <Image src="/art/sunburst.svg" alt="" width={520} height={520} className="absolute max-w-none opacity-60" />
          <span aria-hidden className="absolute inset-3 rounded-[14px] border border-gold/40" />
          {pressed ? (
            <div className="relative flex flex-col items-center gap-5 px-6 text-center">
              {lines.map((l, i) => <p key={i} className="t-label">{l}</p>)}
            </div>
          ) : (
            <Image src="/art/logo.webp" alt="" width={140} height={146} className="relative opacity-90" />
          )}
          <span className="t-label-s absolute bottom-6 flex items-center gap-2 rounded-full border border-gold/50 bg-black/60 px-4 py-1 text-[var(--text-muted)]">
            {pressed ? <><Eye size={14} className="text-gold" /><span className="text-gold">ظاهر الآن</span></> : <><Lock size={14} />مخفي</>}
          </span>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <span className="t-caption flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><EyeOff size={14} />لا أحد ينظر</span>
          <span className="t-caption flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><SunIcon size={14} />خفّض السطوع</span>
        </div>
        <div className="flex-1" />
      </div>
      {seen && !pressed && (
        <div className="px-6 pb-3"><PrimaryButton onClick={() => d({ t: "revealNext" })}>تم — مرّر الجهاز</PrimaryButton></div>
      )}
      <HoldPill onChange={(v) => { setPressed(v); if (v) setSeen(true); }} hint="اترك الزر لإخفاء الدور قبل تمرير الجهاز" />
    </Screen>
  );
}

/* ============================== Night ================================ */
const TASK_TEXT: Record<NightTask["kind"], string> = {
  kill: "اختر من تقتله الليلة",
  silence: "اختر من يُسكَت غداً",
  heal: "اختر من تنقذه الليلة",
  snipe: "رصاصة واحدة — اختر هدفك أو لا أحد",
  decoy: "اختيارك بلا تأثير — للتمويه فقط",
};

function Night() {
  const { s } = useSession();
  const d = useDispatch();
  const g = s.game!;
  const order = useMemo(() => livingOrder(g), [g]);
  const p = order[s.nightIdx];
  const tasks = useMemo(() => tasksFor(g, p), [g, p]);
  const [phase, setPhase] = useState<"pass" | "pick">("pass");
  const [ti, setTi] = useState(0);
  const [patch, setPatch] = useState<Record<string, string | null>>({});
  const [sel, setSel] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState("");
  const ring = ringOf(g, p);
  if (phase === "pass")
    return <PassDevice name={p.name} index={s.nightIdx} kicker={`الليل · الجولة ${g.round} · ${s.nightIdx + 1} من ${order.length}`} glowRing={ring} onContinue={() => setPhase("pick")} />;

  const task = tasks[ti];
  const confirm = () => {
    if (sel === undefined) return;
    if (task.kind === "kill" && sel) {
      const t = g.players.find((x) => x.id === sel)!;
      if (TEAM_OF[t.role] === "mafia") return setError("لا يمكنك اختيار أحد أفراد فريقك");
    }
    if (task.kind === "heal" && sel && sel === g.lastHealed) return setError("لا يمكن اختيار نفس اللاعب ليلتين متتاليتين");
    const next = task.kind === "decoy" ? patch : { ...patch, [task.kind]: sel };
    if (ti + 1 < tasks.length) { setPatch(next); setTi(ti + 1); setSel(undefined); setError(""); return; }
    d({ t: "nightDone", patch: next });
  };
  return (
    <Screen glow="#4c6bd6">
      <div className="flex items-center justify-between px-6 pt-4">
        <span className="t-caption text-[var(--text-muted)]">الجولة {g.round}</span>
        <span className="t-label flex items-center gap-2 rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">الليل <Moon size={16} /></span>
      </div>
      <div className="flex flex-1 flex-col px-6 pt-6">
        <h2 className="t-title text-center">اختر الآن!</h2>
        <p className="t-caption mb-4 text-center text-[var(--text-muted)]">اضغط على اسم لاعب</p>
        <div className="flex flex-col gap-2">
          {order.map((o) => (
            <TargetRow key={o.id} name={o.name} status="حي" ring={ringOf(g, o)} selected={sel === o.id} onClick={() => { setSel(o.id); setError(""); }} />
          ))}
          {(task.kind === "snipe" || task.kind === "decoy" || task.kind === "kill" || task.kind === "heal" || task.kind === "silence") && (
            <TargetRow name="لا أحد" glyph="—" status="تخطي هذه الليلة" ring="#777" selected={sel === null} onClick={() => { setSel(null); setError(""); }} />
          )}
        </div>
        {error && <p className="t-caption mt-3 text-center text-[var(--error)]" role="alert">{error}</p>}
        <div className="flex-1" />
        <div className="flex flex-col gap-3 pb-8 pt-4">
          <PeekBar text={TASK_TEXT[task.kind] + (tasks.length > 1 ? ` (${ti + 1}/${tasks.length})` : "")} />
          <PrimaryButton disabled={sel === undefined} onClick={confirm}>تأكيد الاختيار</PrimaryButton>
        </div>
      </div>
    </Screen>
  );
}

/* ============================== Morning ============================== */
function MorningGather() {
  const { s } = useSession();
  const d = useDispatch();
  const g = s.game!;
  return (
    <Screen glow="#f2c46d">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <span className="flex size-16 items-center justify-center rounded-full border border-gold/60 bg-gold/10 text-gold"><Users size={28} /></span>
        <p className="t-label mt-5 text-gold">أخبار الصباح جاهزة</p>
        <h2 className="t-heading mt-3 text-center">اجتمعوا حول الهاتف!</h2>
        <p className="t-body mt-3 text-center text-[var(--text-muted)]">ضعوا الهاتف في المنتصف ليراه الجميع معاً.</p>
        <div className="mt-6 flex -space-x-reverse -space-x-2">
          {g.players.filter((p) => p.alive || true).map((p) => <Avatar key={p.id} name={p.name} ring={ringOf(g, p)} size={44} className={p.alive ? "" : "opacity-40"} />)}
        </div>
        <p className="t-caption mt-5 rounded-full bg-white/[0.08] px-4 py-2 text-[var(--text-support)]">أو ليقرأها أحدكم بصوت عالٍ للجميع</p>
      </div>
      <div className="px-6 pb-8"><GoldButton onClick={() => d({ t: "stage", stage: "news" })}>أظهر للجميع</GoldButton></div>
    </Screen>
  );
}

type NewsItem = { tone: "danger" | "info" | "calm"; title: string; sub: string };
function buildNews(g: GameState, events: GameEvent[]): NewsItem[] {
  const name = (id: string) => g.players.find((p) => p.id === id)!;
  const out: NewsItem[] = [];
  const sub = { mafia: "قتلته المافيا", sniper: "أصابته رصاصة", sniper_recoil: "دفع ثمن رصاصة خاطئة", vote: "" } as const;
  for (const e of events) {
    if (e.type === "killed") {
      const p = name(e.id);
      out.push({ tone: "danger", title: `${p.name} خرج الليلة الماضية`, sub: sub[e.by] });
      out.push({ tone: "info", title: `${p.name} كان ${ROLE_NAME_AR[p.role]}`, sub: "تم كشف دوره" });
    }
    if (e.type === "saved" || e.type === "shield_held") out.push({ tone: "calm", title: "نجا لاعب من محاولة قتل", sub: "الليلة لم تنتهِ كما خطّط الجميع" });
    if (e.type === "silenced") out.push({ tone: "danger", title: `${name(e.id).name} ممنوع من الكلام اليوم`, sub: "أُسكت بقرار المافيا" });
    if (e.type === "no_death" && events.length === 1) out.push({ tone: "calm", title: "ليلة هادئة", sub: "لم يمت أحد" });
  }
  out.push({ tone: "calm", title: "نهاية أخبار الليل", sub: "ابدأوا النقاش" });
  return out;
}

function News() {
  const { s } = useSession();
  const d = useDispatch();
  const g = s.game!;
  const items = useMemo(() => buildNews(g, s.lastEvents), [g, s.lastEvents]);
  const [wait, setWait] = useState(3);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const tone = { danger: ["border-[#dc2f4580] bg-[#dc2f4514]", "bg-[#dc2f4533] text-[#ff6b7c]", Close], info: ["border-[#2ee6b680] bg-[#2ee6b614]", "bg-[#2ee6b626] text-[#2ee6b6]", Users], calm: ["border-gold/60 bg-gold/[0.08]", "bg-gold/20 text-gold", Check] } as const;
  return (
    <Screen glow="#f2c46d">
      <div className="flex flex-1 flex-col px-6 pt-12">
        <h2 className="t-display flex items-center justify-center gap-2 text-gold">أخبار الصباح <SunIcon size={26} /></h2>
        <p className="t-caption mb-6 text-center text-[var(--text-muted)]">ماذا حدث الليلة الماضية؟</p>
        <div className="flex flex-col gap-3">
          {items.map((it, i) => {
            const [box, chip, Ico] = tone[it.tone];
            return (
              <div key={i} className={cx("flex items-center gap-3 rounded-[22px] border p-4", box)}>
                <span className="flex-1 text-right"><b className="t-label block">{it.title}</b><span className="t-caption text-[var(--text-muted)]">{it.sub}</span></span>
                <span className={cx("flex size-10 items-center justify-center rounded-full", chip)}><Ico size={18} /></span>
              </div>
            );
          })}
        </div>
        <div className="flex-1" />
        <div className="pb-8 pt-4">
          <PrimaryButton disabled={wait > 0} onClick={() => d({ t: "dayStart" })}>{wait > 0 ? `انتظر… ${wait}` : "ابدأ النقاش"}</PrimaryButton>
        </div>
      </div>
    </Screen>
  );
}

/* ============================== Day ================================== */
function GameMenu({ onClose }: { onClose: () => void }) {
  const d = useDispatch();
  const router = useRouter();
  const [confirmEnd, setConfirmEnd] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[430px] rounded-t-[36px] border border-gold/30 bg-gradient-to-b from-[#1c1c20] to-[#0b0b0d] px-6 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" />
        <h3 className="t-title mb-4 text-center">قائمة اللعبة</h3>
        <div className="flex flex-col gap-3">
          <PrimaryButton onClick={onClose} icon={<span />}>استئناف اللعبة</PrimaryButton>
          <SecondaryButton onClick={() => router.push("/rules")}>قواعد اللعبة</SecondaryButton>
          {confirmEnd ? (
            <div className="flex gap-3">
              <SecondaryButton onClick={() => setConfirmEnd(false)}>تراجع</SecondaryButton>
              <PrimaryButton icon={<span />} onClick={() => { d({ t: "reset" }); router.push("/"); }}>تأكيد الإنهاء</PrimaryButton>
            </div>
          ) : <TextButton onClick={() => setConfirmEnd(true)}>إنهاء اللعبة</TextButton>}
        </div>
      </div>
    </div>
  );
}

function PhaseHeader({ tone, label, left, onMenu }: { tone: "night" | "day"; label: string; left: string; onMenu: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 pt-4">
      <span className="t-caption text-[var(--text-muted)]">{left}</span>
      <button onClick={onMenu} className="t-label flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-4 py-2 text-gold">{label}{tone === "day" ? <Sun size={16} /> : <Moon size={16} />}</button>
    </div>
  );
}

function Day() {
  const { s } = useSession();
  const d = useDispatch();
  const g = s.game!;
  const left = useCountdown(s.dayEndsAt);
  const [menu, setMenu] = useState(false);
  const living = livingOrder(g);
  const speaker = living[s.speakerIdx % living.length];
  const total = Math.max(s.daySeconds, left);
  const frac = total ? left / total : 0;
  const R = 112, C = 2 * Math.PI * R;
  const killed = s.lastEvents.find((e) => e.type === "killed");
  const kp = killed && killed.type === "killed" ? g.players.find((p) => p.id === killed.id) : null;
  const silenced = g.silencedToday ? g.players.find((p) => p.id === g.silencedToday) : null;
  return (
    <Screen glow="#f2c46d">
      <PhaseHeader tone="day" label={`اليوم ${g.round}`} left={`الجولة ${g.round} · ${living.length} أحياء`} onMenu={() => setMenu(true)} />
      <div className="flex flex-1 flex-col items-center px-6">
        <p className="t-label-s mt-4 flex items-center gap-2 rounded-full border border-[#dc2f4580] bg-[#dc2f4514] px-4 py-2">
          <span className="size-2 rounded-full bg-[#dc2f45]" />
          {kp ? `قُتل ${kp.name} الليلة · كان ${ROLE_NAME_AR[kp.role]}` : "ليلة هادئة · لم يمت أحد"}
        </p>
        {silenced && <p className="t-caption mt-2 text-[var(--text-muted)]">{silenced.name} ممنوع من الكلام اليوم</p>}
        <div className="relative mt-6 flex size-[240px] items-center justify-center">
          <svg viewBox="0 0 240 240" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="120" cy="120" r={R} fill="#0a0a0a" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx="120" cy="120" r={R} fill="none" stroke="#f2c46d" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
          </svg>
          <div className="relative text-center">
            <div className="text-[56px] font-extrabold leading-none tabular-nums">{fmtTime(left)}</div>
            <div className="t-label mt-2 text-[var(--text-muted)]">{left === 0 ? "انتهى الوقت" : "وقت النقاش"}</div>
          </div>
        </div>
        <button onClick={() => d({ t: "speaker" })} className="mt-6 flex w-full items-center gap-3 rounded-[22px] border border-gold/50 bg-[var(--surface-elevated)] p-4 text-right">
          <span className="t-label-s rounded-full bg-white/10 px-3 py-1">{(s.speakerIdx % living.length) + 1} / {living.length}</span>
          <span className="flex-1"><span className="t-caption block text-gold">المتحدث الآن · اضغط للتالي</span><b className="t-title">{speaker.name}</b></span>
          <Avatar name={speaker.name} ring={ringOf(g, speaker)} size={56} />
        </button>
        <div className="mt-4 flex gap-2">
          {g.players.map((p) => <Avatar key={p.id} name={p.name} ring={ringOf(g, p)} size={36} className={p.alive ? "" : "opacity-30"} />)}
        </div>
        <div className="flex-1" />
        <div className="flex w-full flex-col gap-3 pb-8 pt-4">
          <PrimaryButton onClick={() => d({ t: "stage", stage: "vote" })}>إنهاء النقاش · بدء التصويت</PrimaryButton>
          <SecondaryButton onClick={() => d({ t: "dayAdd", seconds: 30 })}>+ 30 ثانية</SecondaryButton>
        </div>
      </div>
      {menu && <GameMenu onClose={() => setMenu(false)} />}
    </Screen>
  );
}

/* ============================== Vote ================================= */
function Vote() {
  const { s } = useSession();
  const d = useDispatch();
  const g = s.game!;
  const [menu, setMenu] = useState(false);
  const living = livingOrder(g);
  const counts = s.voteCounts;
  const max = Math.max(0, ...living.map((p) => counts[p.id] ?? 0));
  const leaders = living.filter((p) => (counts[p.id] ?? 0) === max && max > 0);
  const unique = leaders.length === 1 ? leaders[0] : null;
  return (
    <Screen glow="#f2c46d">
      <PhaseHeader tone="day" label="التصويت" left={`الجولة ${g.round} · ${living.length} أحياء`} onMenu={() => setMenu(true)} />
      <div className="flex flex-1 flex-col px-6 pt-6">
        <h2 className="t-title text-center">من المشتبه به؟</h2>
        <p className="t-caption mb-6 mt-1 text-center text-[var(--text-muted)]">عدّوا الأيدي ثم اضغطوا + لكل لاعب{g.config.special.mayor ? " · صوت العمدة = 3" : ""}</p>
        <div className="grid grid-cols-2 gap-3">
          {living.map((p) => {
            const n = counts[p.id] ?? 0;
            const lead = unique?.id === p.id;
            return (
              <div key={p.id} className={cx("relative flex flex-col items-center gap-2 rounded-[22px] border p-4", lead ? "border-gold bg-[#f2c46d14] shadow-[0_0_24px_rgba(242,196,109,0.2)]" : "border-white/16 bg-[var(--surface-elevated)]")}>
                {lead && <span className="t-caption absolute -top-3 flex items-center gap-1 rounded-full bg-gradient-to-b from-[#f6d489] to-[#d9993a] px-3 text-[#1b1208]"><Crown size={12} />الأعلى</span>}
                <Avatar name={p.name} ring={ringOf(g, p)} size={56} />
                <b className="t-label-s">{p.name}</b>
                <div className="flex items-center gap-3">
                  <button aria-label={`زيادة صوت ${p.name}`} onClick={() => d({ t: "voteCount", id: p.id, delta: 1 })} className={cx("flex size-8 items-center justify-center rounded-full", lead ? "bg-gold text-black" : "bg-white/10")}><Plus size={14} /></button>
                  <span className={cx("t-heading w-6 text-center tabular-nums", lead && "text-gold")}>{n}</span>
                  <button aria-label={`إنقاص صوت ${p.name}`} onClick={() => d({ t: "voteCount", id: p.id, delta: -1 })} className="flex size-8 items-center justify-center rounded-full bg-white/10"><Minus size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex-1" />
        <div className="pb-8 pt-4">
          <PrimaryButton onClick={() => d({ t: "voteConfirm" })}>{unique ? `تأكيد إخراج ${unique.name}` : max > 0 ? "تعادل · لا أحد يخرج" : "لا أصوات · لا أحد يخرج"}</PrimaryButton>
        </div>
      </div>
      {menu && <GameMenu onClose={() => setMenu(false)} />}
    </Screen>
  );
}

function VoteResult() {
  const { s } = useSession();
  const d = useDispatch();
  const g = s.game!;
  const v = s.vote!;
  const p = v.eliminatedId ? g.players.find((x) => x.id === v.eliminatedId)! : null;
  const votes = p ? v.counts[p.id] : 0;
  const ended = !!g.winner;
  return (
    <Screen glow="#dc2f45">
      <div className="flex flex-1 flex-col items-center px-6 pt-10">
        <Eyebrow tone="red">نتيجة التصويت · اليوم {g.round - (ended ? 0 : 1)}</Eyebrow>
        {p ? (
          <>
            <h2 className="t-heading mt-5 text-[var(--text-muted)]">تم إقصاء</h2>
            <p className="t-display">{p.name}</p>
            <Image src={ROLE_ART[p.role]} alt="" width={260} height={260} className="mt-2 size-[260px] object-contain" />
            <span className="t-label mt-2 rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">كان: {ROLE_NAME_AR[p.role]}</span>
            <p className="t-caption mt-3 text-[var(--text-muted)]">حصل على {votes} أصوات</p>
          </>
        ) : (
          <>
            <h2 className="t-display mt-16">تعادل!</h2>
            <p className="t-body mt-3 text-center text-[var(--text-muted)]">لم يتفق الجميع على لاعب واحد — لا أحد يخرج اليوم.</p>
          </>
        )}
        <div className="flex-1" />
        <div className="w-full pb-8"><PrimaryButton onClick={() => d({ t: "stage", stage: ended ? "ended" : "night" })}>{ended ? "عرض النتيجة" : "ابدأ الليل"}</PrimaryButton></div>
      </div>
    </Screen>
  );
}

const roundsText = (n: number) => (n <= 1 ? "جولة واحدة" : n === 2 ? "جولتين" : n <= 10 ? `${n} جولات` : `${n} جولة`);

/* ============================== Ended ================================ */
function Ended() {
  const { s } = useSession();
  const d = useDispatch();
  const router = useRouter();
  const g = s.game!;
  const mafiaWon = g.winner === "mafia";
  return (
    <Screen glow={mafiaWon ? "#dc2f45" : "#4cc9ff"}>
      <div className="flex flex-1 flex-col items-center px-6 pt-8">
        <p className="t-label text-gold">انتهت اللعبة</p>
        <h2 className="t-display mt-2 text-gold">{mafiaWon ? "فازت المافيا!" : "فاز الصالحون!"}</h2>
        <Image src={ROLE_ART[mafiaWon ? "mafia" : "civilian"]} alt="" width={120} height={120} className="mt-4 size-[120px] object-contain" />
        <p className="t-caption mt-2 text-[var(--text-muted)]">بعد {roundsText(s.roundsPlayed)} · {g.players.length} لاعبين</p>
        <h3 className="t-title mt-4 w-full text-right">كشف الأدوار</h3>
        <div className="mt-3 flex w-full flex-col gap-2 pb-4">
          {g.players.map((p) => (
            <div key={p.id} className="flex h-16 items-center gap-3 rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] px-3">
              <Avatar name={p.name} ring={ringOf(g, p)} size={44} />
              <span className="flex-1 text-right"><b className="t-label block">{p.name}</b><span className="t-caption" style={{ color: TEAM_OF[p.role] === "mafia" ? "var(--faction-mafia)" : "var(--faction-town)" }}>{ROLE_NAME_AR[p.role]}</span></span>
              <span className="t-caption rounded-full bg-white/10 px-3 py-1 text-[var(--text-muted)]">{p.alive ? "حي" : "خرج"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent px-6 pb-8 pt-6">
        <PrimaryButton onClick={() => { d({ t: "reset" }); router.push("/"); }}>العودة للرئيسية</PrimaryButton>
        <SecondaryButton onClick={() => d({ t: "rematch" })}>لعبة جديدة</SecondaryButton>
      </div>
    </Screen>
  );
}

void Skull; void ArrowLeft; void MAX_PLAYERS;
