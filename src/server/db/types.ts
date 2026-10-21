import type {
  AssistantMessage,
  AuditEvent,
  Conversation,
  DashboardStats,
  DocumentCategory,
  DocumentStatus,
  DocumentTextRecord,
  Feedback,
  HealthProfile,
  InteractionCheck,
  MedicalDocument,
  Medication,
  Observation,
  ObservationSource,
  PasswordResetToken,
  Session,
  StoredFile,
  User,
} from "@/types/domain";

/* ------------------------------------------------------------------ inputs */

export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
  locale?: User["locale"];
  theme?: User["theme"];
}

export interface UserPatch {
  name?: string;
  email?: string;
  passwordHash?: string;
  locale?: User["locale"];
  theme?: User["theme"];
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
}

export interface NewProfile {
  ownerId: string;
  name: string;
  relation: HealthProfile["relation"];
  dob?: string | null;
  sex?: HealthProfile["sex"];
  bloodGroup?: string | null;
  notes?: string | null;
  authorizationAffirmedAt?: Date | null;
  isPrimary?: boolean;
}

export interface ProfilePatch {
  name?: string;
  relation?: HealthProfile["relation"];
  dob?: string | null;
  sex?: HealthProfile["sex"];
  bloodGroup?: string | null;
  notes?: string | null;
  authorizationAffirmedAt?: Date | null;
  isPrimary?: boolean;
}

export interface NewDocument {
  userId: string;
  profileId: string;
  title: string;
  originalFilename: string;
  mime: string;
  sizeBytes: number;
  category?: DocumentCategory;
  status?: DocumentStatus;
}

export interface DocumentPatch {
  title?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  errorMessage?: string | null;
  ocrEngine?: string | null;
  textConfidence?: number | null;
  pages?: number | null;
  textLength?: number;
  summary?: string | null;
  summaryKind?: MedicalDocument["summaryKind"];
}

export interface NewObservation {
  userId: string;
  profileId: string;
  documentId?: string | null;
  testName: string;
  valueText: string;
  valueNumeric?: number | null;
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
  refText?: string | null;
  flag?: Observation["flag"];
  collectedAt?: string | null;
  source?: ObservationSource;
  confidence?: number | null;
  verified?: boolean;
  notes?: string | null;
}

export interface ObservationPatch {
  testName?: string;
  valueText?: string;
  valueNumeric?: number | null;
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
  refText?: string | null;
  flag?: Observation["flag"];
  collectedAt?: string | null;
  verified?: boolean;
  notes?: string | null;
}

export interface ListObservationsOptions {
  userId: string;
  profileId?: string;
  testName?: string;
  documentId?: string;
  verifiedOnly?: boolean;
  limit?: number;
}

export interface NewMedication {
  userId: string;
  profileId: string;
  name: string;
  dosageText?: string | null;
  scheduleText?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  active?: boolean;
  prescriber?: string | null;
  notes?: string | null;
}

export type MedicationPatch = Partial<Omit<NewMedication, "userId" | "profileId">>;

export interface NewInteractionCheck {
  userId: string;
  profileId: string;
  medicationIds: string[];
  medicationNames: string[];
  findings: InteractionCheck["findings"];
  sourcesUsed: InteractionCheck["sourcesUsed"];
  status: InteractionCheck["status"];
  disclaimer: string;
}

export interface NewConversation {
  userId: string;
  profileId?: string | null;
  title: string;
  locale: Conversation["locale"];
}

export interface NewMessage {
  conversationId: string;
  role: AssistantMessage["role"];
  content: string;
  citations?: AssistantMessage["citations"];
  grounded?: boolean;
  provider?: string | null;
  error?: string | null;
}

export interface NewFeedback {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  rating?: number | null;
  category: string;
  message: string;
}

export interface NewAuditEvent {
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ListDocumentsOptions {
  userId: string;
  profileId?: string;
  search?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  sort?: "newest" | "oldest" | "name";
  limit?: number;
  offset?: number;
}

/* ---------------------------------------------------------------- interface */

/**
 * The persistence contract. Two drivers implement it:
 *  - `postgres` — production path (Supabase/Neon/any Postgres 14+), with SQL
 *    migrations in `db/migrations`.
 *  - `memory`   — clearly-labeled demo driver; volatile by design.
 *
 * Every method that reads or writes user data takes an explicit `userId` /
 * ownership-bearing entity id; the service layer enforces ownership before
 * and after calls (never trust the client).
 */
export interface DataStore {
  readonly kind: "memory" | "postgres";
  /** One-time initialization (migrations check / demo seeding). */
  init(): Promise<void>;

