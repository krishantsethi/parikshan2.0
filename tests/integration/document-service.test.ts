import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/server/db/memory-store";
import { createAndProcessDocument, retryDocumentProcessing, titleFromFilename } from "@/server/documents/service";
import { ApiError } from "@/server/auth/guard";
import { makeEmptyPdf, makeTextPdf } from "../helpers/pdf";
import type { HealthProfile, User } from "@/types/domain";

let store: MemoryStore;
let user: User;
let profile: HealthProfile;

const LAB_PDF_LINES = [
  "SAMPLE CITY LAB",
  "Patient: Integration Test",
  "Date: 14/03/2025",
  "Total Cholesterol 212 mg/dL Desirable: < 200",
  "LDL Cholesterol 138 mg/dL Optimal: < 100",
  "Haemoglobin 12.8 g/dL 13.0 - 17.0",
];

beforeEach(async () => {
  vi.stubEnv("DEMO_MODE", "false");
  store = new MemoryStore();
  await store.init();
  user = await store.createUser({ email: "integration@example.com", name: "Test", passwordHash: "scrypt$x" });
  profile = await store.createProfile({ ownerId: user.id, name: "Test", relation: "self" });
});

describe("createAndProcessDocument", () => {
  it("stores the file, extracts values, and lands in needs_review", async () => {
    const { document, processed } = await createAndProcessDocument({
      user,
      profile,
      filename: "lab-report-march.pdf",
      declaredType: "application/pdf",
      bytes: makeTextPdf(LAB_PDF_LINES),
      store,
    });

    expect(document.status).toBe("needs_review");
    expect(document.category).toBe("lab_report");
    expect(document.title).toBe("Lab Report March");
    expect(document.ocrEngine).toBe("pdf_text");
    expect(document.summaryKind).toBe("structured_digest");
    expect(document.summary).toContain("Total Cholesterol");
    expect(processed).not.toBeNull();

    const file = await store.getFile(document.id);
    expect(file).not.toBeNull();
    expect(file!.bytes.length).toBeGreaterThan(100);

    const text = await store.getDocumentText(document.id);
    expect(text!.text).toContain("Haemoglobin");
    expect(text!.engine).toBe("pdf_text");

    const observations = await store.listObservations({ userId: user.id, documentId: document.id });
    expect(observations).toHaveLength(3);
    const cholesterol = observations.find((o) => o.testName === "Total Cholesterol")!;
    expect(cholesterol.unit).toBe("mg/dL");
    expect(cholesterol.valueNumeric).toBe(212);
    expect(cholesterol.refHigh).toBe(200);
    expect(cholesterol.flag).toBe("high");
    expect(cholesterol.verified).toBe(false);
    expect(cholesterol.source).toBe("document_extraction");
    expect(cholesterol.collectedAt).toBe("2025-03-14");
    expect(cholesterol.notes).toContain("Review and confirm");

    const audit = await store.listAudit(user.id);
    const actions = audit.map((event) => event.action);
    expect(actions).toContain("document.uploaded");
    expect(actions).toContain("document.processed");
  });

  it("marks a PDF without text as failed with an actionable message", async () => {
    const { document, processed } = await createAndProcessDocument({
      user,
      profile,
      filename: "scan.pdf",
      declaredType: "application/pdf",
      bytes: makeEmptyPdf(),
      store,
    });
    expect(processed).toBeNull();
    expect(document.status).toBe("failed");
    expect(document.errorMessage).toMatch(/selectable text|scanned/i);
    // the uploaded original is still retained for retry
    expect(await store.getFile(document.id)).not.toBeNull();
  });

  it("rejects invalid uploads without creating a document", async () => {
    await expect(
      createAndProcessDocument({
        user,
        profile,
        filename: "fake.pdf",
        declaredType: "application/pdf",
        bytes: new TextEncoder().encode("not really a pdf"),
        store,
      }),
    ).rejects.toMatchObject({ code: "unsupported_type" });

    const { total } = await store.listDocuments({ userId: user.id });
    expect(total).toBe(0);
  });

  it("rejects cross-type declarations", async () => {
    await expect(
      createAndProcessDocument({
        user,
        profile,
        filename: "lab.pdf",
        declaredType: "image/png",
        bytes: makeTextPdf(["x"]),
        store,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("supports retry after a successful first pass", async () => {
    const { document } = await createAndProcessDocument({
      user,
      profile,
      filename: "labs.pdf",
      declaredType: "application/pdf",
      bytes: makeTextPdf(LAB_PDF_LINES),
      store,
    });
    const retried = await retryDocumentProcessing(user.id, document.id, store);
    expect(retried.status).toBe("needs_review");
    const observations = await store.listObservations({ userId: user.id, documentId: document.id });
    expect(observations).toHaveLength(3);
  });

  it("refuses retry for documents owned by someone else", async () => {
    const { document } = await createAndProcessDocument({
      user,
      profile,
      filename: "labs.pdf",
      declaredType: "application/pdf",
      bytes: makeTextPdf(LAB_PDF_LINES),
      store,
    });
    await expect(retryDocumentProcessing("someone-else", document.id, store)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("generates human-friendly titles from filenames", () => {
    expect(titleFromFilename("blood_test_2025-03.pdf")).toBe("Blood Test 2025 03");
    expect(titleFromFilename("report.pdf")).toBe("Report");
    expect(titleFromFilename(".pdf")).toBe("Untitled document");
  });
});
