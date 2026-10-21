# Document processing & extraction

## Inputs

| Format | Path | Notes |
| --- | --- | --- |
| Digital PDF | pdf.js text layer | One text item stream per page; lines reconstructed by y-position, x-gaps become spacing |
| PNG / JPEG / WebP | tesseract.js (local) | Confidence reported 0–1; language configured via `OCR_LANGUAGES` |
| Password-protected / corrupt PDF | rejected | Specific message; no partial/fake output |
| PDF with no text layer | rejected (`pdf_no_text`) | Suggests photographing the pages (we do not rasterize server-side) |
| > size limit or wrong magic bytes | rejected before storage | 415/413 with actionable copy |

## Pipeline stages

1. **Validate** — magic bytes must match an allowlist; declared MIME must agree; size ≤ `UPLOAD_MAX_MB`.
2. **Extract text** — engine recorded (`pdf_text` / `ocr_tesseract`), confidence stored when available.
3. **Normalize** — line endings, unicode dashes, repeated whitespace. We never "fix" numbers or units.
4. **Classify** — weighted keyword scoring across lab report / prescription / discharge summary / imaging / vaccination / invoice / insurance. Confidence = strength + margin over the runner-up. Under 3 points → `other`.
5. **Parse lab rows** — for each line:
   - find the first standalone number that is preceded by whitespace and at least two letters (prevents `HbA1c` → value `1`)
   - the name is everything before it; header words (`Patient`, `Barcode`, `Date`…) are rejected
   - the unit is the longest known unit matching with non-alphanumeric boundaries (`mg/dL` wins over `g/dL`)
   - the reference range is parsed from the remainder: two-sided (`13.0 - 17.0`), upper (`< 200`, `up to 150`), or lower (`> 40`)
   - the flag is computed **only** from that range: `low` / `normal` / `high` / `unknown`
   - confidence is heuristic: +0.15 for a known unit, +0.15 for a parsed range, +0.05 when a printed H/L agrees
6. **Parse medications** — only for prescription-like text; requires a dose form or strength+schedule; captures name, strength as printed, frequency/duration phrasing, prescriber.
7. **Digest** — a deterministic factual summary (source lab, date, category, counts, notable values) explicitly labeled as not an AI explanation.
8. **Persist** — text (capped at 400k chars), unverified observations, status `needs_review` (or `ready` if nothing was extracted), warnings in `error_message`.
9. **Human review** — the user edits/removes rows and confirms. The server recomputes flags from the submitted range and marks rows `verified` with source `reviewed`.

## Dates

- ISO `YYYY-MM-DD` is preferred.
- Slash/dash dates are interpreted **day-first** (Indian lab convention). Ambiguous dates (both components ≤ 12) are flagged with a warning and lower confidence.
- Impossible dates are rejected (e.g., 31/02).
- The raw printed string is preserved on the document and in the report-date warnings.

## Name normalization

Exact clinical synonyms are mapped to a canonical test name for trend grouping (`Hb`/`HAEMOGLOBIN` → `Hemoglobin`, `TLC`/`WBC` → `Total Leukocyte Count`). Ambiguous abbreviations are deliberately **not** merged (`TC` is left alone). ALL-CAPS unknown names are title-cased for readability only.

## Known limitations

- **Scanned PDFs are not rasterized server-side** (no canvas in the Node runtime by design). Users must upload page images for OCR. This is stated in the UI when it happens.
- **Live tesseract OCR was not exercised in the build sandbox** because the traineddata CDN is blocked. The pipeline contract is tested with an injected provider; the digital-PDF path is tested end-to-end with real PDF bytes.
- The parser targets common one-value-per-line lab layouts. Multi-column tables, rotated pages, handwriting, and mixed Indian/English layouts will produce partial results — flagged for review, never silently trusted.
- Confidence values are heuristic (not calibrated probabilities) and are presented as such.
- Units are never converted. Trends exclude mismatched units rather than risking a clinically wrong chart.
