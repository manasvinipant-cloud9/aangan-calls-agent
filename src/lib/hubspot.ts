const BASE = "https://api.hubapi.com";
const hs = (path: string, init: RequestInit = {}) =>
  fetch(BASE + path, {
    ...init,
    headers: { authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });

export type LeadStatus = "new" | "contacted" | "consultation_booked" | "not_a_fit";

/** Designer-facing status -> HubSpot deal stage id (written to .env by scripts/setup-hubspot.ts). */
const STAGE: Record<LeadStatus, string | undefined> = {
  new: process.env.HUBSPOT_STAGE_NEW,
  contacted: process.env.HUBSPOT_STAGE_CONTACTED,
  consultation_booked: process.env.HUBSPOT_STAGE_BOOKED,
  not_a_fit: process.env.HUBSPOT_STAGE_LOST,
};

export type HubspotResult = { contactId?: string; dealId?: string; error?: string };

export type DealFields = {
  projectType?: string | null; location?: string | null; sizeSqft?: number | null; scope?: string | null;
  timeline?: string | null; consultation?: string | null; reason?: string | null; flags?: string | null;
};

/** Contact for every call with a number; a deal only when qualified. */
export async function syncHubspot(a: {
  phone: string | null; name: string | null; summary: string; qualified: boolean; dealName: string; fields: DealFields;
}): Promise<HubspotResult> {
  if (!process.env.HUBSPOT_TOKEN) return { error: "HubSpot not configured" };
  if (!a.phone) return { error: "no caller number" };
  try {
    const search = await hs("/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: "phone", operator: "EQ", value: a.phone }] }], limit: 1 }),
    });
    const found = search.ok ? ((await search.json()) as { results: { id: string }[] }).results[0] : undefined;
    const props = { phone: a.phone, ...(a.name ? { firstname: a.name } : {}), hs_lead_status: a.qualified ? "OPEN" : "UNQUALIFIED" };
    let contactId = found?.id;
    if (contactId) {
      await hs(`/crm/v3/objects/contacts/${contactId}`, { method: "PATCH", body: JSON.stringify({ properties: props }) });
    } else {
      const r = await hs("/crm/v3/objects/contacts", { method: "POST", body: JSON.stringify({ properties: props }) });
      if (!r.ok) return { error: `HubSpot contact ${r.status}: ${(await r.text()).slice(0, 200)}` };
      contactId = ((await r.json()) as { id: string }).id;
    }
    if (!a.qualified) return { contactId };

    const base = {
      dealname: a.dealName,
      description: a.summary,
      ...(process.env.HUBSPOT_PIPELINE_ID ? { pipeline: process.env.HUBSPOT_PIPELINE_ID } : {}),
      ...(STAGE.new ? { dealstage: STAGE.new } : {}),
    };
    const f = a.fields;
    const custom = Object.fromEntries(
      Object.entries({
        aangan_project_type: f.projectType, aangan_location: f.location, aangan_size_sqft: f.sizeSqft, aangan_scope: f.scope,
        aangan_timeline: f.timeline, aangan_consultation_pref: f.consultation, aangan_qualifier_reason: f.reason,
        aangan_flags: f.flags, aangan_source: "Phone agent",
      }).filter(([, v]) => v !== null && v !== undefined && v !== ""),
    );
    const create = (properties: object) => hs("/crm/v3/objects/deals", { method: "POST", body: JSON.stringify({ properties }) });
    let d = await create({ ...base, ...custom });
    // Custom properties not created yet (setup script not run): still create the deal rather than lose the lead.
    if (d.status === 400 && (await d.clone().text()).includes("PROPERTY_DOESNT_EXIST")) d = await create(base);
    if (!d.ok) return { contactId, error: `HubSpot deal ${d.status}: ${(await d.text()).slice(0, 200)}` };
    const dealId = ((await d.json()) as { id: string }).id;
    await hs(`/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`, { method: "PUT" });
    return { contactId, dealId };
  } catch (e) {
    return { error: String(e) };
  }
}

/** Keeps the HubSpot pipeline in step when a designer updates a lead. Best effort: never blocks the designer. */
export async function moveDealStage(dealId: string, status: LeadStatus): Promise<{ ok: boolean; error?: string }> {
  const stage = STAGE[status];
  if (!process.env.HUBSPOT_TOKEN || !stage) return { ok: false, error: "HubSpot stage not configured" };
  try {
    const r = await hs(`/crm/v3/objects/deals/${dealId}`, { method: "PATCH", body: JSON.stringify({ properties: { dealstage: stage } }) });
    return r.ok ? { ok: true } : { ok: false, error: `HubSpot ${r.status}: ${(await r.text()).slice(0, 150)}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
