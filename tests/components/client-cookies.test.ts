import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Preference cookies (theme, locale, active profile) are written from the
 * browser. They must carry the same SameSite posture as the server session
 * cookie, and `SameSite=None` must always be paired with `Secure` — browsers
 * reject the pair otherwise and the preference silently fails to save.
 *
 * `document.cookie` does not expose attributes on read, so these tests capture
 * the exact string handed to the setter.
 */
const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

function spyOnCookieWrite(): () => string {
  let written = "";
  Object.defineProperty(Document.prototype, "cookie", {
    configurable: true,
    get: () => "",
    set: (value: string) => {
      written = value;
    },
  });
  return () => written;
}

async function writeWithEnv(envValue: string): Promise<string> {
  vi.stubEnv("NEXT_PUBLIC_COOKIE_SAME_SITE", envValue);
  vi.resetModules();
  const { PREFERENCE_MAX_AGE_SECONDS, writeClientCookie } = await import("@/lib/cookies");
  const read = spyOnCookieWrite();
  writeClientCookie("pk_theme", "light", PREFERENCE_MAX_AGE_SECONDS);
  return read();
}

afterEach(() => {
  if (cookieDescriptor) {
    Object.defineProperty(Document.prototype, "cookie", cookieDescriptor);
  }
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("writeClientCookie", () => {
  it("defaults to SameSite=Lax without forcing Secure", async () => {
    const written = await writeWithEnv("");

    expect(written).toContain("pk_theme=light");
    expect(written).toContain("path=/");
    expect(written).toContain("max-age=31536000");
    expect(written).toContain("samesite=lax");
    expect(written).not.toContain("secure");
  });

  it("pairs SameSite=None with the mandatory Secure flag", async () => {
    const written = await writeWithEnv("none");

    expect(written).toContain("samesite=none");
    expect(written).toContain("secure");
  });

  it("honours strict", async () => {
    const written = await writeWithEnv("strict");

    expect(written).toContain("samesite=strict");
    expect(written).not.toContain("secure");
  });

  it("falls back to lax on an unrecognised value", async () => {
    const written = await writeWithEnv("nonsense");

    expect(written).toContain("samesite=lax");
  });

  it("percent-encodes the value so a profile UUID or odd string cannot break the header", async () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_SAME_SITE", "lax");
    vi.resetModules();
    const { writeClientCookie } = await import("@/lib/cookies");
    const read = spyOnCookieWrite();

    writeClientCookie("pk_profile", "a b;c/d", 60);

    expect(read()).toContain("pk_profile=a%20b%3Bc%2Fd");
    expect(read()).not.toContain("a b;c/d");
  });

  it("clears a cookie when given a zero max-age", async () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_SAME_SITE", "none");
    vi.resetModules();
    const { writeClientCookie } = await import("@/lib/cookies");
    const read = spyOnCookieWrite();

    writeClientCookie("pk_profile", "", 0);

    expect(read()).toContain("pk_profile=");
    expect(read()).toContain("max-age=0");
    expect(read()).toContain("secure");
  });
});
