-- ═══════════════════════════════════════════════════════
-- Stock Opname (Physical Count / Audit) Schema
-- Tables: inv_opname_sessions, inv_opname_lines
-- ═══════════════════════════════════════════════════════

-- 1. Opname Sessions (counting session headers)
CREATE TABLE IF NOT EXISTS inv_opname_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    session_code TEXT NOT NULL,
    title TEXT NOT NULL,
    warehouse_id UUID REFERENCES inv_warehouses(id) ON DELETE SET NULL,
    warehouse_name TEXT,
    counted_by TEXT,
    reviewed_by TEXT,
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_items INT DEFAULT 0,
    items_counted INT DEFAULT 0,
    total_variance_qty NUMERIC(14,2) DEFAULT 0,
    total_variance_value NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','counting','review','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opname_sessions_tenant ON inv_opname_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opname_sessions_status ON inv_opname_sessions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_opname_sessions_code ON inv_opname_sessions(tenant_id, session_code);

ALTER TABLE inv_opname_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_opname_sessions_all" ON inv_opname_sessions FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON inv_opname_sessions TO anon, authenticated, service_role, authenticator;

-- 2. Opname Lines (individual counted items)
CREATE TABLE IF NOT EXISTS inv_opname_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES inv_opname_sessions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    zone_name TEXT,
    bin_code TEXT,
    uom TEXT DEFAULT 'pcs',
    system_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    actual_qty NUMERIC(12,2),
    variance_qty NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE(actual_qty, 0) - system_qty) STORED,
    unit_cost NUMERIC(14,2) DEFAULT 0,
    variance_value NUMERIC(14,2) GENERATED ALWAYS AS ((COALESCE(actual_qty, 0) - system_qty) * COALESCE(unit_cost, 0)) STORED,
    counted_at TIMESTAMPTZ,
    counted_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','counted','verified','discrepancy')),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opname_lines_session ON inv_opname_lines(session_id);

ALTER TABLE inv_opname_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_opname_lines_all" ON inv_opname_lines FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON inv_opname_lines TO anon, authenticated, service_role, authenticator;
