/**
 * Prescription medication extraction.
 *
 * Only fields explicitly present in the text are captured (name, strength as
 * written, frequency/duration phrasing). We never invent a dose or schedule.
 */

export interface ExtractedMedication {
  name: string;
  dosageText: string | null;
  scheduleText: string | null;
  prescriber: string | null;
  confidence: number;
  lineNumber: number;
  rawLine: string;
}

const DOSE_FORMS = /\b(?:tab(?:let)?|cap(?:sule)?|syp|syrup|susp|injection|inj|oint(?:ment)?|drops?|spray|cream|gel|powder|sachet|patch|inhaler)\.?\s+/i;

const FREQUENCY_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b1-0-1\b/, label: "1-0-1 (morning & night)" },
  { re: /\b1-0-0\b/, label: "1-0-0 (morning)" },
  { re: /\b0-0-1\b/, label: "0-0-1 (night)" },
  { re: /\b0-1-0\b/, label: "0-1-0 (afternoon)" },
  { re: /\b1-1-1\b/, label: "1-1-1 (three times daily)" },
  { re: /\b(?:od|o\.d\.?)\b/i, label: "Once daily (OD)" },
  { re: /\b(?:bd|b\.d\.?|bid)\b/i, label: "Twice daily (BD)" },
  { re: /\b(?:tds|t\.d\.s\.?|tid|tdd)\b/i, label: "Three times daily (TDS)" },
  { re: /\b(?:qid|q\.i\.d\.?|qds)\b/i, label: "Four times daily (QID)" },
  { re: /\b(?:hs|h\.s\.?|at bedtime)\b/i, label: "At bedtime (HS)" },
  { re: /\b(?:sos|s\.o\.s\.?|prn|as needed)\b/i, label: "As needed (SOS/PRN)" },
  { re: /\b(?:once|once a day|once daily|one time daily)\b/i, label: "Once daily" },
  { re: /\b(?:twice|twice a day|twice daily|two times (?:a|per) day)\b/i, label: "Twice daily" },
  { re: /\b(?:thrice|thrice a day|three times (?:a|per) day)\b/i, label: "Three times daily" },
  { re: /\b(?:every|q)\s*(\d{1,2})\s*(?:hours?|hrs?|h)\b/i, label: "Every N hours" },
  { re: /\b(?:morning|night|evening)\b/i, label: "Timed" },
  { re: /\bafter (?:meals?|food)\b/i, label: "After food" },
  { re: /\bbefore (?:meals?|food)\b/i, label: "Before food" },
  { re: /\bwith (?:meals?|food)\b/i, label: "With food" },
  { re: /\bempty stomach\b/i, label: "Empty stomach" },
];

const DURATION_RE =
  /\b(?:x|×|for)\s*(\d{1,3})\s*(days?|weeks?|months?)\b|\b(\d{1,3})\s*(days?|weeks?|months?)\b/i;

const STRENGTH_RE =
  /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug|g|ml|mL|IU|i\.u\.|units?|%)(?:\s*\+\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL))?/;

const FORM_PREFIX_RE = /^(?:tab(?:let)?|cap(?:sule)?|syp|syrup|susp|inj(?:ection)?|oint(?:ment)?|drops?|spray|cream|gel|powder|sachet|patch|inhaler)\.?\s+/i;

const STOP_NAME_WORDS = new Set([
  "od", "bd", "tds", "tid", "qid", "hs", "sos", "prn", "stat", "after", "before",
  "with", "for", "x", "days", "day", "weeks", "week", "months", "month", "mg", "ml",
  "once", "twice", "thrice", "daily", "night", "morning", "evening", "tablet",
  "capsule", "take", "as", "needed", "food", "meals", "empty", "stomach", "and",
  "then", "if", "required", "advice", "advised", "follow", "up",
]);

function extractStrength(text: string): string | null {
  const match = STRENGTH_RE.exec(text);
  return match ? match[0].trim() : null;
}

