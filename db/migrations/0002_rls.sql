-- PARIKSHAN row-level security (defense-in-depth).
--
-- PARIKSHAN uses its own cookie-session auth, not Supabase Auth. These
-- policies key off a per-transaction GUC:
--
--     SELECT set_config('app.user_id', '<uuid>', true);
--
-- IMPORTANT:
--  * RLS is only enforced for roles that do NOT own the tables. If the app
--    connects as the table owner (e.g. Supabase's `postgres` role), Postgres
--    bypasses RLS by design. For hardened production setups, create a
--    restricted role:
--
--      CREATE ROLE parikshan_app LOGIN PASSWORD '...';
--      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO parikshan_app;
--      GRANT USAGE ON SCHEMA public TO parikshan_app;
--
--    and point DATABASE_URL at that role. Migrations should then run as the
--    owner role. See docs/SECURITY.md.
--  * The application ALSO enforces ownership in every query and service
--    method — RLS is the second line, not the only one.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_owner ON profiles;
CREATE POLICY profiles_owner ON profiles
  USING (owner_id::text = current_setting('app.user_id', true))
  WITH CHECK (owner_id::text = current_setting('app.user_id', true));

DROP POLICY IF EXISTS documents_owner ON documents;
CREATE POLICY documents_owner ON documents
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

DROP POLICY IF EXISTS document_files_owner ON document_files;
CREATE POLICY document_files_owner ON document_files
  USING (EXISTS (SELECT 1 FROM documents d
                 WHERE d.id = document_files.document_id
                   AND d.user_id::text = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM documents d
                      WHERE d.id = document_files.document_id
                        AND d.user_id::text = current_setting('app.user_id', true)));

DROP POLICY IF EXISTS document_texts_owner ON document_texts;
CREATE POLICY document_texts_owner ON document_texts
  USING (EXISTS (SELECT 1 FROM documents d
                 WHERE d.id = document_texts.document_id
                   AND d.user_id::text = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM documents d
                      WHERE d.id = document_texts.document_id
                        AND d.user_id::text = current_setting('app.user_id', true)));

DROP POLICY IF EXISTS observations_owner ON observations;
CREATE POLICY observations_owner ON observations
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

DROP POLICY IF EXISTS medications_owner ON medications;
CREATE POLICY medications_owner ON medications
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

DROP POLICY IF EXISTS interaction_checks_owner ON interaction_checks;
CREATE POLICY interaction_checks_owner ON interaction_checks
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

DROP POLICY IF EXISTS conversations_owner ON conversations;
CREATE POLICY conversations_owner ON conversations
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

DROP POLICY IF EXISTS messages_owner ON messages;
CREATE POLICY messages_owner ON messages
  USING (EXISTS (SELECT 1 FROM conversations c
                 WHERE c.id = messages.conversation_id
                   AND c.user_id::text = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c
                      WHERE c.id = messages.conversation_id
                        AND c.user_id::text = current_setting('app.user_id', true)));

DROP POLICY IF EXISTS sessions_owner ON sessions;
CREATE POLICY sessions_owner ON sessions
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

DROP POLICY IF EXISTS audit_owner ON audit_events;
CREATE POLICY audit_owner ON audit_events
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));
