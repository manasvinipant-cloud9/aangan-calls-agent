import { NextResponse } from "next/server";
import { authorised, parseVaani } from "@/lib/vaani";
import { db, type CallRow } from "@/lib/db";
import { finalizeCall } from "@/lib/handoff";

export const maxDuration = 60;

/** Call ended (hang-up, drop, or missed). Creates the record if the caller never spoke. */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const ev = parseVaani(await req.json().catch(() => null));
  if (!ev) return NextResponse.json({ error: "bad payload" }, { status: 400 });

  const sb = db();
  const { data: existing } = await sb.from("calls").select("*").eq("external_id", ev.callId).maybeSingle<CallRow>();
  if (!existing) {
    const { isAfterHours } = await import("@/lib/db");
    const started = ev.startedAt ? new Date(ev.startedAt) : new Date();
    await sb.from("calls").insert({ external_id: ev.callId, caller_number: ev.from, started_at: started.toISOString(), after_hours: isAfterHours(started) });
  }
  const tokens = (existing?.state as { _tokens?: { input: number; output: number } } | undefined)?._tokens;
  const res = await finalizeCall(ev.callId, { durationSec: ev.durationSec, tokens });
  return NextResponse.json({ ok: true, ...res });
}
