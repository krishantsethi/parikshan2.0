# Architecture

## Goals and constraints

1. **Correctness over impressiveness** — every health value shown must be traceable to a source document and a human confirmation.
2. **One deployable** — Next.js server rendering + route handlers cover the whole backend; no microservices to babysit.
3. **Honest degradation** — missing credentials disable a feature with an explanation; they never produce fake output.
4. **Adapter boundaries** — storage, OCR, AI, and interoperability are interfaces so providers can change without touching the product layer.

## Runtime layers

### Presentation

- App Router with React Server Components. Data is fetched on the server through the store layer; client components receive plain, serializable props.
- Route groups: `(public)` marketing, `(auth)` authentication, `dashboard` authenticated workspace.
- Client-side concerns are isolated: theme/locale/toast providers, upload progress (XHR), Recharts, chat, dialogs.
- The WebGL hero is a dynamic, client-only chunk with a CSS/SVG fallback selected by `useReducedMotion`, WebGL capability detection, and viewport size.

### Server services (`src/server`)

| Module | Responsibility |
| --- | --- |
| `auth/` | scrypt hashing, opaque session tokens (SHA-256 at rest), `requireUserApi/Page`, ownership guards (`requireOwnedProfile`, `requireOwnedDocument`) |
| `validation/` | zod schemas for every mutating endpoint, including cross-field rules (e.g., family authorization) |
| `security/` | fixed-window rate limiting, magic-byte upload validation, filename sanitization |
| `documents/` | PDF text extraction, OCR provider, normalization, classification, deterministic parsing, pipeline orchestration, persistence |
| `ai/` | OpenAI-compatible provider, prompts, grounded retrieval, citation mapping, document explanations |
| `medications/` | name normalization, curated interaction dataset, optional OpenFDA adapter, review orchestration |
| `interop/` | FHIR R4-shaped export mapping, ABDM boundary (not connected) |
| `db/` | `DataStore` contract with Postgres and in-memory drivers |

### Persistence

`DataStore` is a single interface implemented twice:

- **Postgres** (`postgres.js`) — schema and policies in `db/migrations`. The driver deliberately passes `prepare: false` for PgBouncer/Supabase pooler compatibility, transforms snake_case columns to camelCase, and normalizes `date` columns to ISO strings.
- **Memory** — used for demo mode and tests; seeded with clearly-labeled fictional data. Volatile by design.

The store never decides authorization. Service functions and guards enforce ownership; every SQL query additionally filters by `user_id` / `profile_id`. RLS policies provide defense-in-depth when the connecting role is not the table owner.

## Core data model

```
users ──< sessions
      ──< password_reset_tokens
      ──< profiles ──< documents ──< document_files (bytea)
      │                 │        └──< document_texts
      │                 └──< observations
      ├──< medications          └── interaction_checks
      ├──< conversations ──< messages
      ├──< feedback
      └──< audit_events
```

Design notes:

- `documents` belongs to both `users` and `profiles`; cascade deletes flow from both.
- `observations` preserve the printed unit/range (`value_text`, `unit`, `ref_text`, `ref_low`, `ref_high`) alongside a numeric projection. The numeric value is **never** produced by unit conversion.
- `flag` is derived from the source's own reference range only; without a range it is `unknown`.
- JSONB is used for citation/finding arrays and audit metadata (no querying needs beyond retrieval).
- Timestamps are `timestamptz`; dates of collection are `date` and surfaced as ISO strings.

## Document pipeline

```
bytes
 ├─ magic-byte validation (PDF/PNG/JPEG/WebP, size cap)
 ├─ PDF → pdf.js text layer (layout-aware line reconstruction)
 │    └─ no text layer → explicit pdf_no_text failure (no fake OCR)
 ├─ image → tesseract.js OCR (local) with confidence
 ├─ normalize (whitespace/dashes only; never rewrites tokens)
 ├─ classify (weighted keyword scoring + margin-based confidence)
 ├─ extract (line parser → value, unit, printed range, flag, confidence)
 ├─ medication lines (only when prescription-like)
 └─ deterministic digest → stored; AI explanation is a separate, user-triggered step
```

Extraction heuristics and their failure modes are documented in [`OCR-PIPELINE.md`](OCR-PIPELINE.md).

## AI design

Retrieval is deterministic and auditable:

1. Load only the active profile's documents, observations, and active medications.
2. Score observations/documents by token overlap with the question plus recency; always include active medications.
3. Number sources `[S1]…` with labels and provenance.
4. The model must cite those tags; the UI maps tags back to records and silently drops invented tags.
5. Without an AI key, the same retrieval produces a factual digest that says AI is not configured.

There is no vector database. For a personal record set this is both sufficient and easier to reason about; a retrieval adapter boundary exists if corpus sizes grow.

## Request lifecycle (example: upload)

```
POST /api/documents/upload (multipart)
  → requireUserApi (401 if anonymous)
  → rate limit (10 / 5 min / IP)
  → ownership check on profileId
  → validateUpload (size + magic bytes + declared type)
  → createDocument (status=processing) + saveFile
  → processDocumentBytes (pure pipeline)
  → persist text, replace extracted observations (unverified)
  → status=needs_review, deterministic digest, processing warnings
  → audit events (uploaded, processed)
```

The response includes the document id and a processing summary. The client navigates to the review screen where a human confirms each value; confirmation recomputes flags server-side and marks observations verified.

## Why no Python service

Every processing step is available in Node (pdf.js, tesseract.js, deterministic parsing, HTTP AI clients). A second service would add a deployment, a network hop, and a second auth boundary without adding capability. The integration seams (`OcrProvider`, `AiProvider`, `DataStore`) make a Python worker viable later — for example, for PDF rasterization with a native canvas or a heavier OCR model.
