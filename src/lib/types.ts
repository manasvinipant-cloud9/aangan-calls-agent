import { z } from "zod";

export const Verdict = z.enum(["pass", "fail", "unclear"]);
export type Verdict = z.infer<typeof Verdict>;

const Criterion = z.object({
  verdict: Verdict,
  evidence: z.string().describe("Short quote or paraphrase from the caller supporting the verdict; empty if unclear"),
});

/** The five criteria from knowledge/qualified.md, in Nikhil's order. */
export const CriteriaSchema = z.object({
  real_project: Criterion.describe("1. Wants design AND execution, not just advice/ideas"),
  in_area: Criterion.describe("2. Site is in Pune city or PCMC, and is a type of project the studio does"),
  timeline: Criterion.describe("3. Site can be ready for execution 8-10+ weeks after the consultation"),
  budget: Criterion.describe("4. A volunteered budget is not clearly below the scope. Not mentioned = pass"),
  decision_maker: Criterion.describe("5. Caller decides, or is authorised by the person who does"),
});
export type Criteria = z.infer<typeof CriteriaSchema>;
export type CriterionKey = keyof Criteria;

export const ExtractedSchema = z.object({
  name: z.string().nullable(),
  project_type: z.enum(["residential", "commercial", "other", "unknown"]),
  location: z.string().nullable().describe("Area/locality of the site"),
  size_sqft: z.number().nullable(),
  scope: z.string().nullable().describe("What they want done, in the caller's terms"),
  timeline: z.string().nullable().describe("When they want it finished / start, in the caller's words"),
  budget_mentioned: z.string().nullable().describe("ONLY a budget the caller volunteered; never ask for it"),
  preferred_slot: z.string().nullable().describe("When the caller wants the consultation; null if not given"),
  site_visit: z.boolean().nullable().describe("true if they want a designer to visit the site"),
  decision_note: z.string().nullable().describe("Who decides, e.g. 'owner, husband agrees'"),
});
export type Extracted = z.infer<typeof ExtractedSchema>;

export const Intent = z.enum(["new_enquiry", "complaint", "other"]);

/** What Gemini returns every turn. */
export const TurnOutputSchema = z.object({
  reply: z.string().describe("Exactly what to say to the caller. 1-2 short spoken sentences, at most one question."),
  intent: Intent.describe("complaint = unhappy about an existing project, designer, or a missed follow-up"),
  frustrated: z.boolean(),
  asked_about_price: z.boolean().describe("true if the caller asked what it would cost, even indirectly"),
  extracted: ExtractedSchema,
  criteria: CriteriaSchema,
  caller_wants_to_end: z.boolean().describe("true if the caller is saying goodbye or hung up intent"),
});
export type TurnOutput = z.infer<typeof TurnOutputSchema>;

export type CallStatus =
  | "in_progress"
  | "qualified"
  | "declined"
  | "borderline"
  | "escalated"
  | "missed"
  | "incomplete";

export type Decision = {
  status: CallStatus;
  reason: string;
  /** Criteria (1-3) still unclear: the agent should ask one direct question about the first. */
  ask: CriterionKey[];
  /** Criteria 4/5 left unclear; handed off with a note per qualified.md. */
  notes: string[];
};

export type Turn = { role: "caller" | "agent"; text: string; at: string };

export type CallState = {
  extracted: Extracted;
  criteria: Criteria;
  intent: z.infer<typeof Intent>;
  frustrated: boolean;
  asked_about_price: boolean;
  /** Criteria we have already asked a clarifying question about (one question each, per qualified.md). */
  asked: CriterionKey[];
};
