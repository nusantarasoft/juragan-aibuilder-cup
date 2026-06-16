-- =====================================================
-- Form Builder Module — Database Migration
-- Tables: form_templates, form_fields, form_assignments,
--         form_submissions, form_field_values, form_scores
-- =====================================================

-- 1. Form Templates
CREATE TABLE IF NOT EXISTS form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('survey','kpi','assessment','checklist','feedback','audit','custom')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived','closed')),
    settings JSONB DEFAULT '{"allow_edit":true,"anonymous":false,"one_per_user":false,"show_progress":true}'::jsonb,
    scoring_config JSONB DEFAULT '{}'::jsonb,
    style_config JSONB DEFAULT '{}'::jsonb,
    version INT DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Form Fields
CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    section_id UUID,
    section_title TEXT,
    field_type TEXT NOT NULL CHECK (field_type IN ('text','textarea','number','email','phone','url','date','date_range','time','select','multi_select','radio','checkbox','rating','slider','file_upload','signature','section_header','paragraph','divider','matrix','ranking')),
    label TEXT NOT NULL,
    description TEXT,
    placeholder TEXT,
    is_required BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    options JSONB DEFAULT '[]'::jsonb,
    validation JSONB DEFAULT '{}'::jsonb,
    kpi_config JSONB DEFAULT '{}'::jsonb,
    conditional JSONB DEFAULT '{}'::jsonb,
    default_value TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Form Assignments
CREATE TABLE IF NOT EXISTS form_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    assignee_type TEXT NOT NULL DEFAULT 'user' CHECK (assignee_type IN ('user','role','department','team','all')),
    assignee_id TEXT,
    assigned_by UUID,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','overdue')),
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Form Submissions
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES form_assignments(id) ON DELETE SET NULL,
    submitted_by UUID,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved','rejected')),
    total_score DECIMAL(10,2) DEFAULT 0,
    max_possible_score DECIMAL(10,2) DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    grade TEXT,
    reviewer_id UUID,
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Form Field Values
CREATE TABLE IF NOT EXISTS form_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    value TEXT,
    numeric_value DECIMAL(15,4),
    json_value JSONB DEFAULT '{}'::jsonb,
    score DECIMAL(10,2) DEFAULT 0,
    max_score DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Form Scores (KPI dimensions)
