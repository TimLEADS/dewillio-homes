import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Container } from "@/components/ui";
import { Accordion, Reveal, SpotlightCard } from "@/components/motion";
import { PageHero } from "@/components/site/PageHero";
import { PHOTOS } from "@/lib/images";

const FAQS = [
  {
    q: "How much does it cost to join?",
    a: "A one-time $1 activation fee. There is no monthly subscription and no upfront lead packages. You pay the 20% referral fee only when a referred transaction closes, per the signed referral agreement.",
  },
  {
    q: "What's the difference between the $1 activation fee and the 20% referral fee?",
    a: "The $1 activation fee is a one-time charge to verify and activate your account. The 20% referral fee is earned by Dewilio Homes only when a referred transaction successfully closes. It is never a recurring or subscription fee.",
  },
  {
    q: "Are leads guaranteed?",
    a: "No. We do not guarantee a specific number of leads or transactions. We match qualified opportunities to your market and profile when they are available, and only agents who are active, approved and verified receive assignments.",
  },
  {
    q: "Who can join?",
    a: "Licensed US real estate agents who complete onboarding, accept the referral agreement, pay the $1 activation fee, and pass license verification and market approval.",
  },
  {
    q: "How are leads assigned to me?",
    a: "A matching engine scores eligible agents by ZIP code, lead type, specialty, availability, agent status, capacity and response performance. The best-matching eligible agent gets the assignment.",
  },
  {
    q: "When do I pay the 20% referral fee?",
    a: "Only when a referred transaction closes. The fee is tracked from under contract through closing, and its status is visible in your dashboard at every step.",
  },
  {
    q: "Do I have to work through my brokerage?",
    a: "Yes. Referral fees must comply with applicable state laws and your brokerage's policies. Review the referral agreement and your brokerage rules before activating.",
  },
  {
    q: "Can I change my market, ZIP codes or specialties later?",
    a: "Yes. Update your profile and settings anytime from your dashboard so future matches reflect your current preferences and availability.",
  },
  {
    q: "What happens if I don't respond to a lead?",
    a: "Response times are tracked and influence future assignments. Admin may reassign a lead if it goes unhandled, and you'll receive notifications to help you follow up.",
  },
  {
    q: "How do I cancel or deactivate?",
    a: "Contact our team. Suspension and deactivation are handled by administrators. The $1 activation fee is not refundable once your account is activated.",
  },
];

export default function FaqPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        photo={PHOTOS.openHouse}
        eyebrow={
          <>
            <HelpCircle size={13} /> Answers
          </>
        }
        title="Frequently Asked Questions"
        subtitle="Everything about the $1 activation, the 20% referral fee and how matching works."
      />

      <section className="py-24 sm:py-28">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Accordion items={FAQS} defaultOpen={0} />
          </div>

          <Reveal delay={160}>
            <SpotlightCard
              className="card-lift mx-auto mt-16 max-w-3xl rounded-[2rem] border border-brand-100 bg-white p-10 text-center shadow-[0_35px_90px_-65px_rgba(11,31,58,0.7)]"
              spotlightColor="rgba(201,164,74,0.12)"
            >
              <h2 className="font-display text-2xl font-bold text-brand-950 sm:text-3xl">
                Still have questions?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-brand-600">
                The fastest way to see how matching works in your market is to activate and complete
                onboarding.
              </p>
              <Link
                href="/join"
                className="btn-sheen group mt-7 inline-flex items-center gap-2 rounded-full bg-brand-950 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-950/20 transition-all duration-500 hover:shadow-xl"
              >
                Activate for $1
                <ArrowRight
                  size={18}
                  className="transition-transform duration-500 group-hover:translate-x-1.5"
                />
              </Link>
            </SpotlightCard>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
