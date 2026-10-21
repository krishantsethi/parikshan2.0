import { describe, expect, it } from "vitest";
import { categorizeDocument } from "@/server/documents/categorize";
import { extractMedications } from "@/server/documents/extract-medication";
import { normalizeText, singleLine } from "@/server/documents/text-normalize";
import { buildDigest, processDocumentBytes } from "@/server/documents/pipeline";
import { extractLabData } from "@/server/documents/extract-lab";
import { makeEmptyPdf, makeTextPdf, TINY_PNG } from "../helpers/pdf";
import type { OcrProvider } from "@/server/documents/ocr";

const LAB_TEXT = `CITY DIAGNOSTIC LAB
Patient: Test Patient   Date: 14/03/2025
LIPID PROFILE
Total Cholesterol 212 mg/dL Desirable: < 200
LDL Cholesterol 138 mg/dL Optimal: < 100`;

const PRESCRIPTION_TEXT = `Dr. R. Mehta  MBBS, MD
Rx
Tab. Metformin 500 mg 1-0-1 for 30 days
Cap. Amoxicillin 250mg TDS x 5 days
Tab Paracetamol 650 mg SOS`;

describe("normalizeText", () => {
  it("normalizes line endings and unicode dashes without altering tokens", () => {
    const result = normalizeText("Haemoglobin 13.0 – 17.0 g/dL\r\n\r\n\r\nnext");
    expect(result).toBe("Haemoglobin 13.0 - 17.0 g/dL\n\nnext");
  });
  it("collapses whitespace for keyword scanning", () => {
    expect(singleLine("a   b\n c")).toBe("a b c");
  });
});

