-- Procurement Module - Phase 2 Database Schema
-- Run this in Supabase SQL Editor

-- 1. Suppliers
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
    payment_terms TEXT DEFAULT 'Net 30',  -- Net 30, Net 60, COD, etc.
    currency TEXT DEFAULT 'IDR',
    rating NUMERIC(3,1) DEFAULT 0,  -- 0-5 star rating
    lead_time_days INT DEFAULT 7,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    status TEXT DEFAULT 'active',  -- active, inactive, blacklisted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_suppliers_tenant ON inv_suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_suppliers_status ON inv_suppliers(status);

-- 2. Purchase Requisitions (PR)
CREATE TABLE IF NOT EXISTS inv_purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    pr_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    requested_by TEXT,
    department TEXT,
    priority TEXT DEFAULT 'normal',  -- low, normal, high, urgent
    required_date DATE,
    total_estimated NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    notes TEXT,
    status TEXT DEFAULT 'draft',  -- draft, pending_approval, approved, rejected, converted, cancelled
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_pr_tenant ON inv_purchase_requisitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_pr_status ON inv_purchase_requisitions(status);

-- 3. PR Line Items
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

-- 4. Purchase Orders (PO)
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
    status TEXT DEFAULT 'draft',  -- draft, sent, confirmed, partial_received, received, cancelled
    sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_po_tenant ON inv_purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_po_supplier ON inv_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inv_po_status ON inv_purchase_orders(status);

-- 5. PO Line Items
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

-- 6. Goods Received Notes (GRN)
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
    quality_check TEXT DEFAULT 'passed',  -- passed, partial, failed
    notes TEXT,
    status TEXT DEFAULT 'draft',  -- draft, inspecting, accepted, rejected
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_grn_tenant ON inv_goods_received_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_grn_po ON inv_goods_received_notes(po_id);

-- 7. GRN Line Items
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
    quality_status TEXT DEFAULT 'passed',  -- passed, failed, partial
    rejection_reason TEXT,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inv_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_pr_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_po_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_grn_lines ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role full access" ON inv_suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_purchase_requisitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_pr_lines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_po_lines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_goods_received_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_grn_lines FOR ALL USING (true) WITH CHECK (true);
