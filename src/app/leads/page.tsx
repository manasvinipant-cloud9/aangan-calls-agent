import { query, type CallRow } from "@/lib/db";
import type { CallState } from "@/lib/types";
import { updateLead } from "../designers/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aangan Studio: Enquiry desk", robots: { index: false, follow: false } };

const CSS = `
:root{--bg:#f6f2eb;--surface:#fffdf9;--ink:#2b2622;--mute:#7b7268;--line:#e8e0d4;--clay:#b5573a;--clay-soft:#f6e4dc;--sage:#58775c;--sage-soft:#e3eee4;--gold:#a97c2c;--gold-soft:#f6ecd6;--stone:#8b857b;--stone-soft:#eeeae3;--teal:#2d6a6a;--teal-soft:#dcecec;--shadow:0 1px 2px rgba(60,40,20,.05),0 6px 20px rgba(60,40,20,.05)}
@media (prefers-color-scheme:dark){:root{--bg:#171513;--surface:#211e1b;--ink:#f1ece4;--mute:#a39b90;--line:#38332d;--clay:#e08a6c;--clay-soft:#3a2620;--sage:#8fb494;--sage-soft:#22302a;--gold:#d9ae5c;--gold-soft:#352c19;--stone:#b0a99d;--stone-soft:#2b2824;--teal:#7fc0c0;--teal-soft:#1f3434;--shadow:0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.25)}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 var(--font-sans),system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1040px;margin:0 auto;padding:28px 18px 72px}
.serif{font-family:var(--font-serif),Georgia,serif}
header.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:22px}
.brand{display:flex;align-items:center;gap:12px}.mark{width:38px;height:38px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-family:var(--font-serif),serif;font-size:19px}
.brand b{display:block;font-family:var(--font-serif),serif;font-size:20px;font-weight:600;line-height:1.1}.brand span{color:var(--mute);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase}
.today{color:var(--mute);font-size:13px}
.hero{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:26px 28px;box-shadow:var(--shadow);margin-bottom:18px}
.hero h1{font-family:var(--font-serif),serif;font-weight:500;font-size:30px;line-height:1.2;margin:0 0 6px;letter-spacing:-.01em}
.hero p{margin:0;color:var(--mute);max-width:62ch}
.hero.alert{border-left:5px solid var(--clay)}.hero.calm{border-left:5px solid var(--sage)}
.week{display:flex;gap:28px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.week div b{font-family:var(--font-serif),serif;font-size:26px;font-weight:500;display:block;line-height:1.1}.week div span{font-size:12.5px;color:var(--mute)}
.pipeline{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:26px}
.step{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;text-decoration:none;color:var(--ink);position:relative;box-shadow:var(--shadow)}
.step small{color:var(--mute);font-size:11.5px;letter-spacing:.07em;text-transform:uppercase}.step b{font-family:var(--font-serif),serif;font-size:30px;font-weight:500;display:block;line-height:1.15}.step em{font-style:normal;color:var(--mute);font-size:12.5px}
.step.on{outline:2px solid var(--ink)}.step::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--c)}
.s1{--c:var(--clay)}.s2{--c:var(--gold)}.s3{--c:var(--sage)}.s4{--c:var(--stone)}
h2{font-family:var(--font-serif),serif;font-weight:500;font-size:21px;margin:30px 0 4px}.lede{color:var(--mute);margin:0 0 14px;font-size:14px}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.toolbar input,.toolbar select{font:inherit;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}.toolbar input{flex:1;min-width:200px}
.toolbar button{font:inherit;padding:9px 18px;border-radius:10px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.chip{padding:6px 13px;border-radius:99px;border:1px solid var(--line);background:var(--surface);color:var(--ink);text-decoration:none;font-size:13.5px}.chip.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}.chip i{font-style:normal;opacity:.6;margin-left:5px}
.lead{background:var(--surface);border:1px solid var(--line);border-radius:16px;margin-bottom:12px;box-shadow:var(--shadow);overflow:hidden;position:relative}
.lead::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--tone)}
.t-attn{--tone:var(--clay)}.t-prog{--tone:var(--gold)}.t-ok{--tone:var(--sage)}.t-flat{--tone:var(--stone)}
.row{display:flex;justify-content:space-between;gap:16px;padding:18px 20px 14px 24px;flex-wrap:wrap}
.who{flex:1 1 360px;min-width:0}.who h3{margin:0;font-family:var(--font-serif),serif;font-weight:600;font-size:19px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.badge{font:600 11px var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:99px;background:var(--tone-soft);color:var(--tone)}
.t-attn .badge{--tone-soft:var(--clay-soft)}.t-prog .badge{--tone-soft:var(--gold-soft)}.t-ok .badge{--tone-soft:var(--sage-soft)}.t-flat .badge{--tone-soft:var(--stone-soft)}
.summary{margin:4px 0 8px;color:var(--ink)}.facts{display:flex;gap:6px;flex-wrap:wrap}.fact{font-size:12.5px;padding:3px 10px;border-radius:8px;background:var(--stone-soft);color:var(--ink)}.fact.slot{background:var(--teal-soft);color:var(--teal)}.fact.warn{background:var(--clay-soft);color:var(--clay)}
.next{margin:10px 0 0;font-size:14px}.next b{font-weight:600}
.side{flex:0 0 auto;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px}.time{font-size:12.5px;color:var(--mute)}.time.hot{color:var(--clay);font-weight:600}
.btn{display:inline-block;padding:9px 18px;border-radius:10px;background:var(--ink);color:var(--bg);text-decoration:none;font-size:14px;font-weight:500}
details.more{border-top:1px solid var(--line)}details.more summary{cursor:pointer;padding:11px 24px;color:var(--mute);font-size:13.5px;list-style:none}details.more summary::-webkit-details-marker{display:none}details.more summary::after{content:" ▾"}details.more[open] summary::after{content:" ▴"}
.panel{padding:4px 24px 20px;display:grid;grid-template-columns:1fr 1fr;gap:22px}.panel h4{margin:0 0 8px;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--mute);font-weight:600}
.panel .ts p{margin:0 0 6px;font-size:13.5px}.panel .ts p b{color:var(--mute);font-weight:600}.why{font-size:14px;margin:0 0 12px}
form.upd{display:grid;gap:8px}form.upd select,form.upd input,form.upd textarea{font:inherit;padding:9px 11px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);width:100%}form.upd button{font:inherit;padding:10px 16px;border-radius:10px;border:0;background:var(--clay);color:#fff;cursor:pointer;font-weight:500}
.empty{background:var(--surface);border:1px dashed var(--line);border-radius:16px;padding:42px 20px;text-align:center;color:var(--mute)}.empty b{display:block;font-family:var(--font-serif),serif;font-size:19px;color:var(--ink);margin-bottom:4px;font-weight:500}
footer{margin-top:34px;color:var(--mute);font-size:12.5px;text-align:center}
@media(max-width:760px){.pipeline{grid-template-columns:repeat(2,1fr)}.panel{grid-template-columns:1fr}.side{align-items:flex-start;text-align:left;flex-direction:row;align-items:center;gap:12px}.hero{padding:20px}.hero h1{font-size:25px}}
`;

