-- ==========================================
-- Project Management Schema (PM Module)
-- ==========================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS pm_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated e.g. PRJ-0001
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning', -- planning, active, paused, completed, cancelled
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
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

-- 2. Sprints / Milestones Table
CREATE TABLE IF NOT EXISTS pm_sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_sprints_project ON pm_sprints(project_id);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS pm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES pm_sprints(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE, -- For Subtasks
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, review, done
    priority VARCHAR(50) DEFAULT 'medium', -- lowest, low, medium, high, highest
    type VARCHAR(50) DEFAULT 'task', -- task, bug, story, epic
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
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
    hours DECIMAL(10, 2) NOT NULL,
    log_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_time_logs_task ON pm_time_logs(task_id);

-- ==========================================
-- Auto-numbering Trigger for Projects
-- ==========================================

-- Function to generate the next Project Number (e.g. PRJ-0001) per tenant
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

-- Trigger to execute the function before insert
DROP TRIGGER IF EXISTS trigger_generate_project_number ON pm_projects;
CREATE TRIGGER trigger_generate_project_number
BEFORE INSERT ON pm_projects
FOR EACH ROW
WHEN (NEW.project_number IS NULL)
EXECUTE FUNCTION generate_project_number();
-- PMBOK 6 Module Extensions for Projects

-- 1. Alter pm_projects to add PMBOK toggles and methodology
ALTER TABLE IF EXISTS pm_projects
ADD COLUMN IF NOT EXISTS methodology VARCHAR(50) DEFAULT 'hybrid', -- agile, pmbok, hybrid
ADD COLUMN IF NOT EXISTS pmbok_scope_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_schedule_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_cost_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_quality_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_resource_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_comms_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_risk_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_procurement_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pmbok_stakeholder_enabled BOOLEAN DEFAULT FALSE;

-- 2. Project Charters Table (Integration Management)
CREATE TABLE IF NOT EXISTS pm_project_charters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

-- 3. Risk Registers Table (Risk Management)
CREATE TABLE IF NOT EXISTS pm_risk_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    risk_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- Technical, Management, Organizational, External
    probability INT DEFAULT 1, -- 1-5 scale
    impact INT DEFAULT 1, -- 1-5 scale
    risk_score INT GENERATED ALWAYS AS (probability * impact) STORED,
    mitigation_strategy TEXT,
    contingency_plan TEXT,
    status VARCHAR(50) DEFAULT 'identified', -- identified, analyzed, mitigated, closed, realized
    owner_id UUID REFERENCES public.tenant_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_risk_registers_project ON pm_risk_registers(project_id);

-- 4. Earned Value Management (EVM) Table (Cost Management)
CREATE TABLE IF NOT EXISTS pm_earned_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    planned_value DECIMAL(15, 2) NOT NULL DEFAULT 0, -- PV (BCWS)
    earned_value DECIMAL(15, 2) NOT NULL DEFAULT 0, -- EV (BCWP)
    actual_cost DECIMAL(15, 2) NOT NULL DEFAULT 0, -- AC (ACWP)
    schedule_variance DECIMAL(15, 2) GENERATED ALWAYS AS (earned_value - planned_value) STORED, -- SV = EV - PV
    cost_variance DECIMAL(15, 2) GENERATED ALWAYS AS (earned_value - actual_cost) STORED, -- CV = EV - AC
    schedule_performance_index DECIMAL(15, 4), -- SPI = EV / PV (handled in code to avoid division by zero)
    cost_performance_index DECIMAL(15, 4), -- CPI = EV / AC (handled in code to avoid division by zero)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_earned_values_project ON pm_earned_values(project_id);
