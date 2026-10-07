-- =============================================================================
-- Agentic OS (MAPS framework: Memory · Agent · Pulse · Screen)
-- Agent customization, playbooks, task queue, memory map, routines, run log,
-- approvals and audit for the AI agents shown in the 3D Virtual Office.
--
-- Rules carried into the schema:
--   * agents never mark tasks done — finished work lands in 'review' and a human
--     sets 'done' (completed_by)
--   * aos_audit_log is append-only (trigger blocks UPDATE/DELETE)
--   * nothing is hard-deleted from the UI — config rows use archived_at
-- =============================================================================

-- ── Settings (per tenant): caps, budgets, kill switch ─────────────────────────
CREATE TABLE IF NOT EXISTS aos_settings (
    tenant_id               TEXT PRIMARY KEY,
    daily_run_ceiling       INT NOT NULL DEFAULT 50,
    rolling_window_minutes  INT NOT NULL DEFAULT 60,
    rolling_window_ceiling  INT NOT NULL DEFAULT 15,
    monthly_token_budget    BIGINT NOT NULL DEFAULT 200000,
    kill_switch             BOOLEAN NOT NULL DEFAULT FALSE,
    autopilot               BOOLEAN NOT NULL DEFAULT TRUE,
    autopilot_review_cap    INT NOT NULL DEFAULT 3,
    step_seconds            INT NOT NULL DEFAULT 15,
    default_runner          TEXT NOT NULL DEFAULT 'cloud',
    default_provider        TEXT,
    default_model           TEXT,
    require_approval_for    TEXT[] NOT NULL DEFAULT ARRAY['send', 'share', 'delete', 'payment']::text[],
    updated_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── A · Agents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aos_agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    slug                TEXT NOT NULL,
    name                TEXT NOT NULL,
    role                TEXT NOT NULL DEFAULT '',
    description         TEXT NOT NULL DEFAULT '',
    persona             TEXT NOT NULL DEFAULT '',
    system_prompt       TEXT NOT NULL DEFAULT '',
    provider            TEXT NOT NULL DEFAULT 'default',     -- default = AI Studio settings
    model               TEXT NOT NULL DEFAULT 'default',
    model_tier          TEXT NOT NULL DEFAULT 'medium'  CHECK (model_tier IN ('small', 'medium', 'large')),
    temperature         NUMERIC(3,2) NOT NULL DEFAULT 0.30,
    effort              TEXT NOT NULL DEFAULT 'medium'  CHECK (effort IN ('low', 'medium', 'high')),
    color               TEXT NOT NULL DEFAULT '#38bdf8',
    avatar              JSONB NOT NULL DEFAULT '{}'::jsonb,
    zone                TEXT NOT NULL DEFAULT 'engineering',
    desk_id             TEXT,
    modules             TEXT[] NOT NULL DEFAULT '{}'::text[],
    skills              TEXT[] NOT NULL DEFAULT '{}'::text[],
    tools               TEXT[] NOT NULL DEFAULT '{}'::text[],
    permissions         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { moduleId: read|draft|write|approve }
    guardrails          JSONB NOT NULL DEFAULT '{"denySend": true, "denyShare": true, "denyDelete": true, "requireApproval": []}'::jsonb,
    memory_scope        TEXT[] NOT NULL DEFAULT '{}'::text[], -- aos_memory_areas.slug
    runner              TEXT NOT NULL DEFAULT 'cloud'   CHECK (runner IN ('cloud', 'browser')),
    daily_token_budget  INT NOT NULL DEFAULT 500000,
    daily_run_budget    INT NOT NULL DEFAULT 20,
    status              TEXT NOT NULL DEFAULT 'active'  CHECK (status IN ('active', 'paused', 'offline')),
    version             INT NOT NULL DEFAULT 1,
    stats               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by          UUID,
    archived_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_aos_agents_tenant ON aos_agents(tenant_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS aos_agent_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID NOT NULL REFERENCES aos_agents(id) ON DELETE CASCADE,
    version     INT NOT NULL,
    snapshot    JSONB NOT NULL,
    change_note TEXT,
    changed_by  UUID,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (agent_id, version)
);

-- ── Playbooks (task templates per module) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS aos_playbooks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    agent_id            UUID REFERENCES aos_agents(id) ON DELETE SET NULL, -- NULL = shared
    module_id           TEXT NOT NULL,
    route               TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    steps               JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority            TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    estimated_minutes   INT NOT NULL DEFAULT 10,
    requires_approval   BOOLEAN NOT NULL DEFAULT FALSE,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INT NOT NULL DEFAULT 0,
    created_by          UUID,
    archived_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aos_playbooks_module ON aos_playbooks(tenant_id, module_id);

-- ── M · Memory map (master map → areas → signpost sections → items) ───────────
CREATE TABLE IF NOT EXISTS aos_memory_areas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    slug            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    color           TEXT NOT NULL DEFAULT '#818cf8',
    owner_agent_id  UUID REFERENCES aos_agents(id) ON DELETE SET NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS aos_memory_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    area_id             UUID NOT NULL REFERENCES aos_memory_areas(id) ON DELETE CASCADE,
    section             TEXT NOT NULL DEFAULT 'memory'
                        CHECK (section IN ('projects', 'state', 'skills', 'memory', 'routines', 'not_here')),
    kind                TEXT NOT NULL DEFAULT 'note'
                        CHECK (kind IN ('page', 'doc', 'kb', 'note', 'fact', 'skill', 'link')),
    title               TEXT NOT NULL,
    path                TEXT,
    note                TEXT NOT NULL DEFAULT '',
    content             TEXT NOT NULL DEFAULT '',
    tags                TEXT[] NOT NULL DEFAULT '{}'::text[],
    pinned              BOOLEAN NOT NULL DEFAULT FALSE,
    agent_ids           UUID[] NOT NULL DEFAULT '{}'::uuid[],
    health              TEXT NOT NULL DEFAULT 'unknown' CHECK (health IN ('ok', 'stale', 'broken', 'unknown')),
    last_verified_at    TIMESTAMPTZ,
    created_by          UUID,
    archived_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aos_memory_items_area ON aos_memory_items(area_id);

-- ── P · Pulse: routines, run queue, append-only run log ───────────────────────
CREATE TABLE IF NOT EXISTS aos_routines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    agent_id        UUID REFERENCES aos_agents(id) ON DELETE SET NULL,
    cron            TEXT NOT NULL DEFAULT '0 7 * * 1-5',
    timezone        TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    runner          TEXT NOT NULL DEFAULT 'cloud' CHECK (runner IN ('cloud', 'browser')),
    kind            TEXT NOT NULL DEFAULT 'prompt' CHECK (kind IN ('prompt', 'playbook', 'check')),
    playbook_id     UUID REFERENCES aos_playbooks(id) ON DELETE SET NULL,
    prompt          TEXT NOT NULL DEFAULT '',
    model           TEXT,
    effort          TEXT NOT NULL DEFAULT 'medium' CHECK (effort IN ('low', 'medium', 'high')),
    allowed_tools   TEXT[] NOT NULL DEFAULT '{}'::text[],
    max_turns       INT NOT NULL DEFAULT 8,
    timeout_seconds INT NOT NULL DEFAULT 300,
    output_target   TEXT NOT NULL DEFAULT 'activity'
                    CHECK (output_target IN ('activity', 'notification', 'memory', 'task')),
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    last_run_at     TIMESTAMPTZ,
    next_run_at     TIMESTAMPTZ,
    last_status     TEXT,
    created_by      UUID,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aos_workflows (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    trigger     TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual', 'routine', 'event')),
    graph       JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  UUID,
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tasks (instances / queue) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aos_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    agent_id        UUID REFERENCES aos_agents(id) ON DELETE SET NULL,
    playbook_id     UUID REFERENCES aos_playbooks(id) ON DELETE SET NULL,
    routine_id      UUID REFERENCES aos_routines(id) ON DELETE SET NULL,
    workflow_id     UUID REFERENCES aos_workflows(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    module_id       TEXT NOT NULL,
    route           TEXT NOT NULL,
    steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
    status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'running', 'awaiting_approval', 'review', 'done', 'failed', 'cancelled')),
    progress        NUMERIC(5,4) NOT NULL DEFAULT 0,
    priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    sort_order      INT NOT NULL DEFAULT 0,
    source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual', 'dispatch', 'routine', 'workflow', 'autopilot', 'seed')),
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    due_at          TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    completed_by    UUID,
    result          TEXT,
    error           TEXT,
    requested_by    UUID,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aos_tasks_agent_status ON aos_tasks(agent_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_aos_tasks_tenant_status ON aos_tasks(tenant_id, status);

CREATE TABLE IF NOT EXISTS aos_run_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    routine_id      UUID NOT NULL REFERENCES aos_routines(id) ON DELETE CASCADE,
    requested_by    UUID,
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    picked_at       TIMESTAMPTZ,
    run_id          UUID
);

CREATE TABLE IF NOT EXISTS aos_runs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    routine_id  UUID REFERENCES aos_routines(id) ON DELETE SET NULL,
    task_id     UUID REFERENCES aos_tasks(id) ON DELETE SET NULL,
    agent_id    UUID REFERENCES aos_agents(id) ON DELETE SET NULL,
    trigger     TEXT NOT NULL DEFAULT 'schedule'
                CHECK (trigger IN ('schedule', 'manual', 'queue', 'dispatch', 'workflow', 'autopilot')),
    provider    TEXT,
    model       TEXT,
    turns       INT NOT NULL DEFAULT 0,
    tokens_in   INT NOT NULL DEFAULT 0,
    tokens_out  INT NOT NULL DEFAULT 0,
    cost_usd    NUMERIC(10,4) NOT NULL DEFAULT 0,
    duration_ms INT,
    status      TEXT NOT NULL DEFAULT 'running'
                CHECK (status IN ('running', 'success', 'failed', 'blocked', 'timeout')),
    output      TEXT,
    error       TEXT,
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_aos_runs_started ON aos_runs(tenant_id, started_at DESC);

-- ── Governance: approvals + append-only audit log ─────────────────────────────
CREATE TABLE IF NOT EXISTS aos_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    task_id         UUID REFERENCES aos_tasks(id) ON DELETE CASCADE,
    agent_id        UUID REFERENCES aos_agents(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    summary         TEXT NOT NULL DEFAULT '',
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    decided_by      UUID,
    decided_at      TIMESTAMPTZ,
    comment         TEXT
);
CREATE INDEX IF NOT EXISTS idx_aos_approvals_status ON aos_approvals(tenant_id, status);

CREATE TABLE IF NOT EXISTS aos_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    actor_type  TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('user', 'agent', 'system')),
    actor_id    TEXT,
    action      TEXT NOT NULL,
    entity      TEXT NOT NULL,
    entity_id   TEXT,
    summary     TEXT NOT NULL DEFAULT '',
    level       TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'success', 'warning', 'error')),
    module_id   TEXT,
    route       TEXT,
    diff        JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aos_audit_created ON aos_audit_log(tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION aos_audit_log_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'aos_audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aos_audit_log_immutable ON aos_audit_log;
CREATE TRIGGER trg_aos_audit_log_immutable
    BEFORE UPDATE OR DELETE ON aos_audit_log
    FOR EACH ROW EXECUTE FUNCTION aos_audit_log_immutable();

-- ── updated_at maintenance ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION aos_touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['aos_settings', 'aos_agents', 'aos_playbooks', 'aos_memory_areas', 'aos_memory_items',
                             'aos_routines', 'aos_workflows', 'aos_tasks']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON %1$s', t);
        EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION aos_touch_updated_at()', t);
    END LOOP;
END $$;

-- ── RLS + grants (middleware uses the service role; reads allowed for signed-in users)
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['aos_settings', 'aos_agents', 'aos_agent_versions', 'aos_playbooks', 'aos_memory_areas',
                             'aos_memory_items', 'aos_routines', 'aos_workflows', 'aos_tasks', 'aos_run_queue',
                             'aos_runs', 'aos_approvals', 'aos_audit_log']
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

-- ── Seed: settings ────────────────────────────────────────────────────────────
INSERT INTO aos_settings (tenant_id) VALUES ('00000000-0000-0000-0000-000000000010') ON CONFLICT (tenant_id) DO NOTHING;

-- ── Seed: agents (from the Virtual Office demo roster) ──────────────────────
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'arjuna', 'Arjuna', 'DevOps Engineer', 'You are Arjuna, the DevOps Engineer of Nusantarasoft. You work in DevOps, Infrastructure. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'large', 'high', '#38bdf8', 'engineering', 'eng-1-a', ARRAY['devops', 'infrastructure']::text[], ARRAY['Docker', 'CI/CD', 'Kong', 'Observability']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"devops":"write","infrastructure":"draft"}'::jsonb, '{"tasksCompleted":37,"successRate":0.96,"avgLatencyMs":1400,"tokensToday":482000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'bima', 'Bima', 'Infrastructure Engineer', 'You are Bima, the Infrastructure Engineer of Nusantarasoft. You work in Infrastructure, DCIM. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'large', 'high', '#f97316', 'engineering', 'eng-1-b', ARRAY['infrastructure', 'dcim']::text[], ARRAY['Networking', 'Prometheus', 'Capacity planning']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"infrastructure":"write","dcim":"draft"}'::jsonb, '{"tasksCompleted":29,"successRate":0.93,"avgLatencyMs":1650,"tokensToday":391000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'nakula', 'Nakula', 'AI Quality Engineer', 'You are Nakula, the AI Quality Engineer of Nusantarasoft. You work in AI Studio, DevOps. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'medium', 'medium', '#22d3ee', 'engineering', 'eng-2-a', ARRAY['ai-studio', 'devops']::text[], ARRAY['Evals', 'Prompting', 'Playwright']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"ai-studio":"write","devops":"draft"}'::jsonb, '{"tasksCompleted":54,"successRate":0.98,"avgLatencyMs":820,"tokensToday":266000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'sadewa', 'Sadewa', 'Facilities Engineer', 'You are Sadewa, the Facilities Engineer of Nusantarasoft. You work in BMS, Inventory, DCIM. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'medium', 'medium', '#84cc16', 'engineering', 'eng-2-b', ARRAY['bms', 'inventory', 'dcim']::text[], ARRAY['HVAC', 'Energy', 'Work orders']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"bms":"write","inventory":"draft","dcim":"draft"}'::jsonb, '{"tasksCompleted":41,"successRate":0.95,"avgLatencyMs":960,"tokensToday":204000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'gatot', 'Gatotkaca', 'Security Analyst', 'You are Gatotkaca, the Security Analyst of Nusantarasoft. You work in Security. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'large', 'high', '#f43f5e', 'engineering', 'eng-3-a', ARRAY['security']::text[], ARRAY['SAST', 'Dependency audit', 'OWASP']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"security":"write"}'::jsonb, '{"tasksCompleted":18,"successRate":0.89,"avgLatencyMs":2100,"tokensToday":158000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'srikandi', 'Srikandi', 'Project Manager', 'You are Srikandi, the Project Manager of Nusantarasoft. You work in Projects, HR. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'large', 'high', '#ec4899', 'engineering', 'eng-3-b', ARRAY['pm', 'hr']::text[], ARRAY['Planning', 'Stakeholders', 'Hiring']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"pm":"write","hr":"draft"}'::jsonb, '{"tasksCompleted":63,"successRate":0.97,"avgLatencyMs":1100,"tokensToday":312000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'kresna', 'Kresna', 'Strategy Lead', 'You are Kresna, the Strategy Lead of Nusantarasoft. You work in Command Center, Reports. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'large', 'high', '#a855f7', 'research', 'res-1-a', ARRAY['command-center', 'reports']::text[], ARRAY['Strategy', 'Synthesis', 'KPIs']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"command-center":"write","reports":"draft"}'::jsonb, '{"tasksCompleted":22,"successRate":0.94,"avgLatencyMs":2400,"tokensToday":520000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'larasati', 'Larasati', 'Finance Analyst', 'You are Larasati, the Finance Analyst of Nusantarasoft. You work in Accounting, Reports. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'medium', 'medium', '#eab308', 'research', 'res-1-b', ARRAY['accounting', 'reports']::text[], ARRAY['Reconciliation', 'SQL', 'Forecasting']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"accounting":"write","reports":"draft"}'::jsonb, '{"tasksCompleted":33,"successRate":0.95,"avgLatencyMs":1300,"tokensToday":287000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'yudhis', 'Yudhistira', 'Knowledge Curator', 'You are Yudhistira, the Knowledge Curator of Nusantarasoft. You work in Knowledge Base, AI Studio. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'small', 'low', '#14b8a6', 'research', 'res-2-a', ARRAY['knowledge', 'ai-studio']::text[], ARRAY['RAG', 'Embeddings', 'Technical writing']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"knowledge":"write","ai-studio":"draft"}'::jsonb, '{"tasksCompleted":47,"successRate":0.99,"avgLatencyMs":540,"tokensToday":133000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'drupadi', 'Drupadi', 'Sales & Market Analyst', 'You are Drupadi, the Sales & Market Analyst of Nusantarasoft. You work in CRM, News Intel. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'large', 'high', '#fb7185', 'research', 'res-2-b', ARRAY['crm', 'news']::text[], ARRAY['Lead scoring', 'Web research', 'Copywriting']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"crm":"write","news":"draft"}'::jsonb, '{"tasksCompleted":26,"successRate":0.92,"avgLatencyMs":2600,"tokensToday":401000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'semar', 'Semar', 'Service Desk Agent', 'You are Semar, the Service Desk Agent of Nusantarasoft. You work in ITSM, Knowledge Base. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'medium', 'medium', '#60a5fa', 'operations', 'ops-1', ARRAY['itsm', 'knowledge']::text[], ARRAY['Triage', 'Customer comms', 'ITIL']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"itsm":"write","knowledge":"draft"}'::jsonb, '{"tasksCompleted":88,"successRate":0.97,"avgLatencyMs":700,"tokensToday":356000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'petruk', 'Petruk', 'Incident Commander', 'You are Petruk, the Incident Commander of Nusantarasoft. You work in Command Center, Ops Runbooks, ITSM. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'medium', 'medium', '#fb923c', 'operations', 'ops-2', ARRAY['command-center', 'ops', 'itsm']::text[], ARRAY['Runbooks', 'Escalation', 'Root cause']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"command-center":"write","ops":"draft","itsm":"draft"}'::jsonb, '{"tasksCompleted":15,"successRate":0.93,"avgLatencyMs":880,"tokensToday":91000}'::jsonb, 'active') ON CONFLICT (tenant_id, slug) DO NOTHING;
INSERT INTO aos_agents (tenant_id, slug, name, role, persona, model_tier, effort, color, zone, desk_id, modules, skills, tools, permissions, stats, status) VALUES ('00000000-0000-0000-0000-000000000010', 'gareng', 'Gareng', 'SCADA Monitoring Agent', 'You are Gareng, the SCADA Monitoring Agent of Nusantarasoft. You work in SCADA, BMS. Be concise, cite the module page you used, and never send, share or delete anything without human approval.', 'small', 'low', '#4ade80', 'operations', 'ops-3', ARRAY['scada', 'bms']::text[], ARRAY['Alarms', 'Sensor trends', 'Field dispatch']::text[], ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[], '{"scada":"write","bms":"draft"}'::jsonb, '{"tasksCompleted":9,"successRate":0.99,"avgLatencyMs":300,"tokensToday":0}'::jsonb, 'offline') ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ── Seed: shared playbooks (one per module task script) ─────────────────────
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'itsm', '/admin/itsm/tickets', 'Resolve INC-2041 (login loop)', '["Open INC-2041 in the queue","Review the user''s session logs","Link to known problem PRB-118","Post workaround to requester","Set status to Resolved"]'::jsonb, 0, 10 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Resolve INC-2041 (login loop)');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'itsm', '/admin/itsm/requests', 'Triage 6 new service requests', '["Filter unassigned requests","Categorise by service","Set priority from SLA matrix","Assign resolver groups","Notify requesters"]'::jsonb, 1, 10 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Triage 6 new service requests');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'itsm', '/admin/itsm/sla-monitor', 'Check SLA breaches for today', '["Open the SLA monitor","Find tickets at risk","Escalate 2 breaching tickets","Log escalation notes"]'::jsonb, 2, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Check SLA breaches for today');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'itsm', '/admin/itsm/problems', 'Root-cause analysis for PRB-118', '["Open PRB-118","Group linked incidents","Identify the common cause","Propose a permanent fix"]'::jsonb, 3, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Root-cause analysis for PRB-118');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'knowledge', '/admin/itsm/knowledge', 'Draft KB article from INC-2041', '["Collect resolution notes","Draft the article","Add screenshots & tags","Submit for review"]'::jsonb, 4, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Draft KB article from INC-2041');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'command-center', '/admin/analytics/command-center', 'Morning situation report', '["Open the Command Center","Scan critical alerts","Compare KPIs vs yesterday","Publish summary to the team"]'::jsonb, 5, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Morning situation report');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'command-center', '/admin/analytics/command-center', 'Investigate red KPI: API latency', '["Drill into the latency tile","Correlate with deployments","Ping the on-call agent","Annotate the KPI"]'::jsonb, 6, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Investigate red KPI: API latency');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'ops', '/admin/ops/runs', 'Run ''restart-kong'' playbook', '["Select playbook restart-kong","Run pre-checks","Execute the playbook","Verify health checks","Attach run log to incident"]'::jsonb, 7, 10 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Run ''restart-kong'' playbook');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'ops', '/admin/ops/system-health', 'Nightly system health review', '["Open system health","Check failed jobs","Re-run 2 failed schedules","Record findings"]'::jsonb, 8, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Nightly system health review');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'devops', '/admin/devops/pipelines', 'Rebuild admin container & smoke test', '["Trigger the admin pipeline","Watch build stages","Run smoke tests","Promote to staging"]'::jsonb, 9, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Rebuild admin container & smoke test');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'devops', '/admin/devops/pipelines', 'Fix failing test stage in pipeline #812', '["Open pipeline #812","Read the failing job log","Patch the flaky test","Re-run the pipeline"]'::jsonb, 10, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Fix failing test stage in pipeline #812');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'devops', '/admin/devops/deployments', 'Roll out release 3.8 to staging', '["Open deployments","Review the release diff","Deploy to staging","Verify canary metrics"]'::jsonb, 11, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Roll out release 3.8 to staging');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'infrastructure', '/admin/infrastructure/api-gateway', 'Investigate 5xx spike on Kong', '["Open API gateway metrics","Filter 5xx by route","Inspect upstream health","Raise rate limit on /graphql","Confirm recovery"]'::jsonb, 12, 10 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Investigate 5xx spike on Kong');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'infrastructure', '/admin/infrastructure/prometheus', 'Tune Prometheus alert thresholds', '["Open alert rules","Review noisy alerts","Adjust thresholds","Reload configuration"]'::jsonb, 13, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Tune Prometheus alert thresholds');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'security', '/admin/security/pentest', 'Dependency audit — 2 critical CVEs', '["Load the latest scan","Triage findings by severity","Verify exploitability","Raise remediation tickets"]'::jsonb, 14, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Dependency audit — 2 critical CVEs');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'security', '/admin/security/audit-trail', 'Review privileged logins this week', '["Open the audit trail","Filter admin sessions","Flag unusual locations","Notify the security lead"]'::jsonb, 15, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Review privileged logins this week');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'dcim', '/admin/dcim/capacity', 'Plan capacity for 4 new racks', '["Open capacity planner","Check power headroom","Check cooling headroom","Propose rack positions"]'::jsonb, 16, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Plan capacity for 4 new racks');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'dcim', '/admin/dcim/power', 'Audit power usage on PDU row B', '["Open power view","Compare PDU loads","Flag overloaded circuits","Suggest rebalancing"]'::jsonb, 17, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Audit power usage on PDU row B');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'bms', '/admin/bms/hvac', 'Optimise HVAC schedule for the weekend', '["Open HVAC zones","Review occupancy forecast","Adjust setpoints","Publish schedule"]'::jsonb, 18, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Optimise HVAC schedule for the weekend');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'bms', '/admin/bms/energy', 'Investigate energy spike in Tower A', '["Open energy dashboard","Drill into Tower A","Find the anomalous meter","Create a work order"]'::jsonb, 19, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Investigate energy spike in Tower A');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'scada', '/admin/scada/alarms', 'Acknowledge pump station alarms', '["Open active alarms","Check pressure trends","Acknowledge & annotate","Dispatch field technician"]'::jsonb, 20, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Acknowledge pump station alarms');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'pm', '/admin/pm/backlog', 'Groom sprint 24 backlog', '["Open the backlog","Split oversized stories","Estimate with history","Re-order by priority"]'::jsonb, 21, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Groom sprint 24 backlog');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'pm', '/admin/pm/roadmap', 'Update roadmap for AI Studio', '["Open the roadmap","Move slipped milestones","Add dependency links","Share with stakeholders"]'::jsonb, 22, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Update roadmap for AI Studio');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'hr', '/admin/hr/recruitment', 'Screen 12 applicants for DevOps role', '["Open the requisition","Parse CVs","Score against criteria","Shortlist top 4"]'::jsonb, 23, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Screen 12 applicants for DevOps role');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'reports', '/admin/reports/executive', 'Build Q3 executive report', '["Open executive reports","Pull revenue & SLA data","Build charts","Write highlights","Schedule delivery"]'::jsonb, 24, 10 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Build Q3 executive report');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'accounting', '/admin/accounting/reconciliation', 'Reconcile September bank statements', '["Import bank statement","Auto-match transactions","Review 9 unmatched items","Post adjustments"]'::jsonb, 25, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Reconcile September bank statements');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'accounting', '/admin/accounting/receivables', 'Flag overdue receivables', '["Open receivables aging","Filter > 60 days","Draft reminder emails","Update collection notes"]'::jsonb, 26, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Flag overdue receivables');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'crm', '/admin/crm/pipeline', 'Score new leads in the pipeline', '["Open the pipeline","Enrich company data","Score fit & intent","Assign owners"]'::jsonb, 27, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Score new leads in the pipeline');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'crm', '/admin/crm/quotes', 'Prepare quote for PT Maju Jaya', '["Open quotes","Select product bundle","Apply volume discount","Send for approval"]'::jsonb, 28, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Prepare quote for PT Maju Jaya');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'news', '/admin/news/sentiment', 'Competitive scan: CMS platforms in SEA', '["Crawl latest sources","Cluster competitor news","Score sentiment","Write the brief"]'::jsonb, 29, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Competitive scan: CMS platforms in SEA');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'ai-studio', '/admin/ai-studio/advanced/playground', 'Evaluate prompts for the support bot', '["Open the playground","Load 50 test questions","Run A/B prompts","Save the winning prompt"]'::jsonb, 30, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Evaluate prompts for the support bot');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'ai-studio', '/admin/ai-studio/knowledge-graph', 'Re-index the knowledge graph', '["Open knowledge graph","Detect stale nodes","Re-embed documents","Validate relations"]'::jsonb, 31, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Re-index the knowledge graph');
INSERT INTO aos_playbooks (tenant_id, module_id, route, title, steps, sort_order, estimated_minutes) SELECT '00000000-0000-0000-0000-000000000010', 'inventory', '/admin/inventory/stock', 'Reorder low-stock spare parts', '["Open stock levels","Find items below reorder point","Draft purchase requests","Notify procurement"]'::jsonb, 32, 8 WHERE NOT EXISTS (SELECT 1 FROM aos_playbooks WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Reorder low-stock spare parts');

-- ── Seed: one queued task per agent so the office starts busy ───────────────
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Rebuild admin container & smoke test' WHERE ag.slug = 'arjuna' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Investigate 5xx spike on Kong' WHERE ag.slug = 'bima' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Evaluate prompts for the support bot' WHERE ag.slug = 'nakula' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Investigate energy spike in Tower A' WHERE ag.slug = 'sadewa' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Dependency audit — 2 critical CVEs' WHERE ag.slug = 'gatot' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Reconcile September bank statements' WHERE ag.slug = 'larasati' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Score new leads in the pipeline' WHERE ag.slug = 'drupadi' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Resolve INC-2041 (login loop)' WHERE ag.slug = 'semar' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);
INSERT INTO aos_tasks (tenant_id, agent_id, playbook_id, title, module_id, route, steps, status, source) SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.module_id, pb.route, pb.steps, 'queued', 'seed' FROM aos_agents ag JOIN aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Morning situation report' WHERE ag.slug = 'petruk' AND NOT EXISTS (SELECT 1 FROM aos_tasks t WHERE t.agent_id = ag.id);

