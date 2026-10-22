import { cache } from "react";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/env";
import { getStore } from "@/server/db";
import { hashToken, randomToken } from "@/server/auth/tokens";
import type { User } from "@/types/domain";

export const SESSION_COOKIE = "pk_session";

function cookieOptions(maxAgeSeconds: number) {
  const cfg = getConfig();
  // SameSite=None is only honoured by browsers alongside Secure. Without the
  // pair the cookie is dropped, which presents as a login that appears to
  // succeed and then bounces straight back to /login when the app is embedded
  // in a cross-origin frame (sandbox / Vercel preview panels).
  const secure = cfg.cookieSameSite === "none" ? true : cfg.isProduction;
  return {
    httpOnly: true,
    sameSite: cfg.cookieSameSite,
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Create a session row + set the httpOnly cookie. */
export async function establishSession(userId: string, userAgent: string | null): Promise<void> {
  const cfg = getConfig();
  const store = await getStore();
  const token = randomToken();
  const ttlSeconds = cfg.sessionTtlHours * 3600;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await store.createSession({ userId, tokenHash: hashToken(token), expiresAt, userAgent });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(ttlSeconds));
}

/** Destroy the current session (row + cookie). */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const store = await getStore();
    const session = await store.getSessionByTokenHash(hashToken(token));
    if (session) await store.deleteSession(session.id);
  }
  jar.set(SESSION_COOKIE, "", cookieOptions(0));
}

/**
 * Resolve the signed-in user for the current request, or null.
 * Memoized per-request via React cache() so pages, layouts, and guards
 * share one lookup.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const store = await getStore();
  const session = await store.getSessionByTokenHash(hashToken(token));
  if (!session) return null;
  return store.getUserById(session.userId);
});

/** Current user id without loading the full user row (best-effort). */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
