# Known limitations

This file is intentionally uncomfortable to read. It records what is not finished, what was not verified, and what must be done before real-world use.

## Verification gaps in this build

1. **Postgres driver not run against a live database.** The driver, migrations, and RLS policies are written and reviewed, but no database credentials were available. Treat the first Postgres deployment as an integration test: run `npm run db:migrate`, then walk the manual checklist in `TESTING.md`.
2. **Live OCR not verified.** tesseract.js is wired and its pipeline contract is tested with an injected provider, but the sandbox blocks the traineddata CDN, so real image OCR was not exercised. On Vercel, OCR additionally depends on outbound CDN access and `/tmp` writes.
3. **No browser E2E or Lighthouse run.** Playwright browsers could not be downloaded. WebGL visuals, mobile drawers, and chart rendering are verified by build + code review + component tests, not by an automated browser.
4. **No live AI provider call.** Deterministic/fallback paths are tested; model output quality and citation adherence depend on the configured provider.
5. **OpenFDA lookups not exercised.** The adapter is disabled by default and the API host is outside the sandbox network allowlist.
6. **No formal accessibility audit** (axe/Lighthouse) and no screen-reader testing.

## Product boundaries

- **Not a medical device.** No regulatory clearance. No diagnosis, risk scores, treatment advice, or emergency response.
- **Interaction review is not a complete drug database.** A small curated set plus optional label-mention lookups. “No interaction found” ≠ safe. Brand-to-generic mapping is a limited beta hint and is flagged as uncertain.
- **No medication reminders or notifications.** Schedules are records, not alarms.
- **ABHA/ABDM is not connected.** Interface and required configuration only; no credentials collected.
- **FHIR export is a mapping, not a certified FHIR server.** Resources have not been validator-tested.
- **AI answers can be wrong** even when grounded; values are displayed beside explanations so they can be checked.
- **Demo mode is volatile** on serverless platforms (per-instance memory). Configure Postgres for persistence.
- **Language coverage:** UI strings are translated; marketing long-form copy, article bodies, and the curated interaction descriptions are English-only. Clinical values/units are never translated.
- **No email delivery** (password reset requires server-console access), no email verification, no MFA/passkeys, no account recovery beyond reset tokens.
- **Upload limit on Vercel** (~4.5 MB request body). Keep `UPLOAD_MAX_MB` ≤ 4 there.
- **Scanned PDFs are not rasterized server-side**; upload page images instead.
- **Rate limiting is per instance** and in-memory.
- **No streaming AI responses**, no tool use, no medical-reference retrieval (no guideline corpus).
- **Search** is substring-based (title/filename); no full-text search over document text.
- **Single-tenant codebase:** no organizations, sharing, or clinician accounts.

## Legal / compliance

- Privacy policy, terms, and disclaimer are **engineering drafts** and must be reviewed by qualified counsel in the target jurisdiction.
- No HIPAA/GDPR/ISO/DPDP “compliance” is claimed; organizational controls (DPIA, DPA, grievance officer, breach process, retention schedule) are outside this repository.
- Medical education content (blog/resources) was written by the engineering team and is **not clinically reviewed**; each article states this.

## Operational risks

- Secrets management, backups, monitoring, and incident response are the deployer's responsibility.
- The AI provider receives record excerpts for inference; review that provider's data-processing terms before production use.
- Dependency risk: the app depends on pdf.js, tesseract.js, and a model provider; pin/scan dependencies in CI.
