# Project Management Design — PMBOK 6th Edition

## Overview

Full-featured project management system implementing all **10 Knowledge Areas** and **49 processes** from PMBOK 6th Edition. Multi-tenant, integrated with the Permission System and CRM.

---

## PMBOK 6th Edition — 10 Knowledge Areas Mapping

### Process Group × Knowledge Area Matrix

| Knowledge Area | Initiating | Planning | Executing | M&C | Closing |
|----------------|-----------|----------|-----------|-----|---------|
| 1. Integration | Charter | PM Plan | Direct & Manage, Manage Knowledge | Monitor & Control, Integrated Change Control | Close Project |
| 2. Scope | | Plan, Collect Requirements, Define, Create WBS | | Validate, Control | |
| 3. Schedule | | Plan, Define Activities, Sequence, Estimate Duration, Develop Schedule | | Control Schedule | |
| 4. Cost | | Plan, Estimate Costs, Determine Budget | | Control Costs | |
| 5. Quality | | Plan Quality | Manage Quality | Control Quality | |
| 6. Resource | | Plan, Estimate Activity Resources | Acquire, Develop, Manage Team | Control Resources | |
| 7. Communications | | Plan Comms | Manage Comms | Monitor Comms | |
| 8. Risk | | Plan, Identify, Qualitative, Quantitative, Plan Responses | Implement Responses | Monitor Risks | |
| 9. Procurement | | Plan Procurement | Conduct Procurement | Control Procurement | |
| 10. Stakeholder | Identify Stakeholders | Plan Engagement | Manage Engagement | Monitor Engagement | |

---

## Database Schema

### Core Project Tables

```sql
-- ═══════════════════════════════════════════════════
-- PROJECTS (Core entity)
-- ═══════════════════════════════════════════════════
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- Core
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),                    -- project code (e.g., "PRJ-001")
    description TEXT,
    
    -- Classification
    project_type VARCHAR(50),            -- 'internal', 'external', 'fixed_price', 'time_material'
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    methodology VARCHAR(50) DEFAULT 'waterfall', -- 'waterfall', 'agile', 'hybrid'
    
    -- Timeline
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Budget
    planned_budget DECIMAL(15,2),
    approved_budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(50) DEFAULT 'initiating', -- 'initiating','planning','executing','monitoring','closing','completed','cancelled','on_hold'
    health VARCHAR(20) DEFAULT 'green',      -- 'green', 'yellow', 'red'
    percent_complete DECIMAL(5,2) DEFAULT 0,
    
    -- Related CRM
    account_id UUID REFERENCES accounts(id),       -- client account
    opportunity_id UUID REFERENCES opportunities(id), -- originated from
    
    -- Sponsor
    sponsor_id UUID REFERENCES tenant_users(id),
    
    -- Template
    template_id UUID REFERENCES project_templates(id),
    is_template BOOLEAN DEFAULT false,
    
    -- Program/Portfolio
    program_id UUID REFERENCES programs(id),
    portfolio_id UUID REFERENCES portfolios(id),
    
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs (group of related projects)
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES tenant_users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolios (strategic grouping)
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES tenant_users(id),
    strategic_objective TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Templates
CREATE TABLE project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL,  -- full project structure as JSON
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 1: Integration Management

```sql
-- Project Charter
CREATE TABLE project_charters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Charter content
    business_case TEXT,
    project_purpose TEXT,
    measurable_objectives TEXT,
    high_level_requirements TEXT,
    high_level_description TEXT,
    high_level_risks TEXT,
    milestone_schedule JSONB,         -- [{name, target_date}]
    summary_budget JSONB,             -- {budget, contingency}
    
    -- Approval
    approved_by UUID REFERENCES tenant_users(id),
    approved_at TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Change Requests (Integrated Change Control)
CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Core
    change_number SERIAL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    justification TEXT,
    
    -- Impact
    impact_scope TEXT,
    impact_schedule TEXT,
    impact_cost TEXT,
    impact_quality TEXT,
    impact_risk TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Classification
    change_type VARCHAR(50),          -- 'corrective', 'preventive', 'defect_repair', 'update'
    change_category VARCHAR(50),      -- 'scope', 'schedule', 'cost', 'quality', 'resource'
    
    -- Status
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under_review', 'approved', 'rejected', 'deferred', 'implemented'
    
    -- Tracking
    requested_by UUID NOT NULL REFERENCES tenant_users(id),
    reviewed_by UUID REFERENCES tenant_users(id),
    approved_by UUID REFERENCES tenant_users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    implemented_at TIMESTAMPTZ,
    
    -- Documents
    attachments JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons Learned (Manage Project Knowledge)
