-- Align studio_notebooks with volumes/db/studio_tables.sql (PostgREST / StudioService)
ALTER TABLE public.studio_notebooks
    ADD COLUMN IF NOT EXISTS audience character varying(20) DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS context_config jsonb DEFAULT '{}'::jsonb;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'studio_notebooks_audience_check'
    ) THEN
        ALTER TABLE public.studio_notebooks
            ADD CONSTRAINT studio_notebooks_audience_check
            CHECK (audience IN ('admin', 'customer'));
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
