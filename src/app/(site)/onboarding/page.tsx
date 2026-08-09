import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { parseJsonArray } from "@/lib/assignment";
import { Container } from "@/components/ui";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { AgentProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "agent") redirect("/admin");
  if (!user.activated) redirect("/join");

  const db = getDb();
  const profile = (db.prepare("SELECT * FROM agent_profiles WHERE user_id = ?").get(user.id) ??
    db
      .prepare(
        `INSERT INTO agent_profiles (user_id, first_name, last_name, zip_codes, specialties, social_links, capacity, created_at, updated_at)
         VALUES (?, 'Unknown', '', '[]', '[]', '[]', 10, ?, ?) RETURNING *`
      )
      .get(user.id, new Date().toISOString(), new Date().toISOString())) as AgentProfile;

  return (
    <Container className="flex flex-col items-center py-12">
      <div className="mb-8 max-w-xl text-center">
        <h1 className="font-serif text-3xl font-bold text-brand-950">Onboarding</h1>
        <p className="mt-2 text-brand-600">
          Tell us about your market and preferences so we can match you with qualified opportunities.
        </p>
      </div>
      <OnboardingWizard
        user={{
          email: user.email,
          activated: user.activated,
          onboarding_completed: user.onboarding_completed,
          license_verified: user.license_verified,
          market_approved: user.market_approved,
          status: user.status,
        }}
        profile={{
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: user.email,
          phone: profile.phone,
          brokerage: profile.brokerage,
          license_number: profile.license_number,
          license_state: profile.license_state,
          years_experience: profile.years_experience,
          primary_city: profile.primary_city,
          state: profile.state,
          zip_codes: parseJsonArray(profile.zip_codes),
          service_radius: profile.service_radius,
          lead_type: profile.lead_type,
          specialties: parseJsonArray(profile.specialties) as AgentProfile["specialties"],
          preferred_contact: profile.preferred_contact,
          working_hours: profile.working_hours,
          weekend_availability: profile.weekend_availability,
          phone_availability: profile.phone_availability,
          bio: profile.bio,
          website: profile.website,
          photo: (profile as AgentProfile & { photo?: string }).photo ?? null,
          social_links: parseJsonArray(profile.social_links),
        }}
      />
    </Container>
  );
}
