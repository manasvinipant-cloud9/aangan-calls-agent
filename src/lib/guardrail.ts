/** The only acceptable answer to a pricing question (pricing.md). */
export const PRICING_LINE =
  "Pricing depends on the site, the materials you choose, and the scope. Your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like.";

// Anything that reads as a price, range or rate. Deliberately broad: a false
// positive costs one canned sentence; a false negative is an unrecoverable quote.
const PRICE_PATTERNS: RegExp[] = [
  /₹/,
  /\brs\.?\s*\d/i,
  /\binr\b/i,
  /\b(lakh|lakhs|lac|lacs|crore|crores)\b/i,
  /\b\d[\d,.]*\s*(k|thousand)\b/i,
  /(per|\/|a)\s*(sq\.?\s*ft|sqft|square\s*f(oo|ee)t|sq\.?\s*feet)/i,
  /\bpsf\b/i,
  /\b(rates?|pricing|cost|costs|price|charges?|fees?)\b[^.?!]{0,40}\b(start|starts|begin|begins|around|about|roughly|typically|usually|between|from)\b/i,
  /\b(rupees?|bucks)\b/i,
  /\b(ballpark|roughly|around|approximately|about)\b[^.?!]{0,20}\b\d[\d,.]*\s*(lakh|lakhs|lac|crore|k|thousand|rs|rupees|inr)\b/i,
];

export function containsPrice(text: string): boolean {
  return PRICE_PATTERNS.some((p) => p.test(text));
}

/** Last line of defence: no model output reaches the caller without passing through here. */
export function guardReply(reply: string): { reply: string; blocked: boolean } {
  if (containsPrice(reply)) return { reply: PRICING_LINE, blocked: true };
  return { reply, blocked: false };
}
