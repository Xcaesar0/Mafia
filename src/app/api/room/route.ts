import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { act, createRoom, getView, joinRoom, leaveRoom, userFromToken } from "@/lib/rooms/store";
import { RoomError } from "@/lib/rooms/engine";

export const dynamic = "force-dynamic";

const token = (req: NextRequest) => req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null;
const code6 = z.string().regex(/^\d{6}$/);
const cfg = z.object({
  mafiaCount: z.number().int().min(1).max(6),
  special: z.object({ silencer: z.boolean(), doctor: z.boolean(), sniper: z.boolean(), mayor: z.boolean(), goodboy: z.boolean() }),
});
const id = z.string().max(8).nullable().optional();
const action = z.discriminatedUnion("op", [
  z.object({ op: z.literal("config"), config: cfg }),
  z.object({ op: z.literal("start") }),
  z.object({ op: z.literal("ack") }),
  z.object({ op: z.literal("night"), picks: z.object({ kill: id, heal: id, snipe: id, silence: id }) }),
  z.object({ op: z.literal("force") }),
  z.object({ op: z.literal("dayStart") }),
  z.object({ op: z.literal("dayAdd"), seconds: z.number().int() }),
  z.object({ op: z.literal("toVote") }),
  z.object({ op: z.literal("vote"), target: z.string().max(8) }),
  z.object({ op: z.literal("next") }),
]);
const body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create") }),
  z.object({ kind: z.literal("join"), code: code6 }),
  z.object({ kind: z.literal("leave"), code: code6 }),
  z.object({ kind: z.literal("act"), code: code6, action }),
]);

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(req: NextRequest) {
  const user = await userFromToken(token(req));
  if (!user) return err("غير مسجّل", 401);
  const code = code6.safeParse(req.nextUrl.searchParams.get("code"));
  if (!code.success) return err("رمز غير صالح");
  const view = await getView(code.data, user.id);
  return view ? NextResponse.json(view) : err("الغرفة غير موجودة", 404);
}

export async function POST(req: NextRequest) {
  const user = await userFromToken(token(req));
  if (!user) return err("غير مسجّل", 401);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("طلب غير صالح");
  const b = parsed.data;
  try {
    if (b.kind === "create") return NextResponse.json({ code: await createRoom(user) });
    if (b.kind === "join") {
      const r = await joinRoom(b.code, user);
      if (r === "not_found") return err("لا توجد غرفة بهذا الرمز", 404);
      if (r === "started") return err("بدأت اللعبة في هذه الغرفة");
      if (r === "full") return err("الغرفة ممتلئة");
      return NextResponse.json({ code: b.code });
    }
    if (b.kind === "leave") { await leaveRoom(b.code, user.id); return NextResponse.json({ ok: true }); }
    return NextResponse.json(await act(b.code, user.id, b.action as never));
  } catch (e) {
    if (e instanceof RoomError) return err(e.message);
    console.error(e);
    return err("خطأ في الخادم", 500);
  }
}
