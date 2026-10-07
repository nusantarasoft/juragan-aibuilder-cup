-- ════════════════════════════════════════════════════════════════════════════
-- Agentic OS — Phase 3 (Workflows + Memory additions)
--   * aos_routines: workflow_id + kind 'workflow'
--   * aos_workflows: last_run_at / last_status
--   * aos_workflow_runs: one row per workflow execution (node_states = live DAG state)
--   * aos_tasks / aos_approvals: workflow_run_id + node_id
--   * Seed: "Major incident response" example workflow
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Routines: workflow kind ───────────────────────────────────────────────────
ALTER TABLE aos_routines ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES aos_workflows(id) ON DELETE SET NULL;

-- Replace the kind check (dropped by its real name, whatever it was generated as).
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'aos_routines'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%kind%'
    LOOP
        EXECUTE format('ALTER TABLE aos_routines DROP CONSTRAINT %I', c.conname);
    END LOOP;
    ALTER TABLE aos_routines ADD CONSTRAINT aos_routines_kind_check
        CHECK (kind IN ('prompt', 'playbook', 'check', 'workflow'));
END $$;

-- ── Workflows: last run summary ──────────────────────────────────────────────
ALTER TABLE aos_workflows ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE aos_workflows ADD COLUMN IF NOT EXISTS last_status TEXT;

-- ── Workflow runs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aos_workflow_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    workflow_id     UUID NOT NULL REFERENCES aos_workflows(id) ON DELETE CASCADE,
    workflow_name   TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'waiting_approval', 'success', 'failed', 'cancelled')),
    trigger         TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual', 'routine', 'event')),
    node_states     JSONB NOT NULL DEFAULT '{}'::jsonb,
    graph_snapshot  JSONB NOT NULL DEFAULT '{}'::jsonb,
    routine_id      UUID REFERENCES aos_routines(id) ON DELETE SET NULL,
    started_by      UUID,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    error           TEXT
);
CREATE INDEX IF NOT EXISTS idx_aos_workflow_runs_started ON aos_workflow_runs(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_aos_workflow_runs_active ON aos_workflow_runs(status) WHERE status IN ('running', 'waiting_approval');

-- ── Tasks / approvals: link back to the workflow run + node ─────────────────
ALTER TABLE aos_tasks ADD COLUMN IF NOT EXISTS workflow_run_id UUID REFERENCES aos_workflow_runs(id) ON DELETE SET NULL;
ALTER TABLE aos_tasks ADD COLUMN IF NOT EXISTS node_id TEXT;
CREATE INDEX IF NOT EXISTS idx_aos_tasks_workflow_run ON aos_tasks(workflow_run_id) WHERE workflow_run_id IS NOT NULL;

ALTER TABLE aos_approvals ADD COLUMN IF NOT EXISTS workflow_run_id UUID REFERENCES aos_workflow_runs(id) ON DELETE SET NULL;
ALTER TABLE aos_approvals ADD COLUMN IF NOT EXISTS node_id TEXT;
CREATE INDEX IF NOT EXISTS idx_aos_approvals_workflow_run ON aos_approvals(workflow_run_id) WHERE workflow_run_id IS NOT NULL;

-- ── RLS + grants (same pattern as the Phase 1 tables) ───────────────────────
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['aos_workflow_runs']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_service', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', t || '_read', t);
        EXECUTE format('GRANT ALL ON %I TO service_role', t);
        EXECUTE format('GRANT SELECT ON %I TO authenticated', t);
    END LOOP;
END $$;

