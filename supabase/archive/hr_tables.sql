-- ═══════════════════════════════════════════════════════════
-- HR & HCM MODULE — Database Tables
-- ═══════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. DEPARTMENTS                                          ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    parent_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
    head_employee_id UUID,  -- FK added after hr_employees exists
    cost_center TEXT,
    status TEXT NOT NULL DEFAULT 'active',  -- active, inactive
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. POSITIONS / JOB TITLES                               ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    code TEXT,
    department_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
    description TEXT,
    grade TEXT,              -- e.g. L1, L2, L3, M1, M2, D1
    min_salary NUMERIC(15,2),
    max_salary NUMERIC(15,2),
    currency TEXT DEFAULT 'IDR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    headcount_budget INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. EMPLOYEES (Master Record)                            ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    employee_number TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,            -- male, female, other
    marital_status TEXT,    -- single, married, divorced, widowed
    nationality TEXT,
    national_id TEXT,       -- KTP / ID number
    tax_id TEXT,            -- NPWP
    avatar_url TEXT,

    -- Job Information
    department_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES hr_positions(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
    employment_type TEXT NOT NULL DEFAULT 'full_time', -- full_time, part_time, contract, intern
    employment_status TEXT NOT NULL DEFAULT 'active',   -- active, on_leave, suspended, terminated, resigned
    hire_date DATE NOT NULL,
    probation_end_date DATE,
    termination_date DATE,
    termination_reason TEXT,

    -- Compensation
    base_salary NUMERIC(15,2),
    salary_currency TEXT DEFAULT 'IDR',
    bank_name TEXT,
    bank_account TEXT,

    -- Address
    address JSONB DEFAULT '{}',
    emergency_contact JSONB DEFAULT '{}',

    -- Meta
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for department head
ALTER TABLE hr_departments
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_employee_id)
    REFERENCES hr_employees(id) ON DELETE SET NULL;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. ATTENDANCE                                           ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, half_day, remote
    work_hours NUMERIC(4,2),
    overtime_hours NUMERIC(4,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, date)
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. LEAVE MANAGEMENT                                     ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,          -- Annual Leave, Sick Leave, etc.
    code TEXT,
    days_per_year INT NOT NULL DEFAULT 12,
    is_paid BOOLEAN DEFAULT true,
    is_carry_forward BOOLEAN DEFAULT false,
    max_carry_forward INT DEFAULT 0,
    color TEXT DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES hr_leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL,
    total_days INT NOT NULL DEFAULT 0,
    used_days INT NOT NULL DEFAULT 0,
    carry_forward_days INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES hr_leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, cancelled
    approved_by UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. PAYROLL                                              ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_payroll_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,              -- Base Salary, Transport, Meal, BPJS, Tax
    code TEXT,
    type TEXT NOT NULL DEFAULT 'earning', -- earning, deduction, tax
    is_fixed BOOLEAN DEFAULT true,
    default_amount NUMERIC(15,2) DEFAULT 0,
    is_taxable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    period TEXT NOT NULL,            -- e.g. '2026-04'
    name TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, processing, completed, paid
    total_gross NUMERIC(15,2) DEFAULT 0,
    total_deductions NUMERIC(15,2) DEFAULT 0,
    total_net NUMERIC(15,2) DEFAULT 0,
    employee_count INT DEFAULT 0,
    processed_by TEXT,
    processed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_payroll_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    payroll_run_id UUID NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    base_salary NUMERIC(15,2) DEFAULT 0,
    gross_salary NUMERIC(15,2) DEFAULT 0,
    total_deductions NUMERIC(15,2) DEFAULT 0,
    net_salary NUMERIC(15,2) DEFAULT 0,
    components JSONB DEFAULT '[]',   -- [{name, type, amount}]
    status TEXT DEFAULT 'generated', -- generated, paid
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. RECRUITMENT                                          ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    department_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES hr_positions(id) ON DELETE SET NULL,
    description TEXT,
    requirements TEXT,
    location TEXT,
    employment_type TEXT DEFAULT 'full_time',
    salary_min NUMERIC(15,2),
    salary_max NUMERIC(15,2),
    currency TEXT DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'open',  -- draft, open, closed, filled
    posted_date DATE,
    closing_date DATE,
    hiring_manager_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
    openings INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    job_posting_id UUID NOT NULL REFERENCES hr_job_postings(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    resume_url TEXT,
    cover_letter TEXT,
    source TEXT,            -- website, referral, linkedin, job_board
    stage TEXT NOT NULL DEFAULT 'applied', -- applied, screening, interview, offer, hired, rejected
    rating INT,             -- 1-5
    notes TEXT,
    interview_date TIMESTAMPTZ,
    offered_salary NUMERIC(15,2),
    rejected_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  8. PERFORMANCE MANAGEMENT                               ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
    review_period TEXT,      -- e.g. 'Q1 2026', 'H1 2026', '2025'
    review_type TEXT DEFAULT 'annual',  -- annual, quarterly, probation, 360
    overall_rating INT,      -- 1-5
    strengths TEXT,
    areas_for_improvement TEXT,
    comments TEXT,
    status TEXT DEFAULT 'draft',  -- draft, in_progress, completed
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_performance_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    review_id UUID REFERENCES hr_performance_reviews(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,           -- performance, development, project
    target_date DATE,
    progress INT DEFAULT 0,  -- 0-100
    status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed, cancelled
    weight INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  9. TRAINING & DEVELOPMENT                               ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_training_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,           -- technical, leadership, compliance, soft_skills
    duration_hours INT,
    provider TEXT,
    cost NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    max_participants INT,
    start_date DATE,
    end_date DATE,
    location TEXT,
    status TEXT DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
    is_mandatory BOOLEAN DEFAULT false,
    certification_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    training_id UUID NOT NULL REFERENCES hr_training_programs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'enrolled',  -- enrolled, in_progress, completed, dropped
    completion_date DATE,
    score INT,              -- 0-100
    certificate_url TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(training_id, employee_id)
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  10. ONBOARDING & OFFBOARDING                            ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS hr_onboarding_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
    tasks JSONB DEFAULT '[]',   -- [{title, description, assignee_role, due_days}]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    template_id UUID REFERENCES hr_onboarding_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending',   -- pending, in_progress, completed, skipped
    completed_at TIMESTAMPTZ,
    type TEXT DEFAULT 'onboarding',  -- onboarding, offboarding
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_employees_tenant ON hr_employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_dept ON hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON hr_employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_emp_date ON hr_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_emp ON hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_slips_run ON hr_payroll_slips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_hr_applicants_posting ON hr_applicants(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_hr_perf_reviews_emp ON hr_performance_reviews(employee_id);

NOTIFY pgrst, 'reload schema';
