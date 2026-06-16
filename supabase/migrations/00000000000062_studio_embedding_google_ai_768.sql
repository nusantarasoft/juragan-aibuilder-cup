-- Studio RAG: enforce 768-dim embeddings (Google AI Studio / gemini-embedding-001)
--
-- Why: The repo supports two embedding strategies:
-- - Vertex embeddings: 1408 dims (created by 00000000000061_studio_tables.sql)
-- - Google AI Studio embeddings: 768 dims
--
-- This migration standardizes the DB to 768 so match_studio_chunks and the
-- hnsw index operate without vector-dimension mismatches.

DO $$
DECLARE cur_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO cur_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'studio_source_chunks'
    AND a.attname = 'embedding'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  -- Only re-create if we are not already on vector(768).
  IF cur_type IS DISTINCT FROM 'vector(768)' THEN
    DELETE FROM public.studio_source_chunks;
    DROP INDEX IF EXISTS public.studio_source_chunks_embedding_idx;
    ALTER TABLE public.studio_source_chunks
      ALTER COLUMN embedding TYPE vector(768);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS studio_source_chunks_embedding_idx
  ON public.studio_source_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_studio_chunks(
    query_embedding vector(768),
    p_notebook_id uuid,
    match_threshold float DEFAULT 0.45,
    match_count int DEFAULT 8
)
RETURNS TABLE (
    chunk_id uuid,
    source_id uuid,
    filename text,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS chunk_id,
        c.source_id,
        s.filename::text,
        c.content,
        (1 - (c.embedding <=> query_embedding))::float AS similarity
    FROM public.studio_source_chunks c
    JOIN public.studio_notebook_sources s ON s.id = c.source_id
    WHERE c.notebook_id = p_notebook_id
      AND c.embedding IS NOT NULL
      AND (1 - (c.embedding <=> query_embedding)) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_studio_chunks(vector(768), uuid, float, int)
    TO anon, authenticated, service_role, authenticator;