-- ── Seed: "Major incident response" ─────────────────────────────────────────
-- start → ITSM triage → commander gate → (infra mitigation ∥ customer update) → end.
-- Agents are resolved by slug preference among seeded agents with the right
-- modules, falling back to any active agent. agentId values are agent uuids.
INSERT INTO aos_workflows (tenant_id, name, description, trigger, graph, enabled)
SELECT
    '00000000-0000-0000-0000-000000000010',
    'Major incident response',
    'Triage a major incident, get the incident commander''s go-ahead, then mitigate and update customers in parallel.',
    'manual',
    jsonb_build_object(
        'nodes', jsonb_build_array(
            jsonb_build_object('id', 'start', 'type', 'start',
                'position', jsonb_build_object('x', 0, 'y', 0),
                'data', jsonb_build_object('label', 'Start')),
            jsonb_build_object('id', 'triage', 'type', 'agent',
                'position', jsonb_build_object('x', 260, 'y', 0),
                'data', jsonb_build_object(
                    'agentId', a.triage, 'playbookId', NULL,
                    'title', 'Triage the major incident',
                    'description', 'Confirm impact and scope, link related tickets, and propose a mitigation plan.',
                    'moduleId', 'itsm', 'route', '/admin/itsm/tickets',
                    'steps', jsonb_build_array('Confirm impact and affected services', 'Link related tickets and alerts', 'Propose a mitigation plan'),
                    'priority', 'urgent', 'waitFor', 'review')),
            jsonb_build_object('id', 'gate', 'type', 'gate',
                'position', jsonb_build_object('x', 520, 'y', 0),
                'data', jsonb_build_object('label', 'Incident commander approves the plan')),
            jsonb_build_object('id', 'mitigate', 'type', 'agent',
                'position', jsonb_build_object('x', 780, 'y', -90),
                'data', jsonb_build_object(
                    'agentId', a.infra, 'playbookId', NULL,
                    'title', 'Apply the mitigation',
                    'description', 'Carry out the approved mitigation and watch the service recover.',
                    'moduleId', 'infrastructure', 'route', '/admin/infrastructure/prometheus',
                    'steps', jsonb_build_array('Prepare the change', 'Apply the mitigation', 'Verify recovery on dashboards'),
                    'priority', 'high', 'waitFor', 'review')),
            jsonb_build_object('id', 'comms', 'type', 'agent',
                'position', jsonb_build_object('x', 780, 'y', 90),
                'data', jsonb_build_object(
                    'agentId', a.comms, 'playbookId', NULL,
                    'title', 'Draft the customer update',
                    'description', 'Draft a short, plain-language status update for affected customers (draft only, do not send).',
                    'moduleId', 'crm', 'route', '/admin/crm/pipeline',
                    'steps', jsonb_build_array('List affected customers', 'Draft the status update', 'Queue the draft for review'),
                    'priority', 'high', 'waitFor', 'review')),
            jsonb_build_object('id', 'end', 'type', 'end',
                'position', jsonb_build_object('x', 1040, 'y', 0),
                'data', jsonb_build_object('label', 'Done'))
        ),
        'edges', jsonb_build_array(
            jsonb_build_object('id', 'e-start-triage', 'source', 'start', 'target', 'triage'),
            jsonb_build_object('id', 'e-triage-gate', 'source', 'triage', 'target', 'gate'),
            jsonb_build_object('id', 'e-gate-mitigate', 'source', 'gate', 'target', 'mitigate'),
            jsonb_build_object('id', 'e-gate-comms', 'source', 'gate', 'target', 'comms'),
            jsonb_build_object('id', 'e-mitigate-end', 'source', 'mitigate', 'target', 'end'),
            jsonb_build_object('id', 'e-comms-end', 'source', 'comms', 'target', 'end')
        )
    ),
    TRUE
FROM (
    SELECT
        COALESCE(
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL
                AND 'itsm' = ANY(modules)
              ORDER BY array_position(ARRAY['semar', 'petruk']::text[], slug) NULLS LAST, slug LIMIT 1),
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL AND status = 'active'
              ORDER BY slug LIMIT 1)
        ) AS triage,
        COALESCE(
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL
                AND modules && ARRAY['infrastructure', 'devops', 'ops']::text[]
              ORDER BY array_position(ARRAY['bima', 'arjuna']::text[], slug) NULLS LAST, slug LIMIT 1),
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL AND status = 'active'
              ORDER BY slug LIMIT 1 OFFSET 1),
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL AND status = 'active'
              ORDER BY slug LIMIT 1)
        ) AS infra,
        COALESCE(
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL
                AND modules && ARRAY['crm', 'reports', 'command-center']::text[]
              ORDER BY array_position(ARRAY['drupadi', 'kresna']::text[], slug) NULLS LAST, slug LIMIT 1),
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL AND status = 'active'
              ORDER BY slug LIMIT 1 OFFSET 2),
            (SELECT id::text FROM aos_agents
              WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND archived_at IS NULL AND status = 'active'
              ORDER BY slug LIMIT 1)
        ) AS comms
) a
WHERE NOT EXISTS (
    SELECT 1 FROM aos_workflows
    WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND name = 'Major incident response'
);

-- New table / columns must be visible to PostgREST right away.
NOTIFY pgrst, 'reload schema';
