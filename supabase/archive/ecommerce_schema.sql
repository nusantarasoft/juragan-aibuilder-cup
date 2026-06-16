-- ═══════════════════════════════════════════════════════════
-- E-COMMERCE MODULE — Schema
-- Tables: ecom_customers, ecom_orders, ecom_order_items, ecom_store_settings
-- ═══════════════════════════════════════════════════════════

-- ─── Customers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ecom_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    customer_code TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Indonesia',
    id_number TEXT,
    customer_type TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual','company','reseller')),
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    loyalty_points INT DEFAULT 0,
    notes TEXT,
    tags TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ecom_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    order_number TEXT NOT NULL,
    customer_id UUID REFERENCES ecom_customers(id),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_province TEXT,
    shipping_postal_code TEXT,
    shipping_method TEXT,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
    notes TEXT,
    internal_notes TEXT,
    source TEXT DEFAULT 'admin' CHECK (source IN ('admin','web','mobile','api')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','completed','cancelled','refunded')),
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Order Items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ecom_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES ecom_orders(id) ON DELETE CASCADE,
    item_id UUID,  -- References inv_items(id) — the unified item master
    item_name TEXT NOT NULL,
    item_sku TEXT,
    fulfillment_type TEXT DEFAULT 'physical' CHECK (fulfillment_type IN ('physical','ticket','scheduled','rental')),
    fulfillment_ref UUID,  -- booking_id, rental_contract_id, etc.
    quantity INT DEFAULT 1,
    unit_price DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    variant_info JSONB,  -- {color, size, class, cabin_type, rental_dates, etc.}
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','shipped','delivered','cancelled','returned')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Store Settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ecom_store_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default' UNIQUE,
    store_name TEXT DEFAULT 'Nusantara Store',
    store_email TEXT,
    store_phone TEXT,
    store_address TEXT,
    default_currency TEXT DEFAULT 'IDR',
    tax_rate DECIMAL(5,2) DEFAULT 11.00,
    tax_included BOOLEAN DEFAULT false,
    shipping_enabled BOOLEAN DEFAULT true,
    default_shipping_cost DECIMAL(15,2) DEFAULT 15000,
    free_shipping_threshold DECIMAL(15,2) DEFAULT 500000,
    payment_methods JSONB DEFAULT '["bank_transfer","cash","credit_card"]'::jsonb,
    fulfillment_physical JSONB DEFAULT '{"auto_stock_deduct": true, "require_shipping": true}'::jsonb,
    fulfillment_ticket JSONB DEFAULT '{"auto_generate_qr": true, "send_email": true}'::jsonb,
    fulfillment_scheduled JSONB DEFAULT '{"auto_create_booking": true, "require_passenger_info": true}'::jsonb,
    fulfillment_rental JSONB DEFAULT '{"require_id_verification": true, "collect_deposit": true}'::jsonb,
    low_stock_alert BOOLEAN DEFAULT true,
    order_prefix TEXT DEFAULT 'ORD',
    invoice_prefix TEXT DEFAULT 'INV',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ───────────────────────────────────────────────────
ALTER TABLE ecom_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecom_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecom_store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecom_customers_policy" ON ecom_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ecom_orders_policy" ON ecom_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ecom_order_items_policy" ON ecom_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ecom_store_settings_policy" ON ecom_store_settings FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ecom_customers TO authenticated, anon, service_role, authenticator;
GRANT ALL ON ecom_orders TO authenticated, anon, service_role, authenticator;
GRANT ALL ON ecom_order_items TO authenticated, anon, service_role, authenticator;
GRANT ALL ON ecom_store_settings TO authenticated, anon, service_role, authenticator;
