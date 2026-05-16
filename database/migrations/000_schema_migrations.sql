-- Migration tracking (idempotent)
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id          text PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schema_migrations IS 'Tracks applied SQL migrations from database/manifest.core.txt';
