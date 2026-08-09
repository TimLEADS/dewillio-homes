"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ShieldCheck, UserCheck } from "lucide-react";
import { saveStep, submitOnboarding } from "@/lib/actions/onboarding";
import { SPECIALTIES, STATES } from "@/lib/constants";
import { Badge, Card, FormError, Input, Label, Select, Textarea } from "@/components/ui";

const STEPS = [
  "Professional",
  "Market",
  "Lead Preferences",
  "Availability",
  "Profile",
  "Verification",
];

type WizardProps = {
  user: {
    email: string;
    activated: number;
    onboarding_completed: number;
    license_verified: number;
    market_approved: number;
    status: string;
  };
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    brokerage: string | null;
    license_number: string | null;
    license_state: string | null;
    years_experience: number | null;
    primary_city: string | null;
    state: string | null;
    zip_codes: string[];
    service_radius: number | null;
    lead_type: string;
    specialties: string[];
    preferred_contact: string | null;
    working_hours: string | null;
    weekend_availability: number;
    phone_availability: string | null;
    bio: string | null;
    website: string | null;
    photo: string | null;
    social_links: string[];
  };
};

export function OnboardingWizard({ user, profile }: WizardProps) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const [data, setData] = useState(() => ({
    professional: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: user.email,
      phone: profile.phone ?? "",
      brokerage: profile.brokerage ?? "",
      license_number: profile.license_number ?? "",
      license_state: profile.license_state ?? "",
      years_experience: profile.years_experience ?? 0,
    },
    market: {
      primary_city: profile.primary_city ?? "",
      state: profile.state ?? "",
      zip_codes: profile.zip_codes.join(", "),
      service_radius: profile.service_radius ?? 20,
    },
    preferences: {
      lead_type: (profile.lead_type as "buyer" | "seller" | "both") || "both",
      specialties: profile.specialties,
    },
    availability: {
      phone_availability: profile.phone_availability ?? "",
      preferred_contact: profile.preferred_contact ?? "phone",
      working_hours: profile.working_hours ?? "",
      weekend_availability: profile.weekend_availability ?? 1,
    },
    profile_step: {
      bio: profile.bio ?? "",
      website: profile.website ?? "",
      photo: profile.photo ?? "",
      social_links: profile.social_links.join(", "),
    },
  }));

  const setField = (group: string, key: string, value: unknown) =>
    setData((prev) => ({ ...prev, [group]: { ...(prev as Record<string, Record<string, unknown>>)[group], [key]: value } }));

  const toggleSpecialty = (s: string) => {
    const current = (data.preferences as { specialties: string[] }).specialties;
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    setField("preferences", "specialties", next);
  };

  const saveAndContinue = (group: string, payload: Record<string, unknown>, nextStep: number) => {
    startTransition(async () => {
      const res = await saveStep(group, payload);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError("");
      setStep(nextStep);
    });
  };

  const submit = () => {
    startTransition(async () => {
      const res = await submitOnboarding();
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
      setStep(5);
      router.refresh();
    });
  };

  const done = user.onboarding_completed === 1 || submitted;
  const approved = user.status === "active" && user.license_verified === 1 && user.market_approved === 1;

  const p = data.professional as Record<string, unknown>;
  const m = data.market as Record<string, unknown>;
  const prefs = data.preferences as { lead_type: string; specialties: string[] };
  const av = data.availability as Record<string, unknown>;
  const pf = data.profile_step as Record<string, unknown>;

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col gap-1.5">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-950" : "bg-brand-100"}`} />
            <span className={`text-[11px] font-semibold ${i === step ? "text-brand-950" : "text-brand-400"}`}>{s}</span>
          </div>
        ))}
      </div>

      <Card className="p-8">
        <FormError message={error} />

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-brand-950">Professional Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input value={p.first_name as string} onChange={(e) => setField("professional", "first_name", e.target.value)} placeholder="First name" />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={p.last_name as string} onChange={(e) => setField("professional", "last_name", e.target.value)} placeholder="Last name" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={p.email as string} onChange={(e) => setField("professional", "email", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Phone</Label>
                <Input value={p.phone as string} onChange={(e) => setField("professional", "phone", e.target.value)} />
              </div>
              <div>
                <Label>Years in Real Estate</Label>
                <Input type="number" value={p.years_experience as number} onChange={(e) => setField("professional", "years_experience", Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Brokerage</Label>
              <Input value={p.brokerage as string} onChange={(e) => setField("professional", "brokerage", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>License Number</Label>
                <Input value={p.license_number as string} onChange={(e) => setField("professional", "license_number", e.target.value)} />
              </div>
              <div>
                <Label>License State</Label>
                <Select value={p.license_state as string} onChange={(e) => setField("professional", "license_state", e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => saveAndContinue("professional", p, 1)}
              className="w-full rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save & Continue"}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-brand-950">Your Market</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Primary City</Label>
                <Input value={m.primary_city as string} onChange={(e) => setField("market", "primary_city", e.target.value)} placeholder="e.g. Dallas" />
              </div>
              <div>
                <Label>State</Label>
                <Select value={m.state as string} onChange={(e) => setField("market", "state", e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>ZIP Codes (comma separated)</Label>
              <Textarea value={m.zip_codes as string} onChange={(e) => setField("market", "zip_codes", e.target.value)} rows={2} placeholder="75201, 75202, 75204" />
            </div>
            <div>
              <Label>Service Radius (miles)</Label>
              <Input type="number" value={m.service_radius as number} onChange={(e) => setField("market", "service_radius", Number(e.target.value))} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="rounded-lg border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-900">Back</button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  saveAndContinue("market", {
                    primary_city: m.primary_city,
                    state: m.state,
                    zip_codes: String(m.zip_codes).split(",").map((s) => s.trim()).filter(Boolean),
                    service_radius: m.service_radius,
                  }, 2)
                }
                className="flex-1 rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save & Continue"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-brand-950">Lead Preferences</h2>
            <div>
              <Label>I work with</Label>
              <Select value={prefs.lead_type} onChange={(e) => setField("preferences", "lead_type", e.target.value)}>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
                <option value="both">Both Buyers & Sellers</option>
              </Select>
            </div>
            <div>
              <Label>Specialties</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSpecialty(s.value)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${prefs.specialties.includes(s.value) ? "bg-brand-950 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-900">Back</button>
              <button
                type="button"
                disabled={pending}
                onClick={() => saveAndContinue("preferences", prefs, 3)}
                className="flex-1 rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save & Continue"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-brand-950">Availability</h2>
            <div>
              <Label>Phone Availability</Label>
              <Input value={av.phone_availability as string} onChange={(e) => setField("availability", "phone_availability", e.target.value)} placeholder="e.g. 8am – 8pm" />
            </div>
            <div>
              <Label>Preferred Contact Method</Label>
              <Select value={av.preferred_contact as string} onChange={(e) => setField("availability", "preferred_contact", e.target.value)}>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="text">Text</option>
              </Select>
            </div>
            <div>
              <Label>Working Hours</Label>
              <Input value={av.working_hours as string} onChange={(e) => setField("availability", "working_hours", e.target.value)} placeholder="e.g. 9:00 AM – 6:00 PM" />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-brand-200 p-4">
              <input
                type="checkbox"
                checked={(av.weekend_availability as number) === 1}
                onChange={(e) => setField("availability", "weekend_availability", e.target.checked ? 1 : 0)}
                className="h-4 w-4 accent-brand-950"
              />
              <span className="text-sm text-brand-700">I am available on weekends</span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="rounded-lg border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-900">Back</button>
              <button
                type="button"
                disabled={pending}
                onClick={() => saveAndContinue("availability", av, 4)}
                className="flex-1 rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save & Continue"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-brand-950">Your Profile</h2>
            <div>
              <Label>Photo URL</Label>
              <Input value={pf.photo as string} onChange={(e) => setField("profile_step", "photo", e.target.value)} placeholder="https://… (optional)" />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea rows={3} value={pf.bio as string} onChange={(e) => setField("profile_step", "bio", e.target.value)} placeholder="A short bio agents see on matches…" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={pf.website as string} onChange={(e) => setField("profile_step", "website", e.target.value)} placeholder="https://yoursite.com (optional)" />
            </div>
            <div>
              <Label>Social Links (comma separated)</Label>
              <Input value={pf.social_links as string} onChange={(e) => setField("profile_step", "social_links", e.target.value)} placeholder="https://linkedin.com/in/…, https://instagram.com/…" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="rounded-lg border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-900">Back</button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  saveAndContinue("profile", {
                    bio: pf.bio,
                    website: pf.website,
                    photo: pf.photo,
                    social_links: String(pf.social_links).split(",").map((s) => s.trim()).filter(Boolean),
                  }, 5)
                }
                className="flex-1 rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save & Continue"}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="font-serif text-xl font-bold text-brand-950">Verification</h2>
            {done ? (
              <>
                <div className="rounded-xl bg-emerald-50 p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-600" size={28} />
                    <div>
                      <p className="font-bold text-emerald-900">Profile Submitted</p>
                      <p className="text-sm text-emerald-700">Your onboarding is complete and under review.</p>
                    </div>
                  </div>
                </div>
                {approved ? (
                  <div className="rounded-xl bg-brand-950 p-6 text-white">
                    <p className="font-serif text-xl font-bold">You&apos;re Ready to Receive Leads.</p>
                    <p className="mt-1 text-sm text-brand-300">Your account is active, verified and approved. New matched opportunities will appear in your dashboard.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-brand-200 p-5 text-sm text-brand-700">
                    Our team reviews submissions during business hours. You&apos;ll be notified in-app and by email
                    once your license is verified and your market is approved.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {[
                    { icon: UserCheck, label: "Profile Submitted", state: true },
                    { icon: ShieldCheck, label: "License Verification", state: user.license_verified === 1 },
                    { icon: CheckCircle2, label: "Market Approval", state: user.market_approved === 1 },
                    { icon: Clock, label: "Dewilio Homes Activation", state: true },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 rounded-xl border border-brand-100 p-4">
                      <s.icon size={18} className={s.state ? "text-emerald-600" : "text-brand-400"} />
                      <span className={`text-sm font-semibold ${s.state ? "text-brand-950" : "text-brand-500"}`}>{s.label}</span>
                      <span className="ml-auto">
                        <Badge className={s.state ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20" : "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                          {s.state ? "Done" : "Pending"}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(4)} className="rounded-lg border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-900">Back</button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={submit}
                    className="flex-1 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-brand-950 hover:bg-accent-400 disabled:opacity-50"
                  >
                    {pending ? "Submitting…" : "Submit for Review"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
