-- ═══════════════════════════════════════════════════════
-- Manufacturing Module Schema
-- Tables: mfg_boms, mfg_bom_lines, mfg_work_orders
-- ═══════════════════════════════════════════════════════

-- 1. Bill of Materials (BOMs)
CREATE TABLE IF NOT EXISTS mfg_boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    product_name TEXT,
    product_sku TEXT,
    description TEXT,
    uom TEXT DEFAULT 'unit',
    yield_qty NUMERIC(12,2) DEFAULT 1,
    labor_hours NUMERIC(8,2) DEFAULT 0,
    labor_cost NUMERIC(14,2) DEFAULT 0,
    overhead_cost NUMERIC(14,2) DEFAULT 0,
    total_material_cost NUMERIC(14,2) DEFAULT 0,
    total_cost NUMERIC(14,2) DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','revision','obsolete')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfg_boms_tenant ON mfg_boms(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mfg_boms_code ON mfg_boms(tenant_id, code);

ALTER TABLE mfg_boms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfg_boms_all" ON mfg_boms FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON mfg_boms TO anon, authenticated, service_role, authenticator;

-- 2. BOM Lines (components / materials)
CREATE TABLE IF NOT EXISTS mfg_bom_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES mfg_boms(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    uom TEXT DEFAULT 'pcs',
    unit_cost NUMERIC(14,2) DEFAULT 0,
    total_cost NUMERIC(14,2) DEFAULT 0,
    scrap_pct NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfg_bom_lines_bom ON mfg_bom_lines(bom_id);

ALTER TABLE mfg_bom_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfg_bom_lines_all" ON mfg_bom_lines FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON mfg_bom_lines TO anon, authenticated, service_role, authenticator;

-- 3. Work Orders
CREATE TABLE IF NOT EXISTS mfg_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    wo_number TEXT NOT NULL,
    bom_id UUID REFERENCES mfg_boms(id) ON DELETE SET NULL,
    bom_name TEXT,
    warehouse_id UUID REFERENCES inv_warehouses(id) ON DELETE SET NULL,
    warehouse_name TEXT,
    planned_qty NUMERIC(12,2) NOT NULL DEFAULT 1,
    completed_qty NUMERIC(12,2) DEFAULT 0,
    uom TEXT DEFAULT 'unit',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    assigned_to TEXT,
    planned_start DATE,
    planned_end DATE,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    estimated_cost NUMERIC(14,2) DEFAULT 0,
    actual_cost NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','planned','in_progress','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfg_wo_tenant ON mfg_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_status ON mfg_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_bom ON mfg_work_orders(bom_id);

ALTER TABLE mfg_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfg_work_orders_all" ON mfg_work_orders FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON mfg_work_orders TO anon, authenticated, service_role, authenticator;
