"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { PRIMARY_NAV } from "@/components/layout/site-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function MobileNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-lg border border-line text-muted hover:text-ink"
        aria-label={t("nav.openMenu")}
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-base-deep/85 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("nav.menu")}
              className="panel-raised absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto rounded-l-2xl p-5"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="flex items-center justify-between">
                <Wordmark size={26} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-muted hover:bg-panel hover:text-ink"
                  aria-label={t("nav.closeMenu")}
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="mt-8 flex flex-col gap-1" aria-label={t("nav.mainNav")}>
                {PRIMARY_NAV.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm transition-colors",
                      pathname === link.href
                        ? "bg-panel text-ink"
                        : "text-muted hover:bg-panel/60 hover:text-ink",
                    )}
                  >
                    {t(link.key)}
                  </Link>
                ))}
                <Link
                  href="/blog"
                  className="rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-panel/60 hover:text-ink"
                >
                  {t("nav.blog")}
                </Link>
              </nav>

              <div className="mt-auto space-y-3 border-t border-line pt-5">
                <LocaleSwitcher className="w-full justify-center" />
                {isAuthenticated ? (
                  <ButtonLink href="/dashboard" fullWidth>
                    {t("nav.dashboard")}
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/signup" fullWidth>
                      {t("nav.signup")}
                    </ButtonLink>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setOpen(false);
                        window.location.href = "/login";
                      }}
                    >
                      {t("nav.login")}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
