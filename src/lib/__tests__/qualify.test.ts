import { describe, expect, it } from "vitest";
import { decide, emptyCriteria } from "../qualify";
import type { CallState, CriterionKey, Verdict } from "../types";

const state = (v: Partial<Record<CriterionKey, Verdict>>, extra: Partial<CallState> = {}): CallState => {
  const criteria = emptyCriteria();
  for (const [k, verdict] of Object.entries(v)) criteria[k as CriterionKey] = { verdict: verdict as Verdict, evidence: "x" };
  return {
    criteria,
    intent: "new_enquiry",
    frustrated: false,
    asked_about_price: false,
    asked: [],
    extracted: { name: "A", project_type: "residential", location: null, size_sqft: null, scope: "full home", timeline: null, budget_mentioned: null, preferred_slot: null, site_visit: null, decision_note: null },
    ...extra,
  };
};
const allPass = { real_project: "pass", in_area: "pass", timeline: "pass", budget: "pass", decision_maker: "pass" } as const;

describe("decide (qualified.md)", () => {
  it("qualifies when all five pass", () => expect(decide(state(allPass), { callEnded: true }).status).toBe("qualified"));
  it("treats unmentioned budget as qualified", () =>
    expect(decide(state({ ...allPass, budget: "unclear" }), { callEnded: true }).status).toBe("qualified"));
  it("qualifies with a note when decision-maker unclear (T14)", () => {
    const d = decide(state({ ...allPass, decision_maker: "unclear" }), { callEnded: true });
    expect(d.status).toBe("qualified");
  });
  it("declines on a single fail (T03 Nashik)", () =>
    expect(decide(state({ ...allPass, in_area: "fail" }), { callEnded: true }).status).toBe("declined"));
  it("declines on a clear budget mismatch (T10)", () =>
    expect(decide(state({ ...allPass, budget: "fail" }), { callEnded: true }).status).toBe("declined"));
  it("declines on two fails", () =>
    expect(decide(state({ ...allPass, real_project: "fail", timeline: "fail" }), { callEnded: true }).status).toBe("declined"));
  it("asks one question when a core criterion is unclear", () => {
    const d = decide(state({ ...allPass, timeline: "unclear" }), { callEnded: false });
    expect(d.status).toBe("in_progress");
    expect(d.ask).toEqual(["timeline"]);
  });
  it("goes borderline (human) if still unclear after asking", () =>
    expect(decide(state({ ...allPass, timeline: "unclear" }, { asked: ["timeline"] }), { callEnded: true }).status).toBe("borderline"));
  it("goes borderline if the caller hangs up before the question", () =>
    expect(decide(state({ ...allPass, timeline: "unclear" }), { callEnded: true }).status).toBe("borderline"));
  it("escalates complaints regardless of criteria", () =>
    expect(decide(state(allPass, { intent: "complaint" }), { callEnded: true }).status).toBe("escalated"));
  it("asks before declining on timeline (T02/T07)", () => {
    const d = decide(state({ ...allPass, timeline: "fail" }), { callEnded: false });
    expect(d.status).toBe("in_progress");
    expect(d.ask).toEqual(["timeline"]);
  });
  it("declines on timeline once it has been asked", () =>
    expect(decide(state({ ...allPass, timeline: "fail" }, { asked: ["timeline"] }), { callEnded: true }).status).toBe("declined"));
  it("never declines on decision-maker alone", () =>
    expect(decide(state({ ...allPass, decision_maker: "fail" }), { callEnded: true }).status).toBe("qualified"));
});
