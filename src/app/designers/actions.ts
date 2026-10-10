"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { moveDealStage, type LeadStatus } from "@/lib/hubspot";

const STATUSES: LeadStatus[] = ["new", "contacted", "consultation_booked", "not_a_fit"];

export async function updateLead(fd: FormData) {
  const key = process.env.DESIGNER_KEY;
  if (!key || fd.get("key") !== key) throw new Error("unauthorised");
  const id = String(fd.get("id"));
  const status = String(fd.get("lead_status")) as LeadStatus;
  if (!STATUSES.includes(status)) throw new Error("bad status");

  const sb = db();
  const { data: cur } = await sb.from("calls").select("contacted_at,hubspot_deal_id").eq("id", id).single();
  await sb
    .from("calls")
    .update({
      lead_status: status,
      assigned_to: String(fd.get("who") ?? "").trim().slice(0, 60) || null,
      designer_notes: String(fd.get("notes") ?? "").trim().slice(0, 1000) || null,
      contacted_at: cur?.contacted_at ?? (status === "new" ? null : new Date().toISOString()),
    })
    .eq("id", id);
  if (cur?.hubspot_deal_id) {
    const r = await moveDealStage(cur.hubspot_deal_id, status);
    if (!r.ok) console.error("hubspot stage sync", r.error);
  }
  revalidatePath("/designers");
}
