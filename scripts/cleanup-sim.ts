/**
 * Removes the simulated calls made by `npm run simulate` (external_id starts with "sim-") and their HubSpot test
 * contacts/deals (fake numbers +91000000000x). HubSpot deletes are archives (restorable for 90 days).
 *   npm run cleanup:sim            -> dry run
 *   npm run cleanup:sim -- --apply -> delete
 */
import { query } from "../src/lib/db";

const APPLY = process.argv.includes("--apply");
const H = { authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`, "content-type": "application/json" };
const hs = async (method: string, path: string, body?: object) => {
  const r = await fetch("https://api.hubapi.com" + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  return r.status === 204 ? {} : ((await r.json().catch(() => ({}))) as any);
};
const FAKE = /^\+91000000000\d$/;

async function main() {
  console.log(APPLY ? "APPLY\n" : "DRY RUN (add --apply to delete)\n");
  const calls = await query<{ id: string; external_id: string; caller_number: string | null; hubspot_deal_id: string | null; hubspot_contact_id: string | null }>(
    "select id, external_id, caller_number, hubspot_deal_id, hubspot_contact_id from calls where external_id like 'sim-%'",
  );
  console.log(`Database: ${calls.length} simulated calls (their handoffs and usage go with them)`);

  const dealIds = new Set<string>(calls.map((c) => c.hubspot_deal_id).filter(Boolean) as string[]);
  const contactIds = new Set<string>(calls.filter((c) => c.caller_number && FAKE.test(c.caller_number)).map((c) => c.hubspot_contact_id).filter(Boolean) as string[]);
  for (const n of ["+910000000001", "+910000000002", "+910000000003"]) {
    const r = await hs("POST", "/crm/v3/objects/contacts/search", { filterGroups: [{ filters: [{ propertyName: "phone", operator: "EQ", value: n }] }], properties: ["phone"], limit: 20 });
    for (const x of r.results ?? []) if (FAKE.test(x.properties.phone ?? "")) contactIds.add(x.id);
  }
  // Deals attached to a fake test contact (catches test deals from before the database switch).
  for (const cid of contactIds) {
    const a = await hs("GET", `/crm/v4/objects/contacts/${cid}/associations/deals`);
    for (const x of a.results ?? []) dealIds.add(String(x.toObjectId));
  }
  console.log(`HubSpot: ${dealIds.size} test deals, ${contactIds.size} test contacts (fake numbers only)`);
  if (!APPLY) return;

  for (const id of dealIds) await hs("DELETE", `/crm/v3/objects/deals/${id}`);
  for (const id of contactIds) await hs("DELETE", `/crm/v3/objects/contacts/${id}`);
  await query("delete from calls where external_id like 'sim-%'");
  const left = await query<{ n: string }>("select count(*)::text as n from calls");
  console.log(`\nDone. Calls left in the database: ${left[0].n}`);
}
main();
