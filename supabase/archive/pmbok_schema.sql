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
