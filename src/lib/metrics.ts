import { query, type CallRow } from "./db";
import { ratesConfigured } from "./cost";

type UsageRow = { call_id: string; call_minutes: number; total_cost_inr: number; telephony_cost_inr: number; speech_cost_inr: number; gemini_cost_inr: number };

// Baseline from the brief: today's manual process.
export const BASELINE = { unansweredPerMonth: 96, minutesPerQualified: 10 + 2 + 20 };

export async function getMetrics(days: number) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rows = await query<CallRow>("select * from calls where started_at >= $1 order by started_at desc", [since]);
  const ids = rows.map((c) => c.id);
  const usage = ids.length ? await query<UsageRow>("select * from usage where call_id = any($1::uuid[])", [ids]) : [];
  const handoffs = ids.length ? await query<{ call_id: string; target: string; ok: boolean }>("select call_id, target, ok from handoffs where call_id = any($1::uuid[])", [ids]) : [];

  const count = (s: string) => rows.filter((c) => c.status === s).length;
  const answered = rows.filter((c) => c.status !== "missed");
  const total = usage.reduce((a, x) => a + Number(x.total_cost_inr), 0);
  const sum = (k: keyof UsageRow) => usage.reduce((a, x) => a + Number(x[k]), 0);
  const qualified = count("qualified");
  const withSlot = rows.filter((c) => c.status === "qualified" && (c.state as { extracted?: { preferred_slot?: string } }).extracted?.preferred_slot).length;
  const latencies = answered.map((c) => c.first_response_ms).filter((x): x is number => x != null).sort((a, b) => a - b);
  const under1h = answered.filter((c) => c.first_response_ms != null && c.first_response_ms < 36e5).length;

  return {
    rows,
    ratesConfigured: ratesConfigured(),
    calls: rows.length,
    answered: answered.length,
    missed: count("missed"),
    afterHours: rows.filter((c) => c.after_hours).length,
    medianFirstResponseSec: latencies.length ? latencies[Math.floor(latencies.length / 2)] / 1000 : null,
    pctUnder1h: answered.length ? (under1h / answered.length) * 100 : null,
    qualified,
    borderline: count("borderline"),
    declined: count("declined"),
    escalated: count("escalated"),
    incomplete: count("incomplete"),
    consultationRequests: withSlot,
    handoffsSent: handoffs.filter((x) => x.ok).length,
    handoffsFailed: handoffs.filter((x) => !x.ok).length,
    priceAsked: rows.filter((c) => c.price_asked).length,
    priceBlocked: rows.reduce((a, c) => a + c.price_blocked_count, 0),
    cost: {
      total,
      telephony: sum("telephony_cost_inr"),
      speech: sum("speech_cost_inr"),
      gemini: sum("gemini_cost_inr"),
      perCall: rows.length ? total / rows.length : null,
      perQualified: qualified ? total / qualified : null,
      perConsultation: withSlot ? total / withSlot : null,
    },
    contacted: rows.filter((c) => c.status === "qualified" && c.contacted_at).length,
    waitingNew: rows.filter((c) => c.status === "qualified" && c.lead_status === "new").length,
    booked: rows.filter((c) => c.lead_status === "consultation_booked").length,
    medianMinutesToContact: (() => {
      const x = rows.filter((c) => c.status === "qualified" && c.contacted_at).map((c) => (new Date(c.contacted_at!).getTime() - new Date(c.started_at).getTime()) / 60000).sort((a, b) => a - b);
      return x.length ? x[Math.floor(x.length / 2)] : null;
    })(),
    humanMinutesSaved: qualified * BASELINE.minutesPerQualified,
  };
}
