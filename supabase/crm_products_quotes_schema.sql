-- ===========================================
-- CRM Products & Quotes Schema
-- ===========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products catalog
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(tenant_id, is_active);

-- Quotes (linked to deals)
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quote_number VARCHAR(50),
    name VARCHAR(500) NOT NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, presented, accepted, rejected, expired
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    tax_percent NUMERIC(5,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    valid_until DATE,
    description TEXT,
    terms TEXT,
    owner_id UUID REFERENCES public.tenant_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON public.quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_deal ON public.quotes(deal_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(tenant_id, status);

-- Quote line items
CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(500) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    total NUMERIC(15,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items(quote_id);

-- Auto-generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.quote_number := 'QT-' || LPAD(nextval('quote_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quote_number') THEN
        CREATE TRIGGER trg_quote_number
            BEFORE INSERT ON public.quotes
            FOR EACH ROW
            WHEN (NEW.quote_number IS NULL)
            EXECUTE FUNCTION generate_quote_number();
    END IF;
END $$;
