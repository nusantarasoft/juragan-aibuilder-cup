-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  NUSANTARASOFT - Complete Schema + Seed Data                â•‘
-- â•‘  Auto-runs on first Docker Compose init                     â•‘
-- â•‘  All people â†’ CRM | All items â†’ Item Master                â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 1: CRM SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS individuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    salutation TEXT,
    middle_name TEXT,
    suffix TEXT,
    nickname TEXT,
    date_of_birth DATE,
    gender TEXT,
    nationality TEXT,
    preferred_language TEXT DEFAULT 'id',
    job_title TEXT,
    department TEXT,
    linkedin_url TEXT,
    twitter_handle TEXT,
    website TEXT,
    individual_type TEXT DEFAULT 'person',
    source TEXT,
    tags JSONB DEFAULT '[]',
    avatar_url TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    custom_fields JSONB DEFAULT '{}',
    lead_status TEXT,
    lead_source TEXT,
    company TEXT,
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    account_number TEXT,
    type TEXT DEFAULT 'prospect',
    industry TEXT,
    website TEXT,
    phone TEXT,
    fax TEXT,
    email TEXT,
    billing_address JSONB DEFAULT '{}',
    shipping_address JSONB DEFAULT '{}',
    annual_revenue NUMERIC(15,2),
    employee_count INT,
    sic_code TEXT,
    ticker_symbol TEXT,
    ownership TEXT,
    parent_account_id UUID REFERENCES accounts(id),
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    owner_id UUID,
    status TEXT DEFAULT 'active',
    rating TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    title TEXT,
    department TEXT,
    role TEXT,
    email TEXT,
    phone TEXT,
    mobile_phone TEXT,
    mailing_address JSONB DEFAULT '{}',
    other_address JSONB DEFAULT '{}',
    is_primary BOOLEAN DEFAULT FALSE,
    do_not_call BOOLEAN DEFAULT FALSE,
    do_not_email BOOLEAN DEFAULT FALSE,
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    owner_id UUID,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(15,2),
    currency TEXT DEFAULT 'IDR',
    stage TEXT DEFAULT 'prospecting',
    probability INT DEFAULT 10,
    close_date DATE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    type TEXT,
    lead_source TEXT,
    next_step TEXT,
    loss_reason TEXT,
    owner_id UUID,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    budget NUMERIC(15,2),
    actual_cost NUMERIC(15,2),
    expected_revenue NUMERIC(15,2),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'sent',
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'medium',
    origin TEXT,
    type TEXT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    resolution TEXT,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    activity_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    related_to_type TEXT,
    related_to_id UUID,
    due_date DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    outcome TEXT,
    owner_id UUID,
    assigned_to TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    body TEXT NOT NULL,
    title TEXT,
    related_to_type TEXT,
    related_to_id UUID,
    is_pinned BOOLEAN DEFAULT FALSE,
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 2: INVENTORY CORE SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

CREATE TABLE IF NOT EXISTS inv_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    item_type TEXT DEFAULT 'goods',
    fulfillment_type TEXT DEFAULT 'physical',
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
    dimensions JSONB,
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
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_items_tenant ON inv_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_sku ON inv_items(sku);

