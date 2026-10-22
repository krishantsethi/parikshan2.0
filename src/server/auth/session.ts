import { cache } from "react";
import { cookies } from "next/headers";
import { getConfig, type AppConfig } from "@/lib/env";
import { getStore } from "@/server/db";
import {
  hashToken,
  isStatelessDemoToken,
  randomToken,
  signDemoSessionToken,
  verifyDemoSessionToken,
} from "@/server/auth/tokens";
import { DEMO_CREDENTIALS } from "@/server/db/memory-store";
import type { User } from "@/types/domain";

export const SESSION_COOKIE = "pk_session";

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: AppConfig["cookieSameSite"];
  secure: boolean;
  partitioned: boolean;
  path: "/";
  maxAge: number;
}

/**
 * The session cookie's attribute set, as a pure function so it can be asserted
 * in tests without a request context.
 *
 * - SameSite=None is only honoured by browsers alongside Secure; without the
 *   pair the cookie is dropped, which presents as a login that appears to
 *   succeed and then bounces straight back to /login.
 * - `partitioned` (CHIPS) partitions the cookie to the top-level site. When the
 *   app is embedded cross-origin this is what lets browsers that block
 *   third-party cookies outright (Chrome's phase-out, Safari ITP, Firefox)
 *   still store and send the session inside the frame.
 */
export function sessionCookieOptions(
  cfg: AppConfig,
  maxAgeSeconds: number,
): SessionCookieOptions {
  const embedded = cfg.cookieSameSite === "none";
  return {
    httpOnly: true,
    sameSite: cfg.cookieSameSite,
    secure: embedded ? true : cfg.isProduction,
    partitioned: embedded,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function cookieOptions(maxAgeSeconds: number) {
  return sessionCookieOptions(getConfig(), maxAgeSeconds);
}

/** Create a session row + set the httpOnly cookie. */
export async function establishSession(
  userId: string,
  userAgent: string | null,
  options?: { statelessDemo?: boolean },
): Promise<void> {
  const cfg = getConfig();
  const store = await getStore();
  const ttlSeconds = cfg.sessionTtlHours * 3600;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  if (options?.statelessDemo) {
    // No row: the signed token is the whole session, so any serverless
    // instance can honour it without shared storage.
    const token = signDemoSessionToken(cfg.authSecret, ttlSeconds);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, cookieOptions(ttlSeconds));
    return;
  }

  const token = randomToken();
  await store.createSession({ userId, tokenHash: hashToken(token), expiresAt, userAgent });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(ttlSeconds));
}

/** Destroy the current session (row + cookie). */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && !isStatelessDemoToken(token)) {
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

  if (isStatelessDemoToken(token)) {
    const cfg = getConfig();
    // Never honour a demo token on a deployment with a real database.
    if (cfg.databaseUrl || !cfg.demoMode) return null;
    if (!verifyDemoSessionToken(cfg.authSecret, token)) return null;
    return store.getUserByEmail(DEMO_CREDENTIALS.email);
  }

  const session = await store.getSessionByTokenHash(hashToken(token));
  if (!session) return null;
  return store.getUserById(session.userId);
});

/** Current user id without loading the full user row (best-effort). */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
