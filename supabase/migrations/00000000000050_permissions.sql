-- ═══════════════════════════════════════════════════════════════════════════
-- RBAC & PERMISSIONS SCHEMA
-- Enterprise-grade Role-Based Access Control for Nusantarasoft
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PROFILES — Security templates (like Salesforce profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_custom BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

-- 2. ROLES — Hierarchy-based data access (who sees what records)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

-- 3. ROLE HIERARCHY PATHS — Closure table for fast ancestor lookups
CREATE TABLE IF NOT EXISTS role_hierarchy_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ancestor_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL DEFAULT 0,
    UNIQUE(ancestor_id, descendant_id)
);

-- 4. PERMISSION SETS — Additive permissions (extend profile access)
CREATE TABLE IF NOT EXISTS permission_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

-- 5. TENANT USERS — Links auth users to tenant with role + profile
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    individual_id UUID,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    employee_id TEXT,
    title TEXT,
    department TEXT,
    manager_id UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

-- The referenced table "individuals" is part of the app schema (consolidated_init),
-- so the FK must be added conditionally to keep migrations order-independent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'individuals'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'tenant_users_individual_id_fkey'
    ) THEN
      ALTER TABLE public.tenant_users
        ADD CONSTRAINT tenant_users_individual_id_fkey
        FOREIGN KEY (individual_id)
        REFERENCES public.individuals(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 6. PROFILE OBJECT PERMISSIONS — CRUD + ViewAll/ModifyAll per object
CREATE TABLE IF NOT EXISTS profile_object_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    object_name TEXT NOT NULL,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_read BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_all BOOLEAN NOT NULL DEFAULT FALSE,
    can_modify_all BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(profile_id, object_name)
);

-- 7. PROFILE SYSTEM PERMISSIONS — Feature-level toggles
CREATE TABLE IF NOT EXISTS profile_system_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(profile_id, permission_key)
);

-- 8. PERMISSION SET OBJECT PERMISSIONS — Additive CRUD per object
CREATE TABLE IF NOT EXISTS permission_set_object_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    object_name TEXT NOT NULL,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_read BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_all BOOLEAN NOT NULL DEFAULT FALSE,
    can_modify_all BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(permission_set_id, object_name)
);

-- 9. PERMISSION SET SYSTEM PERMISSIONS — Additive feature toggles
CREATE TABLE IF NOT EXISTS permission_set_system_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(permission_set_id, permission_key)
);

-- 10. USER PERMISSION SETS — M:N assignment of perm sets to users
CREATE TABLE IF NOT EXISTS user_permission_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_user_id, permission_set_id)
);

-- 11. ORG-WIDE DEFAULTS — Default record-level access per object
CREATE TABLE IF NOT EXISTS org_wide_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    object_name TEXT NOT NULL,
    internal_access TEXT NOT NULL DEFAULT 'private',
    external_access TEXT NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, object_name)
);

-- 12. SHARING RULES — Criteria/owner-based record sharing
CREATE TABLE IF NOT EXISTS sharing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    object_name TEXT NOT NULL,
    rule_type TEXT NOT NULL DEFAULT 'owner',
    share_from_type TEXT,
    share_from_id UUID,
    share_to_type TEXT,
    share_to_id UUID,
    criteria JSONB,
    access_level TEXT NOT NULL DEFAULT 'read',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. FIELD PERMISSIONS — Field-level security per profile
CREATE TABLE IF NOT EXISTS field_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    object_name TEXT NOT NULL,
    field_name TEXT NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_editable BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(profile_id, object_name, field_name)
);

-- 14. TEAMS — Collaborative groups for record sharing
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

-- 15. TEAM MEMBERS — M:N team membership
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, tenant_user_id)
);

