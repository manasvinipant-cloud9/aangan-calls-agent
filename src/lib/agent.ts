import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { knowledge } from "./knowledge";
import { guardReply, PRICING_LINE } from "./guardrail";
import { decide, emptyCriteria } from "./qualify";
import {
  TurnOutputSchema,
  type CallState,
  type CriterionKey,
  type Decision,
  type Extracted,
  type Turn,
  type TurnOutput,
} from "./types";

/** Primary model first; if it is out of quota (429), overloaded (503) or retired (404) we fall through the list. */
export const MODELS = [
  process.env.GEMINI_MODEL ?? "gemini-3.7-flash",
  ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.6-flash,gemini-3.5-flash,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite").split(","),
].map((m) => m.trim()).filter(Boolean);
let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

export const emptyExtracted = (): Extracted => ({
  name: null, project_type: "unknown", location: null, size_sqft: null, scope: null,
  timeline: null, budget_mentioned: null, preferred_slot: null, site_visit: null, decision_note: null,
});
export const emptyState = (): CallState => ({
  extracted: emptyExtracted(), criteria: emptyCriteria(), intent: "new_enquiry",
  frustrated: false, asked_about_price: false, asked: [],
});

export function greeting(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now)) % 24;
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, Aangan Studio. How can I help you today?`;
}

const QUESTION: Record<CriterionKey, string> = {
  real_project: "Ask whether they want a full design-and-execution project, or just ideas/advice.",
  in_area: "Ask which area of Pune or PCMC the site is in (and whether it is a home or an office).",
  timeline: "Ask: \"When would you need the project complete?\"",
  budget: "",
  decision_maker: "",
};

/** Code decides what to ask next; Gemini only words it. */
export function nextStep(state: CallState, d: Decision): string {
  if (d.status === "declined")
    return "A criterion clearly fails. Close gracefully now using the wording in the rubric. Do not ask anything else. Do not offer a consultation.";
  if (d.status === "escalated")
    return "Complaint. Apologise briefly, do not defend or explain, make NO promise about timing. Get their name and the issue in one line (and the designer's name if it is an existing project). Then say a senior person will call them back, and close.";
  if (d.ask.length) return `Clarify with ONE direct question. ${QUESTION[d.ask[0]]}`;
  const e = state.extracted;
  if (!e.scope) return "Ask what they are looking to do.";
  if (!e.location) return "Ask which area the site is in.";
  if (!e.size_sqft && e.project_type !== "unknown") return "Ask roughly how big the space is (sq ft or BHK).";
  if (!e.timeline) return "Ask when they would like the project complete.";
  if (state.criteria.decision_maker.verdict === "unclear" && !e.decision_note) return "Ask, lightly, whether they are the owner / decision-maker for the project.";
  if (!e.name) return "Ask for their name.";
  if (!e.preferred_slot) return "Offer a free consultation and ask which day/time suits them, and whether they would like a designer to visit the site. Do NOT promise a specific slot: say a designer will confirm it.";
  return "Everything is captured. Briefly confirm what you have, say a designer will confirm the consultation slot, thank them, and close.";
}

function systemPrompt(state: CallState, d: Decision): string {
  const k = knowledge();
  return `You are the phone assistant for Aangan Studio, an interior design studio in Pune. You are speaking aloud on a live phone call.

# How to speak
- 1-2 short sentences per turn, at most ONE question. Plain, warm, unhurried. No lists, no markdown, no emojis.
- Reply in the language the caller uses (English, Hindi or Marathi). Never mention that you are an AI unless asked directly; if asked, say you are the studio's assistant.
- Use the caller's name once you know it.

# Hard rules (non-negotiable)
1. NEVER state or hint at any price, range, rate, per-sq-ft figure, budget norm or estimate, even if pressed, even "roughly", even to be helpful. You do not know any prices. To any pricing question reply with exactly this: "${PRICING_LINE}" and set asked_about_price=true. Pricing questions never disqualify a caller.
2. Never promise timelines, discounts, or availability. A designer will confirm the consultation slot; you only record the caller's preference.
3. Never handle complaints. Set intent="complaint" and follow NEXT STEP.
4. Apply the qualification rubric below exactly as written. Do not invent criteria. You only JUDGE each criterion; the system decides the outcome.
5. Only offer services listed below. Politely decline anything else and never invent referrals.
6. Never ask about budget. Record a budget only if the caller volunteers one. If a volunteered number is clearly far below the scope, say plainly (without quoting any figure of your own) that it is likely below what a project of that scope involves.

