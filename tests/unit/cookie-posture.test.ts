import { describe, expect, it } from "vitest";

import { capabilityReport, loadConfig } from "@/lib/env";

/** Build a minimal valid ProcessEnv for loadConfig. */
function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...extra };
}

/**
 * The session cookie's SameSite posture decides whether authentication
 * survives at all when PARIKSHAN is framed cross-origin. A Lax cookie is not
 * sent on a third-party iframe request, so login succeeds and then immediately
 * bounces back to /login. These tests pin the default to the hardened value
 * and the opt-in to the value that actually works in a frame.
 */
describe("cookie SameSite configuration", () => {
  it("defaults to lax — the hardened posture for normal serving", () => {
    expect(loadConfig(env()).cookieSameSite).toBe("lax");
    expect(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "" })).cookieSameSite).toBe("lax");
  });

  it("opts into none for cross-origin frame embedding", () => {
    expect(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "none" })).cookieSameSite).toBe("none");
  });

  it("supports strict", () => {
    expect(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "strict" })).cookieSameSite).toBe(
      "strict",
    );
  });

  it("is case and whitespace insensitive", () => {
    expect(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "  NONE " })).cookieSameSite).toBe("none");
    expect(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "Lax" })).cookieSameSite).toBe("lax");
  });

  it("falls back to lax rather than an unsafe value on bad input", () => {
    expect(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "banana" })).cookieSameSite).toBe("lax");
    expect(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "__Host-evil" })).cookieSameSite).toBe(
      "lax",
    );
  });

  it("does not throw when none is requested without an https app URL", () => {
    // Warns, but must stay bootable: a dead app helps nobody.
    expect(() =>
      loadConfig(
        env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "none", NEXT_PUBLIC_APP_URL: "http://x.test" }),
      ),
    ).not.toThrow();
  });

  it("reports the cookie posture in the capability report", () => {
    const laxReport = capabilityReport(loadConfig(env()));
    expect(laxReport.cookies.label).toContain("SameSite=lax");

    const noneReport = capabilityReport(loadConfig(env({ NEXT_PUBLIC_COOKIE_SAME_SITE: "none" })));
    expect(noneReport.cookies.label).toContain("SameSite=None");
    expect(noneReport.cookies.label).toContain("HTTPS");
  });
});
