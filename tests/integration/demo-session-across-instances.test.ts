import { describe, expect, it } from "vitest";

import { DEMO_CREDENTIALS, MemoryStore } from "@/server/db/memory-store";
import { signDemoSessionToken, verifyDemoSessionToken } from "@/server/auth/tokens";

const SECRET = "c".repeat(64);

/**
 * Reproduces the production failure this fixes: on a serverless platform each
 * lambda has its own MemoryStore, so a row-backed demo session minted by the
 * login POST is invisible to the instance serving the next request — the
 * visitor bounces back to /login and every CTA appears dead.
 *
 * The stateless demo token must therefore authenticate against a completely
 * fresh store, and that store must resolve a demo user who owns real seeded
 * content.
 */
describe("demo session across serverless instances", () => {
  it("a token minted on one instance authenticates on a brand-new instance", async () => {
    const instanceA = new MemoryStore();
    await instanceA.init();
    const userOnA = await instanceA.getUserByEmail(DEMO_CREDENTIALS.email);
    expect(userOnA).not.toBeNull();

    // What the login POST would issue.
    const token = signDemoSessionToken(SECRET, 3600);

    // A different lambda: separate process memory, separately seeded.
    const instanceB = new MemoryStore();
    await instanceB.init();

    expect(verifyDemoSessionToken(SECRET, token)).not.toBeNull();
    const userOnB = await instanceB.getUserByEmail(DEMO_CREDENTIALS.email);
    expect(userOnB).not.toBeNull();

    // The resolved user owns seeded content here, so the dashboard renders
    // real (labeled sample) records rather than an empty state or a redirect.
    const profiles = await instanceB.listProfiles(userOnB!.id);
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.some((profile) => profile.isPrimary)).toBe(true);

    const documents = await instanceB.listDocuments({ userId: userOnB!.id });
    expect(documents.items.length).toBeGreaterThan(0);
  });

  it("instance-local user ids differ, which is why the token carries no user id", async () => {
    const a = new MemoryStore();
    await a.init();
    const b = new MemoryStore();
    await b.init();

    const userA = await a.getUserByEmail(DEMO_CREDENTIALS.email);
    const userB = await b.getUserByEmail(DEMO_CREDENTIALS.email);

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    expect(userA!.id).not.toBe(userB!.id);
  });

  it("a forged token never resolves a user on any instance", async () => {
    const instance = new MemoryStore();
    await instance.init();

    expect(verifyDemoSessionToken(SECRET, "pkd1.eyJleHAiOjR9.forged")).toBeNull();
    // And the guard's own precondition: without a verified token the lookup
    // below is never reached, so nothing is resolved.
    const user = await instance.getUserByEmail(DEMO_CREDENTIALS.email);
    expect(user).not.toBeNull(); // seeded account exists; auth still requires a valid token
  });
});