CREATE TABLE IF NOT EXISTS inv_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    attributes JSONB DEFAULT '{}',
    cost_price NUMERIC(15,2),
    selling_price NUMERIC(15,2),
    barcode TEXT,
    media_ids JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS inv_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inv_item_variants(id) ON DELETE SET NULL,
    warehouse_id TEXT DEFAULT 'default',
    movement_type TEXT NOT NULL,
    quantity NUMERIC(15,3) NOT NULL,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    reference TEXT,
    reference_type TEXT,
    reference_id UUID,
    batch_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 3: PROCUREMENT SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS inv_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Indonesia',
    tax_id TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    currency TEXT DEFAULT 'IDR',
    rating NUMERIC(3,1) DEFAULT 0,
    lead_time_days INT DEFAULT 7,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    pr_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    requested_by TEXT,
    department TEXT,
    priority TEXT DEFAULT 'normal',
    required_date DATE,
    total_estimated NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    notes TEXT,
    status TEXT DEFAULT 'draft',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_pr_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id UUID NOT NULL REFERENCES inv_purchase_requisitions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
    uom TEXT DEFAULT 'pcs',
    estimated_unit_price NUMERIC(15,2) DEFAULT 0,
    estimated_total NUMERIC(15,2) DEFAULT 0,
    preferred_supplier_id UUID REFERENCES inv_suppliers(id) ON DELETE SET NULL,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    po_number TEXT NOT NULL,
    pr_id UUID REFERENCES inv_purchase_requisitions(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES inv_suppliers(id) ON DELETE RESTRICT,
    title TEXT,
    shipping_address TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    expected_delivery DATE,
    subtotal NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    notes TEXT,
    status TEXT DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_po_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES inv_purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
    received_qty NUMERIC(15,3) DEFAULT 0,
    uom TEXT DEFAULT 'pcs',
    unit_price NUMERIC(15,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    tax_percent NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_goods_received_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    grn_number TEXT NOT NULL,
    po_id UUID NOT NULL REFERENCES inv_purchase_orders(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES inv_suppliers(id) ON DELETE RESTRICT,
    received_by TEXT,
    received_date DATE DEFAULT CURRENT_DATE,
    warehouse_id TEXT DEFAULT 'default',
    delivery_note_number TEXT,
    invoice_number TEXT,
    quality_check TEXT DEFAULT 'passed',
    notes TEXT,
    status TEXT DEFAULT 'draft',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_grn_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL REFERENCES inv_goods_received_notes(id) ON DELETE CASCADE,
    po_line_id UUID REFERENCES inv_po_lines(id) ON DELETE SET NULL,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    ordered_qty NUMERIC(15,3) DEFAULT 0,
    received_qty NUMERIC(15,3) NOT NULL DEFAULT 0,
    accepted_qty NUMERIC(15,3) DEFAULT 0,
    rejected_qty NUMERIC(15,3) DEFAULT 0,
    uom TEXT DEFAULT 'pcs',
    unit_cost NUMERIC(15,2) DEFAULT 0,
    batch_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    quality_status TEXT DEFAULT 'passed',
    rejection_reason TEXT,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 4: WAREHOUSE MANAGEMENT SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS inv_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL, name TEXT NOT NULL,
    warehouse_type TEXT DEFAULT 'general',
    address TEXT, city TEXT, country TEXT DEFAULT 'Indonesia',
    latitude NUMERIC(10,7), longitude NUMERIC(10,7),
    total_capacity INT DEFAULT 0, used_capacity INT DEFAULT 0,
    manager TEXT, phone TEXT, email TEXT, operating_hours TEXT,
    tags JSONB DEFAULT '[]', notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inv_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES inv_warehouses(id) ON DELETE CASCADE,
    code TEXT NOT NULL, name TEXT NOT NULL,
    zone_type TEXT DEFAULT 'storage', description TEXT,
    capacity INT DEFAULT 0,
    temperature_min NUMERIC(5,1), temperature_max NUMERIC(5,1),
    is_restricted BOOLEAN DEFAULT FALSE, sort_order INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inv_bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES inv_zones(id) ON DELETE CASCADE,
    code TEXT NOT NULL, aisle TEXT, rack TEXT, level TEXT, position TEXT,
    bin_type TEXT DEFAULT 'standard',
    max_weight NUMERIC(10,2), max_volume NUMERIC(10,2),
    current_item_count INT DEFAULT 0, is_occupied BOOLEAN DEFAULT FALSE,
    barcode TEXT, sort_order INT DEFAULT 0, status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inv_stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    transfer_number TEXT NOT NULL,
    from_warehouse_id UUID REFERENCES inv_warehouses(id),
    to_warehouse_id UUID REFERENCES inv_warehouses(id),
    from_bin_id UUID REFERENCES inv_bins(id),
    to_bin_id UUID REFERENCES inv_bins(id),
    item_id UUID, item_name TEXT,
    quantity NUMERIC(15,3) DEFAULT 0, uom TEXT DEFAULT 'pcs',
    reason TEXT, requested_by TEXT, approved_by TEXT,
    approved_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
    notes TEXT, status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 5: MANUFACTURING SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS mfg_boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL, name TEXT NOT NULL,
    version TEXT DEFAULT '1.0', product_name TEXT, product_sku TEXT,
    description TEXT, uom TEXT DEFAULT 'unit',
    yield_qty NUMERIC(15,3) DEFAULT 1,
    labor_hours NUMERIC(10,2) DEFAULT 0, labor_cost NUMERIC(15,2) DEFAULT 0,
    overhead_cost NUMERIC(15,2) DEFAULT 0,
    total_material_cost NUMERIC(15,2) DEFAULT 0, total_cost NUMERIC(15,2) DEFAULT 0,
    notes TEXT, status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mfg_bom_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES mfg_boms(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL, item_sku TEXT,
    quantity NUMERIC(15,3) DEFAULT 1, uom TEXT DEFAULT 'pcs',
    unit_cost NUMERIC(15,2) DEFAULT 0, total_cost NUMERIC(15,2) DEFAULT 0,
    scrap_pct NUMERIC(5,2) DEFAULT 0, notes TEXT, sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mfg_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    wo_number TEXT NOT NULL,
    bom_id UUID REFERENCES mfg_boms(id) ON DELETE SET NULL,
    bom_name TEXT,
    warehouse_id UUID, warehouse_name TEXT,
    planned_qty NUMERIC(15,3) DEFAULT 1, completed_qty NUMERIC(15,3) DEFAULT 0,
    uom TEXT DEFAULT 'unit', priority TEXT DEFAULT 'normal',
    assigned_to TEXT,
    planned_start DATE, planned_end DATE,
    actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ,
    estimated_cost NUMERIC(15,2) DEFAULT 0, actual_cost NUMERIC(15,2) DEFAULT 0,
    notes TEXT, status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 6: STOCK OPNAME SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS inv_opname_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    session_code TEXT NOT NULL, title TEXT NOT NULL,
    warehouse_id UUID, warehouse_name TEXT,
    counted_by TEXT, reviewed_by TEXT, scheduled_date DATE,
    started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
    total_items INT DEFAULT 0, items_counted INT DEFAULT 0,
    total_variance_qty NUMERIC(15,3) DEFAULT 0,
    total_variance_value NUMERIC(15,2) DEFAULT 0,
    notes TEXT, status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inv_opname_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES inv_opname_sessions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL, item_sku TEXT,
    zone_name TEXT, bin_code TEXT,
    uom TEXT DEFAULT 'pcs', system_qty NUMERIC(15,3) DEFAULT 0,
    actual_qty NUMERIC(15,3),
    unit_cost NUMERIC(15,2) DEFAULT 0,
    counted_at TIMESTAMPTZ, counted_by TEXT,
    notes TEXT, status TEXT DEFAULT 'pending', sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 7: BOOKING & TICKETING SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS booking_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    schedule_code TEXT, route_name TEXT NOT NULL,
    origin TEXT NOT NULL, destination TEXT NOT NULL,
    departure_time TIME, arrival_time TIME, duration_minutes INT,
    capacity INT DEFAULT 100, vehicle_name TEXT, vessel_type TEXT,
    price_economy NUMERIC(15,2) DEFAULT 0,
    price_business NUMERIC(15,2) DEFAULT 0,
    price_vip NUMERIC(15,2) DEFAULT 0,
    operating_days TEXT[] DEFAULT '{Mon,Tue,Wed,Thu,Fri,Sat,Sun}',
    auto_generate_days INT DEFAULT 14,
    notes TEXT, status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS booking_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES booking_schedules(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL, departure_time TIME,
    total_capacity INT DEFAULT 100, booked_count INT DEFAULT 0,
    checked_in_count INT DEFAULT 0,
    actual_departure TIMESTAMPTZ, actual_arrival TIMESTAMPTZ,
    notes TEXT, status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    booking_code TEXT,
    schedule_id UUID REFERENCES booking_schedules(id),
    occurrence_id UUID REFERENCES booking_occurrences(id),
    customer_name TEXT, customer_email TEXT, customer_phone TEXT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    passenger_count INT DEFAULT 1, class TEXT DEFAULT 'economy',
    total_amount NUMERIC(15,2) DEFAULT 0, paid_amount NUMERIC(15,2) DEFAULT 0,
    check_in_time TIMESTAMPTZ, notes TEXT, status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS booking_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    name TEXT NOT NULL, id_number TEXT, nationality TEXT,
    seat_label TEXT, class TEXT DEFAULT 'economy', notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 8: RENTAL ENGINE SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS rental_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    asset_code TEXT NOT NULL, asset_name TEXT NOT NULL,
    serial_number TEXT, category TEXT, condition TEXT DEFAULT 'excellent',
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    purchase_date DATE, purchase_cost NUMERIC(15,2),
    current_location TEXT,
    daily_rate NUMERIC(15,2) DEFAULT 0, deposit_amount NUMERIC(15,2) DEFAULT 0,
    total_revenue NUMERIC(15,2) DEFAULT 0,
    last_maintenance_date DATE, next_maintenance_date DATE,
    notes TEXT, status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    contract_code TEXT,
    asset_id UUID REFERENCES rental_assets(id),
    asset_name TEXT,
    customer_name TEXT, customer_email TEXT, customer_phone TEXT,
    customer_id_number TEXT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    checkout_date DATE NOT NULL, expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    daily_rate NUMERIC(15,2) DEFAULT 0, deposit_amount NUMERIC(15,2) DEFAULT 0,
    deposit_returned NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0, late_fee NUMERIC(15,2) DEFAULT 0,
    damage_fee NUMERIC(15,2) DEFAULT 0, total_charge NUMERIC(15,2) DEFAULT 0,
    checkout_condition TEXT, return_condition TEXT,
    checkout_notes TEXT, return_notes TEXT, returned_by TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- SECTION 9: E-COMMERCE SCHEMA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS ecom_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    customer_code TEXT, first_name TEXT NOT NULL, last_name TEXT,
    email TEXT, phone TEXT, company TEXT,
    address TEXT, city TEXT, province TEXT, postal_code TEXT,
    id_number TEXT, customer_type TEXT DEFAULT 'individual',
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]', notes TEXT, status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ecom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    order_number TEXT NOT NULL,
    customer_id UUID REFERENCES ecom_customers(id) ON DELETE SET NULL,
    customer_name TEXT, customer_email TEXT, customer_phone TEXT,
    shipping_address TEXT, shipping_city TEXT, shipping_province TEXT,
    shipping_postal_code TEXT, shipping_method TEXT,
    shipping_cost NUMERIC(15,2) DEFAULT 0, subtotal NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0, discount_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0, payment_method TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    confirmed_at TIMESTAMPTZ, shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ,
    notes TEXT, source TEXT DEFAULT 'admin', status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ecom_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES ecom_orders(id) ON DELETE CASCADE,
    item_id UUID, item_name TEXT NOT NULL, item_sku TEXT,
    fulfillment_type TEXT DEFAULT 'physical', fulfillment_ref TEXT,
    quantity INT DEFAULT 1, unit_price NUMERIC(15,2) DEFAULT 0,
    discount NUMERIC(15,2) DEFAULT 0, tax NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0, variant_info JSONB,
    notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ecom_store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default' UNIQUE,
    store_name TEXT, store_email TEXT, store_phone TEXT, store_address TEXT,
    default_currency TEXT DEFAULT 'IDR', tax_rate NUMERIC(5,2) DEFAULT 11,
    tax_included BOOLEAN DEFAULT FALSE,
    shipping_enabled BOOLEAN DEFAULT TRUE,
    default_shipping_cost NUMERIC(15,2) DEFAULT 0,
    free_shipping_threshold NUMERIC(15,2) DEFAULT 0,
    payment_methods JSONB DEFAULT '["bank_transfer","cash"]',
    fulfillment_physical BOOLEAN DEFAULT TRUE, fulfillment_ticket BOOLEAN DEFAULT TRUE,
    fulfillment_scheduled BOOLEAN DEFAULT TRUE, fulfillment_rental BOOLEAN DEFAULT TRUE,
    low_stock_alert INT DEFAULT 10, order_prefix TEXT DEFAULT 'ORD',
    invoice_prefix TEXT DEFAULT 'INV', notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SECTION 10: RETURNS & REFUNDS
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

-- SECTION 11: PRODUCT PACKAGES
-- ══════════════════════════════════════════════════

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

-- SECTION 12: OFFERS & PROMOTIONS
-- ══════════════════════════════════════════════════

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

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SEED DATA â€” CRM First, then Item Master, then Modules      â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€ CRM ACCOUNTS (Companies) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO accounts (id, tenant_id, name, type, industry, phone, email, website, description, status) VALUES
('ac000001-0001-4000-a000-000000000001', 'default', 'Nusantarasoft Marine', 'customer', 'Maritime Transport', '+62-361-555-8888', 'info@nusantarasoft.id', 'https://nusantarasoft.id', 'Internal â€” maritime transport & logistics company', 'active'),
('ac000001-0002-4000-a000-000000000002', 'default', 'PT Bali Discovery Tours', 'customer', 'Tourism', '+62-361-555-003', 'ops@balitours.co.id', NULL, 'Tour operator â€” bulk ferry ticket buyer', 'active'),
('ac000001-0003-4000-a000-000000000003', 'default', 'CV Nusa Penida Travel', 'customer', 'Tourism', '+62-361-555-005', 'booking@nusatravel.id', NULL, 'Nusa Penida-based travel agency', 'active'),
('ac000001-0004-4000-a000-000000000004', 'default', 'Yamaha Motor Indonesia', 'vendor', 'Marine Equipment', '+62-21-555-1001', 'marine@yamaha.co.id', 'https://yamaha-motor.co.id', 'Outboard engines, parts, and consumables', 'active'),
('ac000001-0005-4000-a000-000000000005', 'default', 'Marina Parts International', 'vendor', 'Marine Parts', '+62-31-555-2001', 'sales@marinaparts.co.id', NULL, 'Fiberglass, resin, marine-grade materials', 'active'),
('ac000001-0006-4000-a000-000000000006', 'default', '3M Marine Indonesia', 'vendor', 'Marine Supplies', '+62-21-555-3001', 'marine@3m.co.id', 'https://3m.co.id', 'Reflective tapes, adhesives, safety materials', 'active'),
('ac000001-0007-4000-a000-000000000007', 'default', 'Cressi Indonesia', 'vendor', 'Water Sports', '+62-361-555-4001', 'info@cressi.co.id', 'https://cressi.com', 'Snorkeling and diving equipment supplier', 'active'),
('ac000001-0008-4000-a000-000000000008', 'default', 'Bali Marine Engineering', 'vendor', 'Marine Engineering', '+62-361-555-5001', 'info@balimarine.co.id', NULL, 'Marine electronics & navigation systems', 'active'),
('ac000001-0009-4000-a000-000000000009', 'default', 'Pelni Ferries', 'partner', 'Maritime Transport', '+62-21-555-6001', 'info@pelni.co.id', 'https://pelni.co.id', 'State-owned ferry company â€” referral partner', 'active'),
('ac000001-0010-4000-a000-000000000010', 'default', 'Safe Seas Equipment Co', 'vendor', 'Safety Equipment', '+62-31-555-7001', 'sales@safeseas.co.id', NULL, 'Life jackets, fire extinguishers, safety gear', 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ CRM INDIVIDUALS (People) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO individuals (id, tenant_id, first_name, last_name, email, phone, job_title, company, nationality, individual_type, status) VALUES
('aa000001-0001-4000-a000-000000000001', 'default', 'I Made', 'Suardana', 'made.s@nusantarasoft.id', '+62-361-555-7701', 'Warehouse Manager', 'Nusantarasoft Marine', 'Indonesian', 'employee', 'active'),
('aa000001-0002-4000-a000-000000000002', 'default', 'Ketut', 'Wirawan', 'ketut.w@nusantarasoft.id', '+62-361-555-7702', 'Depot Manager', 'Nusantarasoft Marine', 'Indonesian', 'employee', 'active'),
('aa000001-0003-4000-a000-000000000003', 'default', 'Nyoman', 'Astra', 'nyoman.a@nusantarasoft.id', '+62-363-555-7703', 'Port Manager', 'Nusantarasoft Marine', 'Indonesian', 'employee', 'active'),
('aa000001-0004-4000-a000-000000000004', 'default', 'Pak', 'Nyoman', 'pak.nyoman@nusantarasoft.id', '+62-812-555-0004', 'Production Lead', 'Nusantarasoft Marine', 'Indonesian', 'employee', 'active'),
('aa000001-0005-4000-a000-000000000005', 'default', 'Bu', 'Kadek', 'bu.kadek@nusantarasoft.id', '+62-812-555-0005', 'Assembly Supervisor', 'Nusantarasoft Marine', 'Indonesian', 'employee', 'active'),
('aa000001-0006-4000-a000-000000000006', 'default', 'Wayan', 'Dharma', 'wayan.d@gmail.com', '+62-812-1111-001', NULL, NULL, 'Indonesian', 'person', 'active'),
('aa000001-0007-4000-a000-000000000007', 'default', 'Ni Luh', 'Sari', 'niluh.s@yahoo.co.id', '+62-817-2222-002', NULL, NULL, 'Indonesian', 'person', 'active'),
('aa000001-0008-4000-a000-000000000008', 'default', 'Made', 'Astawa', 'made.a@gmail.com', '+62-819-6666-006', NULL, NULL, 'Indonesian', 'person', 'active'),
('aa000001-0009-4000-a000-000000000009', 'default', 'John', 'Smith', 'john.s@traveler.com', '+1-555-7777-007', NULL, NULL, 'Australian', 'person', 'active'),
('aa000001-0010-4000-a000-000000000010', 'default', 'Sakura', 'Yamamoto', 'sakura.y@yahoo.co.jp', '+81-90-8888-008', NULL, NULL, 'Japanese', 'person', 'active'),
('aa000001-0011-4000-a000-000000000011', 'default', 'Sarah', 'Johnson', 'sarah.j@gmail.com', '+44-7700-900123', NULL, NULL, 'British', 'person', 'active'),
('aa000001-0012-4000-a000-000000000012', 'default', 'Hans', 'Mueller', 'hans.m@web.de', '+49-170-1234567', NULL, NULL, 'German', 'person', 'active'),
('aa000001-0013-4000-a000-000000000013', 'default', 'Yuki', 'Tanaka', 'yuki.t@mail.jp', '+81-90-1234-5678', NULL, NULL, 'Japanese', 'person', 'active'),
('aa000001-0014-4000-a000-000000000014', 'default', 'Emma', 'Watson', 'emma.w@outlook.com', '+61-400-123456', NULL, NULL, 'Australian', 'person', 'active'),
('aa000001-0015-4000-a000-000000000015', 'default', 'Putu', 'Dharma', 'putu.d@gmail.com', '+62-817-8765-432', NULL, NULL, 'Indonesian', 'person', 'active'),
('aa000001-0016-4000-a000-000000000016', 'default', 'Li', 'Wei', 'li.wei@qq.com', '+86-139-1234-5678', NULL, NULL, 'Chinese', 'person', 'active'),
('aa000001-0017-4000-a000-000000000017', 'default', 'James', 'Wilson', 'james.w@gmail.com', '+1-555-0201', NULL, NULL, 'American', 'person', 'active'),
('aa000001-0018-4000-a000-000000000018', 'default', 'Maria', 'Garcia', 'maria.g@hotmail.com', '+34-600-123456', NULL, NULL, 'Spanish', 'person', 'active'),
('aa000001-0019-4000-a000-000000000019', 'default', 'Tanaka', 'Hiroshi', 'hiroshi@mail.jp', '+81-80-9876-5432', NULL, NULL, 'Japanese', 'person', 'active'),
('aa000001-0020-4000-a000-000000000020', 'default', 'Sophie', 'Dubois', 'sophie.d@orange.fr', '+33-6-12-34-56-78', NULL, NULL, 'French', 'person', 'active'),
('aa000001-0021-4000-a000-000000000021', 'default', 'Agus', 'Pratama', 'agus.p@balitours.co.id', '+62-812-555-0021', 'Operations Manager', 'PT Bali Discovery Tours', 'Indonesian', 'person', 'active'),
('aa000001-0022-4000-a000-000000000022', 'default', 'Komang', 'Sudiarta', 'komang.s@nusatravel.id', '+62-812-555-0022', 'Branch Manager', 'CV Nusa Penida Travel', 'Indonesian', 'person', 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ CRM CONTACTS (Link individuals â†’ accounts) â”€â”€
INSERT INTO contacts (id, tenant_id, individual_id, account_id, title, department, role, email, phone, is_primary, status) VALUES
('ab000001-0001-4000-a000-000000000001', 'default', 'aa000001-0001-4000-a000-000000000001', 'ac000001-0001-4000-a000-000000000001', 'Warehouse Manager', 'Warehouse', 'decision_maker', 'made.s@nusantarasoft.id', '+62-361-555-7701', TRUE, 'active'),
('ab000001-0002-4000-a000-000000000002', 'default', 'aa000001-0002-4000-a000-000000000002', 'ac000001-0001-4000-a000-000000000001', 'Depot Manager', 'Operations', 'decision_maker', 'ketut.w@nusantarasoft.id', '+62-361-555-7702', FALSE, 'active'),
('ab000001-0003-4000-a000-000000000003', 'default', 'aa000001-0003-4000-a000-000000000003', 'ac000001-0001-4000-a000-000000000001', 'Port Manager', 'Operations', 'decision_maker', 'nyoman.a@nusantarasoft.id', '+62-363-555-7703', FALSE, 'active'),
('ab000001-0004-4000-a000-000000000004', 'default', 'aa000001-0004-4000-a000-000000000004', 'ac000001-0001-4000-a000-000000000001', 'Production Lead', 'Manufacturing', 'end_user', 'pak.nyoman@nusantarasoft.id', '+62-812-555-0004', FALSE, 'active'),
('ab000001-0005-4000-a000-000000000005', 'default', 'aa000001-0005-4000-a000-000000000005', 'ac000001-0001-4000-a000-000000000001', 'Assembly Supervisor', 'Manufacturing', 'end_user', 'bu.kadek@nusantarasoft.id', '+62-812-555-0005', FALSE, 'active'),
('ab000001-0006-4000-a000-000000000006', 'default', 'aa000001-0006-4000-a000-000000000006', NULL, NULL, NULL, 'end_user', 'wayan.d@gmail.com', '+62-812-1111-001', TRUE, 'active'),
('ab000001-0007-4000-a000-000000000007', 'default', 'aa000001-0007-4000-a000-000000000007', NULL, NULL, NULL, 'end_user', 'niluh.s@yahoo.co.id', '+62-817-2222-002', TRUE, 'active'),
('ab000001-0008-4000-a000-000000000008', 'default', 'aa000001-0008-4000-a000-000000000008', NULL, NULL, NULL, 'end_user', 'made.a@gmail.com', '+62-819-6666-006', TRUE, 'active'),
('ab000001-0009-4000-a000-000000000009', 'default', 'aa000001-0009-4000-a000-000000000009', NULL, NULL, NULL, 'end_user', 'john.s@traveler.com', '+1-555-7777-007', TRUE, 'active'),
('ab000001-0010-4000-a000-000000000010', 'default', 'aa000001-0010-4000-a000-000000000010', NULL, NULL, NULL, 'end_user', 'sakura.y@yahoo.co.jp', '+81-90-8888-008', TRUE, 'active'),
('ab000001-0011-4000-a000-000000000011', 'default', 'aa000001-0011-4000-a000-000000000011', NULL, NULL, NULL, 'end_user', 'sarah.j@gmail.com', '+44-7700-900123', TRUE, 'active'),
('ab000001-0012-4000-a000-000000000012', 'default', 'aa000001-0012-4000-a000-000000000012', NULL, NULL, NULL, 'end_user', 'hans.m@web.de', '+49-170-1234567', TRUE, 'active'),
('ab000001-0013-4000-a000-000000000013', 'default', 'aa000001-0013-4000-a000-000000000013', NULL, NULL, NULL, 'end_user', 'yuki.t@mail.jp', '+81-90-1234-5678', TRUE, 'active'),
('ab000001-0014-4000-a000-000000000014', 'default', 'aa000001-0014-4000-a000-000000000014', NULL, NULL, NULL, 'end_user', 'emma.w@outlook.com', '+61-400-123456', TRUE, 'active'),
('ab000001-0015-4000-a000-000000000015', 'default', 'aa000001-0015-4000-a000-000000000015', NULL, NULL, NULL, 'end_user', 'putu.d@gmail.com', '+62-817-8765-432', TRUE, 'active'),
('ab000001-0016-4000-a000-000000000016', 'default', 'aa000001-0016-4000-a000-000000000016', NULL, NULL, NULL, 'end_user', 'li.wei@qq.com', '+86-139-1234-5678', TRUE, 'active'),
('ab000001-0017-4000-a000-000000000017', 'default', 'aa000001-0017-4000-a000-000000000017', NULL, NULL, NULL, 'end_user', 'james.w@gmail.com', '+1-555-0201', TRUE, 'active'),
('ab000001-0018-4000-a000-000000000018', 'default', 'aa000001-0018-4000-a000-000000000018', NULL, NULL, NULL, 'end_user', 'maria.g@hotmail.com', '+34-600-123456', TRUE, 'active'),
('ab000001-0019-4000-a000-000000000019', 'default', 'aa000001-0019-4000-a000-000000000019', NULL, NULL, NULL, 'end_user', 'hiroshi@mail.jp', '+81-80-9876-5432', TRUE, 'active'),
('ab000001-0020-4000-a000-000000000020', 'default', 'aa000001-0020-4000-a000-000000000020', NULL, NULL, NULL, 'end_user', 'sophie.d@orange.fr', '+33-6-12-34-56-78', TRUE, 'active'),
('ab000001-0021-4000-a000-000000000021', 'default', 'aa000001-0021-4000-a000-000000000021', 'ac000001-0002-4000-a000-000000000002', 'Operations Manager', 'Operations', 'decision_maker', 'agus.p@balitours.co.id', '+62-812-555-0021', TRUE, 'active'),
('ab000001-0022-4000-a000-000000000022', 'default', 'aa000001-0022-4000-a000-000000000022', 'ac000001-0003-4000-a000-000000000003', 'Branch Manager', 'Management', 'decision_maker', 'komang.s@nusatravel.id', '+62-812-555-0022', TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ ITEM CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_categories (id, tenant_id, name, description, sort_order) VALUES
('ca000001-0001-4000-a000-000000000001', 'default', 'Spare Parts', 'Engine and mechanical spare parts', 1),
('ca000001-0002-4000-a000-000000000002', 'default', 'Safety Equipment', 'Life jackets, fire extinguishers, first aid', 2),
('ca000001-0003-4000-a000-000000000003', 'default', 'Raw Materials', 'Fiberglass, resin, paint, fabric', 3),
('ca000001-0004-4000-a000-000000000004', 'default', 'Consumables', 'Fuel, lubricants, cleaning supplies', 4),
('ca000001-0005-4000-a000-000000000005', 'default', 'Finished Goods', 'Completed assemblies and products', 5),
('ca000001-0006-4000-a000-000000000006', 'default', 'Rental Equipment', 'Jet skis, SUPs, kayaks, snorkeling', 6),
('ca000001-0007-4000-a000-000000000007', 'default', 'Electronics', 'GPS, navigation, electrical systems', 7),
('ca000001-0008-4000-a000-000000000008', 'default', 'Tickets & Bookings', 'Ferry tickets, event passes, one-time admissions', 8),
('ca000001-0009-4000-a000-000000000009', 'default', 'Scheduled Services', 'Recurring tours, daily routes, service packages', 9)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ ITEM MASTER (all items) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_items (id, tenant_id, name, sku, description, item_type, fulfillment_type, category_id, brand, cost_price, selling_price, primary_uom, min_stock, reorder_point, reorder_qty, status) VALUES
('af000001-0001-4000-a000-000000000001', 'default', 'Yamaha Outboard Oil Filter', 'YMA-OF-001', 'Genuine Yamaha oil filter for outboard engines', 'goods', 'physical', 'ca000001-0001-4000-a000-000000000001', 'Yamaha', 125000, 175000, 'pcs', 20, 30, 50, 'active'),
('af000001-0002-4000-a000-000000000002', 'default', 'Marine Life Jacket Type III', 'LJ-III-STD', 'Standard marine life jacket with reflective strips', 'finished_good', 'physical', 'ca000001-0002-4000-a000-000000000002', 'Safe Seas', 350000, 500000, 'pcs', 50, 80, 100, 'active'),
('af000001-0003-4000-a000-000000000003', 'default', 'Diesel Fuel (Solar)', 'FUEL-DSL-20L', 'High-speed diesel / Solar for marine engines', 'consumable', 'consumable', 'ca000001-0004-4000-a000-000000000004', NULL, 13500, 0, 'liter', 1000, 2000, 5000, 'active'),
('af000001-0004-4000-a000-000000000004', 'default', 'Impeller Kit Yamaha 150HP', 'YMA-IMP-150', 'Water pump impeller kit for Yamaha 150HP outboard', 'goods', 'physical', 'ca000001-0001-4000-a000-000000000001', 'Yamaha', 850000, 1200000, 'pcs', 5, 8, 15, 'active'),
('af000001-0005-4000-a000-000000000005', 'default', 'Fire Extinguisher 3kg', 'SAF-FE-3KG', 'Marine-grade dry powder fire extinguisher', 'goods', 'physical', 'ca000001-0002-4000-a000-000000000002', 'Safe Seas', 450000, 650000, 'pcs', 10, 15, 30, 'active'),
('af000001-0006-4000-a000-000000000006', 'default', 'Antifouling Paint 5L', 'PNT-AF-5L', 'Copper-based antifouling marine bottom paint', 'goods', 'physical', 'ca000001-0003-4000-a000-000000000003', 'International', 650000, 900000, 'bucket', 10, 15, 25, 'active'),
('af000001-0007-4000-a000-000000000007', 'default', 'Fiberglass Cloth Roll', 'MAT-FG-ROLL', 'Woven roving fiberglass cloth for hull layup', 'raw_material', 'raw_material', 'ca000001-0003-4000-a000-000000000003', 'Marina Parts', 1200000, 0, 'roll', 5, 8, 15, 'active'),
('af000001-0008-4000-a000-000000000008', 'default', 'Polyester Resin 20L', 'MAT-PR-20L', 'General-purpose polyester laminating resin', 'raw_material', 'raw_material', 'ca000001-0003-4000-a000-000000000003', 'Marina Parts', 2500000, 0, 'drum', 3, 5, 10, 'active'),
('af000001-0009-4000-a000-000000000009', 'default', 'Gelcoat White', 'MAT-GC-WHT', 'White gelcoat for hull finishing', 'raw_material', 'raw_material', 'ca000001-0003-4000-a000-000000000003', 'Marina Parts', 350000, 0, 'kg', 10, 15, 20, 'active'),
('af000001-0010-4000-a000-000000000010', 'default', 'Marine Plywood 12mm', 'MAT-MPW-12', 'BS1088 marine-grade plywood sheet', 'raw_material', 'raw_material', 'ca000001-0003-4000-a000-000000000003', 'Marina Parts', 525000, 0, 'sheet', 5, 8, 15, 'active'),
('af000001-0011-4000-a000-000000000011', 'default', 'Nylon Fabric Roll 420D', 'MAT-NF-420D', 'Heavy-duty nylon fabric for life jacket assembly', 'raw_material', 'raw_material', 'ca000001-0003-4000-a000-000000000003', '3M', 450000, 0, 'roll', 3, 5, 10, 'active'),
('af000001-0012-4000-a000-000000000012', 'default', 'EPE Foam Sheet', 'MAT-FOAM-EPE', 'Expanded polyethylene foam for buoyancy', 'raw_material', 'raw_material', 'ca000001-0003-4000-a000-000000000003', '3M', 85000, 0, 'sheet', 10, 20, 50, 'active'),
('af000001-0013-4000-a000-000000000013', 'default', 'Reflective Strip 3M', 'MAT-REF-3M', '3M SOLAS-grade reflective tape for life jackets', 'raw_material', 'raw_material', 'ca000001-0003-4000-a000-000000000003', '3M', 35000, 0, 'meter', 20, 30, 100, 'active'),
('af000001-0014-4000-a000-000000000014', 'default', 'Fiberglass Hull 35ft', 'HULL-FB-35', 'Complete fiberglass hull assembly for 35ft speedboat', 'finished_good', 'physical', 'ca000001-0005-4000-a000-000000000005', 'Nusantarasoft', 53000000, 85000000, 'unit', 0, 1, 2, 'active'),
('af000001-0015-4000-a000-000000000015', 'default', 'GPS Nav Console V2', 'NAV-CON-V2', 'Integrated GPS, radar, and depth sounder console', 'finished_good', 'physical', 'ca000001-0007-4000-a000-000000000007', 'Bali Marine', 37900000, 52000000, 'unit', 0, 1, 3, 'active'),
('af000001-0016-4000-a000-000000000016', 'default', 'Yamaha WaveRunner VX', 'RNT-JET-VX', 'Personal watercraft for rental operations', 'goods', 'rental', 'ca000001-0006-4000-a000-000000000006', 'Yamaha', 185000000, 0, 'unit', 0, 0, 0, 'active'),
('af000001-0017-4000-a000-000000000017', 'default', 'Starboard iGO Zen SUP', 'RNT-SUP-ZEN', 'Inflatable stand-up paddleboard', 'goods', 'rental', 'ca000001-0006-4000-a000-000000000006', 'Starboard', 12000000, 0, 'unit', 0, 0, 0, 'active'),
('af000001-0018-4000-a000-000000000018', 'default', 'Hobie Mirage Eclipse', 'RNT-KYK-HOB', 'Pedal-driven stand-up kayak', 'goods', 'rental', 'ca000001-0006-4000-a000-000000000006', 'Hobie', 25000000, 0, 'unit', 0, 0, 0, 'active'),
('af000001-0019-4000-a000-000000000019', 'default', 'Cressi Snorkeling Set Pro', 'RNT-SNK-CRS', 'Mask + snorkel + fins professional set', 'goods', 'rental', 'ca000001-0006-4000-a000-000000000006', 'Cressi', 3500000, 0, 'set', 0, 0, 0, 'active'),
('af000001-0020-4000-a000-000000000020', 'default', 'Ferry Ticket Sanur → Nusa Penida', 'TKT-SNR-NP', 'Fast boat ticket Sanur to Nusa Penida (economy)', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', 'Nusantarasoft', 50000, 350000, 'pcs', 0, 0, 0, 'active'),
('af000001-0021-4000-a000-000000000021', 'default', 'Ferry Ticket Padang Bai → Gili T', 'TKT-PB-GT', 'Fast boat ticket Padang Bai to Gili Trawangan (economy)', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', 'Nusantarasoft', 80000, 600000, 'pcs', 0, 0, 0, 'active'),
('af000001-0022-4000-a000-000000000022', 'default', 'Ferry Ticket Sanur → Lembongan', 'TKT-SNR-LB', 'Fast boat ticket Sanur to Nusa Lembongan (economy)', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', 'Nusantarasoft', 40000, 300000, 'pcs', 0, 0, 0, 'active'),
('af000001-0023-4000-a000-000000000023', 'default', 'Komodo Island Day Pass', 'TKT-KOMODO', 'Day pass for Komodo National Park entrance', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', NULL, 50000, 500000, 'pcs', 0, 0, 0, 'active'),
('af000001-0024-4000-a000-000000000024', 'default', 'Nusa Penida Snorkeling Tour', 'SVC-NP-SNK', 'Full-day snorkeling tour at Crystal Bay & Manta Point', 'service', 'scheduled', 'ca000001-0009-4000-a000-000000000009', 'Nusantarasoft', 200000, 750000, 'pcs', 0, 0, 0, 'active'),
('af000001-0025-4000-a000-000000000025', 'default', 'Sunset Dolphin Watch Cruise', 'SVC-DLP-SS', 'Evening dolphin watching cruise from Sanur (2 hrs)', 'service', 'scheduled', 'ca000001-0009-4000-a000-000000000009', 'Nusantarasoft', 150000, 500000, 'pcs', 0, 0, 0, 'active'),
('af000001-0026-4000-a000-000000000026', 'default', 'Mangrove Kayak Tour', 'SVC-MNG-KYK', 'Guided mangrove kayaking tour from Nusa Lembongan (3 hrs)', 'service', 'scheduled', 'ca000001-0009-4000-a000-000000000009', 'Nusantarasoft', 100000, 400000, 'pcs', 0, 0, 0, 'active'),
('af000001-0027-4000-a000-000000000027', 'default', 'Raja Ampat Dive Package', 'SVC-RA-DVE', '3-dive package at Raja Ampat marine reserve', 'service', 'scheduled', 'ca000001-0009-4000-a000-000000000009', NULL, 500000, 2500000, 'pcs', 0, 0, 0, 'active'),
('af000001-0028-4000-a000-000000000028', 'default', 'Ferry Ticket Nusa Penida → Sanur', 'TKT-NP-SNR', 'Fast boat return ticket Nusa Penida to Sanur (economy)', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', 'Nusantarasoft', 50000, 350000, 'pcs', 0, 0, 0, 'active'),
('af000001-0029-4000-a000-000000000029', 'default', 'Ferry Ticket Gili T → Padang Bai', 'TKT-GT-PB', 'Fast boat return ticket Gili Trawangan to Padang Bai (economy)', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', 'Nusantarasoft', 80000, 600000, 'pcs', 0, 0, 0, 'active'),
('af000001-0030-4000-a000-000000000030', 'default', 'Ferry Ticket Labuan Bajo → Komodo', 'TKT-LB-KMD', 'Fast boat ticket Labuan Bajo to Komodo Island (economy)', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', 'Nusantarasoft', 100000, 500000, 'pcs', 0, 0, 0, 'active'),
('af000001-0031-4000-a000-000000000031', 'default', 'Ferry Ticket Sorong → Waisai', 'TKT-SRG-WSI', 'Fast boat ticket Sorong to Waisai, Raja Ampat (economy)', 'goods', 'ticket', 'ca000001-0008-4000-a000-000000000008', NULL, 250000, 1350000, 'pcs', 0, 0, 0, 'active')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ SUPPLIERS (linked to CRM accounts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_suppliers (id, tenant_id, code, name, contact_person, email, phone, address, city, country, payment_terms, rating, lead_time_days, account_id, status) VALUES
('ae000001-0001-4000-a000-000000000001', 'default', 'SUP-YMH', 'Yamaha Motor Indonesia', 'Budi Santoso', 'marine@yamaha.co.id', '+62-21-555-1001', 'Jl. Raya Jakarta-Bogor KM 30', 'Jakarta', 'Indonesia', 'Net 30', 4.5, 14, 'ac000001-0004-4000-a000-000000000004', 'active'),
('ae000001-0002-4000-a000-000000000002', 'default', 'SUP-MPI', 'Marina Parts International', 'Rizky Firmansyah', 'sales@marinaparts.co.id', '+62-31-555-2001', 'Jl. Margomulyo Industri No.8', 'Surabaya', 'Indonesia', 'Net 30', 4.0, 7, 'ac000001-0005-4000-a000-000000000005', 'active'),
('ae000001-0003-4000-a000-000000000003', 'default', 'SUP-3M', '3M Marine Indonesia', 'Dewi Lestari', 'marine@3m.co.id', '+62-21-555-3001', 'Jl. Jend. Sudirman Kav 29', 'Jakarta', 'Indonesia', 'Net 45', 4.8, 10, 'ac000001-0006-4000-a000-000000000006', 'active'),
('ae000001-0004-4000-a000-000000000004', 'default', 'SUP-CRS', 'Cressi Indonesia', 'Eka Putra', 'info@cressi.co.id', '+62-361-555-4001', 'Jl. Sunset Road No.77', 'Kuta', 'Indonesia', 'COD', 3.5, 5, 'ac000001-0007-4000-a000-000000000007', 'active'),
('ae000001-0005-4000-a000-000000000005', 'default', 'SUP-BME', 'Bali Marine Engineering', 'Wayan Sudira', 'info@balimarine.co.id', '+62-361-555-5001', 'Jl. Benoa Harbour No.12', 'Denpasar', 'Indonesia', 'Net 30', 4.2, 21, 'ac000001-0008-4000-a000-000000000008', 'active'),
('ae000001-0006-4000-a000-000000000006', 'default', 'SUP-SSE', 'Safe Seas Equipment Co', 'Andi Wijaya', 'sales@safeseas.co.id', '+62-31-555-7001', 'Jl. Perak Timur No.45', 'Surabaya', 'Indonesia', 'Net 30', 4.3, 10, 'ac000001-0010-4000-a000-000000000010', 'active')
ON CONFLICT (id) DO NOTHING;

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
INSERT INTO booking_schedules (id, tenant_id, item_id, schedule_code, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity, vehicle_name, vessel_type, price_economy, price_business, price_vip, status) VALUES
('c0000001-0001-4000-a000-000000000001', 'default', 'af000001-0020-4000-a000-000000000020', 'SCH-001', 'Sanur - Nusa Penida (Morning)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '07:30', '08:15', 45, 40, 'Maruti Express I', 'speedboat', 350000, 500000, 0, 'active'),
('c0000001-0002-4000-a000-000000000002', 'default', 'af000001-0028-4000-a000-000000000028', 'SCH-002', 'Nusa Penida - Sanur (Afternoon)', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '16:00', '16:45', 45, 40, 'Maruti Express I', 'speedboat', 350000, 500000, 0, 'active'),
('c0000001-0003-4000-a000-000000000003', 'default', 'af000001-0021-4000-a000-000000000021', 'SCH-003', 'Padang Bai - Gili T (Morning)', 'Padang Bai Harbour', 'Gili Trawangan', '09:00', '11:30', 150, 80, 'Gili Getaway', 'speedboat', 600000, 800000, 1000000, 'active'),
('c0000001-0004-4000-a000-000000000004', 'default', 'af000001-0029-4000-a000-000000000029', 'SCH-004', 'Gili T - Padang Bai (Afternoon)', 'Gili Trawangan', 'Padang Bai Harbour', '14:00', '16:30', 150, 80, 'Gili Getaway', 'speedboat', 600000, 800000, 1000000, 'active'),
('c0000001-0005-4000-a000-000000000005', 'default', 'af000001-0022-4000-a000-000000000022', 'SCH-005', 'Sanur - Lembongan (Morning)', 'Sanur Harbour', 'Jungutbatu, Lembongan', '08:00', '08:30', 30, 45, 'Rocky Fast Cruises', 'speedboat', 300000, 450000, 0, 'active'),
('c0000001-0006-4000-a000-000000000006', 'default', 'af000001-0030-4000-a000-000000000030', 'SCH-006', 'Labuan Bajo - Komodo (Morning)', 'Labuan Bajo Harbour', 'Komodo Island', '07:00', '09:00', 120, 30, 'Komodo Jet', 'speedboat', 500000, 750000, 0, 'active'),
('c0000001-0007-4000-a000-000000000007', 'default', 'af000001-0031-4000-a000-000000000031', 'SCH-007', 'Sorong - Waisai (Morning)', 'Sorong Harbour', 'Waisai, Raja Ampat', '08:00', '10:00', 120, 20, 'Raja Ampat Flyer', 'speedboat', 1350000, 0, 0, 'active'),
('c0000001-0008-4000-a000-000000000008', 'default', 'af000001-0020-4000-a000-000000000020', 'SCH-008', 'Sanur - Nusa Penida (Midday)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '11:00', '11:50', 50, 50, 'Maruti Express II', 'speedboat', 500000, 700000, 900000, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_occurrences (schedule_id, departure_date, departure_time, total_capacity, status)
SELECT s.id, d.dt::date, s.departure_time, s.capacity, 'scheduled'
FROM booking_schedules s
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', INTERVAL '1 day') AS d(dt)
WHERE s.id::text LIKE 'c0000001-%'
ON CONFLICT DO NOTHING;

-- â”€â”€â”€ BOOKINGS (linked to CRM contacts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO bookings (id, tenant_id, booking_code, schedule_id, customer_name, customer_email, customer_phone, contact_id, passenger_count, class, total_amount, paid_amount, status) VALUES
('d0000001-0001-4000-a000-000000000001', 'default', 'BK-2026-001', 'c0000001-0001-4000-a000-000000000001', 'John Smith', 'john.s@traveler.com', '+1-555-7777-007', 'ab000001-0009-4000-a000-000000000009', 2, 'economy', 700000, 700000, 'confirmed'),
('d0000001-0002-4000-a000-000000000002', 'default', 'BK-2026-002', 'c0000001-0003-4000-a000-000000000003', 'Sarah Johnson', 'sarah.j@gmail.com', '+44-7700-900123', 'ab000001-0011-4000-a000-000000000011', 1, 'business', 800000, 800000, 'confirmed'),
('d0000001-0003-4000-a000-000000000003', 'default', 'BK-2026-003', 'c0000001-0005-4000-a000-000000000005', 'Wayan Dharma', 'wayan.d@gmail.com', '+62-812-1111-001', 'ab000001-0006-4000-a000-000000000006', 4, 'economy', 1200000, 600000, 'pending'),
('d0000001-0004-4000-a000-000000000004', 'default', 'BK-2026-004', 'c0000001-0006-4000-a000-000000000006', 'Hans Mueller', 'hans.m@web.de', '+49-170-1234567', 'ab000001-0012-4000-a000-000000000012', 2, 'economy', 1000000, 1000000, 'checked_in'),
('d0000001-0005-4000-a000-000000000005', 'default', 'BK-2026-005', 'c0000001-0001-4000-a000-000000000001', 'Yuki Tanaka', 'yuki.t@mail.jp', '+81-90-1234-5678', 'ab000001-0013-4000-a000-000000000013', 1, 'business', 500000, 500000, 'confirmed'),
('d0000001-0006-4000-a000-000000000006', 'default', 'BK-2026-006', 'c0000001-0007-4000-a000-000000000007', 'Emma Watson', 'emma.w@outlook.com', '+61-400-123456', 'ab000001-0014-4000-a000-000000000014', 2, 'economy', 2700000, 2700000, 'confirmed'),
('d0000001-0007-4000-a000-000000000007', 'default', 'BK-2026-007', 'c0000001-0008-4000-a000-000000000008', 'Putu Dharma', 'putu.d@gmail.com', '+62-817-8765-432', 'ab000001-0015-4000-a000-000000000015', 3, 'vip', 2700000, 0, 'pending'),
('d0000001-0008-4000-a000-000000000008', 'default', 'BK-2026-008', 'c0000001-0004-4000-a000-000000000004', 'Li Wei', 'li.wei@qq.com', '+86-139-1234-5678', 'ab000001-0016-4000-a000-000000000016', 2, 'economy', 1200000, 1200000, 'confirmed')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ RENTAL ASSETS (linked to item master) â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO rental_assets (id, tenant_id, asset_code, asset_name, serial_number, category, condition, item_id, purchase_date, purchase_cost, current_location, daily_rate, deposit_amount, status) VALUES
('e0000001-0001-4000-a000-000000000001', 'default', 'RNT-JET-001', 'Yamaha WaveRunner VX', 'YMA-WR-2024-001', 'Jet Ski', 'excellent', 'af000001-0016-4000-a000-000000000016', '2024-06-15', 185000000, 'Sanur Beach', 1500000, 5000000, 'available'),
('e0000001-0002-4000-a000-000000000002', 'default', 'RNT-JET-002', 'Yamaha WaveRunner VX', 'YMA-WR-2024-002', 'Jet Ski', 'good', 'af000001-0016-4000-a000-000000000016', '2024-06-15', 185000000, 'Sanur Beach', 1500000, 5000000, 'rented'),
('e0000001-0003-4000-a000-000000000003', 'default', 'RNT-SUP-001', 'Starboard iGO Zen', 'STB-SUP-2024-001', 'Stand Up Paddle', 'excellent', 'af000001-0017-4000-a000-000000000017', '2024-08-01', 12000000, 'Nusa Dua Beach', 250000, 500000, 'available'),
('e0000001-0004-4000-a000-000000000004', 'default', 'RNT-KYK-001', 'Hobie Mirage Eclipse', 'HOB-KYK-2024-001', 'Kayak', 'excellent', 'af000001-0018-4000-a000-000000000018', '2024-09-01', 25000000, 'Sanur Harbour', 350000, 1000000, 'available'),
('e0000001-0005-4000-a000-000000000005', 'default', 'RNT-SNK-001', 'Cressi Snorkeling Set Pro', 'CRS-SNK-2024-001', 'Snorkeling', 'good', 'af000001-0019-4000-a000-000000000019', '2024-03-01', 3500000, 'Sanur Harbour', 100000, 200000, 'maintenance')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ RENTAL CONTRACTS (linked to CRM contacts) â”€â”€â”€â”€
INSERT INTO rental_contracts (id, tenant_id, contract_code, asset_id, asset_name, customer_name, customer_email, customer_phone, customer_id_number, contact_id, checkout_date, expected_return_date, daily_rate, deposit_amount, subtotal, total_charge, checkout_condition, status) VALUES
('f0000001-0001-4000-a000-000000000001', 'default', 'RC-2026-001', 'e0000001-0002-4000-a000-000000000002', 'Yamaha WaveRunner VX', 'James Wilson', 'james.w@gmail.com', '+1-555-0201', 'P12345678', 'ab000001-0017-4000-a000-000000000017', CURRENT_DATE, CURRENT_DATE + 3, 1500000, 5000000, 4500000, 4500000, 'excellent', 'active'),
('f0000001-0002-4000-a000-000000000002', 'default', 'RC-2026-002', 'e0000001-0003-4000-a000-000000000003', 'Starboard iGO Zen', 'Maria Garcia', 'maria.g@hotmail.com', '+34-600-123456', 'ES-XY789012', 'ab000001-0018-4000-a000-000000000018', CURRENT_DATE - 2, CURRENT_DATE, 250000, 500000, 500000, 500000, 'excellent', 'active'),
('f0000001-0003-4000-a000-000000000003', 'default', 'RC-2026-003', 'e0000001-0004-4000-a000-000000000004', 'Hobie Mirage Eclipse', 'Tanaka Hiroshi', 'hiroshi@mail.jp', '+81-80-9876-5432', 'JP-AB123456', 'ab000001-0019-4000-a000-000000000019', CURRENT_DATE - 5, CURRENT_DATE - 3, 350000, 1000000, 700000, 700000, 'good', 'returned'),
('f0000001-0004-4000-a000-000000000004', 'default', 'RC-2026-004', 'e0000001-0001-4000-a000-000000000001', 'Yamaha WaveRunner VX', 'Sophie Dubois', 'sophie.d@orange.fr', '+33-6-12-34-56-78', 'FR-CD567890', 'ab000001-0020-4000-a000-000000000020', CURRENT_DATE - 7, CURRENT_DATE - 5, 1500000, 5000000, 3000000, 3000000, 'excellent', 'returned')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ E-COMMERCE CUSTOMERS (linked to CRM) â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO ecom_customers (id, tenant_id, customer_code, first_name, last_name, email, phone, company, address, city, province, customer_type, account_id, contact_id, status) VALUES
('a1000001-0001-4000-a000-000000000001', 'default', 'CUST-001', 'Wayan', 'Dharma', 'wayan.d@gmail.com', '+62-812-1111-001', NULL, 'Jl. Raya Ubud No.10', 'Gianyar', 'Bali', 'individual', NULL, 'ab000001-0006-4000-a000-000000000006', 'active'),
('a1000001-0002-4000-a000-000000000002', 'default', 'CUST-002', 'Ni Luh', 'Sari', 'niluh.s@yahoo.co.id', '+62-817-2222-002', NULL, 'Jl. Sunset Road No.55', 'Kuta', 'Bali', 'individual', NULL, 'ab000001-0007-4000-a000-000000000007', 'active'),
('a1000001-0003-4000-a000-000000000003', 'default', 'CUST-003', 'PT Bali', 'Tours', 'ops@balitours.co.id', '+62-361-555-003', 'PT Bali Discovery Tours', 'Jl. Bypass Ngurah Rai No.99', 'Denpasar', 'Bali', 'corporate', 'ac000001-0002-4000-a000-000000000002', 'ab000001-0021-4000-a000-000000000021', 'active'),
('a1000001-0004-4000-a000-000000000004', 'default', 'CUST-004', 'Ketut', 'Wirawan', 'ketut.w@hotmail.com', '+62-813-4444-004', NULL, 'Jl. Pantai Kuta No.20', 'Badung', 'Bali', 'individual', NULL, 'ab000001-0002-4000-a000-000000000002', 'active'),
('a1000001-0005-4000-a000-000000000005', 'default', 'CUST-005', 'CV Nusa', 'Travel', 'booking@nusatravel.id', '+62-361-555-005', 'CV Nusa Penida Travel', 'Jl. Toyapakeh No.5', 'Klungkung', 'Bali', 'corporate', 'ac000001-0003-4000-a000-000000000003', 'ab000001-0022-4000-a000-000000000022', 'active'),
('a1000001-0006-4000-a000-000000000006', 'default', 'CUST-006', 'Made', 'Astawa', 'made.a@gmail.com', '+62-819-6666-006', NULL, 'Jl. Danau Tamblingan No.88', 'Denpasar', 'Bali', 'individual', NULL, 'ab000001-0008-4000-a000-000000000008', 'active'),
('a1000001-0007-4000-a000-000000000007', 'default', 'CUST-007', 'John', 'Smith', 'john.s@traveler.com', '+1-555-7777-007', NULL, '123 Main St', 'Sydney', 'NSW', 'individual', NULL, 'ab000001-0009-4000-a000-000000000009', 'active'),
('a1000001-0008-4000-a000-000000000008', 'default', 'CUST-008', 'Sakura', 'Yamamoto', 'sakura.y@yahoo.co.jp', '+81-90-8888-008', NULL, '4-5-6 Shibuya', 'Tokyo', 'Kanto', 'individual', NULL, 'ab000001-0010-4000-a000-000000000010', 'active')
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

INSERT INTO ecom_store_settings (tenant_id, store_name, store_email, store_phone, store_address, default_currency, tax_rate, shipping_enabled, default_shipping_cost, order_prefix) VALUES
('default', 'Nusantarasoft Marine Store', 'store@nusantarasoft.id', '+62-361-555-8888', 'Jl. Bypass Ngurah Rai No. 100, Denpasar, Bali', 'IDR', 11, TRUE, 15000, 'ORD')
ON CONFLICT (tenant_id) DO NOTHING;

-- â”€â”€â”€ MANUFACTURING BOMs (linked to item master) â”€â”€â”€
INSERT INTO mfg_boms (id, tenant_id, code, name, version, product_name, product_sku, description, uom, yield_qty, labor_hours, labor_cost, overhead_cost, total_material_cost, total_cost, status) VALUES
('c1000001-0001-4000-a000-000000000001', 'default', 'BOM-001', 'Speedboat Hull Assembly', '1.0', 'Fiberglass Hull 35ft', 'HULL-FB-35', 'Complete fiberglass hull assembly for 35ft speedboat', 'unit', 1, 120, 6000000, 2000000, 45000000, 53000000, 'active'),
('c1000001-0002-4000-a000-000000000002', 'default', 'BOM-002', 'Life Jacket Assembly Kit', '2.0', 'Marine Life Jacket Type III', 'LJ-III-STD', 'Standard marine life jacket assembly with reflective strips', 'unit', 10, 8, 800000, 200000, 5000000, 6000000, 'active'),
('c1000001-0003-4000-a000-000000000003', 'default', 'BOM-003', 'Navigation Console Unit', '1.0', 'GPS Nav Console V2', 'NAV-CON-V2', 'Integrated navigation console with GPS, radar, and depth sounder', 'unit', 1, 16, 2400000, 500000, 35000000, 37900000, 'draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mfg_bom_lines (id, bom_id, item_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order) VALUES
('d1000001-0001-4000-a000-000000000001', 'c1000001-0001-4000-a000-000000000001', 'af000001-0007-4000-a000-000000000007', 'Fiberglass Cloth Roll', 'MAT-FG-ROLL', 15, 'roll', 1200000, 18000000, 5, 1),
('d1000001-0002-4000-a000-000000000002', 'c1000001-0001-4000-a000-000000000001', 'af000001-0008-4000-a000-000000000008', 'Polyester Resin 20L', 'MAT-PR-20L', 8, 'drum', 2500000, 20000000, 3, 2),
('d1000001-0003-4000-a000-000000000003', 'c1000001-0001-4000-a000-000000000001', 'af000001-0009-4000-a000-000000000009', 'Gelcoat White', 'MAT-GC-WHT', 5, 'kg', 350000, 1750000, 2, 3),
('d1000001-0004-4000-a000-000000000004', 'c1000001-0001-4000-a000-000000000001', 'af000001-0010-4000-a000-000000000010', 'Marine Plywood 12mm', 'MAT-MPW-12', 10, 'sheet', 525000, 5250000, 0, 4),
('d1000001-0005-4000-a000-000000000005', 'c1000001-0002-4000-a000-000000000002', 'af000001-0011-4000-a000-000000000011', 'Nylon Fabric Roll 420D', 'MAT-NF-420D', 5, 'roll', 450000, 2250000, 3, 1),
('d1000001-0006-4000-a000-000000000006', 'c1000001-0002-4000-a000-000000000002', 'af000001-0012-4000-a000-000000000012', 'EPE Foam Sheet', 'MAT-FOAM-EPE', 20, 'sheet', 85000, 1700000, 5, 2),
('d1000001-0007-4000-a000-000000000007', 'c1000001-0002-4000-a000-000000000002', 'af000001-0013-4000-a000-000000000013', 'Reflective Strip 3M', 'MAT-REF-3M', 30, 'meter', 35000, 1050000, 0, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mfg_work_orders (id, tenant_id, wo_number, bom_id, bom_name, planned_qty, uom, priority, assigned_to, planned_start, planned_end, estimated_cost, status, created_at) VALUES
('e1000001-0001-4000-a000-000000000001', 'default', 'WO-2026-001', 'c1000001-0001-4000-a000-000000000001', 'Speedboat Hull Assembly', 2, 'unit', 'high', 'Pak Nyoman', '2026-04-01', '2026-04-30', 106000000, 'planned', '2026-03-20'),
('e1000001-0002-4000-a000-000000000002', 'default', 'WO-2026-002', 'c1000001-0002-4000-a000-000000000002', 'Life Jacket Assembly Kit', 50, 'unit', 'normal', 'Bu Kadek', '2026-04-05', '2026-04-10', 30000000, 'in_progress', '2026-03-22'),
('e1000001-0003-4000-a000-000000000003', 'default', 'WO-2026-003', 'c1000001-0002-4000-a000-000000000002', 'Life Jacket Assembly Kit', 30, 'unit', 'low', 'Bu Kadek', '2026-04-15', '2026-04-18', 18000000, 'draft', '2026-03-25'),
('e1000001-0004-4000-a000-000000000004', 'default', 'WO-2026-004', 'c1000001-0003-4000-a000-000000000003', 'Navigation Console Unit', 5, 'unit', 'high', 'Pak Wayan', '2026-04-08', '2026-04-20', 189500000, 'planned', '2026-03-24'),
('e1000001-0005-4000-a000-000000000005', 'default', 'WO-2026-005', 'c1000001-0001-4000-a000-000000000001', 'Speedboat Hull Assembly', 1, 'unit', 'urgent', 'Pak Nyoman', '2026-03-28', '2026-04-15', 53000000, 'in_progress', '2026-03-26')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ STOCK OPNAME (linked to item master) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO inv_opname_sessions (id, tenant_id, session_code, title, warehouse_id, warehouse_name, counted_by, scheduled_date, total_items, items_counted, status, created_at) VALUES
('f1000001-0001-4000-a000-000000000001', 'default', 'SOP-2026-001', 'Q1 2026 - Gudang Utama Inventory', 'a0000001-0001-4000-a000-000000000001', 'Gudang Utama Denpasar', 'Ketut Wirawan', '2026-03-31', 6, 4, 'counting', '2026-03-25'),
('f1000001-0002-4000-a000-000000000002', 'default', 'SOP-2026-002', 'Q1 2026 - Depot Sanur Check', 'a0000001-0002-4000-a000-000000000002', 'Depot Sanur Harbour', 'Made Suardana', '2026-04-05', 4, 0, 'draft', '2026-03-26')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inv_opname_lines (id, session_id, item_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_by, status, sort_order) VALUES
('a2000001-0001-4000-a000-000000000001', 'f1000001-0001-4000-a000-000000000001', 'af000001-0001-4000-a000-000000000001', 'Yamaha Outboard Oil Filter', 'YMA-OF-001', 'Zone A - Spare Parts', 'A-01-01', 'pcs', 50, 48, 125000, 'Ketut', 'counted', 1),
('a2000001-0002-4000-a000-000000000002', 'f1000001-0001-4000-a000-000000000001', 'af000001-0002-4000-a000-000000000002', 'Marine Life Jacket Type III', 'LJ-III-STD', 'Zone B - Safety Equipment', 'B-01-01', 'pcs', 200, 198, 350000, 'Ketut', 'counted', 2),
('a2000001-0003-4000-a000-000000000003', 'f1000001-0001-4000-a000-000000000001', 'af000001-0003-4000-a000-000000000003', 'Diesel Fuel (Solar)', 'FUEL-DSL-20L', 'Zone C - Fuel Storage', 'C-01-01', 'liter', 5000, 5020, 13500, 'Wayan', 'counted', 3),
('a2000001-0004-4000-a000-000000000004', 'f1000001-0001-4000-a000-000000000001', 'af000001-0004-4000-a000-000000000004', 'Impeller Kit Yamaha 150HP', 'YMA-IMP-150', 'Zone A - Spare Parts', 'A-02-01', 'pcs', 15, 15, 850000, 'Wayan', 'counted', 4),
('a2000001-0005-4000-a000-000000000005', 'f1000001-0001-4000-a000-000000000001', 'af000001-0005-4000-a000-000000000005', 'Fire Extinguisher 3kg', 'SAF-FE-3KG', 'Zone B - Safety Equipment', 'B-02-01', 'pcs', 30, NULL, 450000, NULL, 'pending', 5),
('a2000001-0006-4000-a000-000000000006', 'f1000001-0001-4000-a000-000000000001', 'af000001-0006-4000-a000-000000000006', 'Antifouling Paint 5L', 'PNT-AF-5L', 'Zone A - Spare Parts', 'A-03-01', 'bucket', 25, NULL, 650000, NULL, 'pending', 6)
ON CONFLICT (id) DO NOTHING;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- END OF SEED DATA
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
