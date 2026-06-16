-- ═══════════════════════════════════════════════════════════════
-- DATASETS, DOCUMENTS, REPORTS, INTEGRATIONS — v2.19.0
-- ═══════════════════════════════════════════════════════════════

-- ─── Datasets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    source_type TEXT CHECK (source_type IN ('postgresql','mysql','csv','api','s3','dremio','supabase')),
    connection_config JSONB DEFAULT '{}',
    schema_definition JSONB DEFAULT '{}',
    row_count BIGINT DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle','syncing','error','completed')),
    is_public BOOLEAN DEFAULT false,
    tags TEXT[],
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dataset_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    host TEXT,
    port INT,
    database_name TEXT,
    username TEXT,
    password_encrypted TEXT,
    ssl_mode TEXT DEFAULT 'prefer',
    connection_options JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMPTZ,
    test_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dataset_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    is_nullable BOOLEAN DEFAULT true,
    is_primary_key BOOLEAN DEFAULT false,
    default_value TEXT,
    description TEXT,
    ordinal_position INT,
    stats JSONB DEFAULT '{}'
);

-- ─── Documents ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size BIGINT DEFAULT 0,
    mime_type TEXT,
    folder_id UUID,
    parent_id UUID REFERENCES documents(id),
    document_type TEXT DEFAULT 'file' CHECK (document_type IN ('file','folder','template','link')),
    owner_id UUID,
    tags TEXT[],
    is_archived BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    version INT DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_path TEXT,
    file_size BIGINT DEFAULT 0,
    change_summary TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_with_user_id UUID,
    shared_with_team TEXT,
    permission TEXT DEFAULT 'view' CHECK (permission IN ('view','comment','edit','admin')),
    expires_at TIMESTAMPTZ,
    shared_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_type TEXT DEFAULT 'approval' CHECK (workflow_type IN ('approval','review','signature','publish')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','approved','rejected','completed')),
    approvers JSONB DEFAULT '[]',
    current_step INT DEFAULT 0,
    comments TEXT,
    initiated_by UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Reports ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT DEFAULT 'table' CHECK (report_type IN ('table','chart','dashboard','summary','export')),
    module TEXT,
    query_config JSONB DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    columns JSONB DEFAULT '[]',
    visualizations JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    created_by UUID,
    last_run_at TIMESTAMPTZ,
    run_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('hourly','daily','weekly','monthly','quarterly')),
    cron_expression TEXT,
    recipients TEXT[],
    delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email','slack','webhook','download')),
    format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf','csv','xlsx','json')),
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    template_config JSONB NOT NULL DEFAULT '{}',
    preview_url TEXT,
    is_system BOOLEAN DEFAULT false,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Integrations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations_marketplace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    category TEXT,
    provider TEXT,
    icon_url TEXT,
    version TEXT DEFAULT '1.0.0',
    config_schema JSONB DEFAULT '{}',
    is_premium BOOLEAN DEFAULT false,
    install_count INT DEFAULT 0,
    rating NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations_installed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    marketplace_id UUID REFERENCES integrations_marketplace(id),
    name TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    credentials_encrypted JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle',
    error TEXT,
    installed_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    integration_id UUID REFERENCES integrations_installed(id),
    direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
    url TEXT,
    method TEXT DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    payload JSONB DEFAULT '{}',
    response_status INT,
    response_body TEXT,
    duration_ms INT,
    status TEXT DEFAULT 'success' CHECK (status IN ('success','failed','timeout','retry')),
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_datasets_tenant ON datasets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_doc ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_module ON reports(module);
CREATE INDEX IF NOT EXISTS idx_integrations_installed_tenant ON integrations_installed(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_integration ON integrations_webhook_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON integrations_webhook_logs(created_at DESC);