-- 16. PUBLIC GROUPS — Named groups for sharing rules
CREATE TABLE IF NOT EXISTS public_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_role_paths_ancestor ON role_hierarchy_paths(ancestor_id);
CREATE INDEX IF NOT EXISTS idx_role_paths_descendant ON role_hierarchy_paths(descendant_id);
CREATE INDEX IF NOT EXISTS idx_permission_sets_tenant ON permission_sets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_profile ON tenant_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(role_id);
CREATE INDEX IF NOT EXISTS idx_pop_profile ON profile_object_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_psp_profile ON profile_system_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_psop_pset ON permission_set_object_permissions(permission_set_id);
CREATE INDEX IF NOT EXISTS idx_pssp_pset ON permission_set_system_permissions(permission_set_id);
CREATE INDEX IF NOT EXISTS idx_ups_user ON user_permission_sets(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_owd_tenant ON org_wide_defaults(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sharing_tenant ON sharing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sharing_object ON sharing_rules(object_name);
CREATE INDEX IF NOT EXISTS idx_fp_profile ON field_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tm_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_groups_tenant ON public_groups(tenant_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) — Enable on all tables, allow service_role
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_hierarchy_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_set_object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_set_system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_wide_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_groups ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (middleware uses service_role key)
DO $$ 
DECLARE
    t TEXT;
    policy_name TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'profiles','roles','role_hierarchy_paths','permission_sets',
        'tenant_users','profile_object_permissions','profile_system_permissions',
        'permission_set_object_permissions','permission_set_system_permissions',
        'user_permission_sets','org_wide_defaults','sharing_rules',
        'field_permissions','teams','team_members','public_groups'
    ]) LOOP
        policy_name := 'service_role_all_' || t;
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
            policy_name, t);
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA — System profiles + org-wide defaults
-- ═══════════════════════════════════════════════════════════════════════════

-- Default tenant ID (matches nusantarasoft_seed.sql patterns)
DO $$
DECLARE
    default_tenant UUID := '00000000-0000-0000-0000-000000000010';
    admin_profile UUID;
    std_profile UUID;
    readonly_profile UUID;
    ceo_role UUID;
    mgr_role UUID;
    user_role UUID;
