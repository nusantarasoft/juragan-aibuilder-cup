-- Ensure _realtime schema exists and supabase_admin can use it (run as supabase_admin).
-- Jangan buat schema_migrations di sini; biarkan Ecto yang buat (dengan kolom inserted_at).
CREATE SCHEMA IF NOT EXISTS _realtime;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;
GRANT ALL ON SCHEMA _realtime TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON TABLES TO supabase_admin;
