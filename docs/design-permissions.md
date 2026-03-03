# Permission System Design — Salesforce-Style 6-Layer RBAC

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    PERMISSION ENGINE                             │
├──────────────────────────────────────────────────────────────────┤
│ Layer 6: Record-Level Security (OWD + Sharing Rules)            │
│ Layer 5: Field-Level Security (FLS)                             │
│ Layer 4: Sharing Rules (Horizontal Access)                      │
│ Layer 3: Role Hierarchy (Vertical Data Visibility)              │
│ Layer 2: Permission Sets (Additive Permissions)                 │
│ Layer 1: Profiles (Base Permission Templates)                   │
├──────────────────────────────────────────────────────────────────┤
│ Foundation: Multi-Tenant Isolation (tenant_id)                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Foundation Tables

```sql
-- Multi-tenant Organizations
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Extended User table (replaces simple users table)
-- IMPORTANT: Every tenant_user IS an Individual (person)
-- The individual_id links the system user to their CRM person identity
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- ─── Person identity ───
    individual_id UUID REFERENCES individuals(id),  -- THE person this user represents
    
    -- ─── Permissions ───
    profile_id UUID REFERENCES profiles(id),       -- Layer 1: base permissions
    role_id UUID REFERENCES roles(id),             -- Layer 3: data visibility
    
    -- ─── Organization ───
    employee_id VARCHAR(50),
    title VARCHAR(255),
    department VARCHAR(255),
    manager_id UUID REFERENCES tenant_users(id),   -- reporting hierarchy
    
    -- ─── Status ───
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);
-- NOTE: When creating a new user, also create/link an Individual record.
-- The Individual holds personal identity (name, contacts, social profiles).
-- The tenant_user holds system access (login, permissions, role).
```

### Layer 1: Profiles (Base Permission Templates)

```sql
-- Profile = base permission template (like "Sales User", "Admin", "Read Only")
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,  -- built-in profiles can't be deleted
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Object-level permissions tied to profiles
CREATE TABLE profile_object_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,  -- e.g. 'lead', 'account', 'opportunity'
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_view_all BOOLEAN DEFAULT false,  -- see all records (not just own)
    can_modify_all BOOLEAN DEFAULT false, -- edit all records
    UNIQUE(profile_id, object_name)
);

-- System permissions (app-level features)
CREATE TABLE profile_system_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_key VARCHAR(150) NOT NULL,  -- e.g. 'manage_users', 'export_data', 'api_access'
    is_enabled BOOLEAN DEFAULT false,
    UNIQUE(profile_id, permission_key)
);
```

### Layer 2: Permission Sets (Additive)

```sql
-- Permission Sets = additive permissions stacked on top of profile
CREATE TABLE permission_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- User ↔ Permission Set assignments (many-to-many)
CREATE TABLE user_permission_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_user_id, permission_set_id)
);

-- Object permissions within a permission set
CREATE TABLE permission_set_object_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_view_all BOOLEAN DEFAULT false,
    can_modify_all BOOLEAN DEFAULT false,
    UNIQUE(permission_set_id, object_name)
);

-- System permissions within a permission set
CREATE TABLE permission_set_system_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    permission_key VARCHAR(150) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    UNIQUE(permission_set_id, permission_key)
);
```

### Layer 3: Role Hierarchy (Vertical Data Visibility)

```sql
-- Roles define DATA VISIBILITY (not permissions)
-- Higher roles can see data of lower roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    parent_role_id UUID REFERENCES roles(id),  -- hierarchy
    level INTEGER DEFAULT 0,  -- computed depth for fast queries
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Materialized role hierarchy paths for fast ancestor/descendant queries
CREATE TABLE role_hierarchy_paths (
    ancestor_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ancestor_id, descendant_id)
);
```

### Layer 4: Sharing Rules (Horizontal Access)

```sql
-- Org-Wide Defaults: base access level per object
CREATE TABLE org_wide_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    internal_access VARCHAR(20) DEFAULT 'private',  -- 'private', 'public_read', 'public_rw'
    external_access VARCHAR(20) DEFAULT 'private',
    UNIQUE(tenant_id, object_name)
);

-- Sharing Rules: grant access across role branches
CREATE TABLE sharing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    object_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(20) NOT NULL, -- 'owner_based', 'criteria_based'
    -- Owner-based: share FROM role/group TO role/group
    share_from_type VARCHAR(20), -- 'role', 'role_and_subordinates', 'group'
    share_from_id UUID,
    share_to_type VARCHAR(20),
    share_to_id UUID,
    -- Criteria-based: share records matching criteria
    criteria JSONB,  -- { "field": "status", "operator": "equals", "value": "Active" }
    access_level VARCHAR(20) DEFAULT 'read', -- 'read', 'read_write'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public Groups (for sharing rules)
CREATE TABLE public_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(tenant_id, name)
);

CREATE TABLE public_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public_groups(id) ON DELETE CASCADE,
    member_type VARCHAR(20) NOT NULL, -- 'user', 'role', 'role_and_subs', 'group'
    member_id UUID NOT NULL,
    UNIQUE(group_id, member_type, member_id)
);

-- Manual Sharing (user-to-user record sharing)
CREATE TABLE record_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    shared_with_type VARCHAR(20) NOT NULL, -- 'user', 'role', 'group'
    shared_with_id UUID NOT NULL,
    access_level VARCHAR(20) DEFAULT 'read',
    shared_by UUID NOT NULL REFERENCES tenant_users(id),
    reason VARCHAR(50) DEFAULT 'manual', -- 'manual', 'rule', 'team', 'territory'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Layer 5: Field-Level Security (FLS)

```sql
-- Field-level visibility and editability per profile
CREATE TABLE field_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT true,
    UNIQUE(profile_id, object_name, field_name)
);

