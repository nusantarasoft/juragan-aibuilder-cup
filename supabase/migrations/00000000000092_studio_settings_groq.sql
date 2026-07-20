-- AI Studio: Groq LLM provider (OpenAI-compatible API)
ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS groq_api_key TEXT,
  ADD COLUMN IF NOT EXISTS groq_model VARCHAR(100) DEFAULT 'openai/gpt-oss-20b';

COMMENT ON COLUMN public.studio_settings.groq_api_key IS
  'GroqCloud API key (https://console.groq.com/keys)';
COMMENT ON COLUMN public.studio_settings.groq_model IS
  'Groq chat model id, e.g. openai/gpt-oss-20b or llama-3.3-70b-versatile';
