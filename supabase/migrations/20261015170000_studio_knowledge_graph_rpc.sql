-- P2-2: Knowledge Graph explorer — tenant-scoped stats, tree, and semantic search RPCs
-- over studio notebooks / sources / pgvector chunks (768-dim).

CREATE OR REPLACE FUNCTION public.studio_resolve_tenant_notebooks(p_tenant_id text)
RETURNS TABLE (notebook_id uuid)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT sw.notebook_id
    FROM public.studio_whatsapp_config sw
    WHERE sw.notebook_id IS NOT NULL
      AND sw.tenant_id = p_tenant_id;

    IF to_regclass('public.tenant_slug_aliases') IS NOT NULL THEN
        RETURN QUERY
        SELECT DISTINCT sw.notebook_id
        FROM public.studio_whatsapp_config sw
        WHERE sw.notebook_id IS NOT NULL
          AND sw.tenant_id IN (
              SELECT slug FROM public.tenant_slug_aliases WHERE tenant_id::text = p_tenant_id
          );
    END IF;

    RETURN QUERY
    SELECT nb.id
    FROM public.studio_notebooks nb
    WHERE (nb.context_config->>'tenant_id') = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.studio_resolve_tenant_notebooks(text)
    TO anon, authenticated, service_role, authenticator;

CREATE OR REPLACE FUNCTION public.studio_knowledge_graph_stats(p_tenant_id text)
RETURNS TABLE (
    total_nodes bigint,
    total_edges bigint,
    orphaned_chunks bigint,
    embedded_chunks bigint
)
LANGUAGE sql
STABLE
AS $$
    WITH nb AS (
        SELECT notebook_id FROM public.studio_resolve_tenant_notebooks(p_tenant_id)
    ),
    sources AS (
        SELECT s.id, s.notebook_id
        FROM public.studio_notebook_sources s
        WHERE s.notebook_id IN (SELECT notebook_id FROM nb)
    ),
    chunks AS (
        SELECT c.id, c.source_id, c.notebook_id, c.embedding
        FROM public.studio_source_chunks c
        WHERE c.notebook_id IN (SELECT notebook_id FROM nb)
    )
    SELECT
        (SELECT COUNT(*) FROM nb)
        + (SELECT COUNT(*) FROM sources)
        + (SELECT COUNT(*) FROM chunks) AS total_nodes,
        (SELECT COUNT(*) FROM sources)
        + (SELECT COUNT(*) FROM chunks) AS total_edges,
        (SELECT COUNT(*) FROM chunks ch
            LEFT JOIN sources src ON src.id = ch.source_id
            WHERE ch.embedding IS NULL OR src.id IS NULL) AS orphaned_chunks,
        (SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL) AS embedded_chunks;
$$;

GRANT EXECUTE ON FUNCTION public.studio_knowledge_graph_stats(text)
    TO anon, authenticated, service_role, authenticator;

CREATE OR REPLACE FUNCTION public.studio_knowledge_graph_tree(
    p_tenant_id text,
    p_max_chunks_per_source int DEFAULT 40
)
RETURNS TABLE (
    node_key text,
    parent_key text,
    node_type text,
    label text,
    entity_id uuid,
    meta jsonb
)
LANGUAGE sql
STABLE
AS $$
    WITH nb AS (
        SELECT n.notebook_id, nb.name, nb.icon
        FROM public.studio_resolve_tenant_notebooks(p_tenant_id) n
        JOIN public.studio_notebooks nb ON nb.id = n.notebook_id
    ),
    src AS (
        SELECT
            s.id,
            s.notebook_id,
            s.filename,
            s.chunk_count,
            s.parse_status
        FROM public.studio_notebook_sources s
        WHERE s.notebook_id IN (SELECT notebook_id FROM nb)
    ),
    ch AS (
        SELECT c.id, c.source_id, c.notebook_id, c.chunk_index, c.embedding IS NOT NULL AS has_embedding
        FROM public.studio_source_chunks c
        WHERE c.notebook_id IN (SELECT notebook_id FROM nb)
    ),
    ranked_chunks AS (
        SELECT
            ch.*,
            ROW_NUMBER() OVER (PARTITION BY ch.source_id ORDER BY ch.chunk_index) AS rn
        FROM ch
    )
    SELECT
        ('nb:' || b.notebook_id::text) AS node_key,
        NULL::text AS parent_key,
        'notebook'::text AS node_type,
        COALESCE(NULLIF(TRIM(b.icon || ' ' || b.name), ''), b.name, 'Notebook') AS label,
        b.notebook_id AS entity_id,
        jsonb_build_object('notebookId', b.notebook_id) AS meta
    FROM nb b
    UNION ALL
    SELECT
        ('src:' || s.id::text),
        ('nb:' || s.notebook_id::text),
        'source',
        s.filename,
        s.id,
        jsonb_build_object(
            'notebookId', s.notebook_id,
            'chunkCount', COALESCE(s.chunk_count, 0),
            'parseStatus', s.parse_status
        )
    FROM src s
    UNION ALL
    SELECT
        ('chk:' || rc.id::text),
        ('src:' || rc.source_id::text),
        'chunk',
        'Chunk #' || rc.chunk_index::text || CASE WHEN rc.has_embedding THEN ' [embedded]' ELSE ' [no vector]' END,
        rc.id,
        jsonb_build_object(
            'notebookId', rc.notebook_id,
            'sourceId', rc.source_id,
            'chunkIndex', rc.chunk_index,
            'hasEmbedding', rc.has_embedding
        )
    FROM ranked_chunks rc
    WHERE rc.rn <= GREATEST(1, LEAST(p_max_chunks_per_source, 200));
$$;

GRANT EXECUTE ON FUNCTION public.studio_knowledge_graph_tree(text, int)
    TO anon, authenticated, service_role, authenticator;

CREATE OR REPLACE FUNCTION public.match_studio_chunks_for_tenant(
    p_tenant_id text,
    query_embedding vector(768),
    match_threshold float DEFAULT 0.35,
    match_count int DEFAULT 16
)
RETURNS TABLE (
    chunk_id uuid,
    source_id uuid,
    notebook_id uuid,
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
        c.notebook_id,
        s.filename,
        c.content,
        (1 - (c.embedding <=> query_embedding))::float AS similarity
    FROM public.studio_source_chunks c
    JOIN public.studio_notebook_sources s ON s.id = c.source_id
    WHERE c.notebook_id IN (SELECT notebook_id FROM public.studio_resolve_tenant_notebooks(p_tenant_id))
      AND c.embedding IS NOT NULL
      AND (1 - (c.embedding <=> query_embedding)) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_studio_chunks_for_tenant(text, vector(768), float, int)
    TO anon, authenticated, service_role, authenticator;

COMMENT ON FUNCTION public.studio_knowledge_graph_tree IS
    'Flat tree nodes (notebook → source → chunk) for AI Studio Knowledge Graph explorer (P2-2).';

NOTIFY pgrst, 'reload schema';
