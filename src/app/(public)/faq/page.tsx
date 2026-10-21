import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { FaqExplorer } from "@/components/marketing/faq-explorer";
import { MarketingSection, PageHero } from "@/components/marketing/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@/content/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about PARIKSHAN's document processing, OCR accuracy, grounded AI, privacy model, medication review, family profiles, and data controls.",
};

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ENTRIES.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Content is static and authored in-repo (no user input) — safe to inline.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageHero
        eyebrow="Support"
        title="Questions, answered honestly."
        description="Search everything we get asked about documents, OCR, AI, medications, privacy, and your account."
        badge="Updated with the product"
      />
      <MarketingSection>
        <div className="mx-auto max-w-3xl">
          <FaqExplorer entries={FAQ_ENTRIES} categories={FAQ_CATEGORIES} />

          <div className="mt-12 rounded-[var(--radius-card)] border border-line bg-panel/50 p-6 sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Still stuck?</h2>
              <p className="mt-1 text-xs text-muted">
                Send us a note — feedback is stored securely and reviewed by the team.
              </p>
            </div>
            <ButtonLink href="/contact" variant="secondary" className="mt-4 sm:mt-0" iconRight={<ArrowRight className="size-4" />}>
              Contact
            </ButtonLink>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
