import { describe, expect, it } from "vitest";
import {
  computeFlag,
  extractLabData,
  findReportDate,
  normalizeTestName,
  parseLabLine,
  parseReferenceRange,
} from "@/server/documents/extract-lab";

describe("parseLabLine", () => {
  it("extracts value, unit and two-sided range in mg/dL (not g/dL)", () => {
    const result = parseLabLine("Total Cholesterol 198 mg/dL Desirable: < 200", 5);
    expect(result).not.toBeNull();
    expect(result!.testName).toBe("Total Cholesterol");
    expect(result!.valueNumeric).toBe(198);
    expect(result!.unit).toBe("mg/dL");
    // Upper-bound only range
    expect(result!.refHigh).toBe(200);
    expect(result!.refLow).toBeNull();
    expect(result!.flag).toBe("normal");
  });

  it("does not mistake a comma-formatted count for a date or ID", () => {
    const result = parseLabLine("Total Leukocyte Count 7,200 /cumm 4000 - 11000", 3);
    expect(result).not.toBeNull();
    expect(result!.valueNumeric).toBe(7200);
    expect(result!.unit).toBe("/cumm");
    expect(result!.refLow).toBe(4000);
    expect(result!.refHigh).toBe(11000);
    expect(result!.flag).toBe("normal");
  });

  it("flags values below the stated range", () => {
    const result = parseLabLine("Haemoglobin 12.8 g/dL 13.0 - 17.0 LOW", 2);
    expect(result!.flag).toBe("low");
    expect(result!.normalizedName).toBe("Hemoglobin");
  });

  it("keeps the printed name in rawLine and preserves the unit exactly", () => {
    const result = parseLabLine("HbA1c 6.1 % < 5.7", 1);
    expect(result).not.toBeNull();
    expect(result!.unit).toBe("%");
    expect(result!.refHigh).toBe(5.7);
    expect(result!.flag).toBe("high");
    expect(result!.rawLine).toContain("HbA1c");
  });

  it("assigns unknown flag when no reference range is printed", () => {
    const result = parseLabLine("Vitamin D 22 ng/mL", 4);
    expect(result).not.toBeNull();
    expect(result!.refLow).toBeNull();
    expect(result!.refHigh).toBeNull();
    expect(result!.flag).toBe("unknown");
  });

  it("rejects header and patient-identification lines", () => {
    expect(parseLabLine("Patient Name 12 Rao", 1)).toBeNull();
    expect(parseLabLine("Date 14/03/2025", 2)).toBeNull();
    expect(parseLabLine("Barcode 88219931", 3)).toBeNull();
  });

  it("rejects lines with no numeric value", () => {
    expect(parseLabLine("Specimen: serum, fasting", 1)).toBeNull();
  });

  it("handles unicode dashes in ranges", () => {
    const result = parseLabLine("Creatinine 0.9 mg/dL 0.6 – 1.3", 1);
    expect(result!.refLow).toBe(0.6);
    expect(result!.refHigh).toBe(1.3);
    expect(result!.flag).toBe("normal");
  });
});

describe("parseReferenceRange", () => {
  it("parses two-sided ranges", () => {
    expect(parseReferenceRange("13.0 - 17.0 g/dL")).toMatchObject({ low: 13, high: 17 });
  });
  it("parses upper bounds", () => {
    expect(parseReferenceRange("Desirable: < 200")).toMatchObject({ low: null, high: 200 });
  });
  it("parses lower bounds", () => {
    expect(parseReferenceRange("Desirable: > 40")).toMatchObject({ low: 40, high: null });
  });
  it("parses 'up to' phrasing", () => {
    expect(parseReferenceRange("up to 150")).toMatchObject({ high: 150 });
  });
  it("returns null without a range", () => {
    expect(parseReferenceRange("no reference")).toBeNull();
  });
});

describe("computeFlag", () => {
  it("only flags when a range exists", () => {
    expect(computeFlag(100, null, null)).toBe("unknown");
    expect(computeFlag(5, 10, 20)).toBe("low");
    expect(computeFlag(15, 10, 20)).toBe("normal");
    expect(computeFlag(25, 10, 20)).toBe("high");
    expect(computeFlag(25, null, 20)).toBe("high");
    expect(computeFlag(5, 10, null)).toBe("low");
    expect(computeFlag(null, 10, 20)).toBe("unknown");
  });
});

