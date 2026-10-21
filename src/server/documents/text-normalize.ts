/**
 * Text normalization for extracted document text.
 *
 * Deliberately conservative: we unify whitespace/dashes and strip control
 * characters, but NEVER rewrite tokens that could carry clinical meaning
 * (values, units, drug names). OCR-level corrections happen nowhere —
 * uncertainty is surfaced to the user for review instead.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const UNICODE_DASHES = /[\u2010\u2011\u2012\u2013\u2014\u2212]/g;

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(UNICODE_DASHES, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Collapse to single spaces — used for keyword scanning, not storage. */
export function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
