import { query, type CallRow } from "@/lib/db";
import type { CallState } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aangan: All leads", robots: { index: false, follow: false } };

const CSS = `
:root{--bg:#faf8f5;--fg:#1d1b18;--mute:#6b665e;--card:#fff;--line:#e6e1d9;--ok:#1f7a4d;--warn:#a96a00;--bad:#b3261e;--acc:#1d1b18;--accfg:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#161514;--fg:#f1ede6;--mute:#a49d92;--card:#201f1d;--line:#34312d;--ok:#5fc48f;--warn:#e0a63a;--bad:#f2766d;--acc:#f1ede6;--accfg:#161514}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1180px;margin:0 auto;padding:20px 16px 64px}h1{font-size:22px;margin:0 0 2px}.sub{color:var(--mute);margin:0 0 14px}
nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}nav a{padding:6px 14px;border-radius:99px;border:1px solid var(--line);color:var(--fg);text-decoration:none;font-size:14px}nav a.on{background:var(--acc);color:var(--accfg);border-color:var(--acc)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;text-decoration:none;color:var(--fg);display:block}.kpi .k{color:var(--mute);font-size:12px}.kpi .v{font-size:26px;font-weight:600;line-height:1.2}.kpi.on{outline:2px solid var(--acc)}.kpi.hot .v{color:var(--bad)}
form.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}form.filters input,form.filters select{font:inherit;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--fg)}form.filters input{flex:1;min-width:200px}
form.filters button{font:inherit;padding:8px 16px;border-radius:8px;border:0;background:var(--acc);color:var(--accfg);cursor:pointer}
.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:14px;min-width:820px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mute);font-weight:500;font-size:12px;background:var(--bg)}tr:last-child td{border-bottom:0}
.n{color:var(--mute);font-size:12px}.pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:12px;border:1px solid var(--line);white-space:nowrap}
.qualified{color:var(--ok)}.declined{color:var(--mute)}.escalated,.missed,.incomplete{color:var(--bad)}.borderline{color:var(--warn)}
.hot{color:var(--bad);font-weight:600}a.tel{color:var(--fg)}
@media(max-width:700px){table{min-width:0}thead{display:none}tr{display:block;padding:10px 0;border-bottom:1px solid var(--line)}tr:last-child{border-bottom:0}td{display:block;border:0;padding:3px 14px}td::before{content:attr(data-l);display:block;color:var(--mute);font-size:11px;text-transform:uppercase;letter-spacing:.04em}}
details summary{cursor:pointer;color:var(--mute);font-size:13px}details p{margin:4px 0;font-size:13px}.empty{color:var(--mute);padding:40px 0;text-align:center}
`;

