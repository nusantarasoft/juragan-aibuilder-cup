-- UMKM self-serve registration drafts (WA DAFTAR → admin approve)
CREATE TABLE IF NOT EXISTS public.studio_umkm_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    store_name TEXT,
    owner_name TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'expired')),
    tenant_id TEXT,
    notebook_id UUID,
    reject_reason TEXT,
    wizard_step TEXT,
    session_name TEXT NOT NULL DEFAULT 'hermes',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    approved_at TIMESTAMPTZ,
    approved_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_umkm_registrations_phone_open_uidx
    ON public.studio_umkm_registrations (phone)
    WHERE status IN ('draft', 'pending');

CREATE INDEX IF NOT EXISTS studio_umkm_registrations_status_idx
    ON public.studio_umkm_registrations (status, created_at DESC);

COMMENT ON TABLE public.studio_umkm_registrations IS
    'WA self-serve UMKM signup drafts; activated after admin approve into studio_whatsapp_config.';

GRANT ALL ON public.studio_umkm_registrations TO service_role, authenticator;
GRANT SELECT, INSERT, UPDATE ON public.studio_umkm_registrations TO authenticated;
