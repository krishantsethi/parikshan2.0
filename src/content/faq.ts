export interface FaqEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords?: string[];
}

export const FAQ_CATEGORIES = [
  "Getting started",
  "Documents & OCR",
  "AI & privacy",
  "Medications",
  "Account & data",
] as const;

/**
 * Answers describe what this codebase actually does. They are product
 * explanations — not medical advice.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "what-is-parikshan",
    category: "Getting started",
    question: "What is PARIKSHAN?",
    answer:
      "PARIKSHAN is a personal health-intelligence workspace. It organizes your medical documents, extracts structured laboratory values for you to review, explains reports in plain language, tracks confirmed measurements over time, keeps a medication list, and answers questions grounded in your own records. It is not a medical device, does not diagnose, and does not replace a clinician.",
    keywords: ["about", "what", "platform"],
  },
  {
    id: "is-it-free",
    category: "Getting started",
    question: "Is PARIKSHAN free to use?",
    answer:
      "This deployment is an independent engineering project, not a commercial service. There are no paid tiers, subscriptions, or billing in the codebase. Running it yourself requires hosting and, optionally, an AI provider key and a Postgres database.",
    keywords: ["price", "cost", "free", "subscription"],
  },
  {
    id: "demo-data",
    category: "Getting started",
    question: "Do I need to upload real medical records to try it?",
    answer:
      "No. The demo workspace is seeded with fictional records that are explicitly prefixed “SAMPLE —”. Every sample value is labeled, and you can explore document review, trends, medications, and the assistant without uploading anything personal.",
    keywords: ["demo", "sample", "try", "test"],
  },
  {
    id: "diagnosis",
    category: "Getting started",
    question: "Can PARIKSHAN tell me if something is wrong with me?",
    answer:
      "No, and it is designed not to try. It can tell you what a document states, which values fall outside the range printed on that report, and what terminology means. Interpretation of results — especially combinations of findings, symptoms, and history — belongs to a qualified clinician.",
    keywords: ["diagnose", "diagnosis", "risk", "doctor"],
  },
  {
    id: "file-types",
    category: "Documents & OCR",
    question: "Which file types can I upload?",
    answer:
      "PDF, PNG, JPEG, and WebP. Files are validated by inspecting their actual bytes, not just the extension. The default limit is 10 MB per file (configurable through UPLOAD_MAX_MB, up to 25 MB). Password-protected PDFs and unsupported formats are rejected with a specific error.",
    keywords: ["upload", "pdf", "png", "jpeg", "webp", "size", "limit"],
  },
  {
    id: "scanned-pdf",
    category: "Documents & OCR",
    question: "Why can't PARIKSHAN read my scanned PDF?",
    answer:
      "If a PDF contains only page images and no text layer, the server reports that no selectable text was found instead of pretending OCR succeeded. In this deployment PDF pages are not rasterised server-side, so the practical workaround is to upload photos or screenshots of the pages (PNG/JPEG), which go through OCR.",
    keywords: ["scan", "ocr", "pdf", "image", "text layer"],
  },
  {
    id: "ocr-accuracy",
    category: "Documents & OCR",
    question: "How accurate is the OCR?",
    answer:
      "Image OCR runs locally through tesseract.js. Accuracy depends heavily on image quality: lighting, rotation, resolution, and handwriting all matter. The engine's confidence is shown, low-confidence documents are flagged for careful review, and no extracted value is used in a trend until you confirm it.",
    keywords: ["ocr", "accuracy", "confidence", "tesseract"],
  },
  {
    id: "needs-review",
    category: "Documents & OCR",
    question: "What does “Needs review” mean?",
    answer:
      "Processing finished and structured values were extracted, but a human has not confirmed them yet. On the document page you can correct any value, unit, reference range, or date, remove rows that were misread, and confirm the rest. Only confirmed values appear in trends by default.",
    keywords: ["review", "confirm", "status", "verify"],
  },
  {
    id: "reference-ranges",
    category: "Documents & OCR",
    question: "Why do reference ranges differ between labs?",
    answer:
      "Laboratories use different assays, units, analysers, and population-derived ranges, so the same test can have different limits at two labs. PARIKSHAN never substitutes its own range: abnormality flags are computed only from the range printed on that specific document. Cross-lab comparisons are therefore shown with their source.",
    keywords: ["reference", "range", "normal", "lab", "units"],
  },
  {
    id: "unit-conversion",
    category: "Documents & OCR",
    question: "Does PARIKSHAN convert units automatically?",
    answer:
      "Not for medical measurements. Values are preserved exactly as printed with their original unit. When building a trend, entries with a different unit are excluded and the interface explains why, rather than silently converting and risking a clinically meaningful error.",
    keywords: ["unit", "convert", "mg/dl", "mmol"],
  },
  {
    id: "ai-training",
    category: "AI & privacy",
    question: "Are my records used to train AI models?",
    answer:
      "No. PARIKSHAN does not run a training pipeline. When an AI provider is configured, only the excerpts needed to answer your question are sent to that provider's API for inference. No document text is stored in logs, and no records are contributed to model training by this application.",
    keywords: ["training", "privacy", "ai", "model"],
  },
  {
    id: "ai-model",
    category: "AI & privacy",
    question: "Which AI model does it use?",
    answer:
      "Any OpenAI-compatible chat-completions endpoint, configured by the operator (OPENAI_BASE_URL, AI_MODEL, OPENAI_API_KEY). If no key is configured, the assistant still works: it returns a factual digest of your retrieved records and clearly states that AI is not configured.",
    keywords: ["model", "openai", "gpt", "llm", "provider"],
  },
  {
    id: "citations",
    category: "AI & privacy",
    question: "How do I know the assistant isn't making things up?",
    answer:
      "The assistant answers only from retrieved records and is instructed to cite them with tags such as [S1]. The UI maps those tags to the exact document or measurement. Tags that do not correspond to a retrieved source are dropped rather than displayed, and if the information is not in your records the assistant says so.",
    keywords: ["citation", "source", "grounded", "hallucination"],
  },
  {
    id: "hindi",
    category: "AI & privacy",
    question: "Can I use PARIKSHAN in Hindi?",
    answer:
      "Yes. The interface, validation messages, dashboard, and assistant can operate in Hindi. Medical test names, medication names, numerical values, and units remain in their original form so nothing is lost in translation.",
    keywords: ["hindi", "language", "भाषा", "हिन्दी"],
  },
  {
    id: "interaction-database",
    category: "Medications",
    question: "How does the interaction review work?",
    answer:
      "It combines a curated educational dataset of well-known interactions with optional live OpenFDA label lookups. Each finding is labeled with its source. The curated set is deliberately small and not exhaustive, OpenFDA quotations are not severity-graded, and every review tells you to confirm with a pharmacist.",
    keywords: ["interaction", "drug", "safety", "openfda"],
  },
  {
    id: "no-interaction-safe",
    category: "Medications",
    question: "Does “no interaction found” mean my medicines are safe together?",
    answer:
      "No. Absence of a finding in a limited dataset is not evidence of safety. Many interactions depend on dose, timing, genetics, kidney and liver function, and other conditions. Always have your full medication list reviewed by a pharmacist or your prescriber.",
    keywords: ["safe", "no interaction", "combination"],
  },
  {
    id: "med-reminders",
    category: "Medications",
    question: "Does PARIKSHAN send medication reminders?",
    answer:
      "Not yet. Schedules you record are displayed as information, not alarms, and the interface says so explicitly. Do not rely on this platform for time-critical dosing reminders.",
    keywords: ["reminder", "alarm", "schedule", "notification"],
  },
  {
    id: "family-profiles",
    category: "Account & data",
    question: "Can I manage health records for my family?",
    answer:
      "Yes. Each family member gets an isolated profile with their own documents, measurements, medications, and assistant context. Creating a profile for someone other than yourself requires an explicit confirmation that you are authorized to manage their records.",
    keywords: ["family", "children", "parents", "profiles", "consent"],
  },
  {
    id: "export",
    category: "Account & data",
    question: "Can I export my data?",
    answer:
      "Yes. Settings provides a complete JSON export (profiles, documents, extracted text, measurements, medications, conversations, and audit events). A per-profile FHIR-shaped JSON bundle is also available. Original files above 1.5 MB are excluded from the JSON and can be downloaded individually.",
    keywords: ["export", "download", "portability", "fhir"],
  },
  {
    id: "delete-account",
    category: "Account & data",
    question: "How do I delete my account and data?",
    answer:
      "Settings → Danger zone → Delete account. You must type DELETE to confirm. The operation removes your account and cascades to profiles, documents (including stored files and extracted text), measurements, medications, conversations, and audit events. It cannot be undone.",
    keywords: ["delete", "account", "erase", "gdpr"],
  },
  {
    id: "compliance",
    category: "Account & data",
    question: "Is PARIKSHAN HIPAA or GDPR certified?",
    answer:
      "No. PARIKSHAN makes no HIPAA, GDPR, ISO 27001, ABDM, or FHIR-compliance claims. It implements privacy-oriented engineering practices and documents them, but operating it for real patient data requires independent legal and security review, plus organizational controls that software alone cannot provide.",
    keywords: ["hipaa", "gdpr", "compliance", "certification"],
  },
  {
    id: "where-data-lives",
    category: "Account & data",
    question: "Where is my data stored?",
    answer:
      "On this deployment, if a Postgres database is configured, everything is stored there (files are stored as bytea records inside the database). If no database is configured, the app runs in a clearly-labeled demo mode where data lives in server memory and resets with the instance.",
    keywords: ["storage", "database", "postgres", "where"],
  },
  {
    id: "abha",
    category: "Account & data",
    question: "Is there ABHA / ABDM integration?",
    answer:
      "Not yet. The codebase defines an integration boundary and documents the credentials that would be required, but no live ABDM requests are made and no ABHA credentials are collected. Any future integration would require organizational onboarding and a security review.",
    keywords: ["abha", "abdm", "india", "interoperability"],
  },
  {
    id: "security",
    category: "Account & data",
    question: "How are my password and session protected?",
    answer:
      "Passwords are hashed with scrypt using per-user salts. Sessions are 256-bit random tokens stored as SHA-256 hashes with server-side expiry, delivered in httpOnly, SameSite=Lax cookies that are Secure in production. All document access is ownership-checked on the server.",
    keywords: ["password", "security", "session", "cookie"],
  },
];
