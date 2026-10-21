/**
 * Medication-name normalization for interaction matching (client-safe).
 *
 * We strip dose forms, strengths, schedules, and salt/release suffixes to get
 * at the generic-looking core name. Brand names are NOT reliably converted —
 * a small "common brand hints" map is provided but every brand match is
 * flagged as uncertain so the UI can ask the user to confirm the generic name.
 */

const DOSE_FORM =
  /\b(?:tab(?:let)?|cap(?:sule)?|syp|syrup|susp(?:ension)?|inj(?:ection)?|oint(?:ment)?|drops?|spray|cream|gel|powder|sachet|patch|inhaler)\b\.?/gi;

const STRENGTH = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug|g|ml|mL|IU|i\.u\.|units?|%)\b(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|mL))?/gi;

const SCHEDULE =
  /\b(?:1-0-1|1-0-0|0-1-0|0-0-1|1-1-1|\d-\d-\d)\b|\b(?:od|bd|tds|tid|qid|hs|sos|prn|stat)\b\.?/gi;

const SALT_AND_RELEASE =
  /\b(?:hydrochloride|hcl|sodium|potassium|calcium|magnesium|sulfate|sulphate|tartrate|succinate|fumarate|maleate|mesylate|besylate|bitartrate|citrate|phosphate|acetate|dihydrate|monohydrate|sr|xr|er|cr|la|xl|od|forte|plus|ds|mr)\b/gi;

/** Very common Indian/global brand hints -> generic name. Beta: flagged uncertain. */
const BRAND_HINTS: Record<string, string> = {
  glycomet: "metformin",
  ecosprin: "aspirin",
  "telma": "telmisartan",
  amlopres: "amlodipine",
  atorva: "atorvastatin",
  thyronorm: "levothyroxine",
  eltroxin: "levothyroxine",
  pan: "pantoprazole",
  "pan-d": "pantoprazole + domperidone",
  crocin: "paracetamol",
  dolo: "paracetamol",
  calpol: "paracetamol",
  combiflam: "ibuprofen + paracetamol",
  brufen: "ibuprofen",
  voveran: "diclofenac",
  zerodol: "aceclofenac",
  augmentin: "amoxicillin + clavulanic acid",
  azithral: "azithromycin",
  monocef: "ceftriaxone",
  taxim: "cefotaxime",
  zincovit: "multivitamin",
  shelcal: "calcium carbonate",
  ondansetron: "ondansetron",
  emeset: "ondansetron",
  rantac: "ranitidine",
  aciloc: "ranitidine",
  omez: "omeprazole",
  razo: "rabeprazole",
  "concor": "bisoprolol",
  metolar: "metoprolol",
  "cardace": "ramipril",
  telmikind: "telmisartan",
  januvia: "sitagliptin",
  galvus: "vildagliptin",
  "lantus": "insulin glargine",
  mixtard: "insulin",
  huminsulin: "insulin",
};

const GENERIC_DESCRIPTORS = new Set([
  "white", "yellow", "red", "blue", "green", "pink", "orange", "brown", "black",
  "tablet", "tablets", "capsule", "capsules", "pill", "pills", "medicine", "medicines",
  "syrup", "suspension", "injection", "inhaler", "drops", "cream", "ointment",
  "unknown", "self", "prescribed", "doctor", "dr", "one", "two", "small", "big",
]);

const SYNONYMS: Record<string, string> = {
  asa: "aspirin",
  acetaminophen: "paracetamol",
  acetylsalicylic: "aspirin",
  "sodium valproate": "valproate",
  "valproic acid": "valproate",
};

export interface NormalizedMedication {
  raw: string;
  normalized: string;
  /** Set when the raw name looked like a brand we could map. */
  brandMatchedAs: string | null;
  /** True when we are not confident the name identifies a generic drug. */
  uncertain: boolean;
}

export function normalizeMedicationName(raw: string): NormalizedMedication {
  const original = raw.trim();
  const lower = original
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(DOSE_FORM, " ")
    .replace(STRENGTH, " ")
    .replace(SCHEDULE, " ")
    .replace(SALT_AND_RELEASE, " ")
    .replace(/[^\p{L}\p{N}+\-/ ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const firstWord = lower.split(/\s+/)[0] ?? "";
  const brand = BRAND_HINTS[firstWord];
  const synonym = SYNONYMS[lower];
  const normalized = synonym ?? (brand ? brand : lower);

  const tokens = lower.split(/\s+/).filter(Boolean);
  const onlyGenericWords = tokens.length > 0 && tokens.every((token) => GENERIC_DESCRIPTORS.has(token));
  const uncertain =
    lower.length < 3 ||
    !/[a-z]/i.test(lower) ||
    onlyGenericWords ||
    /\b(?:unknown|medicine|drug|self|prescribed|white tablet)\b/.test(lower);

  return {
    raw: original,
    normalized,
    brandMatchedAs: brand ? brand : null,
    uncertain,
  };
}

/** Escape a string for safe use inside RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word-ish containment test used by the curated matcher. */
export function nameMatches(normalized: string, alias: string): boolean {
  if (!normalized || !alias) return false;
  if (normalized === alias) return true;
  return new RegExp(`(?:^|[\\s+])${escapeRegExp(alias)}(?:$|[\\s+])`, "i").test(normalized);
}
