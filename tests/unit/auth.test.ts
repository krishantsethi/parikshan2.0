import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblems, verifyPassword } from "@/server/auth/password";
import { hashToken, randomToken } from "@/server/auth/tokens";

describe("password hashing", () => {
  it("produces a scrypt hash with a unique salt", async () => {
    const a = await hashPassword("CorrectHorseBattery1");
    const b = await hashPassword("CorrectHorseBattery1");
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(a).not.toBe(b);
    expect(a.includes("CorrectHorseBattery1")).toBe(false);
  });

  it("verifies the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("s3cret-password");
    await expect(verifyPassword("s3cret-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("s3cret-passwore", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("normalizes unicode so equivalent passwords match", async () => {
    // e.g. composed vs decomposed forms of the same string
    const composed = "pässwörd123";
    const decomposed = composed.normalize("NFD");
    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });

  it("rejects malformed stored hashes without throwing", async () => {
    await expect(verifyPassword("anything", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt$16384$8$1$zzzz$zzzz")).resolves.toBe(false);
    await expect(
      verifyPassword("anything", "scrypt$0$0$0$00$00"),
    ).resolves.toBe(false);
  });

  it("enforces the minimum length policy", () => {
    expect(passwordProblems("short")).toContain("too_short");
    expect(passwordProblems("longenough")).toEqual([]);
  });
});

describe("opaque tokens", () => {
  it("generates 256-bit random tokens", () => {
    const token = randomToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(randomToken()).not.toBe(token);
  });

  it("hashes tokens deterministically for indexed lookup", () => {
    const token = randomToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });
});