function extractFrequency(text: string): string | null {
  const hits: string[] = [];
  for (const { re, label } of FREQUENCY_PATTERNS) {
    if (re.test(text) && !hits.includes(label)) hits.push(label);
  }
  if (hits.length === 0) return null;
  // Prefer explicit numeric schedules over generic words.
  const explicit = hits.find((h) => /^[01]-[01]-[01]/.test(h));
  return explicit ?? hits.slice(0, 2).join(", ");
}

function extractDuration(text: string): string | null {
  const match = DURATION_RE.exec(text);
  if (!match) return null;
  const count = match[1] ?? match[3];
  const unit = match[2] ?? match[4];
  return count && unit ? `${count} ${unit}` : null;
}

function extractDrugName(line: string): string | null {
  let working = line
    .replace(/^[\s\d.)*•·\-–—]+/, "")
    .replace(FORM_PREFIX_RE, "")
    .trim();

  // Cut at the first strength, frequency, or schedule marker.
  const cutCandidates = [
    working.search(STRENGTH_RE),
    working.search(/\b(?:1-0-1|0-0-1|1-0-0|0-1-0)\b/),
    working.search(/\b(?:od|bd|tds|tid|qid|hs|sos|prn)\b/i),
  ].filter((i) => i > 1);
  if (cutCandidates.length > 0) working = working.slice(0, Math.min(...cutCandidates));

  const tokens = working
    .replace(/[():;,.]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const nameTokens: string[] = [];
  for (const token of tokens) {
    const clean = token.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!clean) continue;
    if (STOP_NAME_WORDS.has(clean)) break;
    if (/^\d+$/.test(clean)) break;
    nameTokens.push(token.replace(/[^A-Za-z0-9+\-/]/g, ""));
    if (nameTokens.length >= 4) break;
  }
  if (nameTokens.length === 0) return null;
  const name = nameTokens.join(" ").trim();
  if (name.length < 3 || name.length > 60) return null;
  // Require at least one alphabetic token of real length.
  if (!nameTokens.some((t) => /^[A-Za-z][A-Za-z\-]{2,}$/.test(t))) return null;
  return name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function findPrescriber(text: string): string | null {
  const re = /(?:prescribed\s*by|prescriber|consultant|doctor|dr\.?)\s*[:\-]?\s*((?:Dr\.?\s*)?[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/i;
  const match = re.exec(text);
  return match ? match[1]!.trim().slice(0, 80) : null;
}

export function extractMedications(text: string): ExtractedMedication[] {
  const lines = text.split(/\n/);
  const results: ExtractedMedication[] = [];
  const seen = new Set<string>();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 220) return;
    if (!/[A-Za-z]/.test(trimmed)) return;
    if (/reference|haemoglobin|hemoglobin|leukocyte|platelet|cholesterol|creatinine|specimen|barcode|uhid/i.test(trimmed)) {
      return;
    }

    const hasForm = DOSE_FORMS.test(trimmed);
    const hasStrength = STRENGTH_RE.test(trimmed);
    const hasSchedule = /(?:1-0-1|0-0-1|1-0-0|0-1-0)|\b(?:od|bd|tds|tid|qid|hs|sos|prn)\b/i.test(trimmed);
    // Require a form prefix, or strength AND schedule, to avoid false positives.
    if (!hasForm && !(hasStrength && hasSchedule)) return;

    const name = extractDrugName(trimmed);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;

    const frequency = extractFrequency(trimmed);
    const duration = extractDuration(trimmed);
    const scheduleParts = [frequency, duration ? `for ${duration}` : null].filter(Boolean);

    const confidence = hasForm && (hasStrength || hasSchedule) ? 0.75 : hasStrength && hasSchedule ? 0.6 : 0.4;
    if (confidence < 0.4) return;

    seen.add(key);
    results.push({
      name,
      dosageText: extractStrength(trimmed),
      scheduleText: scheduleParts.length > 0 ? scheduleParts.join(", ") : null,
      prescriber: findPrescriber(text),
      confidence,
      lineNumber: idx + 1,
      rawLine: trimmed,
    });
  });

  return results;
}
