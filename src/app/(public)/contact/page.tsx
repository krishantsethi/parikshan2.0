import type { Metadata } from "next";
import { LifeBuoy, MailX, ShieldCheck, Sparkles } from "lucide-react";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { MarketingSection, PageHero, SectionHeading } from "@/components/marketing/page-hero";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/server/auth/session";
import { capabilityReport } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Send feedback, bug reports, or feature requests to the PARIKSHAN team. Security reports should go through the repository's private advisory.",
};

export default async function ContactPage() {
  const user = await getCurrentUser();
  const capabilities = capabilityReport();

  return (
    <>
      <PageHero
        eyebrow="Contact & feedback"
        title="Talk to the people who built it."
        description="Feature requests, bug reports, and honest criticism all land in the same secure feedback store — no ticketing software required."
      />
      <MarketingSection>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="panel p-6">
            <SectionHeading title="Send a message" description="Every submission is validated server-side and rate-limited." />
            <div className="mt-6">
              <FeedbackForm signedInAs={user?.email} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="panel p-5">
              <div className="flex items-center gap-2.5">
                <LifeBuoy className="size-4.5 text-accent" aria-hidden />
                <h2 className="text-sm font-semibold text-ink">Support</h2>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Include the page you were on, what you expected, and what happened. Never paste full
                medical reports or other people's health information into a support message.
              </p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4.5 text-accent" aria-hidden />
                <h2 className="text-sm font-semibold text-ink">Security reports</h2>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Use the GitHub repository's private vulnerability reporting instead of a public issue
                or this form. Include reproduction steps and the affected commit.
              </p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2.5">
                <MailX className="size-4.5 text-warning" aria-hidden />
                <h2 className="text-sm font-semibold text-ink">Email delivery</h2>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                This deployment has no transactional email provider configured. Password-reset links
                are printed to the server console in development; there is no monitored inbox. Use
                this form for contact.
              </p>
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4.5 text-accent" aria-hidden />
                <h2 className="text-sm font-semibold text-ink">Deployment capabilities</h2>
              </div>
              <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
                <li>Database: {capabilities.database.label}</li>
                <li>AI: {capabilities.ai.label}</li>
                <li>OCR: {capabilities.ocr.label}</li>
                <li>Interactions: {capabilities.openfda.label}</li>
              </ul>
            </div>
          </div>
        </div>

        <Alert tone="danger" className="mt-10" title="Not for medical emergencies">
          If you are experiencing chest pain, difficulty breathing, severe bleeding, or any other
          emergency symptom, contact emergency services (112 in India) or go to the nearest emergency
          department. PARIKSHAN cannot respond to emergencies.
        </Alert>
      </MarketingSection>
    </>
  );
}
