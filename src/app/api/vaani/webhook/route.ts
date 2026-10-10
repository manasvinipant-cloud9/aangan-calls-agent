import { NextResponse } from "next/server";
import { authorised, parseVaaniWebhook } from "@/lib/vaani";
import { isAfterHours, one, query, json } from "@/lib/db";
import { analyzeTranscript } from "@/lib/agent";
import { finalizeCall } from "@/lib/handoff";
import { containsPrice } from "@/lib/guardrail";
import { sendTelegram } from "@/lib/telegram";

export const maxDuration = 60;

/**
 * One endpoint for all Vaani events (register it in Vaani > Developers > Webhooks with ?token=...).
 *  call_started        -> create the call row
 *  call_ended          -> very short call = missed; otherwise wait for the transcript
 *  call_postprocessing -> transcript arrives: analyse, decide, log, hand off
 */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const ev = parseVaaniWebhook(await req.json().catch(() => null));
  if (!ev) return NextResponse.json({ error: "bad payload" }, { status: 400 });

  try {
    const started = new Date();
    await query(
      `insert into calls (external_id, caller_number, started_at, after_hours) values ($1, $2, $3, $4)
       on conflict (external_id) do update set caller_number = coalesce(calls.caller_number, excluded.caller_number)`,
      [ev.callId, ev.from, started.toISOString(), isAfterHours(started)],
    );

    if (ev.kind === "started" || ev.kind === "other") return NextResponse.json({ ok: true });

    if (ev.kind === "ended") {
      // Nobody spoke: no transcript will come, so close it out as a missed call now.
      if ((ev.durationSec ?? 0) < 8) return NextResponse.json({ ok: true, ...(await finalizeCall(ev.callId, { durationSec: ev.durationSec })) });
      return NextResponse.json({ ok: true, waiting: "call_postprocessing" });
    }

    // call_postprocessing: the finished transcript
    const turns = ev.transcript ?? [];
    const row = await one<{ id: string }>("select id from calls where external_id = $1", [ev.callId]);
    const analysis = turns.some((t) => t.role === "caller") ? await analyzeTranscript(turns) : null;
    // The live AI is Vaani's, so audit what it said: any price in the agent's own words is a rule breach.
    const slips = turns.filter((t) => t.role === "agent" && containsPrice(t.text)).length;
    await query(
      `update calls set transcript = $2::jsonb, state = $3::jsonb, caller_name = $4, price_asked = $5,
         price_blocked_count = $6, first_response_ms = coalesce(first_response_ms, 0) where id = $1`,
      [row!.id, json(turns), json({ ...(analysis?.state ?? {}), _tokens: analysis?.tokens ?? { input: 0, output: 0 } }), analysis?.state.extracted.name ?? null, analysis?.state.asked_about_price ?? false, slips],
    );
    const res = await finalizeCall(ev.callId, { durationSec: ev.durationSec, tokens: analysis?.tokens, priceBlocked: slips });
    if (slips) await sendTelegram("founder", `⚠️ <b>Review needed:</b> the phone agent may have said a price on call ${ev.callId} (${slips} line${slips > 1 ? "s" : ""}). Open the dashboard and read the transcript.`);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error("vaani webhook failed", ev.event, err);
    return NextResponse.json({ error: "failed" }, { status: 500 }); // non-2xx so Vaani can retry
  }
}
