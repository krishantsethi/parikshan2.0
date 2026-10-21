import type { Locale } from "@/types/domain";

export const LOCALE_COOKIE = "pk_locale";
export const LOCALES: readonly Locale[] = ["en", "hi"] as const;
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "hi";
}
