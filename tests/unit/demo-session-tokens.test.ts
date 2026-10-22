import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isStatelessDemoToken,
  signDemoSessionToken,
  verifyDemoSessionToken,
} from "@/server/auth/tokens";

const SECRET = "a".repeat(64);
const OTHER = "b".repeat(64);

afterEach(() => {
  vi.useRealTimers();
});

/**
 * The demo session token is the only thing standing between a visitor and the
 * demo workspace on a serverless deployment with no shared database. It must
 * verify on any instance, and refuse everything that is not exactly what was
 * signed.
 */
describe("stateless demo session tokens", () => {
  it("round-trips a freshly signed token", () => {
    const token = signDemoSessionToken(SECRET, 3600);

    expect(isStatelessDemoToken(token)).toBe(true);
    const verified = verifyDemoSessionToken(SECRET, token);
    expect(verified).not.toBeNull();
    expect(verified?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("carries no user identifier or other payload claims", () => {
    const token = signDemoSessionToken(SECRET, 60);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    expect(Object.keys(payload)).toEqual(["exp"]);
  });

  it("rejects a tampered payload", () => {
    const token = signDemoSessionToken(SECRET, 3600);
    const [prefix, , sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ exp: Date.now() + 10_000_000 })).toString(
      "base64url",
    );

    expect(verifyDemoSessionToken(SECRET, `${prefix}.${forged}.${sig}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signDemoSessionToken(SECRET, 3600);
    const [prefix, payload] = token.split(".");

    expect(verifyDemoSessionToken(SECRET, `${prefix}.${payload}.AAAA`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const token = signDemoSessionToken(SECRET, 3600);

    expect(verifyDemoSessionToken(OTHER, token)).toBeNull();
  });

  it("rejects expired tokens", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = signDemoSessionToken(SECRET, 60);

    vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));
    expect(verifyDemoSessionToken(SECRET, token)).toBeNull();

    // And still valid just before expiry.
    vi.setSystemTime(new Date("2026-01-01T00:00:30Z"));
    expect(verifyDemoSessionToken(SECRET, token)).not.toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    expect(verifyDemoSessionToken(SECRET, "")).toBeNull();
    expect(verifyDemoSessionToken(SECRET, "pkd1.")).toBeNull();
    expect(verifyDemoSessionToken(SECRET, "pkd1.x")).toBeNull();
    expect(verifyDemoSessionToken(SECRET, "pkd1.!!!.!!!")).toBeNull();
    expect(verifyDemoSessionToken(SECRET, "not-a-demo-token")).toBeNull();
  });

  it("does not mistake ordinary session tokens for demo tokens", () => {
    expect(isStatelessDemoToken("deadbeef".repeat(8))).toBe(false);
  });
});
