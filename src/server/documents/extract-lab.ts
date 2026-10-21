import type { ObservationFlag } from "@/types/domain";

/**
 * Deterministic lab-report extraction.
 *
 * Philosophy:
 *  - We surface values exactly as printed (valueText / unit / refText).
 *  - Abnormality flags are computed ONLY from the reference range stated on
 *    the document. No range -> flag "unknown". Never infer a diagnosis.
 *  - We do not convert units, guess missing values, or "correct" OCR here.
 *  - Every result carries a heuristic confidence and its source line so a
 *    human can review it before it enters a trend.
 */

export interface ExtractedLabResult {
  testName: string;
  normalizedName: string;
  valueText: string;
  valueNumeric: number | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  flag: ObservationFlag;
  confidence: number;
  lineNumber: number;
  rawLine: string;
}

export interface ExtractedDate {
  iso: string | null;
  raw: string | null;
  confidence: number;
}

export interface LabExtraction {
  results: ExtractedLabResult[];
  reportDate: ExtractedDate;
  patientName: string | null;
  labName: string | null;
  warnings: string[];
}

/* ------------------------------------------------------------------- units */

/** Longest-first so "mg/dL" wins over "mg". */
const KNOWN_UNITS = [
  "10^3/µL", "10^3/uL", "x10^3/uL", "x10^3/µL", "10^9/L", "x10^9/L", "million/µL", "million/uL",
  "lakh/µL", "lakh/uL", "cells/cumm", "cells/µL", "cells/uL", "/cumm", "/µL", "/uL",
  "µIU/mL", "uIU/mL", "mIU/L", "µg/dL", "mcg/dL", "ug/dL", "ng/dL", "pg/mL", "ng/mL",
  "µmol/L", "umol/L", "pmol/L", "mmol/L", "mEq/L", "mmol/mol",
  "IU/mL", "IU/L", "mIU/mL", "U/L", "g/dL", "g/L", "mg/dL", "mg/L", "µg/mL", "mcg/mL",
  "mm/hr", "mm/hg", "mmHg", "kg/m²", "kg/m2", "mL/min", "mL/min/1.73m²", "mL/min/1.73m2",
  "fL", "pg", "%", "cm", "mm", "kg", "bpm",
] as const;

function findUnit(text: string): { unit: string; index: number } | null {
  const lower = text.toLowerCase();
  // Longest unit first so "mg/dL" wins over the "g/dL" substring inside it.
  const units = [...KNOWN_UNITS].sort((a, b) => b.length - a.length);
  for (const unit of units) {
    const needle = unit.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      // Both boundaries must be non-alphanumeric: this prevents "g/dL" from
      // matching inside "mg/dL" and "L" from matching inside a word.
      const prevChar = idx === 0 ? undefined : lower[idx - 1];
      const nextChar = lower[idx + needle.length];
      const boundary = (c: string | undefined) => c === undefined || !/[a-z0-9\/]/.test(c);
      if (boundary(prevChar) && boundary(nextChar)) return { unit, index: idx };
      from = idx + 1;
    }
  }
  return null;
}

/* ------------------------------------------------------- name normalization */

/**
 * Exact-match clinical synonyms only. We never merge tests whose identity is
 * ambiguous (e.g. bare "TC" could be total count or total cholesterol).
 */
