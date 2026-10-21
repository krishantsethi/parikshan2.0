# Security model

> Health data is sensitive. This document states what is implemented, how it is verified, and what is still missing. PARIKSHAN makes **no** HIPAA, GDPR, ISO 27001, ABDM, or FHIR-compliance claims.

## Threat model (summary)

| Threat | Mitigation |
| --- | --- |
| Credential stuffing / brute force | scrypt hashing, constant-time verification, dummy-hash comparison for unknown emails, per-IP rate limits on auth endpoints |
| Session theft via XSS | httpOnly + SameSite=Lax cookies, `Secure` in production, CSP (`script-src 'self'`), no tokens in localStorage |
| Session theft via DB leak | Only SHA-256 hashes of 256-bit tokens stored; DB value cannot be replayed |
| Horizontal privilege escalation | Ownership checks on every record and every query; missing vs. others' records both return 404 |
| Malicious uploads | Allowlist sniffing by magic bytes, declared-type agreement, size caps, sanitized filenames, `nosniff` + sandbox headers on download |
| Abuse of expensive endpoints | Rate limits on auth, upload, retry, AI, interaction, feedback |
| Prompt injection via documents | System prompt constrains citation/grounding; model output is plain text; citations are validated against retrieved sources |
| Secret leakage | Env-only server secrets, no `NEXT_PUBLIC_` secrets, errors return generic messages, no document text in logs |
| Account enumeration | Login and reset responses are uniform; reset does not reveal whether the email exists (except the dev-only link) |

## Implemented controls

- **Passwords:** scrypt (N=16384, r=8, p=1), unique 16-byte salt, self-describing hash format, strict parameter/hex validation before verification (prevents empty-digest "verification").
- **Sessions:** 256-bit tokens, SHA-256 at rest, server-side expiry, rotation on password reset (all sessions invalidated), logout deletes the row.
- **Authorization:** `requireUserApi/Page`, `requireOwnedProfile`, `requireOwnedDocument`, `resolveActorProfile`; store queries always filter by `user_id`/`profile_id`. Tests cover cross-account access returning 404.
- **Validation:** zod schemas; dates validated as real calendar dates; profile creation for someone else requires explicit authorization affirmation.
- **Uploads:** magic-byte allowlist, declared-type agreement, empty/oversize rejection, filename sanitization (path traversal/control chars), storage only after validation.
- **Rate limiting:** fixed-window per IP per bucket (auth 5–10/5 min, upload 10/5 min, AI 20/5 min, feedback 5/15 min).
- **Headers:** CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; download endpoint adds `Content-Security-Policy: default-src 'none'; sandbox`.
- **Audit:** security-relevant actions recorded without document content; visible to the user in Activity history; deleted with the account.
- **AI data minimization:** only retrieved excerpts for the asked question are sent; keys never reach the browser; no training pipeline exists.
- **No analytics/trackers:** no third-party scripts are loaded by the app.

## Database isolation (RLS)

`db/migrations/0002_rls.sql` enables RLS and defines policies keyed on `current_setting('app.user_id')`.

**Important:** Postgres exempts table owners from RLS. To get enforcement, connect the app as a non-owner role:

```sql
CREATE ROLE parikshan_app LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA public TO parikshan_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO parikshan_app;
```

Then run migrations as the owner and point `DATABASE_URL` at `parikshan_app`. Because the app does not currently set `app.user_id` on each query, RLS is **defense-in-depth documentation**, not the primary control: application-level ownership predicates are. If you implement per-transaction `set_config('app.user_id', …)`, the policies become active.

## Open security work (not done)

- Multi-factor authentication / passkeys.
- Shared rate-limit store (Redis/Upstash) for multi-instance correctness.
- Per-transaction `app.user_id` GUC wiring + `FORCE ROW LEVEL SECURITY` evaluation.
- Email verification and password-reset delivery.
- Security headers review for a strict nonce-based CSP (currently inline scripts require `'unsafe-inline'`).
- Dependency scanning in CI, SAST, and an independent penetration test.
- Backup/restore runbook and key-rotation procedures for the AI/OCR providers.
- Formal DPIA / legal review for the target jurisdiction.

## Responsible disclosure

Open a private security advisory on the GitHub repository rather than a public issue. Include reproduction steps and the affected commit. Do not attach real medical data.
