
-- Upgrade media_embeddings to 1408 dimensions for multimodalembedding@001
-- WARNING: This will clear existing embeddings as dimensions are incompatible.

BEGIN;

-- 1. Truncate table to clear incompatible data
TRUNCATE TABLE public.media_embeddings;

-- 2. Drop existing index
DROP INDEX IF EXISTS public.media_embeddings_vector_idx;

-- 3. Alter column to 1408 dimensions
ALTER TABLE public.media_embeddings 
  ALTER COLUMN embedding TYPE vector(1408);

-- 4. Re-create Index (HNSW)
CREATE INDEX media_embeddings_vector_idx ON public.media_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- 5. Update Search Function
CREATE OR REPLACE FUNCTION public.search_media_by_embedding(
    query_embedding vector(1408),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.id,
        m.filename,
        1 - (me.embedding <=> query_embedding) AS similarity
    FROM public.media_embeddings me
    JOIN public.media m ON me.id = m.id
    WHERE 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. Update Upsert Function
CREATE OR REPLACE FUNCTION public.upsert_media_embedding(
    p_id UUID,
    p_embedding vector(1408),
    p_chunk_text TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.media_embeddings (id, embedding, chunk_text, updated_at)
    VALUES (p_id, p_embedding, p_chunk_text, NOW())
    ON CONFLICT (id) DO UPDATE SET 
        embedding = EXCLUDED.embedding,
        chunk_text = EXCLUDED.chunk_text,
        updated_at = NOW();
END;
$$;

COMMIT;