const TEST_ALIASES: Record<string, string> = {
  hb: "Hemoglobin",
  "hb%": "Hemoglobin",
  haemoglobin: "Hemoglobin",
  hemoglobin: "Hemoglobin",
  "haemoglobin (hb)": "Hemoglobin",
  "haemoglobin(hb)": "Hemoglobin",
  tlc: "Total Leukocyte Count",
  "total leukocyte count": "Total Leukocyte Count",
  "total leucocyte count": "Total Leukocyte Count",
  wbc: "Total Leukocyte Count",
  "wbc count": "Total Leukocyte Count",
  "total wbc count": "Total Leukocyte Count",
  "white blood cell count": "Total Leukocyte Count",
  platelet: "Platelet Count",
  platelets: "Platelet Count",
  "platelet count": "Platelet Count",
  plt: "Platelet Count",
  "total cholesterol": "Total Cholesterol",
  "cholesterol total": "Total Cholesterol",
  "cholesterol, total": "Total Cholesterol",
  "serum cholesterol": "Total Cholesterol",
  "serum total cholesterol": "Total Cholesterol",
  "ldl cholesterol": "LDL Cholesterol",
  "ldl-cholesterol": "LDL Cholesterol",
  "ldl-c": "LDL Cholesterol",
  ldl: "LDL Cholesterol",
  "hdl cholesterol": "HDL Cholesterol",
  "hdl-cholesterol": "HDL Cholesterol",
  "hdl-c": "HDL Cholesterol",
  hdl: "HDL Cholesterol",
  triglyceride: "Triglycerides",
  triglycerides: "Triglycerides",
  tg: "Triglycerides",
  "fasting blood sugar": "Fasting Glucose",
  "fasting blood glucose": "Fasting Glucose",
  "fasting glucose": "Fasting Glucose",
  "glucose fasting": "Fasting Glucose",
  "blood sugar fasting": "Fasting Glucose",
  fbs: "Fasting Glucose",
  "post prandial blood sugar": "Postprandial Glucose",
  "post prandial glucose": "Postprandial Glucose",
  "2 hour post prandial glucose": "Postprandial Glucose",
  ppbs: "Postprandial Glucose",
  hba1c: "HbA1c",
  "glycated hemoglobin": "HbA1c",
  "glycated haemoglobin": "HbA1c",
  "glycosylated hemoglobin": "HbA1c",
  "glycosylated haemoglobin": "HbA1c",
  "hb a1c": "HbA1c",
  creatinine: "Creatinine",
  "serum creatinine": "Creatinine",
  tsh: "TSH",
  "vitamin d": "Vitamin D",
  "vit d": "Vitamin D",
  "25-oh vitamin d": "Vitamin D",
  "25 hydroxy vitamin d": "Vitamin D",
  "vitamin b12": "Vitamin B12",
  "b12": "Vitamin B12",
  sgot: "AST (SGOT)",
  ast: "AST (SGOT)",
  sgpt: "ALT (SGPT)",
  alt: "ALT (SGPT)",
  esr: "ESR",
  crp: "CRP",
  "c-reactive protein": "CRP",
  egfr: "eGFR",
  "blood urea": "Blood Urea",
  urea: "Blood Urea",
  "total bilirubin": "Total Bilirubin",
  "bilirubin total": "Total Bilirubin",
  "uric acid": "Uric Acid",
  "serum uric acid": "Uric Acid",
  "alkaline phosphatase": "Alkaline Phosphatase",
  alp: "Alkaline Phosphatase",
  calcium: "Calcium",
  "serum calcium": "Calcium",
  "t3": "T3",
  "t4": "T4",
};

const HEADER_WORDS = new Set([
  "patient", "date", "age", "sex", "gender", "report", "sample", "reference", "range",
  "unit", "units", "result", "results", "method", "lab", "doctor", "dr", "address",
  "barcode", "id", "uhid", "reg", "registration", "phone", "mobile", "email", "page",
  "remarks", "comment", "comments", "note", "notes", "status",
]);

function tidyName(raw: string): string {
  return raw
    .replace(/^[\s*•·\-–—>|]+/, "")
    .replace(/[:\s]+$/, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\((?:serum|plasma|fasting|random)\)$/i, "")
    .trim()
    .slice(0, 70);
}

function isPlausibleName(name: string): boolean {
  if (name.length < 2 || name.length > 70) return false;
  if ((name.match(/[A-Za-z\u0900-\u097F]/g) ?? []).length < 2) return false;
  if (!/[A-Za-z\u0900-\u097F]/.test(name)) return false;
  const key = name.toLowerCase().replace(/[.:]/g, "").trim();
  if (HEADER_WORDS.has(key)) return false;
  if (["total", "value", "result", "results", "units"].includes(key)) return false;
  if (HEADER_WORDS.has(key.split(/\s+/)[0] ?? "")) return false;
  if (/\b(?:date|dob|barcode|uhid|phone|mobile|address|invoice)\b/i.test(name)) return false;
  // Names should not be mostly digits.
  const digits = (name.match(/\d/g) ?? []).length;
  if (digits > name.length / 2) return false;
  return true;
}

