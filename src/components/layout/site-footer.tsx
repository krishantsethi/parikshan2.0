import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import {
  FOOTER_COMPANY,
  FOOTER_LEARN,
  FOOTER_PRODUCT,
} from "@/components/layout/site-nav";
import { getServerTranslator } from "@/i18n/server";
import { Badge } from "@/components/ui/badge";

export async function SiteFooter() {
  const t = await getServerTranslator();
  const year = new Date().getFullYear();

  const columns = [
    { heading: t("footer.product"), links: FOOTER_PRODUCT },
    { heading: t("footer.learn"), links: FOOTER_LEARN },
    { heading: t("footer.company"), links: FOOTER_COMPANY },
  ];

  return (
    <footer className="border-t border-line bg-base-deep/40">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)_1fr]">
          <div className="max-w-xs">
            <Wordmark size={28} />
            <p className="mt-4 text-sm leading-relaxed text-muted">{t("brand.fullTagline")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="accent" dot>
                {t("common.demoBadge")}: demo mode
              </Badge>
              <span className="text-[11px] text-faint">v0.1 · build {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}</span>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link, index) => (
                  <li key={`${link.href}-${index}`}>
                    <Link href={link.href} className="text-sm text-muted transition-colors hover:text-ink">
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              {t("footer.legal")}
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/privacy" className="text-sm text-muted hover:text-ink">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted hover:text-ink">
                  Terms of use
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-sm text-muted hover:text-ink">
                  Medical disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs text-faint lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent/70" aria-hidden />
            <span>
              © {year} PARIKSHAN · {t("footer.rights")}
            </span>
          </div>
          <p className="max-w-2xl leading-relaxed">{t("footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
