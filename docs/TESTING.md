# Testing & verification

## Executed in this environment

| Command | Result |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit`, strict) | ✅ no errors |
| `npm run lint` (ESLint, zero warnings) | ✅ no errors |
| `npm test` (Vitest) | ✅ **148 passed** across 16 files |
| `npm run build` (`next build`) | ✅ compiled + type-checked + 42 pages generated |
| Live smoke test against `next start` | ✅ 15/15 checks (see below) |

### Test inventory

| File | What it proves |
| --- | --- |
| `tests/unit/extract-lab.test.ts` | Units (`mg/dL` vs `g/dL`), comma counts, ranges (2-sided/upper/lower), flags from stated ranges, dates (ISO, day-first ambiguity, impossible), name aliasing, dedupe |
| `tests/unit/calculators.test.ts` | BMI (WHO + South Asian), Mifflin-St Jeor BMR, TDEE factors, macros summing to calories, Boer LBM, CKD-EPI eGFR, unit converters, input validation |
| `tests/unit/documents.test.ts` | Normalization, classification of 8 categories, medication extraction, digest wording, **real PDF extraction**, empty-PDF failure, OCR pipeline contract (success/low-confidence/unavailable/empty) |
| `tests/unit/auth.test.ts` | scrypt hash format/uniqueness, verification, unicode normalization, malformed-hash rejection, token entropy/hashing |
| `tests/unit/files.test.ts` | Magic-byte sniffing, path traversal/control chars, MIME mismatch, unsupported content, oversize rejection |
| `tests/unit/validation.test.ts` | Email normalization, disclaimer requirement, family authorization rule, real-date checks, bounds |
| `tests/unit/i18n.test.ts` | en/hi key parity, no empty values, actual translation, interpolation, unknown key fallback |
| `tests/unit/rate-limit.test.ts` | Allow/deny/window isolation/remaining |
| `tests/unit/medications.test.ts` | Name normalization (forms/strengths/salts/brands), alias boundaries, curated interaction matching (warfarin+aspirin, SSRI+tramadol), no self-interaction, uncertain names, brand warnings |
| `tests/unit/fhir.test.ts` | Patient/Observation/DocumentReference/MedicationStatement mapping, preliminary vs final, demo tags, bundle assembly |
| `tests/unit/assistant.test.ts` | Profile-scoped retrieval (no leakage), invented-citation dropping, deterministic answers, no-record handling, Hindi localization, emergency detection/prefix |
| `tests/unit/memory-store.test.ts` | Email normalization, session expiry, reset-token use, primary profile rules, ownership scoping, cascades (profile/account), document filters, observation replacement/verification, conversation ordering, stats scoping, audit ordering |
| `tests/integration/document-service.test.ts` | Upload → validate → store → pipeline → observations (correct units/flags/dates) → audit; empty-PDF failure; invalid upload creates nothing; retry; cross-owner retry denied |
| `tests/components/ui.test.tsx` | Button loading/busy semantics, Alert roles, Badge/EmptyState rendering |
| `tests/components/faq-explorer.test.tsx` | Search filtering across Q/A, empty state + reset, accessible `aria-expanded` accordion behavior |
| `tests/components/theme-toggle.test.tsx` | Theme switch updates the document + persists a cookie |

Test helpers generate **real PDF bytes** (`tests/helpers/pdf.ts`) so pdf.js runs for real rather than being mocked.

### Live smoke test (executed against `next start`)

Public pages (200), robots/sitemap, dashboard redirect when anonymous, 401 for anonymous APIs, 404 page, demo login, all 11 authenticated pages, assistant request, **PDF upload with 4/4 values extracted**, document page, authenticated download, unauthenticated download 401, invalid upload 415, interaction review, JSON export, FHIR export, feedback validation, second-account signup, cross-account PATCH/DELETE/interaction 404, AI summary honestly reporting `configured:false`, confirm flow with server-recomputed flags, logout + post-logout redirect.

## Not executed (and why)

| Check | Reason |
| --- | --- |
| Browser E2E (Playwright) | Browser binaries cannot be downloaded in this sandbox (network allowlist). |
| Live tesseract OCR | Traineddata CDN unreachable; contract tested with an injected provider instead. |
| Postgres migrations against a live database | No database credentials available. SQL is written and reviewed; the Postgres driver is **not** runtime-verified here. |
| Live OpenFDA lookups | `api.fda.gov` is not in the sandbox allowlist. Adapter is disabled by default. |
| Real AI provider call | No API key provided. Deterministic paths are verified. |
| Lighthouse / Core Web Vitals | No browser. Build sizes are reported by Next. |
| Accessibility audit tooling (axe) | Not installed; semantic/keyboard behaviors are covered by component tests and manual markup review. |

## Manual QA checklist for a human reviewer

1. Sign up, complete onboarding, reload — session persists.
2. Upload a digital PDF from your lab; confirm values; see the trend update.
3. Upload a photo of a report (requires working OCR in your environment).
4. Run an interaction review with two real medication names.
5. Switch the interface to हिन्दी and verify navigation + dashboard text, with values unchanged.
6. Toggle light/dark; verify contrast and charts.
7. Resize to mobile: drawer navigation, upload, chat, and trend table.
8. Export JSON; delete the account; confirm the session is gone.
