/**
 * Runs the real application data layer against an in-process Postgres (PGlite),
 * so the migration can be verified without a Neon account or a running server.
 *
 *   npm run test:local
 *
 * PGlite is the actual Postgres engine compiled to WASM, so DDL, placeholders,
 * RETURNING, ON CONFLICT and transactions all behave as they will on Neon.
 */
import { PGlite } from "@electric-sql/pglite";
import { setPoolOverride } from "../src/lib/pg.ts";

const pg = new PGlite();
await pg.waitReady;

/** Adapts PGlite to the small slice of the `pg.Pool` interface pg.ts uses. */
function asResult(res) {
  return {
    rows: res.rows ?? [],
    fields: (res.fields ?? []).map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
    rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
  };
}

const run = async (text, values) => {
  // No values -> simple protocol, which is what multi-statement DDL needs.
  if (values === undefined) return asResult(await pg.exec(text).then((r) => r[r.length - 1] ?? {}));
  return asResult(await pg.query(text, values));
};

const pool = {
  query: run,
  connect: async () => ({ query: run, release() {} }),
};
setPoolOverride(pool);

// Imported after the override so the first query uses PGlite.
const { getDb } = await import("../src/lib/db.ts");
const queries = await import("../src/lib/queries.ts");
const assignment = await import("../src/lib/assignment.ts");
const automations = await import("../src/lib/automations.ts");
const notifier = await import("../src/lib/notifier.ts");
const { audit } = await import("../src/lib/audit.ts");

const db = getDb();
let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
};

console.log("\n1. Schema + seed (triggered by the first query)");
const tables = await db
  .prepare(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  )
  .all();
check("14 tables created", tables.length === 14, `got ${tables.length}: ${tables.map((t) => t.table_name).join(",")}`);

const userCount = await db.prepare("SELECT COUNT(*) AS c FROM users").get();
check("seed inserted users", userCount.c === 4, `got ${userCount.c}`);
check("COUNT() is a number, not a string", typeof userCount.c === "number", `typeof ${typeof userCount.c}`);

const sum = await db.prepare("SELECT COALESCE(SUM(referral_fee),0) AS s FROM transactions").get();
check("SUM() is a number", typeof sum.s === "number", `typeof ${typeof sum.s} value ${sum.s}`);

console.log("\n2. Seeded relationships");
const seededTx = await db.prepare("SELECT lead_id, agent_id FROM transactions LIMIT 1").get();
const priya = await db.prepare("SELECT id FROM leads WHERE first_name = 'Priya'").get();
check("demo transaction points at the real Priya lead", seededTx?.lead_id === priya?.id, `tx.lead_id=${seededTx?.lead_id} priya.id=${priya?.id}`);
const agreement = await db.prepare("SELECT version FROM agreement_versions WHERE active = 1").get();
check("an active agreement exists", agreement?.version === "1.0", `got ${agreement?.version}`);

console.log("\n3. Placeholders");
const byRole = await db.prepare("SELECT email FROM users WHERE role = ? ORDER BY id LIMIT 1").get("super_admin");
check("positional ? binding", byRole?.email === "super@dewillio.com", `got ${byRole?.email}`);

const named = await db
  .prepare(
    `INSERT INTO zip_codes (zip, city, state, market, active, created_at)
     VALUES (@zip, @city, @state, @market, 1, @created_at) RETURNING id, zip`
  )
  .get({ zip: "99999", city: "Testville", state: "TS", market: "TS", created_at: new Date().toISOString() });
check("named @param binding + RETURNING", named?.zip === "99999" && typeof named?.id === "number", JSON.stringify(named));

console.log("\n4. Transactions");
const before = (await db.prepare("SELECT COUNT(*) AS c FROM zip_codes").get()).c;
let threw = false;
try {
  await db.transaction(async (tx) => {
    await tx.prepare("INSERT INTO zip_codes (zip, city, state, market, active, created_at) VALUES (?,?,?,?,1,?)")
      .run("00000", "Rollback", "RB", "RB", new Date().toISOString());
    throw new Error("intentional");
  });
} catch {
  threw = true;
}
const after = (await db.prepare("SELECT COUNT(*) AS c FROM zip_codes").get()).c;
check("failed transaction rolls back", threw && after === before, `before=${before} after=${after}`);

const committed = await db.transaction(async (tx) => {
  const row = await tx
    .prepare("INSERT INTO zip_codes (zip, city, state, market, active, created_at) VALUES (?,?,?,?,1,?) RETURNING id")
    .get("11111", "Committed", "CM", "CM", new Date().toISOString());
  return row.id;
});
const foundCommitted = await db.prepare("SELECT id FROM zip_codes WHERE id = ?").get(committed);
check("successful transaction commits", !!foundCommitted, `id ${committed}`);

console.log("\n5. Notification dedupe (ON CONFLICT DO NOTHING)");
const first = await notifier.createNotificationOnce(1, "test", "T", "B", "dedupe-key-1");
const second = await notifier.createNotificationOnce(1, "test", "T", "B", "dedupe-key-1");
check("first insert wins", first === true);
check("duplicate is suppressed", second === false);
const noKey1 = await notifier.createNotification(1, "test", "T", "B");
const noKey2 = await notifier.createNotification(1, "test", "T", "B");
check("null dedupe_key still allows repeats", noKey1 !== null && noKey2 !== null && noKey1 !== noKey2);

