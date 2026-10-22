import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { getLocaleFromCookie } from "@/i18n/server";
import { getThemeFromCookie } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "PARIKSHAN — Personal Health Intelligence",
    template: "%s · PARIKSHAN",
  },
  description:
    "Organize medical records, understand lab reports, track health trends, review medications, and ask grounded health questions — with your family, in one private place.",
  keywords: [
    "health records",
    "lab report explanation",
    "medical document management",
    "health trends",
    "medication review",
    "family health",
  ],
  openGraph: {
    type: "website",
    siteName: "PARIKSHAN",
    title: "PARIKSHAN — Personal Health Intelligence",
    description:
      "Your unified health companion: records, reports, trends, medications, and grounded AI answers — private by design.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PARIKSHAN — Personal Health Intelligence",
    description:
      "Organize records, understand reports, track trends, and ask grounded health questions.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07111F" },
    { media: "(prefers-color-scheme: light)", color: "#F4F8FC" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocaleFromCookie();
  const theme = await getThemeFromCookie();
  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {/*
          Hard safety net. `Reveal` already fails open (it renders visible
          markup on the server and only animates after mount), but if an
          animation library ever leaves an inline opacity behind and scripts
          do not run, this guarantees content is never stranded invisible.
          CSP permits inline styles via style-src 'unsafe-inline'.
        */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html: "[data-pk-reveal]{opacity:1 !important;transform:none !important}",
            }}
          />
        </noscript>
        <AppProviders locale={locale} theme={theme}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
