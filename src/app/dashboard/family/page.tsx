import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { ProfileManager, type ProfileCardData } from "@/components/family/profile-manager";
import { getDashboardContext } from "@/server/dashboard/context";
import { getStore } from "@/server/db";

export const metadata: Metadata = {
  title: "Family profiles",
  robots: { index: false, follow: false },
};

export default async function FamilyPage() {
  const { user, activeProfile, profiles, t, locale } = await getDashboardContext();
  const store = await getStore();

  const cards: ProfileCardData[] = await Promise.all(
    profiles.map(async (profile) => {
      const [documents, medications, observations] = await Promise.all([
        store.listDocuments({ userId: user.id, profileId: profile.id, limit: 1 }),
        store.listMedications({ userId: user.id, profileId: profile.id }),
        store.listObservations({ userId: user.id, profileId: profile.id, limit: 1 }),
      ]);
      return {
        profile,
        documentCount: documents.total,
        medicationCount: medications.length,
        observationCount: observations.length,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("nav.family")}
        title={t("family.title")}
        description={t("family.subtitle")}
      />
      <ProfileManager profiles={cards} activeProfileId={activeProfile.id} locale={locale} />
    </div>
  );
}