const SINCE: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, all: null };
const GROUPS: Record<string, { label: string; sql: string }> = {
  all: { label: "All calls", sql: "true" },
  qualified: { label: "Qualified", sql: "status = 'qualified'" },
  callbacks: { label: "Needs a callback", sql: "status in ('borderline','escalated','incomplete','missed')" },
  declined: { label: "Declined", sql: "status = 'declined'" },
  booked: { label: "Booked", sql: "lead_status = 'consultation_booked'" },
};
const FOLLOW: Record<CallRow["lead_status"], string> = { new: "New", contacted: "Contacted", consultation_booked: "Booked", not_a_fit: "Not a fit" };

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return { txt: m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`, mins: m };
}

export default async function Leads({ searchParams }: { searchParams: Promise<{ key?: string; s?: string; days?: string; q?: string }> }) {
  const { key, s, days, q } = await searchParams;
  const ok = !!key && (key === process.env.DESIGNER_KEY || key === process.env.DASHBOARD_KEY);
  if (!ok) return <main style={{ padding: 24, fontFamily: "system-ui" }}>Not authorised. Open this page from your link.</main>;

  const group = GROUPS[s ?? ""] ? (s as string) : "all";
  const range = days && days in SINCE ? days : "30";
  const since = SINCE[range] === null ? "1970-01-01" : new Date(Date.now() - SINCE[range]! * 864e5).toISOString();
  const search = (q ?? "").trim().slice(0, 80);

  const counts = (
    await query<Record<string, number>>(
      `select count(*)::int total,
        count(*) filter (where status = 'qualified')::int qualified,
        count(*) filter (where status in ('borderline','escalated','incomplete','missed'))::int callbacks,
        count(*) filter (where status = 'declined')::int declined,
        count(*) filter (where lead_status = 'consultation_booked')::int booked,
        count(*) filter (where status = 'qualified' and lead_status = 'new' and started_at < now() - interval '1 hour')::int waiting
       from calls where started_at >= $1`,
      [since],
    )
  )[0];

  const params: unknown[] = [since];
  let where = `started_at >= $1 and ${GROUPS[group].sql} and status <> 'in_progress'`;
  if (search) {
    params.push(`%${search}%`);
    where += ` and (caller_name ilike $2 or caller_number ilike $2 or state->'extracted'->>'location' ilike $2 or reason ilike $2)`;
  }
  const rows = await query<CallRow>(`select * from calls where ${where} order by started_at desc limit 300`, params);

  const href = (over: Record<string, string>) => `/leads?${new URLSearchParams({ key: key!, s: group, days: range, ...(search ? { q: search } : {}), ...over })}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main>
        <h1>All leads</h1>
        <p className="sub">Every call the phone agent has handled, newest first. Last {range === "all" ? "all time" : `${range} days`}.</p>
        <nav>
          <a href={`/designers?key=${key}`}>Open leads (work queue)</a>
          <a className="on" href={href({})}>All leads</a>
        </nav>

        <div className="kpis">
          {(["all", "qualified", "callbacks", "declined", "booked"] as const).map((g) => (
            <a key={g} className={`kpi ${group === g ? "on" : ""}`} href={href({ s: g })}>
              <div className="k">{GROUPS[g].label}</div>
              <div className="v">{g === "all" ? counts.total : counts[g]}</div>
            </a>
          ))}
          <div className={`kpi ${counts.waiting ? "hot" : ""}`}>
            <div className="k">Waiting over 1 hour</div>
            <div className="v">{counts.waiting}</div>
          </div>
        </div>

        <form className="filters" action="/leads">
          <input type="hidden" name="key" value={key} />
          <input name="q" defaultValue={search} placeholder="Search name, phone, area or reason" aria-label="Search" />
          <select name="s" defaultValue={group} aria-label="Group">
            {Object.entries(GROUPS).map(([v, g]) => (<option key={v} value={v}>{g.label}</option>))}
          </select>
          <select name="days" defaultValue={range} aria-label="Date range">
            <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option>
          </select>
          <button type="submit">Apply</button>
        </form>

        {!rows.length ? (
          <p className="empty">No calls match.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr><th>When (IST)</th><th>Caller</th><th>Project</th><th>Agent decision</th><th>Follow-up</th><th>Details</th></tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const st = c.state as Partial<CallState>;
                  const e = st.extracted;
                  const w = ago(c.started_at);
                  const waiting = c.status === "qualified" && c.lead_status === "new";
                  return (
                    <tr key={c.id}>
                      <td data-l="When (IST)">
                        {new Date(c.started_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                        {c.after_hours ? " 🌙" : ""}
                        <div className={`n ${waiting && w.mins >= 60 ? "hot" : ""}`}>{w.txt} ago{c.duration_sec ? ` · ${Math.max(1, Math.round(c.duration_sec / 60))} min call` : ""}</div>
                      </td>
                      <td data-l="Caller">
                        {c.caller_name ?? "Unknown"}
                        {c.caller_number && (<div className="n"><a className="tel" href={`tel:${c.caller_number}`}>{c.caller_number}</a></div>)}
                      </td>
                      <td data-l="Project">
                        {[e?.project_type && e.project_type !== "unknown" ? e.project_type : null, e?.location, e?.size_sqft ? `~${e.size_sqft} sq ft` : null].filter(Boolean).join(" · ") || "n/a"}
                        {e?.scope && <div className="n">{e.scope}</div>}
                        {e?.timeline && <div className="n">Timeline: {e.timeline}</div>}
                      </td>
                      <td data-l="Agent decision">
                        <span className={`pill ${c.status}`}>{c.status}</span>
                        {c.price_asked && <div className="n">asked about price</div>}
                        {c.price_blocked_count > 0 && <div className="n hot">agent may have said a price</div>}
                      </td>
                      <td data-l="Follow-up">
                        {c.status === "qualified" || c.lead_status !== "new" ? <span className="pill">{FOLLOW[c.lead_status]}</span> : <span className="n">n/a</span>}
                        {c.assigned_to && <div className="n">{c.assigned_to}</div>}
                        {c.contacted_at && <div className="n">contacted {new Date(c.contacted_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}</div>}
                      </td>
                      <td data-l="Details">
                        <details>
                          <summary>Why and transcript</summary>
                          {c.reason && <p><b>Why:</b> {c.reason}</p>}
                          {e?.preferred_slot && <p><b>Consultation:</b> {e.preferred_slot}{e.site_visit ? " · site visit" : ""}</p>}
                          {c.designer_notes && <p><b>Designer notes:</b> {c.designer_notes}</p>}
                          {c.transcript.map((x, i) => (<p key={i}><b>{x.role === "agent" ? "Agent" : "Caller"}:</b> {x.text}</p>))}
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
