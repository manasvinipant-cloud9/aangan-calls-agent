import { one, query, json, type CallRow } from "./db";
import { decide } from "./qualify";
import { callCost } from "./cost";
import { esc, sendTelegram, type Target } from "./telegram";
import { syncHubspot } from "./hubspot";
import { emptyState } from "./agent";
import type { CallState, CallStatus, Decision } from "./types";

const ist = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

const HEAD: Record<CallStatus, string> = {
  qualified: "✅ Qualified enquiry",
  borderline: "🟡 Needs a human decision",
  escalated: "🚨 COMPLAINT: senior callback needed",
  incomplete: "📞 Call dropped: call back",
  missed: "📞 Missed call: call back",
  declined: "Declined",
  in_progress: "In progress",
};

/** One structured note: caller, need, answers already given, qualifier reason, requested slot. */
export function buildNote(call: CallRow, state: CallState, d: Decision): string {
  const e = state.extracted;
  const line = (k: string, v: string | number | null | undefined) => (v ? `<b>${k}:</b> ${esc(String(v))}\n` : "");
  const c = state.criteria;
  const crit = (["real_project", "in_area", "timeline", "budget", "decision_maker"] as const)
    .map((k) => `${c[k].verdict === "pass" ? "✔" : c[k].verdict === "fail" ? "✘" : "?"} ${k.replace("_", " ")}${c[k].evidence ? ` (${esc(c[k].evidence)})` : ""}`)
    .join("\n");
  return (
    `<b>${HEAD[d.status]}</b>${state.frustrated ? " · ⚠️ caller frustrated, handle with care" : ""}\n\n` +
    line("Name", e.name) +
    line("Phone", call.caller_number) +
    line("Called", `${ist(call.started_at)}${call.after_hours ? " (after hours)" : ""}`) +
    line("Project", [e.project_type !== "unknown" ? e.project_type : null, e.location, e.size_sqft ? `~${e.size_sqft} sq ft` : null].filter(Boolean).join(" · ")) +
    line("Wants", e.scope) +
    line("Timeline", e.timeline) +
    line("Decision-maker", e.decision_note) +
    line("Budget (volunteered)", e.budget_mentioned) +
    line("Consultation", [e.preferred_slot, e.site_visit ? "wants a site visit" : null].filter(Boolean).join(" · ")) +
    (state.asked_about_price ? "<b>Asked about price:</b> told a designer will confirm. No figure given.\n" : "") +
    `\n<b>Qualifier:</b> ${esc(d.reason)}\n${crit}\n` +
    (d.notes.length ? `\n<b>Flags:</b>\n${d.notes.map((n) => "• " + esc(n)).join("\n")}\n` : "") +
    `\nAlready asked on the call, so please don't re-ask. Full transcript is on the dashboard.`
  );
}

const targetFor = (s: CallStatus): Target | null =>
  s === "qualified" ? "designers" : s === "declined" || s === "in_progress" ? null : "front_desk";

/** Finalise once per call: decide, cost, log, hand off. Idempotent via the finalized_at claim. */
export async function finalizeCall(externalId: string, o: { durationSec?: number; tokens?: { input: number; output: number }; priceBlocked?: number } = {}) {
  const call = await one<CallRow>(
    "update calls set finalized_at = now(), ended_at = now() where external_id = $1 and finalized_at is null returning *",
    [externalId],
  );
  if (!call) return { already: true as const };

  const state: CallState = { ...emptyState(), ...(call.state as Partial<CallState>) } as CallState;
  const noTurns = call.transcript.every((t) => t.role === "agent") || call.transcript.length === 0;
  const d: Decision = noTurns
    ? { status: "missed", reason: "Caller hung up before speaking; no details captured.", ask: [], notes: [] }
    : decide(state, { callEnded: true });
  const duration = o.durationSec ?? Math.round((Date.now() - new Date(call.started_at).getTime()) / 1000);

  const tokens = o.tokens ?? { input: 0, output: 0 };
  const cost = callCost(duration, tokens);
  await query(
    `insert into usage (call_id, call_minutes, gemini_input_tokens, gemini_output_tokens, telephony_cost_inr, speech_cost_inr, gemini_cost_inr, total_cost_inr)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (call_id) do update set call_minutes = excluded.call_minutes, gemini_input_tokens = excluded.gemini_input_tokens,
       gemini_output_tokens = excluded.gemini_output_tokens, telephony_cost_inr = excluded.telephony_cost_inr,
       speech_cost_inr = excluded.speech_cost_inr, gemini_cost_inr = excluded.gemini_cost_inr, total_cost_inr = excluded.total_cost_inr`,
    [call.id, cost.minutes, tokens.input, tokens.output, cost.telephony, cost.speech, cost.gemini, cost.total],
  );

  const note = buildNote(call, state, d);
  const target = targetFor(d.status);
  const sends: { target: Target; r: { ok: boolean; error?: string } }[] = [];
  if (target) sends.push({ target, r: await sendTelegram(target, note) });
  if (d.status === "escalated") sends.push({ target: "founder", r: await sendTelegram("founder", note) });
  for (const s of sends)
    await query("insert into handoffs (call_id, channel, target, note, ok, error) values ($1, 'telegram', $2, $3, $4, $5)", [call.id, s.target, note, s.r.ok, s.r.error ?? null]);

  const hs = await syncHubspot({
    phone: call.caller_number,
    name: state.extracted.name,
    qualified: d.status === "qualified",
    dealName: `${state.extracted.name ?? "Phone enquiry"}: ${state.extracted.location ?? "Pune"} ${state.extracted.project_type !== "unknown" ? state.extracted.project_type : ""}`.trim(),
    summary: note.replace(/<[^>]+>/g, ""),
    fields: {
      projectType: state.extracted.project_type !== "unknown" ? state.extracted.project_type : null,
      location: state.extracted.location,
      sizeSqft: state.extracted.size_sqft,
      scope: state.extracted.scope,
      timeline: state.extracted.timeline,
      consultation: [state.extracted.preferred_slot, state.extracted.site_visit ? "wants a site visit" : null].filter(Boolean).join(", "),
      reason: d.reason,
      flags: [...d.notes, state.asked_about_price ? "Asked about price: told a designer will confirm" : "", state.frustrated ? "Caller frustrated" : ""].filter(Boolean).join("; "),
    },
  });
  if (hs.error) console.error("hubspot", hs.error);

  await query(
    `update calls set status = $2, reason = $3, caller_name = $4, duration_sec = $5, price_asked = $6,
       price_blocked_count = $7, hubspot_contact_id = $8, hubspot_deal_id = $9 where id = $1`,
    [call.id, d.status, d.reason, state.extracted.name, duration, state.asked_about_price, o.priceBlocked ?? call.price_blocked_count, hs.contactId ?? null, hs.dealId ?? null],
  );

  return { already: false as const, status: d.status };
}
