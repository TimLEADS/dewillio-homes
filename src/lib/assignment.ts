import { getDb, DEFAULT_RESPONSE_SLA_HOURS } from "./db";
import { audit } from "./audit";
import { createNotification } from "./notifier";
import type { AgentProfile, Lead, Specialty } from "./types";

export interface AssignmentResult {
  assigned: boolean;
  agentId: number | null;
  reason: string;
}

interface CandidateAgent {
  id: number;
  email: string;
  profile: AgentProfile;
  activeCount: number;
  score: number;
}

export function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function specialtyMatches(leadSpecialty: Specialty, agentSpecialties: string[]): boolean {
  return (
    agentSpecialties.includes(leadSpecialty) ||
    agentSpecialties.includes("general") ||
    leadSpecialty === "general"
  );
}

export function findBestAgent(lead: Lead): number | null {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT u.id, u.email, p.*,
         (SELECT COUNT(*) FROM leads l WHERE l.assigned_agent_id = u.id AND l.status NOT IN ('closed', 'lost')) AS activeCount
       FROM users u
       JOIN agent_profiles p ON p.user_id = u.id
       WHERE u.role = 'agent'
         AND u.status = 'active'
         AND u.activated = 1
         AND u.license_verified = 1
         AND u.market_approved = 1
         AND u.onboarding_completed = 1`
    )
    .all() as Array<Record<string, unknown>>;

  const candidates: CandidateAgent[] = rows.map((r) => {
    const profile: AgentProfile = {
      user_id: r.user_id as number,
      first_name: r.first_name as string,
      last_name: r.last_name as string,
      phone: (r.phone as string | null) ?? null,
      brokerage: (r.brokerage as string | null) ?? null,
      license_number: (r.license_number as string | null) ?? null,
      license_state: (r.license_state as string | null) ?? null,
      years_experience: (r.years_experience as number | null) ?? null,
      primary_city: (r.primary_city as string | null) ?? null,
      state: (r.state as string | null) ?? null,
      zip_codes: parseJsonArray(r.zip_codes),
      service_radius: (r.service_radius as number | null) ?? null,
      lead_type: (r.lead_type as AgentProfile["lead_type"]) ?? "both",
      specialties: parseJsonArray(r.specialties) as Specialty[],
      preferred_contact: (r.preferred_contact as string | null) ?? null,
      working_hours: (r.working_hours as string | null) ?? null,
      weekend_availability: (r.weekend_availability as number) ?? 0,
      phone_availability: (r.phone_availability as string | null) ?? null,
      bio: (r.bio as string | null) ?? null,
      website: (r.website as string | null) ?? null,
      social_links: parseJsonArray(r.social_links),
      capacity: (r.capacity as number) ?? 10,
      avg_response_hours: (r.avg_response_hours as number | null) ?? null,
      active_leads_count: (r.active_leads_count as number) ?? 0,
      last_active_at: (r.last_active_at as string | null) ?? null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
    };
    const id = r.id as number;
    const email = r.email as string;
    const activeCount = r.activeCount as number;
    return { id, email, profile, activeCount, score: 0 };
  });

  const eligible = candidates.filter((c) => c.activeCount < c.profile.capacity);
  if (eligible.length === 0) return null;

  for (const c of eligible) {
    const zipMatch = c.profile.zip_codes.includes(lead.zip);
    const regionMatch =
      !zipMatch &&
      c.profile.primary_city?.toLowerCase() === lead.city.toLowerCase() &&
      c.profile.state === lead.state;
    const typeMatch = c.profile.lead_type === "both" || c.profile.lead_type === lead.lead_type;
    const specMatch = specialtyMatches(lead.specialty, c.profile.specialties);

    let score = 0;
    if (zipMatch) score += 100;
    else if (regionMatch) score += 40;
    else if (c.profile.state === lead.state) score += 15;

    if (typeMatch) score += 30;
    if (specMatch) score += 25;
    if (c.profile.weekend_availability) score += 10;
    if (c.profile.avg_response_hours != null) {
      score += Math.max(0, Math.round(20 - c.profile.avg_response_hours));
    }
    c.score = score;
  }

  eligible.sort((a, b) => b.score - a.score || a.activeCount - b.activeCount);
  return eligible[0].id;
}

export function assignLead(leadId: number, assignedBy: number, manualAgentId: number | null = null): AssignmentResult {
  const db = getDb();
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId) as Lead | undefined;
  if (!lead) return { assigned: false, agentId: null, reason: "Lead not found" };

  const targetId = manualAgentId ?? findBestAgent(lead);
  if (!targetId) {
    return { assigned: false, agentId: null, reason: "No eligible agent available" };
  }

  const wasAssigned = lead.assigned_agent_id;
  const reasons: string[] = [];
  const agentRow = db.prepare("SELECT * FROM agent_profiles WHERE user_id = ?").get(targetId) as
    | (Omit<AgentProfile, "zip_codes" | "specialties" | "social_links"> & {
        zip_codes: string;
        specialties: string;
        social_links: string;
      })
    | undefined;
  const agentProfile = agentRow
    ? {
        ...agentRow,
        zip_codes: parseJsonArray(agentRow.zip_codes),
        specialties: parseJsonArray(agentRow.specialties),
        social_links: parseJsonArray(agentRow.social_links),
      }
    : undefined;
  if (agentProfile) {
    if (agentProfile.zip_codes.includes(lead.zip)) reasons.push("ZIP match");
    else if (agentProfile.state === lead.state) reasons.push("State match");
    if (agentProfile.lead_type === "both" || agentProfile.lead_type === lead.lead_type) reasons.push("Lead type match");
    if (specialtyMatches(lead.specialty, agentProfile.specialties)) reasons.push("Specialty match");
  }
  reasons.push("Capacity available");
  const reason = reasons.length ? "Auto-match: " + reasons.join(", ") : "Manual assignment";

  const now = new Date().toISOString();
  const dueAt = new Date(Date.now() + DEFAULT_RESPONSE_SLA_HOURS * 3600000).toISOString();

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO lead_assignments (lead_id, agent_id, assigned_by, reason, assigned_at, reassigned_from_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(leadId, targetId, assignedBy, reason, now, wasAssigned);
    db.prepare("UPDATE leads SET assigned_agent_id = ?, response_due_at = ?, updated_at = ? WHERE id = ?")
      .run(targetId, dueAt, now, leadId);
    db.prepare("UPDATE agent_profiles SET last_active_at = ?, updated_at = ? WHERE user_id = ?").run(now, now, targetId);
  });
  tx();

  const agent = db.prepare("SELECT email FROM users WHERE id = ?").get(targetId) as { email: string } | undefined;
  const phone = agentProfile?.phone ?? null;
  const title = "New lead assigned";
  const body = `${lead.first_name} ${lead.last_name} (${lead.lead_type}, ${lead.city}, ${lead.zip}) was assigned to you.`;
  createNotification(targetId, "lead_assignment", title, body, "in_app");
  if (agent?.email) void createNotification(targetId, "lead_assignment", title, body, "email");
  void phone;

  audit(assignedBy, "admin", "lead_assigned", "lead", leadId, { agentId: targetId, reason });

  return { assigned: true, agentId: targetId, reason };
}
