/**
 * Verifies the "same email, several accounts" change against a real Postgres
 * (PGlite), mirroring scripts/test-local.mjs.
 */
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";
import { setPoolOverride } from "../src/lib/pg.ts";

const pg = new PGlite();
await pg.waitReady;

const asResult = (res) => ({
  rows: res.rows ?? [],
  fields: (res.fields ?? []).map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
  rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
});
const run = async (text, values) =>
  values === undefined
    ? asResult(await pg.exec(text).then((r) => r[r.length - 1] ?? {}))
    : asResult(await pg.query(text, values));

setPoolOverride({
  query: run,
  connect: async () => ({ query: run, release() {} }),
});

const { getDb } = await import("../src/lib/db.ts");

// Same implementation as hashPassword/verifyPassword in src/lib/auth.ts, which
// cannot be imported here because it pulls in next/headers.
const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
const verifyPassword = (pw, hash) => bcrypt.compareSync(pw, hash);

const db = getDb();

let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
};

console.log("\n1. The unique constraint is actually gone");
const now = new Date().toISOString();
const dup = await db
  .prepare(
    `INSERT INTO users (email, password_hash, role, status, activated, license_verified, market_approved, onboarding_completed, created_at, updated_at)
     VALUES (?, ?, 'agent', 'pending', 1, 0, 0, 0, ?, ?) RETURNING id`
  )
  .all("shared@brokerage.com", hashPassword("first-password"), now, now);
check("first insert with an address succeeds", dup.length === 1, `got ${dup.length}`);

const dup2 = await db
  .prepare(
    `INSERT INTO users (email, password_hash, role, status, activated, license_verified, market_approved, onboarding_completed, created_at, updated_at)
     VALUES (?, ?, 'agent', 'pending', 1, 0, 0, 0, ?, ?) RETURNING id`
  )
  .all("shared@brokerage.com", hashPassword("second-password"), now, now);
check("second insert with the SAME address succeeds", dup2.length === 1, `got ${dup2.length}`);

const idx = await db
  .prepare("SELECT indexdef FROM pg_indexes WHERE tablename='users' AND indexname='idx_users_email'")
  .all();
check("replacement index exists for email lookups", idx.length === 1);

console.log("\n2. Login picks the account whose password matches");
const candidates = await db.prepare("SELECT * FROM users WHERE email = ?").all("shared@brokerage.com");
check("both accounts are returned for the address", candidates.length === 2, `got ${candidates.length}`);

const byFirst = candidates.find((c) => verifyPassword("first-password", c.password_hash));
const bySecond = candidates.find((c) => verifyPassword("second-password", c.password_hash));
check("first password resolves to the first account", byFirst?.id === dup[0].id);
check("second password resolves to the second account", bySecond?.id === dup2[0].id);
check(
  "the two accounts are genuinely different",
  byFirst?.id !== bySecond?.id && byFirst !== undefined && bySecond !== undefined
);
check(
  "a wrong password matches neither",
  candidates.every((c) => !verifyPassword("not-the-password", c.password_hash))
);

console.log("\n3. Card details still accept duplicates");
const pay = async (card) => {
  const r = await db
    .prepare(
      `INSERT INTO activation_payments (reference, user_id, amount, method, status, card_last4, card_number, created_at)
       VALUES (?, ?, ?, 'card', 'paid', ?, ?, ?) RETURNING id`
    )
    .all("DW-TEST-" + card, byFirst.id, 1, card.slice(-4), card, now);
  return r;
};
const p1 = await pay("4242424242424242");
const p2 = await pay("4242424242424242");
check("first payment on a card saves", p1.length === 1);
check("second payment on the SAME card saves", p2.length === 1);
check("both payments persisted", p1[0].id !== p2[0].id);

console.log(failures === 0 ? "\nAll duplicate-handling checks passed.\n" : `\n${failures} FAILED\n`);
process.exit(failures === 0 ? 0 : 1);