  /* users */
  createUser(input: NewUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, patch: UserPatch): Promise<User | null>;
  deleteUser(id: string): Promise<void>;

  /* sessions */
  createSession(input: NewSession): Promise<Session>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteSession(id: string): Promise<void>;
  deleteSessionsForUser(userId: string): Promise<void>;
  deleteExpiredSessions(): Promise<number>;

  /* password resets */
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken>;
  getValidPasswordResetToken(tokenHash: string, now?: Date): Promise<PasswordResetToken | null>;
  consumePasswordResetToken(id: string): Promise<void>;

  /* profiles */
  listProfiles(ownerId: string): Promise<HealthProfile[]>;
  getProfile(id: string): Promise<HealthProfile | null>;
  createProfile(input: NewProfile): Promise<HealthProfile>;
  updateProfile(id: string, patch: ProfilePatch): Promise<HealthProfile | null>;
  deleteProfile(id: string): Promise<void>;

  /* documents */
  listDocuments(options: ListDocumentsOptions): Promise<{ items: MedicalDocument[]; total: number }>;
  getDocument(id: string): Promise<MedicalDocument | null>;
  createDocument(input: NewDocument): Promise<MedicalDocument>;
  updateDocument(id: string, patch: DocumentPatch): Promise<MedicalDocument | null>;
  deleteDocument(id: string): Promise<void>;

  /* document files & text */
  saveFile(documentId: string, mime: string, bytes: Uint8Array): Promise<void>;
  getFile(documentId: string): Promise<StoredFile | null>;
  deleteFile(documentId: string): Promise<void>;
  saveDocumentText(record: Omit<DocumentTextRecord, "createdAt">): Promise<void>;
  getDocumentText(documentId: string): Promise<DocumentTextRecord | null>;

  /* observations */
  listObservations(options: ListObservationsOptions): Promise<Observation[]>;
  getObservation(id: string): Promise<Observation | null>;
  createObservation(input: NewObservation): Promise<Observation>;
  updateObservation(id: string, patch: ObservationPatch): Promise<Observation | null>;
  /** Replaces all extractions attached to a document (review → confirm flow). */
  replaceDocumentObservations(documentId: string, observations: NewObservation[]): Promise<Observation[]>;
  deleteObservation(id: string): Promise<void>;
  listTestNames(userId: string, profileId: string): Promise<string[]>;

  /* medications */
  listMedications(options: { userId: string; profileId?: string; activeOnly?: boolean }): Promise<Medication[]>;
  getMedication(id: string): Promise<Medication | null>;
  createMedication(input: NewMedication): Promise<Medication>;
  updateMedication(id: string, patch: MedicationPatch): Promise<Medication | null>;
  deleteMedication(id: string): Promise<void>;

  /* interaction checks */
  createInteractionCheck(input: NewInteractionCheck): Promise<InteractionCheck>;
  listInteractionChecks(userId: string, profileId?: string, limit?: number): Promise<InteractionCheck[]>;

  /* assistant */
  listConversations(userId: string, profileId?: string | null): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(input: NewConversation): Promise<Conversation>;
  updateConversation(id: string, patch: { title?: string; profileId?: string | null }): Promise<Conversation | null>;
  deleteConversation(id: string): Promise<void>;
  listMessages(conversationId: string, limit?: number): Promise<AssistantMessage[]>;
  createMessage(input: NewMessage): Promise<AssistantMessage>;

  /* feedback */
  createFeedback(input: NewFeedback): Promise<Feedback>;

  /* audit */
  logAudit(input: NewAuditEvent): Promise<void>;
  listAudit(userId: string, limit?: number): Promise<AuditEvent[]>;

  /* aggregate views */
  getDashboardStats(userId: string, profileId?: string): Promise<DashboardStats>;
}
