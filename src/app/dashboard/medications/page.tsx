import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { MedicationManager, type MedicationRow } from "@/components/medications/medication-manager";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";

export const metadata: Metadata = {
  title: "Medications",
  robots: { index: false, follow: false },
};

export default async function MedicationsPage() {
  const { user, activeProfile, t, locale } = await getDashboardContext();
  const store = await getStore();
  const medications = await store.listMedications({ userId: user.id, profileId: activeProfile.id });

  const rows: MedicationRow[] = medications.map((medication) => ({
    id: medication.id,
    name: medication.name,
    dosageText: medication.dosageText,
    scheduleText: medication.scheduleText,
    startDate: medication.startDate,
    endDate: medication.endDate,
    active: medication.active,
    prescriber: medication.prescriber,
    notes: medication.notes,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={activeProfile.name}
        title={t("meds.title")}
        description={t("meds.subtitle")}
      />
      <MedicationManager medications={rows} profileId={activeProfile.id} locale={locale} />
    </div>
  );
}
