import postgres from "postgres";
import type {
  AssistantMessage,
  AuditEvent,
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
  DocumentPatch,
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
} from "@/server/db/types";

/**
 * Postgres driver (Supabase / Neon / any Postgres 14+).
 *
 * Schema lives in `db/migrations/*.sql` (applied via `npm run db:migrate`).
 * All ownership checks are baked into the WHERE clauses here AND enforced
 * again by the service layer; RLS policies in `0002_rls.sql` provide
 * defense-in-depth when the connecting role is not the table owner
 * (see docs/SECURITY.md).
 */

type Sql = postgres.Sql<Record<string, postgres.PostgresType>>;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

function toUser(row: Row): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash ?? row.password_hash,
    locale: row.locale,
    theme: row.theme,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
  };
}

function toSession(row: Row): Session {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    tokenHash: row.tokenHash ?? row.token_hash,
    expiresAt: new Date(row.expiresAt ?? row.expires_at),
    createdAt: new Date(row.createdAt ?? row.created_at),
    userAgent: row.userAgent ?? row.user_agent ?? null,
  };
}

function toReset(row: Row): PasswordResetToken {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    tokenHash: row.tokenHash ?? row.token_hash,
    expiresAt: new Date(row.expiresAt ?? row.expires_at),
    usedAt: row.usedAt ?? row.used_at ? new Date(row.usedAt ?? row.used_at) : null,
    createdAt: new Date(row.createdAt ?? row.created_at),
  };
}

function toProfile(row: Row): HealthProfile {
  return {
    id: row.id,
    ownerId: row.ownerId ?? row.owner_id,
    name: row.name,
    relation: row.relation,
    dob: toIsoDate(row.dob),
    sex: row.sex ?? null,
    bloodGroup: row.bloodGroup ?? row.blood_group ?? null,
    notes: row.notes ?? null,
    authorizationAffirmedAt:
      (row.authorizationAffirmedAt ?? row.authorization_affirmed_at)
        ? new Date(row.authorizationAffirmedAt ?? row.authorization_affirmed_at)
        : null,
    isPrimary: Boolean(row.isPrimary ?? row.is_primary),
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
  };
}

function toDocument(row: Row): MedicalDocument {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    profileId: row.profileId ?? row.profile_id,
    title: row.title,
    originalFilename: row.originalFilename ?? row.original_filename,
    mime: row.mime,
    sizeBytes: Number(row.sizeBytes ?? row.size_bytes),
    category: row.category,
    status: row.status,
    errorMessage: row.errorMessage ?? row.error_message ?? null,
    ocrEngine: row.ocrEngine ?? row.ocr_engine ?? null,
    textConfidence: row.textConfidence ?? row.text_confidence ?? null,
    pages: row.pages ?? null,
    textLength: Number(row.textLength ?? row.text_length ?? 0),
    summary: row.summary ?? null,
    summaryKind: row.summaryKind ?? row.summary_kind ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
  };
}

function toObservation(row: Row): Observation {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    profileId: row.profileId ?? row.profile_id,
    documentId: row.documentId ?? row.document_id ?? null,
    testName: row.testName ?? row.test_name,
    valueText: row.valueText ?? row.value_text,
    valueNumeric: row.valueNumeric ?? row.value_numeric ?? null,
    unit: row.unit ?? null,
    refLow: row.refLow ?? row.ref_low ?? null,
    refHigh: row.refHigh ?? row.ref_high ?? null,
    refText: row.refText ?? row.ref_text ?? null,
    flag: row.flag,
    collectedAt: toIsoDate(row.collectedAt ?? row.collected_at),
    source: row.source,
    confidence: row.confidence ?? null,
    verified: Boolean(row.verified),
    notes: row.notes ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
  };
}

