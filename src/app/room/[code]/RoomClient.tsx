"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar, PrimaryButton, Screen, SecondaryButton, TopBar, cx } from "@/components/ui";
import { Check, Crown, Eye, EyeOff, Lock, Moon, Sun, Users } from "@/components/icons";
import { ConfigPanel, configError } from "@/components/config-panel";
import { Eyebrow, HoldPill, PeekBar, TargetRow } from "@/app/play/parts";
import { useAuth } from "@/lib/auth";
import { api, useRoom } from "@/lib/rooms/client";
import { fmtTime, useCountdown } from "@/lib/session";
import { ROLE_NAME_AR, TEAM_OF, type Role } from "@/lib/game";
import type { PlayerView, PubPlayer, TaskKind } from "@/lib/rooms/engine";

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
const TASK_TEXT: Record<TaskKind | "decoy", string> = {
  kill: "اختر من تقتله الليلة",
  silence: "اختر من يُسكَت غداً",
  heal: "اختر من تنقذه الليلة",
  snipe: "رصاصة واحدة — اختر هدفك أو لا أحد",
  decoy: "اختيارك بلا تأثير — للتمويه فقط",
};

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { ready, user } = useAuth();
  const { view, error, setError, missing, send } = useRoom(code, ready && !!user);

  useEffect(() => { if (ready && !user) router.replace(`/login?next=/room/${code}`); }, [ready, user, router, code]);

  if (missing) return <Message text="هذه الغرفة غير موجودة أو لست عضواً فيها." action={() => router.push("/room")} label="رجوع" />;
  if (!view) return <Message text="جارٍ الاتصال بالغرفة…" />;

  const { pub } = view;
  const props = { view, send, error, setError, code };
  switch (pub.phase) {
    case "lobby": return <Lobby {...props} />;
    case "reveal": return <RevealRole {...props} />;
    case "night": return <Night {...props} />;
    case "morning": return <Morning {...props} />;
    case "day": return <Day {...props} />;
    case "vote": return <Vote {...props} />;
    case "voteResult": return <VoteResult {...props} />;
    case "ended": return <Ended {...props} />;
  }
}

type P = { view: PlayerView; send: (a: import("@/lib/rooms/engine").Action) => Promise<boolean>; error: string | null; setError: (e: string | null) => void; code: string };

function Message({ text, action, label }: { text: string; action?: () => void; label?: string }) {
  return (
    <Screen><div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"><p className="t-body text-[var(--text-muted)]">{text}</p>{action && <PrimaryButton onClick={action} full={false}>{label}</PrimaryButton>}</div></Screen>
  );
}

const nameOf = (pub: PlayerView["pub"], id: string) => pub.players.find((p) => p.id === id)?.name ?? "";
const ringOf = (pub: PlayerView["pub"], id: string) => pub.players.find((p) => p.id === id)?.ring ?? "#f2c46d";

function Waiting({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10"><div className="h-full gold-gradient transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      <p className="t-caption text-[var(--text-muted)]">{label} · {done} / {total}</p>
    </div>
  );
}

function Err({ error }: { error: string | null }) { return error ? <p role="alert" className="t-caption text-center text-[var(--error)]">{error}</p> : null; }