CREATE TABLE lessons_learned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),             -- 'process', 'technical', 'management', 'communication'
    knowledge_area VARCHAR(50),       -- which PMBOK KA
    impact_type VARCHAR(20),          -- 'positive', 'negative'
    recommendation TEXT,
    
    recorded_by UUID NOT NULL REFERENCES tenant_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Status Reports (Monitor & Control)
CREATE TABLE project_status_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    report_date DATE NOT NULL,
    reporting_period VARCHAR(50),      -- 'weekly', 'biweekly', 'monthly'
    
    -- Health indicators
    overall_status VARCHAR(20),        -- 'green', 'yellow', 'red'
    scope_status VARCHAR(20),
    schedule_status VARCHAR(20),
    cost_status VARCHAR(20),
    quality_status VARCHAR(20),
    risk_status VARCHAR(20),
    
    -- Summary
    accomplishments TEXT,
    planned_next_period TEXT,
    issues_and_risks TEXT,
    decisions_needed TEXT,
    
    -- Metrics
    percent_complete DECIMAL(5,2),
    spi DECIMAL(5,3),                  -- Schedule Performance Index
    cpi DECIMAL(5,3),                  -- Cost Performance Index
    eac DECIMAL(15,2),                 -- Estimate At Completion
    etc DECIMAL(15,2),                 -- Estimate To Complete
    
    submitted_by UUID REFERENCES tenant_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 2: Scope Management

```sql
-- Requirements
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Core
    requirement_id_display VARCHAR(20), -- 'REQ-001'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Classification
    requirement_type VARCHAR(50),      -- 'business', 'functional', 'non_functional', 'technical', 'quality'
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'proposed', -- 'proposed', 'approved', 'implemented', 'verified', 'deferred', 'rejected'
    
    -- Source
    source VARCHAR(100),               -- stakeholder name or document
    stakeholder_id UUID REFERENCES stakeholders(id),
    
    -- Traceability
    parent_requirement_id UUID REFERENCES requirements(id),
    wbs_element_id UUID REFERENCES wbs_elements(id),
    
    -- Acceptance
    acceptance_criteria TEXT,
    verification_method VARCHAR(50),   -- 'test', 'inspection', 'demo', 'analysis'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WBS (Work Breakdown Structure)
CREATE TABLE wbs_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Structure
    parent_id UUID REFERENCES wbs_elements(id),
    wbs_code VARCHAR(50) NOT NULL,    -- '1.2.3'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Classification
    element_type VARCHAR(30) DEFAULT 'work_package', -- 'phase', 'deliverable', 'work_package'
    
    -- Status
    status VARCHAR(50) DEFAULT 'not_started',
    percent_complete DECIMAL(5,2) DEFAULT 0,
    
    -- Budget
    planned_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Time
    planned_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2) DEFAULT 0,
    
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scope Change Log
CREATE TABLE scope_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    change_request_id UUID REFERENCES change_requests(id),
    
    description TEXT NOT NULL,
    impact_description TEXT,
    scope_change_type VARCHAR(50),     -- 'addition', 'removal', 'modification'
    
    approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES tenant_users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 3: Schedule Management

```sql
-- Tasks/Activities (schedule items)
CREATE TABLE pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Core
    task_number VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- WBS linkage
    wbs_element_id UUID REFERENCES wbs_elements(id),
    
    -- Hierarchy
    parent_task_id UUID REFERENCES pm_tasks(id),
    is_summary BOOLEAN DEFAULT false,   -- summary/parent task
    is_milestone BOOLEAN DEFAULT false,
    
    -- Schedule
    planned_start DATE,
    planned_finish DATE,
    actual_start DATE,
    actual_finish DATE,
    
    -- Duration
    planned_duration_days DECIMAL(10,2),
    actual_duration_days DECIMAL(10,2),
    remaining_duration_days DECIMAL(10,2),
    
    -- Effort
    planned_effort_hours DECIMAL(10,2),
    actual_effort_hours DECIMAL(10,2) DEFAULT 0,
    remaining_effort_hours DECIMAL(10,2),
    
    -- Progress
    percent_complete DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'
    
    -- Critical path
    is_critical BOOLEAN DEFAULT false,
    float_days DECIMAL(10,2),          -- total float
    
    -- Constraints
    constraint_type VARCHAR(50),        -- 'asap', 'alap', 'start_no_earlier', 'finish_no_later', 'must_start', 'must_finish'
    constraint_date DATE,
    
    -- Assignment
    assignee_id UUID REFERENCES tenant_users(id),
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Agile fields
    story_points INTEGER,
    sprint_id UUID REFERENCES sprints(id),
    
    sort_order INTEGER DEFAULT 0,
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Dependencies
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(5) DEFAULT 'FS', -- 'FS', 'FF', 'SS', 'SF'
    lag_days DECIMAL(10,2) DEFAULT 0,        -- positive=lag, negative=lead
    UNIQUE(predecessor_id, successor_id)
);

