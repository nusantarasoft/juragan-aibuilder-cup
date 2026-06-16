-- ============================================================
-- Media Library Schema
-- Tables: media, media_embeddings, media_annotations
-- ============================================================

-- Enable vector extension if not already enabled (for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. media — Core file metadata (one row per uploaded file)
-- ============================================================
CREATE TABLE IF NOT EXISTS media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename      TEXT NOT NULL,
    original_name TEXT,
    url           TEXT,
    s3_key        TEXT,
    mime_type     TEXT,
    size_bytes    BIGINT DEFAULT 0,
    alt_text      TEXT,
    uploaded_by   TEXT,
    bucket_name   TEXT DEFAULT 'cms-media',
    checksum      TEXT,                       -- SHA-256 of file content
    thumbnail_path TEXT,                      -- path in ns-system bucket
    metadata      JSONB DEFAULT '{}'::jsonb,  -- tags, previewPages, description, etc.
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_media_bucket     ON media (bucket_name);
CREATE INDEX IF NOT EXISTS idx_media_s3_key     ON media (s3_key);
CREATE INDEX IF NOT EXISTS idx_media_mime_type   ON media (mime_type);
CREATE INDEX IF NOT EXISTS idx_media_checksum    ON media (checksum);
CREATE INDEX IF NOT EXISTS idx_media_created     ON media (created_at DESC);

-- ============================================================
-- 2. media_embeddings — Vector embeddings for AI/RAG search
-- ============================================================
CREATE TABLE IF NOT EXISTS media_embeddings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    embedding  vector(768),                   -- Vertex AI text-embedding dimension
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (media_id)
);

CREATE INDEX IF NOT EXISTS idx_media_embeddings_media ON media_embeddings (media_id);

-- ============================================================
-- 3. media_annotations — Label Studio annotation sync
-- ============================================================
CREATE TABLE IF NOT EXISTS media_annotations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id       UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    ls_task_id     INTEGER NOT NULL,
    ls_project_id  INTEGER,
    annotations    JSONB DEFAULT '[]'::jsonb,
    predictions    JSONB DEFAULT '[]'::jsonb,
    status         TEXT DEFAULT 'pending',    -- pending | annotated
    annotated_by   TEXT,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (media_id, ls_task_id)
);

CREATE INDEX IF NOT EXISTS idx_media_annotations_task ON media_annotations (ls_task_id);
CREATE INDEX IF NOT EXISTS idx_media_annotations_media ON media_annotations (media_id);

-- ============================================================
-- RLS Policies (allow service_role full access)
-- ============================================================
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_annotations ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_all_media"
    ON media FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_media_embeddings"
    ON media_embeddings FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_media_annotations"
    ON media_annotations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Anon/authenticated read access for media (public gallery)
CREATE POLICY "anon_read_media"
    ON media FOR SELECT
    USING (true);
