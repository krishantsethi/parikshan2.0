#!/usr/bin/env node
/**
 * Seeds the clearly-labeled demo workspace into a *Postgres* database.
 *
 *   DATABASE_URL=postgres://... npm run db:seed:demo -- --i-understand-this-is-sample-data
 *
 * Everything seeded is FICTIONAL and titled "SAMPLE —". Refuse to run without
 * the explicit flag so nobody accidentally pollutes a real database.
 */
import { createHash, randomBytes, scryptSync } from "node:crypto";
import postgres from "postgres";

const FLAG = "--i-understand-this-is-sample-data";
if (!process.argv.includes(FLAG)) {
  console.error(`Refusing to run: pass ${FLAG} to confirm this is a demonstration database.`);
  process.exit(1);
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", 16384, 8, 1, salt.toString("hex"), derived.toString("hex")].join("$");
}

const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

try {
  const existing = await sql`SELECT id FROM users WHERE email = 'demo@parikshan.health'`;
  if (existing.length > 0) {
    console.log("Demo user already exists — nothing to do.");
    await sql.end();
    process.exit(0);
  }

  const [user] = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES ('demo@parikshan.health', 'Demo Explorer', ${hashPassword("Demo@1234")})
    RETURNING id`;

  const [profile] = await sql`
    INSERT INTO profiles (owner_id, name, relation, dob, sex, blood_group, notes, is_primary)
    VALUES (${user.id}, 'Aarav (Demo)', 'self', '1992-05-14', 'male', 'B+',
            'Demo sample profile — fictional person.', true)
    RETURNING id`;

  const [doc] = await sql`
    INSERT INTO documents (user_id, profile_id, title, original_filename, mime, size_bytes, category, status,
                           ocr_engine, text_confidence, pages, text_length, summary, summary_kind)
    VALUES (${user.id}, ${profile.id}, 'SAMPLE — Lipid Profile', 'sample-lipid-profile.pdf', 'application/pdf',
            41902, 'lab_report', 'ready', 'pdf_text', 0.96, 1, 320,
            'Demo sample report. Total cholesterol 212 mg/dL and LDL 138 mg/dL are above the desirable limits printed on the report; HDL 44 mg/dL is within the desirable band; triglycerides 165 mg/dL are above the stated normal limit. Fictional sample data.',
            'structured_digest')
    RETURNING id`;

  await sql`
    INSERT INTO document_texts (document_id, text, engine, confidence)
    VALUES (${doc.id}, ${`SAMPLE CITY DIAGNOSTIC LAB — Demo specimen, fictional data
Patient: Aarav (Demo)   Date: ${isoDaysAgo(7)}
LIPID PROFILE
Total Cholesterol    212    mg/dL       Desirable: < 200
LDL Cholesterol      138    mg/dL       Optimal: < 100
HDL Cholesterol      44     mg/dL       Desirable: > 40
Triglycerides        165    mg/dL       Normal: < 150`}, 'pdf_text', 0.96)`;

  const observations = [
    ["Total Cholesterol", "212", 212, "mg/dL", null, 200, "Desirable: < 200 mg/dL", "high"],
    ["LDL Cholesterol", "138", 138, "mg/dL", null, 100, "Optimal: < 100 mg/dL", "high"],
    ["HDL Cholesterol", "44", 44, "mg/dL", 40, null, "Desirable: > 40 mg/dL", "normal"],
    ["Triglycerides", "165", 165, "mg/dL", null, 150, "Normal: < 150 mg/dL", "high"],
  ];
  for (const [name, valueText, value, unit, refLow, refHigh, refText, flag] of observations) {
    await sql`
      INSERT INTO observations (user_id, profile_id, document_id, test_name, value_text, value_numeric,
                                unit, ref_low, ref_high, ref_text, flag, collected_at, source, verified, notes)
      VALUES (${user.id}, ${profile.id}, ${doc.id}, ${name}, ${valueText}, ${value}, ${unit},
              ${refLow}, ${refHigh}, ${refText}, ${flag}, ${isoDaysAgo(7)}, 'reviewed', true,
              'Demo sample value (fictional).')`;
  }

  await sql`
    INSERT INTO medications (user_id, profile_id, name, dosage_text, schedule_text, start_date, active, prescriber, notes)
    VALUES (${user.id}, ${profile.id}, 'Metformin', '500 mg', '1-0-1 (after meals)', ${isoDaysAgo(120)}, true,
            'Dr. R. Mehta (Demo)', 'Demo sample medication (fictional).')`;
  await sql`
    INSERT INTO medications (user_id, profile_id, name, dosage_text, schedule_text, start_date, active, prescriber, notes)
    VALUES (${user.id}, ${profile.id}, 'Aspirin', '75 mg', 'Once daily (night)', ${isoDaysAgo(120)}, true,
            'Dr. R. Mehta (Demo)', 'Demo sample medication (fictional).')`;

  console.log("Demo workspace seeded: demo@parikshan.health / Demo@1234 (SAMPLE data only).");
} catch (error) {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

// Keep createHash imported only if used above (avoid unused import lint in plain node).
void createHash;
