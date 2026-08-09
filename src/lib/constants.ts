export const LEAD_STATUSES = [
  "new",
  "contacted",
  "engaged",
  "appointment",
  "under_contract",
  "closed",
  "lost",
] as const;

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  engaged: "Engaged",
  appointment: "Appointment",
  under_contract: "Under Contract",
  closed: "Closed",
  lost: "Lost",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-100 text-sky-800 ring-sky-600/20",
  contacted: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  engaged: "bg-violet-100 text-violet-800 ring-violet-600/20",
  appointment: "bg-amber-100 text-amber-800 ring-amber-600/20",
  under_contract: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  closed: "bg-green-100 text-green-800 ring-green-600/20",
  lost: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

export const TRANSACTION_STATUSES = ["pending", "under_contract", "closed"] as const;
export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  under_contract: "Under Contract",
  closed: "Closed",
};

export const REFERRAL_FEE_STATUSES = ["pending", "under_contract", "closed_fee_due", "paid", "disputed"] as const;
export const REFERRAL_FEE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  under_contract: "Under Contract",
  closed_fee_due: "Closed — Fee Due",
  paid: "Paid",
  disputed: "Disputed",
};

export const SPECIALTIES = [
  { value: "first-time-buyers", label: "First-Time Buyers" },
  { value: "luxury", label: "Luxury" },
  { value: "investors", label: "Investors" },
  { value: "relocation", label: "Relocation" },
  { value: "commercial", label: "Commercial" },
  { value: "general", label: "General" },
] as const;

export const SPECIALTY_LABELS: Record<string, string> = Object.fromEntries(
  SPECIALTIES.map((s) => [s.value, s.label])
);

export const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR",
] as const;

export const MONEY = (n: number | null | undefined) =>
  n == null ? "—" : "$" + n.toLocaleString("en-US");

export const DATE = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const DATETIME = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export function isMissed(lead: { status: string; response_due_at: string | null }): boolean {
  return (
    (lead.status === "new" || lead.status === "contacted") &&
    !!lead.response_due_at &&
    new Date(lead.response_due_at).getTime() < Date.now()
  );
}
