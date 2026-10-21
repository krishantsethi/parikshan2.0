import enMessages from "@/i18n/messages/en.json";
import hiMessages from "@/i18n/messages/hi.json";
import type { Locale } from "@/types/domain";

/** English is the source of truth for available keys. */
export type MessageKey = keyof typeof enMessages;

const dictionaries: Record<Locale, Record<string, string>> = {
  en: enMessages,
  hi: hiMessages as unknown as Record<MessageKey, string>,
};

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/**
 * Create a translator for a locale. Falls back to English, then to the key
 * itself, so a missing translation can never render `undefined`.
 */
export function createTranslator(locale: Locale): Translate {
  const dict = dictionaries[locale];
  return (key, vars) => {
    let value = dict[key] ?? dictionaries.en[key] ?? key;
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
    }
    return value;
  };
}

/** Typed key list used by tests to guarantee hi parity with en. */
export const ALL_KEYS = Object.keys(enMessages) as MessageKey[];
