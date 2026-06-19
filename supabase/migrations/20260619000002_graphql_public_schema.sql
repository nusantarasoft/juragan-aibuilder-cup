-- PostgREST (PGRST_DB_SCHEMAS=public,storage,graphql_public) requires graphql_public.
-- pg_graphql normally creates this; ensure it exists on fresh or partial restores.

CREATE SCHEMA IF NOT EXISTS graphql_public;

GRANT USAGE ON SCHEMA graphql_public TO postgres, anon, authenticated, service_role, authenticator;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
