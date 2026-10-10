import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let c: SupabaseClient | null = null;
/** Service-role client: server-side only, never imported by client components. */
export const db = () =>
  (c ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

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
