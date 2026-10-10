# Aangan Studio: Incoming Calls Agent (Project Brief)

Use this file as context. It describes the case, the decisions already made, and the build plan. Treat the "Hard rules" section as non-negotiable.

---

## 1. Case summary

- **Client:** Nikhil Deshpande, founder of Aangan Studio, Pune. Interior design for homes and small offices. 60 people, 14 designers.
- **Problem:** Enquiries come in by phone, WhatsApp and a website form. The front desk is 2 people covering 10am-7pm. Enquiries go unanswered, and when they reach a designer it is a forwarded message with no context, so the designer re-asks questions the front desk already asked.
- **Nikhil's ask (his words):** Every enquiry answered in five minutes, day or night. The ones worth designers' time should reach them with everything already asked. The system should quote standard per-sq-ft pricing.
- **Scope:** **Incoming phone calls only.** WhatsApp and the web form are NOT built; only note how the solution could extend to them.
- **Inputs available:**
  - `enquiries/`: 40 anonymised transcripts across all three channels (filter for phone)
  - `services.md`: what the studio does and doesn't do
  - `pricing.md`: internal guide, marked "indicative only, varies by site"
  - `qualified.md`: Nikhil's own description of which enquiries are worth a designer's time
- **Deliverable also required:** a dashboard showing what the system costs to run and what it generates, so Nikhil never pulls numbers by hand again. A justified choice of handoff channel (Telegram or email). Be ready to justify ownership ("He will ask you why").

### Numbers
- ~200 enquiries/month
- ~48% get no response within 48 hours (~96 a month unanswered)
- Answered in under 1 hour converts at 4x the rate of next-day
- ~33% arrive outside 10am-7pm
- Front desk: 2 people
- Average project value: Rs 8-14 lakh

---

## 2. Journey today

| Step | Who | How long |
|---|---|---|
| 1. Call arrives | - | - |
| 2. Seen, if within hours | Front desk | 0-48 hrs |
| 3. Basic questions asked | Front desk | 10 min |
| 4. Judgment: worth a designer's time? | Front desk | unrecorded |
| 5. Forwarded, minimal context | Front desk | 2 min |
| 6. Designer calls, re-asks questions | Designer | 20 min |
| 7. Consultation booked | Designer | varies |

Outside 10am-7pm, steps 2-7 don't happen until the next working day.
**Where it breaks:** step 2 (nobody there) and step 6 (context lost in the handoff).

---

## 3. The Nine Checks (course framework)

Three groups. **Kill switches:** any No means don't build it. **Sizing:** any No means build something smaller. **Boundary:** any No means put a human exactly here.

| # | Check | Verdict |
|---|---|---|
| 01 | Problem real? | **Yes.** 48% unanswered for 48+ hrs; 4x conversion for sub-hour response; Nikhil's own numbers |
| 02 | Workflow repeated? | **Yes.** ~200 calls a month; first four steps identical every time |
| 03 | Input available? | **Yes/Partly.** `services.md` and `qualified.md` are enough to answer and qualify. `pricing.md` exists but cannot be used for output |
| 04 | Output valuable? | **Yes.** An acknowledgement and a booked slot on a Rs 8-14 lakh project is directly revenue |
| 05 | Impact measurable? | **Yes.** Time to first response, % under one hour, consultations booked; all baselineable on day one |
| 08 | ROI worth it? | **Yes.** ~96 calls a month unanswered; at Rs 8-14 lakh average value a modest lift covers the tool cost many times over |
| 06 | Failure risk OK? | **Yes** for answering and qualifying. **No for pricing:** a quoted price in the studio's voice is heard as a commitment and is unrecoverable |
| 07 | Judgment protected? | **Partly.** Answering and qualifying are assistable. Quoting, committing and handling complaints are human only |
| 09 | Owner clear? | **Yes, once bounded.** Agent qualifies and books; designer owns the relationship; Nikhil owns the price |

### Pushback on Nikhil's request
He asked for per-sq-ft pricing quotes. Check 06 says no: the agent never quotes a price. It says a designer will confirm pricing for the site.

---

## 4. Hard rules for the agent

1. **Never quote a price, range or estimate.** Say a designer will confirm pricing for their site.
2. Never make commitments (timelines, discounts, availability promises beyond the booked slot).
3. Never handle complaints. Escalate to a human.
4. Apply `qualified.md` as written; do not invent its own criteria.
5. If unsure whether a caller qualifies, mark **borderline** and route to a human.
6. Only offer services in `services.md`; politely decline others.
7. Log every call, including declined ones, so decisions can be audited.

---

## 5. Components map

