import type { Metadata } from "next";
import { ArrowRight, Compass, HeartHandshake, Layers, Scale } from "lucide-react";
import { MarketingSection, PageHero, SectionHeading } from "@/components/marketing/page-hero";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "PARIKSHAN's mission, responsible-AI principles, and the boundaries of what this platform is — and is not.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About PARIKSHAN"
        title="Health records should be legible to the person they belong to."
        description="PARIKSHAN is an independent, open engineering project exploring what a trustworthy personal health intelligence platform looks like when privacy and provenance come first."
        badge="Independent project"
      />

      <MarketingSection>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="pk-prose">
            <h2>Why this exists</h2>
            <p>
              A lab report is a communication between clinicians, written in a compressed technical
              dialect. For the person whose blood was drawn, it is often unreadable — yet it contains
              the most direct evidence of how their body is changing over time.
            </p>
            <p>
              PARIKSHAN was built around a single question: what would it take for a person to
              actually understand their own medical documents without pretending to be a doctor? The
              answer, it turns out, is mostly discipline — extraction you can verify, explanations
              that cite their source, and an assistant that admits what it does not know.
            </p>

            <h2>What we are deliberately not</h2>
            <ul>
              <li>
                <strong>Not a diagnostic tool.</strong> No risk scores, no disease predictions, no
                “your results suggest…” language.
              </li>
              <li>
                <strong>Not a treatment advisor.</strong> The platform never recommends starting,
                stopping, or changing a medication.
              </li>
              <li>
                <strong>Not a replacement for your clinician.</strong> Every explanation ends by
                pointing back to a qualified professional.
              </li>
              <li>
                <strong>Not a data broker.</strong> Your records are yours; there is no advertising
                model and no model-training pipeline.
              </li>
            </ul>

            <h2>A note on how this was built</h2>
            <p>
              The application, schema, pipelines, tests, and documentation were built from scratch in
              a repository that began with a single empty README. Claims on this site are tied to
              what is actually implemented; where a capability needs an API key or a certification,
              that requirement is stated rather than hidden behind a polished mock.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Compass,
                title: "Mission",
                body: "Make personal health information understandable, without inflating what software can know.",
              },
              {
                icon: Scale,
                title: "Responsibility",
                body: "Every AI response is grounded in retrieved records, cites its sources, and refuses clinical judgement calls.",
              },
              {
                icon: HeartHandshake,
                title: "Consent",
                body: "Family profiles require an explicit authorization affirmation; ownership is verified server-side on every request.",
              },
              {
                icon: Layers,
                title: "Craft",
                body: "Typed end to end, deterministic extraction, tested calculators, and honest empty states.",
              },
            ].map((item) => (
              <div key={item.title} className="panel p-5">
                <div className="flex items-center gap-2.5">
                  <item.icon className="size-4.5 text-accent" aria-hidden />
                  <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </MarketingSection>

      <MarketingSection muted>
        <SectionHeading
          eyebrow="Responsible AI"
          title="Six rules we do not break"
          description="These constraints are encoded in the assistant's system prompt, the retrieval layer, and the interface."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Ground or stay silent", "Personal claims require a retrieved record; otherwise the assistant says the information is missing."],
            ["Cite what it uses", "Answers reference the exact documents and measurements with source tags that map to real records."],
            ["Separate fact from education", "General knowledge is labeled as general — never blended into a personal interpretation."],
            ["No clinical decisions", "No diagnosis, no treatment changes, no reassurance that a symptom is harmless."],
            ["Escalate emergencies", "Emergency language triggers an immediate advisory to contact emergency services."],
            ["Show uncertainty", "Low OCR confidence, missing ranges, and ambiguous dates are surfaced, not smoothed over."],
          ].map(([title, body]) => (
            <div key={title} className="panel p-5">
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
        <Alert tone="info" className="mt-8" title="Language models can be wrong">
          Even with grounding, a model can misread context or overstate a conclusion. That is why
          extracted values are shown alongside every explanation, and why nothing in PARIKSHAN should
          be used as the sole basis for a health decision.
        </Alert>
      </MarketingSection>

      <MarketingSection>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-ink">See the architecture behind the claims</h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              The repository documents the schema, the data-store adapters, the OCR pipeline, and the
              AI grounding design.
            </p>
          </div>
          <div className="flex gap-3">
            <ButtonLink href="/security" variant="secondary">
              Security model
            </ButtonLink>
            <ButtonLink href="/how-it-works" iconRight={<ArrowRight className="size-4" />}>
              How it works
            </ButtonLink>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
