-- Mirror of supabase/migrations/00000000000102_studio_umkm_durable_session.sql
CREATE TABLE IF NOT EXISTS public.studio_umkm_pending_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    conversation_id UUID REFERENCES public.studio_conversations(id) ON DELETE CASCADE,
    phone TEXT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'committed', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_umkm_pending_purchases_tenant_phone
    ON public.studio_umkm_pending_purchases (tenant_id, phone)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_studio_umkm_pending_purchases_conversation
    ON public.studio_umkm_pending_purchases (conversation_id)
    WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.studio_umkm_session_wizards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    conversation_id UUID REFERENCES public.studio_conversations(id) ON DELETE CASCADE,
    phone TEXT,
    kind TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cleared', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_umkm_wizards_tenant_phone
    ON public.studio_umkm_session_wizards (tenant_id, phone)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_studio_umkm_wizards_conversation
    ON public.studio_umkm_session_wizards (conversation_id)
    WHERE status = 'active';
