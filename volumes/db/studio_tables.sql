-- ══════════════════════════════════════════════════════════════════
-- Studio AI - Tables for notebook-powered RAG knowledge base
-- ══════════════════════════════════════════════════════════════════

-- Studio Notebooks
CREATE TABLE IF NOT EXISTS public.studio_notebooks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    description text,
    user_id uuid,
    icon character varying(50) DEFAULT '📓',
    is_shared boolean DEFAULT false,
    source_count integer DEFAULT 0,
    audience character varying(20) DEFAULT 'admin',
    context_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_notebooks_pkey PRIMARY KEY (id),
    CONSTRAINT studio_notebooks_audience_check CHECK (audience IN ('admin', 'customer'))
);

ALTER TABLE public.studio_notebooks
    ADD COLUMN IF NOT EXISTS audience character varying(20) DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS context_config jsonb DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_studio_notebooks_user ON public.studio_notebooks (user_id);

-- Studio Notebook Sources
CREATE TABLE IF NOT EXISTS public.studio_notebook_sources (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notebook_id uuid NOT NULL,
    media_id uuid,
    filename character varying(500) NOT NULL,
    file_type character varying(100),
    file_size bigint DEFAULT 0,
    s3_key text,
    parse_status character varying(20) DEFAULT 'pending',
    parse_progress double precision DEFAULT 0,
    chunk_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_notebook_sources_pkey PRIMARY KEY (id),
    CONSTRAINT studio_notebook_sources_notebook_id_fkey FOREIGN KEY (notebook_id) REFERENCES public.studio_notebooks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_sources_notebook ON public.studio_notebook_sources (notebook_id);

-- Studio Conversations
CREATE TABLE IF NOT EXISTS public.studio_conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notebook_id uuid NOT NULL,
    user_id uuid,
    title text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_conversations_pkey PRIMARY KEY (id),
    CONSTRAINT studio_conversations_notebook_id_fkey FOREIGN KEY (notebook_id) REFERENCES public.studio_notebooks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_conversations_notebook ON public.studio_conversations (notebook_id);

-- Studio Messages
CREATE TABLE IF NOT EXISTS public.studio_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    source_refs jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_messages_pkey PRIMARY KEY (id),
    CONSTRAINT studio_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.studio_conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_messages_conversation ON public.studio_messages (conversation_id);

-- Studio guide flows (playbooks)
CREATE TABLE IF NOT EXISTS public.studio_guide_flows (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notebook_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'draft',
    definition jsonb NOT NULL DEFAULT '{"version":1,"startNodeId":"","nodes":[]}'::jsonb,
    version integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_guide_flows_pkey PRIMARY KEY (id),
    CONSTRAINT studio_guide_flows_notebook_id_fkey FOREIGN KEY (notebook_id) REFERENCES public.studio_notebooks(id) ON DELETE CASCADE,
    CONSTRAINT studio_guide_flows_status_check CHECK (status IN ('draft', 'published'))
);
CREATE INDEX IF NOT EXISTS idx_studio_guide_flows_notebook ON public.studio_guide_flows (notebook_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_guide_flows_one_published_per_notebook
    ON public.studio_guide_flows (notebook_id)
    WHERE status = 'published';

ALTER TABLE public.studio_conversations
    ADD COLUMN IF NOT EXISTS guide_flow_id uuid,
    ADD COLUMN IF NOT EXISTS guide_flow_node_id text,
    ADD COLUMN IF NOT EXISTS guide_flow_context jsonb DEFAULT '{}'::jsonb;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'studio_conversations_guide_flow_id_fkey'
    ) THEN
        ALTER TABLE public.studio_conversations
            ADD CONSTRAINT studio_conversations_guide_flow_id_fkey
            FOREIGN KEY (guide_flow_id) REFERENCES public.studio_guide_flows(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_studio_conversations_guide_flow ON public.studio_conversations (guide_flow_id);

CREATE TABLE IF NOT EXISTS public.studio_guide_flow_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    flow_id uuid NOT NULL,
    from_node_id text,
    to_node_id text,
    event_type character varying(40) NOT NULL,
    user_text text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_guide_flow_events_pkey PRIMARY KEY (id),
    CONSTRAINT studio_guide_flow_events_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.studio_conversations(id) ON DELETE CASCADE,
    CONSTRAINT studio_guide_flow_events_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.studio_guide_flows(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_guide_flow_events_conversation ON public.studio_guide_flow_events (conversation_id);

-- Studio source chunks (RAG)
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

-- Enable RLS
ALTER TABLE public.studio_notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_notebook_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_messages ENABLE ROW LEVEL SECURITY;

-- Policies: owner-based when authenticated; service_role bypasses RLS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_notebooks' AND policyname = 'studio_notebooks_owner') THEN
        CREATE POLICY studio_notebooks_owner ON public.studio_notebooks
            USING (user_id IS NULL OR user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_notebook_sources' AND policyname = 'studio_sources_owner') THEN
        CREATE POLICY studio_sources_owner ON public.studio_notebook_sources USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_conversations' AND policyname = 'studio_conversations_owner') THEN
        CREATE POLICY studio_conversations_owner ON public.studio_conversations USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_messages' AND policyname = 'studio_messages_owner') THEN
        CREATE POLICY studio_messages_owner ON public.studio_messages USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_guide_flows' AND policyname = 'studio_guide_flows_owner') THEN
        CREATE POLICY studio_guide_flows_owner ON public.studio_guide_flows USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_guide_flow_events' AND policyname = 'studio_guide_flow_events_owner') THEN
        CREATE POLICY studio_guide_flow_events_owner ON public.studio_guide_flow_events USING (true);
    END IF;
END $$;

-- Grants
GRANT ALL ON public.studio_notebooks TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_notebook_sources TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_conversations TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_messages TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_guide_flows TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_guide_flow_events TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_source_chunks TO anon, authenticated, service_role, authenticator;

ALTER TABLE public.studio_source_chunks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_source_chunks' AND policyname = 'studio_source_chunks_owner') THEN
        CREATE POLICY studio_source_chunks_owner ON public.studio_source_chunks
            USING (
                notebook_id IN (
                    SELECT id FROM public.studio_notebooks
                    WHERE user_id IS NULL OR user_id = auth.uid()
                )
            );
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

GRANT EXECUTE ON FUNCTION public.match_studio_chunks(vector(1408), uuid, float, int)
    TO anon, authenticated, service_role, authenticator;
