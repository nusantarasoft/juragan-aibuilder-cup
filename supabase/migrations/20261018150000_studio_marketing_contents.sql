-- Konten Marketing UMKM: generated promo cards + human review before public gallery.

ALTER TABLE public.studio_whatsapp_config
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS marketing_consent_by UUID;

COMMENT ON COLUMN public.studio_whatsapp_config.marketing_consent IS
    'When true, store products may appear in the public marketing gallery after admin approve.';
COMMENT ON COLUMN public.studio_whatsapp_config.marketing_consent_at IS
    'Timestamp when marketing consent was last set.';
COMMENT ON COLUMN public.studio_whatsapp_config.marketing_consent_by IS
    'Admin user id who last toggled marketing consent.';

CREATE TABLE IF NOT EXISTS public.studio_marketing_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    inv_item_id UUID NOT NULL REFERENCES public.inv_items (id) ON DELETE CASCADE,
    source_media_id UUID REFERENCES public.media (id) ON DELETE SET NULL,
    image_s3_key TEXT NOT NULL,
    image_public_url TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    headline TEXT NOT NULL DEFAULT '',
    price_snapshot NUMERIC(18, 2),
    product_name_snapshot TEXT NOT NULL,
    store_label_snapshot TEXT NOT NULL,
    category_name_snapshot TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'unpublished')),
    generated_by TEXT,
    model TEXT,
    reject_reason TEXT,
    reviewer_id UUID,
    decided_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS studio_marketing_contents_status_idx
    ON public.studio_marketing_contents (status, created_at DESC);

CREATE INDEX IF NOT EXISTS studio_marketing_contents_tenant_idx
    ON public.studio_marketing_contents (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS studio_marketing_contents_item_idx
    ON public.studio_marketing_contents (inv_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS studio_marketing_contents_gallery_idx
    ON public.studio_marketing_contents (status, published_at DESC)
    WHERE status = 'approved';

COMMENT ON TABLE public.studio_marketing_contents IS
    'UMKM marketing promo cards (template + optional AI background); public gallery shows approved only.';

GRANT ALL ON public.studio_marketing_contents TO service_role, authenticator;
GRANT SELECT, INSERT, UPDATE ON public.studio_marketing_contents TO authenticated;
