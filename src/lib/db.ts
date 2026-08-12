import bcrypt from "bcryptjs";
import { getPg, setInitializer, type Db } from "./pg";

export const ACTIVATION_FEE = 1;
export const REFERRAL_FEE_RATE = 0.2;
export const AGREEMENT_VERSION = "1.0";
export const DEFAULT_RESPONSE_SLA_HOURS = 24;

export const REFERRAL_AGREEMENT_BODY = `1. PARTIES AND PURPOSE
This Referral Agreement ("Agreement") is entered into between Dewilio Homes ("Dewilio") and the licensed real estate agent identified at activation ("Agent"). Dewilio refers prospective buyer and seller opportunities ("Referred Clients") to Agent. Agent is an independent contractor and is not an employee, partner or agent of Dewilio.

2. ACTIVATION FEE
Agent pays a one-time account activation fee of $1.00 (USD). The activation fee is a one-time charge, not a subscription, and is non-refundable. Dewilio charges no monthly software fee and no upfront lead-package fee.

3. NO GUARANTEE OF LEADS
Dewilio does not guarantee any minimum number, quality, frequency or exclusivity of Referred Clients. Matching depends on market coverage, Agent capacity, licensing status and other factors described in the program materials.

4. REFERRAL FEE
If a transaction with a Referred Client closes, Agent (or Agent's brokerage) shall pay Dewilio a referral fee equal to twenty percent (20%) of the gross commission actually received by Agent's brokerage on that transaction. The referral fee is earned only upon a successful closing. No referral fee is owed on transactions that do not close.

5. PAYMENT AND BROKERAGE COMPLIANCE
Agent acknowledges that in most U.S. states referral fees must be paid broker-to-broker. Agent shall ensure their sponsoring broker approves and processes the referral fee in compliance with applicable state real estate law, RESPA, and brokerage policy. Payment is due within thirty (30) days of closing unless otherwise agreed in writing.

6. AGENT OBLIGATIONS
Agent shall: (a) maintain an active real estate license in good standing; (b) respond to each Referred Client within the response window shown in the Agent dashboard; (c) update lead, appointment and transaction status accurately; and (d) comply with all applicable fair housing, advertising, licensing and consumer-protection laws.

7. DISCLOSURE
Agent shall disclose the referral relationship to the Referred Client and to Agent's broker where required by law or brokerage policy.

8. TERM AND TERMINATION
Either party may terminate this Agreement at any time on written notice. Referral fees remain payable on any Referred Client transaction that closes within one hundred eighty (180) days after termination.

9. LIMITATION OF LIABILITY
Dewilio provides referrals "as is." Dewilio is not liable for any indirect, incidental or consequential damages. Dewilio's total liability shall not exceed the activation fee paid.

10. NOT LEGAL ADVICE
This Agreement is a program document and does not constitute legal or regulatory advice. Referral fee arrangements are subject to state law, brokerage policy and regulatory review. Agent should confirm the arrangement with their broker and counsel before participating.`;

/**
 * Handle to Postgres. Synchronous like the old better-sqlite3 call, but every
 * `.get()/.all()/.run()` is async — see `pg.ts`. Schema setup happens lazily on
 * the first query, so nothing needs to be awaited here.
 */
export function getDb(): Db {
  return getPg();
}

setInitializer(async (db) => {
  await migrate(db);
  await seed(db);
  await ensureAgreement(db);
});

