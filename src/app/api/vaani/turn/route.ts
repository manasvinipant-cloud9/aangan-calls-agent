import { NextResponse } from "next/server";
import { authorised, parseVaani } from "@/lib/vaani";
import { one, query, json, isAfterHours, type CallRow } from "@/lib/db";
import { emptyState, greeting, runTurn } from "@/lib/agent";
import type { CallState } from "@/lib/types";

export const maxDuration = 30;

/** One caller utterance in, one spoken reply out. Vaani speaks `reply` and hangs up if `end_call`. */
async function handle(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const ev = parseVaani(await req.json().catch(() => null));
  if (!ev) return NextResponse.json({ error: "bad payload" }, { status: 400 });

  const now = new Date();
  let call = await one<CallRow>("select * from calls where external_id = $1", [ev.callId]);
  if (!call) {
    const started = ev.startedAt ? new Date(ev.startedAt) : now;
    // ON CONFLICT: two near-simultaneous first turns must not create two rows.
    call = await one<CallRow>(
      `insert into calls (external_id, caller_number, started_at, after_hours, state)
       values ($1, $2, $3, $4, $5::jsonb)
       on conflict (external_id) do update set external_id = excluded.external_id
       returning *`,
      [ev.callId, ev.from, started.toISOString(), isAfterHours(started), json(emptyState())],
    );
  }
  if (!call) return NextResponse.json({ reply: "Sorry, please call again in a moment.", end_call: true }, { status: 500 });
  if (call.finalized_at) return NextResponse.json({ reply: "", end_call: true });

  const history = [...call.transcript];
  const sinceStart = Date.now() - new Date(call.started_at).getTime();
  if (!ev.text.trim()) {
    const g = greeting(now);
    history.push({ role: "agent", text: g, at: now.toISOString() });
    await query("update calls set transcript = $2::jsonb, first_response_ms = coalesce(first_response_ms, $3) where id = $1", [call.id, json(history), sinceStart]);
    return NextResponse.json({ reply: g, end_call: false });
  }

  history.push({ role: "caller", text: ev.text, at: now.toISOString() });
  const prev: CallState = { ...emptyState(), ...(call.state as Partial<CallState>) } as CallState;
  const r = await runTurn(history, prev);
  history.push({ role: "agent", text: r.reply, at: new Date().toISOString() });

  // Running token total lives in state so /end can cost the call without a second table.
  const prevTokens = (call.state as { _tokens?: { input: number; output: number } })._tokens ?? { input: 0, output: 0 };
  await query(
    `update calls set transcript = $2::jsonb, state = $3::jsonb, caller_name = $4, price_asked = $5,
       price_blocked_count = price_blocked_count + $6, first_response_ms = coalesce(first_response_ms, $7)
     where id = $1`,
    [
      call.id,
      json(history),
      json({ ...r.state, _tokens: { input: prevTokens.input + r.tokens.input, output: prevTokens.output + r.tokens.output } }),
      r.state.extracted.name,
      r.state.asked_about_price,
      r.priceBlocked ? 1 : 0,
      sinceStart,
    ],
  );

  return NextResponse.json({ reply: r.reply, end_call: r.endCall });
}

/** Whatever goes wrong, the caller hears a polite line, never a platform error page. */
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("turn failed", err);
    return NextResponse.json({ reply: "Sorry, I didn't catch that. Could you say that once more?", end_call: false });
  }
}
