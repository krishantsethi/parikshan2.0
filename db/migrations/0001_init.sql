-- PARIKSHAN initial schema
-- Postgres 14+ (Supabase / Neon / RDS compatible).
-- Applied by `npm run db:migrate` (see scripts/migrate.mjs).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id         text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  locale        text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'hi')),
  theme         text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens(user_id);

-- ---------------------------------------------------------------- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                      text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  relation                  text NOT NULL CHECK (relation IN ('self','spouse','child','parent','sibling','grandparent','other')),
  dob                       date,
  sex                       text CHECK (sex IN ('male','female','other')),
  blood_group               text CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-') OR blood_group IS NULL),
  notes                     text,
  authorization_affirmed_at timestamptz,
  is_primary                boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_owner_idx ON profiles(owner_id);

-- --------------------------------------------------------------- documents
CREATE TABLE IF NOT EXISTS documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title             text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  original_filename text NOT NULL,
  mime              text NOT NULL,
  size_bytes        bigint NOT NULL CHECK (size_bytes >= 0),
  category          text NOT NULL DEFAULT 'other'
                    CHECK (category IN ('lab_report','prescription','discharge_summary','imaging_report','vaccination','invoice','insurance','other')),
  status            text NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing','ready','needs_review','failed')),
  error_message     text,
  ocr_engine        text,
  text_confidence   double precision CHECK (text_confidence IS NULL OR (text_confidence >= 0 AND text_confidence <= 1)),
  pages             integer CHECK (pages IS NULL OR pages >= 0),
  text_length       integer NOT NULL DEFAULT 0,
  summary           text,
  summary_kind      text CHECK (summary_kind IN ('ai','structured_digest') OR summary_kind IS NULL),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS documents_profile_idx ON documents(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);

CREATE TABLE IF NOT EXISTS document_files (
  document_id uuid PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  mime        text NOT NULL,
  content     bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_texts (
  document_id uuid PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  text        text NOT NULL,
  engine      text NOT NULL CHECK (engine IN ('pdf_text','ocr_tesseract','manual')),
  confidence  double precision CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------ observations
CREATE TABLE IF NOT EXISTS observations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_id   uuid REFERENCES documents(id) ON DELETE CASCADE,
  test_name     text NOT NULL CHECK (char_length(test_name) BETWEEN 1 AND 200),
  value_text    text NOT NULL,
  value_numeric double precision,
  unit          text,
  ref_low       double precision,
  ref_high      double precision,
  ref_text      text,
  flag          text NOT NULL DEFAULT 'unknown' CHECK (flag IN ('low','normal','high','unknown')),
  collected_at  date,
  source        text NOT NULL DEFAULT 'manual' CHECK (source IN ('document_extraction','manual','reviewed')),
  confidence    double precision CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  verified      boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS observations_lookup_idx
  ON observations(user_id, profile_id, test_name, collected_at DESC);
CREATE INDEX IF NOT EXISTS observations_document_idx ON observations(document_id);

-- ------------------------------------------------------------- medications
CREATE TABLE IF NOT EXISTS medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  dosage_text   text,
  schedule_text text,
  start_date    date,
  end_date      date,
  active        boolean NOT NULL DEFAULT true,
  prescriber    text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS medications_user_idx ON medications(user_id, profile_id);

-- ------------------------------------------------------ interaction checks
CREATE TABLE IF NOT EXISTS interaction_checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_ids   jsonb NOT NULL DEFAULT '[]',
  medication_names jsonb NOT NULL DEFAULT '[]',
  findings         jsonb NOT NULL DEFAULT '[]',
  sources_used     jsonb NOT NULL DEFAULT '[]',
  status           text NOT NULL CHECK (status IN ('complete','partial','unavailable')),
  disclaimer       text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interaction_checks_idx ON interaction_checks(user_id, profile_id, created_at DESC);

-- -------------------------------------------------------------- assistant
CREATE TABLE IF NOT EXISTS conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'New conversation',
  locale     text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','hi')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant')),
  content         text NOT NULL,
  citations       jsonb NOT NULL DEFAULT '[]',
  grounded        boolean NOT NULL DEFAULT false,
  provider        text,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);

-- --------------------------------------------------------------- feedback
CREATE TABLE IF NOT EXISTS feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  email      text,
  name       text,
  rating     integer CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  category   text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 60),
  message    text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback(created_at DESC);

-- -------------------------------------------------------------- audit log
CREATE TABLE IF NOT EXISTS audit_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  action     text NOT NULL,
  entity     text,
  entity_id  text,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_events(user_id, created_at DESC);
