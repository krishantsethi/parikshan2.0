/**
 * Minimal PDF generator for tests.
 *
 * Produces a valid single-page PDF with a real text layer (Helvetica), a
 * correct xref table, and one text line per input string. This exercises the
 * actual pdf.js extraction path instead of mocking it.
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function makeTextPdf(lines: string[]): Uint8Array {
  const content =
    "BT /F1 11 Tf 40 780 Td 14 TL\n" +
    lines.map((line) => `(${escapePdfText(line)}) Tj T*`).join("\n") +
    "\nET";

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    4: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    5: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  };

  let out = "%PDF-1.4\n";
  const offsets: Record<number, number> = {};
  for (let n = 1; n <= 5; n++) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefOffset = out.length;
  out += "xref\n0 6\n0000000000 65535 f \n";
  for (let n = 1; n <= 5; n++) {
    out += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

/** A structurally valid PDF with no text content (mimics a scanned page). */
export function makeEmptyPdf(): Uint8Array {
  return makeTextPdf([]);
}

/** Minimal valid 1x1 PNG (magic bytes + IHDR/IDAT/IEND) for upload checks. */
export const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);
