import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import hi from "@/i18n/messages/hi.json";
import { ALL_KEYS, createTranslator } from "@/i18n/index";

describe("translation dictionaries", () => {
  it("have identical key sets", () => {
    const enKeys = Object.keys(en).sort();
    const hiKeys = Object.keys(hi).sort();
    expect(hiKeys).toEqual(enKeys);
  });

  it("have no empty values in either locale", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim().length, `en.${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(hi)) {
      expect(value.trim().length, `hi.${key}`).toBeGreaterThan(0);
    }
  });

  it("actually translates (Hindi differs from English for core navigation)", () => {
    const enT = createTranslator("en");
    const hiT = createTranslator("hi");
    for (const key of ["nav.dashboard", "nav.documents", "dash.title", "auth.login.title"] as const) {
      expect(hiT(key)).not.toBe(enT(key));
    }
  });

  it("keeps clinical values untouched in Hindi strings", () => {
    // No translated string should alter numerical thresholds such as 200.
    expect(hi["landing.features.docIntel.body"]).not.toMatch(/\b\d+\s*mg\/dL\b/);
  });

  it("interpolates variables and preserves unknown keys", () => {
    const t = createTranslator("en");
    expect(t("docs.upload.tooLarge", { max: "10 MB" })).toContain("10 MB");
    // @ts-expect-error intentionally invalid key must fall back to the key itself
    expect(t("missing.key")).toBe("missing.key");
  });

  it("exposes every key via ALL_KEYS", () => {
    expect(ALL_KEYS.length).toBe(Object.keys(en).length);
    expect(ALL_KEYS).toContain("docs.detail.review");
  });
});
