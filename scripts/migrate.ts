/** Applies db/migrations/*.sql to the database in DATABASE_URL, once each. Run: npm run migrate */
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) return console.log("DATABASE_URL is not set in .env.local");
  const sql = neon(process.env.DATABASE_URL);
  await sql.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set(((await sql.query("select name from schema_migrations")) as { name: string }[]).map((r) => r.name));
  const dir = path.join(process.cwd(), "db", "migrations");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    if (done.has(f)) { console.log("skip   ", f); continue; }
    // One statement per call (the HTTP driver runs a single statement); our migrations are plain DDL.
    const statements = fs.readFileSync(path.join(dir, f), "utf8").replace(/^\s*--.*$/gm, "").split(/;\s*(?:\n|$)/).map((x) => x.trim()).filter(Boolean);
    for (const st of statements) await sql.query(st);
    await sql.query("insert into schema_migrations (name) values ($1)", [f]);
    console.log("applied ", f, `(${statements.length} statements)`);
  }
  const t = (await sql.query("select table_name from information_schema.tables where table_schema = 'public' order by 1")) as { table_name: string }[];
  console.log("tables:", t.map((x) => x.table_name).join(", "));
}
main().catch((e) => { console.error("migration failed:", String(e).slice(0, 300)); process.exitCode = 1; });
