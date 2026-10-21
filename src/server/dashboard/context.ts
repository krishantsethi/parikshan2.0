import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "@/server/db";
import { getConfig } from "@/lib/env";
import { requireUserPage } from "@/server/auth/guard";
import { createTranslator, type Translate } from "@/i18n/index";
import { getLocaleFromCookie } from "@/i18n/server";
import type { HealthProfile, Locale, User } from "@/types/domain";

import { PROFILE_COOKIE } from "@/lib/cookies";
export { PROFILE_COOKIE };

export interface DashboardContext {
  user: User;
  profiles: HealthProfile[];
  activeProfile: HealthProfile;
  locale: Locale;
  t: Translate;
  isDemo: boolean;
  aiConfigured: boolean;
}

/**
 * Resolve everything an authenticated page needs:
 *  - the signed-in user (redirects to /login otherwise)
 *  - all owned profiles and the active one (cookie-validated, ownership-checked)
 *  - locale + translator
 *
 * The active profile cookie can only ever select a profile the user owns.
 */
export async function getDashboardContext(): Promise<DashboardContext> {
  const user = await requireUserPage();
  const store = await getStore();
  const profiles = await store.listProfiles(user.id);

  if (profiles.length === 0) redirect("/onboarding");

  const jar = await cookies();
  const cookieProfileId = jar.get(PROFILE_COOKIE)?.value;
  const activeProfile =
    profiles.find((profile) => profile.id === cookieProfileId) ??
    profiles.find((profile) => profile.isPrimary) ??
    profiles[0]!;

  const locale = await getLocaleFromCookie();
  const cfg = getConfig();

  return {
    user,
    profiles,
    activeProfile,
    locale,
    t: createTranslator(locale),
    isDemo: !cfg.databaseUrl,
    aiConfigured: cfg.ai.enabled,
  };
}