/** Canonical name for grouping trends; falls back to a tidied display name. */
export function normalizeTestName(raw: string): string {
  const tidy = tidyName(raw);
  const key = tidy.toLowerCase().replace(/\s*\((?:hb|hgb|pcv)\)\s*/gi, "").trim();
  const alias = TEST_ALIASES[key];
  if (alias) return alias;
  // ALL-CAPS names read poorly; title-case them, otherwise keep as printed.
  if (tidy === tidy.toUpperCase()) {
    return tidy
      .toLowerCase()
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .replace(/\b(Hdl|Ldl|Tsh|T3|T4|B12|Ast|Alt|Sgot|Sgpt|Crp|Esr|Egfr|Wbc|Rbc|Pcv|Mcv|Mch|Mchc|Hba1c)\b/gi, (m) => m.toUpperCase());
  }
  return tidy;
}

/* ------------------------------------------------------------------ numbers */

/**
 * Numbers may be thousands-separated (7,200) or plain (4000, 240000), with an
 * optional decimal part. The trailing (?!\d) prevents partial matches like
 * reading "4000" as "400".
 */
const NUMBER_RE = /[-+]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?!\d)/;

interface ParsedValue {
  text: string;
  numeric: number;
  start: number;
  end: number;
}

function parseFirstNumber(text: string, from = 0): ParsedValue | null {
  const slice = text.slice(from);
  const match = NUMBER_RE.exec(slice);
  if (!match) return null;
  const start = from + match.index;
  return {
    text: match[0],
    numeric: Number.parseFloat(match[0].replace(/,/g, "")),
    start,
    end: start + match[0].length,
  };
}

interface ParsedRange {
  low: number | null;
  high: number | null;
  refText: string;
  /** True when the original text used a bound (< or >) instead of two numbers. */
  bounded: boolean;
}

/** Parse a reference range from text after the value+unit. */
export function parseReferenceRange(text: string): ParsedRange | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  // Two-sided range: 13.0 - 17.0 / 4 to 11 / 70–100 / 4000 - 11000
  const two = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?!\d)/i.exec(cleaned);
  if (two) {
    const low = Number.parseFloat(two[1]!.replace(/,/g, ""));
    const high = Number.parseFloat(two[2]!.replace(/,/g, ""));
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return { low: Math.min(low, high), high: Math.max(low, high), refText: two[0].trim(), bounded: false };
    }
  }
  // Upper bound only: < 200 / up to 150 / desirable below 5.7
  const upper = /(?:<|≤|less than|below|up to|upto|not more than|desirable\s*:?\s*<|normal\s*:?\s*<|max(?:imum)?\s*:?\s*)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/i.exec(cleaned);
  if (upper) {
    const high = Number.parseFloat(upper[1]!.replace(/,/g, ""));
    if (Number.isFinite(high)) {
      return { low: null, high, refText: upper[0].trim(), bounded: true };
    }
  }
  // Lower bound only: > 40 / at least 30
  const lower = /(?:>|≥|greater than|more than|at least|desirable\s*:?\s*>|normal\s*:?\s*>)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/i.exec(cleaned);
  if (lower) {
    const low = Number.parseFloat(lower[1]!.replace(/,/g, ""));
    if (Number.isFinite(low)) {
      return { low, high: null, refText: lower[0].trim(), bounded: true };
    }
  }
  return null;
}

/** Compute the flag strictly from the printed range. */
export function computeFlag(value: number | null, low: number | null, high: number | null): ObservationFlag {
  if (value === null || !Number.isFinite(value)) return "unknown";
  if (low === null && high === null) return "unknown";
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "normal";
}

const FLAG_WORDS =
  /(?:^|\s)(H|HIGH|HH|LOW|L|LL|ABNORMAL|ABN|CRITICAL|NORMAL|WITHIN RANGE|WNL)(?:\s|$)/i;

