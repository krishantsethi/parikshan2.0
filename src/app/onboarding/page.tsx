import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getServerTranslator } from "@/i18n/server";
import { getStore } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await getStore();
  const profiles = await store.listProfiles(user.id);
  const primary = profiles.find((profile) => profile.isPrimary) ?? profiles[0];

  if (!primary) {
    return (
      <div className="app-backdrop flex min-h-dvh items-center justify-center px-5">
        <Alert tone="danger" title="Profile missing">
          Your account has no health profile. Please sign out and create a new account, or contact
          support.
        </Alert>
      </div>
    );
  }

  const t = await getServerTranslator();

  return (
    <div className="app-backdrop relative min-h-dvh">
      <div className="absolute inset-0 grid-overlay opacity-50" aria-hidden />
      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link href="/" aria-label="PARIKSHAN home">
          <Wordmark size={26} />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-faint">
            Step 1 of 1
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative mx-auto max-w-xl px-5 pb-20">
        <div className="panel p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink">{t("auth.onboarding.title")}</h1>
              <p className="text-sm text-muted">{t("auth.onboarding.subtitle")}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-lg border border-success/25 bg-success-dim px-3 py-2 text-xs text-muted">
            <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
            Account created for <span className="font-medium text-ink">{user.email}</span>
          </div>

          <div className="mt-6">
            <OnboardingForm profile={primary} displayName={user.name} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-faint">
          <span>You can refine this later in Settings.</span>
          <ButtonLink href="/dashboard" variant="link">
            Skip for now
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
