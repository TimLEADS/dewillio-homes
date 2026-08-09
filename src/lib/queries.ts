import { getDb } from "./db";
import type { Appointment, Lead, Transaction } from "./types";

export function agentStats(userId: number) {
  const db = getDb();
  const newLeads = db
    .prepare("SELECT COUNT(*) AS c FROM leads WHERE assigned_agent_id = ? AND status = 'new'")
    .get(userId) as { c: number };
  const activeLeads = db
    .prepare("SELECT COUNT(*) AS c FROM leads WHERE assigned_agent_id = ? AND status NOT IN ('closed','lost')")
    .get(userId) as { c: number };
  const appointments = db
    .prepare("SELECT COUNT(*) AS c FROM appointments WHERE agent_id = ? AND status IN ('scheduled','rescheduled')")
    .get(userId) as { c: number };
  const closed = db
    .prepare("SELECT COUNT(*) AS c FROM transactions WHERE agent_id = ? AND status = 'closed'")
    .get(userId) as { c: number };
  const feesEarned = db
    .prepare("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE agent_id = ? AND status = 'closed'")
    .get(userId) as { s: number };
  const feesPaid = db
    .prepare("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE agent_id = ? AND referral_fee_status = 'paid'")
    .get(userId) as { s: number };

  const leads = db
    .prepare("SELECT * FROM leads WHERE assigned_agent_id = ? ORDER BY created_at DESC LIMIT 5")
    .all(userId) as Lead[];
  const notifications = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT 5")
    .all(userId) as Array<{ id: number; type: string; title: string; body: string; sent_at: string; read_at: string | null }>;

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
export function agentLeads(userId: number): AgentLeadRow[] {
  return getDb()
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
    .all(userId) as AgentLeadRow[];
}

export function agentAppointments(userId: number): Array<Appointment & { lead_first_name: string; lead_last_name: string }> {
  return getDb()
    .prepare(
      `SELECT a.*, l.first_name AS lead_first_name, l.last_name AS lead_last_name
       FROM appointments a JOIN leads l ON l.id = a.lead_id
       WHERE a.agent_id = ? ORDER BY a.scheduled_at DESC`
    )
    .all(userId) as Array<Appointment & { lead_first_name: string; lead_last_name: string }>;
}

export function agentTransactions(userId: number): Transaction[] {
  return getDb()
    .prepare("SELECT * FROM transactions WHERE agent_id = ? ORDER BY created_at DESC")
    .all(userId) as Transaction[];
}

export function adminStats() {
  const db = getDb();
  const agents = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'agent'").get() as { c: number };
  const pending = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'agent' AND status = 'pending'").get() as { c: number };
  const active = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'agent' AND status = 'active'").get() as { c: number };
  const leads = db.prepare("SELECT COUNT(*) AS c FROM leads").get() as { c: number };
  const unassigned = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE assigned_agent_id IS NULL").get() as { c: number };
  const closed = db.prepare("SELECT COUNT(*) AS c FROM transactions WHERE status = 'closed'").get() as { c: number };
  const feesDue = db.prepare("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE referral_fee_status = 'closed_fee_due'").get() as { s: number };
  const feesPaid = db.prepare("SELECT COALESCE(SUM(referral_fee), 0) AS s FROM transactions WHERE referral_fee_status = 'paid'").get() as { s: number };
  const activationRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM activation_payments").get() as { s: number };
  const missed = db.prepare(
    "SELECT COUNT(*) AS c FROM leads WHERE status IN ('new','contacted') AND response_due_at IS NOT NULL AND response_due_at < ?"
  ).get(new Date().toISOString()) as { c: number };

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