function stripFlagWord(text: string): { stripped: string; flagWord: string | null } {
  const match = FLAG_WORDS.exec(text);
  if (!match) return { stripped: text, flagWord: null };
  return {
    stripped: (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim(),
    flagWord: match[1]!.toUpperCase(),
  };
}

function flagWordsAgree(flagWord: string | null, flag: ObservationFlag): boolean {
  if (!flagWord) return true;
  if (["H", "HH", "HIGH", "ABNORMAL", "ABN", "CRITICAL"].includes(flagWord)) return flag === "high";
  if (["L", "LOW", "LL"].includes(flagWord)) return flag === "low";
  return flag === "normal" || flag === "unknown";
}

/* ------------------------------------------------------------- line parsing */

export function parseLabLine(
  line: string,
  lineNumber: number,
): ExtractedLabResult | null {
  const original = line.trim();
  if (original.length < 6 || original.length > 220) return null;
  if (!/\d/.test(original)) return null;

  const { stripped, flagWord } = stripFlagWord(original);

  // Find the first number that is preceded by at least two letters.
  let searchFrom = 0;
  let value: ParsedValue | null = null;
  while (searchFrom < stripped.length) {
    const candidate = parseFirstNumber(stripped, searchFrom);
    if (!candidate) break;
    const prefix = stripped.slice(0, candidate.start);
    const prefixLetters = (prefix.match(/[A-Za-z\u0900-\u097F]/g) ?? []).length;
    // The value must be separated from the name by whitespace, otherwise
    // the "1" in "HbA1c" or "T3" would be read as the value. (Aligned columns
    // often use several spaces, so require whitespace — not a single letter.)
    if (prefixLetters >= 2 && /\s$/.test(prefix)) {
      value = candidate;
      break;
    }
    searchFrom = candidate.end;
  }
  if (!value) return null;

  const nameRaw = stripped.slice(0, value.start);
  const name = tidyName(nameRaw);
  if (!isPlausibleName(name)) return null;
  // A value at the very end of the line with a long name is more likely an ID.
  if (value.numeric > 1e9) return null;

  const afterValue = stripped.slice(value.end);
  const unitMatch = findUnit(afterValue);
  const unit = unitMatch ? unitMatch.unit : null;

  // Range parsing happens on the remainder after the (potential) unit.
  const rangeSearchFrom = unitMatch ? unitMatch.index + unitMatch.unit.length : 0;
  const rangeSource = afterValue.slice(rangeSearchFrom);
  const range = parseReferenceRange(rangeSource);
  // Guard: don't treat a trailing date fragment as a range.
  const safeRange = range && !/\b(?:19|20)\d{2}\b/.test(range.refText) ? range : null;

  const refLow = safeRange?.low ?? null;
  const refHigh = safeRange?.high ?? null;
  const flag = computeFlag(value.numeric, refLow, refHigh);

  let confidence = 0.55;
  if (unit) confidence += 0.15;
  if (safeRange) confidence += 0.15;
  if (flagWord && flag !== "unknown" && flagWordsAgree(flagWord, flag)) confidence += 0.05;
  if (!unit && !safeRange) confidence = 0.4;
  // Long adjacent prose suggests we accidentally captured a sentence.
  if (name.split(/\s+/).length > 7) confidence -= 0.15;
  confidence = Math.max(0.2, Math.min(0.95, Number(confidence.toFixed(2))));

  const refText = safeRange
    ? `${safeRange.bounded ? safeRange.refText : safeRange.refText}${unit ? ` ${unit}` : ""}`.trim().slice(0, 80)
    : null;

  return {
    testName: name,
    normalizedName: normalizeTestName(name),
    valueText: value.text,
    valueNumeric: value.numeric,
    unit,
    refLow,
    refHigh,
    refText,
    flag,
    confidence,
    lineNumber,
    rawLine: original,
  };
}

/* --------------------------------------------------------------------- date */

function isoFromParts(yearRaw: string, monthRaw: string, dayRaw: string): string | null {
  let year = Number.parseInt(yearRaw, 10);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAY_FIRST_NOTE =
  "Ambiguous date parsed as day/month/year (common on Indian lab reports).";

/**
 * Extract the report/collection date. Day-first (DD/MM/YYYY) is assumed for
 * slash/dash dates because this product targets Indian medical documents; the
 * raw string is retained so users can correct it.
 */
export function findReportDate(text: string): ExtractedDate & { ambiguous?: boolean; note?: string } {
  const labelRe =
    /(?:collected|collection|report(?:ed)?|sample|specimen)\s*(?:date|on)?\s*[:\-]?\s*([0-9]{1,2}[\/\-. ][0-9]{1,2}[\/\-. ][0-9]{2,4}|\d{4}-\d{2}-\d{2})/i;
  const genericRe = /(?:^|[\n|;]|\s{2,})\s*date(?:d)?\s*[:\-]?\s*([0-9]{1,2}[\/\-. ][0-9]{1,2}[\/\-. ][0-9]{2,4}|\d{4}-\d{2}-\d{2})/i;

  const labeled = labelRe.exec(text);
  const generic = genericRe.exec(text);
  const match = labeled ?? generic;
  if (!match) return { iso: null, raw: null, confidence: 0 };

  const raw = match[1]!.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoMatch) {
    const iso = isoFromParts(isoMatch[1]!, isoMatch[2]!, isoMatch[3]!);
    return iso
      ? { iso, raw, confidence: labeled ? 0.95 : 0.8 }
      : { iso: null, raw, confidence: 0 };
  }

  const parts = raw.split(/[\/\-. ]+/);
  if (parts.length !== 3) return { iso: null, raw, confidence: 0 };
  const [a, b, c] = parts as [string, string, string];
  // If the first component is a 4-digit year it's already ISO-like.
  if (a.length === 4) {
    const iso = isoFromParts(a, b, c);
    return iso ? { iso, raw, confidence: labeled ? 0.9 : 0.75 } : { iso: null, raw, confidence: 0 };
  }
  const dayFirst = isoFromParts(c, b, a);
  if (!dayFirst) return { iso: null, raw, confidence: 0 };
  const ambiguous = Number.parseInt(a, 10) <= 12 && Number.parseInt(b, 10) <= 12;
  return {
    iso: dayFirst,
    raw,
    confidence: ambiguous ? 0.6 : 0.85,
    ambiguous,
    note: ambiguous ? DAY_FIRST_NOTE : undefined,
  };
}

/* -------------------------------------------------------------- header bits */

export function findPatientName(text: string): string | null {
  const re =
    /(?:patient(?:'s)?\s*name|patient|name\s*of\s*patient)\s*[:\-]\s*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F .'()-]{1,60})/i;
  const match = re.exec(text);
  if (!match) return null;
  const raw = match[1]!
    .split(/\s{2,}|\s+(?:age|sex|gender|dob|date|uhid|ref)\b/i)[0]!
    .replace(/[.:,-]+$/, "")
    .trim();
  if (raw.length < 2 || /^\d+$/.test(raw)) return null;
  // Do not guess if the "name" is actually another label.
  if (HEADER_WORDS.has(raw.toLowerCase())) return null;
  return raw.slice(0, 80);
}

export function findLabName(text: string): string | null {
  const lines = text.split(/\n/).slice(0, 6);
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length >= 4 &&
      trimmed.length <= 90 &&
      /(?:diagnostic|laborator|patholog|hospital|clinic|health ?care|labs?\b|institute|centre|center)/i.test(trimmed) &&
      !/patient|report\s*date|barcode/i.test(trimmed)
    ) {
      return trimmed.replace(/\s{2,}/g, " ").slice(0, 90);
    }
  }
  return null;
}

