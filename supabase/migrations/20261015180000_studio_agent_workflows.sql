-- P2-3: AI Studio Visual Agent Builder — tenant-scoped persisted workflow graphs
-- Separate from aos_playbooks (procedural step lists for Agentic OS tasks).
CREATE TABLE IF NOT EXISTS studio_agent_workflows (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name                TEXT NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    graph               JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
    aos_playbook_id     UUID REFERENCES aos_playbooks(id) ON DELETE SET NULL,
    last_tested_at      TIMESTAMPTZ,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_agent_workflows_tenant
    ON studio_agent_workflows (tenant_id, updated_at DESC);

COMMENT ON TABLE studio_agent_workflows IS
    'AI Studio Agent Builder visual workflows (node graph JSON). Distinct from aos_playbooks step templates (P2-3).';
