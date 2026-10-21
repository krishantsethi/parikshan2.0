import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  FileText,
  MessageSquareHeart,
  Pill,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentRow } from "@/components/dashboard/document-row";
import { FlagBadge } from "@/components/dashboard/indicators";
import { StatCard } from "@/components/dashboard/stat-card";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const { user, activeProfile, t, locale, isDemo, aiConfigured } = await getDashboardContext();
  const store = await getStore();

  const [stats, observations, documents] = await Promise.all([
    store.getDashboardStats(user.id, activeProfile.id),
    store.listObservations({ userId: user.id, profileId: activeProfile.id, verifiedOnly: true, limit: 6 }),
    store.listDocuments({ userId: user.id, profileId: activeProfile.id, limit: 5 }),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("dash.greeting.morning") : hour < 17 ? t("dash.greeting.afternoon") : t("dash.greeting.evening");
  const isNewWorkspace = stats.documentCount === 0 && stats.observationCount === 0;

  const checklist = [
    { done: true, label: t("dash.onboarding.step1"), href: "/dashboard/settings" },
    { done: stats.documentCount > 0, label: t("dash.onboarding.step2"), href: "/dashboard/documents/upload" },
    {
      done: documents.items.some((doc) => doc.status === "ready"),
      label: t("dash.onboarding.step3"),
      href: "/dashboard/documents",
    },
    { done: stats.conversationCount > 0, label: t("dash.onboarding.step4"), href: "/dashboard/assistant" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            {greeting}, {user.name.split(" ")[0]}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{t("dash.title")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t("dash.subtitle")} · <span className="text-ink">{activeProfile.name}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/documents/upload" icon={<UploadCloud className="size-4" />}>
            {t("dash.quick.upload")}
          </ButtonLink>
          <ButtonLink href="/dashboard/assistant" variant="secondary" icon={<Sparkles className="size-4" />}>
            {t("dash.quick.ask")}
          </ButtonLink>
        </div>
      </div>

      {isDemo && (
        <Alert tone="warning" title="Demo mode">
          {t("dash.demoBanner")}
        </Alert>
      )}
      {!aiConfigured && (
        <Alert tone="info" title="AI provider not configured">
          Documents are processed deterministically and the assistant still answers from your records.
          Add <code className="font-mono text-[11px]">OPENAI_API_KEY</code> to enable AI explanations.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dash.stat.documents")}
          value={stats.documentCount}
          icon={<FileText className="size-4" aria-hidden />}
          href="/dashboard/documents"
          hint={`${documents.items.filter((d) => d.status === "needs_review").length} awaiting review`}
        />
        <StatCard
          label={t("dash.stat.results")}
          value={stats.observationCount}
          icon={<Activity className="size-4" aria-hidden />}
          href="/dashboard/health-trends"
          accent="azure"
          hint={`${observations.filter((o) => o.flag === "high" || o.flag === "low").length} outside stated range`}
        />
        <StatCard
          label={t("dash.stat.medications")}
          value={stats.medicationCount}
          icon={<Pill className="size-4" aria-hidden />}
          href="/dashboard/medications"
          accent="success"
        />
        <StatCard
          label={t("dash.stat.conversations")}
          value={stats.conversationCount}
          icon={<BrainCircuit className="size-4" aria-hidden />}
          href="/dashboard/assistant"
          accent="warning"
        />
      </div>

      {isNewWorkspace ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <EmptyState
              icon={<FileText className="size-5" aria-hidden />}
              title={t("dash.empty.title")}
              description={t("dash.empty.body")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <ButtonLink href="/dashboard/documents/upload">{t("dash.quick.upload")}</ButtonLink>
                  <ButtonLink href="/dashboard/family" variant="secondary" icon={<Users className="size-4" />}>
                    {t("nav.family")}
                  </ButtonLink>
                </div>
              }
            />
          </Card>
          <Card>
            <CardHeader title={t("dash.onboarding.title")} description={t("dash.onboarding.subtitle")} />
            <ol className="space-y-2">
              {checklist.map((step, index) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-line hover:bg-panel/60"
                  >
                    {step.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <CircleDot className="size-4 shrink-0 text-faint" aria-hidden />
                    )}
                    <span className="text-[13px] text-muted">
                      <span className="mr-1.5 font-mono text-[10px] text-faint">0{index + 1}</span>
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg border border-line bg-panel/40 p-3 text-[11px] leading-relaxed text-faint">
              {t("assistant.safety")}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title={t("dash.recentDocuments")}
              action={
                <Link href="/dashboard/documents" className="flex items-center gap-1 text-xs text-accent hover:underline">
                  {t("common.all")} <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {documents.items.length > 0 ? (
              <div className="space-y-0.5">
                {documents.items.map((document) => (
                  <DocumentRow key={document.id} document={document} t={t} locale={locale} />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                title={t("docs.title")}
                description="Upload a report to see it here."
                action={<ButtonLink size="sm" href="/dashboard/documents/upload">{t("common.upload")}</ButtonLink>}
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title={t("dash.recentResults")}
              description={t("trends.onlyVerified")}
              action={
                <Link href="/dashboard/health-trends" className="flex items-center gap-1 text-xs text-accent hover:underline">
                  {t("common.view")} <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {observations.length > 0 ? (
              <ul className="divide-y divide-line/70">
                {observations.map((observation) => (
                  <li key={observation.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{observation.testName}</p>
                      <p className="text-[11px] text-faint">
                        {observation.collectedAt ? formatDate(observation.collectedAt, locale) : t("common.unknown")}
                        {observation.refText ? ` · ${observation.refText}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs text-ink">
                        {observation.valueText}
                        {observation.unit ? ` ${observation.unit}` : ""}
                      </span>
                      <FlagBadge flag={observation.flag} t={t} compact />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                title={t("trends.noData")}
                description={t("trends.noDataBody")}
                action={
                  <ButtonLink size="sm" href="/dashboard/health-trends" variant="secondary">
                    {t("trends.addManual")}
                  </ButtonLink>
                }
              />
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/dashboard/medications", icon: Pill, label: t("dash.quick.addMed") },
          { href: "/dashboard/interactions", icon: CheckCircle2, label: t("nav.interactions") },
          { href: "/dashboard/family", icon: Users, label: t("dash.quick.addFamily") },
          { href: "/dashboard/feedback", icon: MessageSquareHeart, label: t("nav.feedback") },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="panel group flex items-center gap-3 p-3.5 transition-colors hover:border-line-strong"
          >
            <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-panel-raised text-muted transition-colors group-hover:text-accent">
              <action.icon className="size-4" aria-hidden />
            </span>
            <span className="flex-1 truncate text-[13px] text-ink">{action.label}</span>
            <ArrowRight className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel/40 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-faint">{t("common.notMedicalAdvice")}</p>
        <Badge tone="neutral" className="hidden shrink-0 sm:inline-flex">
          Provenance on every value
        </Badge>
      </div>
    </div>
  );
}
