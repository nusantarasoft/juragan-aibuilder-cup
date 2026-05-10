-- ═══════════════════════════════════════════════════════════
-- Document Management System (DMS) Tables
-- Matches existing pattern (tenant_id as plain UUID)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS doc_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES doc_folders(id) ON DELETE CASCADE,
    module TEXT,
    module_ref_id TEXT,
    color TEXT DEFAULT '#6366f1',
    description TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    folder_id UUID REFERENCES doc_folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT DEFAULT 0,
    storage_path TEXT NOT NULL,
    current_version INTEGER DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    module TEXT,
    module_ref_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    locked_by TEXT,
    locked_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES doc_files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    change_notes TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(file_id, version_number)
);

CREATE TABLE IF NOT EXISTS doc_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES doc_files(id) ON DELETE CASCADE,
    user_id UUID,
    permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
    granted_by TEXT,
    granted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(file_id, user_id)
);

CREATE TABLE IF NOT EXISTS doc_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    file_id UUID REFERENCES doc_files(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    steps JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES doc_workflows(id) ON DELETE CASCADE,
    file_id UUID REFERENCES doc_files(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
    submitted_by TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES doc_files(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent ON doc_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_tenant ON doc_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_files_folder ON doc_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_doc_files_tenant ON doc_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_files_status ON doc_files(status);
CREATE INDEX IF NOT EXISTS idx_doc_versions_file ON doc_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_file ON doc_access(file_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_user ON doc_access(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_audit_file ON doc_audit_log(file_id);
CREATE INDEX IF NOT EXISTS idx_doc_audit_created ON doc_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_doc_wf_instances_file ON doc_workflow_instances(file_id);
