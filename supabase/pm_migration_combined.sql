-- ==========================================
-- PM Module Complete Migration (Combined)
-- For nusantarasoft database
-- tenant_id is TEXT (no FK to tenants)
-- ==========================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS pm_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    project_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(50) DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    spent DECIMAL(15, 2) DEFAULT 0,
    owner_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_tenant ON pm_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_status ON pm_projects(status);

-- 2. Sprints Table
CREATE TABLE IF NOT EXISTS pm_sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_sprints_project ON pm_sprints(project_id);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS pm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES pm_sprints(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    type VARCHAR(50) DEFAULT 'task',
    assignee_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    logged_hours DECIMAL(10, 2) DEFAULT 0,
    due_date DATE,
    tags JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_sprint ON pm_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);

-- 4. Time Logs Table
CREATE TABLE IF NOT EXISTS pm_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    hours DECIMAL(10, 2) NOT NULL,
    log_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_time_logs_task ON pm_time_logs(task_id);

-- Auto-numbering Trigger for Projects
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(project_number, '\D', '', 'g'), '')::INT), 0) + 1
    INTO next_num
    FROM pm_projects
    WHERE tenant_id = NEW.tenant_id AND project_number LIKE 'PRJ-%';

    NEW.project_number := 'PRJ-' || LPAD(next_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_project_number ON pm_projects;
CREATE TRIGGER trigger_generate_project_number
BEFORE INSERT ON pm_projects
FOR EACH ROW
WHEN (NEW.project_number IS NULL)
EXECUTE FUNCTION generate_project_number();

-- PMBOK 6 Extensions
ALTER TABLE IF EXISTS pm_projects
ADD COLUMN IF NOT EXISTS methodology VARCHAR(50) DEFAULT 'hybrid',
ADD COLUMN IF NOT EXISTS pmbok_scope_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_schedule_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_cost_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_quality_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_resource_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_comms_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_risk_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_procurement_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_stakeholder_enabled BOOLEAN DEFAULT FALSE;

-- Project Charters (Integration Management)
CREATE TABLE IF NOT EXISTS pm_project_charters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    purpose TEXT,
    objectives TEXT,
    high_level_requirements TEXT,
    high_level_risks TEXT,
    summary_milestone_schedule TEXT,
    preapproved_financial_resources TEXT,
    key_stakeholders TEXT,
    project_approval_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_charters_project ON pm_project_charters(project_id);

-- Risk Registers (Risk Management)
CREATE TABLE IF NOT EXISTS pm_risk_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    risk_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    probability INT DEFAULT 1,
    impact INT DEFAULT 1,
    risk_score INT GENERATED ALWAYS AS (probability * impact) STORED,
    mitigation_strategy TEXT,
    contingency_plan TEXT,
    status VARCHAR(50) DEFAULT 'identified',
    owner_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_risk_registers_project ON pm_risk_registers(project_id);

-- Earned Value Management (Cost Management)
CREATE TABLE IF NOT EXISTS pm_earned_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    planned_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    earned_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    actual_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    schedule_variance DECIMAL(15, 2) GENERATED ALWAYS AS (earned_value - planned_value) STORED,
    cost_variance DECIMAL(15, 2) GENERATED ALWAYS AS (earned_value - actual_cost) STORED,
    schedule_performance_index DECIMAL(15, 4),
    cost_performance_index DECIMAL(15, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_earned_values_project ON pm_earned_values(project_id);

-- ═══════════════════════════════════════════════════════════
-- V2: Additional PMBOK knowledge areas
-- ═══════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS pm_projects
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'initiating',
ADD COLUMN IF NOT EXISTS percent_complete NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_at_completion NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS estimate_at_completion NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS estimate_to_complete NUMERIC(15,2);

-- ─── SCOPE MANAGEMENT ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_scope_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    project_objectives TEXT,
    product_scope_description TEXT,
    deliverables TEXT,
    acceptance_criteria TEXT,
    exclusions TEXT,
    constraints TEXT,
    assumptions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_scope_project ON pm_scope_statements(project_id);

CREATE TABLE IF NOT EXISTS pm_wbs_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    parent_id UUID REFERENCES pm_wbs_items(id) ON DELETE CASCADE,
    wbs_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to VARCHAR(255),
    estimated_cost NUMERIC(15,2),
    actual_cost NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_wbs_project ON pm_wbs_items(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_wbs_parent ON pm_wbs_items(parent_id);

CREATE TABLE IF NOT EXISTS pm_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    requirement_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    source VARCHAR(255),
    wbs_item_id UUID REFERENCES pm_wbs_items(id) ON DELETE SET NULL,
    test_case TEXT,
    verification_method VARCHAR(100),
    status VARCHAR(50) DEFAULT 'identified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_requirements_project ON pm_requirements(project_id);

-- ─── SCHEDULE MANAGEMENT ───────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    completed_date DATE,
    percent_complete NUMERIC(5,2) DEFAULT 0,
    is_critical BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_milestones_project ON pm_milestones(project_id);

CREATE TABLE IF NOT EXISTS pm_task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    predecessor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(10) DEFAULT 'FS',
    lag_days INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(predecessor_id, successor_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_deps_project ON pm_task_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_deps_predecessor ON pm_task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_pm_deps_successor ON pm_task_dependencies(successor_id);

-- ─── QUALITY MANAGEMENT ────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    target_value NUMERIC(15,4),
    actual_value NUMERIC(15,4),
    tolerance_lower NUMERIC(15,4),
    tolerance_upper NUMERIC(15,4),
    measurement_method TEXT,
    frequency VARCHAR(50),
    status VARCHAR(50) DEFAULT 'on_track',
    last_measured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_metrics_project ON pm_quality_metrics(project_id);

CREATE TABLE IF NOT EXISTS pm_quality_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    checklist_name VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable VARCHAR(255),
    items JSONB DEFAULT '[]'::jsonb,
    inspector VARCHAR(255),
    inspection_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_checklists_project ON pm_quality_checklists(project_id);

CREATE TABLE IF NOT EXISTS pm_quality_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    inspection_type VARCHAR(100),
    deliverable VARCHAR(255),
    inspector VARCHAR(255),
    inspection_date DATE,
    findings TEXT,
    corrective_actions TEXT,
    result VARCHAR(50) DEFAULT 'pending',
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_inspections_project ON pm_quality_inspections(project_id);

-- ─── RESOURCE MANAGEMENT ───────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_resource_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    resource_type VARCHAR(50) DEFAULT 'human',
    allocation_percent NUMERIC(5,2) DEFAULT 100,
    hourly_rate NUMERIC(10,2),
    start_date DATE,
    end_date DATE,
    availability_hours NUMERIC(10,2),
    planned_hours NUMERIC(10,2),
    actual_hours NUMERIC(10,2),
    skills TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_resource_plans_project ON pm_resource_plans(project_id);

CREATE TABLE IF NOT EXISTS pm_raci_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    deliverable VARCHAR(255) NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    role_type VARCHAR(1) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_raci_project ON pm_raci_matrix(project_id);

-- ─── COMMUNICATIONS MANAGEMENT ─────────────────────────────

CREATE TABLE IF NOT EXISTS pm_comm_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    communication_item VARCHAR(255) NOT NULL,
    target_audience VARCHAR(255),
    frequency VARCHAR(50),
    method VARCHAR(100),
    responsible_person VARCHAR(255),
    key_message TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_comm_plans_project ON pm_comm_plans(project_id);

CREATE TABLE IF NOT EXISTS pm_status_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    report_date DATE NOT NULL,
    report_period VARCHAR(100),
    overall_health VARCHAR(50) DEFAULT 'green',
    schedule_health VARCHAR(50) DEFAULT 'green',
    cost_health VARCHAR(50) DEFAULT 'green',
    scope_health VARCHAR(50) DEFAULT 'green',
    accomplishments TEXT,
    planned_activities TEXT,
    issues_and_risks TEXT,
    decisions_needed TEXT,
    key_metrics TEXT,
    prepared_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_status_reports_project ON pm_status_reports(project_id);

CREATE TABLE IF NOT EXISTS pm_meeting_minutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    meeting_type VARCHAR(100),
    meeting_date TIMESTAMPTZ NOT NULL,
    title VARCHAR(255) NOT NULL,
    attendees TEXT,
    agenda TEXT,
    discussion TEXT,
    decisions TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    next_meeting_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_meeting_minutes_project ON pm_meeting_minutes(project_id);

-- ─── PROCUREMENT MANAGEMENT ────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_procurement_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT NOT NULL,
    contract_type VARCHAR(50),
    budget_allocated NUMERIC(15,2),
    description TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_procurement_links_project ON pm_procurement_links(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_procurement_links_entity ON pm_procurement_links(entity_type, entity_id);

-- ─── STAKEHOLDER MANAGEMENT ────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    organization VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    interest_level INT DEFAULT 3,
    power_level INT DEFAULT 3,
    current_engagement VARCHAR(50),
    desired_engagement VARCHAR(50),
    communication_needs TEXT,
    influence_strategy TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_stakeholders_project ON pm_stakeholders(project_id);

-- ─── INTEGRATION MANAGEMENT (Change Control + Lessons) ─────

CREATE TABLE IF NOT EXISTS pm_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    change_number VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT,
    impact_scope TEXT,
    impact_schedule TEXT,
    impact_cost TEXT,
    impact_quality TEXT,
    requested_by VARCHAR(255),
    requested_date DATE,
    reviewed_by VARCHAR(255),
    decision VARCHAR(50) DEFAULT 'pending',
    decision_date DATE,
    decision_notes TEXT,
    implementation_notes TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_change_requests_project ON pm_change_requests(project_id);

CREATE TABLE IF NOT EXISTS pm_lessons_learned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    category VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    situation TEXT,
    impact TEXT,
    lesson TEXT,
    recommendation TEXT,
    submitted_by VARCHAR(255),
    submitted_date DATE,
    phase VARCHAR(50),
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_lessons_learned_project ON pm_lessons_learned(project_id);

-- ─── GRANT PERMISSIONS ─────────────────────────────────────
-- PostgREST needs permissions for the anon and authenticated roles

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
