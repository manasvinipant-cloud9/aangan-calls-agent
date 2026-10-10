/**
 * Vaani AI adapter. The brief says the webhook format is NOT confirmed, so every
 * assumption about Vaani's payload lives in this one file. When the real format is
 * known, only parseVaani() and the response shape in the routes need to change.
 */
export type VaaniEvent = {
  callId: string;
  from: string | null;
  text: string;          // what the caller just said (empty on first ring / call end)
  startedAt?: string;
  durationSec?: number;
};

export function authorised(req: Request): boolean {
  const secret = process.env.VAANI_WEBHOOK_SECRET;
  return !!secret && req.headers.get("x-webhook-secret") === secret;
}

const pick = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return undefined;
};

export function parseVaani(body: unknown): VaaniEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const callId = pick(b, "call_id", "callId", "id", "session_id");
  if (!callId) return null;
  return {
    callId: String(callId),
    from: (pick(b, "from", "caller", "caller_number", "phone") as string | undefined) ?? null,
    text: String(pick(b, "text", "transcript", "utterance", "speech") ?? ""),
    startedAt: pick(b, "started_at", "startedAt", "timestamp") as string | undefined,
    durationSec: pick(b, "duration", "duration_sec", "durationSec") as number | undefined,
  };
}
