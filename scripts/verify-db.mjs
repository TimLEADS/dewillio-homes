/**
 * End-to-end check against the real database.
 *   npm run verify-db
 * Reads DATABASE_URL from .env.local. Creates the schema if absent, seeds the
 * demo data on an empty database, then exercises the query paths the app uses.
 */
import { getDb } from "../src/lib/db.ts";

const db = getDb();
const fail = (msg) => { console.error("FAIL: " + msg); process.exitCode = 1; };

console.log("Connecting and preparing schema (first query triggers migrate + seed)...");
const tables = await db
  .prepare(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  )
  .all();
console.log(`  ${tables.length} tables: ${tables.map((t) => t.table_name).join(", ")}`);
if (tables.length < 13) fail(`expected 13 tables, found ${tables.length}`);

// COUNT() must come back as a number, not a string — the int8 coercion.
const users = await db.prepare("SELECT COUNT(*) AS c FROM users").get();
console.log(`  users: ${users.c} (typeof ${typeof users.c})`);
if (typeof users.c !== "number") fail("COUNT() returned a string; int8 coercion is broken");

// Positional placeholders.
const admin = await db.prepare("SELECT id, email, role FROM users WHERE role = ? ORDER BY id LIMIT 1").get("super_admin");
console.log(`  super admin: ${admin ? admin.email : "(none)"}`);
if (!admin) fail("no super_admin found after seed");

// SUM()/numeric coercion.
const fees = await db.prepare("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions").get();
console.log(`  referral fee sum: ${fees.s} (typeof ${typeof fees.s})`);
if (typeof fees.s !== "number") fail("SUM() returned a string");

// Named placeholders + RETURNING, then roll it back by deleting.
const probe = await db
  .prepare(
    `INSERT INTO audit_logs (actor_id, actor_role, action, entity, entity_id, details, created_at)
     VALUES (@actor_id, @actor_role, @action, @entity, @entity_id, @details, @created_at)
     RETURNING id`
  )
  .get({
    actor_id: null, actor_role: "system", action: "verify_db", entity: "verification",
    entity_id: null, details: null, created_at: new Date().toISOString(),
  });
console.log(`  named-param insert returned id: ${probe?.id}`);
if (!probe?.id) fail("RETURNING id gave nothing back for a named-parameter insert");

// Real transaction: write then roll back via a thrown error.
let rolledBack = false;
try {
  await db.transaction(async (tx) => {
    await tx.prepare("UPDATE audit_logs SET action = ? WHERE id = ?").run("verify_db_rollback", probe.id);
    throw new Error("intentional rollback");
  });
} catch {
  rolledBack = true;
}
const after = await db.prepare("SELECT action FROM audit_logs WHERE id = ?").get(probe.id);
console.log(`  transaction rollback: threw=${rolledBack}, action still "${after?.action}"`);
if (!rolledBack || after?.action !== "verify_db") fail("transaction did not roll back");

await db.prepare("DELETE FROM audit_logs WHERE id = ?").run(probe.id);

const agreement = await db.prepare("SELECT version, active FROM agreement_versions WHERE active = 1").get();
console.log(`  active agreement: ${agreement ? agreement.version : "(none)"}`);
if (!agreement) fail("no active agreement version");

console.log(process.exitCode ? "\nSome checks FAILED (see above)." : "\nAll database checks passed.");
process.exit(process.exitCode ?? 0);
