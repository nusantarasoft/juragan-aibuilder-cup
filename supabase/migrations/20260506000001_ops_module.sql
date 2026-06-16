-- Operations Module — Recurring task management
-- Playbooks, steps, runs, schedules for operational workflows

-- ─── Playbooks (reusable task templates) ─────────────────
CREATE TABLE IF NOT EXISTS ops_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
    estimated_minutes INT DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Playbook Steps ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ops_playbook_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES ops_playbooks(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,
    step_type TEXT DEFAULT 'task' CHECK (step_type IN ('task','approval','check','notification')),
    is_required BOOLEAN DEFAULT true,
    default_assignee_id TEXT,
    estimated_minutes INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Runs (instances of playbook execution) ──────────────
CREATE TABLE IF NOT EXISTS ops_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    playbook_id UUID NOT NULL REFERENCES ops_playbooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled','failed')),
    started_by TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    notes TEXT,
    schedule_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Run Steps (step-level progress) ────────────────────
CREATE TABLE IF NOT EXISTS ops_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES ops_runs(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES ops_playbook_steps(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','failed')),
    assignee_id TEXT,
    assignee_name TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    completed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Schedules (recurring execution) ────────────────────
CREATE TABLE IF NOT EXISTS ops_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    playbook_id UUID NOT NULL REFERENCES ops_playbooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    timezone TEXT DEFAULT 'Asia/Jakarta',
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    auto_assign_to TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ops_playbooks_tenant ON ops_playbooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ops_runs_tenant ON ops_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ops_runs_status ON ops_runs(status);
CREATE INDEX IF NOT EXISTS idx_ops_runs_playbook ON ops_runs(playbook_id);
CREATE INDEX IF NOT EXISTS idx_ops_run_steps_run ON ops_run_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_ops_schedules_tenant ON ops_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ops_schedules_active ON ops_schedules(is_active, next_run_at);

-- ─── RLS ────────────────────────────────────────────────
ALTER TABLE ops_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_playbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON ops_playbooks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ops_playbook_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ops_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ops_run_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ops_schedules FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE ops_playbooks IS 'Reusable operational playbook templates';
COMMENT ON TABLE ops_runs IS 'Instances of playbook execution';
COMMENT ON TABLE ops_schedules IS 'Recurring schedule definitions for automatic playbook runs';
