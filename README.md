# Aangan Studio: incoming calls agent

Answers the studio phone line 24/7, asks the intake questions, applies Nikhil's rubric
(`knowledge/qualified.md`), and hands qualified calls to designers on Telegram with the full
context. Never quotes a price. Full case and decisions: `BRIEF.md`.

```
Caller -> Vaani AI -> POST /api/vaani/turn  (each utterance)  -> Gemini -> reply spoken back
                      POST /api/vaani/end   (hang-up/drop/missed) -> Supabase + HubSpot + Telegram
Dashboard: /dashboard?key=DASHBOARD_KEY
```

## Where the rules live
| Rule | Enforced in |
|---|---|
| Never quote a price | system prompt **and** `src/lib/guardrail.ts` rewrites any reply containing a price. `pricing.md` is never loaded; `inputs/pricing.md` is gitignored |
| Apply qualified.md as written | `src/lib/qualify.ts`: Gemini judges the 5 criteria, code decides the outcome |
| Complaints go to a human | `intent=complaint` -> `escalated` -> front desk + founder on Telegram |
| Log every call incl. declined | every call is a row in `calls`; declined ones just don't ping Telegram |
| Cost visible | `usage` table, rates from env, shown on the dashboard |

## Setup
1. `npm install`
2. Create a Supabase project, run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill it in.
4. `npm test`, then `GEMINI_API_KEY=... npm run eval` to replay the 20 phone calls.
5. Push to GitHub, import into Vercel, add the same env vars there.
6. In Vaani, point the turn webhook at `/api/vaani/turn` and the call-ended webhook at
   `/api/vaani/end`, with header `x-webhook-secret`.

## Open items
- **Vaani payload/response format is unconfirmed.** Everything assumed lives in `src/lib/vaani.ts`
  (request parsing) and the two route files (`{reply, end_call}` response).
- **Booking:** there is no calendar in the stack, so the agent records the caller's preferred
  slot and says a designer will confirm. It never promises a slot.
- **Cost rates** in `.env` are 0 until filled from real Vaani / Gemini bills.
- Dashboard auth is a shared `?key=`; upgrade to real login before wider use.
- `evals/expected.json` holds my expected outcomes; the three `review: true` ones need Nikhil.
