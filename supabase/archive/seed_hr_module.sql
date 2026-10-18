-- HR MODULE SEED DATA (Fixed UUIDs - hex only)

-- Positions
INSERT INTO hr_positions (id, tenant_id, title, code, department_id, grade, min_salary, max_salary, currency, headcount_budget) VALUES
('a1000000-0000-0000-0000-000000000001', 'default', 'Chief Executive Officer', 'CEO', 'd1000000-0000-0000-0000-000000000001', 'D1', 80000000, 150000000, 'IDR', 1),
('a1000000-0000-0000-0000-000000000002', 'default', 'Chief Technology Officer', 'CTO', 'd1000000-0000-0000-0000-000000000001', 'D1', 70000000, 120000000, 'IDR', 1),
('a1000000-0000-0000-0000-000000000003', 'default', 'Senior Software Engineer', 'SSE', 'd1000000-0000-0000-0000-000000000002', 'L3', 25000000, 45000000, 'IDR', 5),
('a1000000-0000-0000-0000-000000000004', 'default', 'Software Engineer', 'SE', 'd1000000-0000-0000-0000-000000000002', 'L2', 15000000, 28000000, 'IDR', 10),
('a1000000-0000-0000-0000-000000000005', 'default', 'Junior Software Engineer', 'JSE', 'd1000000-0000-0000-0000-000000000002', 'L1', 8000000, 15000000, 'IDR', 8),
('a1000000-0000-0000-0000-000000000006', 'default', 'HR Manager', 'HRM', 'd1000000-0000-0000-0000-000000000003', 'M1', 25000000, 40000000, 'IDR', 1),
('a1000000-0000-0000-0000-000000000007', 'default', 'HR Specialist', 'HRS', 'd1000000-0000-0000-0000-000000000003', 'L2', 12000000, 20000000, 'IDR', 3),
('a1000000-0000-0000-0000-000000000008', 'default', 'Finance Manager', 'FM', 'd1000000-0000-0000-0000-000000000004', 'M1', 28000000, 42000000, 'IDR', 1),
('a1000000-0000-0000-0000-000000000009', 'default', 'Sales Manager', 'SLM', 'd1000000-0000-0000-0000-000000000005', 'M1', 22000000, 38000000, 'IDR', 1),
('a1000000-0000-0000-0000-000000000010', 'default', 'QA Engineer', 'QAE', 'd1000000-0000-0000-0000-000000000008', 'L2', 14000000, 25000000, 'IDR', 4)
ON CONFLICT (id) DO NOTHING;

