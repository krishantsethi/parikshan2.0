import { randomUUID } from "node:crypto";
import type {
  AssistantMessage,
  AuditEvent,
  Citation,
  Conversation,
  DashboardStats,
  DocumentTextRecord,
  Feedback,
  HealthProfile,
  InteractionCheck,
  MedicalDocument,
  Medication,
  Observation,
  PasswordResetToken,
  Session,
  StoredFile,
  User,
} from "@/types/domain";
import type {
  DataStore,
  ListDocumentsOptions,
  ListObservationsOptions,
  MedicationPatch,
  NewConversation,
  NewDocument,
  NewFeedback,
  NewInteractionCheck,
  NewMedication,
  NewMessage,
  NewObservation,
  NewProfile,
  NewSession,
  NewUser,
  ObservationPatch,
  ProfilePatch,
  UserPatch,
  DocumentPatch,
} from "@/server/db/types";
import { hashPassword } from "@/server/auth/password";

/**
 * In-memory demo driver.
 *
 * HONEST LIMITATIONS (by design):
 *  - Data lives in server-process memory and is volatile: it resets on
 *    restart and is per-instance on serverless platforms.
 *  - It exists so the product is fully explorable without external
 *    credentials, and so unit tests can exercise the real service layer.
 *  - All seeded content is labeled SAMPLE/demo and is fictional.
 *
 * Never use this for real medical data. Configure DATABASE_URL for the
 * Postgres driver.
 */

interface Row {
  id: string;
  createdAt: Date;
}

class Table<T extends Row> {
  private rows = new Map<string, T>();

  insert(row: T): T {
    this.rows.set(row.id, row);
    return clone(row);
  }
  get(id: string): T | null {
    const row = this.rows.get(id);
    return row ? clone(row) : null;
  }
  update(id: string, patch: Partial<T>): T | null {
    const row = this.rows.get(id);
    if (!row) return null;
    Object.assign(row, patch);
    return clone(row);
  }
  delete(id: string): boolean {
    return this.rows.delete(id);
  }
  find(predicate: (row: T) => boolean): T[] {
    return [...this.rows.values()].filter(predicate).map(clone);
  }
  findOne(predicate: (row: T) => boolean): T | null {
    for (const row of this.rows.values()) {
      if (predicate(row)) return clone(row);
    }
    return null;
  }
  deleteWhere(predicate: (row: T) => boolean): number {
    let count = 0;
    for (const [id, row] of this.rows) {
      if (predicate(row)) {
        this.rows.delete(id);
        count++;
      }
    }
    return count;
  }
  count(predicate: (row: T) => boolean): number {
    let n = 0;
    for (const row of this.rows.values()) if (predicate(row)) n++;
    return n;
  }
}

function clone<T>(row: T): T {
  if (row instanceof Uint8Array) return row.slice() as T;
  if (Array.isArray(row)) return row.map((item) => clone(item)) as T;
  if (row instanceof Date) return new Date(row.getTime()) as T;
  if (row && typeof row === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      out[key] = clone(value);
    }
    return out as T;
  }
  return row;
}

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d;
}

function isoDaysAgo(n: number): string {
  return daysAgo(n).toISOString().slice(0, 10);
}

export class MemoryStore implements DataStore {
  readonly kind = "memory" as const;

  private users = new Table<User & Row>();
  private sessions = new Table<Session & Row>();
  private resets = new Table<PasswordResetToken & Row>();
  private profiles = new Table<HealthProfile & Row>();
  private documents = new Table<MedicalDocument & Row>();
  private files = new Map<string, StoredFile>();
  private texts = new Map<string, DocumentTextRecord>();
  private observations = new Table<Observation & Row & { updatedAt: Date }>();
  private medications = new Table<Medication & Row & { updatedAt: Date }>();
  private interactionChecks = new Table<InteractionCheck & Row>();
  private conversations = new Table<Conversation & Row & { updatedAt: Date }>();
  private messages = new Table<AssistantMessage & Row>();
  private feedback = new Table<Feedback & Row>();
  private audit = new Table<AuditEvent & Row>();

