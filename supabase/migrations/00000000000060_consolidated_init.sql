-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED INIT MIGRATION — Nusantarasoft Platform
-- All tables, indexes, policies, triggers, and seed data in dependency order.
-- Fully idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: SCHEMA GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: PERMISSIONS & MULTI-TENANT FOUNDATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individuals
CREATE TABLE IF NOT EXISTS public.individuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Personal Identity
    salutation VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    suffix VARCHAR(20),
    nickname VARCHAR(100),

    -- Demographics
    date_of_birth DATE,
    gender VARCHAR(20),
    nationality VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',

    -- Professional
    job_title VARCHAR(255),
    department VARCHAR(255),

    -- Social
    linkedin_url TEXT,
    twitter_handle VARCHAR(100),
    website TEXT,

    -- Classification
    individual_type VARCHAR(50) DEFAULT 'person',
    source VARCHAR(100),
    tags JSONB DEFAULT '[]',

    -- Media
    avatar_url TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'active',
    custom_fields JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_individuals_tenant ON public.individuals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_individuals_name ON public.individuals(tenant_id, last_name, first_name);

-- Profiles (Layer 1)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Roles (Layer 3)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    parent_role_id UUID REFERENCES public.roles(id),
    level INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Tenant Users
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID,

    -- Person identity
    individual_id UUID REFERENCES public.individuals(id),

    -- Permissions
    profile_id UUID REFERENCES public.profiles(id),
    role_id UUID REFERENCES public.roles(id),

    -- Organization
    employee_id VARCHAR(50),
    title VARCHAR(255),
    department VARCHAR(255),
    manager_id UUID REFERENCES public.tenant_users(id),

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_individual ON public.tenant_users(individual_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_profile ON public.tenant_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON public.tenant_users(role_id);

-- Add owner_id to individuals (deferred due to circular dependency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN owner_id UUID REFERENCES public.tenant_users(id);
    END IF;
END $$;

-- Profile Object Permissions
CREATE TABLE IF NOT EXISTS public.profile_object_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_view_all BOOLEAN DEFAULT false,
    can_modify_all BOOLEAN DEFAULT false,
    UNIQUE(profile_id, object_name)
);

-- Profile System Permissions
CREATE TABLE IF NOT EXISTS public.profile_system_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_key VARCHAR(150) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    UNIQUE(profile_id, permission_key)
);

-- Permission Sets (Layer 2)
CREATE TABLE IF NOT EXISTS public.permission_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.user_permission_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_user_id UUID NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_user_id, permission_set_id)
);

CREATE TABLE IF NOT EXISTS public.permission_set_object_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_view_all BOOLEAN DEFAULT false,
    can_modify_all BOOLEAN DEFAULT false,
    UNIQUE(permission_set_id, object_name)
);

CREATE TABLE IF NOT EXISTS public.permission_set_system_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
    permission_key VARCHAR(150) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    UNIQUE(permission_set_id, permission_key)
);

-- Role Hierarchy Paths
CREATE TABLE IF NOT EXISTS public.role_hierarchy_paths (
    ancestor_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ancestor_id, descendant_id)
);

-- Sharing Rules (Layer 4)
CREATE TABLE IF NOT EXISTS public.org_wide_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    internal_access VARCHAR(20) DEFAULT 'private',
    external_access VARCHAR(20) DEFAULT 'private',
    UNIQUE(tenant_id, object_name)
);

CREATE TABLE IF NOT EXISTS public.sharing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    object_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(20) NOT NULL,
    share_from_type VARCHAR(20),
    share_from_id UUID,
    share_to_type VARCHAR(20),
    share_to_id UUID,
    criteria JSONB,
    access_level VARCHAR(20) DEFAULT 'read',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public Groups
CREATE TABLE IF NOT EXISTS public.public_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.public_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.public_groups(id) ON DELETE CASCADE,
    member_type VARCHAR(20) NOT NULL,
    member_id UUID NOT NULL,
    UNIQUE(group_id, member_type, member_id)
);

-- Manual Record Sharing
CREATE TABLE IF NOT EXISTS public.record_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    shared_with_type VARCHAR(20) NOT NULL,
    shared_with_id UUID NOT NULL,
    access_level VARCHAR(20) DEFAULT 'read',
    shared_by UUID NOT NULL REFERENCES public.tenant_users(id),
    reason VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_shares_record ON public.record_shares(object_name, record_id);

-- Field-Level Security (Layer 5)
CREATE TABLE IF NOT EXISTS public.field_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT true,
    UNIQUE(profile_id, object_name, field_name)
);

CREATE TABLE IF NOT EXISTS public.permission_set_field_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT true,
    UNIQUE(permission_set_id, object_name, field_name)
);

-- Teams (Layer 6)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    tenant_user_id UUID NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    UNIQUE(team_id, tenant_user_id)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS public.permission_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES public.tenant_users(id),
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perm_audit_entity ON public.permission_audit_log(entity_type, entity_id);

-- RLS for permissions tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_set_object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_set_system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_hierarchy_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_wide_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_set_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'tenants', 'individuals', 'tenant_users', 'profiles', 'roles',
            'profile_object_permissions', 'profile_system_permissions',
            'permission_sets', 'user_permission_sets',
            'permission_set_object_permissions', 'permission_set_system_permissions',
            'role_hierarchy_paths', 'org_wide_defaults', 'sharing_rules',
            'public_groups', 'public_group_members', 'record_shares',
            'field_permissions', 'permission_set_field_permissions',
            'teams', 'team_members', 'permission_audit_log'
        ])
    LOOP
        EXECUTE format(
            'CREATE POLICY IF NOT EXISTS "service_full_access" ON public.%I FOR ALL USING (true)',
            tbl
        );
    END LOOP;
END $$;

-- Seed: Default Tenant + System Admin
INSERT INTO public.tenants (id, name, slug, subscription_plan) VALUES
    ('00000000-0000-0000-0000-000000000010', 'Default Organization', 'default', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.profiles (id, tenant_id, name, description, is_system) VALUES
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'System Administrator', 'Full access to all features', true),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'Standard User', 'Standard user with basic access', true),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', 'Read Only', 'View-only access', true)
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.roles (id, tenant_id, name, level, description) VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'CEO', 0, 'Chief Executive Officer - Top of hierarchy')
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.role_hierarchy_paths (ancestor_id, descendant_id, depth) VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', 0)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4: CMS CORE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Pages
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID,
    meta_title VARCHAR(255),
    meta_description TEXT,
    og_image VARCHAR(500),
    og_title VARCHAR(255),
    og_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

INSERT INTO public.pages (id, title, slug, status, content, meta_title) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Home Page', 'home', 'published', '[]', 'Welcome to Nusantarasoft'),
    ('00000000-0000-0000-0000-000000000002', 'About Us', 'about', 'published', '[]', 'About Our Company'),
    ('00000000-0000-0000-0000-000000000003', 'Contact', 'contact', 'draft', '[]', 'Contact Us'),
    ('00000000-0000-0000-0000-000000000004', 'Services', 'services', 'draft', '[]', 'Our Services')
ON CONFLICT (slug) DO NOTHING;

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    group_name VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.settings (key, value, group_name) VALUES
    ('site_name', '"Nusantarasoft CMS"', 'general'),
    ('site_description', '"A modern content management system"', 'general'),
    ('primary_color', '"#1890ff"', 'theme')
ON CONFLICT (key) DO NOTHING;

