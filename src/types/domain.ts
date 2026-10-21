/**
 * Core domain types for PARIKSHAN.
 * These shapes are shared by the data-store drivers (memory + Postgres),
 * the service layer, API routes, and the UI.
 */

export type Locale = "en" | "hi";
export type Theme = "dark" | "light";

/* ------------------------------------------------------------------ users */

export interface User {
  id: string;
  email: string;
  name: string;
  /** scrypt hash — never exposed outside the server layer. */
  passwordHash: string;
  locale: Locale;
  theme: Theme;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  /** SHA-256 hash of the opaque cookie token. */
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/* --------------------------------------------------------------- profiles */

export type ProfileRelation =
  | "self"
  | "spouse"
  | "child"
  | "parent"
  | "sibling"
  | "grandparent"
  | "other";

export type BiologicalSex = "male" | "female" | "other";

export interface HealthProfile {
  id: string;
  ownerId: string;
  name: string;
  relation: ProfileRelation;
  dob: string | null; // ISO date
  sex: BiologicalSex | null;
  bloodGroup: string | null;
  notes: string | null;
  /**
   * Set when the profile belongs to someone other than the account holder.
   * Records that the owner affirmed they are authorized to manage this data.
   */
  authorizationAffirmedAt: Date | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------- documents */

export type DocumentStatus = "processing" | "ready" | "needs_review" | "failed";

export type DocumentCategory =
  | "lab_report"
  | "prescription"
  | "discharge_summary"
  | "imaging_report"
  | "vaccination"
  | "invoice"
  | "insurance"
  | "other";

export interface MedicalDocument {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  originalFilename: string;
  mime: string;
  sizeBytes: number;
  category: DocumentCategory;
  status: DocumentStatus;
  errorMessage: string | null;
  ocrEngine: string | null;
  /** OCR/extraction confidence 0..1 when the engine reports one. */
  textConfidence: number | null;
  pages: number | null;
  textLength: number;
  /** Plain-language summary (AI when configured, else structured digest). */
  summary: string | null;
  summaryKind: "ai" | "structured_digest" | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredFile {
  documentId: string;
  mime: string;
  bytes: Uint8Array;
  createdAt: Date;
}

export interface DocumentTextRecord {
  documentId: string;
  text: string;
  engine: "pdf_text" | "ocr_tesseract" | "manual";
  confidence: number | null;
  createdAt: Date;
}

/* ----------------------------------------------------------- observations */

export type ObservationFlag = "low" | "normal" | "high" | "unknown";
export type ObservationSource = "document_extraction" | "manual" | "reviewed";

export interface Observation {
  id: string;
  userId: string;
  profileId: string;
  documentId: string | null;
  testName: string;
  /** Exactly as written in the source — never silently converted. */
  valueText: string;
  valueNumeric: number | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  /** Reference range as printed by the source lab. */
  refText: string | null;
  /** Flag computed ONLY from the source's own stated range. */
  flag: ObservationFlag;
  collectedAt: string | null; // ISO date
  source: ObservationSource;
  confidence: number | null;
  /** True once a human reviewed/corrected the extraction. */
  verified: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ------------------------------------------------------------ medications */

export interface Medication {
  id: string;
  userId: string;
  profileId: string;
  name: string;
  dosageText: string | null; // as written
  scheduleText: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  prescriber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InteractionSeverity = "major" | "moderate" | "minor" | "unknown";
export type InteractionSourceKind = "curated" | "openfda" | "none";

export interface InteractionFinding {
  drugA: string;
  drugB: string;
  severity: InteractionSeverity;
  source: InteractionSourceKind;
  description: string;
  evidenceNote: string | null;
  retrievedAt: string | null;
}

export interface InteractionCheck {
  id: string;
  userId: string;
  profileId: string;
  medicationIds: string[];
  medicationNames: string[];
  findings: InteractionFinding[];
  sourcesUsed: InteractionSourceKind[];
  status: "complete" | "partial" | "unavailable";
  disclaimer: string;
  createdAt: Date;
}

/* ------------------------------------------------------------- assistant */

export interface Citation {
  kind: "document" | "observation" | "medication";
  id: string;
  label: string;
  detail: string | null;
}

export interface Conversation {
  id: string;
  userId: string;
  profileId: string | null;
  title: string;
  locale: Locale;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssistantMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  /** True when the answer was grounded in retrieved user records. */
  grounded: boolean;
  provider: string | null;
  error: string | null;
  createdAt: Date;
}

/* -------------------------------------------------------------- feedback */

export interface Feedback {
  id: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  rating: number | null; // 1..5
  category: string;
  message: string;
  createdAt: Date;
}

/* ----------------------------------------------------------------- audit */

export interface AuditEvent {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

/* ----------------------------------------------------------------- stats */

export interface DashboardStats {
  documentCount: number;
  observationCount: number;
  medicationCount: number;
  conversationCount: number;
  recentDocuments: MedicalDocument[];
  recentActivity: AuditEvent[];
}
