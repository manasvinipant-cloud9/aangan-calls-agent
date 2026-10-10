import type { CallState, CriterionKey, Decision, Criteria } from "./types";

const LABEL: Record<CriterionKey, string> = {
  real_project: "real project (design + execution)",
  in_area: "service area / project type",
  timeline: "realistic timeline",
  budget: "budget band",
  decision_maker: "decision-maker",
};

export const emptyCriteria = (): Criteria => {
  const u = { verdict: "unclear" as const, evidence: "" };
  return { real_project: u, in_area: u, timeline: u, budget: u, decision_maker: u };
};

/**
 * Applies knowledge/qualified.md exactly as written. Gemini only judges each
 * criterion; this function owns the outcome so decisions are auditable.
 *
 *  - Two or more fail            -> declined
 *  - One fails (1-4)             -> declined / not forwarded
 *  - Unclear on 1, 2 or 3        -> ask one direct question; if already asked -> borderline (human)
 *  - Unclear on 4 or 5           -> qualified, with the uncertainty noted for the designer
 *  - A "fail" on 5 is treated as unclear: the rubric only lets us decline on 1-4.
 */
export function decide(state: CallState, opts: { callEnded: boolean }): Decision {
  const { criteria, intent, asked } = state;
  const notes: string[] = [];

  if (intent === "complaint") {
    return { status: "escalated", reason: "Complaint: human only (hard rule 3).", ask: [], notes };
  }

  // Safety nets on top of the prompt: a fail on decision-maker is not grounds to decline, and a
  // timeline fail only counts once we have asked the one direct question (qualified.md, "At the boundary").
  const v = (k: CriterionKey) =>
    (k === "decision_maker" && criteria[k].verdict === "fail") || (k === "timeline" && criteria[k].verdict === "fail" && !asked.includes("timeline"))
      ? "unclear"
      : criteria[k].verdict;
  const keys = Object.keys(criteria) as CriterionKey[];
  const failed = keys.filter((k) => v(k) === "fail");

  if (failed.length >= 2) {
    return { status: "declined", reason: `Fails ${failed.length} criteria: ${failed.map((k) => LABEL[k]).join("; ")}.`, ask: [], notes };
  }
  if (failed.length === 1) {
    const k = failed[0];
    return { status: "declined", reason: `Fails ${LABEL[k]}: ${criteria[k].evidence || "see transcript"}.`, ask: [], notes };
  }

  const unclearCore = (["real_project", "in_area", "timeline"] as CriterionKey[]).filter((k) => v(k) === "unclear");
  const toAsk = unclearCore.filter((k) => !asked.includes(k));
  if (toAsk.length && !opts.callEnded) {
    return { status: "in_progress", reason: "Need one direct question on an unclear core criterion.", ask: toAsk, notes };
  }
  if (unclearCore.length) {
    return {
      status: opts.callEnded && !state.extracted.name && !state.extracted.scope ? "incomplete" : "borderline",
      reason: `Still unclear after asking: ${unclearCore.map((k) => LABEL[k]).join("; ")}.`,
      ask: [],
      notes,
    };
  }

  for (const k of ["budget", "decision_maker"] as CriterionKey[]) {
    if (v(k) === "unclear" && criteria[k].evidence) notes.push(`${LABEL[k]} unclear: ${criteria[k].evidence}`);
    if (criteria[k].verdict === "fail" && k === "decision_maker") notes.push(`${LABEL[k]} unclear: ${criteria[k].evidence}`);
  }
  return { status: "qualified", reason: "Passes all five criteria (budget/decision-maker unclear treated as qualified).", ask: [], notes };
}