type Group = { label: string; sql: string };
const GROUPS: Record<string, Group> = {
  all: { label: "All enquiries", sql: "true" },
  new: { label: "Needs a first response", sql: "status = 'qualified' and lead_status = 'new'" },
  contacted: { label: "In conversation", sql: "status = 'qualified' and lead_status = 'contacted'" },
  booked: { label: "Consultation booked", sql: "lead_status = 'consultation_booked'" },
  callbacks: { label: "Callbacks for the front desk", sql: "status in ('borderline','escalated','incomplete','missed') and lead_status in ('new','contacted')" },
  declined: { label: "Not taken forward", sql: "(status = 'declined' or lead_status = 'not_a_fit')" },
};
const RANGE: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, all: null };
const CALLBACK_STATUSES = ["borderline", "escalated", "incomplete", "missed"];

const PRIORITY = `(case when status = 'qualified' and lead_status = 'new' then 0
  when status in ('borderline','escalated','incomplete','missed') and lead_status = 'new' then 1
  when lead_status = 'contacted' then 2 when lead_status = 'consultation_booked' then 3 else 4 end)`;
const ORDER: Record<string, string> = {
  priority: `order by prio, case when prio < 2 then extract(epoch from started_at) else -extract(epoch from started_at) end`,
  newest: `order by started_at desc`,
  oldest: `order by started_at asc`,
};

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const txt = m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
  return { txt, mins: m };
}
const dur = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);
const kind = (t?: string) => (t === "commercial" ? "Office / commercial" : t === "residential" ? "Home" : null);

