"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import type { Locale, Theme } from "@/types/domain";

export function AppProviders({
  locale,
  theme,
  children,
}: {
  locale: Locale;
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <LocaleProvider locale={locale}>
        <ToastProvider>{children}</ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
