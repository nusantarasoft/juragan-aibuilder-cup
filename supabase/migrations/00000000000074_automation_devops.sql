-- ═══════════════════════════════════════════════════════════════
-- AUTOMATION, DEVOPS, COLLABORATION, MESSAGING — v2.19.0
-- ═══════════════════════════════════════════════════════════════

-- ─── Automation ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT CHECK (trigger_type IN ('manual','schedule','webhook','event','api')),
    trigger_config JSONB DEFAULT '{}',
    steps JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    run_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    tags TEXT[],
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled','timeout')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    error TEXT,
    step_results JSONB DEFAULT '[]',
    triggered_by TEXT
);

CREATE TABLE IF NOT EXISTS automation_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL,
    timezone TEXT DEFAULT 'Asia/Jakarta',
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── DevOps ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devops_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    repository_url TEXT,
    branch TEXT DEFAULT 'main',
    pipeline_type TEXT DEFAULT 'ci' CHECK (pipeline_type IN ('ci','cd','cicd')),
    config JSONB DEFAULT '{}',
    stages JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_build_status TEXT,
    last_build_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devops_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    pipeline_id UUID NOT NULL REFERENCES devops_pipelines(id) ON DELETE CASCADE,
    build_number INT NOT NULL,
    commit_sha TEXT,
    commit_message TEXT,
    branch TEXT,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued','running','success','failed','cancelled')),
    stages JSONB DEFAULT '[]',
    artifacts JSONB DEFAULT '[]',
    duration_ms INT,
    triggered_by TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devops_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    pipeline_id UUID REFERENCES devops_pipelines(id),
    build_id UUID REFERENCES devops_builds(id),
    environment TEXT NOT NULL CHECK (environment IN ('development','staging','production')),
    version TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','deploying','success','failed','rolled_back')),
    deployed_by TEXT,
    rollback_of UUID,
    metadata JSONB DEFAULT '{}',
    deployed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Collaboration ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collaboration_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    channel_type TEXT DEFAULT 'public' CHECK (channel_type IN ('public','private','direct','group')),
    description TEXT,
    topic TEXT,
    members UUID[],
    is_archived BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collaboration_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    channel_id UUID NOT NULL REFERENCES collaboration_channels(id) ON DELETE CASCADE,
    sender_id UUID,
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','file','image','system','thread_reply')),
    parent_id UUID REFERENCES collaboration_messages(id),
    attachments JSONB DEFAULT '[]',
    reactions JSONB DEFAULT '{}',
    is_edited BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Messaging (Event Streams) ──────────────────────────────
CREATE TABLE IF NOT EXISTS messaging_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    partitions INT DEFAULT 1,
    replication_factor INT DEFAULT 1,
    retention_hours INT DEFAULT 168,
    config JSONB DEFAULT '{}',
    message_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messaging_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    queue_type TEXT DEFAULT 'standard' CHECK (queue_type IN ('standard','fifo','dead_letter','priority')),
    max_size INT DEFAULT 10000,
    current_size INT DEFAULT 0,
    processing INT DEFAULT 0,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messaging_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    topic_id UUID REFERENCES messaging_topics(id),
    queue_id UUID REFERENCES messaging_queues(id),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','failed','dead_letter')),
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_workflows_tenant ON automation_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_workflow ON automation_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_devops_builds_pipeline ON devops_builds(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_devops_deployments_env ON devops_deployments(environment);
CREATE INDEX IF NOT EXISTS idx_collab_messages_channel ON collaboration_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_collab_messages_created ON collaboration_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_events_topic ON messaging_events(topic_id);
CREATE INDEX IF NOT EXISTS idx_messaging_events_status ON messaging_events(status);
