-- Public view-only sharing for Studio notebooks.
-- Reuses the existing is_shared flag and adds an unguessable share token.

ALTER TABLE public.studio_notebooks
    ADD COLUMN IF NOT EXISTS share_token TEXT,
    ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_notebooks_share_token
    ON public.studio_notebooks(share_token)
    WHERE share_token IS NOT NULL;
