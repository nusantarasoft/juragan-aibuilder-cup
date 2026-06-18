-- ============================================================================
-- pg_cron Extension
--
-- The Supabase Postgres image runs migration files via psql against POSTGRES_DB
-- (in our case: nusantarasoft). pg_cron can only be installed in the database
-- named "postgres", so we switch connection explicitly.
-- ============================================================================

\connect postgres

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to supabase_admin for scheduling jobs
GRANT USAGE ON SCHEMA cron TO supabase_admin;

-- Example: Schedule a job to vacuum every night at 3 AM
-- SELECT cron.schedule('nightly-vacuum', '0 3 * * *', 'VACUUM ANALYZE');

-- Example: Schedule a job to run in nusantarasoft database
-- SELECT cron.schedule('cleanup-job', '0 4 * * *', $$DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'$$);
-- UPDATE cron.job SET database = 'nusantarasoft' WHERE jobname = 'cleanup-job';
