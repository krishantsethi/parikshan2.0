import type {
  AssistantMessage,
  Citation,
  HealthProfile,
  Locale,
  User,
} from "@/types/domain";
import type { DataStore } from "@/server/db/types";
import { createTranslator } from "@/i18n/index";
import {
  AiNotConfiguredError,
  AiRequestError,
  getAiProvider,
  sanitizeModelText,
} from "@/server/ai/provider";
import {
  ASSISTANT_SYSTEM_PROMPT,
  LOCALE_INSTRUCTION,
  assistantContextBlock,
} from "@/server/ai/prompts";

/* --------------------------------------------------------------- retrieval */

export interface RetrievedSource {
  tag: string;
  kind: "document" | "observation" | "medication";
  id: string;
  label: string;
  detail: string;
  content: string;
}

export interface AssistantContext {
  sources: RetrievedSource[];
  hasRecords: boolean;
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "what", "when", "where", "which", "who", "how",
  "why", "does", "did", "can", "could", "should", "would", "about", "with", "from", "this",
  "that", "these", "those", "have", "has", "had", "you", "your", "mine", "my", "me", "i",
  "is", "be", "been", "were", "tell", "show", "give", "list", "any", "all", "some", "there",
  "their", "them", "it", "its", "in", "on", "of", "to", "a", "an", "do", "at", "or", "if",
  "मेरे", "मेरी", "मेरा", "क्या", "है", "हैं", "और", "के", "का", "की", "में", "से", "को",
  "कौन", "कैसे", "कितना", "बताओ", "बताएं", "रिपोर्ट",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function overlapScore(questionTokens: string[], target: string): number {
  const lowered = target.toLowerCase();
  let score = 0;
  for (const token of questionTokens) {
    if (lowered.includes(token)) score += 1;
  }
  return score;
}

function daysSince(date: Date): number {
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

function recencyBonus(date: Date): number {
  const days = daysSince(date);
  if (days <= 30) return 0.6;
  if (days <= 180) return 0.3;
  return 0;
}

/**
 * Retrieval for grounding. Deliberately simple and auditable: token overlap
 * with recency weighting. Only this profile's records are ever loaded — the
 * query is scoped by userId AND profileId at the store level.
 */
export async function retrieveAssistantContext(
  store: DataStore,
  userId: string,
  profile: HealthProfile,
  question: string,
): Promise<AssistantContext> {
  const questionTokens = tokenize(question);
  const [documents, observations, medications] = await Promise.all([
    store.listDocuments({ userId, profileId: profile.id, limit: 25 }),
    store.listObservations({ userId, profileId: profile.id, limit: 300 }),
    store.listMedications({ userId, profileId: profile.id, activeOnly: true }),
  ]);

  const scoredObservations = observations
    .map((obs) => {
      const score =
        overlapScore(questionTokens, obs.testName) * 3 +
        overlapScore(questionTokens, obs.notes ?? "") * 0.5 +
        recencyBonus(obs.createdAt);
      return { obs, score };
    })
    .sort((a, b) => b.score - a.score);

  const matchedObservations = scoredObservations.filter((o) => o.score > 0.6).slice(0, 12);
  const fallbackObservations =
    matchedObservations.length > 0
      ? matchedObservations
      : scoredObservations.slice(0, 8); // recent values as ambient context

  const scoredDocs = documents.items
    .map((doc) => ({
      doc,
      score:
        overlapScore(questionTokens, doc.title) * 3 +
        overlapScore(questionTokens, doc.category.replace(/_/g, " ")) * 1.5 +
        recencyBonus(doc.createdAt),
    }))
    .sort((a, b) => b.score - a.score);

  const selectedDocs = scoredDocs.filter((d) => d.score > 0.5).slice(0, 4);
  const docsToCite = selectedDocs.length > 0 ? selectedDocs : scoredDocs.slice(0, 2);

  const sources: RetrievedSource[] = [];
  let counter = 1;
  const nextTag = () => `S${counter++}`;

  for (const { doc } of docsToCite) {
    // Load source text only for the documents we actually cite (bounded work).
    const textRecord = await store.getDocumentText(doc.id);
    const excerpt = textRecord ? textRecord.text.slice(0, 1800) : null;
    sources.push({
      tag: nextTag(),
      kind: "document",
      id: doc.id,
      label: doc.title,
      detail: `${doc.category.replace(/_/g, " ")} · uploaded ${doc.createdAt.toISOString().slice(0, 10)}`,
      content: [
        `Document: ${doc.title}`,
        `Type: ${doc.category}`,
        `Uploaded: ${doc.createdAt.toISOString().slice(0, 10)}`,
        doc.summary ? `Saved summary: ${doc.summary.slice(0, 1200)}` : null,
        excerpt ? `Extracted text excerpt:\n${excerpt}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  for (const { obs } of fallbackObservations) {
    sources.push({
      tag: nextTag(),
      kind: "observation",
      id: obs.id,
      label: `${obs.testName}: ${obs.valueText}${obs.unit ? ` ${obs.unit}` : ""}`,
      detail: [
        obs.collectedAt ? `collected ${obs.collectedAt}` : "date not recorded",
        obs.verified ? "confirmed by user" : "not yet confirmed",
        obs.documentId ? "from document" : "manually entered",
      ].join(" · "),
      content: [
        `Measurement: ${obs.testName}`,
        `Value: ${obs.valueText}${obs.unit ? ` ${obs.unit}` : ""}`,
        `Reference range as stated: ${obs.refText ?? "not stated"}`,
        `Flag computed from stated range: ${obs.flag}`,
        `Collected: ${obs.collectedAt ?? "unknown"}`,
        `Confirmed by user: ${obs.verified ? "yes" : "no"}`,
      ].join("\n"),
    });
  }

  for (const med of medications.slice(0, 15)) {
    sources.push({
      tag: nextTag(),
      kind: "medication",
      id: med.id,
      label: `Medication: ${med.name}`,
      detail: [med.dosageText, med.scheduleText].filter(Boolean).join(" · ") || "as recorded",
      content: [
        `Medication: ${med.name}`,
        `Dosage as written: ${med.dosageText ?? "not recorded"}`,
        `Schedule as written: ${med.scheduleText ?? "not recorded"}`,
        `Prescriber: ${med.prescriber ?? "not recorded"}`,
        `Active: ${med.active ? "yes" : "no"}`,
      ].join("\n"),
    });
  }

  return {
    sources,
    hasRecords: documents.total > 0 || observations.length > 0 || medications.length > 0,
  };
}

/* --------------------------------------------------------------- grounding */

export function extractCitations(answer: string, sources: RetrievedSource[]): Citation[] {
  const byTag = new Map(sources.map((s) => [s.tag, s]));
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const match of answer.matchAll(/\[(S\d+)\]/g)) {
    const tag = match[1]!;
    if (seen.has(tag)) continue;
    const source = byTag.get(tag);
    if (!source) continue; // invented tags are dropped, never displayed
    seen.add(tag);
    citations.push({
      kind: source.kind,
      id: source.id,
      label: source.label,
      detail: source.detail,
    });
  }
  return citations;
}

// NOTE: \b does not work with Devanagari, so the Hindi alternatives are
// separated from the ASCII word-boundary pattern.
const EMERGENCY_PATTERNS =
  /\b(?:chest pain|heart attack|stroke|can'?t breathe|cannot breathe|difficulty breathing|severe bleeding|unconscious|suicid|overdose|seizure|anaphyla|breathless)\b|(?:सीने में दर्द|दिल का दौरा|सांस नहीं|साँस नहीं|खून बह|बेहोश|आत्महत्या)/i;

export function needsEmergencyGuidance(question: string): boolean {
  return EMERGENCY_PATTERNS.test(question);
}

/** Factual, record-grounded answer used when no AI provider is configured. */
export function buildDeterministicAnswer(
  context: AssistantContext,
  sources: RetrievedSource[],
  locale: Locale,
): string {
  const t = createTranslator(locale);
  if (!context.hasRecords) {
    return `${t("assistant.noContext")}\n\n${t("common.notMedicalAdvice")}`;
  }
  const lines = sources.slice(0, 10).map((source) => {
    if (source.kind === "observation") {
      return `- ${source.label} (${source.detail}) [${source.tag}]`;
    }
    if (source.kind === "medication") {
      return `- ${source.label} — ${source.detail} [${source.tag}]`;
    }
    return `- ${source.label} — ${source.detail} [${source.tag}]`;
  });
  return [
    t("assistant.notConfigured"),
    "",
    ...lines,
    "",
    t("common.notMedicalAdvice"),
  ].join("\n");
}

/* ------------------------------------------------------------------ answer */

export interface AssistantAnswer {
  content: string;
  citations: Citation[];
  grounded: boolean;
  provider: string | null;
  error: string | null;
}

export async function answerHealthQuestion(args: {
  store: DataStore;
  user: User;
  profile: HealthProfile;
  question: string;
  locale: Locale;
  history: AssistantMessage[];
}): Promise<AssistantAnswer> {
  const question = args.question.trim().slice(0, 2000);
  const t = createTranslator(args.locale);
  if (question.length < 2) {
    return {
      content: t("assistant.placeholder"),
      citations: [],
      grounded: false,
      provider: null,
      error: "empty_question",
    };
  }

  const context = await retrieveAssistantContext(args.store, args.user.id, args.profile, question);

  if (!context.hasRecords) {
    return {
      content: `${t("assistant.noContext")}\n\n${t("common.notMedicalAdvice")}`,
      citations: [],
      grounded: false,
      provider: null,
      error: null,
    };
  }

  const emergencyPrefix = needsEmergencyGuidance(question)
    ? args.locale === "hi"
      ? "⚠️ आपके प्रश्न में आपातकालीन लक्षण हो सकते हैं। कृपया तुरंत आपातकालीन सेवाओं (भारत में 112) या निकटतम आपातकालीन विभाग से संपर्क करें।\n\n"
      : "⚠️ Your message may describe an emergency. Please contact emergency services (112 in India) or your nearest emergency department immediately.\n\n"
    : "";

  const provider = getAiProvider();
  if (!provider.isConfigured()) {
    const content = buildDeterministicAnswer(context, context.sources, args.locale);
    return {
      content: emergencyPrefix + content,
      citations: context.sources.slice(0, 10).map((s) => ({
        kind: s.kind,
        id: s.id,
        label: s.label,
        detail: s.detail,
      })),
      grounded: true,
      provider: null,
      error: null,
    };
  }

  const sourceBlocks = context.sources.map((s) => `[${s.tag}] ${s.content}`).join("\n\n");
  const history = args.history
    .filter((m) => m.content.trim().length > 0)
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }) as const);

  try {
    const result = await provider.complete(
      [
        {
          role: "system",
          content: `${ASSISTANT_SYSTEM_PROMPT}\n\n${LOCALE_INSTRUCTION[args.locale]}`,
        },
        {
          role: "user",
          content: `${assistantContextBlock(sourceBlocks, args.profile.name)}\n\nQUESTION:\n${question}`,
        },
        ...history,
      ],
      { temperature: 0.2 },
    );
    const content = sanitizeModelText(result.text, 9000);
    return {
      content: emergencyPrefix + content,
      citations: extractCitations(content, context.sources),
      grounded: true,
      provider: result.model,
      error: null,
    };
  } catch (error) {
    const reason =
      error instanceof AiRequestError
        ? error.message
        : error instanceof AiNotConfiguredError
          ? "AI provider is not configured."
          : "AI request failed.";
    console.error("[parikshan] assistant AI failure:", reason);
    const fallback = buildDeterministicAnswer(context, context.sources, args.locale);
    return {
      content: `${emergencyPrefix}${t("assistant.aiError")}\n\n${fallback}`,
      citations: context.sources.slice(0, 10).map((s) => ({
        kind: s.kind,
        id: s.id,
        label: s.label,
        detail: s.detail,
      })),
      grounded: true,
      provider: null,
      error: "ai_request_failed",
    };
  }
}
