-- AI Studio WhatsApp — multi-UMKM (1 nomor bisnis / WAHA session = 1 tenant)
-- Run after studio_whatsapp.sql

ALTER TABLE public.studio_whatsapp_config
    ADD COLUMN IF NOT EXISTS waha_session text,
    ADD COLUMN IF NOT EXISTS business_phone text,
    ADD COLUMN IF NOT EXISTS label text;

-- Backfill existing single-tenant dev row
UPDATE public.studio_whatsapp_config
SET waha_session = COALESCE(NULLIF(TRIM(waha_session), ''), 'default')
WHERE tenant_id = 'default' AND (waha_session IS NULL OR TRIM(waha_session) = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_whatsapp_config_waha_session
    ON public.studio_whatsapp_config (waha_session)
    WHERE waha_session IS NOT NULL AND TRIM(waha_session) <> '';

CREATE INDEX IF NOT EXISTS idx_studio_whatsapp_config_business_phone
    ON public.studio_whatsapp_config (business_phone)
    WHERE business_phone IS NOT NULL AND TRIM(business_phone) <> '';

COMMENT ON COLUMN public.studio_whatsapp_config.waha_session IS
    'WAHA session name (webhook body.session). Maps inbound messages to this UMKM tenant.';
COMMENT ON COLUMN public.studio_whatsapp_config.business_phone IS
    'E.164 digits of the business WhatsApp number (optional fallback lookup).';
COMMENT ON COLUMN public.studio_whatsapp_config.label IS
    'Human-readable UMKM name for admin UI.';
