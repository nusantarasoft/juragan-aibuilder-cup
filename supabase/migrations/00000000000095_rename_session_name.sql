-- Rename WhatsApp config session column for Hermes-only stack.
-- Safe on live DB: rename only, no data rewrite.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'studio_whatsapp_config'
      AND column_name = 'waha_session'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'studio_whatsapp_config'
      AND column_name = 'session_name'
  ) THEN
    ALTER TABLE public.studio_whatsapp_config RENAME COLUMN waha_session TO session_name;
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_studio_whatsapp_config_waha_session;

CREATE INDEX IF NOT EXISTS idx_studio_whatsapp_config_session_name
    ON public.studio_whatsapp_config (session_name)
    WHERE session_name IS NOT NULL AND TRIM(session_name) <> '';

COMMENT ON COLUMN public.studio_whatsapp_config.session_name IS
  'WhatsApp inbox/session key (shared Hermes pipe; typically default or hermes).';
