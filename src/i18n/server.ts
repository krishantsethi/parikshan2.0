import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { createTranslator, type Translate } from "@/i18n/index";
import type { Locale } from "@/types/domain";

export async function getLocaleFromCookie(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Server-side translator bound to the request locale. */
export async function getServerTranslator(): Promise<Translate> {
  const locale = await getLocaleFromCookie();
  return createTranslator(locale);
}
