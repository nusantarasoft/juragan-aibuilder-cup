-- ===========================================
-- CRM Deals / Opportunities Schema
-- ===========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Core
    name VARCHAR(500) NOT NULL,
    description TEXT,
    amount NUMERIC(15,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Pipeline
    stage VARCHAR(50) DEFAULT 'prospecting',
    -- prospecting, qualification, proposal, negotiation, closed_won, closed_lost
    probability INTEGER DEFAULT 10, -- 0-100
    close_date DATE,

    -- Relations
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

    -- Classification
    type VARCHAR(50), -- new_business, existing_business, renewal
    lead_source VARCHAR(100),
    next_step VARCHAR(500),
    loss_reason VARCHAR(500),

    -- Ownership & Status
    owner_id UUID REFERENCES public.tenant_users(id),
    status VARCHAR(50) DEFAULT 'open', -- open, closed_won, closed_lost

    -- Metadata
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_tenant ON public.deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_deals_account ON public.deals(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON public.deals(tenant_id, close_date);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(tenant_id, status);
