/**
 * One-time HubSpot setup so Nikhil opens HubSpot and sees a clean pipeline.
 *   npm run setup:hubspot            -> dry run: prints what would change, touches nothing
 *   npm run setup:hubspot -- --apply -> creates the properties + pipeline, writes stage ids to .env.local
 *
 * Needs HUBSPOT_TOKEN (private app) with scopes: crm.objects.contacts.read/write,
 * crm.objects.deals.read/write, crm.schemas.deals.read/write.
 */
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const T = process.env.HUBSPOT_TOKEN;
const api = async (method: string, path: string, body?: object) => {
  const r = await fetch("https://api.hubapi.com" + path, {
    method, headers: { authorization: `Bearer ${T}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, json: (await r.json().catch(() => ({}))) as any };
};

const PROPS = [
  ["aangan_project_type", "Project type", "string", "text"],
  ["aangan_location", "Site area", "string", "text"],
  ["aangan_size_sqft", "Size (sq ft)", "number", "number"],
  ["aangan_scope", "What they want", "string", "textarea"],
  ["aangan_timeline", "Timeline", "string", "text"],
  ["aangan_consultation_pref", "Consultation preference", "string", "text"],
  ["aangan_qualifier_reason", "Why it qualified", "string", "textarea"],
  ["aangan_flags", "Flags for the designer", "string", "textarea"],
  ["aangan_source", "Enquiry source", "string", "text"],
] as const;

// What each designer-dashboard status becomes in HubSpot. Later stages are moved by hand in HubSpot.
const STAGES = [
  { key: "NEW", label: "New enquiry", p: "0.1" },
  { key: "CONTACTED", label: "Designer contacted", p: "0.2" },
  { key: "BOOKED", label: "Consultation booked", p: "0.4" },
  { key: "PROPOSAL", label: "Proposal sent", p: "0.6" },
  { key: "WON", label: "Won", p: "1.0", closed: true },
  { key: "LOST", label: "Lost / not a fit", p: "0.0", closed: true },
];
const PIPELINE_LABEL = "Aangan phone enquiries";

async function main() {
  if (!T) return console.log("HUBSPOT_TOKEN is not set in .env.local");
  console.log(APPLY ? "APPLY mode\n" : "DRY RUN: nothing will be changed. Add --apply to do it.\n");

  const check = await api("GET", "/crm/v3/pipelines/deals");
  if (!check.ok) return console.log(`Cannot read pipelines (${check.status}): ${check.json.message ?? ""}\nCheck the token and its scopes.`);
  const existing = (check.json.results as any[]).find((p) => p.label === PIPELINE_LABEL);

  console.log("1. Custom deal fields (group 'Aangan enquiry'):");
  PROPS.forEach(([n, l]) => console.log(`   - ${l}  (${n})`));
  if (APPLY) {
    await api("POST", "/crm/v3/properties/deals/groups", { name: "aangan_enquiry", label: "Aangan enquiry", displayOrder: 1 });
    for (const [name, label, type, fieldType] of PROPS) {
      const r = await api("POST", "/crm/v3/properties/deals", { name, label, type, fieldType, groupName: "aangan_enquiry" });
      console.log(`   ${label}: ${r.ok ? "created" : r.status === 409 ? "already exists" : `FAILED ${r.status} ${r.json.message ?? ""}`}`);
    }
  }

  console.log(`\n2. Deal pipeline "${PIPELINE_LABEL}": ${STAGES.map((s) => s.label).join("  ->  ")}`);
  let pipeline = existing;
  if (existing) console.log("   already exists, reusing it");
  else if (APPLY) {
    const r = await api("POST", "/crm/v3/pipelines/deals", {
      label: PIPELINE_LABEL, displayOrder: 0,
      stages: STAGES.map((s, i) => ({ label: s.label, displayOrder: i, metadata: { probability: s.p, ...(s.closed ? { isClosed: "true" } : {}) } })),
    });
    if (!r.ok) {
      console.log(`   FAILED ${r.status}: ${r.json.message ?? ""}`);
      console.log("   Free HubSpot accounts are limited to one deal pipeline. Tell me and I'll rename the stages of the default pipeline instead.");
      return;
    }
    pipeline = r.json;
    console.log("   created");
  }

  if (APPLY && pipeline) {
    const id = (label: string) => pipeline.stages.find((s: any) => s.label === label)?.id as string;
    const lines = [`HUBSPOT_PIPELINE_ID=${pipeline.id}`, ...STAGES.filter((s) => ["NEW", "CONTACTED", "BOOKED", "LOST"].includes(s.key)).map((s) => `HUBSPOT_STAGE_${s.key}=${id(s.label)}`)];
    let env = fs.readFileSync(".env.local", "utf8");
    for (const l of lines) {
      const [k] = l.split("=");
      env = new RegExp(`^${k}=`, "m").test(env) ? env.replace(new RegExp(`^${k}=.*$`, "m"), l) : env.trimEnd() + "\n" + l + "\n";
    }
    env = env.replace(/^HUBSPOT_DEAL_STAGE_ID=.*\n?/m, "");
    fs.writeFileSync(".env.local", env);
    console.log("\n3. Wrote pipeline + stage ids to .env.local. Add the same HUBSPOT_* values in Vercel.");
  }
}
main();