function describe(c: CallRow) {
  const callback = CALLBACK_STATUSES.includes(c.status);
  const st = c.state as Partial<CallState>;
  const e = st.extracted;
  if (c.lead_status === "consultation_booked") return { tone: "t-ok", badge: "Consultation booked", next: "Consultation is booked. Nothing more to do until the visit." };
  if (c.lead_status === "not_a_fit") return { tone: "t-flat", badge: "Not a fit", next: "Closed as not a fit." };
  if (c.status === "declined") return { tone: "t-flat", badge: "Not taken forward", next: `${c.reason ?? "Outside what the studio takes on."} The caller was told politely.` };
  if (c.status === "escalated") return { tone: "t-attn", badge: "Complaint", next: "A complaint. A senior person should call this person back first. Do not discuss pricing or timelines." };
  if (c.status === "missed") return { tone: "t-attn", badge: "Missed call", next: "Nobody spoke before the call ended. Call the number back." };
  if (c.status === "incomplete") return { tone: "t-attn", badge: "Call dropped", next: "The call dropped before details were taken. Call back and start the enquiry." };
  if (c.status === "borderline") return { tone: "t-attn", badge: "Needs a human decision", next: `One thing was not clear on the call (${c.reason ?? "see transcript"}). Call to decide whether it fits.` };
  if (c.lead_status === "contacted") return { tone: "t-prog", badge: "In conversation", next: c.assigned_to ? `${c.assigned_to} is on this one. Confirm the consultation slot.` : "Contacted. Confirm the consultation slot." };
  const who = c.caller_name ? `Call ${c.caller_name}` : "Call this person";
  const slot = e?.preferred_slot ? ` They asked for ${e.preferred_slot}${e.site_visit ? " with a site visit" : ""}.` : " Offer a consultation time.";
  return { tone: "t-attn", badge: callback ? "Callback" : "Needs a first response", next: `${who} to confirm the consultation.${slot}` };
}