/* ============================ Lobby ============================ */
function Lobby({ view, send, error, code }: P) {
  const router = useRouter();
  const n = view.lobby.length;
  const host = !!view.me?.isHost;
  const cfgErr = configError(n, view.pub.config);
  const [copied, setCopied] = useState(false);
  const leave = async () => { await api("POST", { kind: "leave", code }); router.push("/"); };
  return (
    <Screen>
      <TopBar title="غرفة اللعب" onBack={leave} />
      <div className="flex flex-1 flex-col px-6 pt-4 pb-8">
        <div className="rounded-[28px] border border-gold/60 bg-gradient-to-b from-[#33240d] to-[var(--surface)] p-5 text-center">
          <p className="t-caption text-[var(--text-muted)]">رمز الغرفة — شاركه مع أصدقائك</p>
          <p className="mt-1 text-[44px] font-extrabold tracking-[0.25em] text-gold" dir="ltr" aria-label={`رمز الغرفة ${code}`}>{code}</p>
          <button onClick={() => { navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => {}); }} className="t-caption rounded-full bg-white/10 px-4 py-1">{copied ? "تم النسخ" : "نسخ الرمز"}</button>
        </div>
        <h3 className="t-title mt-6 flex items-center justify-end gap-2 text-right">اللاعبون <span className="t-caption rounded-full bg-white/10 px-2 py-[2px]">{n}</span><Users size={18} /></h3>
        <div className="mt-3 flex flex-col gap-2">
          {view.lobby.map((p) => (
            <div key={p.userId} className="flex h-14 items-center gap-3 rounded-[18px] border border-white/16 bg-[var(--surface-elevated)] px-3">
              <Avatar name={p.name} ring={p.ring} size={38} />
              <b className="t-label flex-1 text-right">{p.name}</b>
              {p.userId === view.hostId && <span className="t-caption flex items-center gap-1 text-gold"><Crown size={14} />المضيف</span>}
            </div>
          ))}
        </div>
        <h3 className="t-title mt-6 text-right">الأدوار</h3>
        <div className="mt-3"><ConfigPanel n={n} config={view.pub.config} readOnly={!host} onChange={(c) => send({ op: "config", config: c })} /></div>
        <div className="mt-6 flex flex-col gap-3">
          <Err error={error} />
          {host ? (
            <>
              {cfgErr && <p className="t-caption text-center text-[var(--text-muted)]">{cfgErr}</p>}
              <PrimaryButton disabled={!!cfgErr} onClick={() => send({ op: "start" })}>ابدأ اللعبة</PrimaryButton>
            </>
          ) : <p className="t-body text-center text-[var(--text-muted)]">بانتظار المضيف ليبدأ اللعبة…</p>}
        </div>
      </div>
    </Screen>
  );
}

/* ============================ Reveal ============================ */
function RevealRole({ view, send }: P) {
  const { pub, me } = view;
  const [pressed, setPressed] = useState(false);
  const [seen, setSeen] = useState(false);
  if (!me?.role) return <Message text="جارٍ التحميل…" />;
  const role = me.role;
  const lines = [
    `دورك: ${ROLE_NAME_AR[role]}`,
    `الفريق: ${TEAM_OF[role] === "mafia" ? "المافيا" : "الصالحون"}`,
    TEAM_OF[role] === "mafia" ? (me.mates.length ? `زملاؤك: ${me.mates.map((m) => nameOf(pub, m)).join("، ")}` : "أنت وحدك في المافيا") : ROLE_HINT[role],
  ];
  return (
    <Screen glow="#f2c46d">
      <div className="flex flex-1 flex-col px-6 pt-8">
        <p className="t-caption text-center text-[var(--text-muted)]">كشف الأدوار · اضغط مطولاً لترى دورك</p>
        <div className="relative mx-auto mt-6 flex h-[372px] w-[280px] items-center justify-center overflow-hidden rounded-[22px] border-[3px] border-gold bg-gradient-to-b from-[#16130b] to-[#0a0a0a]">
          <Image src="/art/sunburst.svg" alt="" width={520} height={520} className="absolute max-w-none opacity-60" />
          <span aria-hidden className="absolute inset-3 rounded-[14px] border border-gold/40" />
          {pressed ? (
            <div className="relative flex flex-col items-center gap-5 px-6 text-center">
              <Image src={ROLE_ART[role]} alt="" width={110} height={110} className="size-[110px] object-contain" />
              {lines.map((l, i) => <p key={i} className="t-label">{l}</p>)}
            </div>
          ) : <Image src="/art/logo.webp" alt="" width={140} height={146} className="relative opacity-90" />}
          <span className="t-label-s absolute bottom-6 flex items-center gap-2 rounded-full border border-gold/50 bg-black/60 px-4 py-1 text-[var(--text-muted)]">
            {pressed ? <><Eye size={14} className="text-gold" /><span className="text-gold">ظاهر الآن</span></> : <><Lock size={14} />مخفي</>}
          </span>
        </div>
        <div className="flex-1" />
        {me.acked ? <Waiting done={pub.ackCount} total={pub.needed} label="بانتظار باقي اللاعبين" /> : seen && !pressed && (
          <div className="px-0 pb-3"><PrimaryButton onClick={() => send({ op: "ack" })}>جاهز — ابدأ الليل</PrimaryButton></div>
        )}
      </div>
      {!me.acked && <HoldPill onChange={(v) => { setPressed(v); if (v) setSeen(true); }} hint="اترك الزر لإخفاء الدور" />}
    </Screen>
  );
}

