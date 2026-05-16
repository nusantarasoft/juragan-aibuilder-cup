-- Studio RAG: switch embeddings from Vertex multimodal (1408) to Google AI Studio gemini-embedding-001 @ 768 dims.
-- Run once when using GOOGLE_API_KEY + EMBEDDING_PROVIDER=google_ai (no GCP required for indexing).
-- Example: docker exec -i postgres psql -U supabase_admin -d nusantarasoft < middleware/sql/studio_embedding_google_ai_768.sql

DELETE FROM public.studio_source_chunks;

DROP INDEX IF EXISTS public.studio_source_chunks_embedding_idx;

ALTER TABLE public.studio_source_chunks
    ALTER COLUMN embedding TYPE vector(768);

CREATE INDEX IF NOT EXISTS studio_source_chunks_embedding_idx ON public.studio_source_chunks
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
        s.filename,
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