CREATE TABLE IF NOT EXISTS form_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    score DECIMAL(10,2) DEFAULT 0,
    max_score DECIMAL(10,2) DEFAULT 0,
    weight DECIMAL(5,2) DEFAULT 1.0,
    weighted_score DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_form_templates_tenant ON form_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_category ON form_templates(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_form_templates_status ON form_templates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_form_fields_template ON form_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_sort ON form_fields(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_form_assignments_template ON form_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_form_assignments_assignee ON form_assignments(assignee_type, assignee_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON form_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitter ON form_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_form_field_values_submission ON form_field_values(submission_id);
CREATE INDEX IF NOT EXISTS idx_form_field_values_field ON form_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_form_scores_submission ON form_scores(submission_id);

-- =====================================================
-- Seed Data: Pre-built Templates
-- =====================================================

-- Template 1: Employee KPI Evaluation
INSERT INTO form_templates (id, tenant_id, name, description, category, status, scoring_config, settings, tags, version) VALUES
('f0f00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
 'Employee KPI Evaluation Q2 2026',
 'Quarterly performance evaluation form for all employees. Covers performance metrics, goals, and manager review.',
 'kpi', 'published',
 '{"max_score":5.0,"passing_score":3.0,"weight_total":100,"scoring_method":"weighted_average","grading_scale":[{"min":4.5,"max":5.0,"label":"Excellent","color":"#52c41a"},{"min":3.5,"max":4.49,"label":"Good","color":"#1890ff"},{"min":3.0,"max":3.49,"label":"Satisfactory","color":"#faad14"},{"min":0,"max":2.99,"label":"Needs Improvement","color":"#ff4d4f"}]}'::jsonb,
 '{"allow_edit":false,"anonymous":false,"one_per_user":true,"show_progress":true,"notify_on_submit":true}'::jsonb,
 ARRAY['kpi','performance','quarterly','hr'], 1)
ON CONFLICT (id) DO NOTHING;

-- KPI Fields (Section 1: Performance Metrics)
INSERT INTO form_fields (id, template_id, section_id, section_title, field_type, label, description, is_required, sort_order, options, kpi_config) VALUES
('f0f10001-0000-0000-0000-000000000001', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000001', 'Performance Metrics', 'section_header', 'Performance Metrics', 'Rate each metric on a scale of 1-5', false, 1, '[]'::jsonb, '{}'::jsonb),
('f0f10001-0000-0000-0000-000000000002', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000001', 'Performance Metrics', 'rating', 'Goal Achievement', 'Rate progress toward assigned goals and objectives', true, 2, '[]'::jsonb, '{"weight":30,"max_score":5,"target":4.0,"unit":"rating","dimension":"Goals"}'::jsonb),
('f0f10001-0000-0000-0000-000000000003', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000001', 'Performance Metrics', 'rating', 'Quality of Work', 'Accuracy, thoroughness, and attention to detail', true, 3, '[]'::jsonb, '{"weight":20,"max_score":5,"target":4.0,"unit":"rating","dimension":"Quality"}'::jsonb),
('f0f10001-0000-0000-0000-000000000004', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000001', 'Performance Metrics', 'slider', 'Productivity Score', 'Percentage of expected output delivered', true, 4, '[]'::jsonb, '{"weight":20,"max_score":100,"target":85,"unit":"percent","dimension":"Productivity"}'::jsonb),
('f0f10001-0000-0000-0000-000000000005', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000001', 'Performance Metrics', 'rating', 'Initiative & Innovation', 'Proactiveness, creative problem-solving', true, 5, '[]'::jsonb, '{"weight":15,"max_score":5,"target":3.5,"unit":"rating","dimension":"Initiative"}'::jsonb),
('f0f10001-0000-0000-0000-000000000006', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000001', 'Performance Metrics', 'rating', 'Communication & Teamwork', 'Collaboration, knowledge sharing, feedback', true, 6, '[]'::jsonb, '{"weight":15,"max_score":5,"target":3.5,"unit":"rating","dimension":"Communication"}'::jsonb),
-- Section 2: Goals & Development
('f0f10001-0000-0000-0000-000000000007', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000002', 'Goals & Development', 'section_header', 'Goals & Development', 'Define goals and development needs', false, 7, '[]'::jsonb, '{}'::jsonb),
('f0f10001-0000-0000-0000-000000000008', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000002', 'Goals & Development', 'textarea', 'Goals for Next Period', 'List 3-5 measurable goals for the next quarter', true, 8, '[]'::jsonb, '{}'::jsonb),
('f0f10001-0000-0000-0000-000000000009', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000002', 'Goals & Development', 'multi_select', 'Training Needs', 'Select areas where you need development', false, 9, '[{"value":"leadership","label":"Leadership & Management"},{"value":"technical","label":"Technical Skills"},{"value":"communication","label":"Communication"},{"value":"project_mgmt","label":"Project Management"},{"value":"data_analytics","label":"Data Analytics"},{"value":"ai_ml","label":"AI & Machine Learning"},{"value":"security","label":"Cybersecurity"},{"value":"other","label":"Other"}]'::jsonb, '{}'::jsonb),
('f0f10001-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000002', 'Goals & Development', 'textarea', 'Self Assessment', 'Summarize your achievements and areas for improvement', false, 10, '[]'::jsonb, '{}'::jsonb),
-- Section 3: Manager Review
('f0f10001-0000-0000-0000-000000000011', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000003', 'Manager Review', 'section_header', 'Manager Review', 'To be completed by the direct manager', false, 11, '[]'::jsonb, '{}'::jsonb),
('f0f10001-0000-0000-0000-000000000012', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000003', 'Manager Review', 'rating', 'Overall Rating', 'Manager overall performance rating', true, 12, '[]'::jsonb, '{"weight":0,"max_score":5,"dimension":"Overall"}'::jsonb),
('f0f10001-0000-0000-0000-000000000013', 'f0f00001-0000-0000-0000-000000000001', 'f0f20001-0000-0000-0000-000000000003', 'Manager Review', 'textarea', 'Manager Comments', 'Provide detailed feedback and recommendations', false, 13, '[]'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Template 2: Customer Satisfaction Survey
INSERT INTO form_templates (id, tenant_id, name, description, category, status, tags, version) VALUES
('f0f00001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010',
 'Customer Satisfaction Survey',
 'Post-interaction customer satisfaction survey for CRM integration.',
 'survey', 'published',
 ARRAY['crm','customer','satisfaction','survey'], 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO form_fields (id, template_id, section_title, field_type, label, description, is_required, sort_order, options) VALUES
('f0f10002-0000-0000-0000-000000000001', 'f0f00001-0000-0000-0000-000000000002', NULL, 'rating', 'Overall Satisfaction', 'How satisfied are you with our service?', true, 1, '[]'::jsonb),
('f0f10002-0000-0000-0000-000000000002', 'f0f00001-0000-0000-0000-000000000002', NULL, 'select', 'Department', 'Which department did you interact with?', true, 2, '[{"value":"sales","label":"Sales"},{"value":"support","label":"Support"},{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"other","label":"Other"}]'::jsonb),
('f0f10002-0000-0000-0000-000000000003', 'f0f00001-0000-0000-0000-000000000002', NULL, 'radio', 'Would Recommend', 'Would you recommend us to a colleague?', true, 3, '[{"value":"yes","label":"Yes, definitely"},{"value":"maybe","label":"Maybe"},{"value":"no","label":"No"}]'::jsonb),
('f0f10002-0000-0000-0000-000000000004', 'f0f00001-0000-0000-0000-000000000002', NULL, 'slider', 'Net Promoter Score', 'On a scale of 0-10, how likely are you to recommend us?', true, 4, '[]'::jsonb),
('f0f10002-0000-0000-0000-000000000005', 'f0f00001-0000-0000-0000-000000000002', NULL, 'checkbox', 'Areas of Excellence', 'What did we do well?', false, 5, '[{"value":"speed","label":"Response Speed"},{"value":"knowledge","label":"Staff Knowledge"},{"value":"friendliness","label":"Friendliness"},{"value":"resolution","label":"Issue Resolution"},{"value":"communication","label":"Communication"}]'::jsonb),
('f0f10002-0000-0000-0000-000000000006', 'f0f00001-0000-0000-0000-000000000002', NULL, 'textarea', 'Additional Comments', 'Any other feedback you would like to share?', false, 6, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Template 3: IT Security Audit Checklist
INSERT INTO form_templates (id, tenant_id, name, description, category, status, tags, version) VALUES
('f0f00001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010',
 'IT Security Audit Checklist',
 'Monthly security compliance checklist for ITSM integration.',
 'checklist', 'published',
 ARRAY['itsm','security','audit','compliance','checklist'], 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO form_fields (id, template_id, section_title, field_type, label, description, is_required, sort_order) VALUES
('f0f10003-0000-0000-0000-000000000001', 'f0f00001-0000-0000-0000-000000000003', 'Access Control', 'checkbox', 'User access reviews completed', 'All user accounts reviewed for appropriate access levels', true, 1),
('f0f10003-0000-0000-0000-000000000002', 'f0f00001-0000-0000-0000-000000000003', 'Access Control', 'checkbox', 'Inactive accounts disabled', 'Accounts inactive >90 days have been disabled', true, 2),
('f0f10003-0000-0000-0000-000000000003', 'f0f00001-0000-0000-0000-000000000003', 'Access Control', 'checkbox', 'MFA enforced for all admin accounts', 'Multi-factor authentication is active for privileged accounts', true, 3),
('f0f10003-0000-0000-0000-000000000004', 'f0f00001-0000-0000-0000-000000000003', 'Infrastructure', 'checkbox', 'Firewall rules reviewed', 'All firewall rules audited and documented', true, 4),
('f0f10003-0000-0000-0000-000000000005', 'f0f00001-0000-0000-0000-000000000003', 'Infrastructure', 'checkbox', 'SSL certificates valid', 'All SSL/TLS certificates are current and not expiring within 30 days', true, 5),
('f0f10003-0000-0000-0000-000000000006', 'f0f00001-0000-0000-0000-000000000003', 'Infrastructure', 'checkbox', 'Backup verification completed', 'Database and file backups tested for restoration', true, 6),
('f0f10003-0000-0000-0000-000000000007', 'f0f00001-0000-0000-0000-000000000003', 'Compliance', 'checkbox', 'Security patches applied', 'All critical security patches applied within SLA', true, 7),
('f0f10003-0000-0000-0000-000000000008', 'f0f00001-0000-0000-0000-000000000003', 'Compliance', 'checkbox', 'Incident response plan tested', 'IR plan has been reviewed and tabletop exercise conducted', true, 8)
ON CONFLICT (id) DO NOTHING;

-- These rows have an extra 'options' column
INSERT INTO form_fields (id, template_id, section_title, field_type, label, description, is_required, sort_order, options) VALUES
('f0f10003-0000-0000-0000-000000000009', 'f0f00001-0000-0000-0000-000000000003', NULL, 'textarea', 'Audit Notes', 'Additional observations and recommendations', false, 9, '[]'::jsonb),
('f0f10003-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000003', NULL, 'select', 'Overall Compliance Rating', 'Overall assessment of security posture', true, 10, '[{"value":"compliant","label":"Fully Compliant"},{"value":"partial","label":"Partially Compliant"},{"value":"non_compliant","label":"Non-Compliant"},{"value":"critical","label":"Critical Findings"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Sample Submissions for KPI template
INSERT INTO form_submissions (id, tenant_id, template_id, submitted_by, status, total_score, max_possible_score, percentage, grade, submitted_at) VALUES
('f0f30001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approved', 4.35, 5.00, 87.00, 'Good', NOW() - INTERVAL '5 days'),
('f0f30001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approved', 3.80, 5.00, 76.00, 'Good', NOW() - INTERVAL '3 days'),
('f0f30001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'submitted', 4.70, 5.00, 94.00, 'Excellent', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sample field values for submission 1
INSERT INTO form_field_values (submission_id, field_id, value, numeric_value, score, max_score) VALUES
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000002', '4', 4, 4.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000003', '5', 5, 5.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000004', '88', 88, 88.0, 100.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000005', '4', 4, 4.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000006', '4', 4, 4.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000008', 'Exceed Q1 targets by 15%, complete API v3 migration', NULL, 0, 0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000010', 'Strong quarter overall. Led the database migration project successfully.', NULL, 0, 0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000012', '4', 4, 4.0, 5.0)
ON CONFLICT DO NOTHING;

-- Sample scores for submission 1
INSERT INTO form_scores (tenant_id, submission_id, dimension, score, max_score, weight, weighted_score) VALUES
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Goals', 4.0, 5.0, 0.30, 1.20),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Quality', 5.0, 5.0, 0.20, 1.00),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Productivity', 4.40, 5.0, 0.20, 0.88),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Initiative', 4.0, 5.0, 0.15, 0.60),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Communication', 4.0, 5.0, 0.15, 0.60);

-- =====================================================
-- Permissions for PostgREST / Supabase
-- =====================================================
GRANT ALL ON TABLE public.form_templates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.form_fields TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.form_assignments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.form_submissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.form_field_values TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.form_scores TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
