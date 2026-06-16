-- Migration: Create studio_settings table
CREATE TABLE IF NOT EXISTS public.studio_settings (
    tenant_id UUID PRIMARY KEY,
    default_llm_provider VARCHAR(50) DEFAULT 'anthropic',
    default_embedding_provider VARCHAR(50) DEFAULT 'auto',
    
    anthropic_api_key TEXT,
    anthropic_model VARCHAR(100) DEFAULT 'claude-3-haiku-20240307',
    
    google_api_key TEXT,
    google_project_id VARCHAR(100),
    google_location VARCHAR(50) DEFAULT 'us-central1',
    google_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    
    openai_api_key TEXT,
    openai_model VARCHAR(100) DEFAULT 'gpt-4o',
    
    ollama_base_url VARCHAR(255) DEFAULT 'http://host.docker.internal:11434',
    ollama_model VARCHAR(100) DEFAULT 'llama3',
    
    waha_dashboard_url VARCHAR(255) DEFAULT 'http://127.0.0.1:3010/dashboard',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users" ON public.studio_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for service role" ON public.studio_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert a default row for the system tenant (assumes '00000000-0000-0000-0000-000000000000' is the system tenant id or we can leave it empty and upsert later).