describe("categorizeDocument", () => {
  it("classifies a lab report", () => {
    const result = categorizeDocument(LAB_TEXT);
    expect(result.category).toBe("lab_report");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("classifies a prescription", () => {
    const result = categorizeDocument(PRESCRIPTION_TEXT);
    expect(result.category).toBe("prescription");
  });

  it("classifies discharge summaries, imaging, invoices and insurance", () => {
    expect(
      categorizeDocument(
        "DISCHARGE SUMMARY\nDate of admission: 01/02/2025\nDate of discharge: 04/02/2025\nCourse in hospital: stable",
      ).category,
    ).toBe("discharge_summary");
    expect(
      categorizeDocument("ULTRASOUND ABDOMEN\nFindings: normal\nImpression: no abnormality\nRadiologist: Dr X").category,
    ).toBe("imaging_report");
    expect(
      categorizeDocument("TAX INVOICE\nInvoice No 123\nTotal Amount Payable: INR 2,400\nGST 18%").category,
    ).toBe("invoice");
    expect(
      categorizeDocument("HEALTH INSURANCE\nPolicy No: 555\nSum Insured: 500000\nCashless pre-authorization").category,
    ).toBe("insurance");
  });

  it("falls back to 'other' for unknown content", () => {
    const result = categorizeDocument("hello world this is a note");
    expect(result.category).toBe("other");
    expect(result.confidence).toBeLessThan(0.5);
  });
});

describe("extractMedications", () => {
  it("extracts medication names, strengths and schedules", () => {
    const meds = extractMedications(PRESCRIPTION_TEXT);
    expect(meds.length).toBe(3);
    const metformin = meds.find((m) => m.name.toLowerCase().includes("metformin"));
    expect(metformin).toBeDefined();
    expect(metformin!.dosageText).toContain("500 mg");
    expect(metformin!.scheduleText).toContain("1-0-1");
    expect(metformin!.scheduleText).toContain("30 days");
    const amoxicillin = meds.find((m) => m.name.toLowerCase().includes("amoxicillin"));
    expect(amoxicillin!.scheduleText).toContain("TDS");
  });

  it("does not turn lab rows into medications", () => {
    const meds = extractMedications(LAB_TEXT);
    expect(meds.length).toBe(0);
  });

  it("ignores advice lines without a dose form or schedule", () => {
    const meds = extractMedications("Follow up after 2 weeks\nPlenty of fluids");
    expect(meds.length).toBe(0);
  });
});

describe("buildDigest", () => {
  it("states counts, flags and explicitly disclaims diagnosis", () => {
    const lab = extractLabData(LAB_TEXT);
    const digest = buildDigest({
      category: "lab_report",
      categoryConfidence: 0.9,
      lab,
      medications: [],
    });
    expect(digest).toContain("2 structured value(s)");
    expect(digest).toContain("Total Cholesterol");
    expect(digest).toMatch(/not a diagnosis/i);
    expect(digest).toMatch(/not an AI explanation/i);
  });
});

describe("processDocumentBytes (PDF)", () => {
  it("extracts text and structure from a digital PDF", async () => {
    const pdf = makeTextPdf([
      "SAMPLE LAB",
      "Patient: Test Patient   Date: 14/03/2025",
      "Total Cholesterol 212 mg/dL Desirable: < 200",
      "LDL Cholesterol 138 mg/dL Optimal: < 100",
    ]);
    const result = await processDocumentBytes(pdf, "application/pdf");
    expect(result.engine).toBe("pdf_text");
    expect(result.pages).toBe(1);
    expect(result.category).toBe("lab_report");
    expect(result.lab.results.length).toBe(2);
    expect(result.lab.results[0]!.unit).toBe("mg/dL");
    expect(result.digest.length).toBeGreaterThan(40);
  });

  it("fails clearly for a scanned/empty PDF instead of pretending", async () => {
    await expect(processDocumentBytes(makeEmptyPdf(), "application/pdf")).rejects.toMatchObject({
      code: "pdf_no_text",
    });
  });

  it("rejects unsupported mime types", async () => {
    await expect(processDocumentBytes(TINY_PNG, "text/html")).rejects.toMatchObject({
      code: "unsupported_type",
    });
  });
});

describe("processDocumentBytes (OCR path)", () => {
  const fakeProvider: OcrProvider = {
    id: "fake",
    label: "Fake OCR",
    isAvailable: () => true,
    recognizeImage: async () => ({ text: LAB_TEXT, confidence: 0.88, engine: "ocr_tesseract" }),
  };

  it("runs OCR for images and extracts structure from the recognized text", async () => {
    const result = await processDocumentBytes(TINY_PNG, "image/png", { ocrProvider: fakeProvider });
    expect(result.engine).toBe("ocr_tesseract");
    expect(result.confidence).toBeCloseTo(0.88);
    expect(result.lab.results.length).toBe(2);
  });

  it("warns when OCR confidence is low", async () => {
    const lowConfidence: OcrProvider = {
      ...fakeProvider,
      recognizeImage: async () => ({ text: LAB_TEXT, confidence: 0.4, engine: "ocr_tesseract" }),
    };
    const result = await processDocumentBytes(TINY_PNG, "image/png", { ocrProvider: lowConfidence });
    expect(result.warnings.join(" ")).toMatch(/confidence/i);
  });

  it("reports an unavailable OCR provider instead of faking success", async () => {
    const disabled: OcrProvider = {
      id: "none",
      label: "disabled",
      isAvailable: () => false,
      recognizeImage: async () => {
        throw new Error("should not be called");
      },
    };
    await expect(
      processDocumentBytes(TINY_PNG, "image/png", { ocrProvider: disabled }),
    ).rejects.toMatchObject({ code: "ocr_unavailable" });
  });

  it("fails when OCR returns too little text", async () => {
    const empty: OcrProvider = {
      ...fakeProvider,
      recognizeImage: async () => ({ text: "   ", confidence: 0.2, engine: "ocr_tesseract" }),
    };
    await expect(
      processDocumentBytes(TINY_PNG, "image/png", { ocrProvider: empty }),
    ).rejects.toMatchObject({ code: "ocr_empty" });
  });
});
