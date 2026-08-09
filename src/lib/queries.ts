import { getDb } from "./db";
import type { Appointment, Lead, Transaction } from "./types";

/**
 * Each `.get()` is now a network round-trip to Postgres, so the independent
 * counts run concurrently rather than one after another.
 */
export async function agentStats(userId: number) {
  const db = getDb();
  const count = (sql: string) => db.prepare(sql).get(userId) as Promise<{ c: number }>;
  const sum = (sql: string) => db.prepare(sql).get(userId) as Promise<{ s: number }>;

  const [newLeads, activeLeads, appointments, closed, feesEarned, feesPaid, leads, notifications] =
    await Promise.all([
      count("SELECT COUNT(*) AS c FROM leads WHERE assigned_agent_id = ? AND status = 'new'"),
      count("SELECT COUNT(*) AS c FROM leads WHERE assigned_agent_id = ? AND status NOT IN ('closed','lost')"),
      count("SELECT COUNT(*) AS c FROM appointments WHERE agent_id = ? AND status IN ('scheduled','rescheduled')"),
      count("SELECT COUNT(*) AS c FROM transactions WHERE agent_id = ? AND status = 'closed'"),
      sum("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE agent_id = ? AND status = 'closed'"),
      sum("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE agent_id = ? AND referral_fee_status = 'paid'"),
      db
        .prepare("SELECT * FROM leads WHERE assigned_agent_id = ? ORDER BY created_at DESC LIMIT 5")
        .all(userId) as Promise<Lead[]>,
      db
        .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT 5")
        .all(userId) as Promise<
        Array<{ id: number; type: string; title: string; body: string; sent_at: string; read_at: string | null }>
      >,
    ]);

  return {
    newLeads: newLeads.c,
    activeLeads: activeLeads.c,
    appointments: appointments.c,
    closed: closed.c,
    feesEarned: feesEarned.s,
    feesPaid: feesPaid.s,
    leads,
    notifications,
  };
}

export interface AgentLeadRow extends Lead {
  agent_first_name: string | null;
  agent_last_name: string | null;
  appointment_status: string | null;
  appointment_at: string | null;
  appointment_type: string | null;
}

/**
 * Leads assigned to one agent, enriched with the agent's own name and the most
 * recent appointment so the list can show assignment + appointment status
 * without an N+1 query per row.
 */
export async function agentLeads(userId: number): Promise<AgentLeadRow[]> {
  return (await getDb()
    .prepare(
      `SELECT l.*,
              p.first_name AS agent_first_name,
              p.last_name  AS agent_last_name,
              a.status     AS appointment_status,
              a.scheduled_at AS appointment_at,
              a.type       AS appointment_type
       FROM leads l
       LEFT JOIN agent_profiles p ON p.user_id = l.assigned_agent_id
       LEFT JOIN appointments a
         ON a.id = (
           SELECT id FROM appointments
           WHERE lead_id = l.id AND agent_id = l.assigned_agent_id
           ORDER BY scheduled_at DESC LIMIT 1
         )
       WHERE l.assigned_agent_id = ?
       ORDER BY l.created_at DESC`
    )
    .all(userId)) as AgentLeadRow[];
}

export async function agentAppointments(userId: number): Promise<Array<Appointment & { lead_first_name: string; lead_last_name: string }>> {
  return (await getDb()
    .prepare(
      `SELECT a.*, l.first_name AS lead_first_name, l.last_name AS lead_last_name
       FROM appointments a JOIN leads l ON l.id = a.lead_id
       WHERE a.agent_id = ? ORDER BY a.scheduled_at DESC`
    )
    .all(userId)) as Array<Appointment & { lead_first_name: string; lead_last_name: string }>;
}

export async function agentTransactions(userId: number): Promise<Transaction[]> {
  return (await getDb()
    .prepare("SELECT * FROM transactions WHERE agent_id = ? ORDER BY created_at DESC")
    .all(userId)) as Transaction[];
}

export async function adminStats() {
  const db = getDb();
  const count = (sql: string, ...params: unknown[]) =>
    db.prepare(sql).get(...params) as Promise<{ c: number }>;
  const sum = (sql: string) => db.prepare(sql).get() as Promise<{ s: number }>;

  const [agents, pending, active, leads, unassigned, closed, feesDue, feesPaid, activationRevenue, missed] =
    await Promise.all([
      count("SELECT COUNT(*) AS c FROM users WHERE role = 'agent'"),
      count("SELECT COUNT(*) AS c FROM users WHERE role = 'agent' AND status = 'pending'"),
      count("SELECT COUNT(*) AS c FROM users WHERE role = 'agent' AND status = 'active'"),
      count("SELECT COUNT(*) AS c FROM leads"),
      count("SELECT COUNT(*) AS c FROM leads WHERE assigned_agent_id IS NULL"),
      count("SELECT COUNT(*) AS c FROM transactions WHERE status = 'closed'"),
      sum("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE referral_fee_status = 'closed_fee_due'"),
      sum("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE referral_fee_status = 'paid'"),
      sum("SELECT COALESCE(SUM(amount), 0) AS s FROM activation_payments"),
      count(
        "SELECT COUNT(*) AS c FROM leads WHERE status IN ('new','contacted') AND response_due_at IS NOT NULL AND response_due_at < ?",
        new Date().toISOString()
      ),
    ]);

  return {
    agents: agents.c,
    pendingAgents: pending.c,
    activeAgents: active.c,
    leads: leads.c,
    unassignedLeads: unassigned.c,
    closed: closed.c,
    feesDue: feesDue.s,
    feesPaid: feesPaid.s,
    activationRevenue: activationRevenue.s,
    missed: missed.c,
  };
}
