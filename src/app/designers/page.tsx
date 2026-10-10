import { query, type CallRow } from "@/lib/db";
import { updateLead } from "./actions";
import type { CallState } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aangan Leads" };

const CSS = `
:root{--bg:#faf8f5;--fg:#1d1b18;--mute:#6b665e;--card:#fff;--line:#e6e1d9;--ok:#1f7a4d;--warn:#a96a00;--bad:#b3261e;--acc:#1d1b18;--accfg:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#161514;--fg:#f1ede6;--mute:#a49d92;--card:#201f1d;--line:#34312d;--ok:#5fc48f;--warn:#e0a63a;--bad:#f2766d;--acc:#f1ede6;--accfg:#161514}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 64px}h1{font-size:22px;margin:0 0 2px}.sub{color:var(--mute);margin:0 0 16px}
nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}nav a{padding:6px 14px;border-radius:99px;border:1px solid var(--line);color:var(--fg);text-decoration:none;font-size:14px}nav a.on{background:var(--acc);color:var(--accfg);border-color:var(--acc)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px}
.top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline}.name{font-size:18px;font-weight:600}
.wait{font-size:13px;color:var(--mute)}.wait.hot{color:var(--bad);font-weight:600}
.tel{display:inline-block;margin:4px 0 10px;font-size:17px;color:var(--fg)}
dl{display:grid;grid-template-columns:110px 1fr;gap:4px 12px;margin:0 0 10px}dt{color:var(--mute);font-size:13px}dd{margin:0}
.flag{border-left:3px solid var(--warn);padding:2px 10px;margin:8px 0;font-size:14px}.pill{font-size:12px;padding:1px 9px;border-radius:99px;border:1px solid var(--line)}
form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;border-top:1px solid var(--line);padding-top:12px}
form .full{grid-column:1/-1}select,input,textarea{font:inherit;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);width:100%}
button{font:inherit;padding:9px 16px;border-radius:8px;border:0;background:var(--acc);color:var(--accfg);cursor:pointer}
details{margin-top:10px;font-size:14px;color:var(--mute)}details p{margin:4px 0}.empty{color:var(--mute);padding:32px 0;text-align:center}
@media(max-width:480px){dl{grid-template-columns:1fr}form{grid-template-columns:1fr}}
`;

const LABEL: Record<CallRow["lead_status"], string> = {
  new: "New", contacted: "Contacted", consultation_booked: "Consultation booked", not_a_fit: "Not a fit",
};

function waiting(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const txt = m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
  return { txt, hot: m >= 60 };
}

export default async function Designers({ searchParams }: { searchParams: Promise<{ key?: string; tab?: string }> }) {
  const { key, tab } = await searchParams;
  if (!process.env.DESIGNER_KEY || key !== process.env.DESIGNER_KEY) {
    return <main style={{ padding: 24, fontFamily: "system-ui" }}>Not authorised. Open this page from your designer link.</main>;
  }
  const t = tab === "callbacks" || tab === "done" ? tab : "open";
  const WHERE: Record<string, string> = {
    open: "status = 'qualified' and lead_status in ('new','contacted') order by started_at asc",
    done: "status = 'qualified' and lead_status in ('consultation_booked','not_a_fit') order by started_at desc",
    callbacks: "status in ('borderline','escalated','incomplete','missed') and lead_status in ('new','contacted') order by started_at desc",
  };
  const rows = await query<CallRow>(`select * from calls where ${WHERE[t]} limit 60`);
  const href = (x: string) => `/designers?key=${key}&tab=${x}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main>
        <h1>Aangan leads</h1>
        <p className="sub">Everything the phone agent already asked is below. Please don&apos;t re-ask it.</p>
        <nav>
          <a className={t === "open" ? "on" : ""} href={href("open")}>Open leads</a>
          <a className={t === "callbacks" ? "on" : ""} href={href("callbacks")}>Needs a callback</a>
          <a className={t === "done" ? "on" : ""} href={href("done")}>Booked / closed</a>
          <a href={`/leads?key=${key}`}>All leads</a>
        </nav>
        {!rows.length && <p className="empty">Nothing here right now.</p>}
        {rows.map((c) => {
          const s = c.state as Partial<CallState>;
          const e = s.extracted;
          const w = waiting(c.started_at);
          const flags = [s.frustrated ? "Caller was frustrated. Handle with care." : "", s.asked_about_price ? "Asked about price. Told a designer will confirm; no figure given." : "", c.status !== "qualified" ? c.reason ?? "" : ""].filter(Boolean);
          return (
            <div className="card" key={c.id}>
              <div className="top">
                <span className="name">{c.caller_name ?? "Unknown caller"}</span>
                <span className={`wait ${c.lead_status === "new" && w.hot ? "hot" : ""}`}>called {w.txt}{c.after_hours ? " · after hours" : ""}</span>
              </div>
              {c.caller_number && <a className="tel" href={`tel:${c.caller_number}`}>{c.caller_number}</a>}
              <span className="pill">{c.status !== "qualified" ? c.status : LABEL[c.lead_status]}</span>
              <dl style={{ marginTop: 10 }}>
                {e?.scope && (<><dt>Wants</dt><dd>{e.scope}</dd></>)}
                <dt>Project</dt><dd>{[e?.project_type !== "unknown" ? e?.project_type : null, e?.location, e?.size_sqft ? `~${e.size_sqft} sq ft` : null].filter(Boolean).join(" · ") || "not captured"}</dd>
                {e?.timeline && (<><dt>Timeline</dt><dd>{e.timeline}</dd></>)}
                {e?.decision_note && (<><dt>Decision-maker</dt><dd>{e.decision_note}</dd></>)}
                {e?.budget_mentioned && (<><dt>Budget said</dt><dd>{e.budget_mentioned}</dd></>)}
                <dt>Consultation</dt><dd>{[e?.preferred_slot, e?.site_visit ? "wants a site visit" : null].filter(Boolean).join(" · ") || "not yet chosen"}</dd>
              </dl>
              {flags.map((f) => (<div className="flag" key={f}>{f}</div>))}
              <details>
                <summary>Full call transcript</summary>
                {c.transcript.map((x, i) => (<p key={i}><b>{x.role === "agent" ? "Agent" : "Caller"}:</b> {x.text}</p>))}
              </details>
              <form action={updateLead} key={`${c.id}-${c.lead_status}`}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="key" value={key} />
                <select name="lead_status" defaultValue={c.lead_status} aria-label="Status">
                  {Object.entries(LABEL).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                </select>
                <input name="who" placeholder="Your name" defaultValue={c.assigned_to ?? ""} aria-label="Your name" />
                <textarea className="full" name="notes" rows={2} placeholder="Notes (optional)" defaultValue={c.designer_notes ?? ""} aria-label="Notes" />
                <div className="full"><button type="submit">Save</button></div>
              </form>
            </div>
          );
        })}
      </main>
    </>
  );
}
