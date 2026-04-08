-- ==========================================
-- PMBOK 6 Complete Knowledge Areas Schema V2
-- Safe to re-run (idempotent)
-- ==========================================

-- ─── ALTER PM_PROJECTS ─────────────────────────────────────
ALTER TABLE IF EXISTS pm_projects
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'initiating',              -- initiating/planning/executing/monitoring/closing
ADD COLUMN IF NOT EXISTS percent_complete NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_at_completion NUMERIC(15,2),          -- BAC
ADD COLUMN IF NOT EXISTS estimate_at_completion NUMERIC(15,2),        -- EAC
ADD COLUMN IF NOT EXISTS estimate_to_complete NUMERIC(15,2);          -- ETC


-- ═══════════════════════════════════════════════════════════
-- ─── SCOPE MANAGEMENT ──────────────────────────────────────
-- ═══════════════════════════════════════════════════════════

-- Scope Statement (one per project)
CREATE TABLE IF NOT EXISTS pm_scope_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_objectives TEXT,
    product_scope_description TEXT,
    deliverables TEXT,                    -- JSON array or markdown list
    acceptance_criteria TEXT,
    exclusions TEXT,
    constraints TEXT,
    assumptions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_scope_project ON pm_scope_statements(project_id);

-- Work Breakdown Structure (hierarchical)
CREATE TABLE IF NOT EXISTS pm_wbs_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pm_wbs_items(id) ON DELETE CASCADE,
    wbs_code VARCHAR(50) NOT NULL,        -- e.g. "1.2.3"
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    assigned_to VARCHAR(255),
    estimated_cost NUMERIC(15,2),
    actual_cost NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_wbs_project ON pm_wbs_items(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_wbs_parent ON pm_wbs_items(parent_id);

-- Requirements Traceability Matrix
CREATE TABLE IF NOT EXISTS pm_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requirement_id VARCHAR(50) NOT NULL,  -- e.g. "REQ-001"
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),                -- functional, non-functional, business, compliance
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    source VARCHAR(255),                  -- who requested it
    wbs_item_id UUID REFERENCES pm_wbs_items(id) ON DELETE SET NULL,
    test_case TEXT,
    verification_method VARCHAR(100),     -- test, inspection, demonstration, analysis
    status VARCHAR(50) DEFAULT 'identified', -- identified, approved, implemented, verified
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_requirements_project ON pm_requirements(project_id);


-- ═══════════════════════════════════════════════════════════
-- ─── SCHEDULE MANAGEMENT ───────────────────────────────────
-- ═══════════════════════════════════════════════════════════

-- Milestones
CREATE TABLE IF NOT EXISTS pm_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    completed_date DATE,
    percent_complete NUMERIC(5,2) DEFAULT 0,
    is_critical BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, on_track, at_risk, completed, missed
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_milestones_project ON pm_milestones(project_id);

-- Task Dependencies (FS/FF/SS/SF)
CREATE TABLE IF NOT EXISTS pm_task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    predecessor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(10) DEFAULT 'FS', -- FS, FF, SS, SF
    lag_days INT DEFAULT 0,                   -- positive = lag, negative = lead
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(predecessor_id, successor_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_deps_project ON pm_task_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_deps_predecessor ON pm_task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_pm_deps_successor ON pm_task_dependencies(successor_id);


-- ═══════════════════════════════════════════════════════════
-- ─── QUALITY MANAGEMENT ────────────────────────────────────
-- ═══════════════════════════════════════════════════════════

-- Quality Metrics
CREATE TABLE IF NOT EXISTS pm_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50),                     -- e.g. "bugs/kloc", "%", "hours"
    target_value NUMERIC(15,4),
    actual_value NUMERIC(15,4),
    tolerance_lower NUMERIC(15,4),
    tolerance_upper NUMERIC(15,4),
    measurement_method TEXT,
    frequency VARCHAR(50),                -- daily, weekly, per_sprint, per_release
    status VARCHAR(50) DEFAULT 'on_track', -- on_track, at_risk, out_of_spec
    last_measured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_metrics_project ON pm_quality_metrics(project_id);

-- Quality Checklists
CREATE TABLE IF NOT EXISTS pm_quality_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    checklist_name VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable VARCHAR(255),             -- what this checklist verifies
    items JSONB DEFAULT '[]'::jsonb,      -- [{item: "...", passed: bool, notes: "..."}]
    inspector VARCHAR(255),
    inspection_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, passed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_checklists_project ON pm_quality_checklists(project_id);

-- Quality Inspections (Audit records)
CREATE TABLE IF NOT EXISTS pm_quality_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_type VARCHAR(100),         -- peer_review, walkthrough, audit, gate_review
    deliverable VARCHAR(255),
    inspector VARCHAR(255),
    inspection_date DATE,
    findings TEXT,
    corrective_actions TEXT,
    result VARCHAR(50) DEFAULT 'pending', -- pending, pass, fail, conditional_pass
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_quality_inspections_project ON pm_quality_inspections(project_id);


-- ═══════════════════════════════════════════════════════════
-- ─── RESOURCE MANAGEMENT ───────────────────────────────────
-- ═══════════════════════════════════════════════════════════

