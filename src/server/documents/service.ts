import type { HealthProfile, MedicalDocument, User } from "@/types/domain";
import type { NewObservation } from "@/server/db/types";
import { getStore } from "@/server/db";
import type { DataStore } from "@/server/db/types";
import { ApiError } from "@/server/auth/guard";
import { validateUpload } from "@/server/security/files";
import { DocumentProcessingError, processDocumentBytes, type ProcessedDocument } from "@/server/documents/pipeline";
import { extractLabData } from "@/server/documents/extract-lab";
import { generateDocumentExplanation } from "@/server/ai/summary";
import type { Locale } from "@/types/domain";

const MAX_STORED_TEXT = 400_000;

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[a-z0-9]{1,6}$/i, "");
  const pretty = base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!pretty) return "Untitled document";
  return pretty
    .split(" ")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ")
    .slice(0, 140);
}

/** Map extracted lab results to unverified observations awaiting review. */
export function toNewObservations(args: {
  userId: string;
  profileId: string;
  documentId: string;
  processed: ProcessedDocument;
}): NewObservation[] {
  const reportDate = args.processed.lab.reportDate.iso;
  const textConfidence = args.processed.confidence ?? 1;
  return args.processed.lab.results.map((result) => ({
    userId: args.userId,
    profileId: args.profileId,
    documentId: args.documentId,
    testName: result.normalizedName,
    valueText: result.valueText,
    valueNumeric: result.valueNumeric,
    unit: result.unit,
    refLow: result.refLow,
    refHigh: result.refHigh,
    refText: result.refText,
    flag: result.flag,
    collectedAt: reportDate,
    source: "document_extraction" as const,
    confidence: Number(Math.min(0.99, result.confidence * textConfidence).toFixed(2)),
    verified: false,
    notes: `As printed: “${result.testName}” (source line ${result.lineNumber}). Review and confirm before relying on it.`,
  }));
}

async function persistProcessingResult(
  store: DataStore,
  document: MedicalDocument,
  processed: ProcessedDocument,
): Promise<MedicalDocument> {
  const text = processed.text.slice(0, MAX_STORED_TEXT);

  await store.saveDocumentText({
    documentId: document.id,
    text,
    engine: processed.engine,
    confidence: processed.confidence,
  });

  const observations = toNewObservations({
    userId: document.userId,
    profileId: document.profileId,
    documentId: document.id,
    processed,
  });
  if (observations.length > 0) {
    await store.replaceDocumentObservations(document.id, observations);
  }

  const updated = await store.updateDocument(document.id, {
    status: observations.length > 0 ? "needs_review" : "ready",
    category: processed.category,
    ocrEngine: processed.engine,
    textConfidence: processed.confidence,
    pages: processed.pages,
    textLength: text.length,
    summaryKind: "structured_digest",
    summary: processed.digest,
    errorMessage: processed.warnings.length > 0 ? processed.warnings.join(" ") : null,
  });

  if (!updated) throw new ApiError(500, "Document disappeared while processing.", "internal");
  return updated;
}

export interface UploadResult {
  document: MedicalDocument;
  processed: ProcessedDocument | null;
}

/** Validate, store, and process one uploaded document. */
export async function createAndProcessDocument(args: {
  user: User;
  profile: HealthProfile;
  filename: string;
  declaredType?: string;
  bytes: Uint8Array;
  /** Injected in tests; production uses the process-wide store. */
  store?: DataStore;
}): Promise<UploadResult> {
  const store = args.store ?? (await getStore());
  const validated = validateUpload(args.filename, args.bytes, args.declaredType);

  const document = await store.createDocument({
    userId: args.user.id,
    profileId: args.profile.id,
    title: titleFromFilename(validated.filename),
    originalFilename: validated.filename,
    mime: validated.mime,
    sizeBytes: validated.sizeBytes,
    status: "processing",
  });
  await store.saveFile(document.id, validated.mime, validated.bytes);
  await store.logAudit({
    userId: args.user.id,
    action: "document.uploaded",
    entity: "document",
    entityId: document.id,
    meta: { mime: validated.mime, size: validated.sizeBytes, profileId: args.profile.id },
  });

  try {
    const processed = await processDocumentBytes(validated.bytes, validated.mime);
    const updated = await persistProcessingResult(store, document, processed);
    await store.logAudit({
      userId: args.user.id,
      action: "document.processed",
      entity: "document",
      entityId: document.id,
      meta: {
        engine: processed.engine,
        category: processed.category,
        results: processed.lab.results.length,
      },
    });
    return { document: updated, processed };
  } catch (error) {
    if (!(error instanceof DocumentProcessingError)) {
      // Log the stack for operators; never log document text.
      console.error("[parikshan] unexpected document processing failure:", error);
    }
    const message =
      error instanceof DocumentProcessingError
        ? error.message
        : "Processing failed unexpectedly. You can retry from the document page.";
    const updated = await store.updateDocument(document.id, {
      status: "failed",
      errorMessage: message,
    });
    await store.logAudit({
      userId: args.user.id,
      action: "document.failed",
      entity: "document",
      entityId: document.id,
      meta: { code: error instanceof DocumentProcessingError ? error.code : "internal" },
    });
    return { document: updated ?? document, processed: null };
  }
}

