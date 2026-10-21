"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { DASHBOARD_NAV, isNavActive } from "@/components/dashboard/nav-config";
import { ProfileSwitcher } from "@/components/dashboard/profile-switcher";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/misc";
import type { HealthProfile, User } from "@/types/domain";
import { cn } from "@/lib/utils";

export function SidebarContent({
  user,
  profiles,
  activeProfile,
  onNavigate,
}: {
  user: User;
  profiles: HealthProfile[];
  activeProfile: HealthProfile;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { toast } = useToast();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({ title: t("auth.success.logout"), variant: "info" });
      router.push("/login");
      router.refresh();
    } catch {
      toast({ title: t("state.error.title"), variant: "error" });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link href="/dashboard" aria-label="PARIKSHAN dashboard">
          <Wordmark size={26} />
        </Link>
      </div>

      <div className="px-3 pb-3">
        <ProfileSwitcher profiles={profiles} activeProfile={activeProfile} />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label={t("nav.dashboardNav")}>
        {DASHBOARD_NAV.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint/80">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                        active
                          ? "bg-accent-dim text-ink"
                          : "text-muted hover:bg-panel hover:text-ink",
                      )}
                    >
                      <item.icon
                        className={cn("size-4 shrink-0", active ? "text-accent" : "text-faint group-hover:text-muted")}
                        aria-hidden
                      />
                      <span className="truncate">{t(item.key)}</span>
                      {active && (
                        <span className="ml-auto size-1.5 rounded-full bg-accent" aria-hidden />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-center justify-between gap-2 pb-2">
          <LocaleSwitcher compact />
          <ThemeToggle />
          <Link
            href="/dashboard/assistant"
            className="flex size-9 items-center justify-center rounded-lg border border-line text-accent transition-colors hover:border-accent/40"
            aria-label={t("nav.assistant")}
          >
            <Sparkles className="size-4" />
          </Link>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-panel/50 p-2">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-ink">{user.name}</p>
            <p className="truncate text-[10px] text-faint">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md p-1.5 text-faint transition-colors hover:bg-panel hover:text-danger"
            aria-label={t("nav.logout")}
            title={t("nav.logout")}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
