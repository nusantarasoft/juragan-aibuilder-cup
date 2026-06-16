-- ═══════════════════════════════════════════════════════════
-- WAREHOUSE MANAGEMENT MODULE — Schema
-- ═══════════════════════════════════════════════════════════

-- 1. WAREHOUSES
CREATE TABLE IF NOT EXISTS public.inv_warehouses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    code          TEXT NOT NULL,
    name          TEXT NOT NULL,
    warehouse_type TEXT NOT NULL DEFAULT 'general',  -- general, cold, hazardous, bonded, transit
    address       TEXT,
    city          TEXT,
    country       TEXT DEFAULT 'Indonesia',
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    total_capacity INTEGER DEFAULT 0,
    used_capacity  INTEGER DEFAULT 0,
    manager       TEXT,
    phone         TEXT,
    email         TEXT,
    operating_hours TEXT,
    tags          JSONB DEFAULT '[]',
    notes         TEXT,
    status        TEXT NOT NULL DEFAULT 'active',  -- active, inactive, maintenance
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_warehouses_tenant ON public.inv_warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_warehouses_status ON public.inv_warehouses(status);

-- 2. ZONES
CREATE TABLE IF NOT EXISTS public.inv_zones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id  UUID NOT NULL REFERENCES public.inv_warehouses(id) ON DELETE CASCADE,
    code          TEXT NOT NULL,
    name          TEXT NOT NULL,
    zone_type     TEXT NOT NULL DEFAULT 'storage',  -- receiving, storage, picking, packing, shipping, cold, quarantine
    description   TEXT,
    capacity      INTEGER DEFAULT 0,
    temperature_min DOUBLE PRECISION,
    temperature_max DOUBLE PRECISION,
    is_restricted BOOLEAN DEFAULT FALSE,
    sort_order    INTEGER DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_zones_warehouse ON public.inv_zones(warehouse_id);

-- 3. BINS (Storage Locations)
CREATE TABLE IF NOT EXISTS public.inv_bins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id       UUID NOT NULL REFERENCES public.inv_zones(id) ON DELETE CASCADE,
    code          TEXT NOT NULL,
    aisle         TEXT,
    rack          TEXT,
    level         TEXT,
    position      TEXT,
    bin_type      TEXT DEFAULT 'standard',  -- standard, pallet, shelf, floor, cold
    max_weight    DOUBLE PRECISION,
    max_volume    DOUBLE PRECISION,
    current_item_count INTEGER DEFAULT 0,
    is_occupied   BOOLEAN DEFAULT FALSE,
    barcode       TEXT,
    sort_order    INTEGER DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'available',  -- available, occupied, reserved, maintenance
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_bins_zone ON public.inv_bins(zone_id);
CREATE INDEX IF NOT EXISTS idx_inv_bins_status ON public.inv_bins(status);

-- 4. STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS public.inv_stock_transfers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         TEXT NOT NULL DEFAULT 'default',
    transfer_number   TEXT NOT NULL,
    from_warehouse_id UUID REFERENCES public.inv_warehouses(id),
    to_warehouse_id   UUID REFERENCES public.inv_warehouses(id),
    from_bin_id       UUID REFERENCES public.inv_bins(id),
    to_bin_id         UUID REFERENCES public.inv_bins(id),
    item_id           UUID,
    item_name         TEXT,
    quantity          DOUBLE PRECISION NOT NULL DEFAULT 0,
    uom               TEXT DEFAULT 'pcs',
    reason            TEXT,
    requested_by      TEXT,
    approved_by       TEXT,
    requested_at      TIMESTAMPTZ DEFAULT now(),
    approved_at       TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    notes             TEXT,
    status            TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, in_transit, completed, cancelled
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_transfers_tenant ON public.inv_stock_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_status ON public.inv_stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_from ON public.inv_stock_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_to ON public.inv_stock_transfers(to_warehouse_id);

-- ═══ RLS ═══
ALTER TABLE public.inv_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_warehouses_all" ON public.inv_warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inv_zones_all" ON public.inv_zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inv_bins_all" ON public.inv_bins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inv_stock_transfers_all" ON public.inv_stock_transfers FOR ALL USING (true) WITH CHECK (true);

-- ═══ GRANTS ═══
GRANT ALL ON public.inv_warehouses TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.inv_zones TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.inv_bins TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.inv_stock_transfers TO anon, authenticated, service_role, authenticator;
