-- ═══════════════════════════════════════════════════════════════
-- E-COMMERCE MODULE — v2.19.0
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ecommerce_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    slug TEXT,
    parent_id UUID REFERENCES ecommerce_categories(id),
    description TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecommerce_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    sku TEXT,
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    short_description TEXT,
    category_id UUID REFERENCES ecommerce_categories(id),
    brand TEXT,
    product_type TEXT DEFAULT 'physical' CHECK (product_type IN ('physical','digital','service','subscription')),
    base_price NUMERIC(15,2) DEFAULT 0,
    sale_price NUMERIC(15,2),
    cost_price NUMERIC(15,2),
    currency TEXT DEFAULT 'IDR',
    tax_rate NUMERIC(5,2) DEFAULT 0,
    weight NUMERIC(10,2),
    dimensions JSONB,
    images JSONB DEFAULT '[]',
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    inventory_item_id UUID, -- FK to inventory_items
    track_inventory BOOLEAN DEFAULT true,
    stock_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    metadata JSONB DEFAULT '{}',
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecommerce_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    company TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    crm_contact_id UUID, -- FK to crm_contacts
    crm_account_id UUID, -- FK to crm_accounts
    tags TEXT[],
    total_orders INT DEFAULT 0,
    total_spent NUMERIC(15,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecommerce_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    order_number TEXT NOT NULL,
    customer_id UUID REFERENCES ecommerce_customers(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded','returned')),
    subtotal NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    shipping_amount NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
    payment_method TEXT,
    shipping_method TEXT,
    shipping_address JSONB,
    billing_address JSONB,
    notes TEXT,
    source TEXT DEFAULT 'web',
    accounting_journal_id UUID, -- FK to accounting_journal_entries for auto-sync
    crm_deal_id UUID, -- FK to crm_deals for pipeline sync
    metadata JSONB DEFAULT '{}',
    ordered_at TIMESTAMPTZ DEFAULT now(),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecommerce_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES ecommerce_products(id),
    sku TEXT,
    name TEXT NOT NULL,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(15,2) DEFAULT 0,
    discount NUMERIC(15,2) DEFAULT 0,
    tax NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ecommerce_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    product_id UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES ecommerce_customers(id),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    content TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecommerce_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL,
    name TEXT,
    description TEXT,
    discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed','free_shipping')),
    value NUMERIC(15,2) DEFAULT 0,
    min_order_amount NUMERIC(15,2),
    max_uses INT,
    used_count INT DEFAULT 0,
    applies_to TEXT DEFAULT 'all',
    product_ids UUID[],
    category_ids UUID[],
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecommerce_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    order_id UUID NOT NULL REFERENCES ecommerce_orders(id),
    amount NUMERIC(15,2) NOT NULL,
    currency TEXT DEFAULT 'IDR',
    payment_method TEXT,
    gateway TEXT,
    gateway_transaction_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded')),
    metadata JSONB DEFAULT '{}',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_tenant ON ecommerce_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_tenant ON ecommerce_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_customer ON ecommerce_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_status ON ecommerce_orders(status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_customers_tenant ON ecommerce_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_customers_email ON ecommerce_customers(email);
