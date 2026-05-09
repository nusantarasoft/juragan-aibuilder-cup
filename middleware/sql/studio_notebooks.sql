-- =====================================================
-- Studio AI: Notebook Knowledge Base Schema
-- =====================================================

-- 1. Notebooks (maps to a RAGFlow dataset)
CREATE TABLE IF NOT EXISTS studio_notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID,
    icon VARCHAR(50) DEFAULT '📓',
    is_shared BOOLEAN DEFAULT FALSE,
    source_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Notebook Sources (tracks files added to a notebook)
CREATE TABLE IF NOT EXISTS studio_notebook_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES studio_notebooks(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE SET NULL,   -- from existing media library
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    s3_key VARCHAR(1000),                   -- MinIO path
    parse_status VARCHAR(50) DEFAULT 'pending',  -- pending | parsing | done | error
    parse_progress FLOAT DEFAULT 0,
    chunk_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Conversations
CREATE TABLE IF NOT EXISTS studio_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES studio_notebooks(id) ON DELETE CASCADE,
    user_id UUID,
    title VARCHAR(500) DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Messages
CREATE TABLE IF NOT EXISTS studio_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES studio_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    source_refs JSONB DEFAULT '[]'::jsonb,   -- RAGFlow citation chunks
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_studio_notebooks_user ON studio_notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_sources_notebook ON studio_notebook_sources(notebook_id);
CREATE INDEX IF NOT EXISTS idx_studio_conversations_notebook ON studio_conversations(notebook_id);
CREATE INDEX IF NOT EXISTS idx_studio_messages_conversation ON studio_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_studio_messages_created ON studio_messages(created_at);

-- RLS Policies
ALTER TABLE studio_notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_notebook_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_messages ENABLE ROW LEVEL SECURITY;

-- Notebook owner policy (simplified, no RLS for service role)
CREATE POLICY studio_notebooks_owner ON studio_notebooks
    FOR ALL USING (TRUE);

CREATE POLICY studio_sources_owner ON studio_notebook_sources
    FOR ALL USING (TRUE);

CREATE POLICY studio_conversations_owner ON studio_conversations
    FOR ALL USING (TRUE);

CREATE POLICY studio_messages_owner ON studio_messages
    FOR ALL USING (TRUE);

-- Guide flows (playbooks): see studio_guide_flows.sql
