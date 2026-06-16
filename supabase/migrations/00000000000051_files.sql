-- ============================================================================
-- File Storage Schema with pgVector Embeddings
-- Supports: Documents, Images, Audio, Video
-- Storage: MinIO S3 + PostgreSQL metadata + AI embeddings
-- ============================================================================

-- ============================================================================
-- FILE TYPES ENUM
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_type') THEN
    CREATE TYPE file_type AS ENUM ('document', 'image', 'audio', 'video', 'other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_status') THEN
    CREATE TYPE file_status AS ENUM ('uploading', 'processing', 'ready', 'error');
  END IF;
END $$;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    public BOOLEAN DEFAULT false,
    file_size_limit BIGINT, -- Max size in bytes
    allowed_mime_types TEXT[], -- e.g., ARRAY['image/*', 'application/pdf']
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default buckets
INSERT INTO storage_buckets (id, name, public, allowed_mime_types) VALUES
    ('documents', 'Documents', false, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.*', 'text/*']),
    ('images', 'Images', true, ARRAY['image/*']),
    ('audio', 'Audio', false, ARRAY['audio/*']),
    ('video', 'Video', false, ARRAY['video/*']),
    ('attachments', 'Attachments', false, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FOLDERS (For organizing files) - Must be before files table
-- ============================================================================
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id),
    owner_id UUID, -- logical FK to auth.users(id)
    path TEXT, -- Materialized path like '/documents/projects/2024/'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FILES TABLE (Main metadata + pgVector embeddings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- File info
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    type file_type DEFAULT 'other',
    mime_type TEXT,
    size_bytes BIGINT NOT NULL,
    
    -- S3 Storage location
    bucket_id TEXT REFERENCES storage_buckets(id),
    s3_key TEXT NOT NULL,
    s3_url TEXT, -- Direct URL (for public files)
    
    -- File status
    status file_status DEFAULT 'uploading',
    
    -- AI Processing Results
    embedding vector(1536), -- OpenAI ada-002 dimensions
    embedding_model TEXT DEFAULT 'text-embedding-ada-002',
    
    -- Extracted content (for search)
    extracted_text TEXT, -- OCR or parsed text
    transcription TEXT, -- Audio/video transcription
    description TEXT, -- AI-generated description
    tags TEXT[], -- AI-extracted tags
    
    -- Image-specific
    width INTEGER,
    height INTEGER,
    thumbnail_key TEXT,
    
    -- Audio/Video-specific
    duration_seconds NUMERIC,
    
    -- Ownership
    owner_id UUID, -- logical FK to auth.users(id)
    folder_id UUID REFERENCES folders(id),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_version_id UUID REFERENCES files(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_s3_key UNIQUE (bucket_id, s3_key)
);

-- ============================================================================
-- FILE SHARES (Sharing files with users/groups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    shared_with_user_id UUID, -- logical FK to auth.users(id)
    shared_with_email TEXT,
    permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
    expires_at TIMESTAMPTZ,
    share_link TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FILE PROCESSING QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL, -- 'extract_text', 'generate_embedding', 'transcribe', 'thumbnail'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- pgVector similarity search (IVFFlat for large datasets)
CREATE INDEX IF NOT EXISTS files_embedding_idx ON files 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Full-text search on extracted content
CREATE INDEX IF NOT EXISTS files_text_search_idx ON files 
    USING gin(to_tsvector('english', COALESCE(extracted_text, '') || ' ' || COALESCE(description, '')));

-- Common queries
CREATE INDEX IF NOT EXISTS files_owner_idx ON files(owner_id);
CREATE INDEX IF NOT EXISTS files_type_idx ON files(type);
CREATE INDEX IF NOT EXISTS files_status_idx ON files(status);
CREATE INDEX IF NOT EXISTS files_created_idx ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS files_folder_idx ON files(folder_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Similarity search function
CREATE OR REPLACE FUNCTION search_files_by_embedding(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type file_type,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.type,
        1 - (f.embedding <=> query_embedding) AS similarity
    FROM files f
    WHERE f.embedding IS NOT NULL
        AND 1 - (f.embedding <=> query_embedding) > match_threshold
    ORDER BY f.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Full-text search function
CREATE OR REPLACE FUNCTION search_files_by_text(
    search_query TEXT,
    file_types file_type[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type file_type,
    excerpt TEXT,
    rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.type,
        ts_headline('english', COALESCE(f.extracted_text, f.description, ''), plainto_tsquery('english', search_query)) AS excerpt,
        ts_rank(to_tsvector('english', COALESCE(f.extracted_text, '') || ' ' || COALESCE(f.description, '')), plainto_tsquery('english', search_query)) AS rank
    FROM files f
    WHERE to_tsvector('english', COALESCE(f.extracted_text, '') || ' ' || COALESCE(f.description, '')) @@ plainto_tsquery('english', search_query)
        AND (file_types IS NULL OR f.type = ANY(file_types))
    ORDER BY rank DESC
    LIMIT 50;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;

-- Files: Owner can do anything, shared users can view
-- Note: RLS policies use auth.uid() which is only available when auth schema exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'auth') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'files'
        AND policyname = 'Users can manage own files'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can manage own files" ON files FOR ALL USING (auth.uid() = owner_id)';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'files'
        AND policyname = 'Users can view shared files'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can view shared files" ON files FOR SELECT USING (EXISTS (SELECT 1 FROM file_shares WHERE file_id = files.id AND (shared_with_user_id = auth.uid() OR shared_with_email = auth.email())))';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'folders'
        AND policyname = 'Users can manage own folders'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can manage own folders" ON folders FOR ALL USING (auth.uid() = owner_id)';
    END IF;
  END IF;
END $$;

-- Public files in public buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'files'
      AND policyname = 'Anyone can view public files'
  ) THEN
    CREATE POLICY "Anyone can view public files" ON files
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM storage_buckets WHERE id = bucket_id AND public = true)
      );
  END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS files_updated_at ON files;

CREATE TRIGGER files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'File storage schema created successfully';
END $$;
