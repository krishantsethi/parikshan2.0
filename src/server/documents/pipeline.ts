import type { DocumentCategory } from "@/types/domain";
import { categorizeDocument } from "@/server/documents/categorize";
import { extractLabData, type LabExtraction } from "@/server/documents/extract-lab";
import { extractMedications, type ExtractedMedication } from "@/server/documents/extract-medication";
import { normalizeText } from "@/server/documents/text-normalize";
import { extractPdfText, PdfExtractionError } from "@/server/documents/pdf-text";
import {
  getOcrProvider,
  OcrUnavailableError,
  type OcrProvider,
} from "@/server/documents/ocr";

/**
 * End-to-end processing pipeline for one uploaded document:
 *
 *   bytes -> text (PDF layer | OCR) -> normalize -> classify -> extract
 *         -> deterministic digest + warnings
 *
 * The pipeline is pure-ish (no DB access) so it is fully unit-testable and
 * reusable from a background worker. AI summarization happens separately,
 * after the deterministic facts exist.
 */

export type ProcessingErrorCode =
  | "unsupported_type"
  | "pdf_no_text"
  | "pdf_corrupt"
  | "ocr_unavailable"
  | "ocr_failed"
  | "ocr_empty"
  | "internal";

export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: ProcessingErrorCode,
  ) {
    super(message);
  }
}

export type TextEngine = "pdf_text" | "ocr_tesseract";

export interface ProcessedDocument {
  text: string;
  engine: TextEngine;
  confidence: number | null;
  pages: number | null;
  category: DocumentCategory;
  categoryConfidence: number;
  lab: LabExtraction;
  medications: ExtractedMedication[];
  digest: string;
  warnings: string[];
}

const MIN_USEFUL_TEXT = 40;
const OCR_LOW_CONFIDENCE = 0.7;

export function looksLikePrescription(text: string): boolean {
  return /(?:^|\n)\s*(?:rx|℞)\b|(?:^|\n)\s*(?:tab(?:let)?|cap(?:sule)?|syp|syrup|inj(?:ection)?)\.?\s+[a-z]/im.test(
    text,
  );
}

/** Deterministic, factual digest. Never diagnoses; never adds facts. */
export function buildDigest(input: {
  category: DocumentCategory;
  categoryConfidence: number;
  lab: LabExtraction;
  medications: ExtractedMedication[];
}): string {
  const parts: string[] = [];
  const { lab } = input;

  if (lab.labName) parts.push(`Source: ${lab.labName}.`);
  if (lab.reportDate.iso) {
    parts.push(
      `Report date read as ${lab.reportDate.iso}${lab.reportDate.raw ? ` (printed: "${lab.reportDate.raw}")` : ""}.`,
    );
  }
  parts.push(
    `Detected document type: ${input.category.replace(/_/g, " ")} (classifier confidence ${Math.round(input.categoryConfidence * 100)}%).`,
  );

  if (lab.results.length > 0) {
    const outside = lab.results.filter((r) => r.flag === "high" || r.flag === "low");
    parts.push(
      `${lab.results.length} structured value(s) extracted; ${outside.length} outside the range stated on the document.`,
    );
    const notable = (outside.length > 0 ? outside : lab.results).slice(0, 6).map((r) => {
      const range = r.refText ? `, stated ${r.refText}` : ", no range stated";
      const flag = r.flag === "unknown" ? "" : ` (${r.flag} per stated range)`;
      return `${r.testName} ${r.valueText}${r.unit ? ` ${r.unit}` : ""}${range}${flag}`;
    });
    if (notable.length > 0) parts.push(`Key values: ${notable.join("; ")}.`);
  } else {
    parts.push("No structured laboratory values were detected in this document.");
  }

  if (input.medications.length > 0) {
    const meds = input.medications
      .slice(0, 8)
      .map((m) => `${m.name}${m.dosageText ? ` ${m.dosageText}` : ""}${m.scheduleText ? ` — ${m.scheduleText}` : ""}`);
    parts.push(`Medications mentioned: ${meds.join("; ")}.`);
  }

  parts.push(
    "This is a structured digest generated from the document text — not an AI explanation and not a diagnosis. Confirm values against the original report before relying on them.",
  );

  return parts.join(" ");
}

