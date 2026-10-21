import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Droplets, FileText, Pill, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LabelValue, PageHeader } from "@/components/ui/misc";
import { DocumentRow } from "@/components/dashboard/document-row";
import { FlagBadge } from "@/components/dashboard/indicators";
import { getDashboardContext } from "@/server/dashboard/context";
import { requireOwnedProfile } from "@/server/auth/guard";
import { getStore } from "@/server/db";
import { formatDate } from "@/lib/format";
import { ApiError } from "@/server/auth/guard";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function FamilyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, activeProfile, t, locale } = await getDashboardContext();

  let profile;
  try {
    profile = await requireOwnedProfile(user.id, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const store = await getStore();
  const [documents, observations, medications] = await Promise.all([
    store.listDocuments({ userId: user.id, profileId: profile.id, limit: 10 }),
    store.listObservations({ userId: user.id, profileId: profile.id, limit: 8 }),
    store.listMedications({ userId: user.id, profileId: profile.id, activeOnly: true }),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/family"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("family.title")}
      </Link>

      <PageHeader
        eyebrow={t(`family.relation.${profile.relation}` as "family.relation.self")}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {profile.name}
            {profile.isPrimary && <Badge tone="accent">Primary</Badge>}
            {profile.id === activeProfile.id && <Badge tone="success">Active</Badge>}
            {/demo/i.test(profile.name) && <Badge tone="warning">{t("common.demoBadge")}</Badge>}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {profile.dob ? formatDate(profile.dob, locale) : "Date of birth not recorded"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Droplets className="size-3.5" aria-hidden />
              {profile.bloodGroup ?? "Blood group not recorded"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" aria-hidden />
              {profile.sex ?? "Sex not recorded"}
            </span>
          </span>
        }
        actions={
          <Link
            href="/dashboard/family"
            className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-xs text-ink hover:border-line-strong"
          >
            {t("family.edit")}
          </Link>
        }
      />

      {profile.notes && (
        <p className="rounded-xl border border-line bg-panel/40 px-4 py-3 text-xs leading-relaxed text-muted">
          {profile.notes}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("dash.stat.documents"), value: documents.total, icon: FileText },
          { label: t("dash.stat.results"), value: observations.length, icon: CalendarDays },
          { label: t("dash.stat.medications"), value: medications.length, icon: Pill },
        ].map((stat) => (
          <div key={stat.label} className="panel flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-panel-raised text-accent">
              <stat.icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-semibold text-ink">{stat.value}</p>
              <p className="text-[11px] text-faint">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("dash.recentDocuments")}
            action={
              <Link href={`/dashboard/documents`} className="text-xs text-accent hover:underline">
                {t("common.view")}
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
            <EmptyState compact title={t("docs.title")} description="No documents for this profile yet." />
          )}
        </Card>

        <Card>
          <CardHeader title={t("dash.recentResults")} />
          {observations.length > 0 ? (
            <ul className="divide-y divide-line/70">
              {observations.map((observation) => (
                <li key={observation.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink">{observation.testName}</p>
                    <p className="text-[11px] text-faint">
                      {observation.collectedAt ? formatDate(observation.collectedAt, locale) : "—"}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink">
                      {observation.valueText} {observation.unit ?? ""}
                    </span>
                    <FlagBadge flag={observation.flag} t={t} compact />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title={t("trends.noData")} description={t("trends.noDataBody")} />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title={t("meds.title")} description={t("meds.subtitle")} />
        {medications.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {medications.map((medication) => (
              <li key={medication.id} className="rounded-lg border border-line bg-panel/40 p-3">
                <p className="text-sm font-medium text-ink">
                  {medication.name} {medication.dosageText && <span className="text-muted">· {medication.dosageText}</span>}
                </p>
                <p className="mt-0.5 text-[11px] text-faint">{medication.scheduleText ?? "Schedule not recorded"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title={t("meds.empty")} description={t("meds.emptyBody")} />
        )}
      </Card>

      <dl className="grid gap-4 rounded-xl border border-line bg-panel/40 p-4 sm:grid-cols-3">
        <LabelValue label="Profile ID" value={profile.id} mono />
        <LabelValue label="Created" value={formatDate(profile.createdAt, locale)} />
        <LabelValue
          label="Authorization"
          value={
            profile.relation === "self"
              ? "Account owner"
              : profile.authorizationAffirmedAt
                ? `Affirmed ${formatDate(profile.authorizationAffirmedAt, locale)}`
                : "Not affirmed"
          }
        />
      </dl>
    </div>
  );
}
