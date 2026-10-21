import type { MessageKey } from "@/i18n";

export interface SiteNavLink {
  href: string;
  key: MessageKey;
}

export const PRIMARY_NAV: SiteNavLink[] = [
  { href: "/features", key: "nav.features" },
  { href: "/how-it-works", key: "nav.howItWorks" },
  { href: "/tools", key: "nav.tools" },
  { href: "/resources", key: "nav.resources" },
  { href: "/security", key: "nav.security" },
  { href: "/faq", key: "nav.faq" },
];

export const FOOTER_PRODUCT: SiteNavLink[] = [
  { href: "/features", key: "nav.features" },
  { href: "/how-it-works", key: "nav.howItWorks" },
  { href: "/tools", key: "nav.tools" },
  { href: "/security", key: "nav.security" },
];

export const FOOTER_LEARN: SiteNavLink[] = [
  { href: "/resources", key: "nav.resources" },
  { href: "/blog", key: "nav.blog" },
  { href: "/faq", key: "nav.faq" },
  { href: "/about", key: "nav.about" },
];

export const FOOTER_COMPANY: SiteNavLink[] = [
  { href: "/about", key: "nav.about" },
  { href: "/contact", key: "nav.contact" },
  { href: "/feedback", key: "nav.feedback" },
];

export const FOOTER_LEGAL: SiteNavLink[] = [
  { href: "/privacy", key: "footer.legal" },
  { href: "/terms", key: "footer.legal" },
  { href: "/disclaimer", key: "footer.legal" },
];
