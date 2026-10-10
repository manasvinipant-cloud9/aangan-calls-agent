import { describe, expect, it } from "vitest";
import { parseTranscript, parseVaaniWebhook } from "../vaani";

describe("Vaani webhook parsing (docs.vaanivoice.ai/guides/webhook-setup)", () => {
  it("splits a transcript string into turns", () => {
    const t = parseTranscript("[2026-07-24 13:34:22] AGENT: Hello there. [2026-07-24 13:34:30] USER: Hi, I have a 3BHK in Baner. [2026-07-24 13:34:40] AGENT: Great.");
    expect(t.map((x) => x.role)).toEqual(["agent", "caller", "agent"]);
    expect(t[1].text).toBe("Hi, I have a 3BHK in Baner.");
  });
  it("accepts an array transcript too", () => {
    expect(parseTranscript([{ role: "assistant", text: "Hi" }, { role: "user", text: "Hello" }]).map((x) => x.role)).toEqual(["agent", "caller"]);
  });
  it("parses call_ended (seconds)", () => {
    const e = parseVaaniWebhook({ event: "call_ended", room_name: "room_1", call_duration: 42.5, end_reason: "X" })!;
    expect(e).toMatchObject({ kind: "ended", callId: "room_1", durationSec: 43 });
  });
  it("parses call_postprocessing (milliseconds) with transcript and number", () => {
    const e = parseVaaniWebhook({ event: "call_postprocessing", call_id: "c1", data: { room_name: "c1", call_duration: 55150, contact_number: "+919876543210", transcript: "[2026-07-24 13:34:22] USER: hi", entities: { name: "A" } } })!;
    expect(e.kind).toBe("post");
    expect(e.durationSec).toBe(55);
    expect(e.from).toBe("+919876543210");
    expect(e.transcript).toHaveLength(1);
  });
  it("copes with duration in seconds or milliseconds, always a whole number", () => {
    const sec = parseVaaniWebhook({ event: "call_postprocessing", call_id: "c", data: { call_duration: 150.16, transcript: "" } })!;
    const ms = parseVaaniWebhook({ event: "call_postprocessing", call_id: "c", data: { call_duration: 55150.023, transcript: "" } })!;
    expect(sec.durationSec).toBe(150);
    expect(ms.durationSec).toBe(55);
  });
  it("rejects payloads with no event or call id", () => {
    expect(parseVaaniWebhook({})).toBeNull();
    expect(parseVaaniWebhook({ event: "call_ended" })).toBeNull();
  });
});
