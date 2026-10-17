-- F2-3: tenant WA connect (owner OTP verify + explicit Kasir activation)

ALTER TABLE public.tenant_stores
    ADD COLUMN IF NOT EXISTS owner_phone_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS wa_kasir_activated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenant_stores.owner_phone_verified_at IS 'Owner phone OTP verified (F2-3)';
COMMENT ON COLUMN public.tenant_stores.wa_kasir_activated_at IS 'Owner tapped Aktifkan Kasir WA (F2-3)';

-- Legacy / already-live stores: preserve outbound if channel was already enabled with owner whitelist
UPDATE public.tenant_stores ts
SET
    owner_phone_verified_at = COALESCE(ts.owner_phone_verified_at, NOW()),
    wa_kasir_activated_at = COALESCE(ts.wa_kasir_activated_at, NOW())
FROM public.studio_whatsapp_config sw
WHERE sw.tenant_id = ts.studio_slug
  AND sw.enabled IS TRUE
  AND sw.notebook_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM public.tenant_wa_whitelist w
      WHERE w.store_id = ts.id AND w.is_owner IS TRUE
  );

NOTIFY pgrst, 'reload schema';
