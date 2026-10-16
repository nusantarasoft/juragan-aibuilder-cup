-- P2-5: optional per-store dedicated WhatsApp (Hermes session mapping)

ALTER TABLE public.tenant_stores
    ADD COLUMN IF NOT EXISTS wa_inbox_mode TEXT NOT NULL DEFAULT 'shared'
        CHECK (wa_inbox_mode IN ('shared', 'dedicated')),
    ADD COLUMN IF NOT EXISTS wa_dedicated_session_name TEXT,
    ADD COLUMN IF NOT EXISTS wa_dedicated_business_phone TEXT,
    ADD COLUMN IF NOT EXISTS wa_dedicated_paired_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenant_stores.wa_inbox_mode IS 'shared = F2-3 NS inbox + whitelist routing; dedicated = own business number/session (P2-5)';
COMMENT ON COLUMN public.tenant_stores.wa_dedicated_session_name IS 'Hermes session key (e.g. umkm-{studio_slug}) when wa_inbox_mode=dedicated';
COMMENT ON COLUMN public.tenant_stores.wa_dedicated_business_phone IS 'Paired business WA digits from Hermes meId after dedicated pair';
COMMENT ON COLUMN public.tenant_stores.wa_dedicated_paired_at IS 'When dedicated Hermes session last reported connected';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_stores_dedicated_session_name
    ON public.tenant_stores (wa_dedicated_session_name)
    WHERE wa_dedicated_session_name IS NOT NULL AND TRIM(wa_dedicated_session_name) <> '';

NOTIFY pgrst, 'reload schema';