function toMedication(row: Row): Medication {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    profileId: row.profileId ?? row.profile_id,
    name: row.name,
    dosageText: row.dosageText ?? row.dosage_text ?? null,
    scheduleText: row.scheduleText ?? row.schedule_text ?? null,
    startDate: toIsoDate(row.startDate ?? row.start_date),
    endDate: toIsoDate(row.endDate ?? row.end_date),
    active: Boolean(row.active),
    prescriber: row.prescriber ?? null,
    notes: row.notes ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
  };
}

function toInteractionCheck(row: Row): InteractionCheck {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    profileId: row.profileId ?? row.profile_id,
    medicationIds: row.medicationIds ?? row.medication_ids ?? [],
    medicationNames: row.medicationNames ?? row.medication_names ?? [],
    findings: row.findings ?? [],
    sourcesUsed: row.sourcesUsed ?? row.sources_used ?? [],
    status: row.status,
    disclaimer: row.disclaimer,
    createdAt: new Date(row.createdAt ?? row.created_at),
  };
}

function toConversation(row: Row): Conversation {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    profileId: row.profileId ?? row.profile_id ?? null,
    title: row.title,
    locale: row.locale,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
  };
}

function toMessage(row: Row): AssistantMessage {
  return {
    id: row.id,
    conversationId: row.conversationId ?? row.conversation_id,
    role: row.role,
    content: row.content,
    citations: row.citations ?? [],
    grounded: Boolean(row.grounded),
    provider: row.provider ?? null,
    error: row.error ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at),
  };
}

function toFeedback(row: Row): Feedback {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id ?? null,
    email: row.email ?? null,
    name: row.name ?? null,
    rating: row.rating ?? null,
    category: row.category,
    message: row.message,
    createdAt: new Date(row.createdAt ?? row.created_at),
  };
}

function toAudit(row: Row): AuditEvent {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id ?? null,
    action: row.action,
    entity: row.entity ?? null,
    entityId: row.entityId ?? row.entity_id ?? null,
    meta: row.meta ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at),
  };
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Postgres `date` columns arrive as Date (or string); the domain uses ISO date strings. */
function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    // postgres.js parses `date` as local midnight — read the wall-clock parts.
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

