import { getMetrics, BASELINE } from "@/lib/metrics";
import { BASE_CSS } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aangan Studio: Performance", robots: { index: false, follow: false } };

const CSS = `
nav.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:-6px 0 18px}nav.tabs a{padding:6px 14px;border-radius:99px;border:1px solid var(--line);background:var(--surface);color:var(--ink);text-decoration:none;font-size:14px}nav.tabs a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.range{display:flex;gap:6px;margin:0 0 4px;flex-wrap:wrap}.range a{padding:4px 12px;border-radius:99px;font-size:13px;color:var(--mute);text-decoration:none;border:1px solid transparent}.range a.on{border-color:var(--line);background:var(--surface);color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;box-shadow:var(--shadow);position:relative}
.card::before{content:"";position:absolute;left:0;top:16px;bottom:16px;width:4px;border-radius:0 4px 4px 0;background:var(--c,var(--stone))}
.card small{display:block;color:var(--mute);font-size:11.5px;letter-spacing:.07em;text-transform:uppercase}.card b{display:block;font-family:var(--font-serif),serif;font-weight:500;font-size:34px;line-height:1.15;margin:2px 0}.card em{font-style:normal;color:var(--mute);font-size:13px}
.c-sage{--c:var(--sage)}.c-clay{--c:var(--clay)}.c-gold{--c:var(--gold)}.c-teal{--c:var(--teal)}
.note{background:var(--gold-soft);color:var(--ink);border-radius:12px;padding:12px 16px;margin:0 0 14px;font-size:14px}
.say{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 22px;box-shadow:var(--shadow);font-size:15.5px}.say p{margin:0 0 8px}.say p:last-child{margin:0}.say .good{color:var(--sage);font-weight:600}.say .bad{color:var(--clay);font-weight:600}
.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}
table{width:100%;border-collapse:collapse;font-size:14px;min-width:640px}th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mute);font-weight:500;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase}tr:last-child td{border-bottom:0}
.pill{display:inline-block;padding:2px 10px;border-radius:99px;font:600 11px var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase;background:var(--stone-soft);color:var(--stone)}
.pill.qualified{background:var(--sage-soft);color:var(--sage)}.pill.escalated,.pill.missed,.pill.incomplete{background:var(--clay-soft);color:var(--clay)}.pill.borderline{background:var(--gold-soft);color:var(--gold)}
.n{color:var(--mute);font-size:12.5px}a.link{color:var(--ink)}
@media(max-width:700px){.hero{padding:20px}.hero h1{font-size:25px}}
`;

const inr = (n: number | null) => (n == null ? "n/a" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: n < 100 ? 2 : 0 })}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const hrs = (min: number) => (min >= 120 ? `${Math.round(min / 60)} hours` : `${Math.round(min)} minutes`);

