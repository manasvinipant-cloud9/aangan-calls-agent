/** Sends 3 scripted calls (qualified, declined, missed) through the local webhooks. Needs `npm run dev` running. Rows are tagged sim-*. */
const BASE = "http://localhost:3000";
const H = { "content-type": "application/json", "x-webhook-secret": process.env.VAANI_WEBHOOK_SECRET! };
const post = async (p: string, b: object) => (await fetch(BASE + p, { method: "POST", headers: H, body: JSON.stringify(b) })).json() as Promise<any>;
const stamp = Date.now();

async function call(id: string, from: string, lines: string[]) {
  const cid = `sim-${id}-${stamp}`;
  console.log(`\n=== ${id} (${from}) ===`);
  const g = await post("/api/vaani/turn", { call_id: cid, from, text: "" });
  console.log("AGENT:", g.reply);
  for (const line of lines) {
    console.log("CALLER:", line);
    const r = await post("/api/vaani/turn", { call_id: cid, from, text: line });
    console.log("AGENT:", r.reply, r.end_call ? "[end_call]" : "");
    if (r.end_call) break;
  }
  console.log("END ->", JSON.stringify(await post("/api/vaani/end", { call_id: cid, from, duration: 180 })));
}

async function main() {
  await call("qualified", "+910000000001", [
    "Hi, I'm Priya. I have a 3BHK in Kothrud and we want to redo the whole thing, kitchen, living room and both bedrooms, with full execution.",
    "About 1,400 square feet carpet area.",
    "We'd like to be done by March, no rush at all.",
    "Yes, I'm the owner, my husband knows and is happy to go ahead.",
    "Can you tell me roughly what it would cost?",
    "Okay. Tuesday morning would suit us, and yes please send a designer to the site.",
    "Thank you, that's all.",
  ]);
  await call("declined", "+910000000002", [
    "Hello, I'm Suresh Patil. I'm in Nashik, can you take up a project here? I want to redo my home office and study.",
    "Not even a smaller project?",
  ]);
  console.log("\n=== missed ===");
  console.log("END ->", JSON.stringify(await post("/api/vaani/end", { call_id: `sim-missed-${stamp}`, from: "+910000000003", duration: 4 })));
}
main();