export default async function Desk({ searchParams }: { searchParams: Promise<{ key?: string; s?: string; days?: string; q?: string; o?: string }> }) {
  const { key, s, days, q, o } = await searchParams;
  const ok = !!key && (key === process.env.DESIGNER_KEY || key === process.env.DASHBOARD_KEY);
  if (!ok) return <main><div className="empty"><b>This page needs its private link.</b>Open it from the link you were given. <style dangerouslySetInnerHTML={{ __html: CSS }} /></div></main>;

  const group = GROUPS[s ?? ""] ? (s as string) : "all";
  const range = days && days in RANGE ? days : "30";
  const sort = ORDER[o ?? ""] ? (o as string) : "priority";
  const since = RANGE[range] === null ? "1970-01-01" : new Date(Date.now() - RANGE[range]! * 864e5).toISOString();
  const search = (q ?? "").trim().slice(0, 80);

  const c = (
    await query<Record<string, number>>(
      `select count(*) filter (where status = 'qualified' and lead_status = 'new')::int waiting,
        count(*) filter (where status = 'qualified' and lead_status = 'contacted')::int contacted,
        count(*) filter (where lead_status = 'consultation_booked')::int booked,
        count(*) filter (where status in ('borderline','escalated','incomplete','missed') and lead_status in ('new','contacted'))::int callbacks,
        count(*) filter (where status = 'declined' or lead_status = 'not_a_fit')::int declined,
        count(*)::int total,
        count(*) filter (where status = 'qualified' and lead_status = 'new' and started_at < now() - interval '1 hour')::int overdue,
        coalesce(max(extract(epoch from now() - started_at) / 60) filter (where status = 'qualified' and lead_status = 'new'), 0)::int oldest,
        count(*) filter (where started_at >= now() - interval '7 days')::int w_total,
        count(*) filter (where started_at >= now() - interval '7 days' and status = 'qualified')::int w_qual,
        count(*) filter (where lead_status = 'consultation_booked' and started_at >= now() - interval '7 days')::int w_book
       from calls where status <> 'in_progress'`,
    )
  )[0];

  const params: unknown[] = [since];
  let where = `started_at >= $1 and status <> 'in_progress' and ${GROUPS[group].sql}`;
  if (search) {
    params.push(`%${search}%`);
    where += ` and (caller_name ilike $2 or caller_number ilike $2 or state->'extracted'->>'location' ilike $2 or reason ilike $2)`;
  }
  const rows = await query<CallRow>(`select * from (select calls.*, ${PRIORITY} as prio from calls where ${where}) t ${ORDER[sort]} limit 200`, params);

  const href = (over: Record<string, string>) =>
    `/leads?${new URLSearchParams({ key: key!, s: group, days: range, o: sort, ...(search ? { q: search } : {}), ...over })}`;

  const alert = c.waiting + c.callbacks;
  const headline = alert
    ? `${alert} ${alert === 1 ? "enquiry needs" : "enquiries need"} a response.`
    : "You're all caught up.";
  const sub = alert
    ? [c.waiting ? `${c.waiting} qualified ${c.waiting === 1 ? "lead is" : "leads are"} waiting for a first call${c.oldest ? `, the oldest for ${dur(c.oldest)}` : ""}.` : "", c.callbacks ? `${c.callbacks} ${c.callbacks === 1 ? "call needs" : "calls need"} a callback from the front desk.` : "", c.overdue ? "Leads answered within the hour are far more likely to become projects." : ""].filter(Boolean).join(" ")
    : "Every qualified enquiry has had a first response. New calls will appear here the moment they come in.";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main>
        <header className="top">
          <div className="brand">
            <div className="mark">A</div>
            <div><b>Aangan Studio</b><span>Enquiry desk</span></div>
          </div>
          <div className="today">{new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" })}</div>
        </header>

        <section className={`hero ${alert ? "alert" : "calm"}`}>
          <h1>{headline}</h1>
          <p>{sub}</p>
          <div className="week">
            <div><b>{c.w_total}</b><span>enquiries this week</span></div>
            <div><b>{c.w_qual}</b><span>qualified</span></div>
            <div><b>{c.w_book}</b><span>consultations booked</span></div>
          </div>
        </section>

        <nav className="pipeline" aria-label="Pipeline">
          <a className={`step s1 ${group === "new" ? "on" : ""}`} href={href({ s: "new" })}><small>1 · New</small><b>{c.waiting}</b><em>waiting for a first call</em></a>
          <a className={`step s2 ${group === "contacted" ? "on" : ""}`} href={href({ s: "contacted" })}><small>2 · In conversation</small><b>{c.contacted}</b><em>contacted, slot not fixed</em></a>
          <a className={`step s3 ${group === "booked" ? "on" : ""}`} href={href({ s: "booked" })}><small>3 · Booked</small><b>{c.booked}</b><em>consultation booked</em></a>
          <a className={`step s4 ${group === "declined" ? "on" : ""}`} href={href({ s: "declined" })}><small>Not taken forward</small><b>{c.declined}</b><em>declined or not a fit</em></a>
        </nav>

        <h2>Enquiries</h2>
        <p className="lede">{sort === "priority" ? "Most urgent first: leads waiting longest, then callbacks, then everything else." : sort === "newest" ? "Newest first." : "Oldest first."}</p>

        <div className="chips">
          {(["all", "new", "contacted", "booked", "callbacks", "declined"] as const).map((g) => (
            <a key={g} className={`chip ${group === g ? "on" : ""}`} href={href({ s: g })}>
              {GROUPS[g].label}
              {g === "callbacks" && c.callbacks ? <i>{c.callbacks}</i> : null}
              {g === "all" ? <i>{c.total}</i> : null}
            </a>
          ))}
        </div>

        <form className="toolbar" action="/leads">
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="s" value={group} />
          <input name="q" defaultValue={search} placeholder="Search by name, phone, area or reason" aria-label="Search" />
          <select name="o" defaultValue={sort} aria-label="Sort">
            <option value="priority">Sort: most urgent</option><option value="newest">Sort: newest</option><option value="oldest">Sort: oldest</option>
          </select>
          <select name="days" defaultValue={range} aria-label="Date range">
            <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option>
          </select>
          <button type="submit">Apply</button>
        </form>

        {!rows.length ? (
          <div className="empty"><b>{search || group !== "all" ? "Nothing matches these filters." : "No enquiries yet."}</b>{search || group !== "all" ? "Try a different search or choose All enquiries." : "When the first call comes in, it will show up here with everything already asked."}</div>
        ) : (
          rows.map((r) => {
            const st = r.state as Partial<CallState>;
            const e = st.extracted;
            const d = describe(r);
            const w = ago(r.started_at);
            const hot = d.tone === "t-attn" && w.mins >= 60;
            const place = [kind(e?.project_type), e?.location].filter(Boolean).join(" in ");
            return (
              <article className={`lead ${d.tone}`} key={r.id}>
                <div className="row">
                  <div className="who">
                    <h3>{r.caller_name ?? "Unnamed caller"}<span className="badge">{d.badge}</span></h3>
                    <p className="summary">{[place || null, e?.size_sqft ? `about ${e.size_sqft} sq ft` : null].filter(Boolean).join(", ") || "Details not captured"}{e?.scope ? `. ${e.scope}.` : ""}</p>
                    <div className="facts">
                      {e?.timeline && <span className="fact">Needs it by: {e.timeline}</span>}
                      {e?.preferred_slot && <span className="fact slot">Wants: {e.preferred_slot}{e.site_visit ? " · site visit" : ""}</span>}
                      {e?.decision_note && <span className="fact">{e.decision_note}</span>}
                      {r.price_asked && <span className="fact">Asked about price</span>}
                      {r.price_blocked_count > 0 && <span className="fact warn">Agent may have quoted a price. Please review.</span>}
                      {st.frustrated && <span className="fact warn">Caller was frustrated</span>}
                      {r.after_hours && <span className="fact">Called after hours</span>}
                    </div>
                    <p className="next"><b>Next:</b> {d.next}</p>
                  </div>
                  <div className="side">
                    {r.caller_number && <a className="btn" href={`tel:${r.caller_number}`}>Call {r.caller_number}</a>}
                    <span className={`time ${hot ? "hot" : ""}`}>{hot ? `Waiting ${dur(w.mins)}` : w.txt}</span>
                  </div>
                </div>
                <details className="more">
                  <summary>Update status, notes and call transcript</summary>
                  <div className="panel">
                    <div>
                      <h4>Update this lead</h4>
                      {r.reason && <p className="why"><b>Why the agent decided this:</b> {r.reason}</p>}
                      <form className="upd" action={updateLead} key={r.id + r.lead_status}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="key" value={key} />
                        <select name="lead_status" defaultValue={r.lead_status} aria-label="Status">
                          <option value="new">New: not yet contacted</option>
                          <option value="contacted">Contacted</option>
                          <option value="consultation_booked">Consultation booked</option>
                          <option value="not_a_fit">Not a fit</option>
                        </select>
                        <input name="who" placeholder="Your name" defaultValue={r.assigned_to ?? ""} aria-label="Your name" />
                        <textarea name="notes" rows={3} placeholder="Notes for the team" defaultValue={r.designer_notes ?? ""} aria-label="Notes" />
                        <button type="submit">Save update</button>
                      </form>
                    </div>
                    <div className="ts">
                      <h4>What was said on the call</h4>
                      {r.transcript.length ? r.transcript.map((x, i) => (<p key={i}><b>{x.role === "agent" ? "Studio" : "Caller"}:</b> {x.text}</p>)) : <p>No conversation was recorded.</p>}
                    </div>
                  </div>
                </details>
              </article>
            );
          })
        )}
        <footer>Aangan Studio · enquiries from the phone line · times in IST</footer>
      </main>
    </>
  );
}
