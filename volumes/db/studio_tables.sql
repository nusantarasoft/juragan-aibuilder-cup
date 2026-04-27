-- ══════════════════════════════════════════════════════════════════
-- Studio AI - Tables for notebook-powered RAG knowledge base
-- ══════════════════════════════════════════════════════════════════

-- Studio Notebooks
CREATE TABLE IF NOT EXISTS public.studio_notebooks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    description text,
    user_id uuid,
    ragflow_dataset_id character varying(255),
    ragflow_chat_id character varying(255),
    icon character varying(50) DEFAULT '📓',
    is_shared boolean DEFAULT false,
    source_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_notebooks_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_studio_notebooks_user ON public.studio_notebooks (user_id);

-- Studio Notebook Sources
CREATE TABLE IF NOT EXISTS public.studio_notebook_sources (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notebook_id uuid NOT NULL,
    media_id uuid,
    ragflow_doc_id character varying(255),
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
    ragflow_session_id character varying(255),
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

-- Enable RLS
ALTER TABLE public.studio_notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_notebook_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_messages ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now — can be tightened per-user later)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_notebooks' AND policyname = 'studio_notebooks_owner') THEN
        CREATE POLICY studio_notebooks_owner ON public.studio_notebooks USING (true);
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
END $$;

-- Grants
GRANT ALL ON public.studio_notebooks TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_notebook_sources TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_conversations TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_messages TO anon, authenticated, service_role, authenticator;