BEGIN
    -- System Profiles
    INSERT INTO profiles (id, tenant_id, name, description, is_system, is_custom) VALUES
        (gen_random_uuid(), default_tenant, 'System Administrator', 'Full access to all features and data', TRUE, FALSE),
        (gen_random_uuid(), default_tenant, 'Standard User', 'Standard access with object-level restrictions', TRUE, FALSE),
        (gen_random_uuid(), default_tenant, 'Read Only', 'View-only access to all objects', TRUE, FALSE)
    ON CONFLICT (tenant_id, name) DO NOTHING;

    -- Get profile IDs
    SELECT id INTO admin_profile FROM profiles WHERE tenant_id = default_tenant AND name = 'System Administrator';
    SELECT id INTO std_profile FROM profiles WHERE tenant_id = default_tenant AND name = 'Standard User';
    SELECT id INTO readonly_profile FROM profiles WHERE tenant_id = default_tenant AND name = 'Read Only';

    -- Admin profile: full access on all objects
    INSERT INTO profile_object_permissions (profile_id, object_name, can_create, can_read, can_edit, can_delete, can_view_all, can_modify_all)
    SELECT admin_profile, obj, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
    FROM unnest(ARRAY[
        'accounts','contacts','individuals','deals','quotes','campaigns','cases','crm_activities',
        'ecom_customers','ecom_orders','ecom_offers','ecom_discounts','ecom_packages','ecom_returns',
        'inv_items','inv_warehouses','inv_stock_movements','inv_stock_operations',
        'inv_fixed_assets','rental_contracts','bookings','mfg_work_orders','inv_purchase_orders'
    ]) AS obj
    ON CONFLICT (profile_id, object_name) DO NOTHING;

    -- Standard profile: CRUD but no ViewAll/ModifyAll
    INSERT INTO profile_object_permissions (profile_id, object_name, can_create, can_read, can_edit, can_delete, can_view_all, can_modify_all)
    SELECT std_profile, obj, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE
    FROM unnest(ARRAY[
        'accounts','contacts','individuals','deals','quotes','campaigns','cases','crm_activities',
        'ecom_customers','ecom_orders','ecom_offers','ecom_discounts','ecom_packages','ecom_returns',
        'inv_items','inv_warehouses','inv_stock_movements','inv_stock_operations',
        'inv_fixed_assets','rental_contracts','bookings','mfg_work_orders','inv_purchase_orders'
    ]) AS obj
    ON CONFLICT (profile_id, object_name) DO NOTHING;

    -- Read Only profile: read only
    INSERT INTO profile_object_permissions (profile_id, object_name, can_create, can_read, can_edit, can_delete, can_view_all, can_modify_all)
    SELECT readonly_profile, obj, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE
    FROM unnest(ARRAY[
        'accounts','contacts','individuals','deals','quotes','campaigns','cases','crm_activities',
        'ecom_customers','ecom_orders','ecom_offers','ecom_discounts','ecom_packages','ecom_returns',
        'inv_items','inv_warehouses','inv_stock_movements','inv_stock_operations',
        'inv_fixed_assets','rental_contracts','bookings','mfg_work_orders','inv_purchase_orders'
    ]) AS obj
    ON CONFLICT (profile_id, object_name) DO NOTHING;

    -- Default Role Hierarchy: CEO → Manager → User
    INSERT INTO roles (id, tenant_id, name, description, parent_role_id, level) VALUES
        (gen_random_uuid(), default_tenant, 'CEO', 'Top-level executive', NULL, 0)
    ON CONFLICT (tenant_id, name) DO NOTHING;
    SELECT id INTO ceo_role FROM roles WHERE tenant_id = default_tenant AND name = 'CEO';

    INSERT INTO roles (id, tenant_id, name, description, parent_role_id, level) VALUES
        (gen_random_uuid(), default_tenant, 'Manager', 'Department manager', ceo_role, 1)
    ON CONFLICT (tenant_id, name) DO NOTHING;
    SELECT id INTO mgr_role FROM roles WHERE tenant_id = default_tenant AND name = 'Manager';

    INSERT INTO roles (id, tenant_id, name, description, parent_role_id, level) VALUES
        (gen_random_uuid(), default_tenant, 'User', 'Standard user', mgr_role, 2)
    ON CONFLICT (tenant_id, name) DO NOTHING;
    SELECT id INTO user_role FROM roles WHERE tenant_id = default_tenant AND name = 'User';

    -- Role hierarchy paths (closure table)
    INSERT INTO role_hierarchy_paths (ancestor_id, descendant_id, depth) VALUES
        (ceo_role, ceo_role, 0),
        (mgr_role, mgr_role, 0),
        (user_role, user_role, 0),
        (ceo_role, mgr_role, 1),
        (ceo_role, user_role, 2),
        (mgr_role, user_role, 1)
    ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

    -- Org-Wide Defaults for all objects
    INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access)
    SELECT default_tenant, obj,
        CASE WHEN obj IN ('accounts','contacts','individuals','ecom_customers') THEN 'public_read_write' ELSE 'private' END,
        'private'
    FROM unnest(ARRAY[
        'accounts','contacts','individuals','deals','quotes','campaigns','cases','crm_activities',
        'ecom_customers','ecom_orders','ecom_offers','ecom_discounts','ecom_packages','ecom_returns',
        'inv_items','inv_warehouses','inv_stock_movements','inv_stock_operations',
        'inv_fixed_assets','rental_contracts','bookings','mfg_work_orders','inv_purchase_orders'
    ]) AS obj
    ON CONFLICT (tenant_id, object_name) DO NOTHING;

    -- Default Permission Sets
    INSERT INTO permission_sets (tenant_id, name, description, is_system) VALUES
        (default_tenant, 'API Access', 'Grants access to REST and GraphQL APIs', TRUE),
        (default_tenant, 'Report Builder', 'Can create and run custom reports', FALSE),
        (default_tenant, 'Data Import', 'Can use batch import features', FALSE)
    ON CONFLICT (tenant_id, name) DO NOTHING;

END $$;

-- Grant PostgREST access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