-- Employees
INSERT INTO hr_employees (id, tenant_id, employee_number, first_name, last_name, email, phone, date_of_birth, gender, marital_status, department_id, position_id, manager_id, employment_type, employment_status, hire_date, base_salary, salary_currency, bank_name, bank_account) VALUES
('e1000000-0000-0000-0000-000000000001', 'default', 'EMP-001', 'Budi', 'Santoso', 'budi.santoso@nusantarasoft.local', '+6281234567001', '1978-05-12', 'male', 'married', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', NULL, 'full_time', 'active', '2020-01-15', 95000000, 'IDR', 'BCA', '1234567890'),
('e1000000-0000-0000-0000-000000000002', 'default', 'EMP-002', 'Siti', 'Rahayu', 'siti.rahayu@nusantarasoft.local', '+6281234567002', '1985-08-22', 'female', 'married', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'full_time', 'active', '2020-03-01', 78000000, 'IDR', 'BCA', '1234567891'),
('e1000000-0000-0000-0000-000000000003', 'default', 'EMP-003', 'Ahmad', 'Wijaya', 'ahmad.wijaya@nusantarasoft.local', '+6281234567003', '1990-02-14', 'male', 'single', 'd1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002', 'full_time', 'active', '2021-06-01', 35000000, 'IDR', 'Mandiri', '2345678901'),
('e1000000-0000-0000-0000-000000000004', 'default', 'EMP-004', 'Dewi', 'Lestari', 'dewi.lestari@nusantarasoft.local', '+6281234567004', '1992-11-30', 'female', 'single', 'd1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000003', 'full_time', 'active', '2022-01-10', 22000000, 'IDR', 'BNI', '3456789012'),
('e1000000-0000-0000-0000-000000000005', 'default', 'EMP-005', 'Rizki', 'Pratama', 'rizki.pratama@nusantarasoft.local', '+6281234567005', '1995-07-08', 'male', 'single', 'd1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000003', 'full_time', 'active', '2023-08-15', 12000000, 'IDR', 'BRI', '4567890123'),
('e1000000-0000-0000-0000-000000000006', 'default', 'EMP-006', 'Putri', 'Handayani', 'putri.handayani@nusantarasoft.local', '+6281234567006', '1988-03-25', 'female', 'married', 'd1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', 'full_time', 'active', '2021-02-01', 32000000, 'IDR', 'BCA', '5678901234'),
('e1000000-0000-0000-0000-000000000007', 'default', 'EMP-007', 'Andi', 'Setiawan', 'andi.setiawan@nusantarasoft.local', '+6281234567007', '1993-09-18', 'male', 'single', 'd1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000006', 'full_time', 'active', '2022-07-01', 16000000, 'IDR', 'Mandiri', '6789012345'),
('e1000000-0000-0000-0000-000000000008', 'default', 'EMP-008', 'Maya', 'Kusuma', 'maya.kusuma@nusantarasoft.local', '+6281234567008', '1987-12-05', 'female', 'married', 'd1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000001', 'full_time', 'active', '2020-06-15', 35000000, 'IDR', 'BCA', '7890123456'),
('e1000000-0000-0000-0000-000000000009', 'default', 'EMP-009', 'Fajar', 'Nugroho', 'fajar.nugroho@nusantarasoft.local', '+6281234567009', '1991-04-20', 'male', 'married', 'd1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000001', 'full_time', 'active', '2021-09-01', 28000000, 'IDR', 'BNI', '8901234567'),
('e1000000-0000-0000-0000-000000000010', 'default', 'EMP-010', 'Indah', 'Permata', 'indah.permata@nusantarasoft.local', '+6281234567010', '1996-01-15', 'female', 'single', 'd1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000003', 'full_time', 'active', '2023-02-01', 20000000, 'IDR', 'BCA', '9012345678'),
('e1000000-0000-0000-0000-000000000011', 'default', 'EMP-011', 'Dimas', 'Aditya', 'dimas.aditya@nusantarasoft.local', '+6281234567011', '1994-06-28', 'male', 'single', 'd1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000003', 'full_time', 'active', '2022-11-01', 21000000, 'IDR', 'Mandiri', '0123456789'),
('e1000000-0000-0000-0000-000000000012', 'default', 'EMP-012', 'Nadia', 'Safitri', 'nadia.safitri@nusantarasoft.local', '+6281234567012', '1997-10-03', 'female', 'single', 'd1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000002', 'full_time', 'active', '2024-01-15', 18000000, 'IDR', 'BRI', '1122334455'),
('e1000000-0000-0000-0000-000000000013', 'default', 'EMP-013', 'Reza', 'Firmansyah', 'reza.firmansyah@nusantarasoft.local', '+6281234567013', '1998-03-11', 'male', 'single', 'd1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000003', 'contract', 'active', '2024-06-01', 10000000, 'IDR', 'BCA', '2233445566'),
('e1000000-0000-0000-0000-000000000014', 'default', 'EMP-014', 'Lina', 'Marlina', 'lina.marlina@nusantarasoft.local', '+6281234567014', '1989-07-19', 'female', 'married', 'd1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000009', 'full_time', 'active', '2022-04-01', 18000000, 'IDR', 'Mandiri', '3344556677'),
('e1000000-0000-0000-0000-000000000015', 'default', 'EMP-015', 'Hendra', 'Gunawan', 'hendra.gunawan@nusantarasoft.local', '+6281234567015', '1993-12-22', 'male', 'single', 'd1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002', 'full_time', 'active', '2021-10-01', 38000000, 'IDR', 'BCA', '4455667788')
ON CONFLICT (id) DO NOTHING;

-- Update department heads
UPDATE hr_departments SET head_employee_id = 'e1000000-0000-0000-0000-000000000001' WHERE id = 'd1000000-0000-0000-0000-000000000001';
UPDATE hr_departments SET head_employee_id = 'e1000000-0000-0000-0000-000000000002' WHERE id = 'd1000000-0000-0000-0000-000000000002';
UPDATE hr_departments SET head_employee_id = 'e1000000-0000-0000-0000-000000000006' WHERE id = 'd1000000-0000-0000-0000-000000000003';
UPDATE hr_departments SET head_employee_id = 'e1000000-0000-0000-0000-000000000008' WHERE id = 'd1000000-0000-0000-0000-000000000004';
UPDATE hr_departments SET head_employee_id = 'e1000000-0000-0000-0000-000000000009' WHERE id = 'd1000000-0000-0000-0000-000000000005';

-- Leave types
INSERT INTO hr_leave_types (id, tenant_id, name, code, days_per_year, is_paid, color) VALUES
('aa100000-0000-0000-0000-000000000001', 'default', 'Annual Leave', 'AL', 12, true, '#3b82f6'),
('aa100000-0000-0000-0000-000000000002', 'default', 'Sick Leave', 'SL', 14, true, '#ef4444'),
('aa100000-0000-0000-0000-000000000003', 'default', 'Maternity Leave', 'ML', 90, true, '#ec4899'),
('aa100000-0000-0000-0000-000000000004', 'default', 'Unpaid Leave', 'UL', 30, false, '#94a3b8')
ON CONFLICT (id) DO NOTHING;

-- Leave balances
INSERT INTO hr_leave_balances (tenant_id, employee_id, leave_type_id, year, total_days, used_days) VALUES
('default', 'e1000000-0000-0000-0000-000000000001', 'aa100000-0000-0000-0000-000000000001', 2026, 12, 3),
('default', 'e1000000-0000-0000-0000-000000000002', 'aa100000-0000-0000-0000-000000000001', 2026, 12, 5),
('default', 'e1000000-0000-0000-0000-000000000003', 'aa100000-0000-0000-0000-000000000001', 2026, 12, 2),
('default', 'e1000000-0000-0000-0000-000000000004', 'aa100000-0000-0000-0000-000000000001', 2026, 12, 1),
('default', 'e1000000-0000-0000-0000-000000000006', 'aa100000-0000-0000-0000-000000000001', 2026, 12, 4);

-- Payroll components
INSERT INTO hr_payroll_components (id, tenant_id, name, code, type, is_fixed, default_amount, is_taxable, sort_order) VALUES
('bb100000-0000-0000-0000-000000000001', 'default', 'Base Salary', 'BASE', 'earning', true, 0, true, 1),
('bb100000-0000-0000-0000-000000000002', 'default', 'Transport Allowance', 'TRANS', 'earning', true, 500000, true, 2),
('bb100000-0000-0000-0000-000000000003', 'default', 'Meal Allowance', 'MEAL', 'earning', true, 750000, true, 3),
('bb100000-0000-0000-0000-000000000004', 'default', 'BPJS Kesehatan', 'BPJS-K', 'deduction', true, 0, false, 10),
('bb100000-0000-0000-0000-000000000005', 'default', 'BPJS Ketenagakerjaan', 'BPJS-TK', 'deduction', true, 0, false, 11),
('bb100000-0000-0000-0000-000000000006', 'default', 'PPh 21', 'PPH21', 'tax', true, 0, false, 20)
ON CONFLICT (id) DO NOTHING;

-- Payroll run
INSERT INTO hr_payroll_runs (id, tenant_id, period, name, status, total_gross, total_deductions, total_net, employee_count, processed_at) VALUES
('cc100000-0000-0000-0000-000000000001', 'default', '2026-03', 'March 2026 Payroll', 'completed', 498250000, 74737500, 423512500, 15, '2026-03-28T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Job postings
INSERT INTO hr_job_postings (id, tenant_id, title, department_id, position_id, description, location, employment_type, salary_min, salary_max, status, posted_date, closing_date, openings) VALUES
('dd100000-0000-0000-0000-000000000001', 'default', 'Senior Frontend Engineer', 'd1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'Looking for experienced frontend engineer for React/Next.js.', 'Jakarta (Hybrid)', 'full_time', 30000000, 45000000, 'open', '2026-04-01', '2026-05-31', 2),
('dd100000-0000-0000-0000-000000000002', 'default', 'DevOps Engineer', 'd1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'DevOps engineer with K8s and AWS experience.', 'Jakarta (Remote OK)', 'full_time', 28000000, 42000000, 'open', '2026-04-15', '2026-06-15', 1),
('dd100000-0000-0000-0000-000000000003', 'default', 'HR Coordinator', 'd1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000007', 'HR team support for recruitment and onboarding.', 'Jakarta (Onsite)', 'full_time', 10000000, 16000000, 'open', '2026-04-20', '2026-05-20', 1)
ON CONFLICT (id) DO NOTHING;

-- Applicants
INSERT INTO hr_applicants (id, tenant_id, job_posting_id, first_name, last_name, email, phone, source, stage, rating) VALUES
('ee100000-0000-0000-0000-000000000001', 'default', 'dd100000-0000-0000-0000-000000000001', 'Kevin', 'Susanto', 'kevin.s@gmail.com', '+628130001', 'linkedin', 'interview', 4),
('ee100000-0000-0000-0000-000000000002', 'default', 'dd100000-0000-0000-0000-000000000001', 'Anisa', 'Putri', 'anisa.p@gmail.com', '+628130002', 'website', 'screening', 3),
('ee100000-0000-0000-0000-000000000003', 'default', 'dd100000-0000-0000-0000-000000000001', 'Taufik', 'Hidayat', 'taufik.h@gmail.com', '+628130003', 'referral', 'offer', 5),
('ee100000-0000-0000-0000-000000000004', 'default', 'dd100000-0000-0000-0000-000000000002', 'Bayu', 'Wicaksono', 'bayu.w@gmail.com', '+628130004', 'job_board', 'applied', 3),
('ee100000-0000-0000-0000-000000000005', 'default', 'dd100000-0000-0000-0000-000000000002', 'Sarah', 'Amelia', 'sarah.a@gmail.com', '+628130005', 'linkedin', 'interview', 4),
('ee100000-0000-0000-0000-000000000006', 'default', 'dd100000-0000-0000-0000-000000000003', 'Dani', 'Kurniawan', 'dani.k@gmail.com', '+628130006', 'website', 'screening', 3)
ON CONFLICT (id) DO NOTHING;

-- Training
INSERT INTO hr_training_programs (id, tenant_id, name, description, category, duration_hours, provider, cost, start_date, end_date, status, is_mandatory) VALUES
('ff100000-0000-0000-0000-000000000001', 'default', 'AWS Cloud Practitioner', 'AWS fundamentals certification prep', 'technical', 40, 'AWS Training', 5000000, '2026-05-15', '2026-06-15', 'upcoming', false),
('ff100000-0000-0000-0000-000000000002', 'default', 'Leadership Essentials', 'Core leadership skills for new managers', 'leadership', 16, 'Internal', 0, '2026-04-01', '2026-04-15', 'completed', false),
('ff100000-0000-0000-0000-000000000003', 'default', 'Security Awareness', 'Annual mandatory security training', 'compliance', 4, 'Internal', 0, '2026-03-01', '2026-03-31', 'completed', true)
ON CONFLICT (id) DO NOTHING;

-- Performance reviews
INSERT INTO hr_performance_reviews (id, tenant_id, employee_id, reviewer_id, review_period, review_type, overall_rating, strengths, areas_for_improvement, status, completed_at) VALUES
('ab100000-0000-0000-0000-000000000001', 'default', 'e1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002', 'H2 2025', 'annual', 4, 'Strong technical skills, excellent code quality', 'Could improve documentation', 'completed', '2026-01-15T10:00:00Z'),
('ab100000-0000-0000-0000-000000000002', 'default', 'e1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000003', 'H2 2025', 'annual', 4, 'Quick learner, great team player', 'System design experience needed', 'completed', '2026-01-15T10:00:00Z'),
('ab100000-0000-0000-0000-000000000003', 'default', 'e1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000003', 'Q1 2026', 'probation', 3, 'Eager to learn, good communication', 'Code review turnaround improvement', 'completed', '2026-04-01T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
