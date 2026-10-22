# PARIKSHAN — Personal Health Intelligence

A privacy-first platform that turns scattered medical documents into understandable, verifiable, and trackable personal health intelligence.

Built from an empty repository as a complete Next.js application: cinematic marketing site, authenticated workspace, deterministic document extraction, grounded AI with citations, family profiles, bilingual UI (English / हिन्दी), FHIR-shaped export, and a real test suite.

> **PARIKSHAN is not a medical device.** It organizes records, explains what documents say, and tracks confirmed measurements. It does not diagnose, treat, or replace a clinician. See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) and `/disclaimer`.

---

## What is actually implemented

Status legend: **Verified** = implemented and exercised by tests or live smoke tests in this environment · **Configured** = real integration that needs a credential · **Unverified** = implemented but not executable in this sandbox · **Boundary** = interface + documentation only.

| Capability | Status | Notes |
| --- | --- | --- |
| Cinematic WebGL hero (R3F) | Verified (build + live preview) | Dynamically imported; CSS/SVG fallback for reduced motion, viewports ≤ 380px, or no WebGL. Gate lowered from 640px so the 3D core reaches phones and sandbox preview panels. |
| Preview embedding & cross-origin login | Verified (live) | `FRAME_ANCESTORS` / `NEXT_PUBLIC_COOKIE_SAME_SITE` env switches. Motion is fail-open (SSR never emits `opacity:0`); session cookie uses `SameSite=None; Secure` when framed cross-origin. Defaults stay hardened. |
| Marketing pages (12) + blog/resources | Verified | Real content, sitemap, robots, JSON-LD FAQ, OG metadata. |
| Auth (signup/login/logout/reset) | Verified | scrypt hashing, hashed session tokens, httpOnly cookies, rate limits; live smoke-tested. |
| Password reset email delivery | Boundary | Token flow works; no mail provider configured (dev console link). See `docs/AUTH.md`. |
| Postgres data store + migrations + RLS SQL | Verified (impl) / Requires DB | Migrations and driver written; **not run against a live Postgres in this sandbox**. Demo uses in-memory store. |
| Document upload + magic-byte validation | Verified | Live upload of a real PDF; invalid types rejected with 415; 10 MB cap. |
| Digital PDF text extraction (pdf.js) | Verified | Live extraction of all 4 values from a generated PDF. |
| Image OCR (tesseract.js) | Unverified | Provider + pipeline implemented and contract-tested; tesseract language data CDN is blocked in this sandbox. |
| Deterministic lab extraction + review | Verified | Units/ranges/flags per printed source; 20+ unit tests; live confirm flow. |
| AI report explanations | Configured | OpenAI-compatible; without a key a clearly labeled deterministic digest is shown. |
| Grounded assistant with citations | Verified (no-key mode) | Retrieval scoped by profile; citations mapped to real records; invented tags dropped. |
| Medication records | Verified | CRUD + ownership checks + audit. |
| Interaction review (curated + optional OpenFDA) | Verified (curated) / Unverified (OpenFDA) | Curated dataset tested; OpenFDA adapter implemented, live calls not exercised (network policy). |
| Health trends (Recharts) | Verified | Real saved measurements only; mismatched units excluded, not converted. |
| Family profiles + authorization | Verified | Isolation and cascade tests; explicit authorization affirmation required. |
| English/Hindi i18n | Verified | 440+ keys with parity tests; clinical values never translated. |
| Calculators (BMI/BMR/TDEE/macros/LBM/eGFR) | Verified | Published formulas, unit-tested, limitations shown. |
| FHIR R4-shaped export | Verified (impl) | Export-only mapping; **not** a certified FHIR server. |
| Data export / account deletion | Verified | Cascading deletion tested; JSON export live. |
| ABHA / ABDM | Boundary | Interface + required credential list only. No live connectivity claimed. |
| E2E browser tests / Lighthouse | Not run | No browser automation or Lighthouse available in this environment. |

---

## Architecture at a glance

