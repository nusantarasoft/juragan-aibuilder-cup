-- Scope match_studio_chunks to optional source id list (NotebookLM source checkboxes).
-- p_source_ids NULL = all sources in notebook; empty array = no rows; otherwise ANY().

CREATE OR REPLACE FUNCTION public.match_studio_chunks(
    query_embedding vector(768),
    p_notebook_id uuid,
    match_threshold float DEFAULT 0.45,
    match_count int DEFAULT 8,
    p_source_ids uuid[] DEFAULT NULL
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
      AND (p_source_ids IS NULL OR c.source_id = ANY (p_source_ids))
      AND (1 - (c.embedding <=> query_embedding)) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_studio_chunks(vector(768), uuid, float, int, uuid[])
    TO anon, authenticated, service_role;
