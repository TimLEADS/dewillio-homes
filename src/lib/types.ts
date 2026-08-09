export type Role = "super_admin" | "admin" | "agent";

export type UserStatus = "pending" | "active" | "suspended";

export type LeadType = "buyer" | "seller";

export type LeadStatus =
  | "new"
  | "contacted"
  | "engaged"
  | "appointment"
  | "under_contract"
  | "closed"
  | "lost";

export type Specialty =
  | "first-time-buyers"
  | "luxury"
  | "investors"
  | "relocation"
  | "commercial"
  | "general";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";

export type TransactionStatus = "pending" | "under_contract" | "closed";

export type ReferralFeeStatus = "pending" | "under_contract" | "closed_fee_due" | "paid" | "disputed";

export type NotificationChannel = "in_app" | "email" | "sms";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  activated: number;
  license_verified: number;
  market_approved: number;
  onboarding_completed: number;
  agreement_accepted_at: string | null;
  agreement_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentProfile {
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  brokerage: string | null;
  license_number: string | null;
  license_state: string | null;
  years_experience: number | null;
  primary_city: string | null;
  state: string | null;
  zip_codes: string[];
  service_radius: number | null;
  lead_type: LeadType | "both";
  specialties: Specialty[];
  preferred_contact: string | null;
  working_hours: string | null;
  weekend_availability: number;
  phone_availability: string | null;
  bio: string | null;
  website: string | null;
  social_links: string[];
  capacity: number;
  avg_response_hours: number | null;
  active_leads_count: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_type: LeadType;
  specialty: Specialty;
  city: string;
  state: string;
  zip: string;
  budget_min: number | null;
  budget_max: number | null;
  notes: string | null;
  source: string;
  status: LeadStatus;
  assigned_agent_id: number | null;
  response_due_at: string | null;
  first_response_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface LeadAssignment {
  id: number;
  lead_id: number;
  agent_id: number;
  assigned_by: number;
  reason: string;
  assigned_at: string;
  reassigned_from_id: number | null;
}

export interface Appointment {
  id: number;
  lead_id: number;
  agent_id: number;
  scheduled_at: string;
  type: string;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
}

export interface Transaction {
  id: number;
  lead_id: number;
  agent_id: number;
  client_name: string | null;
  property_address: string | null;
  estimated_value: number | null;
  status: TransactionStatus;
  under_contract_date: string | null;
  closing_date: string | null;
  gross_commission: number | null;
  referral_fee: number | null;
  referral_fee_status: ReferralFeeStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivationPayment {
  id: number;
  user_id: number;
  amount: number;
  method: string;
  status: string;
  reference: string;
  created_at: string;
}

export interface ZipCode {
  id: number;
  zip: string;
  city: string;
  state: string;
  market: string;
  active: number;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number | null;
  type: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  sent_at: string;
  read_at: string | null;
}

export interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}
