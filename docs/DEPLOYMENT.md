# Deployment runbook

## Vercel (Next.js)

1. **Import** the GitHub repository into Vercel.
   - Framework preset: Next.js (auto-detected)
   - Root directory: repository root
   - Build command: `npm run build`, output: `.next`
2. **Environment variables** (Project → Settings → Environment Variables):

   | Name | Value | Notes |
   | --- | --- | --- |
   | `AUTH_SECRET` | 64 hex chars (`openssl rand -hex 32`) | **Required.** Without it the app warns and uses an insecure fallback. |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` | Metadata, sitemap, reset links. |
   | `DATABASE_URL` | `postgres://…` | Enables the Postgres driver. Use a pooler-compatible connection string. |
   | `DEMO_MODE` | `true` | Seeds the demo account when the memory store is used. |
   | `UPLOAD_MAX_MB` | `4` | **Vercel caps request bodies at ~4.5 MB**; keep uploads below it. |
   | `OCR_PROVIDER` | `tesseract` or `none` | See caveats below. |
   | `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `AI_MODEL` | optional | Enables AI features. |

3. **Deploy.** First deploy can happen before the database is ready (demo mode).
4. **Migrate** the database once (from a machine with the production `DATABASE_URL`):

   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   ```

   Do not put migrations in the build step: concurrent builds would race.
5. **Verify** after deploy:
   - `GET /api/health` returns `{"status":"ok", …}` and the capability report.
   - The landing page renders with the hero (or the CSS fallback when WebGL is unavailable).
   - Demo login works (when `DATABASE_URL` is unset) or signup creates an account.
   - Upload a text-based PDF (≤ 4 MB) and confirm extraction.

## Serverless behavior to expect

- **Demo mode is per-instance memory.** Data may reset between invocations; sessions can disappear. This is documented in the UI and is the strongest reason to configure Postgres.
- **Route duration:** upload/retry/summary/assistant/export routes declare `maxDuration = 60`. Plans with lower limits should reduce OCR workload or move processing to a queue.
- **Filesystem:** no persistent disk. Uploaded bytes live in the database (`document_files.bytea`) — not on disk.
- **OCR on Vercel:** tesseract.js downloads its WASM core and language data at first use (outbound network). This works only if the function can reach that CDN and write to `/tmp`. It is **not verified in this deployment**. If image OCR is not required, set `OCR_PROVIDER=none` for predictability; digital PDFs still extract perfectly.
- **Rate limiting** is per instance. Add a shared Redis (Upstash) limiter for global limits.

## Postgres options

| Provider | Notes |
| --- | --- |
| Supabase | Project → Database → Connection string (session pooler). Run migrations as the owner. Optional: create the restricted app role for RLS enforcement. |
| Neon | Use the pooled connection string. Same migration command. |
| Self-hosted | Any Postgres 14+. Set `prepare:false` compatibility is already handled in the driver. |

### Recommended hardening

```sql
CREATE ROLE parikshan_app LOGIN PASSWORD '…';
GRANT USAGE ON SCHEMA public TO parikshan_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO parikshan_app;
-- point DATABASE_URL at parikshan_app after migrations run as the owner
```

## Other hosts

Any Node host that supports Next.js (`npm run build && npm start`) works — Fly.io, Render, Railway, a VM behind nginx. Requirements: Node 20.9+, env vars, and a Postgres instance if persistence is needed. Run migrations once per environment.

## Rollback

Vercel keeps immutable deployments: promote the previous deployment. Database migrations are additive only in the current set; a rollback beyond migration `0001` requires restoring the database from backup.

## Pre-production checklist

- [ ] `AUTH_SECRET` set (never the fallback)
- [ ] `DATABASE_URL` configured and migrated
- [ ] `UPLOAD_MAX_MB` ≤ platform body limit
- [ ] Legal documents reviewed by counsel and adapted
- [ ] Independent security review completed
- [ ] Monitoring/alerting and log retention policy decided
- [ ] Backup + restore tested
- [ ] Email delivery configured for password reset (or access to server logs accepted)