/* ============================ Night ============================ */
function Night({ view, send, error, setError }: P) {
  const { pub, me } = view;
  const [ti, setTi] = useState(0);
  const [picks, setPicks] = useState<Record<string, string | null>>({});
  const [sel, setSel] = useState<string | null | undefined>(undefined);
  const tasks: (TaskKind | "decoy")[] = me?.tasks.length ? me.tasks : ["decoy"];
  const living = pub.players.filter((p) => p.alive && p.id !== me?.id);

  if (!me || !me.alive) return <Spectate view={view} label="الليل — المافيا تتحرك…" />;
  if (me.submitted) return (
    <Screen glow="#4c6bd6"><div className="flex flex-1 flex-col items-center justify-center px-6"><Moon size={36} /><p className="t-title mt-4">تم تسجيل اختيارك</p><Waiting done={pub.submitted} total={pub.needed} label="بانتظار باقي اللاعبين" />
      {me.isHost && <SecondaryButton full={false} onClick={() => send({ op: "force" })}>تخطّي المتأخرين</SecondaryButton>}</div></Screen>
  );

  const task = tasks[Math.min(ti, tasks.length - 1)];
  const confirm = async () => {
    if (sel === undefined) return;
    if (task === "decoy") return void (await send({ op: "night", picks: {} }));
    const next = { ...picks, [task]: sel };
    if (ti + 1 < tasks.length) { setPicks(next); setTi(ti + 1); setSel(undefined); setError(null); return; }
    const ok = await send({ op: "night", picks: next });
    if (!ok) { setTi(0); setPicks({}); setSel(undefined); }
  };
  // teammates are valid targets only for non-kill tasks (heal/snipe/silence rules decided server side)
  const targets = task === "kill" ? living.filter((p) => !me.mates.includes(p.id)) : task === "heal" ? pub.players.filter((p) => p.alive) : living;
  return (
    <Screen glow="#4c6bd6">
      <div className="flex items-center justify-between px-6 pt-4">
        <span className="t-caption text-[var(--text-muted)]">الجولة {pub.round}</span>
        <span className="t-label flex items-center gap-2 rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">الليل <Moon size={16} /></span>
      </div>
      <div className="flex flex-1 flex-col px-6 pt-6">
        <h2 className="t-title text-center">اختر الآن!</h2>
        <p className="t-caption mb-4 text-center text-[var(--text-muted)]">اضغط على اسم لاعب</p>
        <div className="flex flex-col gap-2">
          {targets.map((o) => <TargetRow key={o.id} name={o.name} status="حي" ring={o.ring} selected={sel === o.id} onClick={() => { setSel(o.id); setError(null); }} />)}
          {task !== "kill" && <TargetRow name="لا أحد" glyph="—" status="تخطي هذه الليلة" ring="#777" selected={sel === null} onClick={() => { setSel(null); setError(null); }} />}
        </div>
        <Err error={error} />
        <div className="flex-1" />
        <div className="flex flex-col gap-3 pb-8 pt-4">
          <PeekBar text={TASK_TEXT[task] + (tasks.length > 1 ? ` (${ti + 1}/${tasks.length})` : "")} />
          <PrimaryButton disabled={sel === undefined} onClick={confirm}>تأكيد الاختيار</PrimaryButton>
        </div>
      </div>
    </Screen>
  );
}

function Spectate({ view, label }: { view: PlayerView; label: string }) {
  const { pub, me } = view;
  return (
    <Screen><div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      {me && !me.alive && <span className="t-label rounded-full bg-white/10 px-4 py-2">خرجت من اللعبة — أنت تشاهد</span>}
      <p className="t-title">{label}</p>
      <Waiting done={pub.submitted} total={pub.needed} label="التقدم" />
    </div></Screen>
  );
}

/* ============================ Morning ============================ */
function newsLines(pub: PlayerView["pub"]) {
  const out: string[] = [];
  for (const e of pub.events) {
    if (e.type === "killed") out.push(`قُتل ${nameOf(pub, e.id)} · كان ${ROLE_NAME_AR[pub.deadRoles[e.id]] ?? ""}`);
    else if (e.type === "saved") out.push(`حاولت المافيا قتل ${nameOf(pub, e.id)} لكنه أُنقذ!`);
    else if (e.type === "shield_held") out.push(`نجا ${nameOf(pub, e.id)} من هجوم الليلة`);
    else if (e.type === "silenced") out.push(`${nameOf(pub, e.id)} ممنوع من الكلام اليوم`);
    else if (e.type === "no_death") out.push("ليلة هادئة · لم يمت أحد");
  }
  return out;
}

