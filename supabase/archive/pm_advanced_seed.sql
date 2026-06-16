-- ═══════════════════════════════════════════════════════════
-- PM PMBOK ADVANCED SEED DATA
-- Quality, EVM, Governance, Benefits, Communication Plans,
-- Procurement Links, Process Checklists, Tailoring,
-- Sustainability, Domain Health, Focus Areas, Principles
-- ═══════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. QUALITY METRICS (6 records)                          ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_quality_metrics (id, project_id, tenant_id, metric_name, description, unit, target_value, actual_value, tolerance_lower, tolerance_upper, measurement_method, frequency, status, last_measured_at) VALUES
  ('A0000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'API Response Time (P95)',     'P95 response time for all REST API endpoints',              'ms',       500,  420,  400,  600,  'Load test with k6 — 500 VUs for 30 min',           'weekly',   'on_track',    '2026-04-14 18:00:00+07'),
  ('A0000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Code Coverage',               'Unit test code coverage across all modules',                '%',        80,   73,   75,   100,  'Jest coverage report from CI pipeline',             'per_build','at_risk',     '2026-04-15 08:00:00+07'),
  ('A0000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Defect Escape Rate',          'Percentage of defects found after QA sign-off',             '%',        5,    3,    0,    8,    'Defects tagged post-release / total defects',       'weekly',   'on_track',    '2026-04-14 18:00:00+07'),
  ('A0000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'AI Categorization Accuracy',  'ITSM ticket auto-categorization accuracy',                  '%',        90,   93,   85,   100,  'Confusion matrix on 200 test tickets',              'weekly',   'exceeding',   '2026-04-14 18:00:00+07'),
  ('A0000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Migration Data Integrity',    'Row count + checksum match between source and target',      '%',        100,  NULL, 99.99,100,  'pg_dump checksum comparison',                       'per_batch','pending',     NULL),
  ('A0000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Staff Training Completion',   'Percentage of staff who completed security awareness',      '%',        100,  0,    90,   100,  'LMS completion reports',                            'weekly',   'not_started', NULL)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. QUALITY CHECKLISTS (4 records)                       ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_quality_checklists (id, project_id, tenant_id, checklist_name, description, deliverable, items, inspector, inspection_date, status) VALUES
  ('A1000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'API Release Checklist',     'Pre-release quality gate for API endpoints',       'REST API v4.0',
   '[{"item":"All endpoints return correct HTTP status codes","checked":true},{"item":"Error responses follow RFC 7807 format","checked":true},{"item":"Rate limiting configured","checked":true},{"item":"API documentation updated","checked":false},{"item":"Load test passed (500 VUs)","checked":false}]',
   'Wayan Darma', '2026-04-15', 'in_progress'),

  ('A1000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Frontend Release Checklist', 'UI quality checks before v4.0 deployment',         'Admin Dashboard v4.0',
   '[{"item":"All 8 themes render correctly","checked":true},{"item":"Responsive on mobile (375px)","checked":true},{"item":"Lighthouse score > 85","checked":true},{"item":"No console errors in production build","checked":true},{"item":"Accessibility audit passed","checked":false}]',
   'Kadek Ayu',   '2026-04-15', 'in_progress'),

  ('A1000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Migration Readiness Checklist', 'Pre-migration verification checklist',          'AWS Infrastructure',
   '[{"item":"VPC and subnets provisioned","checked":true},{"item":"Security groups configured","checked":true},{"item":"RDS instance provisioned","checked":false},{"item":"S3 buckets created with lifecycle","checked":false},{"item":"CloudFront distribution configured","checked":false},{"item":"DNS cutover plan documented","checked":false}]',
   'Nyoman Astra', NULL, 'draft'),

  ('A1000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'ISO 27001 Annex A Checklist',  'Annex A controls compliance verification',      'ISMS Documentation',
   '[{"item":"A.5 Information Security Policies","checked":true},{"item":"A.6 Organization of InfoSec","checked":true},{"item":"A.7 Human Resource Security","checked":false},{"item":"A.8 Asset Management","checked":false},{"item":"A.9 Access Control","checked":false}]',
   'Wayan Darma',  '2026-04-14', 'in_progress')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. QUALITY INSPECTIONS (4 records)                      ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_quality_inspections (id, project_id, tenant_id, inspection_type, deliverable, inspector, inspection_date, findings, corrective_actions, result, follow_up_date) VALUES
  ('A2000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'code_review',     'AI Lead Scoring Endpoint',  'Bagus Mahendra', '2026-04-10', 'Code quality good. Found 2 minor issues:\n1. Missing input validation on score range\n2. No retry logic for Vertex AI timeouts', '1. Added Zod schema validation\n2. Implemented exponential backoff with 3 retries', 'pass', NULL),
  ('A2000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'security_review', 'Authentication Middleware', 'Wayan Darma',    '2026-04-12', 'JWT validation correct. CORS properly configured. Found:\n1. API key rotation not implemented\n2. Rate limiter uses in-memory store (lost on restart)', '1. Added key rotation via env vars\n2. Migrated rate limiter to Redis', 'conditional_pass', '2026-04-18'),
  ('A2000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'ux_review',       'Dashboard Theming System',  'Product Manager','2026-04-13', 'All 8 themes verified. Excellent glassmorphism effect. Minor issues:\n1. Ocean theme contrast ratio too low on navigation text\n2. Sunset palette too bright on charts', '1. Darkened nav text for ocean theme\n2. Adjusted sunset chart palette saturation', 'pass', NULL),
  ('A2000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'architecture_review', 'AWS VPC Design',        'AWS Consultant', '2026-04-10', 'Well-architected design. Recommendations:\n1. Add VPC flow logs for security monitoring\n2. Consider NAT Gateway in both AZs for HA', '1. VPC flow logs added to Terraform\n2. Dual NAT Gateway approved under revised budget', 'pass', NULL)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. EARNED VALUE MANAGEMENT (6 records)                  ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_earned_values (id, project_id, tenant_id, snapshot_date, planned_value, earned_value, actual_cost, schedule_variance, cost_variance, schedule_performance_index, cost_performance_index) VALUES
  ('A3000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '2026-04-08',  150000000,  145000000,  140000000,   -5000000,   5000000, 0.97, 1.04),
  ('A3000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '2026-04-15',  380000000,  350000000,  365000000,  -30000000, -15000000, 0.92, 0.96),
  ('A3000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-04-08',   80000000,   82000000,   78000000,    2000000,   4000000, 1.03, 1.05),
  ('A3000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-04-15',  180000000,  178000000,  195000000,   -2000000, -17000000, 0.99, 0.91),
  ('A3000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '2026-04-08',   30000000,   32000000,   28000000,    2000000,   4000000, 1.07, 1.14),
  ('A3000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '2026-04-15',   70000000,   68000000,   65000000,   -2000000,   3000000, 0.97, 1.05)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. GOVERNANCE DECISIONS (5 records)                     ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_governance (id, tenant_id, project_id, decision_type, title, description, decision, decided_by, decided_at, status, impact) VALUES
  ('A4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'scope',     'Defer WebSocket Notifications to v4.1',   'CR-003 requested real-time push notifications via WebSocket.',        'Deferred to v4.1 — insufficient time and adds deployment risk.',       'Bagus Mahendra', '2026-04-14 10:00:00+07', 'approved', 'Timeline protected. Feature moves to next release.'),
  ('A4000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'technical', 'Use Redis for API Rate Limiting',          'In-memory rate limiter loses state on pod restart.',                  'Migrate to Redis-based rate limiter for persistence across restarts.', 'Agus Prasetyo',  '2026-04-12 14:00:00+07', 'approved', 'Requires Redis setup in Docker Compose. Minimal effort.'),
  ('A4000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'financial', 'Approve Revised AWS Budget',               'Initial estimate IDR 35M/month revised to IDR 38.5M due to WAF + NAT.', 'Approved with condition: review after 3 months for Savings Plans.',  'CEO',            '2026-04-13 09:00:00+07', 'approved', 'Budget increases by 10%. Savings Plans expected to offset.'),
  ('A4000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'risk',      'Accept Jakarta Latency Risk',             'Users in Jakarta may see 20-30ms increase after Singapore migration.', 'Accepted — within tolerance. CDN mitigates for static content.',      'Head of Infra',  '2026-04-10 16:00:00+07', 'approved', 'No action needed if latency stays below 200ms.'),
  ('A4000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'resource',  'Engage External ISMS Consultant',         'Internal team lacks ISO 27001 lead auditor experience.',              'Engage BSI-certified consultant for May-June at IDR 45M.',           'CISO',           '2026-04-15 11:00:00+07', 'pending',  'Critical for on-time certification. Budget available.')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. BENEFITS REGISTER (5 records)                        ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_benefits (id, tenant_id, project_id, title, description, category, target_value, actual_value, measurement_method, realization_date, status, owner) VALUES
  ('A5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Revenue Increase from AI Features',   'AI lead scoring expected to improve conversion by 25%',       'revenue',      'IDR 500M/year additional revenue',  NULL, 'CRM conversion rate tracking over 6 months',       '2026-10-31', 'planned',  'VP Sales'),
  ('A5000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Support Cost Reduction',              'AI ticket categorization reduces manual triage by 70%',        'cost_savings', '3 FTE hours/day saved',             NULL, 'Compare pre/post triage time average',             '2026-07-31', 'planned',  'ITSM Manager'),
  ('A5000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Infrastructure Cost Reduction',       'AWS migration expected to reduce hosting costs by 30%',        'cost_savings', 'IDR 180M/year savings',             NULL, 'Compare monthly hosting invoices pre/post',        '2026-10-31', 'planned',  'Head of Infra'),
  ('A5000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Improved Disaster Recovery',          'RTO improvement from 24h (current) to 4h (AWS)',               'risk',         'RTO < 4 hours',                     NULL, 'DR test execution and measurement',                '2026-06-30', 'planned',  'DBA Lead'),
  ('A5000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Enterprise Client Qualification',     'ISO 27001 certification opens enterprise sales opportunities','strategic',    '5 new enterprise clients in 12 months',NULL, 'Track enterprise deals requiring ISO certification','2027-06-30', 'planned',  'VP Sales')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. COMMUNICATION PLANS (6 records)                      ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_comm_plans (id, project_id, tenant_id, communication_item, target_audience, frequency, method, responsible_person, key_message, notes, status) VALUES
  ('A6000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Sprint Status Report',     'VP Engineering, CEO',           'weekly',    'Email + Confluence', 'Bagus Mahendra',  'Sprint progress, velocity, risks, and blockers',         NULL,                              'active'),
  ('A6000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Daily Standup',            'Development Team',              'daily',     'Google Meet',        'Bagus Mahendra',  'What we did, what we plan, any blockers',                '15 minutes max, 9 AM WIB',        'active'),
  ('A6000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Stakeholder Demo',         'CEO, Product Manager, Clients', 'bi_weekly', 'Zoom + Recording',   'Kadek Ayu',       'Feature showcase and feedback collection',               'Record and share with absent stakeholders', 'active'),
  ('A6000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Migration Progress Update','Head of Infra, CEO',            'weekly',    'Email + Dashboard',  'Agus Prasetyo',   'Migration status, infrastructure readiness, cost tracking','Include AWS cost dashboard screenshot', 'active'),
  ('A6000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Maintenance Window Notice','All Staff + Clients',           'as_needed', 'Email + Slack',      'Nyoman Astra',    'Planned downtime, impact, and expected recovery time',    '48h advance notice required',     'draft'),
  ('A6000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'ISO Compliance Update',    'CISO, CEO, HR Director',        'bi_weekly', 'Email + Meeting',    'Wayan Darma',     'Gap remediation progress, training status, audit prep',   NULL,                              'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  8. PROCUREMENT LINKS (4 records)                        ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_procurement_links (id, project_id, tenant_id, entity_type, entity_id, contract_type, budget_allocated, description, notes, status) VALUES
  ('A7000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'supplier', 'af000001-0012-4000-a000-000000000012', 'license',    25000000,  'Google Cloud Vertex AI API credits',              'Annual agreement, pay-per-use',    'active'),
  ('A7000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'supplier', '30000001-0003-4000-a000-000000000003', 'service',    45000000,  'AWS consulting and migration support',             '3-month engagement',               'active'),
  ('A7000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'po',       '30000001-0008-4000-a000-000000000008', 'purchase',   180000000, 'AWS Reserved Instances — 1 year commitment',       'Covers RDS, EC2, ElastiCache',     'active'),
  ('A7000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'supplier', '30000001-0003-4000-a000-000000000003', 'consulting', 45000000,  'External ISMS consultant for ISO 27001 audit prep','BSI-certified lead auditor',        'pending')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  9. PROCESS CHECKLIST (6 records)                        ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_process_checklist (id, tenant_id, project_id, process_group, process_name, process_description, is_applicable, is_adopted, completion_percent, status, responsible_role, deliverables, notes, evidence_url, reviewed_date) VALUES
  ('A8000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Initiating',  'Develop Project Charter',        'Formally authorize the project and document initial requirements.',    true,  true,  100, 'completed', 'Project Manager',   'Project Charter document',           NULL, NULL, '2026-04-07'),
  ('A8000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Planning',    'Define Scope Statement',         'Document detailed project scope, deliverables, and exclusions.',       true,  true,  100, 'completed', 'Project Manager',   'Scope Statement document',           NULL, NULL, '2026-04-07'),
  ('A8000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Planning',    'Create Resource Plan',           'Identify and allocate team resources with roles and availability.',    true,  true,  100, 'completed', 'Project Manager',   'Resource Plan',                      NULL, NULL, '2026-04-07'),
  ('A8000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Executing',   'Manage Quality Assurance',       'Execute quality management processes and inspections.',               true,  true,  60,  'in_progress','QA Lead',           'Inspection reports, test results',   NULL, NULL, '2026-04-14'),
  ('A8000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Monitoring',  'Monitor Risks',                  'Track identified risks and identify new risks throughout execution.',  true,  true,  50,  'in_progress','Project Manager',   'Updated risk register',              NULL, NULL, '2026-04-14'),
  ('A8000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Closing',     'Close Project or Phase',         'Finalize all activities, document lessons learned, formal closure.',   true,  false, 0,   'not_started','Project Manager',   'Closure report, lessons learned',    NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  10. TAILORING LOG (4 records)                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_tailoring_log (id, tenant_id, project_id, process_area, original_approach, tailored_approach, justification, approved_by, approved_at, status) VALUES
  ('A9000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Documentation',    'Full PMBOK document set with formal sign-offs',       'Lightweight Confluence pages with async approval via Slack',      'Agile team — heavy documentation slows velocity without adding value',       'VP Engineering', '2026-04-07 09:00:00+07', 'approved'),
  ('A9000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Change Control',   'Formal CCB meetings for all change requests',         'Async review in Slack with 24h response window for minor CRs',   'Short sprint cycles dont allow for weekly CCB meetings',                     'Bagus Mahendra',  '2026-04-07 09:00:00+07', 'approved'),
  ('A9000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Risk Management',  'Quantitative risk analysis with Monte Carlo simulation','Qualitative risk matrix with weekly review',                     'Project size does not justify quantitative analysis cost',                   'Head of Infra',  '2026-04-01 10:00:00+07', 'approved'),
  ('A9000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Stakeholder Mgmt', 'Formal stakeholder register with power/interest grid', 'Simplified stakeholder list with RACI assignments',              'Small project team — all stakeholders are directly involved in daily ops',   'CISO',           '2026-04-01 10:00:00+07', 'approved')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  11. SUSTAINABILITY METRICS (4 records)                  ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_sustainability (id, tenant_id, project_id, metric_name, category, target_value, actual_value, unit, measurement_date, status, notes) VALUES
  ('AA000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Carbon Footprint — Cloud Compute',   'environmental', '50 kgCO2e/month',    '42 kgCO2e/month',  'kgCO2e', '2026-04-15', 'on_track', 'GCP carbon-free energy at 90% for us-central1'),
  ('AA000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Remote Work Ratio',                   'social',        '80%',                '95%',              '%',      '2026-04-15', 'exceeding','Full remote team reduces commuting emissions'),
  ('AA000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Data Center Power Reduction',          'environmental', '100% reduction',     '0% (pre-migration)','%',      '2026-04-15', 'pending',  'On-prem DC uses 15kW. AWS migration eliminates local power.'),
  ('AA000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Digital-First Documentation',          'governance',    '90% digital',        '75% digital',       '%',     '2026-04-15', 'in_progress', 'Moving from paper-based to digital ISMS documentation')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  12. DOMAIN HEALTH (8 records)                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_domain_health (id, tenant_id, project_id, domain, health_status, score, notes, assessed_at) VALUES
  ('AB000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Stakeholder',  'green',  90, 'Strong stakeholder engagement. Weekly demos well-received.',       '2026-04-15 10:00:00+07'),
  ('AB000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Team',         'green',  85, 'Team morale good. Slight pressure from scope creep requests.',    '2026-04-15 10:00:00+07'),
  ('AB000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Approach',     'yellow', 70, 'Agile approach working but sprint velocity dropped 15%.',         '2026-04-15 10:00:00+07'),
  ('AB000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Planning',     'green',  80, 'Planning adequate. Task dependencies properly tracked.',          '2026-04-15 10:00:00+07'),
  ('AB000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Project Work', 'yellow', 72, 'Behind by ~1 day. Code coverage needs improvement to reach 80%.', '2026-04-15 10:00:00+07'),
  ('AB000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Delivery',     'green',  82, 'AI features on track. Dashboard quality exceeds expectations.',   '2026-04-15 10:00:00+07'),
  ('AB000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Measurement',  'green',  88, 'EVM metrics tracked. Quality metrics automated via CI.',          '2026-04-15 10:00:00+07'),
  ('AB000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Uncertainty',  'yellow', 65, 'API performance risk remains. Vertex AI quota response pending.', '2026-04-15 10:00:00+07')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  13. FOCUS AREAS (5 records)                             ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_focus_areas (id, tenant_id, project_id, area, priority, description, status) VALUES
  ('AC000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'AI Feature Delivery',    'high',   'Complete lead scoring and ticket categorization endpoints',          'in_progress'),
  ('AC000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Code Quality Improvement','medium', 'Increase test coverage from 73% to 80% target',                     'in_progress'),
  ('AC000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Performance Optimization','high',   'Ensure P95 response stays under 500ms with 500 concurrent users',   'planned'),
  ('AC000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Terraform IaC Completion','high',   'Complete all 18 Terraform modules for AWS infrastructure',          'in_progress'),
  ('AC000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Gap Remediation',         'high',   'Address all 5 high-priority ISO 27001 control gaps',                'in_progress')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  14. PRINCIPLES v8 (6 records)                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_principles_v8 (id, tenant_id, project_id, principle_key, principle_name, maturity_level, score, current_state, target_state, gap_analysis, action_items, evidence, assessed_by, assessed_date, review_cycle) VALUES
  ('AD000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'stewardship',    'Be a Diligent, Respectful, and Caring Steward', 'managed',     4, 'Team has clear ethical guidelines and resource accountability.',  'Full stewardship culture with proactive mentoring.',           'Gap: No formal mentoring program.',          'Establish mentoring pairs within team.',       'Code of conduct signed by all. Resource tracking in place.', 'Bagus Mahendra', '2026-04-14', 'monthly'),
  ('AD000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'team',           'Create a Collaborative Project Team Environment','optimizing',  5, 'Daily standups, pair programming, knowledge sharing sessions.',  'Self-organizing team with minimal PM intervention.',           'Already exceeding — team is highly collaborative.', NULL,                                    'Sprint retrospective feedback consistently positive.', 'Bagus Mahendra', '2026-04-14', 'monthly'),
  ('AD000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'stakeholders',   'Effectively Engage with Stakeholders',           'defined',     3, 'Weekly status reports and bi-weekly demos.',                     'Proactive stakeholder engagement with feedback loops.',        'Gap: No formal feedback collection mechanism.','Add structured feedback form to demos.', 'Status reports sent weekly. Demo recordings shared.',     'Bagus Mahendra', '2026-04-14', 'monthly'),
  ('AD000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'value',          'Focus on Value',                                 'managed',     4, 'Features prioritized by business value. MoSCoW method used.',   'Continuous value stream mapping with metrics.',                'Gap: No formal value measurement metrics.', 'Implement OKR tracking for feature value.',   'MoSCoW prioritization in backlog. Sprint goals aligned.', 'Bagus Mahendra', '2026-04-14', 'monthly'),
  ('AD000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'systems',        'Recognize, Evaluate, and Respond to System Interactions', 'initial', 2, 'Dependencies tracked but system-level impact analysis is informal.', 'Formal dependency mapping with automated impact analysis.', 'Gap: No architecture decision records.',    'Start ADR practice. Map service dependencies.', 'Docker Compose setup documents service interactions.', 'Bagus Mahendra', '2026-04-14', 'monthly'),
  ('AD000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'quality',        'Build Quality into Processes and Deliverables',   'managed',     4, 'CI/CD pipeline, automated testing, code reviews mandatory.',    'Quality gates at every stage with automated enforcement.',     'Gap: Code coverage at 73%, target is 80%.', 'Add quality gate to CI — fail build below 80%.', 'CI pipeline configured. PR reviews mandatory.',       'Bagus Mahendra', '2026-04-14', 'monthly')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  15. PRINCIPLE ASSESSMENTS (6 records)                   ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_principle_assessments (id, tenant_id, project_id, principle_name, maturity_level, assessment_notes, evidence, action_items, assessed_by, assessed_at) VALUES
  ('AE000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Be a Diligent Steward',           4, 'Team demonstrates strong accountability. Resource utilization well-tracked.',                   'Budget tracking dashboard shows 96% accuracy.',           'Implement formal mentoring pairs.',                    'Bagus Mahendra', '2026-04-14 16:00:00+07'),
  ('AE000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Collaborative Team Environment',  5, 'Exceptional team dynamics. Pair programming and knowledge sharing are standard.',               'Sprint retro scores averaging 4.5/5 for collaboration.',  NULL,                                                   'Bagus Mahendra', '2026-04-14 16:00:00+07'),
  ('AE000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Stakeholder Engagement',          3, 'Regular communication in place but feedback collection needs formalization.',                  'Weekly reports sent. Demo attendance at 85%.',             'Add feedback survey to bi-weekly demos.',               'Bagus Mahendra', '2026-04-14 16:00:00+07'),
  ('AE000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Focus on Value',                  4, 'Business value drives prioritization. MoSCoW method consistently applied.',                    'Backlog ordered by value. Sprint goals reflect business priorities.', 'Implement formal value realization tracking.', 'Bagus Mahendra', '2026-04-14 16:00:00+07'),
  ('AE000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Systems Thinking',                2, 'Team understands service dependencies but lacks formal mapping.',                              'Docker Compose documents runtime dependencies.',           'Create Architecture Decision Records. Map all service integrations.', 'Bagus Mahendra', '2026-04-14 16:00:00+07'),
  ('AE000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Build Quality into Processes',    4, 'Strong quality practices in CI/CD. Code coverage needs to reach 80% target.',                  'CI pipeline with automated tests. PR reviews mandatory.',  'Add quality gate: fail build if coverage drops below 80%.', 'Bagus Mahendra', '2026-04-14 16:00:00+07')
ON CONFLICT (id) DO NOTHING;


NOTIFY pgrst, 'reload schema';
