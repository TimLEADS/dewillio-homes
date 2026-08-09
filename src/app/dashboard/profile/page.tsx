import { requireAgent } from "@/lib/auth";
import { parseJsonArray } from "@/lib/assignment";
import { getDb } from "@/lib/db";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { Card, Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage() {
  const user = await requireAgent();
  const db = getDb();
  const profile = db.prepare("SELECT * FROM agent_profiles WHERE user_id = ?").get(user.id) as {
    phone: string | null;
    brokerage: string | null;
    primary_city: string | null;
    state: string | null;
    zip_codes: string;
    service_radius: number | null;
    lead_type: string;
    specialties: string;
    preferred_contact: string | null;
    working_hours: string | null;
    weekend_availability: number;
    bio: string | null;
    website: string | null;
  } | null;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Profile</h1>
      <p className="mt-1 text-sm text-brand-500">
        Your profile drives matching. Keep ZIP codes, specialties and availability up to date.
      </p>
      <Card className="mt-6">
        {profile ? (
          <ProfileForm
            profile={{
              phone: profile.phone,
              brokerage: profile.brokerage,
              primary_city: profile.primary_city,
              state: profile.state,
              zip_codes: parseJsonArray(profile.zip_codes),
              service_radius: profile.service_radius,
              lead_type: profile.lead_type,
              specialties: parseJsonArray(profile.specialties),
              preferred_contact: profile.preferred_contact,
              working_hours: profile.working_hours,
              weekend_availability: profile.weekend_availability,
              bio: profile.bio,
              website: profile.website,
            }}
          />
        ) : (
          <p className="text-sm text-brand-500">Complete onboarding to set up your profile.</p>
        )}
      </Card>
    </Container>
  );
}
