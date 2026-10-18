-- Inventory & Supply Chain - Phase 1 Database Schema
-- Run this in Supabase SQL Editor

-- 1. Item Categories
CREATE TABLE IF NOT EXISTS inv_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    parent_id UUID REFERENCES inv_categories(id) ON DELETE SET NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Items (Unified: physical, ticket, scheduled, rental)
CREATE TABLE IF NOT EXISTS inv_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    item_type TEXT DEFAULT 'goods', -- goods, service, raw_material, finished_good, semi_finished, consumable
    fulfillment_type TEXT DEFAULT 'physical', -- physical, ticket, scheduled, rental
    category_id UUID REFERENCES inv_categories(id) ON DELETE SET NULL,
    brand TEXT,
    tags JSONB DEFAULT '[]',
    cost_price NUMERIC(15,2) DEFAULT 0,
    selling_price NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    tax_rate NUMERIC(5,2) DEFAULT 0,
    barcode TEXT,
    qr_code TEXT,
    media_ids JSONB DEFAULT '[]',
    primary_uom TEXT DEFAULT 'pcs',
    weight NUMERIC(10,3),
    weight_unit TEXT DEFAULT 'kg',
    dimensions JSONB, -- {length, width, height, unit}
    min_stock INT DEFAULT 0,
    max_stock INT DEFAULT 0,
    reorder_point INT DEFAULT 0,
    reorder_qty INT DEFAULT 0,
    has_expiry BOOLEAN DEFAULT FALSE,
    default_shelf_life_days INT,
    has_depreciation BOOLEAN DEFAULT FALSE,
    depreciation_method TEXT DEFAULT 'none',
    useful_life_months INT,
    salvage_value NUMERIC(15,2) DEFAULT 0,
    is_fixed_asset BOOLEAN DEFAULT FALSE,
    asset_category TEXT,
    metadata JSONB DEFAULT '{}', -- flexible per fulfillment type
    status TEXT DEFAULT 'active', -- active, draft, archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_items_tenant ON inv_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_sku ON inv_items(sku);
CREATE INDEX IF NOT EXISTS idx_inv_items_fulfillment ON inv_items(fulfillment_type);
CREATE INDEX IF NOT EXISTS idx_inv_items_status ON inv_items(status);

-- 3. Item Variants
CREATE TABLE IF NOT EXISTS inv_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    attributes JSONB DEFAULT '{}', -- {color: "Red", size: "XL"}
    cost_price NUMERIC(15,2),
    selling_price NUMERIC(15,2),
    barcode TEXT,
    media_ids JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Stock Ledger (current state per item+warehouse)
CREATE TABLE IF NOT EXISTS inv_stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inv_item_variants(id) ON DELETE SET NULL,
    warehouse_id TEXT DEFAULT 'default',
    on_hand NUMERIC(15,3) DEFAULT 0,
    reserved NUMERIC(15,3) DEFAULT 0,
    committed NUMERIC(15,3) DEFAULT 0,
    available NUMERIC(15,3) GENERATED ALWAYS AS (on_hand - reserved - committed) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, item_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_stock_ledger_tenant ON inv_stock_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_ledger_item ON inv_stock_ledger(item_id);

-- 5. Stock Movements (immutable transaction log)
CREATE TABLE IF NOT EXISTS inv_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inv_item_variants(id) ON DELETE SET NULL,
    warehouse_id TEXT DEFAULT 'default',
    movement_type TEXT NOT NULL, -- IN, OUT, TRANSFER, ADJUST_IN, ADJUST_OUT, RETURN_IN, PRODUCTION, CONSUMPTION
    quantity NUMERIC(15,3) NOT NULL,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    reference TEXT, -- PO number, SO number, etc.
    reference_type TEXT, -- purchase_order, sales_order, work_order, stock_opname
    reference_id UUID,
    batch_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_tenant ON inv_stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_item ON inv_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON inv_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created ON inv_stock_movements(created_at);

-- 6. Schedules (for scheduled fulfillment type)
CREATE TABLE IF NOT EXISTS inv_item_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    route_name TEXT,
    origin TEXT,
    destination TEXT,
    departure_time TIME,
    arrival_time TIME,
    duration_minutes INT,
    recurrence_rule TEXT, -- RRULE format
    capacity_per_class JSONB DEFAULT '{}', -- {economy: 100, business: 20, vip: 10}
    vehicle_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Schedule Occurrences (auto-generated bookable slots)
CREATE TABLE IF NOT EXISTS inv_schedule_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES inv_item_schedules(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL,
    departure_time TIME,
    status TEXT DEFAULT 'scheduled', -- scheduled, boarding, departed, completed, cancelled
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Bookings (for ticket and scheduled types)
CREATE TABLE IF NOT EXISTS inv_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    order_id UUID,
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    occurrence_id UUID REFERENCES inv_schedule_occurrences(id) ON DELETE SET NULL,
    customer_id UUID,
    passenger_count INT DEFAULT 1,
    seat_ids JSONB DEFAULT '[]',
    status TEXT DEFAULT 'confirmed', -- confirmed, checked_in, no_show, cancelled
    qr_code TEXT,
    check_in_time TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Rental Assets
CREATE TABLE IF NOT EXISTS inv_rental_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    asset_code TEXT NOT NULL,
    serial_number TEXT,
    condition TEXT DEFAULT 'excellent', -- excellent, good, fair, poor
    status TEXT DEFAULT 'available', -- available, rented, maintenance, retired
    purchase_date DATE,
    purchase_cost NUMERIC(15,2),
    current_location TEXT,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Rental Contracts
CREATE TABLE IF NOT EXISTS inv_rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    order_id UUID,
    asset_id UUID NOT NULL REFERENCES inv_rental_assets(id) ON DELETE CASCADE,
    customer_id UUID,
    checkout_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    daily_rate NUMERIC(15,2) DEFAULT 0,
    deposit_amount NUMERIC(15,2) DEFAULT 0,
    deposit_returned BOOLEAN DEFAULT FALSE,
    checkout_condition TEXT,
    return_condition TEXT,
    checkout_notes TEXT,
    return_notes TEXT,
    checkout_media_ids JSONB DEFAULT '[]',
    return_media_ids JSONB DEFAULT '[]',
    late_fee NUMERIC(15,2) DEFAULT 0,
    total_charge NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, returned, overdue, lost
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (keeping it simple for now)
ALTER TABLE inv_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_item_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_schedule_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_rental_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_rental_contracts ENABLE ROW LEVEL SECURITY;

-- Service role policies (allow all for service role)
CREATE POLICY "Service role full access" ON inv_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_item_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_stock_ledger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_item_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_schedule_occurrences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_rental_assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_rental_contracts FOR ALL USING (true) WITH CHECK (true);
