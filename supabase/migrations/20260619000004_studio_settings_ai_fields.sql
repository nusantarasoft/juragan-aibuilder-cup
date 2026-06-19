-- AI settings: embedding model columns + anthropic max tokens + aligned defaults
ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS google_embedding_model VARCHAR(100) DEFAULT 'gemini-embedding-001',
  ADD COLUMN IF NOT EXISTS openai_embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  ADD COLUMN IF NOT EXISTS ollama_embedding_model VARCHAR(100) DEFAULT 'nomic-embed-text',
  ADD COLUMN IF NOT EXISTS anthropic_max_tokens INT DEFAULT 4096;

ALTER TABLE public.studio_settings
  ALTER COLUMN default_llm_provider SET DEFAULT 'google';

ALTER TABLE public.studio_settings
  ALTER COLUMN anthropic_model SET DEFAULT 'claude-3-5-haiku-20241022';

UPDATE public.studio_settings
SET
  google_embedding_model = COALESCE(google_embedding_model, 'gemini-embedding-001'),
  openai_embedding_model = COALESCE(openai_embedding_model, 'text-embedding-3-small'),
  ollama_embedding_model = COALESCE(ollama_embedding_model, 'nomic-embed-text'),
  anthropic_max_tokens = COALESCE(anthropic_max_tokens, 4096)
WHERE tenant_id IS NOT NULL;
