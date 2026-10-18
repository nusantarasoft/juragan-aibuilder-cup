-- WMS Put-Away & Pick Operations Schema
-- Run this in Supabase SQL Editor

-- 1. Bin Contents — tracks what items are stored in each bin
CREATE TABLE IF NOT EXISTS inv_bin_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    bin_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inv_item_variants(id) ON DELETE SET NULL,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
    uom TEXT DEFAULT 'pcs',
    lot_number TEXT,
    batch_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    last_counted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_bin_contents_tenant ON inv_bin_contents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_bin_contents_bin ON inv_bin_contents(bin_id);
CREATE INDEX IF NOT EXISTS idx_inv_bin_contents_item ON inv_bin_contents(item_id);

-- 2. Put-Away Tasks — tracks inbound items being assigned to bins
CREATE TABLE IF NOT EXISTS inv_putaway_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    task_number TEXT NOT NULL,
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    item_name TEXT,
    item_sku TEXT,
    variant_id UUID REFERENCES inv_item_variants(id) ON DELETE SET NULL,
    quantity NUMERIC(15,3) NOT NULL,
    uom TEXT DEFAULT 'pcs',
    source_reference TEXT,          -- GRN number, PO number, etc.
    source_type TEXT,               -- grn, purchase_order, production, return
    source_id UUID,
    warehouse_id TEXT DEFAULT 'default',
    suggested_bin_id UUID,          -- system-suggested bin
    suggested_bin_code TEXT,
    actual_bin_id UUID,             -- actual bin where item was placed
    actual_bin_code TEXT,
    assigned_to TEXT,               -- worker name or ID
    priority TEXT DEFAULT 'normal', -- urgent, high, normal, low
    lot_number TEXT,
    batch_number TEXT,
    expiry_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'pending',  -- pending, assigned, in_progress, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_putaway_tenant ON inv_putaway_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_putaway_status ON inv_putaway_tasks(status);
CREATE INDEX IF NOT EXISTS idx_inv_putaway_warehouse ON inv_putaway_tasks(warehouse_id);

-- 3. Pick Tasks — tracks outbound items being picked from bins
CREATE TABLE IF NOT EXISTS inv_pick_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    task_number TEXT NOT NULL,
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    item_name TEXT,
    item_sku TEXT,
    variant_id UUID REFERENCES inv_item_variants(id) ON DELETE SET NULL,
    quantity NUMERIC(15,3) NOT NULL,
    picked_quantity NUMERIC(15,3) DEFAULT 0,
    uom TEXT DEFAULT 'pcs',
    order_reference TEXT,           -- SO number, WO number, etc.
    order_type TEXT,                -- sales_order, work_order, transfer, manual
    order_id UUID,
    warehouse_id TEXT DEFAULT 'default',
    from_bin_id UUID,               -- bin to pick from
    from_bin_code TEXT,
    assigned_to TEXT,
    priority TEXT DEFAULT 'normal',
    pick_sequence INT DEFAULT 0,    -- optimized pick order
    lot_number TEXT,
    batch_number TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'pending',  -- pending, assigned, in_progress, completed, short_picked, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_pick_tenant ON inv_pick_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_pick_status ON inv_pick_tasks(status);
CREATE INDEX IF NOT EXISTS idx_inv_pick_warehouse ON inv_pick_tasks(warehouse_id);

-- Enable RLS
ALTER TABLE inv_bin_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_putaway_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_pick_tasks ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role full access" ON inv_bin_contents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_putaway_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_pick_tasks FOR ALL USING (true) WITH CHECK (true);
