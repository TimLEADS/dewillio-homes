/**
 * One-time import of data/sqlite-backup.json into the Neon Postgres database.
 *
 *   node scripts/import-backup.mjs
 *
 * Run this BEFORE opening the app against a fresh database: the app only seeds
 * demo data when `users` is empty, so importing first suppresses the seed.
 * Safe to skip entirely if you would rather start from the demo seed.
 */
import fs from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = (await import("ws")).default;
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local and run with:");
  console.error("  node --env-file=.env.local scripts/import-backup.mjs");
  process.exit(1);
}

const BACKUP = "data/sqlite-backup.json";
if (!fs.existsSync(BACKUP)) {
  console.error(`No ${BACKUP} found — nothing to import.`);
  process.exit(1);
}

// Parents before children so foreign keys resolve.
const ORDER = [
  "users", "agent_profiles", "sessions", "zip_codes", "leads",
  "lead_assignments", "appointments", "transactions", "activation_payments",
  "notifications", "agreement_versions", "audit_logs", "user_settings",
];

const data = JSON.parse(fs.readFileSync(BACKUP, "utf8"));
const pool = new Pool({ connectionString: url });

async function columnsOf(table) {
  const { rows } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
    [table]
  );
  return new Set(rows.map((r) => r.column_name));
}

let grandTotal = 0;
for (const table of ORDER) {
  const rows = data[table];
  if (!Array.isArray(rows) || rows.length === 0) continue;

  const existing = await columnsOf(table);
  if (existing.size === 0) {
    console.log(`  skip ${table} (no such table)`);
    continue;
  }
  const cols = Object.keys(rows[0]).filter((c) => existing.has(c));
  const quoted = cols.map((c) => `"${c}"`).join(", ");

  let inserted = 0;
  for (const row of rows) {
    const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
    const holders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const res = await pool.query(
      `INSERT INTO ${table} (${quoted}) VALUES (${holders}) ON CONFLICT DO NOTHING`,
      values
    );
    inserted += res.rowCount ?? 0;
  }

  // Explicit ids were inserted, so move the sequence past them.
  if (existing.has("id")) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'),
                     GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${table}), 1))`
    );
  }

  grandTotal += inserted;
  console.log(`  ${String(inserted).padStart(4)} → ${table}`);
}

await pool.end();
console.log(`\nImported ${grandTotal} rows.`);
