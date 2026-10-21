import { describe, expect, it } from "vitest";
import { nameMatches, normalizeMedicationName } from "@/lib/medications/normalize";
import { reviewMedicationList } from "@/server/medications/review";
import type { Medication } from "@/types/domain";

function med(name: string, id = name): Medication {
  return {
    id,
    userId: "u1",
    profileId: "p1",
    name,
    dosageText: null,
    scheduleText: null,
    startDate: null,
    endDate: null,
    active: true,
    prescriber: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("normalizeMedicationName", () => {
  it("strips dose forms, strengths, schedules and salt suffixes", () => {
    expect(normalizeMedicationName("Tab. Metformin 500 mg 1-0-1").normalized).toBe("metformin");
    expect(normalizeMedicationName("Cap Amoxicillin 250mg TDS").normalized).toBe("amoxicillin");
    expect(normalizeMedicationName("Metoprolol Succinate ER 50 mg").normalized).toBe("metoprolol");
    expect(normalizeMedicationName("Paracetamol (Acetaminophen) 650 mg").normalized).toBe("paracetamol");
    expect(normalizeMedicationName("ASA 75 mg").normalized).toBe("aspirin");
  });

  it("flags common brand names as uncertain generic matches", () => {
    const result = normalizeMedicationName("Ecosprin 75 mg");
    expect(result.normalized).toBe("aspirin");
    expect(result.brandMatchedAs).toBe("aspirin");
  });

  it("marks unidentifiable names as uncertain", () => {
    expect(normalizeMedicationName("white tablet").uncertain).toBe(true);
    expect(normalizeMedicationName("X").uncertain).toBe(true);
  });

  it("matches aliases on word boundaries only", () => {
    expect(nameMatches("metformin", "metformin")).toBe(true);
    expect(nameMatches("metformin sr", "metformin")).toBe(true);
    expect(nameMatches("metformine", "metformin")).toBe(false);
  });
});

describe("reviewMedicationList (curated source)", () => {
  const options = { openfda: { enabled: false, apiKey: null } };

  it("finds a major curated interaction between warfarin and aspirin", async () => {
    const review = await reviewMedicationList([med("Warfarin 5 mg"), med("Aspirin 75 mg")], options);
    expect(review.findings.length).toBeGreaterThan(0);
    expect(review.findings[0]!.severity).toBe("major");
    expect(review.findings[0]!.source).toBe("curated");
    expect(review.sourcesUsed).toEqual(["curated"]);
    expect(review.status).toBe("complete");
  });

  it("finds an SSRI + tramadol interaction", async () => {
    const review = await reviewMedicationList([med("Sertraline 50 mg"), med("Tramadol 50 mg")], options);
    expect(review.findings.some((f) => f.severity === "major")).toBe(true);
  });

  it("returns no findings for unrelated medicines but keeps the disclaimer path", async () => {
    const review = await reviewMedicationList([med("Metformin"), med("Atorvastatin")], options);
    expect(review.findings).toHaveLength(0);
    expect(review.sourcesUsed).toContain("curated");
  });

  it("does not flag a single medication with itself", async () => {
    const review = await reviewMedicationList([med("Warfarin")], options);
    expect(review.findings).toHaveLength(0);
  });

  it("labels drug names from the user's list in findings", async () => {
    const review = await reviewMedicationList([med("Warfarin 5mg", "a"), med("Ecosprin 75", "b")], options);
    const finding = review.findings[0]!;
    expect([finding.drugA, finding.drugB]).toEqual(expect.arrayContaining(["Warfarin 5mg", "Ecosprin 75"]));
    // Brand hint surfaced as a review warning
    expect(review.warnings.join(" ")).toMatch(/brand hint/i);
  });

  it("flags uncertain names so the UI can warn", async () => {
    const review = await reviewMedicationList([med("Metformin"), med("white tablet")], options);
    expect(review.uncertainNames).toContain("white tablet");
  });
});
