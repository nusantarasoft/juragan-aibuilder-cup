-- Studio notebook RAG: chunked text + embeddings (Vertex multimodal = 1408 dims)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.studio_source_chunks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notebook_id uuid NOT NULL,
    source_id uuid NOT NULL,
    chunk_index integer NOT NULL DEFAULT 0,
    content text NOT NULL,
    embedding vector(1408),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_source_chunks_pkey PRIMARY KEY (id),
    CONSTRAINT studio_source_chunks_source_id_fkey FOREIGN KEY (source_id)
        REFERENCES public.studio_notebook_sources(id) ON DELETE CASCADE,
    CONSTRAINT studio_source_chunks_notebook_id_fkey FOREIGN KEY (notebook_id)
        REFERENCES public.studio_notebooks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_studio_source_chunks_notebook ON public.studio_source_chunks (notebook_id);
CREATE INDEX IF NOT EXISTS idx_studio_source_chunks_source ON public.studio_source_chunks (source_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'studio_source_chunks_embedding_idx') THEN
        CREATE INDEX studio_source_chunks_embedding_idx ON public.studio_source_chunks
        USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.match_studio_chunks(
    query_embedding vector(1408),
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

GRANT ALL ON public.studio_source_chunks TO anon, authenticated, service_role, authenticator;
GRANT EXECUTE ON FUNCTION public.match_studio_chunks(vector(1408), uuid, float, int)
    TO anon, authenticated, service_role, authenticator;
