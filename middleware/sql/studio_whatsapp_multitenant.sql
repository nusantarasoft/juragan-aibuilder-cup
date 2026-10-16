-- AI Studio WhatsApp — multi-UMKM (1 nomor bisnis / session = 1 tenant)
-- Run after studio_whatsapp.sql

ALTER TABLE public.studio_whatsapp_config
    ADD COLUMN IF NOT EXISTS session_name text,
    ADD COLUMN IF NOT EXISTS business_phone text,
    ADD COLUMN IF NOT EXISTS label text;

-- Backfill existing single-tenant dev row
UPDATE public.studio_whatsapp_config
SET session_name = COALESCE(NULLIF(TRIM(session_name), ''), 'default')
WHERE tenant_id = 'default' AND (session_name IS NULL OR TRIM(session_name) = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_whatsapp_config_session_name
    ON public.studio_whatsapp_config (session_name)
    WHERE session_name IS NOT NULL AND TRIM(session_name) <> '';

CREATE INDEX IF NOT EXISTS idx_studio_whatsapp_config_business_phone
    ON public.studio_whatsapp_config (business_phone)
    WHERE business_phone IS NOT NULL AND TRIM(business_phone) <> '';

COMMENT ON COLUMN public.studio_whatsapp_config.session_name IS
    'Session name (webhook body.session). Maps inbound messages to this UMKM tenant.';
COMMENT ON COLUMN public.studio_whatsapp_config.business_phone IS
    'E.164 digits of the business WhatsApp number (optional fallback lookup).';
COMMENT ON COLUMN public.studio_whatsapp_config.label IS
    'Human-readable UMKM name for admin UI.';