export async function processDocumentBytes(
  bytes: Uint8Array,
  mime: string,
  options: { ocrProvider?: OcrProvider } = {},
): Promise<ProcessedDocument> {
  const warnings: string[] = [];
  let text = "";
  let engine: TextEngine;
  let confidence: number | null = null;
  let pages: number | null = null;

  if (mime === "application/pdf") {
    try {
      const pdf = await extractPdfText(bytes);
      pages = pdf.pages;
      text = pdf.text;
      engine = "pdf_text";
      confidence = 0.99; // text layer is exact
      if (text.length < MIN_USEFUL_TEXT) {
        throw new DocumentProcessingError(
          "This PDF has little or no selectable text — it is probably a scanned document. " +
            "Upload photos/images of the pages so OCR can read them, or export a text-based PDF from your lab portal.",
          "pdf_no_text",
        );
      }
    } catch (error) {
      if (error instanceof DocumentProcessingError) throw error;
      if (error instanceof PdfExtractionError) {
        throw new DocumentProcessingError(
          error.reason === "encrypted"
            ? "This PDF is password-protected. Remove the password (with your lab's help if needed) and upload it again."
            : "This PDF could not be read. It may be corrupted or use an unsupported format.",
          error.reason === "encrypted" ? "pdf_corrupt" : "pdf_corrupt",
        );
      }
      throw new DocumentProcessingError(
        `Document processing failed: ${error instanceof Error ? error.message : String(error)}`,
        "internal",
      );
    }
  } else if (mime.startsWith("image/")) {
    const provider = options.ocrProvider ?? getOcrProvider();
    if (!provider.isAvailable()) {
      throw new DocumentProcessingError(
        "OCR is disabled on this deployment. Digital PDFs with a text layer still work; enable OCR (OCR_PROVIDER=tesseract) for images.",
        "ocr_unavailable",
      );
    }
    try {
      const result = await provider.recognizeImage(bytes, mime);
      text = normalizeText(result.text);
      engine = result.engine === "ocr_tesseract" ? "ocr_tesseract" : "pdf_text";
      confidence = result.confidence;
      pages = 1;
      if (text.length < MIN_USEFUL_TEXT) {
        throw new DocumentProcessingError(
          "OCR could not read enough text from this image. Try a clearer, well-lit, straight-on photo at higher resolution.",
          "ocr_empty",
        );
      }
      if (result.confidence !== null && result.confidence < OCR_LOW_CONFIDENCE) {
        warnings.push(
          `OCR confidence is ${Math.round(result.confidence * 100)}% — the extracted text may contain errors. Review every value carefully.`,
        );
      }
    } catch (error) {
      if (error instanceof DocumentProcessingError) throw error;
      if (error instanceof OcrUnavailableError) {
        throw new DocumentProcessingError(error.message, "ocr_unavailable");
      }
      throw new DocumentProcessingError(
        `OCR failed: ${error instanceof Error ? error.message : String(error)}. You can retry or upload a digital PDF instead.`,
        "ocr_failed",
      );
    }
  } else {
    throw new DocumentProcessingError("Unsupported file type.", "unsupported_type");
  }

  const categorization = categorizeDocument(text);
  if (categorization.confidence < 0.5) {
    warnings.push(
      "The document type is uncertain — please check the category and correct it if needed.",
    );
  }

  const lab = extractLabData(text);
  warnings.push(...lab.warnings);

  let medications: ExtractedMedication[] = [];
  if (categorization.category === "prescription" || looksLikePrescription(text)) {
    medications = extractMedications(text);
    if (medications.length === 0 && categorization.category === "prescription") {
      warnings.push(
        "No medication lines could be parsed from this prescription. Add medications manually from the Medications page if needed.",
      );
    }
  }

  const digest = buildDigest({
    category: categorization.category,
    categoryConfidence: categorization.confidence,
    lab,
    medications,
  });

  return {
    text,
    engine,
    confidence,
    pages,
    category: categorization.category,
    categoryConfidence: categorization.confidence,
    lab,
    medications,
    digest,
    warnings,
  };
}
