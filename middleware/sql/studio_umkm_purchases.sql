-- UMKM belanja (purchase in) — mirror for local SQL apply
-- Also: supabase/migrations/00000000000093_studio_umkm_purchases.sql

CREATE TABLE IF NOT EXISTS public.studio_umkm_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    purchase_number TEXT NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_name TEXT,
    total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'whatsapp',
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, purchase_number)
);

CREATE TABLE IF NOT EXISTS public.studio_umkm_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.studio_umkm_purchases(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL DEFAULT 1,
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_umkm_purchases_tenant_date
    ON public.studio_umkm_purchases (tenant_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_studio_umkm_purchase_items_purchase
    ON public.studio_umkm_purchase_items (purchase_id);

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

CREATE INDEX IF NOT EXISTS idx_studio_umkm_pending_purchases_tenant
    ON public.studio_umkm_pending_purchases (tenant_id, phone)
    WHERE status = 'pending';
