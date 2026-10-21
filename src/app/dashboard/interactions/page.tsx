import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { InteractionPanel, type MedicationOption } from "@/components/interactions/interaction-panel";
import { getConfig } from "@/lib/env";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";

export const metadata: Metadata = {
  title: "Interaction review",
  robots: { index: false, follow: false },
};

export default async function InteractionsPage() {
  const { user, activeProfile, t, locale } = await getDashboardContext();
  const store = await getStore();
  const [medications, checks] = await Promise.all([
    store.listMedications({ userId: user.id, profileId: activeProfile.id }),
    store.listInteractionChecks(user.id, activeProfile.id, 10),
  ]);

  const options: MedicationOption[] = medications.map((medication) => ({
    id: medication.id,
    name: medication.name,
    dosageText: medication.dosageText,
    active: medication.active,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={activeProfile.name}
        title={t("interactions.title")}
        description={t("interactions.subtitle")}
      />
      <InteractionPanel
        medications={options}
        initialChecks={checks}
        profileId={activeProfile.id}
        locale={locale}
        openfdaEnabled={getConfig().openfda.enabled}
      />
    </div>
  );
}