/* ------------------------------------------------------------------- public */

export function extractLabData(text: string): LabExtraction {
  const lines = text.split(/\n/);
  const results: ExtractedLabResult[] = [];
  const seen = new Set<string>();

  lines.forEach((line, idx) => {
    const parsed = parseLabLine(line, idx + 1);
    if (!parsed) return;
    const dedupeKey = `${parsed.normalizedName.toLowerCase()}|${parsed.valueText}|${parsed.unit ?? ""}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    results.push(parsed);
  });

  const date = findReportDate(text);
  const warnings: string[] = [];
  if (results.length === 0) {
    warnings.push(
      "No structured lab values were detected. The document may not be a lab report, or its layout is not yet supported.",
    );
  } else {
    const lowConfidence = results.filter((r) => r.confidence < 0.6).length;
    if (lowConfidence > 0) {
      warnings.push(
        `${lowConfidence} extracted value(s) have low confidence — verify them against the source before confirming.`,
      );
    }
    const noRange = results.filter((r) => r.flag === "unknown").length;
    if (noRange > 0) {
      warnings.push(
        `${noRange} value(s) had no stated reference range, so no abnormality flag was assigned.`,
      );
    }
  }
  if (!date.iso) warnings.push("The report date could not be detected — please confirm it manually.");
  else if (date.ambiguous && date.note) warnings.push(date.note);

  return {
    results,
    reportDate: { iso: date.iso, raw: date.raw, confidence: date.confidence },
    patientName: findPatientName(text),
    labName: findLabName(text),
    warnings,
  };
}
