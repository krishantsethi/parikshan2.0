#!/usr/bin/env node
/**
 * PARIKSHAN migration runner.
 *
 *   DATABASE_URL=postgres://... npm run db:migrate
 *
 * Applies every db/migrations/*.sql file (in lexicographic order) exactly
 * once, tracked in schema_migrations. Each file runs inside a transaction.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "db", "migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Nothing to migrate (demo mode uses an in-memory store).");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 20 });

try {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`;

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set((await sql`SELECT id FROM schema_migrations`).map((r) => r.id));

  let count = 0;
  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    if (applied.has(id)) {
      console.log(`skip  ${id} (already applied)`);
      continue;
    }
    const statements = await readFile(join(migrationsDir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(statements);
      await tx`INSERT INTO schema_migrations (id) VALUES (${id})`;
    });
    console.log(`apply ${id}`);
    count++;
  }
  console.log(count === 0 ? "Database is up to date." : `Applied ${count} migration(s).`);
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
