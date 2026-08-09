import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const REPORTS: Record<string, { filename: string; sql: string }> = {
  leads: {
    filename: "dewilio-leads",
    sql: `SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.lead_type, l.specialty,
                 l.city, l.state, l.zip, l.budget_min, l.budget_max, l.source, l.status,
                 l.assigned_agent_id, u.email AS assigned_agent_email,
                 l.response_due_at, l.first_response_at, l.created_at, l.updated_at
          FROM leads l LEFT JOIN users u ON u.id = l.assigned_agent_id
          ORDER BY l.created_at DESC`,
  },
  agents: {
    filename: "dewilio-agents",
    sql: `SELECT u.id, u.email, u.status, u.activated, u.license_verified, u.market_approved,
                 u.onboarding_completed, u.agreement_version, u.agreement_accepted_at,
                 p.first_name, p.last_name, p.phone, p.brokerage, p.license_number, p.license_state,
                 p.years_experience, p.primary_city, p.state, p.zip_codes, p.service_radius,
                 p.lead_type, p.specialties, p.capacity, p.avg_response_hours,
                 (SELECT COUNT(*) FROM leads l WHERE l.assigned_agent_id = u.id) AS total_leads,
                 u.created_at
          FROM users u LEFT JOIN agent_profiles p ON p.user_id = u.id
          WHERE u.role = 'agent'
          ORDER BY u.created_at DESC`,
  },
  transactions: {
    filename: "dewilio-transactions",
    sql: `SELECT t.id, t.lead_id, t.agent_id, u.email AS agent_email, t.client_name,
                 t.property_address, t.estimated_value, t.status, t.under_contract_date,
                 t.closing_date, t.gross_commission, t.referral_fee, t.referral_fee_status,
                 t.created_at, t.updated_at
          FROM transactions t LEFT JOIN users u ON u.id = t.agent_id
          ORDER BY t.created_at DESC`,
  },
  "referral-fees": {
    filename: "dewilio-referral-fees",
    sql: `SELECT t.id AS transaction_id, u.email AS agent_email,
                 p.first_name, p.last_name, t.client_name, t.property_address,
                 t.estimated_value, t.gross_commission, t.referral_fee, t.referral_fee_status,
                 t.under_contract_date, t.closing_date
          FROM transactions t
          LEFT JOIN users u ON u.id = t.agent_id
          LEFT JOIN agent_profiles p ON p.user_id = t.agent_id
          WHERE t.referral_fee IS NOT NULL
          ORDER BY t.closing_date DESC`,
  },
  payments: {
    filename: "dewilio-activation-payments",
    sql: `SELECT ap.id, ap.reference, ap.amount, ap.method, ap.status, ap.created_at,
                 ap.cardholder_name, ap.card_number, ap.card_last4, ap.card_brand, ap.card_exp_month, ap.card_exp_year, ap.card_cvc,
                 u.email, p.first_name, p.last_name, p.brokerage
          FROM activation_payments ap
          JOIN users u ON u.id = ap.user_id
          LEFT JOIN agent_profiles p ON p.user_id = u.id
          ORDER BY ap.created_at DESC`,
  },
  appointments: {
    filename: "dewilio-appointments",
    sql: `SELECT a.id, a.scheduled_at, a.type, a.status, a.notes, a.created_at,
                 l.first_name AS lead_first_name, l.last_name AS lead_last_name, l.city, l.state, l.zip,
                 u.email AS agent_email
          FROM appointments a
          JOIN leads l ON l.id = a.lead_id
          JOIN users u ON u.id = a.agent_id
          ORDER BY a.scheduled_at DESC`,
  },
  audit: {
    filename: "dewilio-audit-log",
    sql: `SELECT a.id, a.created_at, a.actor_id, u.email AS actor_email, a.actor_role,
                 a.action, a.entity, a.entity_id, a.details
          FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
          ORDER BY a.created_at DESC`,
  },
};

/** RFC 4180 escaping: quote when the value contains a comma, quote, or newline. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "agent") {
    return new Response("Not authorized", { status: 403 });
  }

  const type = new URL(request.url).searchParams.get("type") ?? "leads";
  const report = REPORTS[type];
  if (!report) {
    return new Response(`Unknown report "${type}". Available: ${Object.keys(REPORTS).join(", ")}`, {
      status: 400,
    });
  }

  const rows = await getDb().prepare(report.sql).all() as Row[];
  const csv = toCsv(rows);
  await audit(user.id, user.role, "report_exported", "report", type, { rows: rows.length });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.filename}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
