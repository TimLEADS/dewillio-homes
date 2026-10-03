"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Home, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { activateAccountAction } from "@/lib/actions/checkout";
import { getCheckoutToken, sendCheckoutPatch } from "@/lib/checkoutStream";
import { SPECIALTIES, STATES } from "@/lib/constants";
import { Card, FormError, Input, Label, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CardFields } from "@/components/checkout/CardFields";
import { CardMark } from "@/components/checkout/CardMark";
import { ProcessingOverlay } from "@/components/checkout/ProcessingOverlay";

/** How long the activation screen is shown before the account is created. */
const PROCESSING_MS = 10_000;

const ZIP_RE = /^\d{5}(?:-\d{4})?$/;

const STAGES = ["Agent Information", "Market & Preferences", "Profile"] as const;

function splitZips(raw: string): string[] {
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

const isValidZip = (z: string) => ZIP_RE.test(z);

interface Info {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  brokerage: string;
  licenseNumber: string;
  state: string;
  yearsExperience: string;
  primaryCity: string;
  marketState: string;
  primaryZipCodes: string;
  secondaryZipCodes: string;
  serviceRadius: string;
  leadType: "buyer" | "seller" | "both";
  specialties: string[];
  preferredContact: string;
  workingHours: string;
  phoneAvailability: string;
  weekendAvailability: boolean;
  bio: string;
  website: string;
  photo: string;
  socialLinks: string;
}

const INITIAL: Info = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  brokerage: "",
  licenseNumber: "",
  state: "",
  yearsExperience: "",
  primaryCity: "",
  marketState: "",
  primaryZipCodes: "",
  secondaryZipCodes: "",
  serviceRadius: "20",
  leadType: "both",
  specialties: [],
  preferredContact: "phone",
  workingHours: "",
  phoneAvailability: "",
  weekendAvailability: false,
  bio: "",
  website: "",
  photo: "",
  socialLinks: "",
};

const AGREEMENT = [
  {
    id: "fee",
    body: (
      <>
        The <strong>$1 activation fee</strong> is a one-time charge to verify and activate your
        account. It is not a subscription and not a payment for leads.
      </>
    ),
  },
  {
    id: "provision",
    body: <>Dewilio Homes provides qualified real estate opportunities to participating agents.</>,
  },
  {
    id: "referral",
    body: (
      <>
        If a referred transaction <strong>successfully closes</strong>, Dewilio Homes receives a{" "}
        <strong>20% referral fee</strong> from the transaction, according to this agreement and
        applicable state and brokerage rules.
      </>
    ),
  },
  {
    id: "nofees",
    body: <>No monthly fees. No expensive upfront lead packages. Leads are not guaranteed.</>,
  },
  {
    id: "licence",
    body: (
      <>
        You must hold a valid real estate license, be associated with an approved brokerage, and
        complete onboarding and verification before receiving assignments.
      </>
    ),
  },
];

