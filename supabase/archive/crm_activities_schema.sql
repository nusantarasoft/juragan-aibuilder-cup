-- ===========================================
-- CRM Activities & Notes Schema
-- Polymorphic: works for any entity type
-- ===========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ACTIVITIES (Calls, Emails, Meetings, Tasks)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Type & Subject
    activity_type VARCHAR(50) NOT NULL, -- call, email, meeting, task
    subject VARCHAR(500) NOT NULL,
    description TEXT,

    -- Polymorphic relation
    related_to_type VARCHAR(50) NOT NULL, -- individual, contact, account, deal
    related_to_id UUID NOT NULL,

    -- Scheduling
    due_date TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,

    -- Classification
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, completed, cancelled
    outcome VARCHAR(255), -- result of the activity

    -- Ownership
    owner_id UUID REFERENCES public.tenant_users(id),
    assigned_to UUID REFERENCES public.tenant_users(id),

    -- Metadata
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant ON public.crm_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_related ON public.crm_activities(related_to_type, related_to_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON public.crm_activities(tenant_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due ON public.crm_activities(tenant_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_status ON public.crm_activities(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_activities_owner ON public.crm_activities(owner_id);

-- ===========================================
-- NOTES (Free-text notes on any entity)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.crm_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Content
    body TEXT NOT NULL,
    title VARCHAR(255),

    -- Polymorphic relation
    related_to_type VARCHAR(50) NOT NULL,
    related_to_id UUID NOT NULL,

    -- Flags
    is_pinned BOOLEAN DEFAULT false,

    -- Ownership
    owner_id UUID REFERENCES public.tenant_users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_tenant ON public.crm_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_related ON public.crm_notes(related_to_type, related_to_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_pinned ON public.crm_notes(related_to_type, related_to_id, is_pinned) WHERE is_pinned = true;
