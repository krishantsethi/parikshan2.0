import type { Metadata } from "next";
import { ArrowRight, FileScan, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { MarketingSection, PageHero, SectionHeading } from "@/components/marketing/page-hero";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/vfx/motion";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Upload a report, review what the parser found, then track confirmed measurements over time. Every processing step is explained.",
};

const steps = [
  {
    icon: UploadCloud,
    title: "1 · Add a document",
    body: "Drag in a PDF, PNG, JPEG, or WebP. The file is validated by its actual bytes — not just its extension — against a configurable size limit. Nothing is sent to a third party to be stored.",
    mock: (
      <div className="rounded-xl border border-dashed border-line-strong bg-panel/50 p-6 text-center">
        <UploadCloud className="mx-auto size-7 text-accent" aria-hidden />
        <p className="mt-3 text-sm text-ink">SAMPLE — Lipid Profile.pdf</p>
        <p className="mt-1 font-mono text-[11px] text-faint">application/pdf · 41 KB · validated</p>
        <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-panel-raised">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-accent to-azure" />
        </div>
      </div>
    ),
  },
  {
    icon: FileScan,
    title: "2 · Review the extraction",
    body: "Digital PDFs are read from their text layer; images run through local OCR. The parser captures each value with its printed unit and range, then you confirm or correct every row before it counts.",
    mock: (
      <div className="space-y-2 rounded-xl border border-line bg-panel/50 p-4">
        {[
          ["Haemoglobin", "12.8 g/dL", "13.0 – 17.0", "low"],
          ["Platelet Count", "240000 /uL", "150000 – 400000", "normal"],
          ["Total Cholesterol", "212 mg/dL", "< 200", "high"],
        ].map(([name, value, range, flag]) => (
          <div key={name} className="flex items-center justify-between gap-2 border-b border-line/60 pb-2 last:border-0 last:pb-0">
            <span className="text-xs text-ink">{name}</span>
            <span className="font-mono text-[11px] text-muted">{value}</span>
            <span className="hidden font-mono text-[10px] text-faint sm:inline">{range}</span>
            <Badge tone={flag === "normal" ? "success" : flag === "low" ? "azure" : "warning"}>
              {flag}
            </Badge>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Sparkles,
    title: "3 · Understand and track",
    body: "Read a plain-language explanation, ask the assistant questions grounded in your files, and watch confirmed values form trends with reference bands and source attribution.",
    mock: (
      <div className="rounded-xl border border-line bg-panel/50 p-4">
        <div className="flex h-28 items-end gap-2">
          {[38, 52, 44, 63, 58, 74, 69, 82].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t bg-gradient-to-t from-azure/40 to-accent/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-faint">Haemoglobin · 4 confirmed points · illustrative</p>
      </div>
    ),
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="Workflow"
        title="From a PDF to a number you can trust."
        description="PARIKSHAN is deliberately boring about how data becomes trusted: validate, extract, review, confirm, then chart. No step is skipped silently."
        badge="Transparent by design"
      />

      <MarketingSection>
        <div className="space-y-16">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={0.05}>
              <div
                className={`grid items-center gap-8 lg:grid-cols-2 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-accent/25 bg-accent-dim text-accent">
                    <step.icon className="size-5" aria-hidden />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-ink">{step.title}</h2>
                  <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
                <div aria-hidden>{step.mock}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection muted>
        <SectionHeading
          eyebrow="When things go wrong"
          title="Failure states are first-class"
          description="Medical data is messy. Every failure below produces a clear, actionable message instead of a silent blank screen."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Scanned PDF with no text layer",
              body: "We say the PDF has no selectable text and suggest photographing the pages instead — we do not pretend OCR succeeded.",
            },
            {
              title: "OCR confidence is low",
              body: "The document is still processed, but every value is flagged for careful review and the confidence percentage is shown.",
            },
            {
              title: "No reference range printed",
              body: "The value is stored with a flag of “unknown”. We never guess a range or diagnose from a single number.",
            },
            {
              title: "Unreadable or protected file",
              body: "The upload fails with a specific reason (password-protected, corrupt, unsupported) and a retry path.",
            },
          ].map((item) => (
            <div key={item.title} className="panel p-5">
              <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>

        <Alert tone="info" className="mt-8" title="A note on AI explanations">
          AI explanations are generated only when a provider is configured. Without one, PARIKSHAN
          shows a deterministic structured digest and labels it as such — never an AI-looking summary
          that was not actually produced by a model.
        </Alert>
      </MarketingSection>

      <MarketingSection>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
              <ShieldCheck className="size-5 text-accent" aria-hidden />
              Your records stay yours
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted">
              Every download is authenticated and ownership-checked. Export or delete everything from
              Settings whenever you want.
            </p>
          </div>
          <div className="flex gap-3">
            <ButtonLink href="/security" variant="secondary">
              Security model
            </ButtonLink>
            <ButtonLink href="/signup" iconRight={<ArrowRight className="size-4" />}>
              Get started
            </ButtonLink>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