-- Milestones
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'missed', 'at_risk'
    
    -- Link to task
    task_id UUID REFERENCES pm_tasks(id),
    
    -- Deliverable
    deliverable_description TEXT,
    acceptance_criteria TEXT,
    
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sprints (for Agile/Hybrid)
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(30) DEFAULT 'planning', -- 'planning', 'active', 'completed'
    
    -- Metrics
    planned_points INTEGER DEFAULT 0,
    completed_points INTEGER DEFAULT 0,
    velocity DECIMAL(5,2),
    
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entries
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES pm_tasks(id),
    user_id UUID NOT NULL REFERENCES tenant_users(id),
    
    entry_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    description TEXT,
    
    -- Billing
    is_billable BOOLEAN DEFAULT true,
    billing_rate DECIMAL(10,2),
    
    status VARCHAR(30) DEFAULT 'submitted', -- 'draft', 'submitted', 'approved', 'rejected'
    approved_by UUID REFERENCES tenant_users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 4: Cost Management

```sql
-- Budget Items
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Core
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),              -- 'labor', 'materials', 'equipment', 'travel', 'subcontractor', 'overhead', 'contingency'
    
    -- Amounts
    planned_amount DECIMAL(15,2) NOT NULL,
    approved_amount DECIMAL(15,2),
    actual_amount DECIMAL(15,2) DEFAULT 0,
    committed_amount DECIMAL(15,2) DEFAULT 0,
    
    -- WBS linkage
    wbs_element_id UUID REFERENCES wbs_elements(id),
    
    -- Period
    period_start DATE,
    period_end DATE,
    
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Tracking
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES budget_items(id),
    
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(50),
    vendor VARCHAR(255),
    
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    
    submitted_by UUID NOT NULL REFERENCES tenant_users(id),
    approved_by UUID REFERENCES tenant_users(id),
    status VARCHAR(30) DEFAULT 'submitted',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Earned Value snapshots
CREATE TABLE earned_value_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    snapshot_date DATE NOT NULL,
    
    -- Earned Value metrics
    pv DECIMAL(15,2),   -- Planned Value (BCWS)
    ev DECIMAL(15,2),   -- Earned Value (BCWP)
    ac DECIMAL(15,2),   -- Actual Cost (ACWP)
    bac DECIMAL(15,2),  -- Budget At Completion
    
    -- Derived
    sv DECIMAL(15,2),   -- Schedule Variance (EV - PV)
    cv DECIMAL(15,2),   -- Cost Variance (EV - AC)
    spi DECIMAL(5,3),   -- Schedule Performance Index (EV / PV)
    cpi DECIMAL(5,3),   -- Cost Performance Index (EV / AC)
    eac DECIMAL(15,2),  -- Estimate At Completion
    etc DECIMAL(15,2),  -- Estimate To Complete
    vac DECIMAL(15,2),  -- Variance At Completion (BAC - EAC)
    tcpi DECIMAL(5,3),  -- To-Complete Performance Index
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 5: Quality Management

```sql
-- Quality Metrics
CREATE TABLE quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    measurement_method TEXT,
    target_value VARCHAR(100),
    actual_value VARCHAR(100),
    unit VARCHAR(50),
    tolerance VARCHAR(100),
    
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'met', 'not_met', 'at_risk'
    measured_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality Checklists
CREATE TABLE quality_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable VARCHAR(255),
    
    status VARCHAR(30) DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES tenant_users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quality_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES quality_checklists(id) ON DELETE CASCADE,
    
    item_text VARCHAR(255) NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    checked_by UUID REFERENCES tenant_users(id),
    checked_at TIMESTAMPTZ,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Issues/Defects (Control Quality)
