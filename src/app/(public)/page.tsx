import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  FileScan,
  Languages,
  Lock,
  Pill,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { HeroVisual } from "@/components/vfx/hero-visual";
import { AnimatedCounter, Reveal } from "@/components/vfx/motion";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getServerTranslator } from "@/i18n/server";

export default async function LandingPage() {
  const t = await getServerTranslator();

  const features = [
    { icon: FileScan, title: t("landing.features.docIntel.title"), body: t("landing.features.docIntel.body") },
    { icon: Sparkles, title: t("landing.features.explain.title"), body: t("landing.features.explain.body") },
    { icon: Activity, title: t("landing.features.trends.title"), body: t("landing.features.trends.body") },
    { icon: Pill, title: t("landing.features.meds.title"), body: t("landing.features.meds.body") },
    { icon: BrainCircuit, title: t("landing.features.assistant.title"), body: t("landing.features.assistant.body") },
    { icon: Users, title: t("landing.features.family.title"), body: t("landing.features.family.body") },
  ];

  const stats = [
    { value: 8, label: t("landing.stats.documents") },
    { value: 2, label: t("landing.stats.languages") },
    { value: 5, label: t("landing.stats.tools") },
  ];

  const problems = [
    { title: t("landing.problem.1.title"), body: t("landing.problem.1.body"), icon: ScanLine },
    { title: t("landing.problem.2.title"), body: t("landing.problem.2.body"), icon: Lock },
    { title: t("landing.problem.3.title"), body: t("landing.problem.3.body"), icon: Users },
  ];

  const steps = [
    { title: t("landing.how.step1.title"), body: t("landing.how.step1.body") },
    { title: t("landing.how.step2.title"), body: t("landing.how.step2.body") },
    { title: t("landing.how.step3.title"), body: t("landing.how.step3.body") },
  ];

  const principles = [
    { title: t("landing.principles.1.title"), body: t("landing.principles.1.body") },
    { title: t("landing.principles.2.title"), body: t("landing.principles.2.body") },
    { title: t("landing.principles.3.title"), body: t("landing.principles.3.body") },
    { title: t("landing.principles.4.title"), body: t("landing.principles.4.body") },
  ];

  const previewRows = [
    { name: "Total Cholesterol", value: "212", unit: "mg/dL", range: "< 200", flag: "High" },
    { name: "LDL Cholesterol", value: "138", unit: "mg/dL", range: "< 100", flag: "High" },
    { name: "HDL Cholesterol", value: "44", unit: "mg/dL", range: "> 40", flag: "Within" },
    { name: "Triglycerides", value: "165", unit: "mg/dL", range: "< 150", flag: "High" },
  ];

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line/60">
        <div className="absolute inset-0 grid-overlay opacity-70" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] lg:block" aria-hidden>
          <HeroVisual />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-40 lg:hidden" aria-hidden>
          <HeroVisual />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="max-w-2xl">
              <Reveal>
                <Badge tone="accent" dot className="mb-6 backdrop-blur">
                  {t("landing.hero.eyebrow")}
                </Badge>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.9rem]">
                  {t("landing.hero.title")}{" "}
                  <span className="text-gradient">{t("landing.hero.titleAccent")}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-[17px]">
                  {t("landing.hero.subtitle")}
                </p>
              </Reveal>
              <Reveal delay={0.18}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <ButtonLink href="/signup" size="lg" iconRight={<ArrowRight className="size-4" />}>
                    {t("landing.hero.ctaPrimary")}
                  </ButtonLink>
                  <ButtonLink href="/how-it-works" size="lg" variant="secondary">
                    {t("landing.hero.ctaSecondary")}
                  </ButtonLink>
                </div>
                <Link
                  href="/login?demo=1"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 transition hover:underline"
                >
                  {t("landing.hero.demoCta")}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Reveal>
              <Reveal delay={0.24}>
                <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs text-faint">
                  <li className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-accent/80" aria-hidden />
                    {t("landing.trust.private")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5 text-accent/80" aria-hidden />
                    {t("landing.trust.noDevice")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Lock className="size-3.5 text-accent/80" aria-hidden />
                    {t("landing.trust.control")}
                  </li>
                </ul>
              </Reveal>
            </div>

            {/* interface preview — clearly labeled sample */}
            <Reveal delay={0.15} className="relative hidden lg:block">
              <div className="relative mx-auto w-full max-w-md">
                <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_60%_30%,rgba(66,232,245,0.14),transparent_65%)]" aria-hidden />
                <div className="panel relative overflow-hidden p-0 backdrop-blur-2xl">
                  <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-faint">
                      <span className="size-1.5 rounded-full bg-accent animate-blink" aria-hidden />
                      {t("landing.preview.label")}
                    </div>
                    <Badge tone="success" dot>
                      {t("landing.preview.status")}
                    </Badge>
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-mono text-xs text-muted">{t("landing.preview.title")}</p>
                    <div className="mt-3 divide-y divide-line/70">
                      {previewRows.map((row) => (
                        <div key={row.name} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="text-sm text-ink">{row.name}</span>
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono text-sm text-ink">{row.value}</span>
                            <span className="w-14 font-mono text-[11px] text-faint">{row.unit}</span>
                            <span
                              className={
                                row.flag === "High"
                                  ? "rounded-full border border-warning/30 bg-warning-dim px-2 py-0.5 text-[10px] font-medium text-warning"
                                  : "rounded-full border border-success/30 bg-success-dim px-2 py-0.5 text-[10px] font-medium text-success"
                              }
                            >
                              {row.flag === "High" ? "Above range" : "Within range"}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-faint">{t("landing.preview.note")}</p>
                  </div>
                  <div className="border-t border-line bg-panel/60 px-5 py-3">
                    <Link
                      href="/login?demo=1"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                    >
                      {t("landing.preview.cta")} <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  </div>
                </div>

                {/* floating mini card */}
                <div className="panel absolute -bottom-8 -left-8 hidden w-56 items-center gap-3 p-3.5 xl:flex animate-float">
                  <div className="flex size-9 items-center justify-center rounded-full border border-accent/25 bg-accent-dim">
                    <FileScan className="size-4 text-accent" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">OCR · pdf_text</p>
                    <p className="text-[10px] text-faint">4 values extracted · reviewed</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ stats */}
      <section className="border-b border-line/60 bg-base-deep/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-5 py-10 sm:grid-cols-4 lg:px-8">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.05} className="px-2 py-3 sm:px-6">
              <p className="text-3xl font-semibold tracking-tight text-ink">
                <AnimatedCounter value={stat.value} />
              </p>
              <p className="mt-1 text-xs leading-relaxed text-faint">{stat.label}</p>
            </Reveal>
          ))}
          <Reveal delay={0.15} className="px-2 py-3 sm:px-6">
            <p className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-ink">
              <Languages className="size-6 text-accent" aria-hidden />
              <span className="text-base font-medium text-muted">EN · हिन्दी</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-faint">{t("landing.stats.openSource")}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- problem */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {t("landing.problem.eyebrow")}
          </p>
          <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.15]">
            {t("landing.problem.title")}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {problems.map((problem, index) => (
            <Reveal key={problem.title} delay={index * 0.08}>
              <div className="panel h-full p-6 transition-colors hover:border-line-strong">
                <problem.icon className="size-5 text-accent" aria-hidden />
                <h3 className="mt-4 text-base font-semibold text-ink">{problem.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{problem.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- features */}
      <section className="border-y border-line/60 bg-base-deep/30">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.15]">
              {t("landing.features.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              {t("landing.features.subtitle")}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.06}>
                <div className="group panel relative h-full overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-raised)]">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  <div className="flex size-10 items-center justify-center rounded-xl border border-line bg-panel-raised text-accent">
                    <feature.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1} className="mt-8">
            <ButtonLink href="/features" variant="link" iconRight={<ArrowRight className="size-4" />}>
              {t("nav.features")}
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal>
          <h2 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.15]">
            {t("landing.how.title")}
          </h2>
        </Reveal>
        <div className="relative mt-14 grid gap-10 md:grid-cols-3">
          <div className="absolute left-6 right-6 top-6 hidden h-px bg-gradient-to-r from-accent/60 via-azure/40 to-transparent md:block" aria-hidden />
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.1} className="relative">
              <div className="flex size-12 items-center justify-center rounded-full border border-accent/30 bg-base font-mono text-sm font-semibold text-accent shadow-[var(--shadow-glow)]">
                0{index + 1}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{step.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15} className="mt-10">
          <ButtonLink href="/how-it-works" variant="secondary" iconRight={<ArrowRight className="size-4" />}>
            {t("nav.howItWorks")}
          </ButtonLink>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- assistant */}
      <section className="border-y border-line/60 bg-base-deep/30">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <Reveal>
            <Badge tone="azure" className="mb-5">
              Grounded AI
            </Badge>
            <h2 className="max-w-lg text-balance text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.15]">
              {t("landing.assistant.title")}
            </h2>
            <ul className="mt-7 space-y-3 text-sm text-muted">
              {[
                "Answers cite the exact document and measurement they came from.",
                "Missing information is stated plainly — never invented.",
                "Never diagnoses, never changes a prescription.",
                "Works in English and Hindi; values and units stay untouched.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent/80" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
                  Illustrative conversation
                </span>
                <Badge tone="warning">{t("common.demoBadge")}</Badge>
              </div>
              <div className="space-y-4 p-5">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-line bg-panel-raised px-4 py-2.5 text-sm text-ink">
                  Which values in my lipid profile were outside the reference range?
                </div>
                <div className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-md border border-accent/15 bg-accent-dim px-4 py-3 text-sm leading-relaxed text-ink/90">
                  <p>
                    In your lipid profile from 14 Mar 2025, three values sit outside the ranges
                    printed on the report: Total Cholesterol <strong>212 mg/dL</strong> (desirable
                    &lt; 200), LDL <strong>138 mg/dL</strong> (optimal &lt; 100), and Triglycerides{" "}
                    <strong>165 mg/dL</strong> (normal &lt; 150). HDL (44 mg/dL) is within the
                    desirable band. <span className="text-accent">[S1]</span>
                  </p>
                  <p className="text-xs text-muted">
                    I can describe what the document states, not interpret it clinically. Your
                    clinician can discuss what these mean together with your history.
                  </p>
                  <p className="border-t border-accent/15 pt-2 text-[10px] uppercase tracking-wider text-faint">
                    {t("landing.assistant.note")}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- security */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <Reveal>
            <div className="flex size-11 items-center justify-center rounded-xl border border-accent/25 bg-accent-dim">
              <ShieldCheck className="size-5 text-accent" aria-hidden />
            </div>
            <h2 className="mt-5 max-w-md text-balance text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.15]">
              {t("landing.security.title")}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              {t("landing.security.body")}
            </p>
            <ButtonLink href="/security" variant="secondary" className="mt-6" iconRight={<ArrowRight className="size-4" />}>
              {t("landing.security.link")}
            </ButtonLink>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="panel divide-y divide-line p-0">
              {[
                ["scrypt password hashing", "Memory-hard KDF with per-user salts"],
                ["Server-side ownership checks", "Every document, profile and chat is scoped to you"],
                ["Private document access", "Downloads require an authenticated, ownership-checked request"],
                ["No model training on your data", "AI provider receives only the excerpts needed to answer"],
                ["Export & delete anytime", "Full JSON export; account deletion cascades everything"],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3 px-5 py-3.5">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-faint">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- principles */}
      <section className="border-y border-line/60 bg-base-deep/30">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {t("landing.principles.eyebrow")}
            </p>
            <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.15]">
              {t("landing.principles.title")}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 0.06}>
                <div className="panel h-full p-5">
                  <p className="font-mono text-[11px] text-accent/70">0{index + 1}</p>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{principle.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{principle.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.25rem] border border-line-strong bg-panel/60 px-6 py-14 text-center sm:px-12">
            <div className="absolute inset-0 grid-overlay opacity-40" aria-hidden />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" aria-hidden />
            <div className="relative mx-auto max-w-2xl">
              <Badge tone="accent" className="mb-5">
                {t("landing.cta.badge")}
              </Badge>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {t("landing.cta.title")}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">{t("landing.cta.subtitle")}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/signup" size="lg" iconRight={<ArrowRight className="size-4" />}>
                  {t("landing.hero.ctaPrimary")}
                </ButtonLink>
                <ButtonLink href="/login?demo=1" size="lg" variant="secondary">
                  {t("landing.hero.demoCta")}
                </ButtonLink>
              </div>
              <p className="mx-auto mt-6 max-w-md text-[11px] leading-relaxed text-faint">
                {t("landing.demo.note")}
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
