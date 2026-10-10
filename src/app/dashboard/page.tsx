import { getMetrics, BASELINE } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aangan Calls Dashboard" };

const inr = (n: number | null) => (n == null ? "n/a" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
const pct = (n: number | null) => (n == null ? "n/a" : `${n.toFixed(0)}%`);

const CSS = `
:root{--bg:#faf8f5;--fg:#1d1b18;--mute:#6b665e;--card:#fff;--line:#e6e1d9;--ok:#1f7a4d;--warn:#a96a00;--bad:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#161514;--fg:#f1ede6;--mute:#a49d92;--card:#201f1d;--line:#34312d;--ok:#5fc48f;--warn:#e0a63a;--bad:#f2766d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1040px;margin:0 auto;padding:24px 16px 64px}h1{font-size:22px;margin:0 0 4px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin:32px 0 10px}
.sub{color:var(--mute);margin:0 0 8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.k{color:var(--mute);font-size:12px}.v{font-size:26px;font-weight:600;margin-top:2px}.n{color:var(--mute);font-size:12px;margin-top:2px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:14px}th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mute);font-weight:500;font-size:12px}
.pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:12px;border:1px solid var(--line)}.qualified{color:var(--ok)}.escalated,.missed,.incomplete{color:var(--bad)}.borderline{color:var(--warn)}
.banner{border:1px solid var(--warn);color:var(--warn);border-radius:10px;padding:10px 12px;margin:14px 0}.scroll{overflow-x:auto}
`;

function Stat({ k, v, n }: { k: string; v: string | number; n?: string }) {
  return (
    <div className="card">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {n && <div className="n">{n}</div>}
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ key?: string; days?: string }> }) {
  const { key, days } = await searchParams;
  if (!process.env.DASHBOARD_KEY || key !== process.env.DASHBOARD_KEY) {
    return <main style={{ padding: 24, fontFamily: "system-ui" }}>Not authorised. Open this page with your dashboard key.</main>;
  }
  const d = Math.min(Math.max(Number(days) || 30, 1), 365);
  const m = await getMetrics(d);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main>
        <h1>Aangan calls agent</h1>
        <p className="sub">Last {d} days · {m.calls} calls · all figures read live from the call log</p>
        {!m.ratesConfigured && (
          <div className="banner">Cost rates are not set yet (TELEPHONY_INR_PER_MIN, SPEECH_INR_PER_MIN, GEMINI_*_USD_PER_M), so costs below show ₹0. Fill them from the Vaani, Gemini and Vercel bills.</div>
        )}

        <h2>What it generates</h2>
        <div className="grid">
          <Stat k="Calls answered" v={m.answered} n={`${m.missed} missed · ${m.afterHours} after 10am-7pm`} />
          <Stat k="Answered under 1 hour" v={pct(m.pctUnder1h)} n={`median first reply ${m.medianFirstResponseSec != null ? m.medianFirstResponseSec.toFixed(1) + "s" : "n/a"}`} />
          <Stat k="Qualified, handed to designers" v={m.qualified} n={`${m.consultationRequests} with a preferred consultation slot`} />
          <Stat k="Designers' response" v={m.medianMinutesToContact != null ? `${Math.round(m.medianMinutesToContact)} min` : "n/a"} n={`median call to first contact · ${m.contacted} contacted · ${m.waitingNew} still waiting · ${m.booked} booked`} />
          <Stat k="Needs a human" v={m.borderline + m.escalated + m.incomplete + m.missed} n={`${m.escalated} complaints · ${m.borderline} borderline · ${m.incomplete + m.missed} callbacks`} />
          <Stat k="Declined (logged)" v={m.declined} n="out of area, advice-only, budget, etc." />
          <Stat k="Telegram handoffs sent" v={m.handoffsSent} n={m.handoffsFailed ? `${m.handoffsFailed} FAILED, check logs` : "none failed"} />
        </div>

        <h2>What it costs</h2>
        <div className="grid">
          <Stat k="Total spend" v={inr(m.cost.total)} n={`telephony ${inr(m.cost.telephony)} · speech ${inr(m.cost.speech)} · model ${inr(m.cost.gemini)}`} />
          <Stat k="Per call" v={inr(m.cost.perCall)} />
          <Stat k="Per qualified enquiry" v={inr(m.cost.perQualified)} />
          <Stat k="Per consultation request" v={inr(m.cost.perConsultation)} />
        </div>

        <h2>Compared with today</h2>
        <div className="grid">
          <Stat k="Before: unanswered per month" v={`~${BASELINE.unansweredPerMonth}`} n="48% got no reply within 48 hours" />
          <Stat k="Now: calls unanswered" v={m.missed} n="only calls that dropped before connecting" />
          <Stat k="Human minutes saved" v={m.humanMinutesSaved} n={`${BASELINE.minutesPerQualified} min per qualified enquiry (10 ask + 2 forward + 20 re-ask)`} />
        </div>

        <h2>Guardrails</h2>
        <div className="grid">
          <Stat k="Callers who asked for a price" v={m.priceAsked} n="all got: a designer will confirm" />
          <Stat k="Replies rewritten by price filter" v={m.priceBlocked} n="should stay near 0; review any non-zero" />
        </div>

        <h2>Call log</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>When (IST)</th><th>Caller</th><th>Status</th><th>Why</th><th>Cost</th></tr></thead>
            <tbody>
              {m.rows.slice(0, 100).map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.started_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}{c.after_hours ? " 🌙" : ""}</td>
                  <td>{c.caller_name ?? "unknown"}<div className="n">{c.caller_number}</div></td>
                  <td><span className={`pill ${c.status}`}>{c.status}</span></td>
                  <td>{c.reason}</td>
                  <td>{c.duration_sec ? `${Math.round(c.duration_sec / 60 * 10) / 10} min` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