-- Blocks
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    thumbnail VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.blocks (name, category, description, content) VALUES
    ('Hero Section', 'layout', 'Full-width hero with title and CTA', '{"type": "hero", "props": {}}'),
    ('Text Block', 'content', 'Rich text content block', '{"type": "text", "props": {}}'),
    ('Image Gallery', 'media', 'Responsive image gallery', '{"type": "gallery", "props": {}}')
ON CONFLICT DO NOTHING;

-- CMS RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.blocks FOR SELECT USING (true);

CREATE POLICY "Allow service full access" ON public.pages FOR ALL USING (true);
CREATE POLICY "Allow service full access" ON public.settings FOR ALL USING (true);
CREATE POLICY "Allow service full access" ON public.blocks FOR ALL USING (true);

-- CMS Indexes
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);
CREATE INDEX IF NOT EXISTS idx_blocks_category ON public.blocks(category);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5: USER STARS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_stars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, path)
);

ALTER TABLE public.user_stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view stars"
ON public.user_stars FOR SELECT
USING (true);

CREATE POLICY "Public can insert stars"
ON public.user_stars FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can delete stars"
ON public.user_stars FOR DELETE
USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6: CRM MODULE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50),
    type VARCHAR(50) DEFAULT 'prospect',
    industry VARCHAR(100),

    -- Contact Info
    website TEXT,
    phone VARCHAR(50),
    fax VARCHAR(50),
    email VARCHAR(255),

    -- Addresses
    billing_address JSONB DEFAULT '{}',
    shipping_address JSONB DEFAULT '{}',

    -- Business Details
    annual_revenue NUMERIC(15,2),
    employee_count INTEGER,
    sic_code VARCHAR(20),
    ticker_symbol VARCHAR(20),
    ownership VARCHAR(50),

    -- Hierarchy
    parent_account_id UUID REFERENCES public.accounts(id),

    -- Classification
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',

    -- Ownership & Status
    owner_id UUID REFERENCES public.tenant_users(id),
    status VARCHAR(50) DEFAULT 'active',
    rating VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON public.accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.accounts(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON public.accounts(parent_account_id);

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Core Relations
    individual_id UUID NOT NULL REFERENCES public.individuals(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

    -- Role at Company
    title VARCHAR(255),
    department VARCHAR(255),
    role VARCHAR(100),

    -- Contact-specific Info
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),

    -- Address
    mailing_address JSONB DEFAULT '{}',
    other_address JSONB DEFAULT '{}',

    -- Classification
    is_primary BOOLEAN DEFAULT false,
    do_not_call BOOLEAN DEFAULT false,
    do_not_email BOOLEAN DEFAULT false,
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',

    -- Ownership & Status
    owner_id UUID REFERENCES public.tenant_users(id),
    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, individual_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_individual ON public.contacts(individual_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_id);

-- Extend Individuals for CRM lead fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'lead_status'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN lead_status VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'lead_source'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN lead_source VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'company'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN company VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN email VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN phone VARCHAR(50);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_individuals_lead_status ON public.individuals(tenant_id, lead_status)
    WHERE lead_status IS NOT NULL;

-- Deals
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
    probability INTEGER DEFAULT 10,
    close_date DATE,

    -- Relations
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

    -- Classification
    type VARCHAR(50),
    lead_source VARCHAR(100),
    next_step VARCHAR(500),
    loss_reason VARCHAR(500),

    -- Ownership & Status
    owner_id UUID REFERENCES public.tenant_users(id),
    status VARCHAR(50) DEFAULT 'open',

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

-- CRM Activities
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Type & Subject
    activity_type VARCHAR(50) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT,

    -- Polymorphic relation
    related_to_type VARCHAR(50) NOT NULL,
    related_to_id UUID NOT NULL,

    -- Scheduling
    due_date TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,

    -- Classification
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'open',
    outcome VARCHAR(255),

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

-- CRM Notes
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

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'planned',
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

-- Campaign Members
CREATE TABLE IF NOT EXISTS public.campaign_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    individual_id UUID NOT NULL REFERENCES public.individuals(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'sent',
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, individual_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON public.campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_individual ON public.campaign_members(individual_id);

-- Cases
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    case_number VARCHAR(50),
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(20) DEFAULT 'medium',
    origin VARCHAR(50),
    type VARCHAR(50),
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

-- Case number auto-generation
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

-- Products
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

-- Quotes
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quote_number VARCHAR(50),
    name VARCHAR(500) NOT NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
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

-- Quote Items
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

-- Quote number auto-generation
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7: INVENTORY / WAREHOUSE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Warehouses
CREATE TABLE IF NOT EXISTS public.inv_warehouses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    code          TEXT NOT NULL,
    name          TEXT NOT NULL,
    warehouse_type TEXT NOT NULL DEFAULT 'general',
    address       TEXT,
    city          TEXT,
    country       TEXT DEFAULT 'Indonesia',
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    total_capacity INTEGER DEFAULT 0,
    used_capacity  INTEGER DEFAULT 0,
    manager       TEXT,
    phone         TEXT,
    email         TEXT,
    operating_hours TEXT,
    tags          JSONB DEFAULT '[]',
    notes         TEXT,
    status        TEXT NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_warehouses_tenant ON public.inv_warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_warehouses_status ON public.inv_warehouses(status);

-- Zones
CREATE TABLE IF NOT EXISTS public.inv_zones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id  UUID NOT NULL REFERENCES public.inv_warehouses(id) ON DELETE CASCADE,
    code          TEXT NOT NULL,
    name          TEXT NOT NULL,
    zone_type     TEXT NOT NULL DEFAULT 'storage',
    description   TEXT,
    capacity      INTEGER DEFAULT 0,
    temperature_min DOUBLE PRECISION,
    temperature_max DOUBLE PRECISION,
    is_restricted BOOLEAN DEFAULT FALSE,
    sort_order    INTEGER DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_zones_warehouse ON public.inv_zones(warehouse_id);

-- Bins
CREATE TABLE IF NOT EXISTS public.inv_bins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id       UUID NOT NULL REFERENCES public.inv_zones(id) ON DELETE CASCADE,
    code          TEXT NOT NULL,
    aisle         TEXT,
    rack          TEXT,
    level         TEXT,
    position      TEXT,
    bin_type      TEXT DEFAULT 'standard',
    max_weight    DOUBLE PRECISION,
    max_volume    DOUBLE PRECISION,
    current_item_count INTEGER DEFAULT 0,
    is_occupied   BOOLEAN DEFAULT FALSE,
    barcode       TEXT,
    sort_order    INTEGER DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'available',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_bins_zone ON public.inv_bins(zone_id);
CREATE INDEX IF NOT EXISTS idx_inv_bins_status ON public.inv_bins(status);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS public.inv_stock_transfers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         TEXT NOT NULL DEFAULT 'default',
    transfer_number   TEXT NOT NULL,
    from_warehouse_id UUID REFERENCES public.inv_warehouses(id),
    to_warehouse_id   UUID REFERENCES public.inv_warehouses(id),
    from_bin_id       UUID REFERENCES public.inv_bins(id),
    to_bin_id         UUID REFERENCES public.inv_bins(id),
    item_id           UUID,
    item_name         TEXT,
    quantity          DOUBLE PRECISION NOT NULL DEFAULT 0,
    uom               TEXT DEFAULT 'pcs',
    reason            TEXT,
    requested_by      TEXT,
    approved_by       TEXT,
    requested_at      TIMESTAMPTZ DEFAULT now(),
    approved_at       TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    notes             TEXT,
    status            TEXT NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_transfers_tenant ON public.inv_stock_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_status ON public.inv_stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_from ON public.inv_stock_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_to ON public.inv_stock_transfers(to_warehouse_id);

-- Warehouse RLS
ALTER TABLE public.inv_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_warehouses_all" ON public.inv_warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inv_zones_all" ON public.inv_zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inv_bins_all" ON public.inv_bins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inv_stock_transfers_all" ON public.inv_stock_transfers FOR ALL USING (true) WITH CHECK (true);

-- Warehouse Grants
GRANT ALL ON public.inv_warehouses TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.inv_zones TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.inv_bins TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.inv_stock_transfers TO anon, authenticated, service_role, authenticator;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 8: STOCK OPNAME
-- ═══════════════════════════════════════════════════════════════════════════════

-- Opname Sessions
CREATE TABLE IF NOT EXISTS inv_opname_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    session_code TEXT NOT NULL,
    title TEXT NOT NULL,
    warehouse_id UUID REFERENCES inv_warehouses(id) ON DELETE SET NULL,
    warehouse_name TEXT,
    counted_by TEXT,
    reviewed_by TEXT,
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_items INT DEFAULT 0,
    items_counted INT DEFAULT 0,
    total_variance_qty NUMERIC(14,2) DEFAULT 0,
    total_variance_value NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','counting','review','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opname_sessions_tenant ON inv_opname_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opname_sessions_status ON inv_opname_sessions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_opname_sessions_code ON inv_opname_sessions(tenant_id, session_code);

ALTER TABLE inv_opname_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_opname_sessions_all" ON inv_opname_sessions FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON inv_opname_sessions TO anon, authenticated, service_role, authenticator;

-- Opname Lines
CREATE TABLE IF NOT EXISTS inv_opname_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES inv_opname_sessions(id) ON DELETE CASCADE,
    item_id UUID,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    zone_name TEXT,
    bin_code TEXT,
    uom TEXT DEFAULT 'pcs',
    system_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    actual_qty NUMERIC(12,2),
    variance_qty NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE(actual_qty, 0) - system_qty) STORED,
    unit_cost NUMERIC(14,2) DEFAULT 0,
    variance_value NUMERIC(14,2) GENERATED ALWAYS AS ((COALESCE(actual_qty, 0) - system_qty) * COALESCE(unit_cost, 0)) STORED,
    counted_at TIMESTAMPTZ,
    counted_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','counted','verified','discrepancy')),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opname_lines_session ON inv_opname_lines(session_id);

ALTER TABLE inv_opname_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_opname_lines_all" ON inv_opname_lines FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON inv_opname_lines TO anon, authenticated, service_role, authenticator;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 9: MANUFACTURING
-- ═══════════════════════════════════════════════════════════════════════════════

-- BOMs
CREATE TABLE IF NOT EXISTS mfg_boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    product_name TEXT,
    product_sku TEXT,
    description TEXT,
    uom TEXT DEFAULT 'unit',
    yield_qty NUMERIC(12,2) DEFAULT 1,
    labor_hours NUMERIC(8,2) DEFAULT 0,
    labor_cost NUMERIC(14,2) DEFAULT 0,
    overhead_cost NUMERIC(14,2) DEFAULT 0,
    total_material_cost NUMERIC(14,2) DEFAULT 0,
    total_cost NUMERIC(14,2) DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','revision','obsolete')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfg_boms_tenant ON mfg_boms(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mfg_boms_code ON mfg_boms(tenant_id, code);

ALTER TABLE mfg_boms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfg_boms_all" ON mfg_boms FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON mfg_boms TO anon, authenticated, service_role, authenticator;

-- BOM Lines
CREATE TABLE IF NOT EXISTS mfg_bom_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES mfg_boms(id) ON DELETE CASCADE,
    item_id UUID,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    uom TEXT DEFAULT 'pcs',
    unit_cost NUMERIC(14,2) DEFAULT 0,
    total_cost NUMERIC(14,2) DEFAULT 0,
    scrap_pct NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfg_bom_lines_bom ON mfg_bom_lines(bom_id);

ALTER TABLE mfg_bom_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfg_bom_lines_all" ON mfg_bom_lines FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON mfg_bom_lines TO anon, authenticated, service_role, authenticator;

-- Work Orders
CREATE TABLE IF NOT EXISTS mfg_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    wo_number TEXT NOT NULL,
    bom_id UUID REFERENCES mfg_boms(id) ON DELETE SET NULL,
    bom_name TEXT,
    warehouse_id UUID REFERENCES inv_warehouses(id) ON DELETE SET NULL,
    warehouse_name TEXT,
    planned_qty NUMERIC(12,2) NOT NULL DEFAULT 1,
    completed_qty NUMERIC(12,2) DEFAULT 0,
    uom TEXT DEFAULT 'unit',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    assigned_to TEXT,
    planned_start DATE,
    planned_end DATE,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    estimated_cost NUMERIC(14,2) DEFAULT 0,
    actual_cost NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','planned','in_progress','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfg_wo_tenant ON mfg_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_status ON mfg_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_bom ON mfg_work_orders(bom_id);

ALTER TABLE mfg_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfg_work_orders_all" ON mfg_work_orders FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON mfg_work_orders TO anon, authenticated, service_role, authenticator;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 10: E-COMMERCE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Customers
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

-- Orders
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

-- Order Items
CREATE TABLE IF NOT EXISTS ecom_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES ecom_orders(id) ON DELETE CASCADE,
    item_id UUID,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    fulfillment_type TEXT DEFAULT 'physical' CHECK (fulfillment_type IN ('physical','ticket','scheduled','rental')),
    fulfillment_ref UUID,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    variant_info JSONB,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','shipped','delivered','cancelled','returned')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store Settings
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

-- E-Commerce RLS
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 11: BOOKING & TICKETING
-- ═══════════════════════════════════════════════════════════════════════════════

-- Schedules
CREATE TABLE IF NOT EXISTS booking_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID,
    schedule_code TEXT NOT NULL,
    route_name TEXT NOT NULL,
    origin TEXT,
    destination TEXT,
    departure_time TIME,
    arrival_time TIME,
    duration_minutes INT,
    recurrence_rule TEXT,
    capacity INT DEFAULT 100,
    capacity_per_class JSONB DEFAULT '{}',
    vehicle_name TEXT,
    vessel_type TEXT,
    price_economy NUMERIC(14,2) DEFAULT 0,
    price_business NUMERIC(14,2) DEFAULT 0,
    price_vip NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_schedules_tenant ON booking_schedules(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_schedules_code ON booking_schedules(tenant_id, schedule_code);

ALTER TABLE booking_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_schedules_all" ON booking_schedules FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_schedules TO anon, authenticated, service_role, authenticator;

-- Occurrences
CREATE TABLE IF NOT EXISTS booking_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES booking_schedules(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL,
    departure_time TIME,
    total_capacity INT DEFAULT 100,
    booked_count INT DEFAULT 0,
    checked_in_count INT DEFAULT 0,
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','boarding','departed','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_occurrences_schedule ON booking_occurrences(schedule_id);
CREATE INDEX IF NOT EXISTS idx_booking_occurrences_date ON booking_occurrences(departure_date);

ALTER TABLE booking_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_occurrences_all" ON booking_occurrences FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_occurrences TO anon, authenticated, service_role, authenticator;

-- Seats
CREATE TABLE IF NOT EXISTS booking_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES booking_schedules(id) ON DELETE CASCADE,
    section TEXT DEFAULT 'Main',
    seat_row TEXT,
    seat_number TEXT NOT NULL,
    class TEXT DEFAULT 'economy' CHECK (class IN ('economy','business','vip')),
    price_modifier NUMERIC(5,2) DEFAULT 1.0,
    status TEXT DEFAULT 'available' CHECK (status IN ('available','reserved','booked','blocked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_seats_schedule ON booking_seats(schedule_id);

ALTER TABLE booking_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_seats_all" ON booking_seats FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_seats TO anon, authenticated, service_role, authenticator;

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    booking_code TEXT NOT NULL,
    schedule_id UUID REFERENCES booking_schedules(id) ON DELETE SET NULL,
    occurrence_id UUID REFERENCES booking_occurrences(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    passenger_count INT DEFAULT 1,
    class TEXT DEFAULT 'economy',
    total_amount NUMERIC(14,2) DEFAULT 0,
    paid_amount NUMERIC(14,2) DEFAULT 0,
    qr_code TEXT,
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','completed','cancelled','no_show')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_occurrence ON bookings(occurrence_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_code ON bookings(tenant_id, booking_code);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_all" ON bookings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON bookings TO anon, authenticated, service_role, authenticator;

-- Passengers
CREATE TABLE IF NOT EXISTS booking_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    id_number TEXT,
    nationality TEXT,
    seat_id UUID REFERENCES booking_seats(id) ON DELETE SET NULL,
    seat_label TEXT,
    class TEXT DEFAULT 'economy',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking ON booking_passengers(booking_id);

ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_passengers_all" ON booking_passengers FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_passengers TO anon, authenticated, service_role, authenticator;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 12: RENTAL
-- ═══════════════════════════════════════════════════════════════════════════════

-- Rental Assets
CREATE TABLE IF NOT EXISTS rental_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID,
    asset_code TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    serial_number TEXT,
    category TEXT,
    condition TEXT DEFAULT 'excellent' CHECK (condition IN ('excellent','good','fair','poor')),
    purchase_date DATE,
    purchase_cost NUMERIC(14,2),
    current_location TEXT,
    daily_rate NUMERIC(14,2) DEFAULT 0,
    deposit_amount NUMERIC(14,2) DEFAULT 0,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    total_rentals INT DEFAULT 0,
    total_revenue NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available','rented','maintenance','retired')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_assets_tenant ON rental_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_assets_status ON rental_assets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_assets_code ON rental_assets(tenant_id, asset_code);

ALTER TABLE rental_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_assets_all" ON rental_assets FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON rental_assets TO anon, authenticated, service_role, authenticator;

-- Rental Contracts
CREATE TABLE IF NOT EXISTS rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    contract_code TEXT NOT NULL,
    asset_id UUID NOT NULL REFERENCES rental_assets(id) ON DELETE CASCADE,
    asset_name TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_id_number TEXT,
    checkout_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    daily_rate NUMERIC(14,2) DEFAULT 0,
    deposit_amount NUMERIC(14,2) DEFAULT 0,
    deposit_returned NUMERIC(14,2) DEFAULT 0,
    rental_days INT GENERATED ALWAYS AS (
        CASE WHEN actual_return_date IS NOT NULL
            THEN GREATEST(1, actual_return_date - checkout_date)
            ELSE GREATEST(1, expected_return_date - checkout_date)
        END
    ) STORED,
    subtotal NUMERIC(14,2) DEFAULT 0,
    late_fee NUMERIC(14,2) DEFAULT 0,
    damage_fee NUMERIC(14,2) DEFAULT 0,
    total_charge NUMERIC(14,2) DEFAULT 0,
    checkout_condition TEXT,
    return_condition TEXT,
    checkout_notes TEXT,
    return_notes TEXT,
    returned_by TEXT,
    approved_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','returned','overdue','lost')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_contracts_tenant ON rental_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_asset ON rental_contracts(asset_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON rental_contracts(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_contracts_code ON rental_contracts(tenant_id, contract_code);

ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_contracts_all" ON rental_contracts FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON rental_contracts TO anon, authenticated, service_role, authenticator;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 13: ITSM (ITIL v4)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop incomplete tables from partial migration
DROP TABLE IF EXISTS itsm_approvals CASCADE;
DROP TABLE IF EXISTS itsm_service_portfolio CASCADE;

-- Categories
CREATE TABLE IF NOT EXISTS itsm_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES itsm_categories(id),
  icon TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA Policies
CREATE TABLE IF NOT EXISTS itsm_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  response_time_minutes INT NOT NULL,
  resolution_time_minutes INT NOT NULL,
  escalation_after_minutes INT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents / Tickets
CREATE TABLE IF NOT EXISTS itsm_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  impact TEXT DEFAULT 'medium',
  urgency TEXT DEFAULT 'medium',
  contact_id UUID,
  account_id UUID,
  individual_id UUID,
  pm_stakeholder_id UUID,
  reporter_name TEXT,
  reporter_email TEXT,
  assigned_to TEXT,
  assigned_group TEXT,
  sla_policy_id UUID REFERENCES itsm_sla_policies(id),
  sla_response_due TIMESTAMPTZ,
  sla_resolution_due TIMESTAMPTZ,
  sla_response_met BOOLEAN,
  sla_resolution_met BOOLEAN,
  channel TEXT DEFAULT 'portal',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Comments
CREATE TABLE IF NOT EXISTS itsm_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES itsm_tickets(id) ON DELETE CASCADE,
  author TEXT DEFAULT 'System',
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Portfolio
CREATE TABLE IF NOT EXISTS itsm_service_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  service_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  business_owner TEXT,
  technical_owner TEXT,
  lifecycle_status TEXT DEFAULT 'pipeline',
  service_type TEXT DEFAULT 'business',
  criticality TEXT DEFAULT 'medium',
  cost_center TEXT,
  budget_allocated NUMERIC(12,2),
  sla_target TEXT,
  dependencies TEXT,
  risks TEXT,
  notes TEXT,
  published_to_catalog BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Catalog
CREATE TABLE IF NOT EXISTS itsm_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  portfolio_service_id UUID REFERENCES itsm_service_portfolio(id),
  catalog_code TEXT NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  icon TEXT,
  estimated_delivery TEXT,
  cost TEXT,
  approval_required BOOLEAN DEFAULT FALSE,
  approval_type TEXT DEFAULT 'simple',
  fulfillment_group TEXT,
  status TEXT DEFAULT 'active',
  request_count INT DEFAULT 0,
  form_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Requests
CREATE TABLE IF NOT EXISTS itsm_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  catalog_item_id UUID REFERENCES itsm_service_catalog(id),
  category_id UUID REFERENCES itsm_categories(id),
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'submitted',
  requested_for TEXT,
  requester_name TEXT,
  requester_email TEXT,
  contact_id UUID,
  account_id UUID,
  fulfillment_group TEXT,
  fulfilled_by TEXT,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,
  sla_policy_id UUID REFERENCES itsm_sla_policies(id),
  sla_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Problems
CREATE TABLE IF NOT EXISTS itsm_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  problem_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  impact TEXT DEFAULT 'medium',
  root_cause TEXT,
  workaround TEXT,
  is_known_error BOOLEAN DEFAULT FALSE,
  knowledge_article_id UUID,
  assigned_to TEXT,
  assigned_group TEXT,
  reporter_name TEXT,
  reporter_email TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Problem ↔ Incident Links
CREATE TABLE IF NOT EXISTS itsm_problem_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES itsm_problems(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES itsm_tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id, incident_id)
);

-- Change Requests
CREATE TABLE IF NOT EXISTS itsm_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  change_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  change_type TEXT DEFAULT 'normal',
  priority TEXT DEFAULT 'medium',
  risk_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft',
  impact TEXT DEFAULT 'medium',
  implementation_plan TEXT,
  rollback_plan TEXT,
  test_plan TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  cab_required BOOLEAN DEFAULT TRUE,
  cab_decision TEXT,
  cab_notes TEXT,
  cab_date TIMESTAMPTZ,
  requested_by TEXT,
  assigned_to TEXT,
  assigned_group TEXT,
  related_incident_id UUID REFERENCES itsm_tickets(id),
  related_problem_id UUID REFERENCES itsm_problems(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Articles
CREATE TABLE IF NOT EXISTS itsm_knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  article_number TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  article_type TEXT DEFAULT 'solution',
  status TEXT DEFAULT 'draft',
  related_problem_id UUID REFERENCES itsm_problems(id),
  author TEXT,
  tags TEXT[] DEFAULT '{}',
  views INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals
CREATE TABLE IF NOT EXISTS itsm_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  approval_level INT DEFAULT 1,
  approver_name TEXT NOT NULL,
  approver_email TEXT,
  status TEXT DEFAULT 'pending',
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 14: PROJECT MANAGEMENT (PMBOK)
-- tenant_id is TEXT NOT NULL (no FK to tenants)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Projects
CREATE TABLE IF NOT EXISTS pm_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    project_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(50) DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    spent DECIMAL(15, 2) DEFAULT 0,
    owner_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_tenant ON pm_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_status ON pm_projects(status);

-- Sprints
CREATE TABLE IF NOT EXISTS pm_sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_sprints_project ON pm_sprints(project_id);

-- Tasks
CREATE TABLE IF NOT EXISTS pm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES pm_sprints(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    type VARCHAR(50) DEFAULT 'task',
    assignee_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    logged_hours DECIMAL(10, 2) DEFAULT 0,
    due_date DATE,
    tags JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_sprint ON pm_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);

-- Time Logs
CREATE TABLE IF NOT EXISTS pm_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    hours DECIMAL(10, 2) NOT NULL,
    log_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_time_logs_task ON pm_time_logs(task_id);

-- Auto-numbering Trigger for Projects
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(project_number, '\D', '', 'g'), '')::INT), 0) + 1
    INTO next_num
    FROM pm_projects
    WHERE tenant_id = NEW.tenant_id AND project_number LIKE 'PRJ-%';

    NEW.project_number := 'PRJ-' || LPAD(next_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_project_number ON pm_projects;
CREATE TRIGGER trigger_generate_project_number
BEFORE INSERT ON pm_projects
FOR EACH ROW
WHEN (NEW.project_number IS NULL)
EXECUTE FUNCTION generate_project_number();

-- PMBOK 6 Extensions
ALTER TABLE IF EXISTS pm_projects
ADD COLUMN IF NOT EXISTS methodology VARCHAR(50) DEFAULT 'hybrid',
ADD COLUMN IF NOT EXISTS pmbok_scope_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_schedule_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_cost_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_quality_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_resource_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_comms_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_risk_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_procurement_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_stakeholder_enabled BOOLEAN DEFAULT FALSE;

-- Project Charters
CREATE TABLE IF NOT EXISTS pm_project_charters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    purpose TEXT,
    objectives TEXT,
    high_level_requirements TEXT,
    high_level_risks TEXT,
    summary_milestone_schedule TEXT,
    preapproved_financial_resources TEXT,
    key_stakeholders TEXT,
    project_approval_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_charters_project ON pm_project_charters(project_id);

-- Risk Registers
CREATE TABLE IF NOT EXISTS pm_risk_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    risk_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    probability INT DEFAULT 1,
    impact INT DEFAULT 1,
    risk_score INT GENERATED ALWAYS AS (probability * impact) STORED,
    mitigation_strategy TEXT,
    contingency_plan TEXT,
    status VARCHAR(50) DEFAULT 'identified',
    owner_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_risk_registers_project ON pm_risk_registers(project_id);

-- Earned Value Management
CREATE TABLE IF NOT EXISTS pm_earned_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    planned_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    earned_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    actual_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    schedule_variance DECIMAL(15, 2) GENERATED ALWAYS AS (earned_value - planned_value) STORED,
    cost_variance DECIMAL(15, 2) GENERATED ALWAYS AS (earned_value - actual_cost) STORED,
    schedule_performance_index DECIMAL(15, 4),
    cost_performance_index DECIMAL(15, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_earned_values_project ON pm_earned_values(project_id);

-- V2: Additional PMBOK knowledge areas
ALTER TABLE IF EXISTS pm_projects
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'initiating',
ADD COLUMN IF NOT EXISTS percent_complete NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_at_completion NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS estimate_at_completion NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS estimate_to_complete NUMERIC(15,2);

-- Scope Statements
CREATE TABLE IF NOT EXISTS pm_scope_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    project_objectives TEXT,
    product_scope_description TEXT,
    deliverables TEXT,
    acceptance_criteria TEXT,
    exclusions TEXT,
    constraints TEXT,
    assumptions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_scope_project ON pm_scope_statements(project_id);

-- WBS Items
CREATE TABLE IF NOT EXISTS pm_wbs_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    parent_id UUID REFERENCES pm_wbs_items(id) ON DELETE CASCADE,
    wbs_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to VARCHAR(255),
    estimated_cost NUMERIC(15,2),
    actual_cost NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_wbs_project ON pm_wbs_items(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_wbs_parent ON pm_wbs_items(parent_id);

-- Requirements
CREATE TABLE IF NOT EXISTS pm_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    requirement_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    source VARCHAR(255),
    wbs_item_id UUID REFERENCES pm_wbs_items(id) ON DELETE SET NULL,
    test_case TEXT,
    verification_method VARCHAR(100),
    status VARCHAR(50) DEFAULT 'identified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_requirements_project ON pm_requirements(project_id);

-- Milestones
CREATE TABLE IF NOT EXISTS pm_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    completed_date DATE,
    percent_complete NUMERIC(5,2) DEFAULT 0,
    is_critical BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_milestones_project ON pm_milestones(project_id);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS pm_task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    predecessor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(10) DEFAULT 'FS',
    lag_days INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(predecessor_id, successor_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_deps_project ON pm_task_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_deps_predecessor ON pm_task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_pm_deps_successor ON pm_task_dependencies(successor_id);

-- Quality Metrics
CREATE TABLE IF NOT EXISTS pm_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    target_value NUMERIC(15,4),
    actual_value NUMERIC(15,4),
    tolerance_lower NUMERIC(15,4),
    tolerance_upper NUMERIC(15,4),
    measurement_method TEXT,
    frequency VARCHAR(50),
    status VARCHAR(50) DEFAULT 'on_track',
    last_measured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_metrics_project ON pm_quality_metrics(project_id);

-- Quality Checklists
CREATE TABLE IF NOT EXISTS pm_quality_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    checklist_name VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable VARCHAR(255),
    items JSONB DEFAULT '[]'::jsonb,
    inspector VARCHAR(255),
    inspection_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_checklists_project ON pm_quality_checklists(project_id);

-- Quality Inspections
CREATE TABLE IF NOT EXISTS pm_quality_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    inspection_type VARCHAR(100),
    deliverable VARCHAR(255),
    inspector VARCHAR(255),
    inspection_date DATE,
    findings TEXT,
    corrective_actions TEXT,
    result VARCHAR(50) DEFAULT 'pending',
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_inspections_project ON pm_quality_inspections(project_id);

-- Resource Plans
CREATE TABLE IF NOT EXISTS pm_resource_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    resource_type VARCHAR(50) DEFAULT 'human',
    allocation_percent NUMERIC(5,2) DEFAULT 100,
    hourly_rate NUMERIC(10,2),
    start_date DATE,
    end_date DATE,
    availability_hours NUMERIC(10,2),
    planned_hours NUMERIC(10,2),
    actual_hours NUMERIC(10,2),
    skills TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_resource_plans_project ON pm_resource_plans(project_id);

-- RACI Matrix
CREATE TABLE IF NOT EXISTS pm_raci_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    deliverable VARCHAR(255) NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    role_type VARCHAR(1) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_raci_project ON pm_raci_matrix(project_id);

-- Communication Plans
CREATE TABLE IF NOT EXISTS pm_comm_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    communication_item VARCHAR(255) NOT NULL,
    target_audience VARCHAR(255),
    frequency VARCHAR(50),
    method VARCHAR(100),
    responsible_person VARCHAR(255),
    key_message TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_comm_plans_project ON pm_comm_plans(project_id);

-- Status Reports
CREATE TABLE IF NOT EXISTS pm_status_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    report_date DATE NOT NULL,
    report_period VARCHAR(100),
    overall_health VARCHAR(50) DEFAULT 'green',
    schedule_health VARCHAR(50) DEFAULT 'green',
    cost_health VARCHAR(50) DEFAULT 'green',
    scope_health VARCHAR(50) DEFAULT 'green',
    accomplishments TEXT,
    planned_activities TEXT,
    issues_and_risks TEXT,
    decisions_needed TEXT,
    key_metrics TEXT,
    prepared_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_status_reports_project ON pm_status_reports(project_id);

-- Meeting Minutes
CREATE TABLE IF NOT EXISTS pm_meeting_minutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    meeting_type VARCHAR(100),
    meeting_date TIMESTAMPTZ NOT NULL,
    title VARCHAR(255) NOT NULL,
    attendees TEXT,
    agenda TEXT,
    discussion TEXT,
    decisions TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    next_meeting_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_meeting_minutes_project ON pm_meeting_minutes(project_id);

-- Procurement Links
CREATE TABLE IF NOT EXISTS pm_procurement_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT NOT NULL,
    contract_type VARCHAR(50),
    budget_allocated NUMERIC(15,2),
    description TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_procurement_links_project ON pm_procurement_links(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_procurement_links_entity ON pm_procurement_links(entity_type, entity_id);

-- Stakeholders
CREATE TABLE IF NOT EXISTS pm_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    organization VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    interest_level INT DEFAULT 3,
    power_level INT DEFAULT 3,
    current_engagement VARCHAR(50),
    desired_engagement VARCHAR(50),
    communication_needs TEXT,
    influence_strategy TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_stakeholders_project ON pm_stakeholders(project_id);

-- Change Requests (PM)
CREATE TABLE IF NOT EXISTS pm_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    change_number VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT,
    impact_scope TEXT,
    impact_schedule TEXT,
    impact_cost TEXT,
    impact_quality TEXT,
    requested_by VARCHAR(255),
    requested_date DATE,
    reviewed_by VARCHAR(255),
    decision VARCHAR(50) DEFAULT 'pending',
    decision_date DATE,
    decision_notes TEXT,
    implementation_notes TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_change_requests_project ON pm_change_requests(project_id);

-- Lessons Learned
CREATE TABLE IF NOT EXISTS pm_lessons_learned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    category VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    situation TEXT,
    impact TEXT,
    lesson TEXT,
    recommendation TEXT,
    submitted_by VARCHAR(255),
    submitted_date DATE,
    phase VARCHAR(50),
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_lessons_learned_project ON pm_lessons_learned(project_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 15: MEDIA (Extended)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Media (extended version with s3_key, checksum, thumbnail_path, bucket_name)
CREATE TABLE IF NOT EXISTS media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename      TEXT NOT NULL,
    original_name TEXT,
    url           TEXT,
    s3_key        TEXT,
    mime_type     TEXT,
    size_bytes    BIGINT DEFAULT 0,
    alt_text      TEXT,
    uploaded_by   TEXT,
    bucket_name   TEXT DEFAULT 'cms-media',
    checksum      TEXT,
    thumbnail_path TEXT,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_bucket     ON media (bucket_name);
CREATE INDEX IF NOT EXISTS idx_media_s3_key     ON media (s3_key);
CREATE INDEX IF NOT EXISTS idx_media_mime_type   ON media (mime_type);
CREATE INDEX IF NOT EXISTS idx_media_checksum    ON media (checksum);
CREATE INDEX IF NOT EXISTS idx_media_created     ON media (created_at DESC);

-- Media Embeddings
CREATE TABLE IF NOT EXISTS media_embeddings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    embedding  vector(768),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (media_id)
);

CREATE INDEX IF NOT EXISTS idx_media_embeddings_media ON media_embeddings (media_id);

-- Media Annotations
CREATE TABLE IF NOT EXISTS media_annotations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id       UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    ls_task_id     INTEGER NOT NULL,
    ls_project_id  INTEGER,
    annotations    JSONB DEFAULT '[]'::jsonb,
    predictions    JSONB DEFAULT '[]'::jsonb,
    status         TEXT DEFAULT 'pending',
    annotated_by   TEXT,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (media_id, ls_task_id)
);

CREATE INDEX IF NOT EXISTS idx_media_annotations_task ON media_annotations (ls_task_id);
CREATE INDEX IF NOT EXISTS idx_media_annotations_media ON media_annotations (media_id);

-- Media RLS
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_media"
    ON media FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_media_embeddings"
    ON media_embeddings FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_media_annotations"
    ON media_annotations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "anon_read_media"
    ON media FOR SELECT
    USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 16: FACILITY MANAGEMENT (DCIM, BMS, SCADA, BIM)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── DCIM ──────────────────────────────────────────────────────────────────────

-- DCIM Sites
CREATE TABLE IF NOT EXISTS dcim_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    tier_level TEXT,
    total_area_sqm DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Buildings
CREATE TABLE IF NOT EXISTS dcim_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    site_id UUID REFERENCES dcim_sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    floors INT,
    total_area_sqm DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Rooms
CREATE TABLE IF NOT EXISTS dcim_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    building_id UUID REFERENCES dcim_buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    floor TEXT,
    room_type TEXT,
    total_area_sqm DOUBLE PRECISION,
    max_power_kw DOUBLE PRECISION,
    max_cooling_kw DOUBLE PRECISION,
    raised_floor_height_cm DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    layout_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Pods (from dcim_pods_and_remote migration)
CREATE TABLE IF NOT EXISTS dcim_pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dcim_pods_room_id ON dcim_pods(room_id);

-- DCIM Rows
CREATE TABLE IF NOT EXISTS dcim_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    orientation TEXT,
    row_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add pod_id to dcim_rows
ALTER TABLE dcim_rows ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES dcim_pods(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_dcim_rows_pod_id ON dcim_rows(pod_id);

-- DCIM Racks
CREATE TABLE IF NOT EXISTS dcim_racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    row_id UUID REFERENCES dcim_rows(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    total_u INT DEFAULT 42,
    width_mm INT,
    depth_mm INT,
    max_weight_kg DOUBLE PRECISION,
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    position_z DOUBLE PRECISION,
    orientation TEXT,
    has_front_door BOOLEAN DEFAULT true,
    has_rear_door BOOLEAN DEFAULT true,
    power_feed_a TEXT,
    power_feed_b TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add pod_id to dcim_racks
ALTER TABLE dcim_racks ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES dcim_pods(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_dcim_racks_pod_id ON dcim_racks(pod_id);

-- DCIM Device Types
CREATE TABLE IF NOT EXISTS dcim_device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    manufacturer TEXT,
    model TEXT,
    category TEXT,
    u_height INT DEFAULT 1,
    is_full_depth BOOLEAN DEFAULT true,
    max_power_watts INT,
    weight_kg DOUBLE PRECISION,
    front_image_url TEXT,
    rear_image_url TEXT,
    data_sheet_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Devices
CREATE TABLE IF NOT EXISTS dcim_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    device_type_id UUID REFERENCES dcim_device_types(id) ON DELETE RESTRICT,
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    asset_tag TEXT,
    serial_number TEXT,
    position_u INT,
    position_face TEXT DEFAULT 'front',
    hostname TEXT,
    primary_ip TEXT,
    os_version TEXT,
    firmware_version TEXT,
    status TEXT DEFAULT 'active',
    lifecycle_stage TEXT DEFAULT 'active',
    warranty_start DATE,
    warranty_end DATE,
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    assigned_to TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add management/remote access fields to dcim_devices
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS management_ip TEXT;
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS management_url TEXT;
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS management_protocol TEXT;
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS remote_credentials_id UUID;

-- DCIM Rack Units
CREATE TABLE IF NOT EXISTS dcim_rack_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE CASCADE,
    u_position INT NOT NULL,
    device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rack_id, u_position)
);

-- DCIM Power Feeds
CREATE TABLE IF NOT EXISTS dcim_power_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    feed_type TEXT,
    parent_feed_id UUID REFERENCES dcim_power_feeds(id) ON DELETE SET NULL,
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE SET NULL,
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE SET NULL,
    rated_capacity_kw DOUBLE PRECISION,
    voltage INT,
    phase_count INT DEFAULT 1,
    amperage INT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Power Ports
CREATE TABLE IF NOT EXISTS dcim_power_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    power_feed_id UUID REFERENCES dcim_power_feeds(id) ON DELETE CASCADE,
    device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    port_name TEXT NOT NULL,
    port_type TEXT DEFAULT 'output',
    allocated_watts INT,
    measured_watts INT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Power Readings
CREATE TABLE IF NOT EXISTS dcim_power_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    power_feed_id UUID REFERENCES dcim_power_feeds(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    voltage_v DOUBLE PRECISION,
    current_a DOUBLE PRECISION,
    power_kw DOUBLE PRECISION,
    power_factor DOUBLE PRECISION,
    energy_kwh DOUBLE PRECISION,
    frequency_hz DOUBLE PRECISION
);

-- DCIM Sensors
CREATE TABLE IF NOT EXISTS dcim_sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sensor_type TEXT,
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    position_z DOUBLE PRECISION,
    unit TEXT,
    min_threshold DOUBLE PRECISION,
    max_threshold DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Sensor Readings
CREATE TABLE IF NOT EXISTS dcim_sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID REFERENCES dcim_sensors(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    value DOUBLE PRECISION
);

-- DCIM Cables
CREATE TABLE IF NOT EXISTS dcim_cables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    cable_type TEXT,
    label TEXT,
    color TEXT,
    length_m DOUBLE PRECISION,
    a_device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    a_port_name TEXT,
    b_device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    b_port_name TEXT,
    status TEXT DEFAULT 'connected',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Network Ports
CREATE TABLE IF NOT EXISTS dcim_network_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES dcim_devices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    port_type TEXT,
    speed TEXT,
    cable_id UUID REFERENCES dcim_cables(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Maintenance Logs
CREATE TABLE IF NOT EXISTS dcim_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    device_id UUID REFERENCES dcim_devices(id) ON DELETE CASCADE,
    maintenance_type TEXT,
    title TEXT NOT NULL,
    description TEXT,
    performed_by TEXT,
    performed_at TIMESTAMPTZ,
    next_maintenance_at TIMESTAMPTZ,
    cost DECIMAL(12,2),
    status TEXT DEFAULT 'scheduled',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BMS ───────────────────────────────────────────────────────────────────────

-- BMS Systems
CREATE TABLE IF NOT EXISTS bms_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    system_type TEXT,
    status TEXT DEFAULT 'active',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Zones
CREATE TABLE IF NOT EXISTS bms_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor TEXT,
    area_sqm DOUBLE PRECISION,
    occupancy_capacity INT,
    current_occupancy INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Equipment
CREATE TABLE IF NOT EXISTS bms_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    equipment_type TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    installation_date DATE,
    status TEXT DEFAULT 'online',
    last_service_date DATE,
    next_service_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Points
CREATE TABLE IF NOT EXISTS bms_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES bms_equipment(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    point_type TEXT,
    engineering_unit TEXT,
    current_value TEXT,
    setpoint_value TEXT,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    is_writable BOOLEAN DEFAULT false,
    is_alarmed BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Schedules
CREATE TABLE IF NOT EXISTS bms_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    schedule_type TEXT,
    cron_expression TEXT,
    action_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Schedule Overrides
CREATE TABLE IF NOT EXISTS bms_schedule_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES bms_schedules(id) ON DELETE CASCADE,
    reason TEXT,
    override_data JSONB DEFAULT '{}',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Alarms
CREATE TABLE IF NOT EXISTS bms_alarms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES bms_equipment(id) ON DELETE SET NULL,
    point_id UUID REFERENCES bms_points(id) ON DELETE SET NULL,
    alarm_type TEXT,
    priority TEXT,
    condition TEXT,
    setpoint DOUBLE PRECISION,
    deadband DOUBLE PRECISION,
    delay_seconds INT,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Alarm Events
CREATE TABLE IF NOT EXISTS bms_alarm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alarm_id UUID REFERENCES bms_alarms(id) ON DELETE CASCADE,
    state TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    cleared_at TIMESTAMPTZ,
    value_at_trigger TEXT,
    notes TEXT
);

-- BMS Energy Meters
CREATE TABLE IF NOT EXISTS bms_energy_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    meter_type TEXT,
    unit TEXT,
    ct_ratio DOUBLE PRECISION,
    location TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Energy Readings
CREATE TABLE IF NOT EXISTS bms_energy_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID REFERENCES bms_energy_meters(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    value DOUBLE PRECISION,
    demand_kw DOUBLE PRECISION,
    power_factor DOUBLE PRECISION
);

-- BMS Access Credentials
CREATE TABLE IF NOT EXISTS bms_access_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    credential_type TEXT,
    credential_number TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    holder_id TEXT,
    access_level TEXT,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Access Events
CREATE TABLE IF NOT EXISTS bms_access_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    credential_id UUID REFERENCES bms_access_credentials(id) ON DELETE SET NULL,
    door_id TEXT,
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    event_type TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- BMS Maintenance Tasks
CREATE TABLE IF NOT EXISTS bms_maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    equipment_id UUID REFERENCES bms_equipment(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT,
    priority TEXT,
    assigned_to TEXT,
    scheduled_date DATE,
    completed_date DATE,
    status TEXT DEFAULT 'scheduled',
    cost DECIMAL(12,2),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SCADA ─────────────────────────────────────────────────────────────────────

-- SCADA Data Sources
CREATE TABLE IF NOT EXISTS scada_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    protocol TEXT,
    host TEXT,
    port INT,
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'disconnected',
    last_connected_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Tags
CREATE TABLE IF NOT EXISTS scada_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    source_id UUID REFERENCES scada_data_sources(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tag_path TEXT,
    description TEXT,
    data_type TEXT,
    engineering_unit TEXT,
    address TEXT,
    scaling_factor DOUBLE PRECISION DEFAULT 1.0,
    offset_val DOUBLE PRECISION DEFAULT 0.0,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    deadband DOUBLE PRECISION,
    scan_rate_ms INT DEFAULT 1000,
    is_writable BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Tag Values
CREATE TABLE IF NOT EXISTS scada_tag_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES scada_tags(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    value_numeric DOUBLE PRECISION,
    value_text TEXT,
    quality TEXT DEFAULT 'good'
);

-- SCADA Alarm Definitions
CREATE TABLE IF NOT EXISTS scada_alarm_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    tag_id UUID REFERENCES scada_tags(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    alarm_type TEXT,
    priority TEXT,
    condition_value DOUBLE PRECISION,
    deadband DOUBLE PRECISION,
    delay_ms INT DEFAULT 0,
    purpose TEXT,
    cause TEXT,
    corrective_action TEXT,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Alarm Events
CREATE TABLE IF NOT EXISTS scada_alarm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alarm_id UUID REFERENCES scada_alarm_definitions(id) ON DELETE CASCADE,
    state TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    cleared_at TIMESTAMPTZ,
    shelved_until TIMESTAMPTZ,
    shelved_by TEXT,
    shelve_reason TEXT,
    trigger_value DOUBLE PRECISION,
    notes TEXT
);

-- SCADA HMI Screens
CREATE TABLE IF NOT EXISTS scada_hmi_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    canvas_width INT DEFAULT 1920,
    canvas_height INT DEFAULT 1080,
    background_color TEXT DEFAULT '#ffffff',
    background_image_url TEXT,
    is_default BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA HMI Elements
CREATE TABLE IF NOT EXISTS scada_hmi_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screen_id UUID REFERENCES scada_hmi_screens(id) ON DELETE CASCADE,
    element_type TEXT,
    x INT,
    y INT,
    width INT,
    height INT,
    rotation DOUBLE PRECISION DEFAULT 0.0,
    tag_id UUID REFERENCES scada_tags(id) ON DELETE SET NULL,
    display_config JSONB DEFAULT '{}',
    animation_config JSONB DEFAULT '{}',
    style_config JSONB DEFAULT '{}',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Trend Configs
CREATE TABLE IF NOT EXISTS scada_trend_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    tag_ids JSONB DEFAULT '[]',
    time_range TEXT DEFAULT '1h',
    auto_refresh BOOLEAN DEFAULT true,
    chart_type TEXT DEFAULT 'line',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Report Templates
CREATE TABLE IF NOT EXISTS scada_report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    report_type TEXT,
    template_config JSONB DEFAULT '{}',
    schedule_cron TEXT,
    recipients JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BIM ───────────────────────────────────────────────────────────────────────

-- BIM Models
CREATE TABLE IF NOT EXISTS bim_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    format TEXT,
    original_filename TEXT,
    s3_key TEXT,
    converted_s3_key TEXT,
    file_size_bytes BIGINT,
    site_id UUID REFERENCES dcim_sites(id) ON DELETE SET NULL,
    building_id UUID REFERENCES dcim_buildings(id) ON DELETE SET NULL,
    version INT DEFAULT 1,
    status TEXT DEFAULT 'ready',
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Model Versions
CREATE TABLE IF NOT EXISTS bim_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    version INT,
    s3_key TEXT,
    change_description TEXT,
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Elements
CREATE TABLE IF NOT EXISTS bim_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    ifc_global_id TEXT,
    element_type TEXT,
    name TEXT,
    description TEXT,
    level TEXT,
    material TEXT,
    properties JSONB DEFAULT '{}',
    geometry_hash TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Annotations
CREATE TABLE IF NOT EXISTS bim_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    element_id UUID REFERENCES bim_elements(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    position_z DOUBLE PRECISION,
    camera_position JSONB,
    camera_target JSONB,
    annotation_type TEXT,
    priority TEXT,
    status TEXT DEFAULT 'open',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Viewpoints
CREATE TABLE IF NOT EXISTS bim_viewpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    camera_position JSONB,
    camera_target JSONB,
    camera_up JSONB,
    clipping_planes JSONB DEFAULT '[]',
    visible_elements JSONB DEFAULT '[]',
    hidden_elements JSONB DEFAULT '[]',
    highlighted_elements JSONB DEFAULT '[]',
    snapshot_url TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Clash Results
CREATE TABLE IF NOT EXISTS bim_clash_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    clash_type TEXT,
    element_a_id UUID REFERENCES bim_elements(id) ON DELETE CASCADE,
    element_b_id UUID REFERENCES bim_elements(id) ON DELETE CASCADE,
    distance DOUBLE PRECISION,
    position JSONB,
    severity TEXT,
    status TEXT DEFAULT 'new',
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Issues
CREATE TABLE IF NOT EXISTS bim_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    element_id UUID REFERENCES bim_elements(id) ON DELETE SET NULL,
    viewpoint_id UUID REFERENCES bim_viewpoints(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    issue_type TEXT,
    priority TEXT,
    status TEXT DEFAULT 'open',
    assigned_to TEXT,
    due_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Facility Management Indexes
CREATE INDEX IF NOT EXISTS idx_dcim_racks_room_id ON dcim_racks(room_id);
CREATE INDEX IF NOT EXISTS idx_dcim_devices_rack_id ON dcim_devices(rack_id);
CREATE INDEX IF NOT EXISTS idx_dcim_power_readings_feed_id ON dcim_power_readings(power_feed_id);
CREATE INDEX IF NOT EXISTS idx_dcim_sensor_readings_sensor_id ON dcim_sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_bms_alarm_events_alarm_id ON bms_alarm_events(alarm_id);
CREATE INDEX IF NOT EXISTS idx_scada_tag_values_tag_id ON scada_tag_values(tag_id);
CREATE INDEX IF NOT EXISTS idx_bim_elements_model_id ON bim_elements(model_id);

-- Facility Management Seed Data
INSERT INTO dcim_sites (id, name, code, city, tier_level, total_area_sqm)
VALUES ('00000000-0000-0000-0000-000000000001', 'HQ Data Center', 'HQ-DC-1', 'Jakarta', 'Tier III', 5000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dcim_buildings (id, site_id, name, floors)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Facility', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dcim_rooms (id, building_id, name, room_type, max_power_kw)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Server Hall A', 'server_room', 1000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dcim_racks (id, room_id, name, code, position_x, position_y, position_z)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Rack A1', 'A1', 0, 0, 0),
       ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Rack A2', 'A2', 1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 17: STUDIO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Studio Settings
CREATE TABLE IF NOT EXISTS public.studio_settings (
    tenant_id UUID PRIMARY KEY,
    default_llm_provider VARCHAR(50) DEFAULT 'anthropic',
    default_embedding_provider VARCHAR(50) DEFAULT 'auto',

    anthropic_api_key TEXT,
    anthropic_model VARCHAR(100) DEFAULT 'claude-3-haiku-20240307',

    google_api_key TEXT,
    google_project_id VARCHAR(100),
    google_location VARCHAR(50) DEFAULT 'us-central1',
    google_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',

    openai_api_key TEXT,
    openai_model VARCHAR(100) DEFAULT 'gpt-4o',

    ollama_base_url VARCHAR(255) DEFAULT 'http://host.docker.internal:11434',
    ollama_model VARCHAR(100) DEFAULT 'llama3',

    waha_dashboard_url VARCHAR(255) DEFAULT 'http://127.0.0.1:3010/dashboard',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON public.studio_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for service role" ON public.studio_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- studio_outputs → 00000000000062_studio_outputs.sql (after studio_notebooks)

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 18: FINAL GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
NOTIFY pgrst, 'reload schema';