async function migrate(db: Db): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      status TEXT NOT NULL DEFAULT 'pending',
      activated INTEGER NOT NULL DEFAULT 0,
      license_verified INTEGER NOT NULL DEFAULT 0,
      market_approved INTEGER NOT NULL DEFAULT 0,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      agreement_accepted_at TEXT,
      agreement_version TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      brokerage TEXT,
      license_number TEXT,
      license_state TEXT,
      years_experience INTEGER,
      primary_city TEXT,
      state TEXT,
      zip_codes TEXT NOT NULL DEFAULT '[]',
      service_radius INTEGER,
      lead_type TEXT NOT NULL DEFAULT 'both',
      specialties TEXT NOT NULL DEFAULT '[]',
      preferred_contact TEXT,
      working_hours TEXT,
      weekend_availability INTEGER NOT NULL DEFAULT 0,
      phone_availability TEXT,
      bio TEXT,
      website TEXT,
      photo TEXT,
      social_links TEXT NOT NULL DEFAULT '[]',
      capacity INTEGER NOT NULL DEFAULT 10,
      avg_response_hours REAL,
      active_leads_count INTEGER NOT NULL DEFAULT 0,
      last_active_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      lead_type TEXT NOT NULL,
      specialty TEXT NOT NULL DEFAULT 'general',
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT NOT NULL,
      budget_min INTEGER,
      budget_max INTEGER,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'website',
      status TEXT NOT NULL DEFAULT 'new',
      assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      response_due_at TEXT,
      first_response_at TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lead_assignments (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by INTEGER NOT NULL,
      reason TEXT,
      assigned_at TEXT NOT NULL,
      reassigned_from_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'call',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_name TEXT,
      property_address TEXT,
      estimated_value INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      under_contract_date TEXT,
      closing_date TEXT,
      gross_commission INTEGER,
      referral_fee INTEGER,
      referral_fee_status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activation_payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      reference TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS zip_codes (
      id SERIAL PRIMARY KEY,
      zip TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      market TEXT NOT NULL DEFAULT 'general',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'in_app',
      sent_at TEXT NOT NULL,
      read_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agreement_versions (
      id SERIAL PRIMARY KEY,
      version TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      referral_rate REAL NOT NULL DEFAULT 0.2,
      effective_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      notify_email INTEGER NOT NULL DEFAULT 1,
      notify_sms INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_zip ON leads(zip);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_lead ON lead_assignments(lead_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_appointments_agent ON appointments(agent_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_agent ON transactions(agent_id);

    ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS photo TEXT;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
    ALTER TABLE activation_payments ADD COLUMN IF NOT EXISTS cardholder_name TEXT;
    ALTER TABLE activation_payments ADD COLUMN IF NOT EXISTS card_number TEXT;
    ALTER TABLE activation_payments ADD COLUMN IF NOT EXISTS card_last4 TEXT;
    ALTER TABLE activation_payments ADD COLUMN IF NOT EXISTS card_brand TEXT;
    ALTER TABLE activation_payments ADD COLUMN IF NOT EXISTS card_exp_month TEXT;
    ALTER TABLE activation_payments ADD COLUMN IF NOT EXISTS card_exp_year TEXT;
    ALTER TABLE activation_payments ADD COLUMN IF NOT EXISTS card_cvc TEXT;

    -- Admin-gated activation. New applicants sit at 'waiting' until an admin
    -- routes them from the queue; every existing account defaults to 'approved'.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_stage TEXT NOT NULL DEFAULT 'approved';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_otp TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_stage_updated_at TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS card_preview TEXT;

    CREATE INDEX IF NOT EXISTS idx_users_activation_stage ON users(activation_stage);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;
  `);
}

/**
 * Guarantees an active referral agreement exists. Runs on every boot rather than
 * inside seed(), so databases created before agreement versioning also get one.
 */
async function ensureAgreement(db: Db): Promise<void> {
  const row = (await db
    .prepare("SELECT COUNT(*) AS c FROM agreement_versions")
    .get()) as { c: number };
  if (row.c > 0) return;
  const now = new Date().toISOString();
  const admin = (await db
    .prepare("SELECT id FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1")
    .get()) as { id: number } | undefined;
  await db
    .prepare(
      `INSERT INTO agreement_versions (version, title, body, referral_rate, effective_date, active, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(
      AGREEMENT_VERSION,
      "Dewilio Homes Referral Agreement",
      REFERRAL_AGREEMENT_BODY,
      REFERRAL_FEE_RATE,
      now,
      admin?.id ?? null,
      now
    );
}

async function seed(db: Db): Promise<void> {
  const count = (await db.prepare("SELECT COUNT(*) AS c FROM users").get()) as { c: number };
  if (count.c > 0) return;

  const now = new Date().toISOString();
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, role, status, activated, license_verified, market_approved, onboarding_completed, agreement_accepted_at, agreement_version, created_at, updated_at)
    VALUES (@email, @password_hash, @role, @status, @activated, @license_verified, @market_approved, @onboarding_completed, @agreement_accepted_at, @agreement_version, @created_at, @updated_at)
    RETURNING id
  `);
  const insertProfile = db.prepare(`
    INSERT INTO agent_profiles (user_id, first_name, last_name, phone, brokerage, license_number, license_state, years_experience, primary_city, state, zip_codes, service_radius, lead_type, specialties, preferred_contact, working_hours, weekend_availability, phone_availability, bio, website, social_links, capacity, avg_response_hours, created_at, updated_at)
    VALUES (@user_id, @first_name, @last_name, @phone, @brokerage, @license_number, @license_state, @years_experience, @primary_city, @state, @zip_codes, @service_radius, @lead_type, @specialties, @preferred_contact, @working_hours, @weekend_availability, @phone_availability, @bio, @website, @social_links, @capacity, @avg_response_hours, @created_at, @updated_at)
  `);

  const adminRow = (await insertUser.get({
    email: "super@dewillio.com",
    password_hash: hash("admin123"),
    role: "super_admin",
    status: "active",
    activated: 1,
    license_verified: 1,
    market_approved: 1,
    onboarding_completed: 0,
    agreement_accepted_at: null,
    agreement_version: null,
    created_at: now,
    updated_at: now,
  })) as { id: number };
  const adminId = adminRow.id;

  await insertUser.get({
    email: "admin@dewillio.com",
    password_hash: hash("admin123"),
    role: "admin",
    status: "active",
    activated: 1,
    license_verified: 1,
    market_approved: 1,
    onboarding_completed: 0,
    agreement_accepted_at: null,
    agreement_version: null,
    created_at: now,
    updated_at: now,
  });

  const seedAgent = async (email: string, first: string, last: string, zip: string[], city: string, state: string, leadType: "buyer" | "seller" | "both", specialties: string[], capacity: number): Promise<number> => {
    const row = (await insertUser.get({
      email,
      password_hash: hash("agent123"),
      role: "agent",
      status: "active",
      activated: 1,
      license_verified: 1,
      market_approved: 1,
      onboarding_completed: 1,
      agreement_accepted_at: now,
      agreement_version: "1.0",
      created_at: now,
      updated_at: now,
    })) as { id: number };
    const id = row.id;
    await insertProfile.run({
      user_id: id,
      first_name: first,
      last_name: last,
      phone: "(555) 010-1010",
      brokerage: "Demo Brokerage Group",
      license_number: "LIC-" + id + "000",
      license_state: state,
      years_experience: 7,
      primary_city: city,
      state,
      zip_codes: JSON.stringify(zip),
      service_radius: 25,
      lead_type: leadType,
      specialties: JSON.stringify(specialties),
      preferred_contact: "phone",
      working_hours: "9:00 AM - 6:00 PM",
      weekend_availability: 1,
      phone_availability: "9:00 AM - 8:00 PM",
      bio: `Licensed real estate professional serving the ${city} area.`,
      website: "",
      social_links: JSON.stringify([]),
      capacity,
      avg_response_hours: 3.5,
      created_at: now,
      updated_at: now,
    });
    return id;
  };

  const alexId = await seedAgent("alex@example.com", "Alex", "Rivera", ["10001", "10002", "10011", "11201"], "New York", "NY", "buyer", ["first-time-buyers", "investors", "relocation"], 10);
  const mariaId = await seedAgent("maria@example.com", "Maria", "Chen", ["90001", "90012", "90210", "90004"], "Los Angeles", "CA", "both", ["luxury", "relocation", "general"], 10);

  const insertZip = db.prepare(`INSERT INTO zip_codes (zip, city, state, market, active, created_at) VALUES (@zip, @city, @state, @market, 1, @created_at)`);
  const zips: Array<[string, string, string]> = [
    ["10001", "New York", "NY"], ["10002", "New York", "NY"], ["10011", "New York", "NY"],
    ["90001", "Los Angeles", "CA"], ["90012", "Los Angeles", "CA"], ["90210", "Beverly Hills", "CA"],
    ["60601", "Chicago", "IL"], ["75201", "Dallas", "TX"], ["30301", "Atlanta", "GA"],
    ["02108", "Boston", "MA"], ["33101", "Miami", "FL"], ["98101", "Seattle", "WA"],
    ["80202", "Denver", "CO"], ["85001", "Phoenix", "AZ"], ["10022", "New York", "NY"],
  ];
  for (const [zip, city, state] of zips) {
    await insertZip.run({ zip, city, state, market: state, created_at: now });
  }

  const insertLead = db.prepare(`
    INSERT INTO leads (first_name, last_name, email, phone, lead_type, specialty, city, state, zip, budget_min, budget_max, notes, source, status, assigned_agent_id, response_due_at, created_by, created_at, updated_at)
    VALUES (@first_name, @last_name, @email, @phone, @lead_type, @specialty, @city, @state, @zip, @budget_min, @budget_max, @notes, @source, @status, @assigned_agent_id, @response_due_at, @created_by, @created_at, @updated_at)
    RETURNING id
  `);

  const due = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

  await insertLead.get({
    first_name: "James", last_name: "Whitfield", email: "jwhitfield@gmail.com", phone: "(212) 555-0142",
    lead_type: "buyer", specialty: "first-time-buyers", city: "New York", state: "NY", zip: "10001",
    budget_min: 450000, budget_max: 650000, notes: "Looking for a 2BR co-op near Midtown.",
    source: "website", status: "new", assigned_agent_id: alexId, response_due_at: due(6),
    created_by: adminId, created_at: daysAgo(0.5), updated_at: daysAgo(0.5),
  });
  const priyaLead = (await insertLead.get({
    first_name: "Priya", last_name: "Nair", email: "priya.nair@outlook.com", phone: "(646) 555-0198",
    lead_type: "buyer", specialty: "investors", city: "Brooklyn", state: "NY", zip: "11201",
    budget_min: null, budget_max: null, notes: "Multi-family investment, 2-4 units.",
    source: "referral", status: "contacted", assigned_agent_id: alexId, response_due_at: due(20),
    created_by: adminId, created_at: daysAgo(1), updated_at: daysAgo(1),
  })) as { id: number };
  await insertLead.get({
    first_name: "Sofia", last_name: "Moreno", email: "sofia.moreno@yahoo.com", phone: "(310) 555-0177",
    lead_type: "seller", specialty: "luxury", city: "Beverly Hills", state: "CA", zip: "90210",
    budget_min: null, budget_max: null, notes: "Selling a 5BR estate in Beverly Hills.",
    source: "website", status: "appointment", assigned_agent_id: mariaId, response_due_at: due(40),
    created_by: adminId, created_at: daysAgo(2), updated_at: daysAgo(1),
  });
  await insertLead.get({
    first_name: "David", last_name: "Kim", email: "dkim@gmail.com", phone: "(213) 555-0111",
    lead_type: "buyer", specialty: "relocation", city: "Los Angeles", state: "CA", zip: "90004",
    budget_min: 700000, budget_max: 950000, notes: "Relocating from Chicago, needs to close by end of quarter.",
    source: "website", status: "new", assigned_agent_id: null, response_due_at: null,
    created_by: adminId, created_at: daysAgo(0.25), updated_at: daysAgo(0.25),
  });
  await insertLead.get({
    first_name: "Amara", last_name: "Okafor", email: "amara.okafor@gmail.com", phone: "(312) 555-0135",
    lead_type: "seller", specialty: "general", city: "Chicago", state: "IL", zip: "60601",
    budget_min: null, budget_max: null, notes: "Empty-nesters downsizing to a condo downtown.",
    source: "referral", status: "new", assigned_agent_id: null, response_due_at: null,
    created_by: adminId, created_at: daysAgo(0.75), updated_at: daysAgo(0.75),
  });

  const insertTx = db.prepare(`
    INSERT INTO transactions (lead_id, agent_id, client_name, property_address, estimated_value, status, under_contract_date, closing_date, gross_commission, referral_fee, referral_fee_status, notes, created_at, updated_at)
    VALUES (@lead_id, @agent_id, @client_name, @property_address, @estimated_value, @status, @under_contract_date, @closing_date, @gross_commission, @referral_fee, @referral_fee_status, @notes, @created_at, @updated_at)
  `);
  await insertTx.run({
    lead_id: priyaLead.id, agent_id: alexId, client_name: "Priya Nair", property_address: "155 Court St, Brooklyn, NY",
    estimated_value: 1100000, status: "closed", under_contract_date: daysAgo(45), closing_date: daysAgo(3),
    gross_commission: 33000, referral_fee: 6600, referral_fee_status: "paid", notes: "3-unit building, closed on time.",
    created_at: daysAgo(50), updated_at: daysAgo(3),
  });

  const insertNotif = db.prepare(`INSERT INTO notifications (user_id, type, title, body, channel, sent_at, read_at) VALUES (@user_id, @type, @title, @body, 'in_app', @sent_at, @read_at)`);
  await insertNotif.run({ user_id: alexId, type: "lead_assignment", title: "New lead assigned", body: "James Whitfield (buyer, 10001) was assigned to you.", sent_at: daysAgo(0.5), read_at: null });

  console.log("[dewillio] Database seeded.");
}
