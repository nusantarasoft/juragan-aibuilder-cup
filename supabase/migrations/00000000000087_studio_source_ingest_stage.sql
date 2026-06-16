-- Track indexing pipeline stage + error detail for Studio Sources UI
ALTER TABLE public.studio_notebook_sources
    ADD COLUMN IF NOT EXISTS parse_stage character varying(20) DEFAULT 'queued',
    ADD COLUMN IF NOT EXISTS parse_error text,
    ADD COLUMN IF NOT EXISTS embed_total integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS embed_done integer DEFAULT 0;

COMMENT ON COLUMN public.studio_notebook_sources.parse_stage IS 'queued | extracting | chunking | embedding | done | error';
COMMENT ON COLUMN public.studio_notebook_sources.parse_error IS 'Last ingestion error message for admin UI';
COMMENT ON COLUMN public.studio_notebook_sources.embed_total IS 'Total chunks to vectorize';
COMMENT ON COLUMN public.studio_notebook_sources.embed_done IS 'Chunks vectorized so far';