export class PgStore implements DataStore {
  readonly kind = "postgres" as const;
  private sql: Sql;
  private initPromise: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false, // pgbouncer/transaction-pooling friendly (Supabase pooler)
      transform: { column: postgres.camel.column },
      onnotice: () => {},
    });
  }

  async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          await this.sql`SELECT to_regclass('public.users') AS t`;
        } catch (error) {
          throw new Error(
            `[parikshan] Cannot reach the configured Postgres database: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        const [{ t }] = await this.sql`SELECT to_regclass('public.users') AS t`;
        if (!t) {
          throw new Error(
            "[parikshan] Database is reachable but not migrated. Run `npm run db:migrate` with DATABASE_URL set.",
          );
        }
        await this.sql`DELETE FROM sessions WHERE expires_at < now()`;
      })();
    }
    await this.initPromise;
  }

  /* ------------------------------------------------------------------ users */

  async createUser(input: NewUser): Promise<User> {
    const [row] = await this.sql`
      INSERT INTO users (email, name, password_hash, locale, theme)
      VALUES (
        lower(${input.email}),
        ${input.name},
        ${input.passwordHash},
        ${input.locale ?? "en"},
        ${input.theme ?? "dark"}
      )
      RETURNING *`;
    return toUser(row);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.sql`SELECT * FROM users WHERE email = lower(${email}) LIMIT 1`;
    return rows[0] ? toUser(rows[0]) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = await this.sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toUser(rows[0]) : null;
  }

  async updateUser(id: string, patch: UserPatch): Promise<User | null> {
    const rows = await this.sql`
      UPDATE users SET
        name = COALESCE(${patch.name ?? null}, name),
        email = COALESCE(${patch.email ? patch.email.toLowerCase() : null}, email),
        password_hash = COALESCE(${patch.passwordHash ?? null}, password_hash),
        locale = COALESCE(${patch.locale ?? null}, locale),
        theme = COALESCE(${patch.theme ?? null}, theme),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *`;
    return rows[0] ? toUser(rows[0]) : null;
  }

  async deleteUser(id: string): Promise<void> {
    await this.sql`DELETE FROM users WHERE id = ${id}`;
  }

  /* --------------------------------------------------------------- sessions */

  async createSession(input: NewSession): Promise<Session> {
    const [row] = await this.sql`
      INSERT INTO sessions (user_id, token_hash, expires_at, user_agent)
      VALUES (${input.userId}, ${input.tokenHash}, ${input.expiresAt.toISOString()}, ${input.userAgent ?? null})
      RETURNING *`;
    return toSession(row);
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    const rows = await this.sql`
      SELECT * FROM sessions
      WHERE token_hash = ${tokenHash} AND expires_at > now()
      LIMIT 1`;
    return rows[0] ? toSession(rows[0]) : null;
  }

  async deleteSession(id: string): Promise<void> {
    await this.sql`DELETE FROM sessions WHERE id = ${id}`;
  }

  async deleteSessionsForUser(userId: string): Promise<void> {
    await this.sql`DELETE FROM sessions WHERE user_id = ${userId}`;
  }

  async deleteExpiredSessions(): Promise<number> {
    const rows = await this.sql`DELETE FROM sessions WHERE expires_at < now() RETURNING id`;
    return rows.count;
  }

  /* -------------------------------------------------------- password resets */

  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    const [row] = await this.sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
      RETURNING *`;
    return toReset(row);
  }

  async getValidPasswordResetToken(
    tokenHash: string,
    now = new Date(),
  ): Promise<PasswordResetToken | null> {
    const rows = await this.sql`
      SELECT * FROM password_reset_tokens
      WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > ${now.toISOString()}
      LIMIT 1`;
    return rows[0] ? toReset(rows[0]) : null;
  }

  async consumePasswordResetToken(id: string): Promise<void> {
    await this.sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${id}`;
  }

  /* --------------------------------------------------------------- profiles */

  async listProfiles(ownerId: string): Promise<HealthProfile[]> {
    const rows = await this.sql`
      SELECT * FROM profiles WHERE owner_id = ${ownerId}
      ORDER BY is_primary DESC, created_at ASC`;
    return rows.map(toProfile);
  }

  async getProfile(id: string): Promise<HealthProfile | null> {
    const rows = await this.sql`SELECT * FROM profiles WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toProfile(rows[0]) : null;
  }

  async createProfile(input: NewProfile): Promise<HealthProfile> {
    const isPrimary =
      input.isPrimary ??
      (await this.sql`SELECT count(*)::int AS n FROM profiles WHERE owner_id = ${input.ownerId}`)[0]
        ?.n === 0;
    const [row] = await this.sql`
      INSERT INTO profiles (owner_id, name, relation, dob, sex, blood_group, notes, authorization_affirmed_at, is_primary)
      VALUES (
        ${input.ownerId}, ${input.name}, ${input.relation}, ${input.dob ?? null},
        ${input.sex ?? null}, ${input.bloodGroup ?? null}, ${input.notes ?? null},
        ${input.authorizationAffirmedAt?.toISOString() ?? null}, ${isPrimary}
      )
      RETURNING *`;
    return toProfile(row);
  }

  async updateProfile(id: string, patch: ProfilePatch): Promise<HealthProfile | null> {
    const rows = await this.sql`
      UPDATE profiles SET
        name = COALESCE(${patch.name ?? null}, name),
        relation = COALESCE(${patch.relation ?? null}, relation),
        dob = CASE WHEN ${"dob" in patch} THEN ${patch.dob ?? null} ELSE dob END,
        sex = CASE WHEN ${"sex" in patch} THEN ${patch.sex ?? null} ELSE sex END,
        blood_group = CASE WHEN ${"bloodGroup" in patch} THEN ${patch.bloodGroup ?? null} ELSE blood_group END,
        notes = CASE WHEN ${"notes" in patch} THEN ${patch.notes ?? null} ELSE notes END,
        authorization_affirmed_at = CASE WHEN ${"authorizationAffirmedAt" in patch}
          THEN ${patch.authorizationAffirmedAt?.toISOString() ?? null}
          ELSE authorization_affirmed_at END,
        is_primary = COALESCE(${patch.isPrimary ?? null}, is_primary),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *`;
    return rows[0] ? toProfile(rows[0]) : null;
  }

  async deleteProfile(id: string): Promise<void> {
    await this.sql`DELETE FROM profiles WHERE id = ${id}`;
  }

  /* -------------------------------------------------------------- documents */

  async listDocuments(options: ListDocumentsOptions): Promise<{ items: MedicalDocument[]; total: number }> {
    const sort =
      options.sort === "oldest"
        ? this.sql`d.created_at ASC`
        : options.sort === "name"
          ? this.sql`d.title ASC`
          : this.sql`d.created_at DESC`;
    const rows = await this.sql`
      SELECT d.*, count(*) OVER() AS full_count
      FROM documents d
      WHERE d.user_id = ${options.userId}
        AND (${options.profileId ?? null}::uuid IS NULL OR d.profile_id = ${options.profileId ?? null}::uuid)
        AND (${options.category ?? null}::text IS NULL OR d.category = ${options.category ?? null}::text)
        AND (${options.status ?? null}::text IS NULL OR d.status = ${options.status ?? null}::text)
        AND (${options.search ?? null}::text IS NULL OR (d.title ILIKE '%' || ${options.search ?? ""} || '%' OR d.original_filename ILIKE '%' || ${options.search ?? ""} || '%'))
      ORDER BY ${sort}
      LIMIT ${options.limit ?? 50} OFFSET ${options.offset ?? 0}`;
    return {
      items: rows.map(toDocument),
      total: Number(rows[0]?.fullCount ?? rows[0]?.full_count ?? rows.length),
    };
  }

  async getDocument(id: string): Promise<MedicalDocument | null> {
    const rows = await this.sql`SELECT * FROM documents WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toDocument(rows[0]) : null;
  }

  async createDocument(input: NewDocument): Promise<MedicalDocument> {
    const [row] = await this.sql`
      INSERT INTO documents (user_id, profile_id, title, original_filename, mime, size_bytes, category, status)
      VALUES (
        ${input.userId}, ${input.profileId}, ${input.title}, ${input.originalFilename},
        ${input.mime}, ${input.sizeBytes}, ${input.category ?? "other"}, ${input.status ?? "processing"}
      )
      RETURNING *`;
    return toDocument(row);
  }

  async updateDocument(id: string, patch: DocumentPatch): Promise<MedicalDocument | null> {
    const rows = await this.sql`
      UPDATE documents SET
        title = COALESCE(${patch.title ?? null}, title),
        category = COALESCE(${patch.category ?? null}, category),
        status = COALESCE(${patch.status ?? null}, status),
        error_message = CASE WHEN ${"errorMessage" in patch} THEN ${patch.errorMessage ?? null} ELSE error_message END,
        ocr_engine = CASE WHEN ${"ocrEngine" in patch} THEN ${patch.ocrEngine ?? null} ELSE ocr_engine END,
        text_confidence = CASE WHEN ${"textConfidence" in patch} THEN ${patch.textConfidence ?? null} ELSE text_confidence END,
        pages = CASE WHEN ${"pages" in patch} THEN ${patch.pages ?? null} ELSE pages END,
        text_length = COALESCE(${patch.textLength ?? null}, text_length),
        summary = CASE WHEN ${"summary" in patch} THEN ${patch.summary ?? null} ELSE summary END,
        summary_kind = CASE WHEN ${"summaryKind" in patch} THEN ${patch.summaryKind ?? null} ELSE summary_kind END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *`;
    return rows[0] ? toDocument(rows[0]) : null;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.sql`DELETE FROM documents WHERE id = ${id}`;
  }

  /* -------------------------------------------------------- files and texts */

  async saveFile(documentId: string, mime: string, bytes: Uint8Array): Promise<void> {
    await this.sql`
      INSERT INTO document_files (document_id, mime, content)
      VALUES (${documentId}, ${mime}, ${bytes})
      ON CONFLICT (document_id) DO UPDATE SET mime = EXCLUDED.mime, content = EXCLUDED.content, created_at = now()`;
  }

  async getFile(documentId: string): Promise<StoredFile | null> {
    const rows = await this.sql`
      SELECT document_id, mime, content, created_at FROM document_files WHERE document_id = ${documentId} LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      documentId: row.documentId ?? row.document_id,
      mime: row.mime,
      bytes: row.content instanceof Uint8Array ? row.content : new Uint8Array(row.content as Buffer),
      createdAt: new Date(row.createdAt ?? row.created_at),
    };
  }

  async deleteFile(documentId: string): Promise<void> {
    await this.sql`DELETE FROM document_files WHERE document_id = ${documentId}`;
  }

  async saveDocumentText(record: Omit<DocumentTextRecord, "createdAt">): Promise<void> {
    await this.sql`
      INSERT INTO document_texts (document_id, text, engine, confidence)
      VALUES (${record.documentId}, ${record.text}, ${record.engine}, ${record.confidence})
      ON CONFLICT (document_id) DO UPDATE SET text = EXCLUDED.text, engine = EXCLUDED.engine, confidence = EXCLUDED.confidence, created_at = now()`;
  }

  async getDocumentText(documentId: string): Promise<DocumentTextRecord | null> {
    const rows = await this.sql`
      SELECT * FROM document_texts WHERE document_id = ${documentId} LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      documentId: row.documentId ?? row.document_id,
      text: row.text,
      engine: row.engine,
      confidence: numOrNull(row.confidence),
      createdAt: new Date(row.createdAt ?? row.created_at),
    };
  }

  /* ----------------------------------------------------------- observations */

  async listObservations(options: ListObservationsOptions): Promise<Observation[]> {
    const rows = await this.sql`
      SELECT * FROM observations
      WHERE user_id = ${options.userId}
        AND (${options.profileId ?? null}::uuid IS NULL OR profile_id = ${options.profileId ?? null}::uuid)
        AND (${options.testName ?? null}::text IS NULL OR test_name = ${options.testName ?? null}::text)
        AND (${options.documentId ?? null}::uuid IS NULL OR document_id = ${options.documentId ?? null}::uuid)
        AND (${options.verifiedOnly ? true : null}::boolean IS NULL OR verified = true)
      ORDER BY COALESCE(collected_at, created_at::date::text) DESC, created_at DESC
      LIMIT ${options.limit ?? 500}`;
    return rows.map(toObservation);
  }

  async getObservation(id: string): Promise<Observation | null> {
    const rows = await this.sql`SELECT * FROM observations WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toObservation(rows[0]) : null;
  }

  async createObservation(input: NewObservation): Promise<Observation> {
    const [row] = await this.sql`
      INSERT INTO observations (
        user_id, profile_id, document_id, test_name, value_text, value_numeric,
        unit, ref_low, ref_high, ref_text, flag, collected_at, source, confidence, verified, notes
      ) VALUES (
        ${input.userId}, ${input.profileId}, ${input.documentId ?? null}, ${input.testName},
        ${input.valueText}, ${input.valueNumeric ?? null}, ${input.unit ?? null},
        ${input.refLow ?? null}, ${input.refHigh ?? null}, ${input.refText ?? null},
        ${input.flag ?? "unknown"}, ${input.collectedAt ?? null}, ${input.source ?? "manual"},
        ${input.confidence ?? null}, ${input.verified ?? false}, ${input.notes ?? null}
      )
      RETURNING *`;
    return toObservation(row);
  }

  async updateObservation(id: string, patch: ObservationPatch): Promise<Observation | null> {
    const rows = await this.sql`
      UPDATE observations SET
        test_name = COALESCE(${patch.testName ?? null}, test_name),
        value_text = COALESCE(${patch.valueText ?? null}, value_text),
        value_numeric = CASE WHEN ${"valueNumeric" in patch} THEN ${patch.valueNumeric ?? null} ELSE value_numeric END,
        unit = CASE WHEN ${"unit" in patch} THEN ${patch.unit ?? null} ELSE unit END,
        ref_low = CASE WHEN ${"refLow" in patch} THEN ${patch.refLow ?? null} ELSE ref_low END,
        ref_high = CASE WHEN ${"refHigh" in patch} THEN ${patch.refHigh ?? null} ELSE ref_high END,
        ref_text = CASE WHEN ${"refText" in patch} THEN ${patch.refText ?? null} ELSE ref_text END,
        flag = COALESCE(${patch.flag ?? null}, flag),
        collected_at = CASE WHEN ${"collectedAt" in patch} THEN ${patch.collectedAt ?? null} ELSE collected_at END,
        verified = COALESCE(${patch.verified ?? null}, verified),
        notes = CASE WHEN ${"notes" in patch} THEN ${patch.notes ?? null} ELSE notes END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *`;
    return rows[0] ? toObservation(rows[0]) : null;
  }

  async replaceDocumentObservations(documentId: string, observations: NewObservation[]): Promise<Observation[]> {
    return this.sql.begin(async (tx) => {
      await tx`DELETE FROM observations WHERE document_id = ${documentId}`;
      const created: Observation[] = [];
      for (const input of observations) {
        const [row] = await tx`
          INSERT INTO observations (
            user_id, profile_id, document_id, test_name, value_text, value_numeric,
            unit, ref_low, ref_high, ref_text, flag, collected_at, source, confidence, verified, notes
          ) VALUES (
            ${input.userId}, ${input.profileId}, ${documentId}, ${input.testName},
            ${input.valueText}, ${input.valueNumeric ?? null}, ${input.unit ?? null},
            ${input.refLow ?? null}, ${input.refHigh ?? null}, ${input.refText ?? null},
            ${input.flag ?? "unknown"}, ${input.collectedAt ?? null}, ${input.source ?? "document_extraction"},
            ${input.confidence ?? null}, ${input.verified ?? false}, ${input.notes ?? null}
          )
          RETURNING *`;
        created.push(toObservation(row));
      }
      return created;
    });
  }

  async deleteObservation(id: string): Promise<void> {
    await this.sql`DELETE FROM observations WHERE id = ${id}`;
  }

  async listTestNames(userId: string, profileId: string): Promise<string[]> {
    const rows = await this.sql`
      SELECT DISTINCT test_name FROM observations
      WHERE user_id = ${userId} AND profile_id = ${profileId}
      ORDER BY test_name ASC`;
    return rows.map((r) => r.testName ?? r.test_name);
  }

  /* ------------------------------------------------------------ medications */

  async listMedications(options: { userId: string; profileId?: string; activeOnly?: boolean }): Promise<Medication[]> {
    const rows = await this.sql`
      SELECT * FROM medications
      WHERE user_id = ${options.userId}
        AND (${options.profileId ?? null}::uuid IS NULL OR profile_id = ${options.profileId ?? null}::uuid)
        AND (${options.activeOnly ? true : null}::boolean IS NULL OR active = true)
      ORDER BY created_at DESC`;
    return rows.map(toMedication);
  }

  async getMedication(id: string): Promise<Medication | null> {
    const rows = await this.sql`SELECT * FROM medications WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toMedication(rows[0]) : null;
  }

  async createMedication(input: NewMedication): Promise<Medication> {
    const [row] = await this.sql`
      INSERT INTO medications (user_id, profile_id, name, dosage_text, schedule_text, start_date, end_date, active, prescriber, notes)
      VALUES (
        ${input.userId}, ${input.profileId}, ${input.name}, ${input.dosageText ?? null},
        ${input.scheduleText ?? null}, ${input.startDate ?? null}, ${input.endDate ?? null},
        ${input.active ?? true}, ${input.prescriber ?? null}, ${input.notes ?? null}
      )
      RETURNING *`;
    return toMedication(row);
  }

  async updateMedication(id: string, patch: MedicationPatch): Promise<Medication | null> {
    const rows = await this.sql`
      UPDATE medications SET
        name = COALESCE(${patch.name ?? null}, name),
        dosage_text = CASE WHEN ${"dosageText" in patch} THEN ${patch.dosageText ?? null} ELSE dosage_text END,
        schedule_text = CASE WHEN ${"scheduleText" in patch} THEN ${patch.scheduleText ?? null} ELSE schedule_text END,
        start_date = CASE WHEN ${"startDate" in patch} THEN ${patch.startDate ?? null} ELSE start_date END,
        end_date = CASE WHEN ${"endDate" in patch} THEN ${patch.endDate ?? null} ELSE end_date END,
        active = COALESCE(${patch.active ?? null}, active),
        prescriber = CASE WHEN ${"prescriber" in patch} THEN ${patch.prescriber ?? null} ELSE prescriber END,
        notes = CASE WHEN ${"notes" in patch} THEN ${patch.notes ?? null} ELSE notes END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *`;
    return rows[0] ? toMedication(rows[0]) : null;
  }

  async deleteMedication(id: string): Promise<void> {
    await this.sql`DELETE FROM medications WHERE id = ${id}`;
  }

  /* ------------------------------------------------------ interaction checks */

  async createInteractionCheck(input: NewInteractionCheck): Promise<InteractionCheck> {
    const [row] = await this.sql`
      INSERT INTO interaction_checks (user_id, profile_id, medication_ids, medication_names, findings, sources_used, status, disclaimer)
      VALUES (
        ${input.userId}, ${input.profileId},
        ${JSON.stringify(input.medicationIds)}::jsonb,
        ${JSON.stringify(input.medicationNames)}::jsonb,
        ${JSON.stringify(input.findings)}::jsonb,
        ${JSON.stringify(input.sourcesUsed)}::jsonb,
        ${input.status}, ${input.disclaimer}
      )
      RETURNING *`;
    return toInteractionCheck(row);
  }

  async listInteractionChecks(userId: string, profileId?: string, limit = 10): Promise<InteractionCheck[]> {
    const rows = await this.sql`
      SELECT * FROM interaction_checks
      WHERE user_id = ${userId}
        AND (${profileId ?? null}::uuid IS NULL OR profile_id = ${profileId ?? null}::uuid)
      ORDER BY created_at DESC
      LIMIT ${limit}`;
    return rows.map(toInteractionCheck);
  }

  /* -------------------------------------------------------------- assistant */

  async listConversations(userId: string, profileId?: string | null): Promise<Conversation[]> {
    const rows =
      profileId === undefined
        ? await this.sql`SELECT * FROM conversations WHERE user_id = ${userId} ORDER BY updated_at DESC`
        : await this.sql`
            SELECT * FROM conversations
            WHERE user_id = ${userId} AND profile_id IS NOT DISTINCT FROM ${profileId}::uuid
            ORDER BY updated_at DESC`;
    return rows.map(toConversation);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const rows = await this.sql`SELECT * FROM conversations WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toConversation(rows[0]) : null;
  }

  async createConversation(input: NewConversation): Promise<Conversation> {
    const [row] = await this.sql`
      INSERT INTO conversations (user_id, profile_id, title, locale)
      VALUES (${input.userId}, ${input.profileId ?? null}, ${input.title}, ${input.locale})
      RETURNING *`;
    return toConversation(row);
  }

  async updateConversation(
    id: string,
    patch: { title?: string; profileId?: string | null },
  ): Promise<Conversation | null> {
    const rows = await this.sql`
      UPDATE conversations SET
        title = COALESCE(${patch.title ?? null}, title),
        profile_id = CASE WHEN ${"profileId" in patch} THEN ${patch.profileId ?? null}::uuid ELSE profile_id END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *`;
    return rows[0] ? toConversation(rows[0]) : null;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.sql`DELETE FROM conversations WHERE id = ${id}`;
  }

  async listMessages(conversationId: string, limit = 100): Promise<AssistantMessage[]> {
    const rows = await this.sql`
      SELECT * FROM (
        SELECT * FROM messages WHERE conversation_id = ${conversationId}
        ORDER BY created_at DESC LIMIT ${limit}
      ) m ORDER BY m.created_at ASC`;
    return rows.map(toMessage);
  }

  async createMessage(input: NewMessage): Promise<AssistantMessage> {
    const [row] = await this.sql`
      INSERT INTO messages (conversation_id, role, content, citations, grounded, provider, error)
      VALUES (
        ${input.conversationId}, ${input.role}, ${input.content},
        ${JSON.stringify(input.citations ?? [])}::jsonb,
        ${input.grounded ?? false}, ${input.provider ?? null}, ${input.error ?? null}
      )
      RETURNING *`;
    await this.sql`UPDATE conversations SET updated_at = now() WHERE id = ${input.conversationId}`;
    return toMessage(row);
  }

  /* --------------------------------------------------------------- feedback */

  async createFeedback(input: NewFeedback): Promise<Feedback> {
    const [row] = await this.sql`
      INSERT INTO feedback (user_id, email, name, rating, category, message)
      VALUES (
        ${input.userId ?? null}, ${input.email ?? null}, ${input.name ?? null},
        ${input.rating ?? null}, ${input.category}, ${input.message}
      )
      RETURNING *`;
    return toFeedback(row);
  }

  /* ------------------------------------------------------------------ audit */

  async logAudit(input: {
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    meta?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.sql`
      INSERT INTO audit_events (user_id, action, entity, entity_id, meta)
      VALUES (
        ${input.userId ?? null}, ${input.action}, ${input.entity ?? null}, ${input.entityId ?? null},
        ${input.meta ? JSON.stringify(input.meta) : null}::jsonb
      )`;
  }

  async listAudit(userId: string, limit = 50): Promise<AuditEvent[]> {
    const rows = await this.sql`
      SELECT * FROM audit_events WHERE user_id = ${userId}
      ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
    return rows.map(toAudit);
  }

  /* ------------------------------------------------------------------ stats */

  async getDashboardStats(userId: string, profileId?: string): Promise<DashboardStats> {
    const profileFilter = profileId ?? null;
    const [docCounts, obsCounts, medCounts, convCounts] = await Promise.all([
      this.sql`
        SELECT count(*)::int AS n FROM documents
        WHERE user_id = ${userId} AND (${profileFilter}::uuid IS NULL OR profile_id = ${profileFilter}::uuid)`,
      this.sql`
        SELECT count(*)::int AS n FROM observations
        WHERE user_id = ${userId} AND (${profileFilter}::uuid IS NULL OR profile_id = ${profileFilter}::uuid)`,
      this.sql`
        SELECT count(*)::int AS n FROM medications
        WHERE user_id = ${userId} AND active = true
          AND (${profileFilter}::uuid IS NULL OR profile_id = ${profileFilter}::uuid)`,
      this.sql`SELECT count(*)::int AS n FROM conversations WHERE user_id = ${userId}`,
    ]);
    const recentDocs = await this.sql`
      SELECT * FROM documents
      WHERE user_id = ${userId} AND (${profileFilter}::uuid IS NULL OR profile_id = ${profileFilter}::uuid)
      ORDER BY created_at DESC LIMIT 5`;
    const recentAudit = await this.listAudit(userId, 12);
    return {
      documentCount: Number(docCounts[0]?.n ?? 0),
      observationCount: Number(obsCounts[0]?.n ?? 0),
      medicationCount: Number(medCounts[0]?.n ?? 0),
      conversationCount: Number(convCounts[0]?.n ?? 0),
      recentDocuments: recentDocs.map(toDocument),
      recentActivity: recentAudit,
    };
  }
}
