-- ===========================================
-- CRM Campaigns & Cases Schema
-- ===========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- CAMPAIGNS (Marketing)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(50), -- email, webinar, event, ad, social, other
    status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed, cancelled
    start_date DATE,
    end_date DATE,
    budget NUMERIC(15,2),
    actual_cost NUMERIC(15,2),
    expected_revenue NUMERIC(15,2),
    description TEXT,
    owner_id UUID REFERENCES public.tenant_users(id),
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON public.campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(tenant_id, status);

-- Campaign Members (junction)
CREATE TABLE IF NOT EXISTS public.campaign_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    individual_id UUID NOT NULL REFERENCES public.individuals(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'sent', -- sent, responded, converted
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, individual_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON public.campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_individual ON public.campaign_members(individual_id);

-- ===========================================
-- CASES (Support)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    case_number VARCHAR(50),
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new', -- new, working, escalated, closed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    origin VARCHAR(50), -- web, phone, email, chat
    type VARCHAR(50), -- question, problem, feature_request, incident
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    resolution TEXT,
    closed_at TIMESTAMPTZ,
    owner_id UUID REFERENCES public.tenant_users(id),
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_tenant ON public.cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON public.cases(tenant_id, priority);
CREATE INDEX IF NOT EXISTS idx_cases_contact ON public.cases(contact_id);
CREATE INDEX IF NOT EXISTS idx_cases_account ON public.cases(account_id);

-- Auto-generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.case_number := 'CS-' || LPAD(nextval('case_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS case_number_seq START 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_case_number') THEN
        CREATE TRIGGER trg_case_number
            BEFORE INSERT ON public.cases
            FOR EACH ROW
            WHEN (NEW.case_number IS NULL)
            EXECUTE FUNCTION generate_case_number();
    END IF;
END $$;
