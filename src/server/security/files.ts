import { ApiError } from "@/server/auth/guard";
import { getConfig } from "@/lib/env";

/**
 * Upload validation: MIME sniffing by magic bytes, size caps, filename
 * sanitization. We trust bytes, never client-declared types.
 */

export interface SniffResult {
  mime: string | null;
  extension: string | null;
}

const SIGNATURES: Array<{ mime: string; extension: string; test: (b: Uint8Array) => boolean }> = [
  {
    mime: "application/pdf",
    extension: "pdf",
    test: (b) => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  },
  {
    mime: "image/png",
    extension: "png",
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    extension: "jpg",
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/webp",
    extension: "webp",
    test: (b) =>
      b.length > 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // WEBP
  },
];

export const ALLOWED_MIMES = SIGNATURES.map((s) => s.mime);

export function sniffMime(bytes: Uint8Array): SniffResult {
  for (const sig of SIGNATURES) {
    if (sig.test(bytes)) return { mime: sig.mime, extension: sig.extension };
  }
  return { mime: null, extension: null };
}

/** Strip path components and control chars; cap length; keep a sane extension. */
export function safeFilename(name: string, fallbackExtension: string): string {
  const base = name
    .replace(/\\/g, "/")
    .split("/")
    .pop() ?? "document";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\w.\-\u0900-\u097F ()[\]]+/gu, "_")
    .trim()
    .slice(0, 180);
  if (!cleaned || cleaned === "." || cleaned === "..") return `document.${fallbackExtension}`;
  if (!cleaned.includes(".")) return `${cleaned}.${fallbackExtension}`;
  return cleaned;
}

export interface ValidatedUpload {
  filename: string;
  mime: string;
  sizeBytes: number;
  bytes: Uint8Array;
}

/** Full validation for an uploaded medical document. Throws ApiError(400/413). */
export function validateUpload(originalName: string, bytes: Uint8Array, declaredType?: string): ValidatedUpload {
  const cfg = getConfig();
  if (bytes.length === 0) {
    throw new ApiError(400, "The uploaded file is empty.", "empty_file");
  }
  if (bytes.length > cfg.uploadMaxBytes) {
    const maxMb = Math.round(cfg.uploadMaxBytes / (1024 * 1024));
    throw new ApiError(413, `File exceeds the ${maxMb} MB limit.`, "file_too_large");
  }
  const sniffed = sniffMime(bytes);
  if (!sniffed.mime || !sniffed.extension) {
    throw new ApiError(
      415,
      "Unsupported file type. Upload a PDF, PNG, JPEG, or WebP document.",
      "unsupported_type",
    );
  }
  // Declared type must agree with the bytes when provided (defense-in-depth).
  if (declaredType && declaredType !== "application/octet-stream" && declaredType !== sniffed.mime) {
    throw new ApiError(415, "File content does not match its declared type.", "mime_mismatch");
  }
  return {
    filename: safeFilename(originalName, sniffed.extension),
    mime: sniffed.mime,
    sizeBytes: bytes.length,
    bytes,
  };
}
