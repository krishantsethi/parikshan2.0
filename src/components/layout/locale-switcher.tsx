"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { LOCALE_LABELS } from "@/i18n/config";
import type { Locale } from "@/types/domain";
import { cn } from "@/lib/utils";

/** Language selector — switching immediately re-renders the server UI. */
export function LocaleSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const { locale, setLocale, availableLocales } = useLocale();

  if (compact) {
    return (
      <label className={cn("relative flex items-center", className)}>
        <span className="sr-only">Language</span>
        <Languages className="pointer-events-none absolute left-2.5 size-3.5 text-faint" aria-hidden />
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="h-8 appearance-none rounded-lg border border-line bg-panel/60 py-0 pr-2 pl-7 text-xs text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
        >
          {availableLocales.map((code) => (
            <option key={code} value={code}>
              {code === "en" ? "EN" : "हि"}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-line bg-panel/60 p-0.5",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <Languages className="ml-1.5 size-3.5 text-faint" aria-hidden />
      {availableLocales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            locale === code ? "bg-panel-raised text-ink" : "text-muted hover:text-ink",
          )}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
