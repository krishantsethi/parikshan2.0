"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { Wordmark } from "@/components/brand/logo";
import { useLocale } from "@/components/providers/locale-provider";
import type { HealthProfile, User } from "@/types/domain";

/**
 * Client chrome for the dashboard: a fixed desktop sidebar and an accessible
 * mobile drawer. The page content itself stays server-rendered.
 */
export function DashboardChrome({
  user,
  profiles,
  activeProfile,
  children,
}: {
  user: User;
  profiles: HealthProfile[];
  activeProfile: HealthProfile;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLocale();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-base-deep/40 lg:block">
        <SidebarContent user={user} profiles={profiles} activeProfile={activeProfile} />
      </aside>

      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-base/85 px-4 backdrop-blur-xl lg:hidden">
        <Wordmark size={24} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg border border-line text-muted"
          aria-label={t("nav.openMenu")}
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-base-deep/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("nav.menu")}
              className="panel-raised absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col rounded-r-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="flex items-center justify-end p-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-muted hover:bg-panel hover:text-ink"
                  aria-label={t("nav.closeMenu")}
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <SidebarContent
                  user={user}
                  profiles={profiles}
                  activeProfile={activeProfile}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <a
            href="#dashboard-content"
            className="sr-only focus:not-sr-only focus:rounded-lg focus:bg-panel-raised focus:px-3 focus:py-2 focus:text-sm"
          >
            {t("nav.skipToContent")}
          </a>
          <div id="dashboard-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
