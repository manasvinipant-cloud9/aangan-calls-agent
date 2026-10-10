/**
 * Sends Vaani-style webhook events (call_started, call_ended, call_postprocessing with a transcript) for three
 * scripted calls: qualified, declined, missed. Rows are tagged sim-*.   BASE_URL=... npm run simulate
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const URL_ = `${BASE}/api/vaani/webhook?token=${encodeURIComponent(process.env.VAANI_WEBHOOK_SECRET!)}`;
const post = async (b: object) => {
  const r = await fetch(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
  return `${r.status} ${(await r.text()).slice(0, 110)}`;
};
const stamp = Date.now();
const line = (who: "AGENT" | "USER", text: string, i: number) => `[2026-10-10 20:0${i}:00] ${who}: ${text}`;

async function call(id: string, from: string, dialogue: [("AGENT" | "USER"), string][]) {
  const cid = `sim-${id}-${stamp}`;
  console.log(`\n=== ${id} (${from}) ===`);
  await post({ event: "call_started", call_id: cid, data: { contact_number: from } });
  console.log("ended  ->", await post({ event: "call_ended", room_name: cid, call_duration: 180 }));
  const transcript = dialogue.map(([w, t], i) => line(w, t, i % 10)).join(" ");
  console.log("post   ->", await post({ event: "call_postprocessing", call_id: cid, data: { room_name: cid, contact_number: from, call_duration: 180000, transcript, entities: {} } }));
}

async function main() {
  await call("qualified", "+910000000001", [
    ["AGENT", "Good evening, Aangan Studio. How can I help you today?"],
    ["USER", "Hi, I'm Priya. I have a 3BHK in Kothrud and we want to redo the whole thing, kitchen, living room and both bedrooms, with full execution."],
    ["AGENT", "That sounds like a lovely project. About how big is the apartment?"],
    ["USER", "About 1,400 square feet carpet. We'd like to be done by March, no rush at all."],
    ["AGENT", "Wonderful. Are you the owner and decision-maker?"],
    ["USER", "Yes, I'm the owner, my husband knows and is happy to go ahead. Can you tell me roughly what it would cost?"],
    ["AGENT", "Pricing depends on the site, the materials you choose, and the scope. Your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like."],
    ["USER", "Okay. Tuesday morning would suit us, and yes please send a designer to the site."],
    ["AGENT", "Noted. A designer will confirm your consultation slot. Thank you for calling."],
  ]);
  await call("declined", "+910000000002", [
    ["AGENT", "Good evening, Aangan Studio. How can I help you today?"],
    ["USER", "Hello, I'm Suresh Patil. I'm in Nashik, can you take up a project here? I want to redo my home office and study."],
    ["AGENT", "We currently only serve Pune and PCMC, so we wouldn't be able to take on a project in Nashik. Thank you for calling."],
  ]);
  console.log("\n=== missed ===");
  const cid = `sim-missed-${stamp}`;
  await post({ event: "call_started", call_id: cid, data: { contact_number: "+910000000003" } });
  console.log("ended  ->", await post({ event: "call_ended", room_name: cid, call_duration: 3 }));
}
main();
