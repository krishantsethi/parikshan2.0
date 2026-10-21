import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;

/**
 * Hash a password with scrypt (memory-hard). Stored format:
 * `scrypt$N$r$p$<salt-hex>$<hash-hex>` — self-describing so parameters can be
 * upgraded later without breaking existing hashes.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, SCRYPT_PARAMS);
  return [
    "scrypt",
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

/** Constant-time password verification against the stored format. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const N = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  // Reject non-power-of-two cost, absurd params, and malformed hex. Without
  // these checks an empty/garbage hash can "verify" against an empty digest.
  if (!Number.isInteger(N) || N < 2 || (N & (N - 1)) !== 0 || N > 1_048_576) return false;
  if (!Number.isInteger(r) || r < 1 || r > 32) return false;
  if (!Number.isInteger(p) || p < 1 || p > 16) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || saltHex.length !== 32) return false;
  if (!/^[0-9a-f]+$/i.test(hashHex) || hashHex.length !== KEY_LENGTH * 2) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  let derived: Buffer;
  try {
    derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Basic password policy — deliberately modest; real strength comes from hashing + rate limits. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push("too_short");
  if (password.length > 256) problems.push("too_long");
  return problems;
}
