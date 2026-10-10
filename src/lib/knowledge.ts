import fs from "node:fs";
import path from "node:path";

// Runtime knowledge. pricing.md is intentionally NOT loaded anywhere (check 06):
// the agent never needs a number, so it never sees one.
const dir = path.join(process.cwd(), "knowledge");
const read = (f: string) => fs.readFileSync(path.join(dir, f), "utf8");

let cache: { services: string; qualified: string } | null = null;
export function knowledge() {
  return (cache ??= { services: read("services.md"), qualified: read("qualified.md") });
}
