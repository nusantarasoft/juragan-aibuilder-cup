-- Shared WAHA inbox: satu nomor admin, banyak UMKM diidentifikasi dari nomor pengirim (pemilik).
-- Run after studio_whatsapp_multitenant.sql

DROP INDEX IF EXISTS public.idx_studio_whatsapp_config_waha_session;

CREATE INDEX IF NOT EXISTS idx_studio_whatsapp_config_waha_session
    ON public.studio_whatsapp_config (waha_session)
    WHERE waha_session IS NOT NULL AND TRIM(waha_session) <> '';

COMMENT ON COLUMN public.studio_whatsapp_config.waha_session IS
    'WAHA session (biasanya default — satu nomor admin untuk semua UMKM).';
COMMENT ON COLUMN public.studio_whatsapp_config.business_phone IS
    'Nomor HP pemilik UMKM yang mengirim WA ke nomor admin; dipakai untuk routing tenant.';
COMMENT ON COLUMN public.studio_whatsapp_config.allowlist_phones IS
    'Nomor tambahan (staff) yang boleh mengirim perintah untuk UMKM ini.';