function Morning({ view, send, error }: P) {
  const { pub, me } = view;
  const lines = useMemo(() => newsLines(pub), [pub]);
  return (
    <Screen glow="#f2c46d">
      <div className="flex flex-1 flex-col items-center px-6 pt-12">
        <Eyebrow>صباح اليوم {pub.round - 1 || 1}</Eyebrow>
        <h2 className="t-heading mt-4"><Sun size={28} className="inline" /> أخبار الليلة</h2>
        <div className="mt-6 flex w-full flex-col gap-3">
          {lines.map((l, i) => <p key={i} className="t-label rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] p-4 text-center">{l}</p>)}
        </div>
        <div className="flex-1" />
        <Err error={error} />
        <div className="w-full pb-8 pt-4">
          {me?.isHost ? <PrimaryButton onClick={() => send({ op: "dayStart" })}>ابدأ النقاش</PrimaryButton> : <p className="t-body text-center text-[var(--text-muted)]">بانتظار المضيف لبدء النقاش…</p>}
        </div>
      </div>
    </Screen>
  );
}

/* ============================ Day ============================ */
function Roster({ players }: { players: PubPlayer[] }) {
  return <div className="mt-4 flex flex-wrap justify-center gap-2">{players.map((p) => <Avatar key={p.id} name={p.name} ring={p.ring} size={36} className={p.alive ? "" : "opacity-30"} />)}</div>;
}

function Day({ view, send, error }: P) {
  const { pub, me } = view;
  const left = useCountdown(pub.dayEndsAt);
  const total = Math.max(pub.daySeconds, left);
  const R = 112, C = 2 * Math.PI * R;
  const frac = total ? left / total : 0;
  const silenced = pub.silencedId ? nameOf(pub, pub.silencedId) : null;
  const mine = me && pub.silencedId === me.id;
  return (
    <Screen glow="#f2c46d">
      <div className="flex flex-col items-center px-6 pt-6">
        <p className="t-label-s rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">اليوم {pub.round} · {pub.players.filter((p) => p.alive).length} أحياء</p>
        {silenced && <p className="t-caption mt-2 text-[var(--text-muted)]">{mine ? "أنت ممنوع من الكلام اليوم" : `${silenced} ممنوع من الكلام اليوم`}</p>}
        <div className="relative mt-6 flex size-[240px] items-center justify-center">
          <svg viewBox="0 0 240 240" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="120" cy="120" r={R} fill="#0a0a0a" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx="120" cy="120" r={R} fill="none" stroke="#f2c46d" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
          </svg>
          <div className="relative text-center"><div className="text-[56px] font-extrabold leading-none tabular-nums">{fmtTime(left)}</div><div className="t-label mt-2 text-[var(--text-muted)]">{left === 0 ? "انتهى الوقت" : "وقت النقاش"}</div></div>
        </div>
        <Roster players={pub.players} />
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-3 px-6 pb-8 pt-4">
        <Err error={error} />
        {me?.isHost ? (
          <>
            <PrimaryButton onClick={() => send({ op: "toVote" })}>إنهاء النقاش · بدء التصويت</PrimaryButton>
            <SecondaryButton onClick={() => send({ op: "dayAdd", seconds: 30 })}>+ 30 ثانية</SecondaryButton>
          </>
        ) : <p className="t-body text-center text-[var(--text-muted)]">المضيف يتحكم بنهاية النقاش</p>}
      </div>
    </Screen>
  );
}

/* ============================ Vote ============================ */
function Vote({ view, send, error, setError }: P) {
  const { pub, me } = view;
  const [sel, setSel] = useState<string | null>(null);
  if (!me || !me.alive) return <Spectate view={view} label="التصويت جارٍ…" />;
  if (me.voted) return (
    <Screen glow="#f2c46d"><div className="flex flex-1 flex-col items-center justify-center px-6"><Check size={36} /><p className="t-title mt-4">تم تسجيل صوتك</p><Waiting done={pub.submitted} total={pub.needed} label="بانتظار الباقين" />
      {me.isHost && <SecondaryButton full={false} onClick={() => send({ op: "force" })}>إنهاء التصويت الآن</SecondaryButton>}</div></Screen>
  );
  const living = pub.players.filter((p) => p.alive && p.id !== me.id);
  return (
    <Screen glow="#f2c46d">
      <div className="flex flex-1 flex-col px-6 pt-8">
        <h2 className="t-title text-center">من المشتبه به؟</h2>
        <p className="t-caption mb-5 mt-1 text-center text-[var(--text-muted)]">صوتك سرّي{pub.config.special.mayor ? " · صوت العمدة = 3" : ""}</p>
        <div className="flex flex-col gap-2">
          {living.map((p) => <TargetRow key={p.id} name={p.name} status="حي" ring={p.ring} selected={sel === p.id} onClick={() => { setSel(p.id); setError(null); }} />)}
        </div>
        <Err error={error} />
        <div className="flex-1" />
        <div className="pb-8 pt-4"><PrimaryButton disabled={!sel} onClick={() => sel && send({ op: "vote", target: sel })}>تأكيد الصوت</PrimaryButton></div>
      </div>
    </Screen>
  );
}