/** Re-run processing on an already-stored file (user-triggered retry). */
export async function retryDocumentProcessing(
  userId: string,
  documentId: string,
  injectedStore?: DataStore,
): Promise<MedicalDocument> {
  const store = injectedStore ?? (await getStore());
  const document = await store.getDocument(documentId);
  if (!document || document.userId !== userId) {
    throw new ApiError(404, "Document not found.", "not_found");
  }
  const file = await store.getFile(documentId);
  if (!file) {
    throw new ApiError(409, "The stored file is no longer available for this document.", "file_missing");
  }

  await store.updateDocument(documentId, { status: "processing", errorMessage: null });
  try {
    const processed = await processDocumentBytes(file.bytes, file.mime);
    const updated = await persistProcessingResult(store, document, processed);
    await store.logAudit({
      userId,
      action: "document.processed",
      entity: "document",
      entityId: documentId,
      meta: { retry: true, results: processed.lab.results.length },
    });
    return updated;
  } catch (error) {
    const message =
      error instanceof DocumentProcessingError
        ? error.message
        : "Processing failed unexpectedly. You can retry again or upload a clearer file.";
    const updated = await store.updateDocument(documentId, { status: "failed", errorMessage: message });
    if (!updated) throw new ApiError(500, "Document could not be updated.", "internal");
    return updated;
  }
}

export interface SummaryOutcome {
  configured: boolean;
  summary: string | null;
  kind: "ai" | "structured_digest";
}

/** Generate (or regenerate) the AI explanation for a processed document. */
export async function generateSummaryForDocument(
  user: User,
  documentId: string,
  locale: Locale,
): Promise<SummaryOutcome> {
  const store = await getStore();
  const document = await store.getDocument(documentId);
  if (!document || document.userId !== user.id) {
    throw new ApiError(404, "Document not found.", "not_found");
  }
  const textRecord = await store.getDocumentText(documentId);
  if (!textRecord || textRecord.text.trim().length < 20) {
    throw new ApiError(
      409,
      "There is not enough extracted text to explain. Reprocess the document first.",
      "no_text",
    );
  }
  const lab = extractLabData(textRecord.text);
  const result = await generateDocumentExplanation({
    title: document.title,
    category: document.category,
    text: textRecord.text,
    lab,
    locale,
  });

  if (!result) {
    return { configured: false, summary: document.summary, kind: "structured_digest" };
  }

  await store.updateDocument(documentId, { summary: result.summary, summaryKind: "ai" });
  await store.logAudit({
    userId: user.id,
    action: "document.summary.generated",
    entity: "document",
    entityId: documentId,
    meta: { model: result.model },
  });
  return { configured: true, summary: result.summary, kind: "ai" };
}

/** Delete a document and all derived records (ownership enforced). */
export async function deleteDocumentForUser(userId: string, documentId: string): Promise<void> {
  const store = await getStore();
  const document = await store.getDocument(documentId);
  if (!document || document.userId !== userId) {
    throw new ApiError(404, "Document not found.", "not_found");
  }
  await store.deleteDocument(documentId);
  await store.logAudit({
    userId,
    action: "document.deleted",
    entity: "document",
    entityId: documentId,
    meta: { title: document.title },
  });
}
