import { describe, expect, it } from "vitest";

import { loadConfig, type AppConfig } from "@/lib/env";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";

function cfg(extra: Record<string, string> = {}): AppConfig {
  return loadConfig({ NODE_ENV: "test", ...extra });
}

/**
 * The session cookie must carry exactly the attributes that let a cross-origin
 * preview frame keep a session, and none that would weaken normal serving:
 *
 * - SameSite=None requires Secure or browsers drop the cookie outright.
 * - Partitioned (CHIPS) is what survives browsers that block third-party
 *   cookies by default, and must NOT be applied in first-party mode where it
 *   would needlessly scope the cookie to a partition.
 */
describe("sessionCookieOptions", () => {
  it("names the documented session cookie", () => {
    expect(SESSION_COOKIE).toBe("pk_session");
  });

  it("stays unpartitioned and lax in the hardened default", () => {
    const options = sessionCookieOptions(cfg(), 3600);

    expect(options.sameSite).toBe("lax");
    expect(options.partitioned).toBe(false);
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(3600);
  });

  it("forces Secure and Partitioned together in embedded mode", () => {
    const options = sessionCookieOptions(cfg({ NEXT_PUBLIC_COOKIE_SAME_SITE: "none" }), 3600);

    expect(options.sameSite).toBe("none");
    // Mandatory pairing: SameSite=None without Secure is rejected by browsers.
    expect(options.secure).toBe(true);
    // CHIPS: keeps the session usable inside a third-party frame.
    expect(options.partitioned).toBe(true);
    expect(options.httpOnly).toBe(true);
  });

  it("forces Secure in embedded mode even when not production", () => {
    const options = sessionCookieOptions(
      cfg({ NEXT_PUBLIC_COOKIE_SAME_SITE: "none", NODE_ENV: "development" }),
      60,
    );

    expect(options.secure).toBe(true);
    expect(options.partitioned).toBe(true);
  });

  it("does not partition strict mode", () => {
    const options = sessionCookieOptions(cfg({ NEXT_PUBLIC_COOKIE_SAME_SITE: "strict" }), 60);

    expect(options.sameSite).toBe("strict");
    expect(options.partitioned).toBe(false);
  });

  it("clears with a zero max-age while keeping the attribute set", () => {
    const options = sessionCookieOptions(cfg({ NEXT_PUBLIC_COOKIE_SAME_SITE: "none" }), 0);

    expect(options.maxAge).toBe(0);
    expect(options.partitioned).toBe(true);
    expect(options.secure).toBe(true);
  });
});
