# Authentication & sessions

## Flow

1. **Signup** (`POST /api/auth/signup`)
   - zod validation (name, email normalization, password ≥ 8, disclaimer acknowledgement)
   - duplicate email → 409
   - `scrypt` hash → `users` row
   - an initial primary profile is created (`relation: "self"`) so the workspace is usable immediately
   - session established, audit event written
2. **Login** (`POST /api/auth/login`)
   - always runs a scrypt verification (against a dummy hash when the email is unknown) so timing does not reveal account existence
   - on success: new session row + cookie
3. **Session resolution** (`src/server/auth/session.ts`)
   - cookie `pk_session` (httpOnly, SameSite=Lax, Secure in production, 7-day default TTL)
   - embedded/preview mode (`NEXT_PUBLIC_COOKIE_SAME_SITE=none`): SameSite=None,
     Secure forced, and `Partitioned` (CHIPS) so browsers that block third-party
     cookies still keep the session inside the frame. Preview-only posture.
   - server hashes the token (SHA-256) and looks up a non-expired row, then loads the user
   - `getCurrentUser()` is memoized per request with React `cache()`
4. **Logout** deletes the session row and clears the cookie.
5. **Password reset**
   - `POST /api/auth/forgot-password` → 64-char random token, stored as SHA-256 hash with 1-hour expiry; response is uniform whether the email exists
   - `POST /api/auth/reset-password` → validates token, hashes the new password, consumes the token, **deletes all sessions for that user**
   - The reset URL is printed to the server console. In development the JSON response also includes `devResetUrl` for testing; production never returns it.

## Email delivery is not configured

There is no mail provider in this deployment. To add one:

1. Choose a provider (e.g., Resend, Postmark, SES) and add its server-side key to the environment.
2. In `src/app/api/auth/forgot-password/route.ts`, replace the console log with a provider call, sending the URL built from `NEXT_PUBLIC_APP_URL`.
3. Rate-limit remains in place; keep responses uniform to avoid enumeration.
4. Remove `devResetUrl` from the production path entirely if you prefer.

Until then, **password reset requires server-console access** — an honest limitation documented in the UI.

## Session security properties

| Property | Value |
| --- | --- |
| Token entropy | 256 bits (`randomBytes(32)`) |
| Stored form | SHA-256 hex (unique index) |
| Cookie flags | httpOnly, SameSite=Lax, Secure (prod), Path=/ — or SameSite=None; Secure; Partitioned in embedded preview mode |
| Server-side expiry | yes (`expires_at`, checked on lookup) |
| Invalidation on password change | all sessions deleted |
| Session cap | none (rows expire; expired rows are cleaned opportunistically) |

## Guard helpers

```ts
requireUserApi()            // 401 ApiError for route handlers
requireUserPage()           // redirect("/login") for pages
requireOwnedProfile(userId, profileId)   // 404 on missing/foreign
requireOwnedDocument(userId, documentId) // 404 on missing/foreign
resolveActorProfile(userId, profileId?)  // explicit or primary profile
```

Never rely on UI visibility for authorization. Every mutation route calls a guard and re-checks ownership in the store query.

## Known gaps

- No email verification, MFA, passkeys, or account lockout beyond IP rate limiting.
- No CSRF token: the app relies on SameSite=Lax cookies plus JSON-only POST endpoints (multipart upload is also same-site-only via SameSite). A dedicated CSRF token is recommended before exposing state-changing GET endpoints or relaxing SameSite. In embedded preview mode (`COOKIE_SAME_SITE=none`) the SameSite mitigation is intentionally reduced; `Partitioned` scopes the session to the embedding top-level site, and the mode is documented as preview-only — never for real patient data.
- Cross-origin preview frames: browsers that block third-party cookies by default would drop the session even with SameSite=None; Secure; Partitioned. Auth actions therefore call the Storage Access API (`document.requestStorageAccess()`) from the click gesture, and `StorageAccessNotice` explains the situation with a first-party "open in a full tab" escape hatch instead of failing silently. Where the API is absent behaviour is unchanged.
- Rate limits are per instance (in-memory). Use a shared store for multi-instance deployments.
