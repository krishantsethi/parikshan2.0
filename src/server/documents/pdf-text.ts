import { normalizeText } from "@/server/documents/text-normalize";

/**
 * Digital-PDF text extraction via pdf.js (legacy Node build).
 * Throws a typed error for encrypted/corrupt files so the pipeline can mark
 * the document failed with an honest message.
 */

export class PdfExtractionError extends Error {
  constructor(
    message: string,
    public readonly reason: "encrypted" | "corrupt" | "unknown",
  ) {
    super(message);
  }
}

export interface PdfTextResult {
  text: string;
  pages: number;
  perPage: string[];
}

interface PdfTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  hasEOL?: boolean;
}

/** Reconstruct roughly-positioned lines from pdf.js text items. */
function itemsToPageText(items: PdfTextItem[]): string {
  interface Placed {
    str: string;
    x: number;
    y: number;
  }
  const placed: Placed[] = [];
  for (const item of items) {
    if (typeof item.str !== "string" || item.str.length === 0) continue;
    const transform = item.transform ?? [1, 0, 0, 1, 0, 0];
    placed.push({ str: item.str, x: transform[4] ?? 0, y: transform[5] ?? 0 });
  }
  if (placed.length === 0) return "";

  // Group by y (descending = top to bottom), tolerance of 2.5 units.
  const tolerance = 2.5;
  const lines: Placed[][] = [];
  for (const item of placed) {
    const line = lines.find((candidate) => Math.abs((candidate[0]?.y ?? 0) - item.y) <= tolerance);
    if (line) line.push(item);
    else lines.push([item]);
  }
  lines.sort((a, b) => (b[0]?.y ?? 0) - (a[0]?.y ?? 0));

  const out: string[] = [];
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd = -Infinity;
    for (const chunk of line) {
      const gap = chunk.x - prevEnd;
      if (text && gap > 12) text += "   ";
      else if (text && !/\s$/.test(text) && !/^\s/.test(chunk.str)) text += " ";
      text += chunk.str;
      prevEnd = chunk.x + (chunk.str.length ? chunk.str.length * 4.6 : 0);
    }
    if (text.trim()) out.push(text.trimEnd());
  }
  return out.join("\n");
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfTextResult> {
  let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (error) {
    throw new PdfExtractionError(
      `PDF engine could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
      "unknown",
    );
  }

  try {
    const doc = await pdfjs.getDocument({
      data: bytes.slice(),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      // Node has no DOM; the legacy build uses a fake worker.
      useWorkerFetch: false,
    }).promise;

    const perPage: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      perPage.push(itemsToPageText(content.items as PdfTextItem[]));
    }
    const text = normalizeText(perPage.join("\n\n"));
    const pages = doc.numPages;
    await doc.destroy();
    return { text, pages, perPage };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = /password|encrypt/i.test(message)
      ? "encrypted"
      : /invalid|corrupt|missing|format/i.test(message)
        ? "corrupt"
        : "unknown";
    throw new PdfExtractionError(`Could not read PDF: ${message}`, reason);
  }
}
