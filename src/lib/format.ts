import type { Locale } from "@/types/domain";

/**
 * Locale-aware formatting helpers.
 * IMPORTANT: medical values themselves are never reformatted or converted —
 * only dates and generic numbers are.
 */

export function formatDate(iso: string | Date | null | undefined, locale: Locale = "en"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(
  iso: string | Date | null | undefined,
  locale: Locale = "en",
): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatRelative(iso: string | Date | null | undefined, locale: Locale = "en"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return "—";
  const rtf = new Intl.RelativeTimeFormat(locale === "hi" ? "hi" : "en", { numeric: "auto" });
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(-days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.round(months / 12), "year");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Generic number formatting for UI chrome (counts, chart axes) only. */
export function formatNumber(n: number, locale: Locale = "en", digits = 1): string {
  return new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    maximumFractionDigits: digits,
  }).format(n);
}

/** Reading-time estimate from word count (~220 wpm). */
export function readingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 220));
}