  private initialized = false;
  private seedPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const demoMode = process.env.DEMO_MODE !== "false";
    if (demoMode && !this.seedPromise) {
      this.seedPromise = this.seedDemoData();
    }
    await this.seedPromise;
  }

  /* ------------------------------------------------------------------ users */

  async createUser(input: NewUser): Promise<User> {
    const now = new Date();
    return this.users.insert({
      id: randomUUID(),
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash,
      locale: input.locale ?? "en",
      theme: input.theme ?? "dark",
      createdAt: now,
      updatedAt: now,
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    return this.users.findOne((u) => u.email === normalized);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id);
  }

  async updateUser(id: string, patch: UserPatch): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    return this.users.update(id, {
      ...patch,
      email: patch.email ? patch.email.toLowerCase() : undefined,
      updatedAt: new Date(),
    } as Partial<User>);
  }

  async deleteUser(id: string): Promise<void> {
    // Delete documents (rows + files/text/observations) before profiles.
    for (const profile of this.profiles.find((p) => p.ownerId === id)) {
      for (const document of this.documents.find((d) => d.profileId === profile.id)) {
        this.deleteDocumentFully(document.id);
      }
      this.deleteProfileCascade(profile.id);
    }
    this.profiles.deleteWhere((p) => p.ownerId === id);
    this.sessions.deleteWhere((s) => s.userId === id);
    this.resets.deleteWhere((r) => r.userId === id);
    this.conversations.deleteWhere((c) => {
      if (c.userId !== id) return false;
      this.messages.deleteWhere((m) => m.conversationId === c.id);
      return true;
    });
    this.audit.deleteWhere((a) => a.userId === id);
    this.users.delete(id);
  }

  /* --------------------------------------------------------------- sessions */

  async createSession(input: NewSession): Promise<Session> {
    return this.sessions.insert({
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      userAgent: input.userAgent ?? null,
    });
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    const session = this.sessions.findOne((s) => s.tokenHash === tokenHash);
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(session.id);
      return null;
    }
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteSessionsForUser(userId: string): Promise<void> {
    this.sessions.deleteWhere((s) => s.userId === userId);
  }

  async deleteExpiredSessions(): Promise<number> {
    return this.sessions.deleteWhere((s) => s.expiresAt.getTime() <= Date.now());
  }

  /* -------------------------------------------------------- password resets */

  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    return this.resets.insert({
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    });
  }

  async getValidPasswordResetToken(tokenHash: string, now = new Date()): Promise<PasswordResetToken | null> {
    const token = this.resets.findOne((t) => t.tokenHash === tokenHash);
    if (!token || token.usedAt || token.expiresAt.getTime() <= now.getTime()) return null;
    return token;
  }

  async consumePasswordResetToken(id: string): Promise<void> {
    this.resets.update(id, { usedAt: new Date() });
  }

  /* --------------------------------------------------------------- profiles */

  async listProfiles(ownerId: string): Promise<HealthProfile[]> {
    return this.profiles
      .find((p) => p.ownerId === ownerId)
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getProfile(id: string): Promise<HealthProfile | null> {
    return this.profiles.get(id);
  }

  async createProfile(input: NewProfile): Promise<HealthProfile> {
    const now = new Date();
    const isFirst = this.profiles.count((p) => p.ownerId === input.ownerId) === 0;
    return this.profiles.insert({
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      relation: input.relation,
      dob: input.dob ?? null,
      sex: input.sex ?? null,
      bloodGroup: input.bloodGroup ?? null,
      notes: input.notes ?? null,
      authorizationAffirmedAt: input.authorizationAffirmedAt ?? null,
      isPrimary: input.isPrimary ?? isFirst,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateProfile(id: string, patch: ProfilePatch): Promise<HealthProfile | null> {
    return this.profiles.update(id, { ...patch, updatedAt: new Date() } as Partial<HealthProfile>);
  }

  async deleteProfile(id: string): Promise<void> {
    for (const document of this.documents.find((d) => d.profileId === id)) {
      this.deleteDocumentFully(document.id);
    }
    this.deleteProfileCascade(id);
    this.profiles.delete(id);
  }

  /** Removes the document row plus its file, text, and derived observations. */
  private deleteDocumentFully(documentId: string): void {
    this.deleteDocumentCascade(documentId);
    this.documents.delete(documentId);
  }

  private deleteProfileCascade(profileId: string): void {
    const docIds = this.documents.find((d) => d.profileId === profileId).map((d) => d.id);
    for (const docId of docIds) {
      this.deleteDocumentCascade(docId);
    }
    this.observations.deleteWhere((o) => o.profileId === profileId);
    this.medications.deleteWhere((m) => m.profileId === profileId);
    this.interactionChecks.deleteWhere((c) => c.profileId === profileId);
    this.conversations.deleteWhere((c) => {
      if (c.profileId !== profileId) return false;
      this.messages.deleteWhere((m) => m.conversationId === c.id);
      return true;
    });
  }

  /* -------------------------------------------------------------- documents */

  async listDocuments(options: ListDocumentsOptions): Promise<{ items: MedicalDocument[]; total: number }> {
    let items = this.documents.find((d) => d.userId === options.userId);
    if (options.profileId) items = items.filter((d) => d.profileId === options.profileId);
    if (options.category) items = items.filter((d) => d.category === options.category);
    if (options.status) items = items.filter((d) => d.status === options.status);
    if (options.search) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (d) => d.title.toLowerCase().includes(q) || d.originalFilename.toLowerCase().includes(q),
      );
    }
    switch (options.sort ?? "newest") {
      case "oldest":
        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case "name":
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    const total = items.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    return { items: items.slice(offset, offset + limit), total };
  }

  async getDocument(id: string): Promise<MedicalDocument | null> {
    return this.documents.get(id);
  }

  async createDocument(input: NewDocument): Promise<MedicalDocument> {
    const now = new Date();
    return this.documents.insert({
      id: randomUUID(),
      userId: input.userId,
      profileId: input.profileId,
      title: input.title,
      originalFilename: input.originalFilename,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      category: input.category ?? "other",
      status: input.status ?? "processing",
      errorMessage: null,
      ocrEngine: null,
      textConfidence: null,
      pages: null,
      textLength: 0,
      summary: null,
      summaryKind: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateDocument(id: string, patch: DocumentPatch): Promise<MedicalDocument | null> {
    const doc = this.documents.get(id);
    if (!doc) return null;
    return this.documents.update(id, {
      ...patch,
      errorMessage: patch.errorMessage === undefined ? doc.errorMessage : patch.errorMessage,
      updatedAt: new Date(),
    } as Partial<MedicalDocument>);
  }

  async deleteDocument(id: string): Promise<void> {
    this.deleteDocumentFully(id);
  }

  private deleteDocumentCascade(documentId: string): void {
    this.files.delete(documentId);
    this.texts.delete(documentId);
    this.observations.deleteWhere((o) => o.documentId === documentId);
  }

  /* -------------------------------------------------------- files and texts */

  async saveFile(documentId: string, mime: string, bytes: Uint8Array): Promise<void> {
    this.files.set(documentId, { documentId, mime, bytes: bytes.slice(), createdAt: new Date() });
  }

  async getFile(documentId: string): Promise<StoredFile | null> {
    const file = this.files.get(documentId);
    return file ? { ...file, bytes: file.bytes.slice() } : null;
  }

  async deleteFile(documentId: string): Promise<void> {
    this.files.delete(documentId);
  }

  async saveDocumentText(record: Omit<DocumentTextRecord, "createdAt">): Promise<void> {
    this.texts.set(record.documentId, { ...record, text: record.text, createdAt: new Date() });
  }

  async getDocumentText(documentId: string): Promise<DocumentTextRecord | null> {
    return this.texts.get(documentId) ?? null;
  }

  /* ----------------------------------------------------------- observations */

  async listObservations(options: ListObservationsOptions): Promise<Observation[]> {
    let items = this.observations.find((o) => o.userId === options.userId);
    if (options.profileId) items = items.filter((o) => o.profileId === options.profileId);
    if (options.testName) items = items.filter((o) => o.testName === options.testName);
    if (options.documentId) items = items.filter((o) => o.documentId === options.documentId);
    if (options.verifiedOnly) items = items.filter((o) => o.verified);
    items.sort((a, b) => (b.collectedAt ?? "").localeCompare(a.collectedAt ?? "") || b.createdAt.getTime() - a.createdAt.getTime());
    if (options.limit) items = items.slice(0, options.limit);
    return items;
  }

  async getObservation(id: string): Promise<Observation | null> {
    return this.observations.get(id);
  }

  async createObservation(input: NewObservation): Promise<Observation> {
    const now = new Date();
    return this.observations.insert({
      id: randomUUID(),
      userId: input.userId,
      profileId: input.profileId,
      documentId: input.documentId ?? null,
      testName: input.testName,
      valueText: input.valueText,
      valueNumeric: input.valueNumeric ?? null,
      unit: input.unit ?? null,
      refLow: input.refLow ?? null,
      refHigh: input.refHigh ?? null,
      refText: input.refText ?? null,
      flag: input.flag ?? "unknown",
      collectedAt: input.collectedAt ?? null,
      source: input.source ?? "manual",
      confidence: input.confidence ?? null,
      verified: input.verified ?? false,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateObservation(id: string, patch: ObservationPatch): Promise<Observation | null> {
    return this.observations.update(id, { ...patch, updatedAt: new Date() } as Partial<Observation>);
  }

  async replaceDocumentObservations(documentId: string, observations: NewObservation[]): Promise<Observation[]> {
    this.observations.deleteWhere((o) => o.documentId === documentId);
    const created: Observation[] = [];
    for (const input of observations) {
      created.push(await this.createObservation({ ...input, documentId }));
    }
    return created;
  }

  async deleteObservation(id: string): Promise<void> {
    this.observations.delete(id);
  }

  async listTestNames(userId: string, profileId: string): Promise<string[]> {
    const names = new Set(
      this.observations
        .find((o) => o.userId === userId && o.profileId === profileId)
        .map((o) => o.testName),
    );
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  /* ------------------------------------------------------------ medications */

  async listMedications(options: { userId: string; profileId?: string; activeOnly?: boolean }): Promise<Medication[]> {
    let items = this.medications.find((m) => m.userId === options.userId);
    if (options.profileId) items = items.filter((m) => m.profileId === options.profileId);
    if (options.activeOnly) items = items.filter((m) => m.active);
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  }

  async getMedication(id: string): Promise<Medication | null> {
    return this.medications.get(id);
  }

  async createMedication(input: NewMedication): Promise<Medication> {
    const now = new Date();
    return this.medications.insert({
      id: randomUUID(),
      userId: input.userId,
      profileId: input.profileId,
      name: input.name,
      dosageText: input.dosageText ?? null,
      scheduleText: input.scheduleText ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      active: input.active ?? true,
      prescriber: input.prescriber ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateMedication(id: string, patch: MedicationPatch): Promise<Medication | null> {
    return this.medications.update(id, { ...patch, updatedAt: new Date() } as Partial<Medication>);
  }

  async deleteMedication(id: string): Promise<void> {
    this.medications.delete(id);
  }

  /* ------------------------------------------------------ interaction checks */

  async createInteractionCheck(input: NewInteractionCheck): Promise<InteractionCheck> {
    return this.interactionChecks.insert({
      id: randomUUID(),
      userId: input.userId,
      profileId: input.profileId,
      medicationIds: [...input.medicationIds],
      medicationNames: [...input.medicationNames],
      findings: clone(input.findings),
      sourcesUsed: [...input.sourcesUsed],
      status: input.status,
      disclaimer: input.disclaimer,
      createdAt: new Date(),
    });
  }

  async listInteractionChecks(userId: string, profileId?: string, limit = 10): Promise<InteractionCheck[]> {
    let items = this.interactionChecks.find((c) => c.userId === userId);
    if (profileId) items = items.filter((c) => c.profileId === profileId);
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items.slice(0, limit);
  }

  /* -------------------------------------------------------------- assistant */

  async listConversations(userId: string, profileId?: string | null): Promise<Conversation[]> {
    let items = this.conversations.find((c) => c.userId === userId);
    if (profileId !== undefined) items = items.filter((c) => c.profileId === profileId);
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return items;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id);
  }

  async createConversation(input: NewConversation): Promise<Conversation> {
    const now = new Date();
    return this.conversations.insert({
      id: randomUUID(),
      userId: input.userId,
      profileId: input.profileId ?? null,
      title: input.title,
      locale: input.locale,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateConversation(
    id: string,
    patch: { title?: string; profileId?: string | null },
  ): Promise<Conversation | null> {
    return this.conversations.update(id, { ...patch, updatedAt: new Date() } as Partial<Conversation>);
  }

  async deleteConversation(id: string): Promise<void> {
    this.messages.deleteWhere((m) => m.conversationId === id);
    this.conversations.delete(id);
  }

  async listMessages(conversationId: string, limit = 100): Promise<AssistantMessage[]> {
    const items = this.messages.find((m) => m.conversationId === conversationId);
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return items.slice(-limit);
  }

  async createMessage(input: NewMessage): Promise<AssistantMessage> {
    const now = new Date();
    const message = this.messages.insert({
      id: randomUUID(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      citations: input.citations ? clone(input.citations) : [],
      grounded: input.grounded ?? false,
      provider: input.provider ?? null,
      error: input.error ?? null,
      createdAt: now,
    });
    this.conversations.update(input.conversationId, { updatedAt: now });
    return message;
  }

  /* --------------------------------------------------------------- feedback */

  async createFeedback(input: NewFeedback): Promise<Feedback> {
    return this.feedback.insert({
      id: randomUUID(),
      userId: input.userId ?? null,
      email: input.email ?? null,
      name: input.name ?? null,
      rating: input.rating ?? null,
      category: input.category,
      message: input.message,
      createdAt: new Date(),
    });
  }

  /* ------------------------------------------------------------------ audit */

  private lastAuditAt = 0;

  async logAudit(input: { userId?: string | null; action: string; entity?: string | null; entityId?: string | null; meta?: Record<string, unknown> | null }): Promise<void> {
    // Monotonic timestamp: two events in the same millisecond would otherwise
    // have an unstable sort order in the activity timeline.
    const now = Math.max(Date.now(), this.lastAuditAt + 1);
    this.lastAuditAt = now;
    this.audit.insert({
      id: randomUUID(),
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      meta: input.meta ? clone(input.meta) : null,
      createdAt: new Date(now),
    });
  }

  async listAudit(userId: string, limit = 50): Promise<AuditEvent[]> {
    const items = this.audit.find((a) => a.userId === userId);
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items.slice(0, limit);
  }

  /* ------------------------------------------------------------------ stats */

  async getDashboardStats(userId: string, profileId?: string): Promise<DashboardStats> {
    const docs = profileId
      ? this.documents.find((d) => d.userId === userId && d.profileId === profileId)
      : this.documents.find((d) => d.userId === userId);
    const obs = profileId
      ? this.observations.find((o) => o.userId === userId && o.profileId === profileId)
      : this.observations.find((o) => o.userId === userId);
    const meds = profileId
      ? this.medications.find((m) => m.userId === userId && m.profileId === profileId)
      : this.medications.find((m) => m.userId === userId);
    return {
      documentCount: docs.length,
      observationCount: obs.length,
      medicationCount: meds.filter((m) => m.active).length,
      conversationCount: this.conversations.count((c) => c.userId === userId),
      recentDocuments: docs
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
      recentActivity: await this.listAudit(userId, 12),
    };
  }

  /* -------------------------------------------------------------- demo seed */

  private async seedDemoData(): Promise<void> {
    const passwordHash = await hashPassword("Demo@1234");
    const demoUser = await this.createUser({
      email: "demo@parikshan.health",
      name: "Demo Explorer",
      passwordHash,
    });

    const selfProfile = await this.createProfile({
      ownerId: demoUser.id,
      name: "Aarav (Demo)",
      relation: "self",
      dob: "1992-05-14",
      sex: "male",
      bloodGroup: "B+",
      notes: "Demo sample profile — fictional person.",
      isPrimary: true,
    });
    const motherProfile = await this.createProfile({
      ownerId: demoUser.id,
      name: "Sunita (Demo)",
      relation: "parent",
      dob: "1964-11-02",
      sex: "female",
      notes: "Demo sample family profile — fictional person.",
      authorizationAffirmedAt: new Date(),
    });

    const cbcText = `SAMPLE CITY DIAGNOSTIC LAB — Demo specimen, fictional data
Patient: Aarav (Demo)   Age/Sex: 33Y / M   Date: ${isoDaysAgo(21)}
COMPLETE BLOOD COUNT
Haemoglobin          12.8   g/dL        13.0 - 17.0    LOW
Total Leukocyte Count 7200  /cumm       4000 - 11000
Differential Count:
  Neutrophils        62     %           40 - 70
  Lymphocytes        30     %           20 - 40
Platelet Count       240000 /uL         150000 - 400000`;

    const cbc = await this.createDocument({
      userId: demoUser.id,
      profileId: selfProfile.id,
      title: "SAMPLE — Complete Blood Count",
      originalFilename: "sample-cbc.pdf",
      mime: "application/pdf",
      sizeBytes: 48_213,
      category: "lab_report",
      status: "ready",
    });
    await this.updateDocument(cbc.id, {
      ocrEngine: "pdf_text",
      textConfidence: 0.97,
      pages: 1,
      textLength: cbcText.length,
      summary:
        "Demo sample report. Haemoglobin (12.8 g/dL) is slightly below the range stated by this lab (13.0–17.0). White cell differential and platelet count are within the ranges printed on the report. This is fictional sample data for demonstration.",
      summaryKind: "structured_digest",
    });
    await this.saveDocumentText({ documentId: cbc.id, text: cbcText, engine: "pdf_text", confidence: 0.97 });

    const cbcObservations: NewObservation[] = [
      {
        userId: demoUser.id,
        profileId: selfProfile.id,
        testName: "Haemoglobin",
        valueText: "12.8",
        valueNumeric: 12.8,
        unit: "g/dL",
        refLow: 13.0,
        refHigh: 17.0,
        refText: "13.0 - 17.0 g/dL",
        flag: "low",
        collectedAt: isoDaysAgo(21),
        source: "reviewed",
        verified: true,
        notes: "Demo sample value (fictional).",
      },
      {
        userId: demoUser.id,
        profileId: selfProfile.id,
        testName: "Platelet Count",
        valueText: "240000",
        valueNumeric: 240000,
        unit: "/uL",
        refLow: 150000,
        refHigh: 400000,
        refText: "150000 - 400000 /uL",
        flag: "normal",
        collectedAt: isoDaysAgo(21),
        source: "reviewed",
        verified: true,
        notes: "Demo sample value (fictional).",
      },
    ];
    await this.replaceDocumentObservations(cbc.id, cbcObservations);

    // Earlier haemoglobin points to make the trend chart meaningful (fictional).
    for (const [days, value] of [
      [150, 11.9],
      [95, 12.3],
      [60, 12.6],
    ] as const) {
      await this.createObservation({
        userId: demoUser.id,
        profileId: selfProfile.id,
        testName: "Haemoglobin",
        valueText: String(value),
        valueNumeric: value,
        unit: "g/dL",
        refLow: 13.0,
        refHigh: 17.0,
        refText: "13.0 - 17.0 g/dL",
        flag: "low",
        collectedAt: isoDaysAgo(days),
        source: "manual",
        verified: true,
        notes: "Demo sample value (fictional).",
      });
    }

    const lipidText = `SAMPLE CITY DIAGNOSTIC LAB — Demo specimen, fictional data
Patient: Aarav (Demo)   Date: ${isoDaysAgo(7)}
LIPID PROFILE
Total Cholesterol    212    mg/dL       Desirable: < 200
LDL Cholesterol      138    mg/dL       Optimal: < 100
HDL Cholesterol      44     mg/dL       Desirable: > 40
Triglycerides        165    mg/dL       Normal: < 150`;

    const lipid = await this.createDocument({
      userId: demoUser.id,
      profileId: selfProfile.id,
      title: "SAMPLE — Lipid Profile",
      originalFilename: "sample-lipid-profile.pdf",
      mime: "application/pdf",
      sizeBytes: 41_902,
      category: "lab_report",
      status: "ready",
    });
    await this.updateDocument(lipid.id, {
      ocrEngine: "pdf_text",
      textConfidence: 0.96,
      pages: 1,
      textLength: lipidText.length,
      summary:
        "Demo sample report. Total cholesterol (212 mg/dL) and LDL (138 mg/dL) are above the desirable limits printed on this report; triglycerides (165 mg/dL) are above the stated normal limit. HDL (44 mg/dL) is within the desirable band. Fictional sample data for demonstration.",
      summaryKind: "structured_digest",
    });
    await this.saveDocumentText({ documentId: lipid.id, text: lipidText, engine: "pdf_text", confidence: 0.96 });
    await this.replaceDocumentObservations(lipid.id, [
      {
        userId: demoUser.id,
        profileId: selfProfile.id,
        testName: "Total Cholesterol",
        valueText: "212",
        valueNumeric: 212,
        unit: "mg/dL",
        refHigh: 200,
        refText: "Desirable: < 200 mg/dL",
        flag: "high",
        collectedAt: isoDaysAgo(7),
        source: "reviewed",
        verified: true,
        notes: "Demo sample value (fictional).",
      },
      {
        userId: demoUser.id,
        profileId: selfProfile.id,
        testName: "LDL Cholesterol",
        valueText: "138",
        valueNumeric: 138,
        unit: "mg/dL",
        refHigh: 100,
        refText: "Optimal: < 100 mg/dL",
        flag: "high",
        collectedAt: isoDaysAgo(7),
        source: "reviewed",
        verified: true,
        notes: "Demo sample value (fictional).",
      },
      {
        userId: demoUser.id,
        profileId: selfProfile.id,
        testName: "HDL Cholesterol",
        valueText: "44",
        valueNumeric: 44,
        unit: "mg/dL",
        refLow: 40,
        refText: "Desirable: > 40 mg/dL",
        flag: "normal",
        collectedAt: isoDaysAgo(7),
        source: "reviewed",
        verified: true,
        notes: "Demo sample value (fictional).",
      },
      {
        userId: demoUser.id,
        profileId: selfProfile.id,
        testName: "Triglycerides",
        valueText: "165",
        valueNumeric: 165,
        unit: "mg/dL",
        refHigh: 150,
        refText: "Normal: < 150 mg/dL",
        flag: "high",
        collectedAt: isoDaysAgo(7),
        source: "reviewed",
        verified: true,
        notes: "Demo sample value (fictional).",
      },
    ]);

    await this.createMedication({
      userId: demoUser.id,
      profileId: selfProfile.id,
      name: "Metformin",
      dosageText: "500 mg",
      scheduleText: "1-0-1 (after meals)",
      startDate: isoDaysAgo(120),
      active: true,
      prescriber: "Dr. R. Mehta (Demo)",
      notes: "Demo sample medication (fictional).",
    });
    await this.createMedication({
      userId: demoUser.id,
      profileId: selfProfile.id,
      name: "Aspirin",
      dosageText: "75 mg",
      scheduleText: "Once daily (night)",
      startDate: isoDaysAgo(120),
      active: true,
      prescriber: "Dr. R. Mehta (Demo)",
      notes: "Demo sample medication (fictional).",
    });
    await this.createMedication({
      userId: demoUser.id,
      profileId: motherProfile.id,
      name: "Amlodipine",
      dosageText: "5 mg",
      scheduleText: "Once daily (morning)",
      startDate: isoDaysAgo(400),
      active: true,
      prescriber: "Dr. S. Iyer (Demo)",
      notes: "Demo sample medication (fictional).",
    });

    const conversation = await this.createConversation({
      userId: demoUser.id,
      profileId: selfProfile.id,
      title: "Sample conversation (demo)",
      locale: "en",
    });
    await this.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "What does my lipid profile say?",
    });
    const citations: Citation[] = [
      {
        kind: "document",
        id: lipid.id,
        label: "SAMPLE — Lipid Profile",
        detail: `Collected ${isoDaysAgo(7)}`,
      },
    ];
    await this.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content:
        "This is a demo sample answer (fictional). Your lipid profile dated " +
        `${isoDaysAgo(7)} reports Total Cholesterol 212 mg/dL (desirable < 200 per the report), LDL 138 mg/dL (optimal < 100 per the report), HDL 44 mg/dL (within the desirable band), and Triglycerides 165 mg/dL (normal < 150 per the report). Three of the four values sit above the limits printed on the report itself. I can only describe what the document states — interpretation and next steps belong to your clinician. Would you like questions to ask them at your next visit?`,
      citations,
      grounded: true,
      provider: "demo-seed",
    });

    await this.logAudit({ userId: demoUser.id, action: "signup", entity: "user", entityId: demoUser.id });
    await this.logAudit({
      userId: demoUser.id,
      action: "document.uploaded",
      entity: "document",
      entityId: lipid.id,
      meta: { demo: true },
    });
    await this.logAudit({
      userId: demoUser.id,
      action: "observation.confirmed",
      entity: "document",
      entityId: cbc.id,
      meta: { demo: true, count: 2 },
    });
  }
}

export const DEMO_CREDENTIALS = {
  email: "demo@parikshan.health",
  password: "Demo@1234",
} as const;
