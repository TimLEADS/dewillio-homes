"use client";

import { useActionState, useState } from "react";
import { activateAccountAction } from "@/lib/actions/checkout";
import { STATES } from "@/lib/constants";
import { Card, FormError, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CardFields } from "@/components/checkout/CardFields";

const STEPS = ["Agent Information", "Referral Agreement", "Payment"];

interface Info {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  brokerage: string;
  licenseNumber: string;
  state: string;
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
};

export function JoinWizard() {
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState<Info>(INITIAL);
  const [agreed, setAgreed] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [payState, payAction] = useActionState(activateAccountAction, undefined);

  const set = (key: keyof Info) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInfo((prev) => ({ ...prev, [key]: e.target.value }));

  const nextFromInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.firstName || !info.lastName || !info.email.includes("@") || info.password.length < 8 || info.phone.length < 7 || !info.brokerage || !info.licenseNumber || !info.state) {
      setInfoError("Please complete all fields. Password must be at least 8 characters.");
      return;
    }
    setInfoError("");
    setStep(1);
  };

  return (
    <Card className="w-full max-w-xl p-8">
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col gap-1.5">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-950" : "bg-brand-100"}`} />
            <span className={`text-[11px] font-semibold ${i === step ? "text-brand-950" : "text-brand-400"}`}>
              {i + 1}. {s}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <form onSubmit={nextFromInfo} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>First Name</Label>
              <Input value={info.firstName} onChange={set("firstName")} placeholder="Jane" />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={info.lastName} onChange={set("lastName")} placeholder="Doe" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Email</Label>
              <Input type="email" value={info.email} onChange={set("email")} placeholder="you@brokerage.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={info.password} onChange={set("password")} placeholder="Min. 8 characters" />
            </div>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={info.phone} onChange={set("phone")} placeholder="(555) 555-5555" />
          </div>
          <div>
            <Label>Brokerage</Label>
            <Input value={info.brokerage} onChange={set("brokerage")} placeholder="Your brokerage name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Real Estate License Number</Label>
              <Input value={info.licenseNumber} onChange={set("licenseNumber")} placeholder="License #" />
            </div>
            <div>
              <Label>License State</Label>
              <Select value={info.state} onChange={set("state")}>
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
          {infoError ? <FormError message={infoError} /> : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Continue
          </button>
        </form>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5 text-sm leading-relaxed text-brand-700">
            <h3 className="mb-2 font-bold text-brand-950">Dewilio Homes Referral Agreement — Summary</h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                The <strong>$1 activation fee</strong> is a one-time charge to verify and activate your
                account. It is not a subscription and not a payment for leads.
              </li>
              <li>
                Dewilio Homes provides qualified real estate opportunities to participating agents.
              </li>
              <li>
                If a referred transaction <strong>successfully closes</strong>, Dewilio Homes receives a{" "}
                <strong>20% referral fee</strong> from the transaction, according to this agreement and
                applicable state and brokerage rules.
              </li>
              <li>
                No monthly fees. No expensive upfront lead packages. Leads are not guaranteed.
              </li>
              <li>
                You must hold a valid real estate license, be associated with an approved brokerage, and
                complete onboarding and verification before receiving assignments.
              </li>
            </ul>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-brand-200 p-4">
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-900"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!agreed}
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agree & Continue to Payment
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form action={payAction} className="space-y-4">
          <div className="rounded-xl bg-brand-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-300">Account Activation</span>
              <span className="font-serif text-2xl font-bold">$1.00</span>
            </div>
            <p className="mt-1 text-xs text-brand-400">
              One-time activation. No monthly fee. Referral fee only when a referred transaction closes.
            </p>
          </div>

          <input type="hidden" name="firstName" value={info.firstName} />
          <input type="hidden" name="lastName" value={info.lastName} />
          <input type="hidden" name="email" value={info.email} />
          <input type="hidden" name="password" value={info.password} />
          <input type="hidden" name="phone" value={info.phone} />
          <input type="hidden" name="brokerage" value={info.brokerage} />
          <input type="hidden" name="licenseNumber" value={info.licenseNumber} />
          <input type="hidden" name="state" value={info.state} />
          <input type="hidden" name="agreed" value="yes" />
          <input type="hidden" name="paymentMethod" value="card" />

          <CardFields cardholderDefault={`${info.firstName} ${info.lastName}`.trim()} />

          <FormError message={payState?.error} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-900"
            >
              Back
            </button>
            <SubmitButton className="flex-1 bg-accent-500 text-brand-950 hover:bg-accent-400" pendingText="Processing $1…">
              Pay $1 & Activate
            </SubmitButton>
          </div>
        </form>
      )}
    </Card>
  );
}
