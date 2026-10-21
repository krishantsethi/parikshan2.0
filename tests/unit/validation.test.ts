import { describe, expect, it } from "vitest";
import {
  feedbackSchema,
  loginSchema,
  medicationCreateSchema,
  observationCreateSchema,
  profileCreateSchema,
  signupSchema,
} from "@/server/validation/schemas";

describe("signupSchema", () => {
  const base = {
    name: "Asha Verma",
    email: "Asha@Example.COM ",
    password: "longenough1",
    acknowledgeDisclaimer: true,
  };

  it("normalizes email casing and whitespace", () => {
    const parsed = signupSchema.parse(base);
    expect(parsed.email).toBe("asha@example.com");
  });

  it("requires the disclaimer acknowledgement", () => {
    expect(signupSchema.safeParse({ ...base, acknowledgeDisclaimer: false }).success).toBe(false);
  });

  it("rejects short passwords and invalid emails", () => {
    expect(signupSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials shape", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("profileCreateSchema", () => {
  it("allows a self profile without separate authorization", () => {
    const result = profileCreateSchema.safeParse({ name: "Self", relation: "self" });
    expect(result.success).toBe(true);
  });

  it("requires authorization for any other person", () => {
    const missing = profileCreateSchema.safeParse({ name: "Mother", relation: "parent" });
    expect(missing.success).toBe(false);
    const affirmed = profileCreateSchema.safeParse({
      name: "Mother",
      relation: "parent",
      authorizationAffirmed: true,
    });
    expect(affirmed.success).toBe(true);
  });

  it("validates ISO dates and blood groups", () => {
    expect(profileCreateSchema.safeParse({ name: "X", relation: "self", dob: "31/02/2020" }).success).toBe(false);
    expect(profileCreateSchema.safeParse({ name: "X", relation: "self", dob: "2020-02-29" }).success).toBe(true);
    expect(profileCreateSchema.safeParse({ name: "X", relation: "self", bloodGroup: "C+" }).success).toBe(false);
  });
});

describe("observationCreateSchema", () => {
  it("requires a profile UUID and a value", () => {
    const base = {
      profileId: "6f0e2e5a-6c39-4a3b-9c4d-0e5b1b9d1a11",
      testName: "Haemoglobin",
      valueText: "13.1",
    };
    expect(observationCreateSchema.safeParse(base).success).toBe(true);
    expect(observationCreateSchema.safeParse({ ...base, profileId: "abc" }).success).toBe(false);
    expect(observationCreateSchema.safeParse({ ...base, valueText: "" }).success).toBe(false);
  });
});

describe("medicationCreateSchema", () => {
  it("rejects missing names and overly long notes", () => {
    const profileId = "6f0e2e5a-6c39-4a3b-9c4d-0e5b1b9d1a11";
    expect(medicationCreateSchema.safeParse({ profileId, name: "" }).success).toBe(false);
    expect(
      medicationCreateSchema.safeParse({ profileId, name: "Metformin", notes: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("feedbackSchema", () => {
  it("enforces 10..5000 characters and rating bounds", () => {
    expect(feedbackSchema.safeParse({ category: "bug", message: "too short" }).success).toBe(false);
    expect(
      feedbackSchema.safeParse({ category: "bug", message: "A sufficiently long message." }).success,
    ).toBe(true);
    expect(feedbackSchema.safeParse({ category: "bug", message: "A long enough message", rating: 6 }).success).toBe(
      false,
    );
    expect(feedbackSchema.safeParse({ category: "unknown", message: "A long enough message" }).success).toBe(
      false,
    );
  });
});
