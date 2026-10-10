# Aangan Studio: incoming calls agent

Answers the studio phone line 24/7, asks the intake questions, and hands qualified enquiries to
designers on Telegram with everything already asked. Never quotes a price. Case and decisions: `BRIEF.md`.

```
Caller -> Vaani AI (answers, speaks, listens; follows vaani/agent-prompt.md)
          call ends -> POST /api/vaani/webhook?token=...   (call_started / call_ended / call_postprocessing)
                       -> Gemini reads the transcript and judges the 5 criteria (qualified.md)
                       -> src/lib/qualify.ts decides: qualified / declined / borderline / complaint / missed
                       -> Neon (call log) -> HubSpot (contact, deal if qualified) -> Telegram note
Pages:  /leads?key=...      enquiry desk (designers, front desk, Nikhil): urgency-sorted leads, update status, transcripts
        /dashboard?key=...  performance and cost (Nikhil)
```

## Where the rules live
| Rule | Enforced in |
|---|---|
| Never quote a price | The Vaani agent prompt (`vaani/agent-prompt.md`), plus a post-call audit in `webhook/route.ts` that flags any call where the agent said a price. `pricing.md` is never loaded and is gitignored. |
| Apply qualified.md exactly | Gemini judges each criterion; `src/lib/qualify.ts` owns the outcome (auditable, 14 tests) |
| Complaints go to a human | `intent=complaint` -> `escalated` -> front desk + founder on Telegram |
| Log every call, including declined | every call is a row in `calls`; declined ones just do not ping Telegram |
| Cost visible | `usage` table; rates from env; shown on `/dashboard` |

## Setup from scratch
1. `npm install`
2. Create a Neon Postgres database. Put its connection string in `.env.local` as `DATABASE_URL`, then `npm run migrate`.
3. Copy `.env.example` to `.env.local` and fill it in (Gemini, Telegram, HubSpot, secrets, cost rates).
4. HubSpot (once): `npm run setup:hubspot` (dry run), then `npm run setup:hubspot -- --apply`.
5. Push to GitHub, import into Vercel, add the same environment variables there, deploy.
6. In Vaani: create an agent, paste `vaani/agent-prompt.md` as its system prompt (rebuild it with
   `npm run build:prompt` after changing `knowledge/*.md`), provision a number and attach it, then
   Developers -> Webhooks -> New End Point: `https://<your-vercel-domain>/api/vaani/webhook?token=<VAANI_WEBHOOK_SECRET>`.

## Everyday commands
| Command | What it does |
|---|---|
| `npm test` | unit tests (qualifier, price guardrail, Vaani parsing) |
| `npm run eval` | replays the 20 phone transcripts from the PDF through the agent logic and compares with `evals/expected.json` |
| `BASE_URL=... npm run simulate` | sends 3 fake Vaani calls (qualified, declined, missed) to a running app |
| `npm run cleanup:sim -- --apply` | removes the `sim-*` test calls and their HubSpot test records |
| `npm run build:prompt` | regenerates the Vaani agent prompt from `knowledge/*.md` |

## Known limits and open items
- **The live conversation runs on Vaani's AI,** so the price rule is enforced by the prompt and audited after the call, not filtered mid-call. Vaani's "Bring Your Own LLM" would restore live filtering but needs a WebSocket server (not Vercel).
- **Booking:** no calendar in the stack. The agent records the caller's preferred slot; a designer confirms it.
- **Access:** pages use shared secret links (`?key=`). Upgrade to real logins before a wide rollout.
- **Gemini:** use a paid project in production. The free tier is rate-limited and may use data for training.
- **Cost rates** in `.env` are 0 until filled from the real Vaani and Gemini bills.
- `evals/expected.json` holds expected outcomes; the three `review: true` cases need Nikhil's confirmation.
- Rotate all secrets before real callers (they have appeared in screenshots and chat during setup).
