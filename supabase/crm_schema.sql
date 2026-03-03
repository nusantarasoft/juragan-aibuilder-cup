-- ===========================================
-- CRM Schema: Accounts, Contacts, Leads
-- Extends existing individuals table
-- Run this in Supabase SQL Editor
-- ===========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ACCOUNTS (Business/Organization Entity)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50),
    type VARCHAR(50) DEFAULT 'prospect', -- customer, partner, vendor, prospect, other
    industry VARCHAR(100),

    -- Contact Info
    website TEXT,
    phone VARCHAR(50),
    fax VARCHAR(50),
    email VARCHAR(255),

    -- Addresses (JSONB: {street, city, state, postalCode, country})
    billing_address JSONB DEFAULT '{}',
    shipping_address JSONB DEFAULT '{}',

    -- Business Details
    annual_revenue NUMERIC(15,2),
    employee_count INTEGER,
    sic_code VARCHAR(20),
    ticker_symbol VARCHAR(20),
    ownership VARCHAR(50), -- public, private, subsidiary, government, other

    -- Hierarchy
    parent_account_id UUID REFERENCES public.accounts(id),

    -- Classification
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',

    -- Ownership & Status
    owner_id UUID REFERENCES public.tenant_users(id),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived
    rating VARCHAR(20), -- hot, warm, cold

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON public.accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.accounts(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON public.accounts(parent_account_id);

-- ===========================================
-- CONTACTS (Individual ↔ Account Junction)
-- Links a person to a company with role context
-- account_id is NULLABLE (contact without company)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Core Relations
    individual_id UUID NOT NULL REFERENCES public.individuals(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL, -- nullable

    -- Role at Company
    title VARCHAR(255),
    department VARCHAR(255),
    role VARCHAR(100), -- decision_maker, influencer, end_user, gatekeeper

    -- Contact-specific Info (may differ from individual's personal info)
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),

    -- Address
    mailing_address JSONB DEFAULT '{}',
    other_address JSONB DEFAULT '{}',

    -- Classification
    is_primary BOOLEAN DEFAULT false, -- primary contact for this account
    do_not_call BOOLEAN DEFAULT false,
    do_not_email BOOLEAN DEFAULT false,
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',

    -- Ownership & Status
    owner_id UUID REFERENCES public.tenant_users(id),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, individual_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_individual ON public.contacts(individual_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_id);

-- ===========================================
-- EXTEND INDIVIDUALS: Add lead_status
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'lead_status'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN lead_status VARCHAR(50);
        -- Values: null (not a lead), 'new', 'contacted', 'qualified', 'converted', 'lost'
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'lead_source'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN lead_source VARCHAR(100);
        -- Values: web, phone, referral, partner, campaign, social, other
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'company'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN company VARCHAR(255);
        -- Freeform company name before account is created
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_individuals_lead_status ON public.individuals(tenant_id, lead_status)
    WHERE lead_status IS NOT NULL;
