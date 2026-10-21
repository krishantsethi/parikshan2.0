import type { ReactNode } from "react";
import { DashboardChrome } from "@/components/dashboard/shell-chrome";
import { getDashboardContext } from "@/server/dashboard/context";

/**
 * Authenticated shell. `getDashboardContext` redirects anonymous users to
 * /login and users without a profile to /onboarding — no private content is
 * ever rendered before this resolves.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profiles, activeProfile } = await getDashboardContext();
  return (
    <div className="app-backdrop min-h-dvh">
      <DashboardChrome user={user} profiles={profiles} activeProfile={activeProfile}>
        {children}
      </DashboardChrome>
    </div>
  );
}