# Criteria judgement
Today's date (India) is ${new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date())}. Use it to judge deadlines.
Timeline (criterion 3 is about when execution could start): mark "pass" if the caller wants execution to start about 8 or more weeks from today, or says they are flexible / in no rush / have a completion date months away. Mark "fail" only if they clearly need the finished project in well under 6 weeks from today, and ONLY if "timeline" already appears in the asked list of the current call state (i.e. you have already asked "When would you need the project complete?" and their answer rules it out). Mark "unclear" if no timing has been mentioned, or only an ambiguous date such as a move-in date with no stated start or finish; follow NEXT STEP and ask. Never state how long design or execution takes, never say a date is "too tight" or "doable", and never promise anything about timing; when declining, use only the rubric's graceful-close wording.
For each of the five criteria return pass, fail or unclear with short evidence. "unclear" is the default until the caller has said something that settles it. Judge from the whole conversation so far, not just the latest message. A fail on decision_maker is not grounds to decline: use unclear. If any criterion is "fail" after this caller message, your reply must be the graceful close from the rubric.

# Studio services (scope of what we do)
${k.services}

# Qualification rubric (written by the founder)
${k.qualified}

# Current call state (from earlier turns)
${JSON.stringify({ extracted: state.extracted, criteria: state.criteria, asked: state.asked }, null, 1)}

# NEXT STEP for your reply (set by the system)
${nextStep(state, d)}

Return JSON only.`;
}

function merge(prev: CallState, out: TurnOutput, askedNow: CriterionKey[]): CallState {
  const extracted = { ...prev.extracted };
  for (const [key, val] of Object.entries(out.extracted)) {
    if (val !== null && val !== undefined && !(key === "project_type" && val === "unknown")) (extracted as Record<string, unknown>)[key] = val;
  }
  const criteria = { ...prev.criteria };
  for (const key of Object.keys(criteria) as CriterionKey[]) {
    const n = out.criteria[key];
    // A later "unclear" never erases an earlier settled verdict; anything settled replaces it.
    criteria[key] = n.verdict === "unclear" && criteria[key].verdict !== "unclear" ? criteria[key] : n;
  }
  return {
    extracted,
    criteria,
    intent: out.intent === "complaint" || prev.intent === "complaint" ? "complaint" : out.intent,
    frustrated: prev.frustrated || out.frustrated,
    asked_about_price: prev.asked_about_price || out.asked_about_price,
    asked: [...new Set([...prev.asked, ...askedNow])],
  };
}

export type TurnResult = {
  reply: string;
  endCall: boolean;
  state: CallState;
  decision: Decision;
  priceBlocked: boolean;
  /** true when Gemini never answered (quota/outage): the reply is the apology fallback */
  failed?: boolean;
  rawReply: string;
  model: string;
  tokens: { input: number; output: number };
};

const FALLBACK = "Sorry, I didn't catch that. Could you say that once more?";

export async function runTurn(history: Turn[], prev: CallState): Promise<TurnResult> {
  const prevDecision = decide(prev, { callEnded: false });
  const askedNow = prevDecision.ask.slice(0, 1); // we are instructing exactly one clarifying question this turn
  const contents = history.map((t) => ({ role: t.role === "caller" ? "user" : "model", parts: [{ text: t.text }] }));
  const tokens = { input: 0, output: 0 };

  let out: TurnOutput | null = null;
  let modelUsed = MODELS[0];
  for (let attempt = 0; attempt < MODELS.length && !out; attempt++) {
    modelUsed = MODELS[attempt];
    try {
      const res = await ai().models.generateContent({
        model: modelUsed,
        contents,
        config: {
          systemInstruction: systemPrompt(prev, prevDecision),
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(TurnOutputSchema),
          temperature: 0.3,
        },
      });
      tokens.input += res.usageMetadata?.promptTokenCount ?? 0;
      tokens.output += res.usageMetadata?.candidatesTokenCount ?? 0;
      out = TurnOutputSchema.parse(JSON.parse(res.text ?? ""));
    } catch (err) {
      console.error(`gemini ${modelUsed} failed, trying next:`, String(err).slice(0, 160));
    }
  }
  if (!out) return { reply: FALLBACK, endCall: false, state: prev, decision: prevDecision, priceBlocked: false, failed: true, rawReply: FALLBACK, model: modelUsed, tokens };

  const state = merge(prev, out, askedNow);
  const decision = decide(state, { callEnded: false });
  const { reply, blocked } = guardReply(out.reply);

  const e = state.extracted;
  const endCall =
    out.caller_wants_to_end ||
    decision.status === "declined" ||
    (decision.status === "escalated" && !!e.name) ||
    (decision.status === "in_progress" && decision.ask.length === 0 && !!e.preferred_slot && !!e.name && !!e.scope);

  return { reply, endCall, state, decision, priceBlocked: blocked, rawReply: out.reply, model: modelUsed, tokens };
}
