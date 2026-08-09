"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/agent";
import { STATES } from "@/lib/constants";
import { FormError, Input, Label, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function ProfileForm({
  profile,
}: {
  profile: {
    phone: string | null;
    brokerage: string | null;
    primary_city: string | null;
    state: string | null;
    zip_codes: string[];
    service_radius: number | null;
    lead_type: string;
    specialties: string[];
    preferred_contact: string | null;
    working_hours: string | null;
    weekend_availability: number;
    bio: string | null;
    website: string | null;
  };
}) {
  const [state, action] = useActionState(updateProfileAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Phone</Label>
          <Input name="phone" defaultValue={profile.phone ?? ""} required />
        </div>
        <div>
          <Label>Brokerage</Label>
          <Input name="brokerage" defaultValue={profile.brokerage ?? ""} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Primary City</Label>
          <Input name="primary_city" defaultValue={profile.primary_city ?? ""} required />
        </div>
        <div>
          <Label>State</Label>
          <Select name="state" defaultValue={profile.state ?? ""} required>
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>ZIP Codes (comma separated)</Label>
        <Input name="zip_codes" defaultValue={profile.zip_codes.join(", ")} required />
      </div>
      <div>
        <Label>Service Radius (miles)</Label>
        <Input name="service_radius" type="number" defaultValue={profile.service_radius ?? 20} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>I work with</Label>
          <Select name="lead_type" defaultValue={profile.lead_type} required>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
            <option value="both">Both</option>
          </Select>
        </div>
        <div>
          <Label>Preferred Contact</Label>
          <Select name="preferred_contact" defaultValue={profile.preferred_contact ?? "phone"}>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="text">Text</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Specialties (comma separated)</Label>
        <Input name="specialties" defaultValue={profile.specialties.join(", ")} placeholder="first-time-buyers, luxury" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Working Hours</Label>
          <Input name="working_hours" defaultValue={profile.working_hours ?? ""} />
        </div>
        <div>
          <Label>Weekend Availability</Label>
          <Select name="weekend_availability" defaultValue={String(profile.weekend_availability)}>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Bio</Label>
        <Textarea name="bio" rows={3} defaultValue={profile.bio ?? ""} />
      </div>
      <div>
        <Label>Website</Label>
        <Input name="website" defaultValue={profile.website ?? ""} />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800">Save Profile</SubmitButton>
    </form>
  );
}
