import { createHash, randomBytes } from "node:crypto";

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
