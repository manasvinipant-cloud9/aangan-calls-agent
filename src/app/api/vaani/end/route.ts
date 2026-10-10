import { NextResponse } from "next/server";
import { authorised, parseVaani } from "@/lib/vaani";
import { isAfterHours, one, query, type CallRow } from "@/lib/db";
import { finalizeCall } from "@/lib/handoff";

export const maxDuration = 60;

/** Call ended (hang-up, drop, or missed). Creates the record if the caller never spoke. */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const ev = parseVaani(await req.json().catch(() => null));
  if (!ev) return NextResponse.json({ error: "bad payload" }, { status: 400 });

  const existing = await one<CallRow>("select * from calls where external_id = $1", [ev.callId]);
  if (!existing) {
    const started = ev.startedAt ? new Date(ev.startedAt) : new Date();
    await query(
      "insert into calls (external_id, caller_number, started_at, after_hours) values ($1, $2, $3, $4) on conflict (external_id) do nothing",
      [ev.callId, ev.from, started.toISOString(), isAfterHours(started)],
    );
  }
  const tokens = (existing?.state as { _tokens?: { input: number; output: number } } | undefined)?._tokens;
  const res = await finalizeCall(ev.callId, { durationSec: ev.durationSec, tokens });
  return NextResponse.json({ ok: true, ...res });
}
