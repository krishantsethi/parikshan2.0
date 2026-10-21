import type { DocumentCategory, Locale } from "@/types/domain";
import type { LabExtraction } from "@/server/documents/extract-lab";
import {
  getAiProvider,
  sanitizeModelText,
  AiNotConfiguredError,
} from "@/server/ai/provider";
import { SUMMARY_SYSTEM_PROMPT } from "@/server/ai/prompts";

export interface SummaryResult {
  summary: string;
  kind: "ai";
  model: string;
}

/**
 * Generate an AI explanation for a document.
 * Returns null when AI is not configured (callers keep the deterministic
 * structured digest instead) or when the provider fails — the failure reason
 * is logged server-side without medical content.
 */
export async function generateDocumentExplanation(args: {
  title: string;
  category: DocumentCategory;
  text: string;
  lab: LabExtraction;
  locale: Locale;
}): Promise<SummaryResult | null> {
  const provider = getAiProvider();
  if (!provider.isConfigured()) return null;

  const structured = args.lab.results.slice(0, 60).map((r) => ({
    test: r.testName,
    value: r.valueText,
    unit: r.unit,
    referenceRange: r.refText,
    flagPerStatedRange: r.flag,
    sourceLine: r.lineNumber,
  }));

  const userContent = [
    `DOCUMENT TITLE: ${args.title}`,
    `DETECTED CATEGORY: ${args.category}`,
    `REPORT DATE (if detected): ${args.lab.reportDate.iso ?? "not detected"}`,
    `LANGUAGE: ${args.locale === "hi" ? "Hindi (keep values/units/medication names in original form)" : "English"}`,
    "",
    "MACHINE-EXTRACTED STRUCTURED VALUES (may contain errors — do not add other values):",
    JSON.stringify(structured, null, 2),
    "",
    "DOCUMENT TEXT (truncated):",
    args.text.slice(0, 12_000),
  ].join("\n");

  try {
    const result = await provider.complete(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      { temperature: 0.15, maxTokens: 1200 },
    );
    return { summary: sanitizeModelText(result.text, 9000), kind: "ai", model: result.model };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) return null;
    console.error(
      "[parikshan] AI summary generation failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}
