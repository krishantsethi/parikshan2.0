import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Opaque 256-bit token (session cookie value, password-reset token). */
export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Tokens are stored only as SHA-256 hashes: a database leak cannot be replayed
 * as a session hijack, and lookup stays an indexed equality check.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/* ---------------------------------------------------- stateless demo session */

const DEMO_SESSION_PREFIX = "pkd1";

/**
 * Serverless deployments without a shared database cannot look a session up:
 * the lambda that mints a session is usually not the lambda that serves the
 * next request, so an in-memory session row disappears between clicks and the
 * demo bounces back to /login.
 *
 * The demo account therefore gets a SMALL, self-contained, HMAC-signed token
 * carrying only an expiry. It identifies nobody: each instance resolves its own
 * deterministically-seeded demo user by email after verifying the signature.
 * Real accounts always keep database-backed, hashed, revocable sessions.
 *
 * The token is honoured only when no DATABASE_URL is configured and demo mode
 * is on, so it can never authenticate against a real database.
 */
export function isStatelessDemoToken(token: string): boolean {
  return token.startsWith(`${DEMO_SESSION_PREFIX}.`);
}

export function signDemoSessionToken(secret: string, ttlSeconds: number): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt }), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${DEMO_SESSION_PREFIX}.${payload}`)
    .digest("base64url");
  return `${DEMO_SESSION_PREFIX}.${payload}.${signature}`;
}

export function verifyDemoSessionToken(
  secret: string,
  token: string,
): { expiresAt: number } | null {
  if (!isStatelessDemoToken(token)) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, payload, signature] = parts;

  const expected = createHmac("sha256", secret)
    .update(`${DEMO_SESSION_PREFIX}.${payload}`)
    .digest("base64url");
  const provided = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (provided.length !== want.length || !timingSafeEqual(provided, want)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) return null;
    if (parsed.exp <= Date.now()) return null;
    return { expiresAt: parsed.exp };
  } catch {
    return null;
  }
}
