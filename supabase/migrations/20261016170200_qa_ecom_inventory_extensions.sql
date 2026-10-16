CREATE TABLE IF NOT EXISTS ecom_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    offer_type TEXT DEFAULT 'flash_sale',
    discount_type TEXT DEFAULT 'percentage',
    discount_value NUMERIC(15,2) DEFAULT 0,
    min_order_amount NUMERIC(15,2) DEFAULT 0,
    max_uses INT DEFAULT 0,
    current_uses INT DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    applies_to TEXT DEFAULT 'all_products',
    target_ids JSONB DEFAULT '[]',
    banner_text TEXT,
    badge_text TEXT,
    notes TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 13: DISCOUNT SYSTEM
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ecom_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    return_number TEXT NOT NULL,
    order_id UUID REFERENCES ecom_orders(id) ON DELETE RESTRICT,
    order_number TEXT,
    customer_name TEXT,
    customer_email TEXT,
    reason TEXT DEFAULT 'changed_mind',
    resolution TEXT DEFAULT 'refund',
    subtotal NUMERIC(15,2) DEFAULT 0,
    refund_amount NUMERIC(15,2) DEFAULT 0,
    restocking_fee NUMERIC(15,2) DEFAULT 0,
    refund_method TEXT DEFAULT 'original_payment',
    refund_status TEXT DEFAULT 'pending',
    notes TEXT,
    internal_notes TEXT,
    processed_by TEXT,
    status TEXT DEFAULT 'requested',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecom_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES ecom_returns(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES ecom_order_items(id) ON DELETE SET NULL,
    item_id UUID,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0,
    condition TEXT DEFAULT 'unopened',
    restock BOOLEAN DEFAULT TRUE,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecom_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    package_price NUMERIC(15,2) DEFAULT 0,
    regular_price NUMERIC(15,2) DEFAULT 0,
    savings NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    media_ids JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    max_quantity INT DEFAULT 0,
    times_sold INT DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecom_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES ecom_packages(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(15,2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecom_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'percentage',
    discount_value NUMERIC(15,2) DEFAULT 0,
    min_order_amount NUMERIC(15,2) DEFAULT 0,
    max_discount_amount NUMERIC(15,2) DEFAULT 0,
    usage_limit INT DEFAULT 0,
    times_used INT DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    auto_apply BOOLEAN DEFAULT FALSE,
    applies_to TEXT DEFAULT 'order',
    target_ids JSONB DEFAULT '[]',
    stackable BOOLEAN DEFAULT FALSE,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 14.1: FIXED ASSETS & STOCK OPERATIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inv_fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    asset_number TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_category TEXT,
    serial_number TEXT,
    purchase_date DATE,
    purchase_price NUMERIC(15,2) DEFAULT 0,
    current_value NUMERIC(15,2) DEFAULT 0,
    salvage_value NUMERIC(15,2) DEFAULT 0,
    depreciation_method TEXT DEFAULT 'straight_line',
    useful_life_months INT DEFAULT 60,
    accumulated_depreciation NUMERIC(15,2) DEFAULT 0,
    last_depreciation_date DATE,
    warranty_expiry DATE,
    location TEXT,
    warehouse_id TEXT,
    assigned_to TEXT,
    condition TEXT DEFAULT 'good',
    insurance_policy TEXT,
    insurance_expiry DATE,
    maintenance_schedule TEXT,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'active',
    disposed_date DATE,
    disposal_method TEXT,
    disposal_value NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_stock_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    operation_number TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    item_id UUID NOT NULL REFERENCES inv_items(id),
    item_name TEXT,
    warehouse_id TEXT DEFAULT 'default',
    quantity NUMERIC(15,3) NOT NULL,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    reason TEXT,
    reference TEXT,
    batch_number TEXT,
    expiry_date DATE,
    approved_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 14: RLS POLICIES
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'individuals','accounts','contacts','deals','campaigns','campaign_members',
        'cases','crm_activities','crm_notes',
        'inv_categories','inv_items','inv_item_variants','inv_stock_ledger','inv_stock_movements',
        'inv_suppliers','inv_purchase_requisitions','inv_pr_lines',
        'inv_purchase_orders','inv_po_lines','inv_goods_received_notes','inv_grn_lines',
        'inv_warehouses','inv_zones','inv_bins','inv_stock_transfers',
        'mfg_boms','mfg_bom_lines','mfg_work_orders',
        'inv_opname_sessions','inv_opname_lines',
        'booking_schedules','booking_occurrences','bookings','booking_passengers',
        'rental_assets','rental_contracts',
        'ecom_customers','ecom_orders','ecom_order_items','ecom_store_settings',
        'ecom_returns','ecom_return_items','ecom_packages','ecom_package_items',
        'ecom_offers','ecom_discounts',
        'inv_fixed_assets','inv_stock_operations'
    ] LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;
END $$;
