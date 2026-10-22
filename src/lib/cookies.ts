/** Cookie names shared by server and client code (no server-only imports). */
export const PROFILE_COOKIE = "pk_profile";
export const LOCALE_COOKIE_NAME = "pk_locale";
export const THEME_COOKIE_NAME = "pk_theme";

type SameSite = "lax" | "strict" | "none";

/**
 * SameSite posture for browser-written cookies. Mirrors the server session
 * cookie configured in `src/lib/env.ts`. Read from a NEXT_PUBLIC_ variable so
 * it is inlined at build time and client components resolve exactly what the
 * server does.
 */
const SAME_SITE: SameSite = (() => {
  const raw = (process.env.NEXT_PUBLIC_COOKIE_SAME_SITE ?? "").trim().toLowerCase();
  return raw === "none" || raw === "strict" ? raw : "lax";
})();

/**
 * Write a non-sensitive preference cookie from the browser.
 *
 * Browsers reject `SameSite=None` without `Secure`, so Secure is forced in
 * that mode. Omitting it makes the cookie silently disappear — which presents
 * as "theme/language/profile changes don't save" whenever the app is embedded
 * in a cross-origin frame (sandbox or Vercel preview panels).
 *
 * These cookies hold only UI preferences. Never write health data, session
 * tokens, or identifiers to a browser-readable cookie.
 */
export function writeClientCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = SAME_SITE === "none" ? ";secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAgeSeconds}` +
    `;samesite=${SAME_SITE}${secure}`;
}

/** One year, the max-age used for durable UI preferences. */
export const PREFERENCE_MAX_AGE_SECONDS = 31_536_000;
