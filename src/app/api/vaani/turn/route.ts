import { NextResponse } from "next/server";
import { authorised, parseVaani } from "@/lib/vaani";
import { db, isAfterHours, type CallRow } from "@/lib/db";
import { emptyState, greeting, runTurn } from "@/lib/agent";
import type { CallState } from "@/lib/types";

export const maxDuration = 30;

/** One caller utterance in, one spoken reply out. Vaani speaks `reply` and hangs up if `end_call`. */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const ev = parseVaani(await req.json().catch(() => null));
  if (!ev) return NextResponse.json({ error: "bad payload" }, { status: 400 });

  const sb = db();
  const now = new Date();
  let { data: call } = await sb.from("calls").select("*").eq("external_id", ev.callId).maybeSingle<CallRow>();
  if (!call) {
    const started = ev.startedAt ? new Date(ev.startedAt) : now;
    const ins = await sb
      .from("calls")
      .insert({ external_id: ev.callId, caller_number: ev.from, started_at: started.toISOString(), after_hours: isAfterHours(started), state: emptyState() })
      .select()
      .single<CallRow>();
    call = ins.data;
  }
  if (!call) return NextResponse.json({ reply: "Sorry, please call again in a moment.", end_call: true }, { status: 500 });
  if (call.finalized_at) return NextResponse.json({ reply: "", end_call: true });

  const history = [...call.transcript];
  if (!ev.text.trim()) {
    const g = greeting(now);
    history.push({ role: "agent", text: g, at: now.toISOString() });
    await sb.from("calls").update({ transcript: history, first_response_ms: call.first_response_ms ?? Date.now() - new Date(call.started_at).getTime() }).eq("id", call.id);
    return NextResponse.json({ reply: g, end_call: false });
  }

  history.push({ role: "caller", text: ev.text, at: now.toISOString() });
  const prev: CallState = { ...emptyState(), ...(call.state as Partial<CallState>) } as CallState;
  const r = await runTurn(history, prev);
  history.push({ role: "agent", text: r.reply, at: new Date().toISOString() });

  // Running token total lives in state so /end can cost the call without a second table.
  const prevTokens = (call.state as { _tokens?: { input: number; output: number } })._tokens ?? { input: 0, output: 0 };
  await sb
    .from("calls")
    .update({
      transcript: history,
      state: { ...r.state, _tokens: { input: prevTokens.input + r.tokens.input, output: prevTokens.output + r.tokens.output } },
      caller_name: r.state.extracted.name,
      price_asked: r.state.asked_about_price,
      price_blocked_count: call.price_blocked_count + (r.priceBlocked ? 1 : 0),
      first_response_ms: call.first_response_ms ?? Date.now() - new Date(call.started_at).getTime(),
    })
    .eq("id", call.id);

  return NextResponse.json({ reply: r.reply, end_call: r.endCall });
}
