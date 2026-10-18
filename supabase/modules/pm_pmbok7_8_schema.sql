-- ═══════════════════════════════════════════════════════════════════════
-- PMBOK 7 & 8 Extension Schema
-- Run against the 'nusantarasoft' database
-- ═══════════════════════════════════════════════════════════════════════

-- ─── PMBOK 7: Principle Assessments ───────────────────────────────────
-- Tracks how well a project adheres to each of the 12 PMBOK 7 Principles
CREATE TABLE IF NOT EXISTS pm_principle_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    principle_key TEXT NOT NULL,            -- e.g. 'stewardship', 'team', 'stakeholders', etc.
    principle_name TEXT NOT NULL,           -- Human-readable name
    score INT NOT NULL DEFAULT 3 CHECK (score BETWEEN 1 AND 5),
    notes TEXT,
    evidence TEXT,                          -- Supporting evidence/artifacts
    assessed_by TEXT,
    assessed_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, principle_key)
);

-- ─── PMBOK 7: Performance Domain Health ───────────────────────────────
-- Tracks 8 performance domains: stakeholders, team, dev_approach, planning,
-- project_work, delivery, measurement, uncertainty
CREATE TABLE IF NOT EXISTS pm_domain_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    domain_key TEXT NOT NULL,              -- e.g. 'stakeholders', 'team', 'planning'
    domain_name TEXT NOT NULL,
    health_status TEXT NOT NULL DEFAULT 'green' CHECK (health_status IN ('green', 'yellow', 'red')),
    score INT NOT NULL DEFAULT 3 CHECK (score BETWEEN 1 AND 5),
    description TEXT,
    outcomes_achieved TEXT,                -- Comma-separated outcomes
    challenges TEXT,
    improvement_actions TEXT,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, domain_key, snapshot_date)
);

-- ─── PMBOK 7: Benefits Realization ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    benefit_name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'tangible' CHECK (category IN ('tangible', 'intangible', 'financial', 'strategic')),
    target_value TEXT,                    -- e.g. "Reduce costs by 20%"
    actual_value TEXT,
    measurement_method TEXT,
    baseline TEXT,
    target_date DATE,
    realization_date DATE,
    owner TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'realized', 'not_realized', 'deferred')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PMBOK 7: Tailoring Log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_tailoring_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    area TEXT NOT NULL,                   -- e.g. 'life_cycle', 'process', 'engagement', 'tools'
    original_approach TEXT,
    tailored_approach TEXT NOT NULL,
    rationale TEXT NOT NULL,
    impact TEXT,
    decided_by TEXT,
    decision_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'approved' CHECK (status IN ('proposed', 'approved', 'rejected', 'superseded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PMBOK 8: Focus Areas ────────────────────────────────────────────
-- Tracks 5 process group focus areas: initiating, planning, executing, monitoring, closing
CREATE TABLE IF NOT EXISTS pm_focus_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    focus_area_key TEXT NOT NULL,          -- 'initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'
    focus_area_name TEXT NOT NULL,
    progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    notes TEXT,
    key_deliverables TEXT,                -- Comma-separated deliverables
    completed_items JSONB DEFAULT '[]',   -- [{item: "...", completed: true, date: "..."}]
    total_items INT DEFAULT 0,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, focus_area_key)
);

-- ─── PMBOK 8: Governance Decisions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    decision_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'strategic' CHECK (category IN ('strategic', 'operational', 'financial', 'compliance', 'resource')),
    decision TEXT,
    decided_by TEXT,
    decision_date DATE,
    escalation_level TEXT DEFAULT 'project' CHECK (escalation_level IN ('project', 'program', 'portfolio', 'executive')),
    impact TEXT,
    follow_up_actions TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deferred', 'escalated')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PMBOK 8: Sustainability Metrics ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_sustainability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL CHECK (dimension IN ('environmental', 'social', 'governance')),
    metric_name TEXT NOT NULL,
    description TEXT,
    unit TEXT,                            -- e.g. 'kg CO2', 'hours', 'percentage'
    target_value NUMERIC,
    actual_value NUMERIC,
    baseline_value NUMERIC,
    measurement_period TEXT,              -- e.g. 'monthly', 'quarterly'
    data_source TEXT,
    status TEXT DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'off_track', 'achieved')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_principle_assessments_project ON pm_principle_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_domain_health_project ON pm_domain_health(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_benefits_project ON pm_benefits(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tailoring_log_project ON pm_tailoring_log(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_focus_areas_project ON pm_focus_areas(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_governance_project ON pm_governance(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_sustainability_project ON pm_sustainability(project_id);

-- ═══════════════════════════════════════════════════════════════════════
-- PMBOK 8 Extension: Principles v8 & Process Checklist
-- ═══════════════════════════════════════════════════════════════════════

-- ─── PMBOK 8: Consolidated Principles (6 principles) ─────────────────
-- PMBOK 8 streamlines the 12 PMBOK 7 principles into 6 consolidated ones:
-- 1. stewardship_ethics   - Stewardship & Ethics
-- 2. collaboration_team   - Collaboration & Team Performance
-- 3. stakeholder_value    - Stakeholder Engagement & Value Delivery
-- 4. systems_complexity   - Systems Thinking & Complexity Navigation
-- 5. adaptability_change  - Adaptability & Change Management
-- 6. quality_outcomes     - Quality Focus & Outcomes Orientation
CREATE TABLE IF NOT EXISTS pm_principles_v8 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    principle_key TEXT NOT NULL,            -- e.g. 'stewardship_ethics', 'collaboration_team'
    principle_name TEXT NOT NULL,           -- Human-readable name
    maturity_level TEXT DEFAULT 'initial' CHECK (maturity_level IN ('initial', 'developing', 'defined', 'managed', 'optimizing')),
    score INT NOT NULL DEFAULT 3 CHECK (score BETWEEN 1 AND 5),
    current_state TEXT,                    -- Current implementation state
    target_state TEXT,                     -- Desired future state
    gap_analysis TEXT,                     -- Gap between current/target
    action_items TEXT,                     -- Actions to close the gap
    evidence TEXT,                         -- Supporting evidence/artifacts
    assessed_by TEXT,
    assessed_date DATE DEFAULT CURRENT_DATE,
    review_cycle TEXT DEFAULT 'quarterly' CHECK (review_cycle IN ('weekly', 'monthly', 'quarterly', 'annually')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, principle_key)
);

-- ─── PMBOK 8: Process Checklist ──────────────────────────────────────
-- 40 non-prescriptive processes grouped across the 5 process groups
-- Used for tracking which processes are applicable and adopted per project
CREATE TABLE IF NOT EXISTS pm_process_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    process_group TEXT NOT NULL CHECK (process_group IN ('initiating', 'planning', 'executing', 'monitoring_controlling', 'closing')),
    process_name TEXT NOT NULL,
    process_description TEXT,
    is_applicable BOOLEAN DEFAULT TRUE,    -- Whether this process applies to this project
    is_adopted BOOLEAN DEFAULT FALSE,      -- Whether the team has adopted this process
    completion_percent INT DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped', 'not_applicable')),
    responsible_role TEXT,                 -- Role responsible for this process
    deliverables TEXT,                     -- Key deliverables from this process
    notes TEXT,
    evidence_url TEXT,                     -- Link to evidence artifact
    reviewed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, process_group, process_name)
);

-- ─── Additional Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_principles_v8_project ON pm_principles_v8(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_process_checklist_project ON pm_process_checklist(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_process_checklist_group ON pm_process_checklist(project_id, process_group);
