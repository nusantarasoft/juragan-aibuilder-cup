-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  NUSANTARASOFT - Complete Schema + Seed Data                â•‘
-- â•‘  Auto-runs on first Docker Compose init                     â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 1: WAREHOUSE MANAGEMENT SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS inv_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    warehouse_type TEXT DEFAULT 'general',
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Indonesia',
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    total_capacity INT DEFAULT 0,
    used_capacity INT DEFAULT 0,
    manager TEXT,
    phone TEXT,
    email TEXT,
    operating_hours TEXT,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES inv_warehouses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    zone_type TEXT DEFAULT 'storage',
    description TEXT,
    capacity INT DEFAULT 0,
    temperature_min NUMERIC(5,1),
    temperature_max NUMERIC(5,1),
    is_restricted BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES inv_zones(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    aisle TEXT,
    rack TEXT,
    level TEXT,
    position TEXT,
    bin_type TEXT DEFAULT 'standard',
    max_weight NUMERIC(10,2),
    max_volume NUMERIC(10,2),
    current_item_count INT DEFAULT 0,
    is_occupied BOOLEAN DEFAULT FALSE,
    barcode TEXT,
    sort_order INT DEFAULT 0,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    transfer_number TEXT NOT NULL,
    from_warehouse_id UUID REFERENCES inv_warehouses(id),
    to_warehouse_id UUID REFERENCES inv_warehouses(id),
    from_bin_id UUID REFERENCES inv_bins(id),
    to_bin_id UUID REFERENCES inv_bins(id),
    item_id UUID,
    item_name TEXT,
    quantity NUMERIC(15,3) DEFAULT 0,
    uom TEXT DEFAULT 'pcs',
    reason TEXT,
    requested_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 2: MANUFACTURING SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    yield_qty NUMERIC(15,3) DEFAULT 1,
    labor_hours NUMERIC(10,2) DEFAULT 0,
    labor_cost NUMERIC(15,2) DEFAULT 0,
    overhead_cost NUMERIC(15,2) DEFAULT 0,
    total_material_cost NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mfg_bom_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES mfg_boms(id) ON DELETE CASCADE,
    item_id UUID,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    quantity NUMERIC(15,3) DEFAULT 1,
    uom TEXT DEFAULT 'pcs',
    unit_cost NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    scrap_pct NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mfg_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    wo_number TEXT NOT NULL,
    bom_id UUID REFERENCES mfg_boms(id) ON DELETE SET NULL,
    bom_name TEXT,
    warehouse_id UUID,
    warehouse_name TEXT,
    planned_qty NUMERIC(15,3) DEFAULT 1,
    completed_qty NUMERIC(15,3) DEFAULT 0,
    uom TEXT DEFAULT 'unit',
    priority TEXT DEFAULT 'normal',
    assigned_to TEXT,
    planned_start DATE,
    planned_end DATE,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    estimated_cost NUMERIC(15,2) DEFAULT 0,
    actual_cost NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 3: STOCK OPNAME SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS inv_opname_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    session_code TEXT NOT NULL,
    title TEXT NOT NULL,
    warehouse_id UUID,
    warehouse_name TEXT,
    counted_by TEXT,
    reviewed_by TEXT,
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_items INT DEFAULT 0,
    items_counted INT DEFAULT 0,
    total_variance_qty NUMERIC(15,3) DEFAULT 0,
    total_variance_value NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_opname_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES inv_opname_sessions(id) ON DELETE CASCADE,
    item_id UUID,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    zone_name TEXT,
    bin_code TEXT,
    uom TEXT DEFAULT 'pcs',
    system_qty NUMERIC(15,3) DEFAULT 0,
    actual_qty NUMERIC(15,3),
    unit_cost NUMERIC(15,2) DEFAULT 0,
    counted_at TIMESTAMPTZ,
    counted_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 4: BOOKING & TICKETING SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS booking_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    schedule_code TEXT,
    route_name TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TIME,
    arrival_time TIME,
    duration_minutes INT,
    capacity INT DEFAULT 100,
    vehicle_name TEXT,
    vessel_type TEXT,
    price_economy NUMERIC(15,2) DEFAULT 0,
    price_business NUMERIC(15,2) DEFAULT 0,
    price_vip NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES booking_schedules(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL,
    departure_time TIME,
    total_capacity INT DEFAULT 100,
    booked_count INT DEFAULT 0,
    checked_in_count INT DEFAULT 0,
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    booking_code TEXT,
    schedule_id UUID REFERENCES booking_schedules(id),
    occurrence_id UUID REFERENCES booking_occurrences(id),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    passenger_count INT DEFAULT 1,
    class TEXT DEFAULT 'economy',
    total_amount NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    id_number TEXT,
    nationality TEXT,
    seat_label TEXT,
    class TEXT DEFAULT 'economy',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 5: RENTAL ENGINE SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS rental_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    asset_code TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    serial_number TEXT,
    category TEXT,
    condition TEXT DEFAULT 'excellent',
    purchase_date DATE,
    purchase_cost NUMERIC(15,2),
    current_location TEXT,
    daily_rate NUMERIC(15,2) DEFAULT 0,
    deposit_amount NUMERIC(15,2) DEFAULT 0,
    total_revenue NUMERIC(15,2) DEFAULT 0,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    contract_code TEXT,
    asset_id UUID REFERENCES rental_assets(id),
    asset_name TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_id_number TEXT,
    checkout_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    daily_rate NUMERIC(15,2) DEFAULT 0,
    deposit_amount NUMERIC(15,2) DEFAULT 0,
    deposit_returned NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0,
    late_fee NUMERIC(15,2) DEFAULT 0,
    damage_fee NUMERIC(15,2) DEFAULT 0,
    total_charge NUMERIC(15,2) DEFAULT 0,
    checkout_condition TEXT,
    return_condition TEXT,
    checkout_notes TEXT,
    return_notes TEXT,
    returned_by TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 6: E-COMMERCE SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS ecom_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    customer_code TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    id_number TEXT,
    customer_type TEXT DEFAULT 'individual',
    account_id UUID,
    contact_id UUID,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    order_number TEXT NOT NULL,
    customer_id UUID REFERENCES ecom_customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_province TEXT,
    shipping_postal_code TEXT,
    shipping_method TEXT,
    shipping_cost NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    notes TEXT,
    source TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecom_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES ecom_orders(id) ON DELETE CASCADE,
    item_id UUID,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    fulfillment_type TEXT DEFAULT 'physical',
    fulfillment_ref TEXT,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(15,2) DEFAULT 0,
    discount NUMERIC(15,2) DEFAULT 0,
    tax NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0,
    variant_info JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecom_store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default' UNIQUE,
    store_name TEXT,
    store_email TEXT,
    store_phone TEXT,
    store_address TEXT,
    default_currency TEXT DEFAULT 'IDR',
    tax_rate NUMERIC(5,2) DEFAULT 11,
    tax_included BOOLEAN DEFAULT FALSE,
    shipping_enabled BOOLEAN DEFAULT TRUE,
    default_shipping_cost NUMERIC(15,2) DEFAULT 0,
    free_shipping_threshold NUMERIC(15,2) DEFAULT 0,
    payment_methods JSONB DEFAULT '["bank_transfer","cash"]',
    fulfillment_physical BOOLEAN DEFAULT TRUE,
    fulfillment_ticket BOOLEAN DEFAULT TRUE,
    fulfillment_scheduled BOOLEAN DEFAULT TRUE,
    fulfillment_rental BOOLEAN DEFAULT TRUE,
    low_stock_alert INT DEFAULT 10,
    order_prefix TEXT DEFAULT 'ORD',
    invoice_prefix TEXT DEFAULT 'INV',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 7: RLS POLICIES (allow all for service role)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

DO $$ BEGIN
    EXECUTE 'ALTER TABLE inv_warehouses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE inv_zones ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE inv_bins ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE inv_stock_transfers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE mfg_boms ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE mfg_bom_lines ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE mfg_work_orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE inv_opname_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE inv_opname_lines ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE booking_schedules ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE booking_occurrences ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE bookings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE rental_assets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE ecom_customers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE ecom_orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE ecom_order_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE ecom_store_settings ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create open policies
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'inv_warehouses','inv_zones','inv_bins','inv_stock_transfers',
        'mfg_boms','mfg_bom_lines','mfg_work_orders',
        'inv_opname_sessions','inv_opname_lines',
        'booking_schedules','booking_occurrences','bookings','booking_passengers',
        'rental_assets','rental_contracts',
        'ecom_customers','ecom_orders','ecom_order_items','ecom_store_settings'
    ] LOOP
        BEGIN
            EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;
END $$;

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SEED DATA - All Modules                                    â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€ WAREHOUSES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_warehouses (id, tenant_id, code, name, warehouse_type, address, city, country, total_capacity, manager, phone, email, status) VALUES
('a0000001-0001-4000-a000-000000000001', 'default', 'WH-DPS-01', 'Gudang Utama Denpasar', 'general', 'Jl. Bypass Ngurah Rai No. 100', 'Denpasar', 'Indonesia', 5000, 'I Made Suardana', '+62-361-555-7701', 'gudang.dps@nusantarasoft.id', 'active'),
('a0000001-0002-4000-a000-000000000002', 'default', 'WH-SNR-02', 'Depot Sanur Harbour', 'transit', 'Jl. Pantai Sanur, Pelabuhan', 'Sanur', 'Indonesia', 2000, 'Ketut Wirawan', '+62-361-555-7702', 'depot.sanur@nusantarasoft.id', 'active'),
('a0000001-0003-4000-a000-000000000003', 'default', 'WH-PDG-03', 'Gudang Padang Bai', 'port', 'Pelabuhan Padang Bai', 'Karangasem', 'Indonesia', 3000, 'Nyoman Astra', '+62-363-555-7703', 'gudang.pdg@nusantarasoft.id', 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ ZONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_zones (id, warehouse_id, code, name, zone_type, description, capacity, sort_order, status) VALUES
('b0000001-0001-4000-a000-000000000001', 'a0000001-0001-4000-a000-000000000001', 'Z-A', 'Zone A - Spare Parts', 'storage', 'Engine and mechanical spare parts', 2000, 1, 'active'),
('b0000001-0002-4000-a000-000000000002', 'a0000001-0001-4000-a000-000000000001', 'Z-B', 'Zone B - Safety Equipment', 'storage', 'Life jackets, fire extinguishers', 1000, 2, 'active'),
('b0000001-0003-4000-a000-000000000003', 'a0000001-0001-4000-a000-000000000001', 'Z-C', 'Zone C - Fuel Storage', 'hazardous', 'Diesel and lubricant storage', 1500, 3, 'active'),
('b0000001-0004-4000-a000-000000000004', 'a0000001-0002-4000-a000-000000000002', 'Z-D', 'Zone D - Transit Goods', 'staging', 'Goods waiting for boarding', 1000, 1, 'active'),
('b0000001-0005-4000-a000-000000000005', 'a0000001-0002-4000-a000-000000000002', 'Z-E', 'Zone E - Passenger Supplies', 'storage', 'Snacks, water, amenities', 500, 2, 'active'),
('b0000001-0006-4000-a000-000000000006', 'a0000001-0003-4000-a000-000000000003', 'Z-F', 'Zone F - Heavy Equipment', 'storage', 'Propellers, hulls, large parts', 1500, 1, 'active'),
('b0000001-0007-4000-a000-000000000007', 'a0000001-0003-4000-a000-000000000003', 'Z-G', 'Zone G - Paint & Chemicals', 'hazardous', 'Marine paint and antifouling', 800, 2, 'active'),
('b0000001-0008-4000-a000-000000000008', 'a0000001-0003-4000-a000-000000000003', 'Z-H', 'Zone H - Electronics', 'climate_controlled', 'GPS, navigation, electrical', 700, 3, 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ BOOKING SCHEDULES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO booking_schedules (id, tenant_id, schedule_code, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity, vehicle_name, vessel_type, price_economy, price_business, price_vip, status) VALUES
('c0000001-0001-4000-a000-000000000001', 'default', 'SCH-001', 'Sanur â†’ Nusa Penida (Morning)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '07:30', '08:15', 45, 40, 'Maruti Express I', 'speedboat', 350000, 500000, 0, 'active'),
('c0000001-0002-4000-a000-000000000002', 'default', 'SCH-002', 'Nusa Penida â†’ Sanur (Afternoon)', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '16:00', '16:45', 45, 40, 'Maruti Express I', 'speedboat', 350000, 500000, 0, 'active'),
('c0000001-0003-4000-a000-000000000003', 'default', 'SCH-003', 'Padang Bai â†’ Gili T (Morning)', 'Padang Bai Harbour', 'Gili Trawangan', '09:00', '11:30', 150, 80, 'Gili Getaway', 'speedboat', 600000, 800000, 1000000, 'active'),
('c0000001-0004-4000-a000-000000000004', 'default', 'SCH-004', 'Gili T â†’ Padang Bai (Afternoon)', 'Gili Trawangan', 'Padang Bai Harbour', '14:00', '16:30', 150, 80, 'Gili Getaway', 'speedboat', 600000, 800000, 1000000, 'active'),
('c0000001-0005-4000-a000-000000000005', 'default', 'SCH-005', 'Sanur â†’ Lembongan (Morning)', 'Sanur Harbour', 'Jungutbatu, Lembongan', '08:00', '08:30', 30, 45, 'Rocky Fast Cruises', 'speedboat', 300000, 450000, 0, 'active'),
('c0000001-0006-4000-a000-000000000006', 'default', 'SCH-006', 'Labuan Bajo â†’ Komodo (Morning)', 'Labuan Bajo Harbour', 'Komodo Island', '07:00', '09:00', 120, 30, 'Komodo Jet', 'speedboat', 500000, 750000, 0, 'active'),
('c0000001-0007-4000-a000-000000000007', 'default', 'SCH-007', 'Sorong â†’ Waisai (Morning)', 'Sorong Harbour', 'Waisai, Raja Ampat', '08:00', '10:00', 120, 20, 'Raja Ampat Flyer', 'speedboat', 1350000, 0, 0, 'active'),
('c0000001-0008-4000-a000-000000000008', 'default', 'SCH-008', 'Sanur â†’ Nusa Penida (Midday)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '11:00', '11:50', 50, 50, 'Maruti Express II', 'speedboat', 500000, 700000, 900000, 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ BOOKING OCCURRENCES (next 14 days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO booking_occurrences (schedule_id, departure_date, departure_time, total_capacity, status)
SELECT s.id, d.dt::date, s.departure_time, s.capacity, 'scheduled'
FROM booking_schedules s
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', INTERVAL '1 day') AS d(dt)
WHERE s.id::text LIKE 'c0000001-%'
ON CONFLICT DO NOTHING;

-- â”€â”€â”€ BOOKINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO bookings (id, tenant_id, booking_code, schedule_id, customer_name, customer_email, customer_phone, passenger_count, class, total_amount, paid_amount, status) VALUES
('d0000001-0001-4000-a000-000000000001', 'default', 'BK-2026-001', 'c0000001-0001-4000-a000-000000000001', 'John Smith', 'john@example.com', '+1-555-0101', 2, 'economy', 700000, 700000, 'confirmed'),
('d0000001-0002-4000-a000-000000000002', 'default', 'BK-2026-002', 'c0000001-0003-4000-a000-000000000003', 'Sarah Johnson', 'sarah.j@gmail.com', '+44-7700-900123', 1, 'business', 800000, 800000, 'confirmed'),
('d0000001-0003-4000-a000-000000000003', 'default', 'BK-2026-003', 'c0000001-0005-4000-a000-000000000005', 'Made Wijaya', 'made.w@yahoo.co.id', '+62-812-3456-789', 4, 'economy', 1200000, 600000, 'pending'),
('d0000001-0004-4000-a000-000000000004', 'default', 'BK-2026-004', 'c0000001-0006-4000-a000-000000000006', 'Hans Mueller', 'hans.m@web.de', '+49-170-1234567', 2, 'economy', 1000000, 1000000, 'checked_in'),
('d0000001-0005-4000-a000-000000000005', 'default', 'BK-2026-005', 'c0000001-0001-4000-a000-000000000001', 'Yuki Tanaka', 'yuki.t@mail.jp', '+81-90-1234-5678', 1, 'business', 500000, 500000, 'confirmed'),
('d0000001-0006-4000-a000-000000000006', 'default', 'BK-2026-006', 'c0000001-0007-4000-a000-000000000007', 'Emma Watson', 'emma.w@outlook.com', '+61-400-123456', 2, 'economy', 2700000, 2700000, 'confirmed'),
('d0000001-0007-4000-a000-000000000007', 'default', 'BK-2026-007', 'c0000001-0008-4000-a000-000000000008', 'Putu Dharma', 'putu.d@gmail.com', '+62-817-8765-432', 3, 'vip', 2700000, 0, 'pending'),
('d0000001-0008-4000-a000-000000000008', 'default', 'BK-2026-008', 'c0000001-0004-4000-a000-000000000004', 'Li Wei', 'li.wei@qq.com', '+86-139-1234-5678', 2, 'economy', 1200000, 1200000, 'confirmed')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ RENTAL ASSETS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO rental_assets (id, tenant_id, asset_code, asset_name, serial_number, category, condition, purchase_date, purchase_cost, current_location, daily_rate, deposit_amount, status) VALUES
('e0000001-0001-4000-a000-000000000001', 'default', 'RNT-JET-001', 'Yamaha WaveRunner VX', 'YMA-WR-2024-001', 'Jet Ski', 'excellent', '2024-06-15', 185000000, 'Sanur Beach', 1500000, 5000000, 'available'),
('e0000001-0002-4000-a000-000000000002', 'default', 'RNT-JET-002', 'Yamaha WaveRunner VX', 'YMA-WR-2024-002', 'Jet Ski', 'good', '2024-06-15', 185000000, 'Sanur Beach', 1500000, 5000000, 'rented'),
('e0000001-0003-4000-a000-000000000003', 'default', 'RNT-SUP-001', 'Starboard iGO Zen', 'STB-SUP-2024-001', 'Stand Up Paddle', 'excellent', '2024-08-01', 12000000, 'Nusa Dua Beach', 250000, 500000, 'available'),
('e0000001-0004-4000-a000-000000000004', 'default', 'RNT-KYK-001', 'Hobie Mirage Eclipse', 'HOB-KYK-2024-001', 'Kayak', 'excellent', '2024-09-01', 25000000, 'Sanur Harbour', 350000, 1000000, 'available'),
('e0000001-0005-4000-a000-000000000005', 'default', 'RNT-SNK-001', 'Cressi Snorkeling Set Pro', 'CRS-SNK-2024-001', 'Snorkeling', 'good', '2024-03-01', 3500000, 'Sanur Harbour', 100000, 200000, 'maintenance')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ RENTAL CONTRACTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO rental_contracts (id, tenant_id, contract_code, asset_id, asset_name, customer_name, customer_email, customer_phone, customer_id_number, checkout_date, expected_return_date, daily_rate, deposit_amount, subtotal, total_charge, checkout_condition, status) VALUES
('f0000001-0001-4000-a000-000000000001', 'default', 'RC-2026-001', 'e0000001-0002-4000-a000-000000000002', 'Yamaha WaveRunner VX', 'James Wilson', 'james.w@gmail.com', '+1-555-0201', 'P12345678', CURRENT_DATE, CURRENT_DATE + 3, 1500000, 5000000, 4500000, 4500000, 'excellent', 'active'),
('f0000001-0002-4000-a000-000000000002', 'default', 'RC-2026-002', 'e0000001-0003-4000-a000-000000000003', 'Starboard iGO Zen', 'Maria Garcia', 'maria.g@hotmail.com', '+34-600-123456', 'ES-XY789012', CURRENT_DATE - 2, CURRENT_DATE, 250000, 500000, 500000, 500000, 'excellent', 'active'),
('f0000001-0003-4000-a000-000000000003', 'default', 'RC-2026-003', 'e0000001-0004-4000-a000-000000000004', 'Hobie Mirage Eclipse', 'Tanaka Hiroshi', 'hiroshi@mail.jp', '+81-80-9876-5432', 'JP-AB123456', CURRENT_DATE - 5, CURRENT_DATE - 3, 350000, 1000000, 700000, 700000, 'good', 'returned'),
('f0000001-0004-4000-a000-000000000004', 'default', 'RC-2026-004', 'e0000001-0001-4000-a000-000000000001', 'Yamaha WaveRunner VX', 'Sophie Dubois', 'sophie.d@orange.fr', '+33-6-12-34-56-78', 'FR-CD567890', CURRENT_DATE - 7, CURRENT_DATE - 5, 1500000, 5000000, 3000000, 3000000, 'excellent', 'returned')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ E-COMMERCE CUSTOMERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO ecom_customers (id, tenant_id, customer_code, first_name, last_name, email, phone, company, address, city, province, customer_type, status) VALUES
('a1000001-0001-4000-a000-000000000001', 'default', 'CUST-001', 'Wayan', 'Dharma', 'wayan.d@gmail.com', '+62-812-1111-001', NULL, 'Jl. Raya Ubud No.10', 'Gianyar', 'Bali', 'individual', 'active'),
('a1000001-0002-4000-a000-000000000002', 'default', 'CUST-002', 'Ni Luh', 'Sari', 'niluh.s@yahoo.co.id', '+62-817-2222-002', NULL, 'Jl. Sunset Road No.55', 'Kuta', 'Bali', 'individual', 'active'),
('a1000001-0003-4000-a000-000000000003', 'default', 'CUST-003', 'PT Bali', 'Tours', 'ops@balitours.co.id', '+62-361-555-003', 'PT Bali Discovery Tours', 'Jl. Bypass Ngurah Rai No.99', 'Denpasar', 'Bali', 'corporate', 'active'),
('a1000001-0004-4000-a000-000000000004', 'default', 'CUST-004', 'Ketut', 'Wirawan', 'ketut.w@hotmail.com', '+62-813-4444-004', NULL, 'Jl. Pantai Kuta No.20', 'Badung', 'Bali', 'individual', 'active'),
('a1000001-0005-4000-a000-000000000005', 'default', 'CUST-005', 'CV Nusa', 'Travel', 'booking@nusatravel.id', '+62-361-555-005', 'CV Nusa Penida Travel', 'Jl. Toyapakeh No.5', 'Klungkung', 'Bali', 'corporate', 'active'),
('a1000001-0006-4000-a000-000000000006', 'default', 'CUST-006', 'Made', 'Astawa', 'made.a@gmail.com', '+62-819-6666-006', NULL, 'Jl. Danau Tamblingan No.88', 'Denpasar', 'Bali', 'individual', 'active'),
('a1000001-0007-4000-a000-000000000007', 'default', 'CUST-007', 'John', 'Smith', 'john.s@traveler.com', '+1-555-7777-007', NULL, '123 Main St', 'Sydney', 'NSW', 'individual', 'active'),
('a1000001-0008-4000-a000-000000000008', 'default', 'CUST-008', 'Sakura', 'Yamamoto', 'sakura.y@yahoo.co.jp', '+81-90-8888-008', NULL, '4-5-6 Shibuya', 'Tokyo', 'Kanto', 'individual', 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ E-COMMERCE ORDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO ecom_orders (id, tenant_id, order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_method, shipping_cost, subtotal, tax_amount, total_amount, payment_method, payment_status, source, status, created_at) VALUES
('b1000001-0001-4000-a000-000000000001', 'default', 'ORD-2026-001', 'a1000001-0001-4000-a000-000000000001', 'Wayan Dharma', 'wayan.d@gmail.com', '+62-812-1111-001', 'Jl. Raya Ubud No.10, Gianyar', 'Gianyar', 'regular', 15000, 700000, 77000, 792000, 'bank_transfer', 'paid', 'admin', 'confirmed', '2026-03-20'),
('b1000001-0002-4000-a000-000000000002', 'default', 'ORD-2026-002', 'a1000001-0003-4000-a000-000000000003', 'PT Bali Tours', 'ops@balitours.co.id', '+62-361-555-003', 'Jl. Bypass Ngurah Rai No.99', 'Denpasar', 'express', 30000, 6000000, 660000, 6690000, 'bank_transfer', 'paid', 'admin', 'shipped', '2026-03-18'),
('b1000001-0003-4000-a000-000000000003', 'default', 'ORD-2026-003', 'a1000001-0005-4000-a000-000000000005', 'CV Nusa Travel', 'booking@nusatravel.id', '+62-361-555-005', 'Jl. Toyapakeh No.5', 'Klungkung', 'regular', 15000, 3500000, 385000, 3900000, 'cash', 'paid', 'admin', 'delivered', '2026-03-15'),
('b1000001-0004-4000-a000-000000000004', 'default', 'ORD-2026-004', 'a1000001-0007-4000-a000-000000000007', 'John Smith', 'john.s@traveler.com', '+1-555-7777-007', '123 Main St, Sydney', 'Sydney', NULL, 0, 1350000, 148500, 1498500, 'credit_card', 'paid', 'website', 'confirmed', '2026-03-22'),
('b1000001-0005-4000-a000-000000000005', 'default', 'ORD-2026-005', 'a1000001-0002-4000-a000-000000000002', 'Ni Luh Sari', 'niluh.s@yahoo.co.id', '+62-817-2222-002', 'Jl. Sunset Road No.55', 'Kuta', 'regular', 15000, 500000, 55000, 570000, 'e_wallet', 'unpaid', 'admin', 'pending', '2026-03-25'),
('b1000001-0006-4000-a000-000000000006', 'default', 'ORD-2026-006', 'a1000001-0008-4000-a000-000000000008', 'Sakura Yamamoto', 'sakura.y@yahoo.co.jp', '+81-90-8888-008', '4-5-6 Shibuya, Tokyo', 'Tokyo', 'international', 150000, 2700000, 297000, 3147000, 'credit_card', 'paid', 'website', 'processing', '2026-03-21'),
('b1000001-0007-4000-a000-000000000007', 'default', 'ORD-2026-007', 'a1000001-0004-4000-a000-000000000004', 'Ketut Wirawan', 'ketut.w@hotmail.com', '+62-813-4444-004', 'Jl. Pantai Kuta No.20', 'Badung', 'same_day', 25000, 250000, 27500, 302500, 'cash', 'paid', 'admin', 'completed', '2026-03-10'),
('b1000001-0008-4000-a000-000000000008', 'default', 'ORD-2026-008', 'a1000001-0006-4000-a000-000000000006', 'Made Astawa', 'made.a@gmail.com', '+62-819-6666-006', 'Jl. Danau Tamblingan No.88', 'Denpasar', 'regular', 15000, 1200000, 132000, 1347000, 'bank_transfer', 'unpaid', 'admin', 'pending', '2026-03-26')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ E-COMMERCE STORE SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO ecom_store_settings (tenant_id, store_name, store_email, store_phone, store_address, default_currency, tax_rate, shipping_enabled, default_shipping_cost, order_prefix) VALUES
('default', 'Nusantarasoft Marine Store', 'store@nusantarasoft.id', '+62-361-555-8888', 'Jl. Bypass Ngurah Rai No. 100, Denpasar, Bali', 'IDR', 11, TRUE, 15000, 'ORD')
ON CONFLICT (tenant_id) DO NOTHING;

-- â”€â”€â”€ MANUFACTURING BOMs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO mfg_boms (id, tenant_id, code, name, version, product_name, product_sku, description, uom, yield_qty, labor_hours, labor_cost, overhead_cost, total_material_cost, total_cost, status) VALUES
('c1000001-0001-4000-a000-000000000001', 'default', 'BOM-001', 'Speedboat Hull Assembly', '1.0', 'Fiberglass Hull 35ft', 'HULL-FB-35', 'Complete fiberglass hull assembly for 35ft speedboat', 'unit', 1, 120, 6000000, 2000000, 45000000, 53000000, 'active'),
('c1000001-0002-4000-a000-000000000002', 'default', 'BOM-002', 'Life Jacket Assembly Kit', '2.0', 'Marine Life Jacket Type III', 'LJ-III-STD', 'Standard marine life jacket assembly with reflective strips', 'unit', 10, 8, 800000, 200000, 5000000, 6000000, 'active'),
('c1000001-0003-4000-a000-000000000003', 'default', 'BOM-003', 'Navigation Console Unit', '1.0', 'GPS Nav Console V2', 'NAV-CON-V2', 'Integrated navigation console with GPS, radar, and depth sounder', 'unit', 1, 16, 2400000, 500000, 35000000, 37900000, 'draft')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ BOM LINES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO mfg_bom_lines (id, bom_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order) VALUES
('d1000001-0001-4000-a000-000000000001', 'c1000001-0001-4000-a000-000000000001', 'Fiberglass Cloth Roll', 'MAT-FG-ROLL', 15, 'roll', 1200000, 18000000, 5, 1),
('d1000001-0002-4000-a000-000000000002', 'c1000001-0001-4000-a000-000000000001', 'Polyester Resin', 'MAT-PR-20L', 8, 'drum', 2500000, 20000000, 3, 2),
('d1000001-0003-4000-a000-000000000003', 'c1000001-0001-4000-a000-000000000001', 'Gelcoat White', 'MAT-GC-WHT', 5, 'kg', 350000, 1750000, 2, 3),
('d1000001-0004-4000-a000-000000000004', 'c1000001-0001-4000-a000-000000000001', 'Marine Plywood', 'MAT-MPW-12', 10, 'sheet', 525000, 5250000, 0, 4),
('d1000001-0005-4000-a000-000000000005', 'c1000001-0002-4000-a000-000000000002', 'Nylon Fabric Roll', 'MAT-NF-420D', 5, 'roll', 450000, 2250000, 3, 1),
('d1000001-0006-4000-a000-000000000006', 'c1000001-0002-4000-a000-000000000002', 'EPE Foam Sheet', 'MAT-FOAM-EPE', 20, 'sheet', 85000, 1700000, 5, 2),
('d1000001-0007-4000-a000-000000000007', 'c1000001-0002-4000-a000-000000000002', 'Reflective Strip', 'MAT-REF-3M', 30, 'meter', 35000, 1050000, 0, 3)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ WORK ORDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO mfg_work_orders (id, tenant_id, wo_number, bom_id, bom_name, planned_qty, uom, priority, assigned_to, planned_start, planned_end, estimated_cost, status, created_at) VALUES
('e1000001-0001-4000-a000-000000000001', 'default', 'WO-2026-001', 'c1000001-0001-4000-a000-000000000001', 'Speedboat Hull Assembly', 2, 'unit', 'high', 'Pak Nyoman', '2026-04-01', '2026-04-30', 106000000, 'planned', '2026-03-20'),
('e1000001-0002-4000-a000-000000000002', 'default', 'WO-2026-002', 'c1000001-0002-4000-a000-000000000002', 'Life Jacket Assembly Kit', 50, 'unit', 'normal', 'Bu Kadek', '2026-04-05', '2026-04-10', 30000000, 'in_progress', '2026-03-22'),
('e1000001-0003-4000-a000-000000000003', 'default', 'WO-2026-003', 'c1000001-0002-4000-a000-000000000002', 'Life Jacket Assembly Kit', 30, 'unit', 'low', 'Bu Kadek', '2026-04-15', '2026-04-18', 18000000, 'draft', '2026-03-25'),
('e1000001-0004-4000-a000-000000000004', 'default', 'WO-2026-004', 'c1000001-0003-4000-a000-000000000003', 'Navigation Console Unit', 5, 'unit', 'high', 'Pak Wayan', '2026-04-08', '2026-04-20', 189500000, 'planned', '2026-03-24'),
('e1000001-0005-4000-a000-000000000005', 'default', 'WO-2026-005', 'c1000001-0001-4000-a000-000000000001', 'Speedboat Hull Assembly', 1, 'unit', 'urgent', 'Pak Nyoman', '2026-03-28', '2026-04-15', 53000000, 'in_progress', '2026-03-26')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ STOCK OPNAME SESSIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_opname_sessions (id, tenant_id, session_code, title, warehouse_id, warehouse_name, counted_by, scheduled_date, total_items, items_counted, status, created_at) VALUES
('f1000001-0001-4000-a000-000000000001', 'default', 'SOP-2026-001', 'Q1 2026 - Gudang Utama Inventory', 'a0000001-0001-4000-a000-000000000001', 'Gudang Utama Denpasar', 'Ketut Wirawan', '2026-03-31', 6, 4, 'counting', '2026-03-25'),
('f1000001-0002-4000-a000-000000000002', 'default', 'SOP-2026-002', 'Q1 2026 - Depot Sanur Check', 'a0000001-0002-4000-a000-000000000002', 'Depot Sanur Harbour', 'Made Suardana', '2026-04-05', 4, 0, 'draft', '2026-03-26')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ STOCK OPNAME LINES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_opname_lines (id, session_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_by, status, sort_order) VALUES
('a2000001-0001-4000-a000-000000000001', 'f1000001-0001-4000-a000-000000000001', 'Yamaha Outboard Oil Filter', 'YMA-OF-001', 'Zone A - Spare Parts', 'A-01-01', 'pcs', 50, 48, 125000, 'Ketut', 'counted', 1),
('a2000001-0002-4000-a000-000000000002', 'f1000001-0001-4000-a000-000000000001', 'Marine Life Jacket Type III', 'LJ-III-STD', 'Zone B - Safety Equipment', 'B-01-01', 'pcs', 200, 198, 350000, 'Ketut', 'counted', 2),
('a2000001-0003-4000-a000-000000000003', 'f1000001-0001-4000-a000-000000000001', 'Diesel Fuel (Solar)', 'FUEL-DSL-20L', 'Zone C - Fuel Storage', 'C-01-01', 'liter', 5000, 5020, 13500, 'Wayan', 'counted', 3),
('a2000001-0004-4000-a000-000000000004', 'f1000001-0001-4000-a000-000000000001', 'Impeller Kit Yamaha 150HP', 'YMA-IMP-150', 'Zone A - Spare Parts', 'A-02-01', 'pcs', 15, 15, 850000, 'Wayan', 'counted', 4),
('a2000001-0005-4000-a000-000000000005', 'f1000001-0001-4000-a000-000000000001', 'Fire Extinguisher 3kg', 'SAF-FE-3KG', 'Zone B - Safety Equipment', 'B-02-01', 'pcs', 30, NULL, 450000, NULL, 'pending', 5),
('a2000001-0006-4000-a000-000000000006', 'f1000001-0001-4000-a000-000000000001', 'Antifouling Paint 5L', 'PNT-AF-5L', 'Zone A - Spare Parts', 'A-03-01', 'bucket', 25, NULL, 650000, NULL, 'pending', 6)
ON CONFLICT (id) DO NOTHING;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- END OF SEED DATA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
