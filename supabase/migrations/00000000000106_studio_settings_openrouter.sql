-- AI Studio: OpenRouter LLM provider (consult synthesize / optional default)
ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT,
  ADD COLUMN IF NOT EXISTS openrouter_model VARCHAR(150) DEFAULT 'qwen/qwen3.7-flash';

COMMENT ON COLUMN public.studio_settings.openrouter_api_key IS
  'OpenRouter API key (https://openrouter.ai/keys). Env OPENROUTER_API_KEY may override when DB key empty.';
COMMENT ON COLUMN public.studio_settings.openrouter_model IS
  'OpenRouter chat model id, e.g. qwen/qwen3.7-flash (kasir consult synthesize default)';
