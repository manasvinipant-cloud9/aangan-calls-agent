/**
 * Vaani AI adapter. Webhook format from https://docs.vaanivoice.ai/guides/webhook-setup :
 *   { event: "call_started" | "call_ended" | "call_postprocessing" | ..., call_id?, room_name?, data?: {...} }
 *   call_ended: call_duration in SECONDS; call_postprocessing: data.call_duration in MILLISECONDS,
 *   data.transcript = "[timestamp] AGENT: ... [timestamp] USER: ...", data.entities, data.summary.
 * Vaani documents no signature or headers, so the endpoint is protected by a secret token in the URL (?token=).
 * Anything about Vaani's payload lives in this one file.
 */
import type { Turn } from "./types";
import { timingSafeEqual } from "node:crypto";

export type VaaniWebhook = {
  kind: "started" | "ended" | "post" | "other";
  event: string;
  callId: string;
  from: string | null;
  durationSec?: number;
  transcript?: Turn[];
  entities?: Record<string, unknown>;
};

export function authorised(req: Request): boolean {
  const secret = process.env.VAANI_WEBHOOK_SECRET;
  if (!secret) return false;
  const given = new URL(req.url).searchParams.get("token") ?? req.headers.get("x-webhook-secret") ?? "";
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "[2026-07-24 13:34:22] AGENT: hi [..] USER: hello" -> turns. Also accepts an array of {role|speaker, text|content}. */
export function parseTranscript(t: unknown): Turn[] {
  const now = new Date().toISOString();
  if (Array.isArray(t)) {
    return t.flatMap((x: any) => {
      const text = String(x?.text ?? x?.content ?? x?.message ?? "").trim();
      const who = String(x?.role ?? x?.speaker ?? "").toLowerCase();
      return text ? [{ role: who.startsWith("agent") || who.startsWith("assistant") || who === "ai" ? "agent" : "caller", text, at: now } as Turn] : [];
    });
  }
  if (typeof t !== "string") return [];
  const re = /\[([^\]]*)\]\s*(AGENT|ASSISTANT|AI|USER|CALLER|CUSTOMER)\s*:\s*/gi;
  const marks = [...t.matchAll(re)];
  return marks.flatMap((m, i) => {
    const text = t.slice(m.index! + m[0].length, marks[i + 1]?.index ?? t.length).trim();
    if (!text) return [];
    const d = new Date(m[1]);
    const role = /^(agent|assistant|ai)$/i.test(m[2]) ? "agent" : "caller";
    return [{ role, text, at: isNaN(+d) ? now : d.toISOString() } as Turn];
  });
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function parseVaaniWebhook(body: unknown): VaaniWebhook | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, any>;
  const d = (b.data && typeof b.data === "object" ? b.data : {}) as Record<string, any>;
  const event = String(b.event ?? "");
  const callId = str(b.call_id) ?? str(d.call_id) ?? str(b.room_name) ?? str(d.room_name);
  if (!event || !callId) return null;
  const kind = event === "call_started" ? "started" : event === "call_ended" ? "ended" : event === "call_postprocessing" ? "post" : "other";
  const entities = (d.entities && typeof d.entities === "object" ? d.entities : undefined) as Record<string, unknown> | undefined;
  const dur = kind === "post" ? Number(d.call_duration) / 1000 : Number(b.call_duration ?? d.call_duration);
  return {
    kind,
    event,
    callId,
    from: str(d.contact_number) ?? str(d.caller_number) ?? str(d.from) ?? str(b.from) ?? str(b.caller_number) ?? str(entities?.phone) ?? str(entities?.phone_number) ?? null,
    durationSec: Number.isFinite(dur) ? dur : undefined,
    transcript: kind === "post" ? parseTranscript(d.transcript) : undefined,
    entities,
  };
}
