import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Camera,
  Calculator,
  ClipboardList,
  ExternalLink,
  MessageSquareQuote,
} from "lucide-react";
import { MarketingSection, PageHero, SectionHeading } from "@/components/marketing/page-hero";
import { Badge } from "@/components/ui/badge";
import { ARTICLES, articleWordCount } from "@/content/articles";
import { readingTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Practical guides for preparing report photos, organizing your records, preparing for appointments, and understanding lab results — plus trusted external sources.",
};

const checklists = [
  {
    icon: Camera,
    title: "Photographing a report for OCR",
    items: [
      "Use daylight or a bright lamp; avoid shadows across the text.",
      "Hold the camera directly above the page — no steep angle.",
      "Capture the whole page including margins and the header.",
      "Keep the page flat and free of glare; avoid folded creases.",
      "Photograph one page per image for the sharpest result.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Before your next appointment",
    items: [
      "Bring the last two or three reports for the same tests.",
      "Write down your current medications with strengths and schedule.",
      "Note any symptoms with dates, not just “recently”.",
      "List your questions — three focused ones beat fifteen vague ones.",
      "Ask for the results in writing or a portal link you can access.",
    ],
  },
  {
    icon: MessageSquareQuote,
    title: "Questions worth asking about a lab report",
    items: [
      "Which of these values matter given my symptoms and history?",
      "Do any of these need repeating, and when?",
      "Could a medication or recent illness be affecting these numbers?",
      "Is this the same method and laboratory as my previous test?",
      "What should I do if this changes before my next visit?",
    ],
  },
];

const externalSources = [
  { label: "World Health Organization — fact sheets", url: "https://www.who.int/news-room/fact-sheets", note: "Global health reference material" },
  { label: "MedlinePlus — lab tests", url: "https://medlineplus.gov/lab-tests/", note: "Plain-language test explanations (US NLM)" },
  { label: "MedlinePlus — drugs & supplements", url: "https://medlineplus.gov/druginformation.html", note: "Medication reference" },
  { label: "ICMR — Indian Council of Medical Research", url: "https://www.icmr.gov.in/", note: "Indian clinical and public-health guidance" },
  { label: "NHS — Health A-Z", url: "https://www.nhs.uk/conditions/", note: "Condition overviews (UK)" },
  { label: "U.S. FDA — drug labeling", url: "https://www.fda.gov/drugs/drug-interactions-labeling", note: "Official label information" },
];

export default function ResourcesPage() {
  const articles = ARTICLES.slice(0, 3);

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Material that makes you a better reader of your own records."
        description="Practical checklists and a curated set of trusted external sources. Nothing here is a substitute for a clinician, but it makes the conversation better."
        badge="Educational"
      />

      <MarketingSection>
        <SectionHeading
          eyebrow="Checklists"
          title="Small habits that dramatically improve outcomes"
          description="Scan quality decides OCR accuracy; preparation decides appointment quality."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {checklists.map((checklist) => (
            <div key={checklist.title} className="panel p-5">
              <checklist.icon className="size-5 text-accent" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-ink">{checklist.title}</h3>
              <ul className="mt-3 space-y-2">
                {checklist.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent/70" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection muted>
        <SectionHeading
          eyebrow="Reading"
          title="Start with these articles"
          description="Original, conservative explanations with sources listed on every article."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="panel group flex h-full flex-col p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center justify-between">
                <Badge tone="azure">{article.category}</Badge>
                <BookOpen className="size-4 text-faint" aria-hidden />
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-snug text-ink group-hover:text-accent">
                {article.title}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">
                {article.excerpt.slice(0, 140)}…
              </p>
              <p className="mt-3 text-[11px] text-faint">{readingTime(articleWordCount(article))} min read</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
            All articles <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
            <Calculator className="size-3.5" aria-hidden /> Interactive health tools
          </Link>
        </div>
      </MarketingSection>

      <MarketingSection>
        <SectionHeading
          eyebrow="External sources"
          title="Where to read further"
          description="These organisations are independent of PARIKSHAN. Links open in a new tab."
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {externalSources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="panel flex items-start justify-between gap-3 p-4 transition-colors hover:border-line-strong"
              >
                <span>
                  <span className="block text-sm font-medium text-ink">{source.label}</span>
                  <span className="mt-0.5 block text-xs text-faint">{source.note}</span>
                </span>
                <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs leading-relaxed text-faint">
          Content on external sites is governed by their own policies. PARIKSHAN does not endorse
          specific treatments, products, or clinicians.
        </p>
      </MarketingSection>
    </>
  );
}
