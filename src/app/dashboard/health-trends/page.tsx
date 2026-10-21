import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { TrendExplorer, type TrendPoint } from "@/components/trends/trend-explorer";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";

export const metadata: Metadata = {
  title: "Health trends",
  robots: { index: false, follow: false },
};

export default async function HealthTrendsPage() {
  const { user, activeProfile, t, locale } = await getDashboardContext();
  const store = await getStore();
  const observations = await store.listObservations({
    userId: user.id,
    profileId: activeProfile.id,
    limit: 1000,
  });

  const points: TrendPoint[] = observations.map((observation) => ({
    id: observation.id,
    testName: observation.testName,
    valueText: observation.valueText,
    valueNumeric: observation.valueNumeric,
    unit: observation.unit,
    refLow: observation.refLow,
    refHigh: observation.refHigh,
    refText: observation.refText,
    flag: observation.flag,
    collectedAt: observation.collectedAt,
    verified: observation.verified,
    documentId: observation.documentId,
    notes: observation.notes,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={activeProfile.name}
        title={t("trends.title")}
        description={t("trends.subtitle")}
      />
      <TrendExplorer points={points} profileId={activeProfile.id} locale={locale} />
      <p className="rounded-xl border border-line bg-panel/40 px-4 py-3 text-[11px] leading-relaxed text-faint">
        {t("common.notMedicalAdvice")} Reference bands come from the range printed on the source
        report; where reports disagree, the most recent stated range is shown.
      </p>
    </div>
  );
}