-- Field permissions in permission sets (additive)
CREATE TABLE permission_set_field_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT true,
    UNIQUE(permission_set_id, object_name, field_name)
);
```

### Layer 6: Record-Level Security

```sql
-- Record ownership tracking (for OWD enforcement)
-- Each CRM/PM record stores owner_id referencing tenant_users
-- This is enforced at the application layer via the Permission Engine

-- Teams for collaborative record ownership
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(tenant_id, name)
);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'member', 'admin'
    UNIQUE(team_id, tenant_user_id)
);
```

---

## Permission Resolution Algorithm

```
FUNCTION resolvePermissions(userId, objectName, recordId):
  1. GET user's Profile → base object permissions
  2. GET user's Permission Sets → merge (additive, OR logic)
  3. EFFECTIVE object perms = Profile OR PermissionSets (most permissive wins)
  
  IF action is READ or EDIT on specific record:
    4. CHECK OWD for object
       - IF public_rw → ALLOW
       - IF public_read → ALLOW read, check ownership for edit
       - IF private → check ownership
    5. IF not owner:
       a. CHECK Role Hierarchy: is user above record owner?
       b. CHECK Sharing Rules: any rule grants access?
       c. CHECK Manual Shares: shared directly with user/role/group?
       d. CHECK Team membership: user in record's team?
    6. APPLY Field-Level Security to filter visible/editable fields
  
  RETURN { canCreate, canRead, canEdit, canDelete, visibleFields, editableFields }
```

---

## System Permission Keys

```typescript
// App-level permissions (used in profile_system_permissions & permission_set_system_permissions)
const SYSTEM_PERMISSIONS = {
  // Admin
  'admin.manage_users': 'Create/edit/deactivate users',
  'admin.manage_roles': 'Create/edit role hierarchy',
  'admin.manage_profiles': 'Create/edit permission profiles',
  'admin.manage_sharing': 'Configure sharing rules and OWD',
  'admin.manage_tenants': 'Manage tenant settings',
  'admin.view_audit_log': 'View audit trail',
  
  // Data
  'data.export': 'Export data to CSV/Excel',
  'data.import': 'Bulk import data',
  'data.mass_delete': 'Mass delete records',
  'data.mass_update': 'Mass update records',
  
  // API
  'api.access': 'Access GraphQL API',
  'api.manage_keys': 'Create/revoke API keys',
  
  // CRM
  'crm.convert_leads': 'Convert leads to accounts/contacts',
  'crm.manage_campaigns': 'Create/edit campaigns',
  'crm.manage_products': 'Manage product catalog',
  
  // PM
  'pm.create_projects': 'Create new projects',
  'pm.manage_templates': 'Create/edit project templates',
  'pm.approve_changes': 'Approve change requests',
  'pm.manage_budgets': 'Manage project budgets',
  
  // Reports
  'reports.create': 'Create custom reports',
  'reports.create_dashboards': 'Create dashboards',
  'reports.schedule': 'Schedule report delivery',
};
```

---

## Object Registry

All objects that participate in the permission system:

```typescript
const PERMISSION_OBJECTS = [
  // CRM
  'individual', 'account', 'contact', 'lead', 'opportunity',
  'case', 'activity', 'product', 'price_book', 'campaign',
  
  // PM
  'project', 'task', 'milestone', 'risk', 'issue',
  'change_request', 'deliverable', 'resource_assignment',
  'procurement', 'stakeholder',
  
  // System
  'user', 'report', 'dashboard', 'document',
];
```

---

## UI Pages

### `/admin/permissions`

| Page | Purpose |
|------|---------|
| `/permissions` | Overview dashboard: profiles, roles, permission sets summary |
| `/permissions/profiles` | List/create/edit profiles with object & system permissions |
| `/permissions/profiles/[id]` | Profile detail: object perms matrix, system perms checkboxes, FLS grid |
| `/permissions/roles` | Role hierarchy tree visualization (drag to reorder) |
| `/permissions/roles/[id]` | Role detail: assigned users, data access scope |
| `/permissions/permission-sets` | List/create/edit permission sets |
| `/permissions/permission-sets/[id]` | Permission set detail: similar to profile detail |
| `/permissions/sharing` | OWD settings grid + sharing rules list |
| `/permissions/groups` | Public groups management |
| `/permissions/teams` | Team management |
| `/permissions/audit` | Permission change audit log |

### Key UI Components

1. **Object Permission Matrix** — Grid: rows=objects, cols=CRUD+ViewAll+ModifyAll, cells=checkboxes
2. **Role Hierarchy Tree** — Interactive tree with drag-drop for re-parenting
3. **Field Permission Grid** — rows=fields, cols=Visible/Editable per profile
4. **Sharing Rule Builder** — Form: from→to with criteria builder
5. **Effective Permission Calculator** — Select user → show computed final permissions
