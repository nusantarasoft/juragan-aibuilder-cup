-- AI Studio UMKM — durable pending sales (AIDLC staging before commit)
-- Mirror of supabase/migrations/00000000000091_studio_umkm_pending_sales.sql

CREATE TABLE IF NOT EXISTS public.studio_umkm_pending_sales (
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

CREATE INDEX IF NOT EXISTS idx_studio_umkm_pending_tenant_phone
    ON public.studio_umkm_pending_sales (tenant_id, phone)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_studio_umkm_pending_conversation
    ON public.studio_umkm_pending_sales (conversation_id)
    WHERE status = 'pending';