export default async function Performance({ searchParams }: { searchParams: Promise<{ key?: string; days?: string }> }) {
  const { key, days } = await searchParams;
  if (!process.env.DASHBOARD_KEY || key !== process.env.DASHBOARD_KEY) {
    return (
      <main>
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS + CSS }} />
        <div className="empty"><b>This page needs its private link.</b>Open it from the link you were given.</div>
      </main>
    );
  }
  const d = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const m = await getMetrics(d);
  const needsHuman = m.borderline + m.escalated + m.incomplete + m.missed;
  const fast = m.medianMinutesToContact != null && m.medianMinutesToContact <= 60;
  const href = (n: number) => `/dashboard?key=${key}&days=${n}`;

  const headline = m.calls === 0
    ? "No calls yet in this period."
    : `The phone line handled ${m.calls} ${m.calls === 1 ? "call" : "calls"}${m.afterHours ? `, ${m.afterHours} of them after hours` : ""}.`;
  const sub = m.calls === 0
    ? "Once real calls come in, this page shows what the phone agent produced and what it cost."
    : `${m.qualified} ${m.qualified === 1 ? "became a qualified enquiry" : "became qualified enquiries"} handed to designers with everything already asked. ${m.declined} did not fit the studio and ${needsHuman} needed a human.`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS + CSS }} />
      <main>
        <header className="top">
          <div className="brand"><div className="mark">A</div><div><b>Aangan Studio</b><span>Phone line performance</span></div></div>
          <div className="range">
            {[7, 30, 90].map((n) => (<a key={n} className={d === n ? "on" : ""} href={href(n)}>Last {n} days</a>))}
          </div>
        </header>
        <nav className="tabs">
          <a href={`/leads?key=${key}`}>Enquiry desk</a>
          <a className="on" href={href(d)}>Performance</a>
        </nav>

        <section className={`hero ${m.waitingNew ? "alert" : "calm"}`}>
          <h1>{headline}</h1>
          <p>{sub}</p>
          <div className="week">
            <div><b>{m.answered}</b><span>calls answered</span></div>
            <div><b>{m.qualified}</b><span>qualified for designers</span></div>
            <div><b>{m.consultationRequests}</b><span>consultation requests</span></div>
          </div>
        </section>

        <h2>How fast leads get a response</h2>
        <p className="lede">Calls are answered at once, day or night. The number that decides whether a lead becomes a project is how soon a designer follows up.</p>
        <div className="say">
          {m.medianMinutesToContact != null ? (
            <p>Designers reach a new lead after a median of <b className={fast ? "good" : "bad"}>{hrs(m.medianMinutesToContact)}</b>. {fast ? "That is inside the one-hour window where conversion is about four times higher." : "Aim for under an hour: leads answered that quickly convert about four times more often."}</p>
          ) : (
            <p>No designer has followed up on a lead in this period yet.</p>
          )}
          <p>{m.waitingNew ? <><b className="bad">{m.waitingNew}</b> qualified {m.waitingNew === 1 ? "lead is" : "leads are"} still waiting for a first call. </> : "Nobody is waiting for a first call. "}{m.contacted} contacted, {m.booked} consultations booked.</p>
        </div>

        <h2>What the phone line produced</h2>
        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card c-sage"><small>Calls answered</small><b>{m.answered}</b><em>{m.missed} missed, {m.afterHours} after 10am to 7pm</em></div>
          <div className="card c-sage"><small>Qualified</small><b>{m.qualified}</b><em>handed to designers on Telegram</em></div>
          <div className="card c-teal"><small>Consultation requests</small><b>{m.consultationRequests}</b><em>caller named a day and time</em></div>
          <div className="card c-clay"><small>Needed a human</small><b>{needsHuman}</b><em>{plural(m.escalated, "complaint", "complaints")} · {plural(m.borderline, "unclear", "unclear")} · {plural(m.incomplete + m.missed, "callback", "callbacks")}</em></div>
          <div className="card c-gold"><small>Not taken forward</small><b>{m.declined}</b><em>outside the studio's service, logged</em></div>
          <div className="card c-teal"><small>Handoffs sent</small><b>{m.handoffsSent}</b><em>{m.handoffsFailed ? `${m.handoffsFailed} failed, please check` : "none failed"}</em></div>
        </div>

        <h2>What it costs</h2>
        {!m.ratesConfigured && (
          <div className="note" style={{ marginTop: 12 }}>Running costs show as ₹0 because the per-minute and per-token rates are not entered yet. Add them from the Vaani and Gemini bills to see real spend.</div>
        )}
        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card c-gold"><small>Total spend</small><b>{inr(m.cost.total)}</b><em>phone {inr(m.cost.telephony)} · speech {inr(m.cost.speech)} · analysis {inr(m.cost.gemini)}</em></div>
          <div className="card c-gold"><small>Per call</small><b>{inr(m.cost.perCall)}</b><em>average across all calls</em></div>
          <div className="card c-gold"><small>Per qualified enquiry</small><b>{inr(m.cost.perQualified)}</b><em>what each real lead costs</em></div>
          <div className="card c-gold"><small>Per consultation request</small><b>{inr(m.cost.perConsultation)}</b><em>cost of each visit requested</em></div>
        </div>

        <h2>Compared with today</h2>
        <p className="lede">Before the phone agent, about {BASELINE.unansweredPerMonth} enquiries a month went unanswered for 48 hours or more, and each qualified one took about {BASELINE.minutesPerQualified} minutes of front desk and designer time.</p>
        <div className="grid">
          <div className="card c-clay"><small>Before</small><b>~{BASELINE.unansweredPerMonth}</b><em>unanswered enquiries a month</em></div>
          <div className="card c-sage"><small>Now</small><b>{m.missed}</b><em>calls that dropped before connecting</em></div>
          <div className="card c-sage"><small>Staff time saved</small><b>{m.humanMinutesSaved >= 120 ? `${Math.round(m.humanMinutesSaved / 60)} h` : `${m.humanMinutesSaved} min`}</b><em>{BASELINE.minutesPerQualified} min per qualified enquiry</em></div>
        </div>

        <h2>Safeguards</h2>
        <p className="lede">The agent never quotes a price. These two numbers show that holding.</p>
        <div className="grid">
          <div className="card c-teal"><small>Callers who asked for a price</small><b>{m.priceAsked}</b><em>each was told a designer will confirm</em></div>
          <div className={`card ${m.priceBlocked ? "c-clay" : "c-sage"}`}><small>Calls to review</small><b>{m.priceBlocked}</b><em>{m.priceBlocked ? "the agent may have said a price. Open those calls." : "no call where the agent said a price"}</em></div>
        </div>

        <h2>Recent calls</h2>
        <p className="lede"><a className="link" href={`/leads?key=${key}`}>Open the enquiry desk</a> for details, transcripts and follow-up.</p>
        {m.rows.length ? (
          <div className="scroll">
            <table>
              <thead><tr><th>When (IST)</th><th>Caller</th><th>Outcome</th><th>Reason</th></tr></thead>
              <tbody>
                {m.rows.filter((c) => c.status !== "in_progress").slice(0, 12).map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.started_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}{c.after_hours ? " 🌙" : ""}</td>
                    <td>{c.caller_name ?? "Unnamed caller"}<div className="n">{c.caller_number}</div></td>
                    <td><span className={`pill ${c.status}`}>{c.status}</span></td>
                    <td>{c.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><b>No calls yet.</b>They will appear here as they come in.</div>
        )}
        <footer>Aangan Studio · phone line performance · figures read live from the call log</footer>
      </main>
    </>
  );
}
