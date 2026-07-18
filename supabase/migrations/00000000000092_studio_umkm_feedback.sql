-- AI Studio UMKM — feedback logging (AIDLC Operate & Iterate)
CREATE TABLE IF NOT EXISTS public.studio_umkm_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    conversation_id UUID REFERENCES public.studio_conversations(id) ON DELETE SET NULL,
    phone TEXT,
    score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    label TEXT,
    raw_text TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_umkm_feedback_tenant_created
    ON public.studio_umkm_feedback (tenant_id, created_at DESC);

COMMENT ON TABLE public.studio_umkm_feedback IS
    'UMKM WA user ratings (1-5) for Operate & Iterate feedback loop.';