CREATE TABLE pm_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    issue_number SERIAL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    issue_type VARCHAR(50),           -- 'defect', 'process', 'resource', 'technical', 'external'
    priority VARCHAR(20) DEFAULT 'medium',
    severity VARCHAR(20),             -- 'critical', 'major', 'minor', 'cosmetic'
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed', 'deferred'
    
    assigned_to UUID REFERENCES tenant_users(id),
    reported_by UUID NOT NULL REFERENCES tenant_users(id),
    
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    
    -- Link to task
    related_task_id UUID REFERENCES pm_tasks(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 6: Resource Management

```sql
-- Resource Pool
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Can be a person or equipment
    resource_type VARCHAR(30) NOT NULL, -- 'human', 'equipment', 'material'
    
    -- Human
    tenant_user_id UUID REFERENCES tenant_users(id),
    
    -- Non-human
    name VARCHAR(255),
    description TEXT,
    
    -- Capacity
    max_units DECIMAL(5,2) DEFAULT 1.0, -- 1.0 = 100%, 0.5 = 50%
    cost_rate_hour DECIMAL(10,2),
    overtime_rate_hour DECIMAL(10,2),
    cost_per_use DECIMAL(10,2),
    
    -- Skills
    skills JSONB DEFAULT '[]',        -- [{skill, proficiency_level}]
    
    -- Calendar
    calendar_id UUID REFERENCES resource_calendars(id),
    
    -- Availability
    available_from DATE,
    available_to DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Assignments
CREATE TABLE resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES pm_tasks(id),
    resource_id UUID NOT NULL REFERENCES resources(id),
    
    -- Allocation
    units DECIMAL(5,2) DEFAULT 1.0,   -- allocation percentage
    planned_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Schedule
    start_date DATE,
    end_date DATE,
    
    -- Role
    role_on_project VARCHAR(100),      -- 'project_manager', 'developer', 'designer', 'tester'
    
    -- Status
    status VARCHAR(30) DEFAULT 'planned', -- 'planned', 'active', 'completed', 'released'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Calendars
CREATE TABLE resource_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    working_days JSONB DEFAULT '[1,2,3,4,5]',  -- 0=Sun, 1=Mon...
    working_hours JSONB DEFAULT '{"start":"09:00","end":"17:00"}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resource_calendar_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES resource_calendars(id) ON DELETE CASCADE,
    
    exception_date DATE NOT NULL,
    is_working BOOLEAN DEFAULT false,  -- false = holiday/day off
    name VARCHAR(100),
    working_hours JSONB               -- override hours if working
);

-- RACI Matrix
CREATE TABLE raci_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    activity_name VARCHAR(255) NOT NULL,
    wbs_element_id UUID REFERENCES wbs_elements(id),
    
    -- Roles: store tenant_user_ids
    responsible JSONB DEFAULT '[]',     -- who does the work
    accountable UUID,                   -- who is ultimately answerable
    consulted JSONB DEFAULT '[]',       -- who provides input
    informed JSONB DEFAULT '[]',        -- who needs to know
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 7: Communications Management

```sql
-- Communications Plan
CREATE TABLE communication_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Communication item
    name VARCHAR(255) NOT NULL,
    purpose TEXT,
    frequency VARCHAR(50),             -- 'daily', 'weekly', 'biweekly', 'monthly', 'ad_hoc'
    method VARCHAR(50),                -- 'email', 'meeting', 'report', 'dashboard', 'newsletter'
    format VARCHAR(100),
    
    -- Stakeholders
    sender_id UUID REFERENCES tenant_users(id),
    audience JSONB DEFAULT '[]',       -- list of stakeholder IDs or groups
    
    -- Schedule
    next_scheduled TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Communications Log
CREATE TABLE communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    subject VARCHAR(255) NOT NULL,
    body TEXT,
    communication_type VARCHAR(50),    -- 'email', 'meeting_minutes', 'announcement', 'decision'
    
    sent_by UUID NOT NULL REFERENCES tenant_users(id),
    recipients JSONB DEFAULT '[]',
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting Minutes
CREATE TABLE meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    meeting_date TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    
    attendees JSONB DEFAULT '[]',      -- [{user_id, present: bool}]
    agenda TEXT,
    discussion TEXT,
    decisions JSONB DEFAULT '[]',      -- [{decision, owner}]
    action_items JSONB DEFAULT '[]',   -- [{action, assignee, due_date, status}]
    
    recorded_by UUID REFERENCES tenant_users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 8: Risk Management

```sql
-- Risk Register
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Core
    risk_number SERIAL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    category VARCHAR(50),              -- 'technical', 'external', 'organizational', 'pm'
    risk_type VARCHAR(20) DEFAULT 'threat', -- 'threat', 'opportunity'
    
    -- Qualitative Assessment
    probability VARCHAR(20),           -- 'very_low', 'low', 'medium', 'high', 'very_high'
    probability_score DECIMAL(3,2),    -- 0.1, 0.3, 0.5, 0.7, 0.9
    impact VARCHAR(20),                -- same scale
    impact_score DECIMAL(3,2),
    risk_score DECIMAL(5,2),           -- probability_score * impact_score
    risk_rating VARCHAR(20),           -- computed: 'low', 'medium', 'high', 'critical'
    
    -- Quantitative (optional)
    expected_monetary_value DECIMAL(15,2), -- EMV = probability * impact_cost
    
    -- Status
    status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'analyzed', 'response_planned', 'accepted', 'mitigated', 'occurred', 'closed'
    
    -- Response
    response_strategy VARCHAR(50),     -- threats: 'avoid', 'mitigate', 'transfer', 'accept', 'escalate'
                                       -- opportunities: 'exploit', 'enhance', 'share', 'accept', 'escalate'
    response_plan TEXT,
    contingency_plan TEXT,
    fallback_plan TEXT,
    
    -- Owners
    risk_owner UUID REFERENCES tenant_users(id),
    response_owner UUID REFERENCES tenant_users(id),
    
    -- Triggers
    trigger_conditions TEXT,
    
    -- Related
    wbs_element_id UUID REFERENCES wbs_elements(id),
    
    -- Residual risk  
    residual_probability DECIMAL(3,2),
    residual_impact DECIMAL(3,2),
    residual_score DECIMAL(5,2),
    
    -- Timeline
    identified_at TIMESTAMPTZ DEFAULT NOW(),
    last_review_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Review History
CREATE TABLE risk_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    
    review_date TIMESTAMPTZ DEFAULT NOW(),
    reviewer_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- Previous and new assessments
    prev_probability DECIMAL(3,2),
    new_probability DECIMAL(3,2),
    prev_impact DECIMAL(3,2),
    new_impact DECIMAL(3,2),
    prev_status VARCHAR(50),
    new_status VARCHAR(50),
    
    notes TEXT
);
```

### KA 9: Procurement Management

```sql
-- Procurement Items
CREATE TABLE procurement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Core
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Classification
    procurement_type VARCHAR(50),      -- 'goods', 'services', 'construction'
    contract_type VARCHAR(50),         -- 'fixed_price', 'cost_reimbursable', 'time_materials'
    
    -- Budget
    estimated_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'rfp_issued', 'bids_received', 'vendor_selected', 'contracted', 'in_progress', 'delivered', 'closed'
    
    -- Vendor
    vendor_name VARCHAR(255),
    vendor_account_id UUID REFERENCES accounts(id), -- link to CRM
    
    -- Contract
    contract_number VARCHAR(100),
    contract_start DATE,
    contract_end DATE,
    contract_value DECIMAL(15,2),
    
    -- Documents
    sow_document_url TEXT,
    contract_document_url TEXT,
    
    -- Procurement Manager
    manager_id UUID REFERENCES tenant_users(id),
    
    -- WBS linkage
    wbs_element_id UUID REFERENCES wbs_elements(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Evaluations
CREATE TABLE vendor_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_item_id UUID NOT NULL REFERENCES procurement_items(id) ON DELETE CASCADE,
    vendor_account_id UUID REFERENCES accounts(id),
    
    vendor_name VARCHAR(255) NOT NULL,
    
    -- Scoring
    technical_score DECIMAL(5,2),
    cost_score DECIMAL(5,2),
    experience_score DECIMAL(5,2),
    delivery_score DECIMAL(5,2),
    overall_score DECIMAL(5,2),
    
    -- Weights
    weights JSONB DEFAULT '{"technical":0.3,"cost":0.3,"experience":0.2,"delivery":0.2}',
    
    recommendation TEXT,
    is_selected BOOLEAN DEFAULT false,
    
    evaluated_by UUID REFERENCES tenant_users(id),
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KA 10: Stakeholder Management

```sql
-- Stakeholders
CREATE TABLE stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identity (can link to CRM Individual or be standalone)
    individual_id UUID REFERENCES individuals(id),
    tenant_user_id UUID REFERENCES tenant_users(id),
    
    -- Manual entry (if not linked)
    name VARCHAR(255),
    title VARCHAR(255),
    organization VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Classification
    stakeholder_type VARCHAR(50),      -- 'internal', 'external', 'sponsor', 'customer', 'regulator'
    
    -- Assessment (Power/Interest Grid)
    power_level VARCHAR(20),           -- 'low', 'medium', 'high'
    interest_level VARCHAR(20),
    influence_level VARCHAR(20),
    
    -- Strategy based on Power/Interest
    engagement_strategy VARCHAR(50),   -- 'manage_closely', 'keep_satisfied', 'keep_informed', 'monitor'
    
    -- Current vs Desired engagement
    current_engagement VARCHAR(50),    -- 'unaware', 'resistant', 'neutral', 'supportive', 'leading'
    desired_engagement VARCHAR(50),
    
    -- Expectations & Impact
    expectations TEXT,
    potential_impact TEXT,
    
    -- Communication preferences
    preferred_communication VARCHAR(50),
    communication_frequency VARCHAR(50),
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stakeholder Engagement Log
CREATE TABLE stakeholder_engagement_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    
    engagement_date TIMESTAMPTZ NOT NULL,
    engagement_type VARCHAR(50),       -- 'meeting', 'email', 'call', 'presentation', 'review'
    description TEXT,
    outcome TEXT,
    action_items TEXT,
    
    logged_by UUID REFERENCES tenant_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Audit Trail

```sql
-- Universal audit log for all PM entities
CREATE TABLE pm_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,       -- 'create', 'update', 'delete', 'status_change'
    
    changed_by UUID NOT NULL REFERENCES tenant_users(id),
    changes JSONB,                     -- { field: { old, new } }
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pm_audit_entity ON pm_audit_log(entity_type, entity_id);
CREATE INDEX idx_pm_audit_project ON pm_audit_log(project_id);
```

---

## UI Pages

### `/admin/projects`

| Page | Purpose |
|------|---------|
| `/projects` | Dashboard: active projects, health overview, recent activity |
| `/projects/portfolios` | Portfolio view with strategic alignment |
| `/projects/programs` | Program groupings |
| `/projects/new` | Create project wizard (from template or blank) |
| `/projects/[id]` | Project overview: charter, status, health indicators |
| `/projects/[id]/scope` | WBS tree, requirements traceability matrix |
| `/projects/[id]/schedule` | **Gantt chart**, task list, milestones, dependencies |
| `/projects/[id]/board` | **Kanban board** (by status or sprint) |
| `/projects/[id]/cost` | Budget breakdown, expense tracking, **EVM charts** (S-curves) |
| `/projects/[id]/quality` | Quality metrics, checklists, issues/defects |
| `/projects/[id]/resources` | Resource assignments, allocation heatmap, **RACI matrix** |
| `/projects/[id]/communications` | Comms plan, meeting minutes, comms log |
| `/projects/[id]/risks` | **Risk register**, risk matrix (probability×impact heat map) |
| `/projects/[id]/procurement` | Procurement tracker, vendor evaluations |
| `/projects/[id]/stakeholders` | Stakeholder register, **power/interest grid** |
| `/projects/[id]/changes` | Change request log with approval workflow |
| `/projects/[id]/reports` | Status reports, EVM analytics, burndown charts |
| `/projects/[id]/lessons` | Lessons learned register |
| `/projects/[id]/time` | Timesheet / time entry view |
| `/projects/[id]/settings` | Project settings, team, permissions |

### Key UI Components

1. **Gantt Chart** — Interactive timeline with drag-resize tasks, dependency lines, critical path highlighting
2. **Kanban Board** — Drag-drop columns (by status or custom), swimlanes by assignee
3. **Risk Heat Map** — 5×5 probability×impact grid with color-coded risk dots
4. **EVM S-Curve** — PV, EV, AC curves over time with SPI/CPI indicators
5. **WBS Tree** — Hierarchical breakdown with expand/collapse, inline editing
6. **Resource Heatmap** — Calendar grid showing over/under allocation by color intensity
7. **RACI Matrix** — Grid: rows=activities, cols=team members, cells=R/A/C/I selector
8. **Stakeholder Power/Interest Grid** — 2×2 scatter plot with stakeholder positions
9. **Burndown Chart** — Remaining work vs ideal burndown (for Agile sprints)
10. **Budget Waterfall** — Budget → approved → committed → actual → variance
