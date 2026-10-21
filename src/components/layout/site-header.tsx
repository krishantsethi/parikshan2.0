import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { PRIMARY_NAV } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { getServerTranslator } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/session";

export async function SiteHeader() {
  const t = await getServerTranslator();
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-base/80 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-panel-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        {t("nav.skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="PARIKSHAN home">
          <Wordmark size={28} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("nav.mainNav")}>
          {PRIMARY_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-panel/60 hover:text-ink"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden sm:flex" />
          {user ? (
            <ButtonLink href="/dashboard" size="sm" iconRight={<ArrowRight className="size-3.5" />}>
              {t("nav.dashboard")}
            </ButtonLink>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink sm:block"
              >
                {t("nav.login")}
              </Link>
              <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">
                {t("nav.signup")}
              </ButtonLink>
            </>
          )}
          <MobileNav isAuthenticated={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
