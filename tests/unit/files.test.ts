import { describe, expect, it } from "vitest";
import { safeFilename, sniffMime, validateUpload } from "@/server/security/files";
import { ApiError } from "@/server/auth/guard";
import { makeTextPdf, TINY_PNG } from "../helpers/pdf";

function bytesOf(prefix: number[], length = 64): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set(prefix);
  return bytes;
}

describe("sniffMime", () => {
  it("detects PDF, PNG, JPEG and WebP by magic bytes", () => {
    expect(sniffMime(makeTextPdf(["hello"]))).toEqual({ mime: "application/pdf", extension: "pdf" });
    expect(sniffMime(TINY_PNG)).toEqual({ mime: "image/png", extension: "png" });
    expect(sniffMime(bytesOf([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ mime: "image/jpeg", extension: "jpg" });
    const webp = bytesOf([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffMime(webp)).toEqual({ mime: "image/webp", extension: "webp" });
  });

  it("returns null for unknown content", () => {
    expect(sniffMime(new TextEncoder().encode("just some text but long enough"))).toEqual({
      mime: null,
      extension: null,
    });
  });
});

describe("safeFilename", () => {
  it("strips path traversal and control characters", () => {
    expect(safeFilename("../../etc/passwd", "pdf")).toBe("passwd.pdf");
    expect(safeFilename("C:\\Users\\me\\report.pdf", "pdf")).toBe("report.pdf");
    expect(safeFilename("bad\u0000name.pdf", "pdf")).toBe("badname.pdf");
  });

  it("preserves unicode names", () => {
    expect(safeFilename("रिपोर्ट 2025.pdf", "pdf")).toBe("रिपोर्ट 2025.pdf");
  });

  it("adds an extension and falls back for empty names", () => {
    expect(safeFilename("labreport", "pdf")).toBe("labreport.pdf");
    expect(safeFilename("", "png")).toBe("document.png");
    expect(safeFilename("..", "png")).toBe("document.png");
  });
});

describe("validateUpload", () => {
  it("accepts a valid PDF and returns sanitized metadata", () => {
    const pdf = makeTextPdf(["X"]);
    const result = validateUpload("../secret/lab report.pdf", pdf, "application/pdf");
    expect(result.mime).toBe("application/pdf");
    expect(result.filename).toBe("lab report.pdf");
    expect(result.sizeBytes).toBe(pdf.length);
  });

  it("rejects empty files", () => {
    expect(() => validateUpload("empty.pdf", new Uint8Array([]))).toThrow(ApiError);
    try {
      validateUpload("empty.pdf", new Uint8Array([]));
    } catch (error) {
      expect((error as ApiError).code).toBe("empty_file");
    }
  });

  it("rejects content whose bytes do not match the declared type", () => {
    try {
      validateUpload("image.png", TINY_PNG, "application/pdf");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("mime_mismatch");
    }
  });

  it("rejects unsupported content even with a .pdf extension", () => {
    const text = new TextEncoder().encode("this is definitely not a pdf file");
    try {
      validateUpload("fake.pdf", text, "application/pdf");
      expect.unreachable();
    } catch (error) {
      expect((error as ApiError).code).toBe("unsupported_type");
      expect((error as ApiError).status).toBe(415);
    }
  });

  it("rejects oversized files", () => {
    // Default limit is 10 MB; 10 MB + 1 byte with a PDF signature.
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(new TextEncoder().encode("%PDF-1.4"));
    try {
      validateUpload("big.pdf", big, "application/pdf");
      expect.unreachable();
    } catch (error) {
      expect((error as ApiError).code).toBe("file_too_large");
      expect((error as ApiError).status).toBe(413);
    }
  });
});