function VoteResult({ view, send }: P) {
  const { pub, me } = view;
  const v = pub.vote;
  const out = v?.eliminatedId ?? null;
  return (
    <Screen glow="#dc2f45">
      <div className="flex flex-1 flex-col items-center px-6 pt-10">
        <Eyebrow tone="red">نتيجة التصويت</Eyebrow>
        {out ? (
          <>
            <h2 className="t-heading mt-5 text-[var(--text-muted)]">تم إقصاء</h2>
            <p className="t-display">{nameOf(pub, out)}</p>
            <Image src={ROLE_ART[pub.deadRoles[out]]} alt="" width={240} height={240} className="mt-2 size-[240px] object-contain" />
            <span className="t-label mt-2 rounded-full border border-white/16 bg-white/[0.06] px-4 py-2">كان: {ROLE_NAME_AR[pub.deadRoles[out]]}</span>
          </>
        ) : (<><h2 className="t-display mt-16">تعادل!</h2><p className="t-body mt-3 text-center text-[var(--text-muted)]">لم يتفق الجميع على لاعب واحد — لا أحد يخرج اليوم.</p></>)}
        <div className="flex-1" />
        <div className="w-full pb-8">{me?.isHost ? <PrimaryButton onClick={() => send({ op: "next" })}>ابدأ الليل</PrimaryButton> : <p className="t-body text-center text-[var(--text-muted)]">بانتظار المضيف…</p>}</div>
      </div>
    </Screen>
  );
}

/* ============================ Ended ============================ */
function Ended({ view }: P) {
  const router = useRouter();
  const { refresh } = useAuth();
  const { pub, me } = view;
  const mafiaWon = pub.winner === "mafia";
  useEffect(() => { const t = setTimeout(refresh, 1500); return () => clearTimeout(t); }, [refresh]);
  const iWon = me?.team ? me.team === pub.winner : false;
  return (
    <Screen glow={mafiaWon ? "#dc2f45" : "#4cc9ff"}>
      <div className="flex flex-1 flex-col items-center px-6 pt-8">
        <p className="t-label text-gold">انتهت اللعبة</p>
        <h2 className="t-display mt-2 text-gold">{mafiaWon ? "فازت المافيا!" : "فاز الصالحون!"}</h2>
        <p className={cx("t-label mt-2 rounded-full px-4 py-1", iWon ? "bg-gold text-black" : "bg-white/10")}>{iWon ? "فزت! تم احتساب خبرتك" : "حظاً أوفر في المرة القادمة"}</p>
        <h3 className="t-title mt-5 w-full text-right">كشف الأدوار</h3>
        <div className="mt-3 flex w-full flex-col gap-2 pb-4">
          {pub.players.map((p) => {
            const role = pub.allRoles?.[p.id];
            return (
              <div key={p.id} className="flex h-16 items-center gap-3 rounded-[22px] border border-white/16 bg-[var(--surface-elevated)] px-3">
                <Avatar name={p.name} ring={p.ring} size={44} />
                <span className="flex-1 text-right"><b className="t-label block">{p.name}</b>{role && <span className="t-caption" style={{ color: TEAM_OF[role] === "mafia" ? "var(--faction-mafia)" : "var(--faction-town)" }}>{ROLE_NAME_AR[role]}</span>}</span>
                <span className="t-caption rounded-full bg-white/10 px-3 py-1 text-[var(--text-muted)]">{p.alive ? "حي" : "خرج"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="sticky bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent px-6 pb-8 pt-6">
        <PrimaryButton onClick={() => router.push("/account")}>حسابي ومستواي</PrimaryButton>
        <SecondaryButton onClick={() => router.push("/")}>العودة للرئيسية</SecondaryButton>
      </div>
    </Screen>
  );
}

void EyeOff;