```
┌──────────────────────────── Next.js 15 (App Router, RSC) ───────────────────────────┐
│  Public site (SSR)        Auth (cookie sessions)        Dashboard (server-rendered)  │
│  R3F hero / CSS fallback  scrypt + hashed tokens        Charts / upload / review UI  │
└───────────────────────────────────┬──────────────────────────────────────────────────┘
                                    │ typed fetch → Route Handlers (Node runtime)
┌───────────────────────────────────▼──────────────────────────────────────────────────┐
│  Service layer                                                                       │
│  auth · validation (zod) · rate limit · audit · upload validation (magic bytes)       │
│  document pipeline: pdf.js / tesseract → normalize → classify → parse → digest        │
│  AI: provider adapter → grounded retrieval → citations → answer                      │
│  medications: normalized matching → curated dataset (+ optional OpenFDA)              │
│  interop: FHIR mapping · ABDM boundary (not connected)                                │
└───────────────────────────────────┬──────────────────────────────────────────────────┘
                                    │ DataStore interface
                ┌───────────────────▼──────────────────┐   ┌───────────────────────────┐
                │ Postgres driver (postgres.js)        │   │ In-memory demo driver      │
                │ migrations + RLS policies in db/     │   │ volatile, seeded SAMPLE    │
                └──────────────────────────────────────┘   └───────────────────────────┘
```

**Decision record:** Next.js-only backend. A separate FastAPI service was considered and rejected: everything here (PDF parsing, OCR, retrieval, auth) runs in Node, and a second deployable would add operational risk without capability. The OCR and AI layers are interface-based so a Python service can be introduced at the boundary later.

---

## Quick start

Requirements: Node.js ≥ 20.9, npm. No database or API keys needed to explore.

```bash
npm install
cp .env.example .env.local     # optional for demo mode
npm run dev                    # http://localhost:3000
```

Demo workspace (in-memory, fictional `SAMPLE —` records):

```
email:    demo@parikshan.health
password: Demo@1234
```

Or click **“Explore the demo workspace”** on `/login`.

> Demo data lives in server memory. It resets when the process restarts and is per-instance on serverless platforms. Configure `DATABASE_URL` for persistence — see below.

### With Postgres (production path)

```bash
# 1. Create a Postgres database (Supabase, Neon, or any Postgres 14+)
export DATABASE_URL="postgres://user:pass@host:5432/postgres"
npm run db:migrate            # applies db/migrations/*.sql

# 2. Optional: seed the fictional demo workspace
npm run db:seed:demo -- --i-understand-this-is-sample-data

# 3. Required in production
export AUTH_SECRET="$(openssl rand -hex 32)"
npm run build && npm start
```

Optional integrations are all fail-closed and honest: without `OPENAI_API_KEY` the assistant returns a record digest and says AI is not configured; without `OCR_PROVIDER` images are rejected with an explanation.

---

## Configuration

All variables are documented in [`.env.example`](.env.example). Never commit real values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Production | Session/password-reset signing material (32 random bytes). |
| `DATABASE_URL` | Production persistence | Postgres connection string; enables the Postgres driver. |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical URL for metadata, sitemap, reset links. |
| `SESSION_TTL_HOURS` | No | Session lifetime (default 168 h). |
| `UPLOAD_MAX_MB` | No | Per-file cap 1–25 MB (default 10). |
| `OPENAI_API_KEY` | No | Enables AI explanations + assistant generation. |
| `OPENAI_BASE_URL`, `AI_MODEL`, `AI_MAX_TOKENS` | No | OpenAI-compatible endpoint/model settings. |
| `OCR_PROVIDER` | No | `tesseract` (default) or `none`. |
| `OCR_LANGUAGES` | No | tesseract language codes (default `eng`). |
| `OPENFDA_ENABLED`, `OPENFDA_API_KEY` | No | Optional live FDA label lookups for interactions. |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_SECONDS` | No | In-memory rate-limit defaults. |
| `DEMO_MODE` | No | Seeds the demo workspace in the memory driver. |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (type-checks during build) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint, zero warnings tolerated |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest unit + integration + component tests |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:seed:demo` | Seed fictional demo data into Postgres (explicit flag required) |
| `npm run format` | Prettier |

---

## Testing

