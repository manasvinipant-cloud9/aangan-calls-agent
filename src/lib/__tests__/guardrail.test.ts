import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { containsPrice, guardReply, PRICING_LINE } from "../guardrail";

describe("price guardrail", () => {
  it.each([
    "It'll cost around 20 lakh.",
    "Our rates start at ₹1,800 per sq ft.",
    "For a 2BHK it's typically 15 to 20 lakhs",
    "Roughly 2000 per sq ft",
    "Rs 3.5 lakh for a room",
    "about 3 crore",
    "1800 psf",
    "pricing starts from 50k",
    "roughly 15 lakh all in",
    "about 3 rupees per square foot",
  ])("blocks: %s", (t) => {
    expect(containsPrice(t)).toBe(true);
    expect(guardReply(t)).toEqual({ reply: PRICING_LINE, blocked: true });
  });

  it.each([
    "Great, a 3BHK of about 1,400 sq ft in Kothrud. When would you like it finished?",
    "I can book a consultation for Tuesday at 11am.",
    "Execution usually takes 8 to 16 weeks.",
    "Could you tell me roughly how big your 2BHK is in square feet?",
    "About how many bedrooms do you have, 2 or 3?",
    "It is roughly 1,400 sq ft, is that right?",
    PRICING_LINE,
  ])("allows: %s", (t) => expect(containsPrice(t)).toBe(false));

  // inputs/pricing.md is gitignored; this check runs wherever the file is present.
  const pricingFile = path.join(process.cwd(), "inputs", "pricing.md");
  it.skipIf(!fs.existsSync(pricingFile))("no pricing.md figure appears in the runtime knowledge", () => {
    const figures = [...fs.readFileSync(pricingFile, "utf8").matchAll(/\d[\d,]{3,}/g)].map((m) => m[0]);
    expect(figures.length).toBeGreaterThan(5);
    const dir = path.join(process.cwd(), "knowledge");
    for (const f of fs.readdirSync(dir)) {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      for (const n of figures) expect(text, `${f} contains ${n}`).not.toContain(n);
    }
  });
});
