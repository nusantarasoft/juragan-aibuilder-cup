-- ============================================================================
-- Media Embeddings Table for pgVector
-- Stores Gemini embeddings (768 dimensions) for semantic search
-- ============================================================================

-- Ensure vector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- MEDIA TABLE (Main metadata storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_name TEXT,
    filepath TEXT,
    url TEXT,
    s3_key TEXT,
    mime_type TEXT,
    mimetype TEXT, -- Alias for compatibility
    size_bytes BIGINT,
    alt_text TEXT,
    uploaded_by UUID,
    bucket_name TEXT, -- Stores the MinIO/S3 bucket name where this file resides
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS media_filename_idx ON media(filename);
CREATE INDEX IF NOT EXISTS media_created_idx ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS media_mime_type_idx ON media(mime_type);

-- ============================================================================
-- MEDIA EMBEDDINGS TABLE
-- Stores 768-dimensional vectors from Gemini embedding-001 model
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_embeddings (
    id UUID PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
    embedding vector(1408),  -- Vertex AI multimodalembedding produces 1408 dimensions
    chunk_index INTEGER DEFAULT 0,  -- For chunked documents
    chunk_text TEXT,  -- Original text that was embedded
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create IVFFlat index for fast similarity search
-- Note: IVFFlat requires the table to have some data first, so we use IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'media_embeddings_vector_idx'
    ) THEN
        -- Use HNSW index for better recall (or IVFFlat for larger datasets)
        CREATE INDEX media_embeddings_vector_idx ON media_embeddings 
        USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

-- ============================================================================
-- FUNCTIONS FOR SIMILARITY SEARCH
-- ============================================================================

-- Search media by semantic similarity
CREATE OR REPLACE FUNCTION search_media_by_embedding(
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
    FROM media_embeddings me
    JOIN media m ON me.id = m.id
    WHERE 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Helper to insert or update embedding
CREATE OR REPLACE FUNCTION upsert_media_embedding(
    p_id UUID,
    p_embedding vector(1408),
    p_chunk_text TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO media_embeddings (id, embedding, chunk_text, updated_at)
    VALUES (p_id, p_embedding, p_chunk_text, NOW())
    ON CONFLICT (id) DO UPDATE SET 
        embedding = EXCLUDED.embedding,
        chunk_text = EXCLUDED.chunk_text,
        updated_at = NOW();
END;
$$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Media embeddings schema created successfully';
END $$;