| # | Component | Fixes | Who | Inputs | Output |
|---|---|---|---|---|---|
| 1 | Call answering (24/7 voice agent on the studio number) | Step 2 | Agent | Studio script and tone | Call picked up immediately |
| 2 | Intake questions | Step 3 | Agent | `services.md` | Structured answers: project type, location, scope, timeline, contact |
| 3 | Qualifier | Step 4 | Agent applies, Nikhil defines | `qualified.md`, tested on the transcripts | Qualified / not qualified / borderline, with reason |
| 4 | Pricing guardrail | Nikhil's quote request | Agent declines, human quotes | None (`pricing.md` not used) | Fixed line: a designer will confirm pricing |
| 5 | Booking | Step 7 | Agent | Designer availability | Consultation slot offered and booked |
| 6 | Handoff note | Steps 5-6 | Agent to designer | Components 2, 3, 5 | One structured note: caller, need, answers already given, qualifier reason, slot |
| 7 | Human escalation | Borderline / out-of-bounds | Front desk or designer | Qualifier flag | Callback task with transcript |
| 8 | Log and dashboard | Manual number-pulling | System | Every call record | Cost and output view |

### Where humans sit
- Pricing, commitments, complaints: human only (Nikhil owns the price)
- Borderline qualification: routed to a human
- The relationship and the consultation: the designer
- Weekly log review and keeping `qualified.md` / `services.md` current: one named person on the studio side

### Handoff channel decision: Telegram
- **Why:** a push alert reaches a designer in seconds, which matters because under-one-hour response is the 4x conversion window. Short structured notes read well on a phone and designers can reply directly. Email is checked in batches.
- **Trade-off:** no built-in audit trail and client details sit in a chat. Mitigation: every note is also logged in Supabase; send to individual designers or a restricted group.
- **If email were chosen:** justification would be record-keeping and attachments, at the cost of speed.

### Extension note (not built)
WhatsApp and the web form could feed the same components 2-7. Only the entry point (component 1) changes per channel.

---

## 6. Tech stack

| Tool | Role |
|---|---|
| **Vaani AI** | Voice: answers the phone, speech in/out |
| **Gemini (API)** | Brain: asks intake questions, qualifies, produces the handoff note |
| **Supabase** | Database: calls, handoffs, usage and cost |
| **HubSpot** | CRM: contacts, and deals for qualified calls only |
| **Telegram** | Handoff: designers (and Nikhil) receive the note |
| **GitHub** | Code repository |
| **Vercel** | Hosting/deployment, deployed from the GitHub repo |

### Call flow
Caller dials studio number -> Vaani AI answers -> sends speech/text to the Vercel app -> Gemini decides reply and qualification -> Supabase saves the call -> HubSpot gets the contact (deal if qualified) -> Telegram sends the handoff note.

---

## 7. Build steps

1. **GitHub:** create the repository. Never commit API keys.
2. **Supabase:** create a project and tables:
   - `calls`: caller, timestamp, transcript, qualified status, reason
   - `handoffs`: note sent, channel, timestamp
   - `usage`: call minutes, Gemini tokens, cost per call
3. **Gemini:** get an API key. Write the system instructions: intake questions, `services.md` as scope, `qualified.md` as qualification criteria, and the **never quote a price** rule. Test against the phone transcripts from the 40.
4. **Vaani AI:** point the studio number at Vaani and give it the app's webhook URL so it can pass the call to the app and speak replies. Check Vaani's docs for the exact webhook format (not confirmed here).
5. **Vercel backend:** one endpoint receives each call from Vaani, calls Gemini, then saves to Supabase, HubSpot and Telegram. Push code to GitHub.
6. **HubSpot:** create/update a contact (name, phone, project type, qualifier result). Create a deal only for qualified calls.
7. **Telegram:** create a bot, add it to a designers' group or message individual designers, and send the structured note. Borderline calls go to the front desk as a callback task.
8. **Deploy:** import the GitHub repo into Vercel. Put all keys (Gemini, Vaani, HubSpot, Supabase, Telegram) in Vercel environment variables. Each push redeploys.
9. **Dashboard:** a page on the same app reading Supabase.
10. **Test and hand over:** test calls including after 7pm; check Telegram, HubSpot and dashboard numbers; name the weekly reviewer.

---

## 8. Dashboard spec

- **Cost:** telephony, speech and model cost per call; total monthly cost; cost per qualified enquiry; cost per booked consultation.
- **Output:** calls answered, time to first response, % answered under 1 hour, qualified vs borderline vs declined, consultations booked, handoffs sent.
- **Comparison:** baseline of ~96 unanswered calls a month and 10 + 2 + 20 minutes of human effort per qualified enquiry today.

---

## 9. How to explain it to Nikhil

- Vaani: answers the phone any hour
- Gemini: asks and qualifies, never quotes a price
- Supabase: remembers every call and its cost
- HubSpot: keeps leads organised for designers
- Telegram: puts the full context in the designer's hand in seconds
- GitHub and Vercel: where it's stored and runs, updating automatically

## 10. Open items
- Vaani AI webhook format and pricing: confirm from its docs
- Phone share of the ~200 enquiries: unknown; state the assumption in the ROI estimate
- Running-cost figures for the dashboard: fill in from actual Vaani, Gemini and Vercel usage