-- ── Seed: memory map (areas + a few signpost items) ───────────────────────────
INSERT INTO aos_memory_areas (tenant_id, slug, name, description, color, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000010', 'service-desk', 'Service Desk',        'Tickets, requests, SLAs and the knowledge base',          '#38bdf8', 1),
    ('00000000-0000-0000-0000-000000000010', 'operations',   'Operations',          'Command Center, runbooks and infrastructure monitoring', '#818cf8', 2),
    ('00000000-0000-0000-0000-000000000010', 'engineering',  'Engineering',         'Pipelines, deployments and AI Studio',                   '#84cc16', 3),
    ('00000000-0000-0000-0000-000000000010', 'facilities',   'Facilities',          'DCIM, BMS and SCADA',                                    '#facc15', 4),
    ('00000000-0000-0000-0000-000000000010', 'business',     'Business',            'Finance, CRM, HR, projects, reports and inventory',      '#34d399', 5),
    ('00000000-0000-0000-0000-000000000010', 'security',     'Security',            'Pentest findings and audit trail',                       '#f43f5e', 6)
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO aos_memory_items (tenant_id, area_id, section, kind, title, path, note, pinned)
SELECT a.tenant_id, a.id, v.section, v.kind, v.title, v.path, v.note, v.pinned
FROM (VALUES
    ('service-desk', 'projects', 'page', 'Ticket queue',            '/admin/itsm/tickets',               'Where incidents live',                   TRUE),
    ('service-desk', 'state',    'page', 'SLA monitor',             '/admin/itsm/sla-monitor',           'Tickets at risk of breaching',           FALSE),
    ('service-desk', 'memory',   'kb',   'Knowledge base',          '/admin/itsm/knowledge',             'Resolved fixes become articles here',    FALSE),
    ('operations',   'state',    'page', 'Command Center',          '/admin/analytics/command-center',   'Single pane of glass for KPIs & alerts', TRUE),
    ('operations',   'routines', 'page', 'Ops runbook runs',        '/admin/ops/runs',                   'Playbook execution history',             FALSE),
    ('operations',   'state',    'page', 'API gateway metrics',     '/admin/infrastructure/api-gateway', 'Kong 5xx / latency',                     FALSE),
    ('engineering',  'projects', 'page', 'Pipelines',               '/admin/devops/pipelines',           'CI/CD for every service',                TRUE),
    ('engineering',  'skills',   'page', 'AI Studio playground',    '/admin/ai-studio/advanced/playground', 'Prompt evaluation',                   FALSE),
    ('facilities',   'state',    'page', 'Energy dashboard',        '/admin/bms/energy',                 'Building consumption',                   FALSE),
    ('facilities',   'state',    'page', 'SCADA alarms',            '/admin/scada/alarms',               'Active field alarms',                    FALSE),
    ('business',     'projects', 'page', 'Sales pipeline',          '/admin/crm/pipeline',               'Deals and leads',                        FALSE),
    ('business',     'state',    'page', 'Bank reconciliation',     '/admin/accounting/reconciliation',  'Month-end close',                        FALSE),
    ('security',     'state',    'page', 'Pentest findings',        '/admin/security/pentest',           'Latest scan results',                    TRUE),
    ('security',     'not_here', 'note', 'Secrets',                 NULL,                                'Credentials are never stored in agent memory', FALSE)
) AS v(area, section, kind, title, path, note, pinned)
JOIN aos_memory_areas a ON a.slug = v.area AND a.tenant_id = '00000000-0000-0000-0000-000000000010'
WHERE NOT EXISTS (SELECT 1 FROM aos_memory_items i WHERE i.area_id = a.id AND i.title = v.title);

-- ── Seed: starter routines (disabled until you enable them in Pulse) ──────────
INSERT INTO aos_routines (tenant_id, name, description, agent_id, cron, kind, prompt, output_target, effort, max_turns)
SELECT ag.tenant_id, 'Morning digest', 'What happened overnight, what is due today and who is waiting on us.', ag.id,
       '0 7 * * 1-5', 'prompt',
       'Summarise overnight incidents, SLA risks, failed jobs and approvals waiting for a human. Keep it under 12 bullet points, grouped by module.',
       'notification', 'medium', 6
FROM aos_agents ag WHERE ag.slug = 'petruk'
  AND NOT EXISTS (SELECT 1 FROM aos_routines r WHERE r.name = 'Morning digest');

INSERT INTO aos_routines (tenant_id, name, description, agent_id, cron, kind, playbook_id, output_target, effort, max_turns)
SELECT ag.tenant_id, 'SLA watch', 'Every 30 minutes, escalate tickets that are about to breach.', ag.id,
       '*/30 * * * *', 'playbook', pb.id, 'task', 'low', 4
FROM aos_agents ag JOIN aos_playbooks pb ON pb.title = 'Check SLA breaches for today'
WHERE ag.slug = 'semar'
  AND NOT EXISTS (SELECT 1 FROM aos_routines r WHERE r.name = 'SLA watch');

INSERT INTO aos_routines (tenant_id, name, description, agent_id, cron, kind, output_target, effort, max_turns)
SELECT ag.tenant_id, 'Nightly memory map check', 'Deterministic check: every signpost points to a page or document that still exists.', ag.id,
       '0 2 * * *', 'check', 'memory', 'low', 1
FROM aos_agents ag WHERE ag.slug = 'yudhis'
  AND NOT EXISTS (SELECT 1 FROM aos_routines r WHERE r.name = 'Nightly memory map check');

INSERT INTO aos_audit_log (tenant_id, actor_type, action, entity, summary, level)
VALUES ('00000000-0000-0000-0000-000000000010', 'system', 'install', 'agentic_os', 'Agentic OS installed with 13 agents and shared playbooks', 'success');

NOTIFY pgrst, 'reload schema';
