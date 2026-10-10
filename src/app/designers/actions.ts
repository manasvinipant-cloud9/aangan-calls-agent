"use server";
import { revalidatePath } from "next/cache";
import { one, query } from "@/lib/db";
import { moveDealStage, type LeadStatus } from "@/lib/hubspot";

const STATUSES: LeadStatus[] = ["new", "contacted", "consultation_booked", "not_a_fit"];

export async function updateLead(fd: FormData) {
  const key = process.env.DESIGNER_KEY;
  if (!key || fd.get("key") !== key) throw new Error("unauthorised");
  const id = String(fd.get("id"));
  const status = String(fd.get("lead_status")) as LeadStatus;
  if (!STATUSES.includes(status)) throw new Error("bad status");

  const cur = await one<{ contacted_at: string | null; hubspot_deal_id: string | null }>("select contacted_at, hubspot_deal_id from calls where id = $1", [id]);
  await query(
    "update calls set lead_status = $2, assigned_to = $3, designer_notes = $4, contacted_at = $5 where id = $1",
    [
      id,
      status,
      String(fd.get("who") ?? "").trim().slice(0, 60) || null,
      String(fd.get("notes") ?? "").trim().slice(0, 1000) || null,
      cur?.contacted_at ?? (status === "new" ? null : new Date().toISOString()),
    ],
  );
  if (cur?.hubspot_deal_id) {
    const r = await moveDealStage(cur.hubspot_deal_id, status);
    if (!r.ok) console.error("hubspot stage sync", r.error);
  }
  revalidatePath("/designers");
}