describe("normalizeTestName", () => {
  it("maps exact clinical synonyms", () => {
    expect(normalizeTestName("Hb")).toBe("Hemoglobin");
    expect(normalizeTestName("HAEMOGLOBIN")).toBe("Hemoglobin");
    expect(normalizeTestName("TLC")).toBe("Total Leukocyte Count");
    expect(normalizeTestName("FBS")).toBe("Fasting Glucose");
  });
  it("does not merge ambiguous abbreviations", () => {
    expect(normalizeTestName("TC")).not.toBe("Total Cholesterol");
  });
  it("title-cases all-caps unknown names without changing meaning", () => {
    expect(normalizeTestName("SERUM SODIUM")).toBe("Serum Sodium");
  });
});

describe("findReportDate", () => {
  it("parses ISO dates", () => {
    const result = findReportDate("Date: 2025-03-14");
    expect(result.iso).toBe("2025-03-14");
  });
  it("assumes day-first for ambiguous slash dates and flags it", () => {
    const result = findReportDate("Date: 05/03/2025");
    expect(result.iso).toBe("2025-03-05");
    expect(result.ambiguous).toBe(true);
    expect(result.note).toMatch(/day\/month/);
  });
  it("parses unambiguous day-first dates with higher confidence", () => {
    const result = findReportDate("Collected on 21/03/2025");
    expect(result.iso).toBe("2025-03-21");
    expect(result.confidence).toBeGreaterThan(0.8);
  });
  it("rejects impossible dates", () => {
    const result = findReportDate("Date: 31/02/2025");
    expect(result.iso).toBeNull();
  });
  it("returns no date when absent", () => {
    const result = findReportDate("No date here at all");
    expect(result.iso).toBeNull();
    expect(result.confidence).toBe(0);
  });
});

describe("extractLabData", () => {
  const sample = `SAMPLE LABORATORY
Patient: Test Patient   Date: 14/03/2025
COMPLETE BLOOD COUNT
Haemoglobin          12.8   g/dL        13.0 - 17.0    LOW
Total Leukocyte Count 7200  /cumm       4000 - 11000
Platelet Count       240000 /uL         150000 - 400000
LIPID PROFILE
Total Cholesterol    212    mg/dL       Desirable: < 200
LDL Cholesterol      138    mg/dL       Optimal: < 100
HDL Cholesterol       44    mg/dL       Desirable: > 40`;

  it("extracts every value with consistent units", () => {
    const extraction = extractLabData(sample);
    expect(extraction.results.length).toBe(6);
    const units = Object.fromEntries(extraction.results.map((r) => [r.normalizedName, r.unit]));
    expect(units["Total Cholesterol"]).toBe("mg/dL");
    expect(units["LDL Cholesterol"]).toBe("mg/dL");
    expect(units["Hemoglobin"]).toBe("g/dL");
    expect(units["Platelet Count"]).toBe("/uL");
  });

  it("computes flags from the printed ranges", () => {
    const extraction = extractLabData(sample);
    const byName = Object.fromEntries(extraction.results.map((r) => [r.normalizedName, r.flag]));
    expect(byName["Hemoglobin"]).toBe("low");
    expect(byName["Total Cholesterol"]).toBe("high");
    expect(byName["LDL Cholesterol"]).toBe("high");
    expect(byName["HDL Cholesterol"]).toBe("normal");
  });

  it("reports the patient name, lab and detected date", () => {
    const extraction = extractLabData(sample);
    expect(extraction.patientName).toBe("Test Patient");
    expect(extraction.labName).toContain("SAMPLE LABORATORY");
    expect(extraction.reportDate.iso).toBe("2025-03-14");
  });

  it("does not duplicate identical rows", () => {
    const duplicated = `${sample}\nTotal Cholesterol 212 mg/dL Desirable: < 200`;
    const extraction = extractLabData(duplicated);
    const cholesterolRows = extraction.results.filter((r) => r.normalizedName === "Total Cholesterol");
    expect(cholesterolRows.length).toBe(1);
  });
});