console.log("\n6. Application query paths");
const agent = await db.prepare("SELECT id FROM users WHERE email = 'alex@example.com'").get();
const aStats = await queries.agentStats(agent.id);
check("agentStats returns numbers", typeof aStats.newLeads === "number" && typeof aStats.feesEarned === "number", JSON.stringify(aStats).slice(0, 120));
const adm = await queries.adminStats();
check("adminStats returns numbers", typeof adm.agents === "number" && typeof adm.activationRevenue === "number", JSON.stringify(adm));
check("adminStats counts 2 seeded agents", adm.agents === 2, `got ${adm.agents}`);

const leads = await queries.agentLeads(agent.id);
check("agentLeads (correlated subquery) runs", Array.isArray(leads) && leads.length > 0, `got ${leads.length}`);
const appts = await queries.agentAppointments(agent.id);
check("agentAppointments runs", Array.isArray(appts));
const txs = await queries.agentTransactions(agent.id);
check("agentTransactions runs", Array.isArray(txs) && txs.length === 1, `got ${txs.length}`);

console.log("\n7. Assignment + automations");
const unassigned = await db.prepare("SELECT id FROM leads WHERE assigned_agent_id IS NULL LIMIT 1").get();
const result = await assignment.assignLead(unassigned.id, 1);
check("assignLead assigns an eligible agent", result.assigned === true, JSON.stringify(result));
const reassigned = await db.prepare("SELECT assigned_agent_id FROM leads WHERE id = ?").get(unassigned.id);
check("lead row was updated", reassigned.assigned_agent_id === result.agentId);
const auto = await automations.runAutomations();
check("runAutomations completes", typeof auto.missedResponses === "number", JSON.stringify(auto));
const auto2 = await automations.runAutomations();
check("runAutomations is idempotent (dedupe holds)", JSON.stringify(auto) === JSON.stringify(auto2), `${JSON.stringify(auto)} vs ${JSON.stringify(auto2)}`);

console.log("\n8. Audit log");
await audit(1, "super_admin", "test_action", "test", 42, { hello: "world" });
const logged = await db.prepare("SELECT action, entity_id, details FROM audit_logs WHERE action = 'test_action'").get();
check("audit row written with JSON details", logged?.entity_id === "42" && JSON.parse(logged.details).hello === "world", JSON.stringify(logged));

console.log("\n9. Signup + admin payments page (full card number)");
// Mirrors the transaction in actions/checkout.ts.
const signupNow = new Date().toISOString();
const newUserId = await db.transaction(async (tx) => {
  const u = await tx
    .prepare(
      `INSERT INTO users (email, password_hash, role, status, activated, license_verified, market_approved, onboarding_completed, agreement_accepted_at, agreement_version, created_at, updated_at)
       VALUES (?, ?, 'agent', 'pending', 1, 0, 0, 0, ?, ?, ?, ?)
       RETURNING id`
    )
    .get("newagent@example.com", "hash", signupNow, "1.0", signupNow, signupNow);
  await tx
    .prepare(
      `INSERT INTO activation_payments (user_id, amount, method, status, reference, created_at, cardholder_name, card_number, card_last4, card_brand, card_exp_month, card_exp_year, card_cvc)
       VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(u.id, 1, "test_card ••••4242", "DW-TEST-0001", signupNow, "New Agent",
         "4242424242424242", "4242", "Visa", "04", "2030", "123");
  await tx
    .prepare(
      `INSERT INTO agent_profiles (user_id, first_name, last_name, phone, brokerage, license_number, license_state, zip_codes, specialties, social_links, capacity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', 10, ?, ?)`
    )
    .run(u.id, "New", "Agent", "555", "Brokerage", "LIC1", "NY", signupNow, signupNow);
  return u.id;
});
check("signup transaction commits across 3 tables", typeof newUserId === "number");

const payRow = await db
  .prepare(
    `SELECT ap.card_number, ap.card_last4, ap.card_brand, ap.card_cvc, u.email, p.first_name
     FROM activation_payments ap
     JOIN users u ON u.id = ap.user_id
     LEFT JOIN agent_profiles p ON p.user_id = u.id
     WHERE ap.user_id = ?`
  )
  .get(newUserId);
check("admin payments query returns the full card number", payRow?.card_number === "4242424242424242", JSON.stringify(payRow));
check("joined profile + user resolve", payRow?.email === "newagent@example.com" && payRow?.first_name === "New");

const totals = await db
  .prepare(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS collected
     FROM activation_payments`
  )
  .get();
check("payments StatCard totals are numbers", typeof totals.count === "number" && typeof totals.collected === "number", JSON.stringify(totals));

console.log("\n10. Admin reports page (strict GROUP BY)");
const byAgent = await db
  .prepare(
    `SELECT p.first_name, p.last_name, u.email,
       COUNT(t.id) AS tx_count,
       COALESCE(SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END), 0) AS closed_count,
       COALESCE(SUM(t.referral_fee), 0) AS fees,
       COALESCE(SUM(CASE WHEN t.referral_fee_status = 'paid' THEN t.referral_fee ELSE 0 END), 0) AS paid
     FROM users u
     LEFT JOIN agent_profiles p ON p.user_id = u.id
     LEFT JOIN transactions t ON t.agent_id = u.id
     WHERE u.role = 'agent'
     GROUP BY u.id, p.user_id
     ORDER BY fees DESC`
  )
  .all();
check("per-agent report groups without error", byAgent.length >= 2, `got ${byAgent.length} rows`);
check("report aggregates are numbers", byAgent.every((r) => typeof r.tx_count === "number" && typeof r.fees === "number"), JSON.stringify(byAgent[0]));

console.log(
  failures === 0
    ? "\nAll local Postgres checks passed."
    : `\n${failures} CHECK(S) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
