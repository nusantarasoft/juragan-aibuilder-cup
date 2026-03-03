-- ===========================================
-- Enterprise Permission System Schema
-- Multi-Tenant 6-Layer RBAC (Salesforce-Style)
-- Run this in Supabase SQL Editor
-- ===========================================

-- Enable UUID extension (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TENANTS (Multi-Tenant Foundation)
-- ===========================================
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

-- ===========================================
-- INDIVIDUALS (Core Person Entity)
-- The unified representation of a person
-- ===========================================
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

-- ===========================================
-- LAYER 1: PROFILES (Base Permission Templates)
-- ===========================================
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

-- ===========================================
-- LAYER 3: ROLES (Vertical Data Visibility)
-- ===========================================
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

-- ===========================================
-- TENANT USERS (System User linked to Individual + Permissions)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID, -- References auth.users if using Supabase auth

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

-- Set owner_id FK on individuals now that tenant_users exists
-- (using deferred approach since circular dependency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'individuals' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.individuals ADD COLUMN owner_id UUID REFERENCES public.tenant_users(id);
    END IF;
END $$;

-- ===========================================
-- PROFILE OBJECT PERMISSIONS
-- ===========================================
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

-- ===========================================
-- PROFILE SYSTEM PERMISSIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profile_system_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_key VARCHAR(150) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    UNIQUE(profile_id, permission_key)
);

-- ===========================================
-- LAYER 2: PERMISSION SETS (Additive)
-- ===========================================
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

-- ===========================================
-- ROLE HIERARCHY PATHS (Materialized Closure Table)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.role_hierarchy_paths (
    ancestor_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ancestor_id, descendant_id)
);

-- ===========================================
-- LAYER 4: SHARING RULES
-- ===========================================

-- Org-Wide Defaults
CREATE TABLE IF NOT EXISTS public.org_wide_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    internal_access VARCHAR(20) DEFAULT 'private',
    external_access VARCHAR(20) DEFAULT 'private',
    UNIQUE(tenant_id, object_name)
);

-- Sharing Rules
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

-- ===========================================
-- LAYER 5: FIELD-LEVEL SECURITY
-- ===========================================
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

-- ===========================================
-- LAYER 6: TEAMS (Record-Level Security)
-- ===========================================
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

-- ===========================================
-- AUDIT LOG
-- ===========================================
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

-- ===========================================
-- RLS POLICIES (Service role full access for middleware)
-- ===========================================
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

-- Service role (middleware) gets full access
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

-- ===========================================
-- SEED: Default Tenant + System Admin
-- ===========================================
INSERT INTO public.tenants (id, name, slug, subscription_plan) VALUES
    ('00000000-0000-0000-0000-000000000010', 'Default Organization', 'default', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- System Admin Profile
INSERT INTO public.profiles (id, tenant_id, name, description, is_system) VALUES
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'System Administrator', 'Full access to all features', true),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'Standard User', 'Standard user with basic access', true),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', 'Read Only', 'View-only access', true)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- CEO role
INSERT INTO public.roles (id, tenant_id, name, level, description) VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'CEO', 0, 'Chief Executive Officer - Top of hierarchy')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Self-referencing path for CEO
INSERT INTO public.role_hierarchy_paths (ancestor_id, descendant_id, depth) VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', 0)
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Permission system schema created successfully' AS status;