```bash
npm test          # 148 tests across 16 files
npm run lint
npm run typecheck
npm run build
```

What the suite covers: lab parsing (units, ranges, flags, dates, names), medication extraction, document classification, PDF extraction, the OCR pipeline contract, password hashing, validation schemas, rate limiting, upload validation, store ownership/cascades, the document service end-to-end, interaction matching, FHIR mapping, assistant retrieval/citations/emergency handling, i18n parity, and UI component behavior.

Detailed matrix and unexecuted tests: [`docs/TESTING.md`](docs/TESTING.md).

---

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers, data flow, data model, decisions |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, controls, RLS setup, open risks |
| [`docs/AUTH.md`](docs/AUTH.md) | Session design, password reset, mail wiring |
| [`docs/OCR-PIPELINE.md`](docs/OCR-PIPELINE.md) | Extraction heuristics, confidence, failure modes |
| [`docs/AI.md`](docs/AI.md) | Grounding contract, prompts, provider setup |
| [`docs/INTEROPERABILITY.md`](docs/INTEROPERABILITY.md) | FHIR mapping scope, ABDM boundary |
| [`docs/TESTING.md`](docs/TESTING.md) | Verified vs unverified coverage |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel + Postgres runbook |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design tokens, motion, accessibility |
| [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) | Known gaps, stated plainly |

---

## Project structure

```
src/
  app/
    (public)/        marketing, blog, legal, tools, feedback, contact
    (auth)/          login, signup, password reset
    dashboard/       authenticated workspace (14 routes)
    api/             route handlers (auth, documents, observations, meds, assistant, export…)
  components/        UI primitives, dashboard, documents, trends, assistant, VFX
  content/           FAQ + original articles (typed, no CMS)
  i18n/              typed en/hi dictionaries + providers
  lib/               env config, calculators, formatters, medication normalization
  server/
    auth/            scrypt, sessions, guards
    ai/              provider adapter, prompts, retrieval, summaries
    documents/       pdf.js, OCR, classifier, extraction, pipeline, service
    db/              DataStore contract, memory + Postgres drivers
    medications/     curated dataset, OpenFDA adapter, review orchestration
    interop/         FHIR mapping, ABDM boundary
    security/        rate limiting, upload validation
    validation/      zod schemas
db/migrations/       schema + RLS policies
tests/               unit, integration, component, helpers
docs/                architecture & operations documentation
scripts/             migration + demo seed runners
```

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full runbook.

**Status of this build:** a Vercel project (`parikshan`) has been created and configured
(`AUTH_SECRET`, `DEMO_MODE=true`, `UPLOAD_MAX_MB=4`, `OCR_PROVIDER=tesseract`), but the deployment
could not be triggered from this environment: the Vercel connector rejects both the documented and
the string form of `git_source`, and a files-only deployment of the whole source is not possible in a
single call. No deployment URL is claimed until one is verified.

**Two-minute manual path (owner):**

1. Open the existing Vercel project **parikshan** → Settings → Git → connect
   `krishantsethi/parikshan2.0`, and set the production branch to
   `arena/2fbf9278-parikshan2-0` (or merge the open pull request into `main` first and use `main`).
2. Trigger a deployment. Environment variables are already configured in the project.
3. Set `NEXT_PUBLIC_APP_URL` to the assigned domain and redeploy so metadata, sitemap, and reset
   links use the canonical URL.
4. Optional persistence: create a Postgres database, add `DATABASE_URL`, and run
   `npm run db:migrate` once.

Demo mode works with no additional configuration, but its data is per-instance memory and may reset.

---

## Security & privacy

Health data is sensitive. Implemented: server-side ownership checks on every record, scrypt password hashing, hashed session tokens with server-side expiry, httpOnly/SameSite cookies, magic-byte upload validation, rate limits, security headers, no medical content in logs, cascading deletion, and full JSON export. Known gaps (MFA, shared rate-limit store, penetration testing, certifications) are listed in [`docs/SECURITY.md`](docs/SECURITY.md) and on `/security`. **No HIPAA/GDPR/ISO/ABDM certification is claimed.**

## License

No license has been specified by the repository owner. Add one before distributing.
