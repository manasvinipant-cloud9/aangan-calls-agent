import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;
const conn = () => (sql ??= neon(process.env.DATABASE_URL!));

// Neon returns timestamps as Date objects; the rest of the app works with ISO strings.
const norm = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]));

/** Parameterised SQL (Neon serverless HTTP driver). Always pass values as $1, $2... never interpolate. */
export async function query<T = CallRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const rows = (await conn().query(text, params)) as Record<string, unknown>[];
  return rows.map(norm) as T[];
}
export async function one<T = CallRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}
export const json = (v: unknown) => JSON.stringify(v);

export type CallRow = {
  id: string;
  external_id: string;
  caller_number: string | null;
  caller_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  after_hours: boolean;
  first_response_ms: number | null;
  transcript: { role: "caller" | "agent"; text: string; at: string }[];
  state: import("./types").CallState | Record<string, never>;
  status: import("./types").CallStatus;
  reason: string | null;
  price_asked: boolean;
  price_blocked_count: number;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
  finalized_at: string | null;
  lead_status: "new" | "contacted" | "consultation_booked" | "not_a_fit";
  assigned_to: string | null;
  designer_notes: string | null;
  contacted_at: string | null;
};

/** Studio hours are 10am-7pm IST. */
export function isAfterHours(d: Date): boolean {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(d)) % 24;
  return h < 10 || h >= 19;
}