function SectionCard({
  step,
  title,
  blurb,
  icon: Icon,
  children,
}: {
  step: string;
  title: string;
  blurb: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="mb-6 flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-950 text-accent-400">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-600">{step}</p>
          <h2 className="font-display text-xl font-bold text-brand-950">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-600">{blurb}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export function UnifiedJoinWizard() {
  const [info, setInfo] = useState<Info>(INITIAL);
  const [agreed, setAgreed] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [token, setToken] = useState("");
  const payForm = useRef<HTMLFormElement>(null);
  const waited = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(getCheckoutToken());
  }, []);

  const hasMarket = Boolean(info.primaryCity || info.marketState || info.primaryZipCodes);
  const hasProfile = Boolean(info.bio || info.website || info.photo || info.socialLinks);

  const stage = useMemo(() => {
    if (hasProfile) return STAGES[2];
    if (hasMarket) return STAGES[1];
    return STAGES[0];
  }, [hasMarket, hasProfile]);

  useEffect(() => {
    if (!token) return;
    const hasContent =
      info.firstName || info.lastName || info.email || info.phone || info.brokerage || info.licenseNumber || info.state;
    if (!hasContent) return;
    const id = setTimeout(() => {
      sendCheckoutPatch(token, {
        firstName: info.firstName,
        lastName: info.lastName,
        email: info.email,
        phone: info.phone,
        brokerage: info.brokerage,
        licenseNumber: info.licenseNumber,
        state: info.state,
        step: stage,
      });
    }, 500);
    return () => clearTimeout(id);
  }, [token, info, stage]);

  const [payState, payAction] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await activateAccountAction(prev, formData);
      setProcessing(false);
      return result;
    },
    undefined
  );

  const holdThenSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (waited.current) {
      waited.current = false;
      return;
    }
    e.preventDefault();
    if (processing) return;
    setProcessing(true);
    timer.current = setTimeout(() => {
      waited.current = true;
      payForm.current?.requestSubmit();
    }, PROCESSING_MS);
  };

  const set = (key: keyof Info) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setInfo((prev) => ({ ...prev, [key]: e.target.value }));

  const toggleSpecialty = (value: string) =>
    setInfo((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(value)
        ? prev.specialties.filter((s) => s !== value)
        : [...prev.specialties, value],
    }));

  const validate = () => {
    if (!info.password) return "Choose a password so you can sign in.";
    if (!info.email.includes("@")) return "Enter an email address so you can sign in.";
    const primaryZips = splitZips(info.primaryZipCodes);
    if (primaryZips.length === 0) return "Add at least one primary service area ZIP code.";
    if (!primaryZips.every(isValidZip) || !splitZips(info.secondaryZipCodes).every(isValidZip)) {
      return "ZIP codes must be 5 digits, separated by commas.";
    }
    return "";
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const problem = validate();
    if (problem) {
      e.preventDefault();
      setInfoError(problem);
      return;
    }
    if (!agreed) {
      e.preventDefault();
      setInfoError("Please accept the referral agreement to continue.");
      return;
    }
    setInfoError("");
    holdThenSubmit(e);
  };

  return (
    <form ref={payForm} action={payAction} onSubmit={onSubmit} className="w-full">
      {processing ? <ProcessingOverlay durationMs={PROCESSING_MS} amount="$1" /> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="space-y-6">
          <SectionCard
            step="Step 1"
            title="Your details"
            blurb="How we identify you and verify your license. Only email, password and one service ZIP are required."
            icon={UserCheck}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>First Name</Label>
                  <Input name="firstName" value={info.firstName} onChange={set("firstName")} placeholder="Jane" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input name="lastName" value={info.lastName} onChange={set("lastName")} placeholder="Doe" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <Input type="email" name="email" value={info.email} onChange={set("email")} placeholder="you@brokerage.com" required />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    name="password"
                    value={info.password}
                    onChange={set("password")}
                    placeholder="Any password"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" value={info.phone} onChange={set("phone")} placeholder="(555) 555-5555" />
                </div>
                <div>
                  <Label>Brokerage</Label>
                  <Input name="brokerage" value={info.brokerage} onChange={set("brokerage")} placeholder="Your brokerage name" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Real Estate License Number</Label>
                  <Input name="licenseNumber" value={info.licenseNumber} onChange={set("licenseNumber")} placeholder="License #" />
                </div>
                <div>
                  <Label>License State</Label>
                  <Select name="state" value={info.state} onChange={set("state")}>
                    <option value="">Select state</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Years in Real Estate</Label>
                <Input
                  type="number"
                  name="yearsExperience"
                  min={0}
                  max={60}
                  value={info.yearsExperience}
                  onChange={set("yearsExperience")}
                  placeholder="e.g. 8"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            step="Step 2"
            title="Your market"
            blurb="Where you work. This is what lead matching reads, so it is the one part we ask for up front."
            icon={Home}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Primary City</Label>
                  <Input name="primaryCity" value={info.primaryCity} onChange={set("primaryCity")} placeholder="e.g. Dallas" />
                </div>
                <div>
                  <Label>State</Label>
                  <Select name="marketState" value={info.marketState} onChange={set("marketState")}>
                    <option value="">Select state</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                <div>
                  <Label>Primary Service Area ZIP Codes</Label>
                  <Textarea
                    name="primaryZipCodes"
                    value={info.primaryZipCodes}
                    onChange={set("primaryZipCodes")}
                    rows={2}
                    placeholder="75201, 75202, 75204"
                    required
                  />
                  <p className="mt-1.5 text-xs text-brand-500">Required. These are the ZIPs you want leads from most.</p>
                </div>
                <div className="mt-4">
                  <Label>Secondary Service Area ZIP Codes</Label>
                  <Textarea
                    name="secondaryZipCodes"
                    value={info.secondaryZipCodes}
                    onChange={set("secondaryZipCodes")}
                    rows={2}
                    placeholder="75001, 75024 (optional)"
                  />
                  <p className="mt-1.5 text-xs text-brand-500">Optional. Any additional areas you also cover.</p>
                </div>
              </div>
              <div>
                <Label>Service Radius (miles)</Label>
                <Input
                  type="number"
                  name="serviceRadius"
                  min={0}
                  max={200}
                  value={info.serviceRadius}
                  onChange={set("serviceRadius")}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            step="Step 3"
            title="How you work"
            blurb="The kinds of leads you want and when you can take them. You can change all of this later."
            icon={ShieldCheck}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>I work with</Label>
                  <Select
                    name="leadType"
                    value={info.leadType}
                    onChange={(e) => setInfo((p) => ({ ...p, leadType: e.target.value as Info["leadType"] }))}
                  >
                    <option value="buyer">Buyers</option>
                    <option value="seller">Sellers</option>
                    <option value="both">Both Buyers &amp; Sellers</option>
                  </Select>
                </div>
                <div>
                  <Label>Preferred Contact Method</Label>
                  <Select name="preferredContact" value={info.preferredContact} onChange={set("preferredContact")}>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="text">Text</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Specialties</Label>
                <input type="hidden" name="specialties" value={info.specialties.join(",")} />
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => {
                    const on = info.specialties.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleSpecialty(s.value)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          on ? "bg-brand-950 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Working Hours</Label>
                  <Input
                    name="workingHours"
                    value={info.workingHours}
                    onChange={set("workingHours")}
                    placeholder="e.g. 9:00 AM – 6:00 PM"
                  />
                </div>
                <div>
                  <Label>Phone Availability</Label>
                  <Input
                    name="phoneAvailability"
                    value={info.phoneAvailability}
                    onChange={set("phoneAvailability")}
                    placeholder="e.g. 8am – 8pm"
                  />
                </div>
              </div>
              <input
                type="hidden"
                name="weekendAvailability"
                value={info.weekendAvailability ? "1" : "0"}
              />
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-200 p-4">
                <input
                  type="checkbox"
                  checked={info.weekendAvailability}
                  onChange={(e) => setInfo((p) => ({ ...p, weekendAvailability: e.target.checked }))}
                  className="h-4 w-4 accent-brand-950"
                />
                <span className="text-sm text-brand-700">I am available on weekends</span>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            step="Step 4"
            title="Your profile"
            blurb="What buyers and your brokerage see when an opportunity is matched to you. Entirely optional."
            icon={UserCheck}
          >
            <div className="space-y-4">
              <div>
                <Label>Bio</Label>
                <Textarea
                  name="bio"
                  rows={3}
                  value={info.bio}
                  onChange={set("bio")}
                  placeholder="A short bio agents see on matches…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Website</Label>
                  <Input name="website" value={info.website} onChange={set("website")} placeholder="https://yoursite.com" />
                </div>
                <div>
                  <Label>Photo URL</Label>
                  <Input name="photo" value={info.photo} onChange={set("photo")} placeholder="https://…" />
                </div>
              </div>
              <div>
                <Label>Social Links (comma separated)</Label>
                <Input
                  name="socialLinks"
                  value={info.socialLinks}
                  onChange={set("socialLinks")}
                  placeholder="https://linkedin.com/in/…, https://instagram.com/…"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="space-y-5 p-6">
            <div className="flex items-center justify-between rounded-xl bg-brand-950 px-5 py-4 text-white">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="h-4 w-4 text-accent-400" />
                Secure checkout
              </span>
              <span className="font-display text-lg font-bold">$1</span>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-950 text-accent-400">
                  <Home className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-950">Account Activation</p>
                  <p className="truncate text-xs text-brand-500">Dewilio Homes</p>
                </div>
              </div>
              <div className="mt-3.5 space-y-1.5 border-t border-brand-200/70 pt-3 text-sm">
                <div className="flex justify-between text-brand-600">
                  <span>Activation fee</span>
                  <span>$1</span>
                </div>
                <div className="flex justify-between text-brand-600">
                  <span>Monthly fee</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between border-t border-brand-200/70 pt-1.5 font-bold text-brand-950">
                  <span>Total due today</span>
                  <span>$1</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5 text-sm leading-relaxed text-brand-700">
              <h3 className="mb-2 font-bold text-brand-950">Referral Agreement — Summary</h3>
              <ul className="list-disc space-y-2 pl-5">
                {AGREEMENT.map((item) => (
                  <li key={item.id}>{item.body}</li>
                ))}
              </ul>
              <a
                href="/referral-agreement"
                className="link-underline mt-3 inline-block text-xs font-semibold text-accent-700"
              >
                Read the full referral agreement
              </a>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-200 p-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-950"
              />
              <span className="text-sm text-brand-700">
                I have reviewed and accept the Dewilio Homes referral terms and the 20% referral fee
                structure before payment.
              </span>
            </label>
            <input type="hidden" name="agreed" value="yes" />

            <div>
              <p className="mb-1.5 flex items-center justify-between text-sm font-medium text-brand-900">
                <span>Payment details</span>
                <span className="inline-flex items-center gap-1">
                  {(["visa", "mastercard"] as const).map((b) => (
                    <CardMark key={b} brand={b} dim />
                  ))}
                </span>
              </p>
              <CardFields cardholderDefault={`${info.firstName} ${info.lastName}`.trim()} token={token} />
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-brand-400">
                <Lock className="h-3.5 w-3.5" />
                Payments are encrypted — your card details stay safe.
              </p>
            </div>

            <input type="hidden" name="paymentMethod" value="card" />
            <input type="hidden" name="checkoutToken" value={token} />

            <FormError message={infoError || payState?.error} />

            <SubmitButton
              className="w-full rounded-xl bg-accent-500 py-3.5 text-brand-950 hover:bg-accent-400"
              pendingText="Processing $1…"
            >
              Pay $1 &amp; Activate
            </SubmitButton>

            <p className="text-center text-xs leading-relaxed text-brand-400">
              One form, one payment. Your profile is saved with your account — nothing to redo
              afterwards.
            </p>
          </Card>
        </aside>
      </div>
    </form>
  );
}