-- Resource Plans
CREATE TABLE IF NOT EXISTS pm_resource_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    resource_type VARCHAR(50) DEFAULT 'human', -- human, equipment, material
    allocation_percent NUMERIC(5,2) DEFAULT 100,
    hourly_rate NUMERIC(10,2),
    start_date DATE,
    end_date DATE,
    availability_hours NUMERIC(10,2),
    planned_hours NUMERIC(10,2),
    actual_hours NUMERIC(10,2),
    skills TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'planned', -- planned, active, released
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_resource_plans_project ON pm_resource_plans(project_id);

-- RACI Matrix
CREATE TABLE IF NOT EXISTS pm_raci_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    deliverable VARCHAR(255) NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    role_type VARCHAR(1) NOT NULL,        -- R (Responsible), A (Accountable), C (Consulted), I (Informed)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_raci_project ON pm_raci_matrix(project_id);


-- ═══════════════════════════════════════════════════════════
-- ─── COMMUNICATIONS MANAGEMENT ─────────────────────────────
-- ═══════════════════════════════════════════════════════════

-- Communication Plans
CREATE TABLE IF NOT EXISTS pm_comm_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    communication_item VARCHAR(255) NOT NULL,
    target_audience VARCHAR(255),
    frequency VARCHAR(50),                -- daily, weekly, biweekly, monthly, as_needed
    method VARCHAR(100),                  -- email, meeting, report, dashboard, presentation
    responsible_person VARCHAR(255),
    key_message TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',  -- active, suspended, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_comm_plans_project ON pm_comm_plans(project_id);

-- Status Reports
CREATE TABLE IF NOT EXISTS pm_status_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    report_period VARCHAR(100),           -- "Week 12", "March 2026"
    overall_health VARCHAR(50) DEFAULT 'green', -- green, yellow, red
    schedule_health VARCHAR(50) DEFAULT 'green',
    cost_health VARCHAR(50) DEFAULT 'green',
    scope_health VARCHAR(50) DEFAULT 'green',
    accomplishments TEXT,
    planned_activities TEXT,
    issues_and_risks TEXT,
    decisions_needed TEXT,
    key_metrics TEXT,                      -- JSON or markdown for KPIs
    prepared_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_status_reports_project ON pm_status_reports(project_id);

-- Meeting Minutes
CREATE TABLE IF NOT EXISTS pm_meeting_minutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meeting_type VARCHAR(100),            -- standup, sprint_planning, review, steering, ad_hoc
    meeting_date TIMESTAMPTZ NOT NULL,
    title VARCHAR(255) NOT NULL,
    attendees TEXT,                        -- comma-separated or JSON
    agenda TEXT,
    discussion TEXT,
    decisions TEXT,
    action_items JSONB DEFAULT '[]'::jsonb, -- [{action, assignee, dueDate, status}]
    next_meeting_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_meeting_minutes_project ON pm_meeting_minutes(project_id);


-- ═══════════════════════════════════════════════════════════
-- ─── PROCUREMENT MANAGEMENT ────────────────────────────────
-- ═══════════════════════════════════════════════════════════

-- Links PM projects to existing Inventory module entities
CREATE TABLE IF NOT EXISTS pm_procurement_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,     -- supplier, pr, po, grn, fixed_asset
    entity_id TEXT NOT NULL,               -- ID from inventory module
    contract_type VARCHAR(50),            -- fixed_price, cost_reimbursable, time_and_materials
    budget_allocated NUMERIC(15,2),
    description TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',  -- active, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_procurement_links_project ON pm_procurement_links(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_procurement_links_entity ON pm_procurement_links(entity_type, entity_id);


-- ═══════════════════════════════════════════════════════════
-- ─── STAKEHOLDER MANAGEMENT ────────────────────────────────
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pm_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    organization VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    interest_level INT DEFAULT 3,         -- 1-5 scale
    power_level INT DEFAULT 3,            -- 1-5 scale
    current_engagement VARCHAR(50),       -- unaware, resistant, neutral, supportive, leading
    desired_engagement VARCHAR(50),       -- same options
    communication_needs TEXT,
    influence_strategy TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_stakeholders_project ON pm_stakeholders(project_id);


-- ═══════════════════════════════════════════════════════════
-- ─── INTEGRATION MANAGEMENT (additions) ────────────────────
-- ═══════════════════════════════════════════════════════════

-- Change Requests (Change Control Board)
CREATE TABLE IF NOT EXISTS pm_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    change_number VARCHAR(50),            -- auto or manual
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
    decision VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, deferred
    decision_date DATE,
    decision_notes TEXT,
    implementation_notes TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, under_review, approved, rejected, implemented
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_change_requests_project ON pm_change_requests(project_id);

-- Lessons Learned
CREATE TABLE IF NOT EXISTS pm_lessons_learned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(100),                -- technical, process, management, communication, risk, quality
    title VARCHAR(255) NOT NULL,
    situation TEXT,                        -- what happened
    impact TEXT,                           -- how did it affect the project
    lesson TEXT,                           -- what we learned
    recommendation TEXT,                   -- what to do differently
    submitted_by VARCHAR(255),
    submitted_date DATE,
    phase VARCHAR(50),                    -- initiating, planning, executing, monitoring, closing
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_lessons_learned_project ON pm_lessons_learned(project_id);
