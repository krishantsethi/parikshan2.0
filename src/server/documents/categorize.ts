import type { DocumentCategory } from "@/types/domain";
import { singleLine } from "@/server/documents/text-normalize";

/**
 * Keyword-scoring document classifier.
 * Deterministic and explainable: every hit contributes a weighted score and
 * the winner's margin becomes the confidence. No model required — this keeps
 * classification auditable, which matters for medical records.
 */

interface CategoryRule {
  category: DocumentCategory;
  keywords: Array<[pattern: RegExp, weight: number]>;
}

const RULES: CategoryRule[] = [
  {
    category: "lab_report",
    keywords: [
      [/\breference range\b/i, 3],
      [/\b(?:normal|reference)\s*(?:range|values|interval)\b/i, 3],
      [/\b(?:mg\/dl|g\/dl|mmol\/l|ui ?u?\/ml|iu\/ml|ng\/ml|mcg\/dl|meq\/l|u\/l|fl\b|pg\/ml|x10\^?3\/ul|\/cumm|cells\/cumm)\b/i, 3],
      [/\bcomplete blood count\b|\bcbc\b/i, 3],
      [/\blipid profile\b|\bliver function\b|\bkidney function\b|\bkft\b|\blft\b|\bhba1c\b|\bthyroid profile\b/i, 3],
      [/\b(?:haemoglobin|hemoglobin|leukocyte|platelet count|creatinine|urea|bilirubin|cholesterol|triglycerides|glucose)\b/i, 2],
      [/\b(?:pathology|diagnostic(?:s)?|laboratory|clinical lab)\b/i, 2],
      [/\bspecimen\b|\bassay\b|\bmethod ?:\b/i, 1],
      [/\bresult\b.*\bunit\b/i, 2],
    ],
  },
  {
    category: "prescription",
    keywords: [
      [/\b(?:rx|℞)\b/i, 4],
      [/\bprescription\b/i, 4],
      [/\b(?:tab\.?|cap\.?|syp\.?|susp\.?|inj\.?)\s+[a-z]/i, 3],
      [/\b(?:1-0-1|0-0-1|1-0-0|0-1-0|hs\b|od\b|bd\b|bid\b|tds\b|tid\b|qid\b|sos\b|prn\b)\b/i, 3],
      [/\b(?:once|twice|thrice|three times) (?:a |per )?(?:day|daily|night|morning|evening)\b/i, 3],
      [/\b(?:take|directed by|as advised)\b/i, 1],
      [/\b(?:medical council|reg\.? ?no|registration)\b/i, 2],
      [/\bdr\.?\s+[a-z]/i, 1],
    ],
  },
  {
    category: "discharge_summary",
    keywords: [
      [/\bdischarge summary\b/i, 5],
      [/\b(?:date of admission|date of discharge|admitted on|discharged on)\b/i, 4],
      [/\b(?:hospital stay|procedure(?:s)? done|course in hospital|diagnosis on discharge|treatment given)\b/i, 3],
      [/\b(?:advice on discharge|follow[- ]up)\b/i, 2],
    ],
  },
  {
    category: "imaging_report",
    keywords: [
      [/\b(?:ultrasound|sonography|usg|mri|ct scan|c\.t\.|x[- ]?ray|radiograph|pet scan|echocardiograph|mammograph)\b/i, 4],
      [/\bimpression ?:/i, 3],
      [/\b(?:radiologist|findings)\s*:/i, 3],
      [/\b(?:contrast|view)\s*:/i, 1],
    ],
  },
  {
    category: "vaccination",
    keywords: [
      [/\b(?:vaccin(?:e|ation)|immuniz(?:e|ation)|inoculat)/i, 4],
      [/\b(?:batch (?:no|number)|lot (?:no|number))\b/i, 2],
      [/\b(?:dose [123]|first dose|second dose|booster)\b/i, 3],
      [/\b(?:opv|ipv|tt\b|td\b|mmr|bcg|hepatitis b|dpt|pentavalent)\b/i, 3],
    ],
  },
  {
    category: "invoice",
    keywords: [
      [/\b(?:invoice|bill(?:ing)? (?:no|number)|receipt)\b/i, 4],
      [/\b(?:total amount|amount payable|grand total|net payable)\b/i, 4],
      [/\b(?:gst(?:in)?|cgst|sgst|vat|tax invoice)\b/i, 3],
      [/\b(?:charges|tariff|particulars)\b/i, 1],
      [/\brupees\b|\binr\b|₹/i, 2],
    ],
  },
  {
    category: "insurance",
    keywords: [
      [/\b(?:policy (?:no|number)|claim (?:no|id)|insured|insurer|coverage|sum insured|tpa)\b/i, 4],
      [/\b(?:cashless|pre[- ]?authorization|health (?:insurance|card))\b/i, 3],
      [/\b(?:member id|beneficiary)\b/i, 2],
    ],
  },
];

export interface Categorization {
  category: DocumentCategory;
  confidence: number;
  scores: Partial<Record<DocumentCategory, number>>;
}

export function categorizeDocument(text: string): Categorization {
  const haystack = singleLine(text);
  const scores: Partial<Record<DocumentCategory, number>> = {};

  for (const rule of RULES) {
    let score = 0;
    for (const [pattern, weight] of rule.keywords) {
      if (pattern.test(haystack)) score += weight;
    }
    if (score > 0) scores[rule.category] = score;
  }

  const ranked = Object.entries(scores).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const [topCategory, topScore] = ranked[0] ?? [null, 0];
  const runnerUp = ranked[1]?.[1] ?? 0;

  if (!topCategory || (topScore ?? 0) < 3) {
    return { category: "other", confidence: 0.3, scores };
  }
  // Confidence: absolute strength, damped when the runner-up is close.
  const margin = (topScore ?? 0) - runnerUp;
  const confidence = Math.min(0.95, 0.45 + 0.06 * (topScore ?? 0) + 0.05 * margin);
  return { category: topCategory as DocumentCategory, confidence: Number(confidence.toFixed(2)), scores };
}
