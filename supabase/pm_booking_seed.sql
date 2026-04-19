-- ═══════════════════════════════════════════════════════════
-- PM MODULE + BOOKING PASSENGERS SEED DATA
-- Charters, Scope, Requirements, Change Requests, Status
-- Reports, Lessons Learned, Resource Plans, Meeting Minutes,
-- RACI, Task Dependencies, Booking Passengers
-- ═══════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. PROJECT CHARTERS (3 records)                         ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_project_charters (id, project_id, tenant_id, purpose, objectives, high_level_requirements, high_level_risks, summary_milestone_schedule, preapproved_financial_resources, key_stakeholders, project_approval_requirements) VALUES
  ('80000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
   'Deliver NusantaraSoft v4.0 with AI-powered features, dynamic theming, and complete ERP module coverage to become the leading Indonesian SaaS ERP platform.',
   '1. Launch AI lead scoring and ticket categorization by Apr 30\n2. Complete CRM, ITSM, Inventory, and PM modules\n3. Achieve <2s page load time across all modules\n4. Support 500+ concurrent users',
   '- AI/ML integration with Google Vertex AI\n- Dynamic theming with multi-palette support\n- Complete CRUD for all 12 modules\n- Real-time GraphQL subscriptions\n- Mobile-responsive admin dashboard',
   '- API performance under high load\n- Key developer availability\n- Scope creep on dashboard features\n- Third-party API rate limits',
   'Sprint 12: Apr 7-22 (AI features)\nSprint 13: Apr 23-30 (QA & Polish)\nGo-Live: Apr 30, 2026',
   'IDR 850,000,000 (Engineering + Infrastructure + Licensing)',
   'CEO NusantaraSoft, VP Engineering, Product Manager, QA Lead',
   'UAT sign-off by Product Manager\nPerformance benchmark approval by VP Engineering\nSecurity review clearance'),

  ('80000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010',
   'Migrate all production workloads from on-premise data center to AWS ap-southeast-1 (Singapore) to improve scalability, reduce costs, and enable disaster recovery.',
   '1. Zero data loss during migration\n2. Maximum 4-hour maintenance window\n3. 30% infrastructure cost reduction within 6 months\n4. RPO < 1 hour, RTO < 4 hours',
   '- AWS VPC with multi-AZ setup\n- RDS PostgreSQL migration from on-prem\n- S3 for media and backup storage\n- CloudFront CDN for static assets\n- Terraform IaC for all resources',
   '- Data loss during migration\n- AWS cost overrun\n- Network latency increase\n- Compliance requirements for data in Singapore',
   'Assessment: Apr 1-7\nDesign: Apr 8-16\nStaging: Apr 17-23\nMigration: Apr 28-29\nValidation: Apr 30',
   'IDR 450,000,000 (AWS Reserved Instances + Migration Tools + Consulting)',
   'Head of Infrastructure, AWS Solutions Architect, DBA Lead, Security Officer',
   'Successful staging validation\nDR test completion\nSecurity audit clearance'),

  ('80000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010',
   'Achieve ISO 27001:2022 certification to demonstrate information security management commitment and meet enterprise client requirements.',
   '1. Complete gap analysis and remediation by Apr 30\n2. Implement ISMS policies and procedures\n3. Train 100% of staff on security awareness\n4. Pass certification audit in Q3 2026',
   '- Information Security Management System (ISMS)\n- Risk assessment and treatment plan\n- Access control and identity management\n- Incident response procedures\n- Business continuity planning',
   '- Staff training completion delays\n- Non-conformity in existing access controls\n- Budget for external auditor fees\n- Ongoing compliance maintenance cost',
   'Gap Analysis: Apr 1-14\nPolicy Drafting: Apr 15 - May 6\nTraining: May 7-13\nInternal Audit: May 14-20\nCertification Audit: Jul 2026',
   'IDR 200,000,000 (Consulting + Audit Fees + Training + Tools)',
   'CEO, CISO, Head of IT, HR Director, Legal Counsel',
   'Internal audit with zero major non-conformities\nManagement review approval\nAll staff trained and certified')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. SCOPE STATEMENTS (3 records)                         ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_scope_statements (id, project_id, tenant_id, project_objectives, product_scope_description, deliverables, acceptance_criteria, exclusions, constraints, assumptions) VALUES
  ('81000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
   'Deliver a production-ready v4.0 release with AI capabilities, modern UI, and complete ERP coverage.',
   'NusantaraSoft v4.0 is a cloud-based ERP platform featuring 12+ integrated modules (CRM, ITSM, Inventory, Procurement, PM, E-commerce, etc.) with AI-powered lead scoring, ticket categorization, and a dynamic theming system.',
   '- AI lead scoring API endpoint\n- AI ticket categorization for ITSM\n- ITSM service catalog CRUD\n- Dynamic theming with 8 color palettes\n- Dashboard analytics widgets\n- Production deployment with rollback',
   '- All features pass UAT scenarios\n- Page load < 2 seconds on 4G\n- Zero critical/high severity bugs\n- API response < 500ms at P95\n- 99.9% uptime SLA in first 30 days',
   '- Mobile native apps (web-only for v4.0)\n- Multi-language i18n (English only)\n- Legacy data migration from v2.x\n- Custom client-specific features',
   '- 4-week timeline (non-negotiable)\n- Team of 5 developers\n- Budget cap IDR 850M\n- Must use existing GCP infrastructure',
   '- Vertex AI API quotas sufficient for launch\n- No breaking changes to existing APIs\n- Supabase handles auth scaling\n- Design system already established'),

  ('81000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010',
   'Complete migration of all production workloads to AWS with zero data loss and minimal downtime.',
   'Full infrastructure migration from on-premise Jakarta data center to AWS ap-southeast-1 region, including compute, database, storage, and networking.',
   '- AWS VPC architecture with multi-AZ\n- RDS PostgreSQL (migrated from on-prem)\n- S3 media storage with lifecycle policies\n- CloudFront CDN configuration\n- Terraform IaC repository\n- DR runbook and testing results',
   '- Zero data loss verified by checksum\n- Maintenance window < 4 hours\n- All services accessible within 30 mins post-cutover\n- DR test demonstrates RTO < 4 hours',
   '- Office network equipment migration\n- End-user device management\n- Email server (remains on Google Workspace)\n- Physical security of old data center',
   '- 4-hour maximum maintenance window\n- AWS ap-southeast-1 region only\n- Budget cap IDR 450M\n- Must maintain compliance with Indonesian data regulations',
   '- AWS account and credits already provisioned\n- Network bandwidth sufficient for data transfer\n- Team has AWS certification\n- No active SLA violations during migration window'),

  ('81000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010',
   'Achieve ISO 27001:2022 certification and establish ongoing information security management practices.',
   'Implementation of a comprehensive ISMS aligned with ISO 27001:2022 covering all NusantaraSoft operations, development processes, and customer data handling.',
   '- ISMS policy document suite\n- Risk assessment and treatment plan\n- Statement of Applicability (SoA)\n- Security awareness training completion\n- Internal audit report\n- Management review minutes\n- Certification audit readiness',
   '- All Annex A controls addressed\n- Zero major non-conformities in internal audit\n- 100% staff training completion\n- External auditor grants Stage 1 clearance',
   '- SOC 2 Type II (separate initiative)\n- PCI-DSS compliance\n- Physical security of third-party data centers\n- Customer-side security controls',
   '- Budget IDR 200M\n- Must use existing security tools where possible\n- Certification body: BSI or TÜV\n- Timeline target: Q3 2026',
   '- Management commitment confirmed\n- Existing security policies cover 60% of requirements\n- Staff available for training sessions\n- External consultant available May-June')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. REQUIREMENTS (10 records)                            ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_requirements (id, project_id, tenant_id, requirement_id, title, description, category, priority, source, test_case, verification_method, status) VALUES
  ('82000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'REQ-001', 'AI Lead Scoring API',              'System shall provide a REST API endpoint that accepts lead data and returns a score 0-100 using Vertex AI.',                   'functional',      'must_have',   'Product Manager',   'Submit 100 test leads and verify scores are returned within 500ms with accuracy >85%.',   'test',          'approved'),
  ('82000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'REQ-002', 'AI Ticket Categorization',         'ITSM tickets shall be automatically categorized into predefined categories using NLP with >90% accuracy.',                     'functional',      'must_have',   'VP Engineering',    'Submit 200 sample tickets and verify categorization accuracy exceeds 90%.',                'test',          'approved'),
  ('82000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'REQ-003', 'Dynamic Theme System',             'Dashboard shall support 8 color palettes that can be switched without page reload.',                                           'functional',      'must_have',   'UX Designer',       'Switch between all 8 themes and verify all UI elements update within 100ms.',             'demonstration', 'approved'),
  ('82000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'REQ-004', 'Page Load Performance',            'All dashboard pages shall load within 2 seconds on a 4G connection (10 Mbps).',                                                 'non_functional',  'must_have',   'VP Engineering',    'Run Lighthouse performance audit on all pages. Score must be >85.',                       'test',          'approved'),
  ('82000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'REQ-005', 'Concurrent User Support',          'System shall handle 500 concurrent users without degradation.',                                                                 'non_functional',  'should_have', 'Infrastructure',    'Run k6 load test with 500 virtual users for 30 minutes. P95 response <1s.',              'test',          'in_review'),
  ('82000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'REQ-006', 'Zero Data Loss Migration',         'All production data must be migrated with zero data loss verified by row-count and checksum comparison.',                       'functional',      'must_have',   'DBA Lead',          'Compare row counts and MD5 checksums of all tables pre and post migration.',              'inspection',    'approved'),
  ('82000000-0000-0000-0000-000000000007', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'REQ-007', 'Maintenance Window Limit',         'Total downtime during migration shall not exceed 4 hours.',                                                                     'constraint',      'must_have',   'CEO',               'Track actual downtime from cutover start to all services green.',                         'inspection',    'approved'),
  ('82000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'REQ-008', 'Disaster Recovery RTO/RPO',        'DR solution must achieve RPO < 1 hour and RTO < 4 hours for all critical services.',                                            'non_functional',  'must_have',   'Head of Infra',     'Simulate full region failure and measure recovery time and data loss.',                    'test',          'approved'),
  ('82000000-0000-0000-0000-000000000009', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'REQ-009', 'Staff Security Training',          'All employees must complete security awareness training and pass assessment with >80% score.',                                  'organizational', 'must_have',   'HR Director',       'Training completion report showing 100% attendance and >80% pass rate.',                   'inspection',    'draft'),
  ('82000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'REQ-010', 'Access Control Policy',            'Implement role-based access control aligned with ISO 27001 Annex A.9 across all systems.',                                      'functional',      'must_have',   'CISO',              'Audit access logs and verify principle of least privilege across 5 critical systems.',     'test',          'in_review')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. CHANGE REQUESTS (5 records)                          ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_change_requests (id, project_id, tenant_id, change_number, title, description, reason, impact_scope, impact_schedule, impact_cost, impact_quality, requested_by, requested_date, reviewed_by, decision, decision_date, decision_notes, implementation_notes, priority, status) VALUES
  ('83000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'CR-001', 'Add Dark Mode Toggle to Dashboard',      'Add a user-accessible dark/light mode toggle to the top navigation bar.',                          'Multiple user requests and UX best practice for prolonged screen use.', '+1 UI component, 2 CSS variants', '+1 day for testing',   'IDR 0 (internal effort)', 'Improved UX for night-shift operators', 'Kadek Ayu',         '2026-04-09', 'Bagus Mahendra', 'approved',  '2026-04-10', 'Low effort, high impact. Include in Sprint 12.', 'Implemented via CSS custom properties toggle.', 'medium', 'implemented'),
  ('83000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'CR-002', 'Add Bulk Export to CSV for All Modules',  'Enable CSV export from any data table across all 12 modules.',                                     'Enterprise clients require data export for compliance and reporting.',  '+1 shared utility component',     '+2 days development',  'IDR 0 (internal effort)', 'Positive — adds enterprise readiness', 'VP Engineering',    '2026-04-11', 'Bagus Mahendra', 'approved',  '2026-04-12', 'Generic utility — implement once, apply everywhere.', NULL,                           'high',   'in_progress'),
  ('83000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'CR-003', 'Add Real-Time Notifications via WebSocket','Implement push notifications for ticket assignments and deal updates.',                            'Reduce reliance on email notifications. Improve response time.',       '+1 WebSocket service, notification center', '+5 days', 'IDR 15,000,000 (Pusher)', 'Better real-time collaboration',        'Product Manager',   '2026-04-13', 'Bagus Mahendra', 'deferred',  '2026-04-14', 'Too risky for v4.0 timeline. Move to v4.1.',     NULL,                                    'low',    'deferred'),
  ('83000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'CR-004', 'Add AWS WAF to CloudFront Distribution',  'Add Web Application Firewall rules to protect against common web exploits.',                       'Security audit recommendation — mandatory for production.',            '+WAF rule sets configuration',    '+1 day',               'IDR 5,000,000/month',     'Enhanced security posture',             'Security Officer',  '2026-04-10', 'Head of Infra',  'approved',  '2026-04-11', 'Required for ISO 27001. Include in staging.',    'Using AWS managed rule groups.',        'high',   'approved'),
  ('83000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'CR-005', 'Extend Training to Include Contractors',   'Include 15 external contractors in the security awareness training program.',                     'Contractors handle sensitive client data and must be compliant.',       '+15 training seats',              '+2 days',              'IDR 7,500,000 (licenses)','Broader compliance coverage',           'HR Director',       '2026-04-14', 'CISO',           'approved',  '2026-04-15', 'Essential for complete Annex A coverage.',        'LMS licenses increased.',              'medium', 'approved')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. STATUS REPORTS (6 records)                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_status_reports (id, project_id, tenant_id, report_date, report_period, overall_health, schedule_health, cost_health, scope_health, accomplishments, planned_activities, issues_and_risks, decisions_needed, key_metrics, prepared_by) VALUES
  ('84000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '2026-04-08', 'Week 14 (Apr 7-11)',   'green',  'green',  'green',  'green',  '- Sprint 12 planning completed\n- AI endpoint scaffolding done\n- Dynamic theming 80% complete', '- Backend API development continues\n- Frontend dashboard redesign\n- QA test plan preparation',  '- Vertex AI quota request pending\n- One dev on medical watch', 'None at this time', 'Velocity: 34 SP\nBurn-down: On track\nDefects: 0 open', 'Bagus Mahendra'),
  ('84000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '2026-04-15', 'Week 15 (Apr 14-18)',  'yellow', 'yellow', 'green',  'yellow', '- AI lead scoring deployed to staging\n- Ticket categorization at 93% accuracy\n- CSV export utility built', '- Complete remaining API endpoints\n- Start QA testing\n- Performance optimization', '- Scope creep: 3 new dashboard widget requests\n- API perf concern under load', 'Approve/defer CR-003 (WebSocket notifications)', 'Velocity: 28 SP\nBurn-down: 1 day behind\nDefects: 2 open (medium)',  'Bagus Mahendra'),
  ('84000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-04-08', 'Week 14 (Apr 7-11)',   'green',  'green',  'green',  'green',  '- Infrastructure assessment completed\n- Inventory of 47 services documented\n- AWS account configured', '- VPC and subnet design\n- Terraform module development\n- RDS migration planning', '- No critical risks identified yet',  'None', 'Services inventoried: 47\nAWS costs (est): IDR 35M/month', 'Agus Prasetyo'),
  ('84000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-04-15', 'Week 15 (Apr 14-18)',  'green',  'green',  'yellow', 'green',  '- VPC architecture design approved\n- Terraform base modules written\n- WAF change request approved', '- Complete Terraform IaC\n- Set up staging environment\n- Begin data migration planning', '- AWS cost estimate 10% over initial budget\n- Need Savings Plan review', 'Approve revised AWS budget (IDR 38.5M/month)', 'Terraform modules: 12/18\nDesign docs: 100%', 'Agus Prasetyo'),
  ('84000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '2026-04-08', 'Week 14 (Apr 7-11)',   'green',  'green',  'green',  'green',  '- Gap analysis 60% complete\n- Reviewed Annex A controls A.5-A.8\n- Initial risk register created', '- Complete gap analysis (A.5-A.18)\n- Begin policy drafting\n- RFP for external auditor', '- 12 gaps identified so far (3 high, 5 medium, 4 low)', 'None', 'Controls reviewed: 45/93\nGaps found: 12\nPolicies drafted: 0/15', 'Wayan Darma'),
  ('84000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '2026-04-15', 'Week 15 (Apr 14-18)',  'yellow', 'green',  'green',  'yellow', '- Gap analysis completed — 18 total gaps\n- Risk treatment plan drafted\n- Policy template selected', '- Draft ISMS policy suite\n- Begin SoA document\n- Schedule training sessions',  '- 18 gaps (5 high priority)\n- Access control policies need major rewrite\n- Training vendor selection delayed', 'Approve external ISMS consultant engagement', 'Controls reviewed: 93/93\nGaps found: 18\nPolicies drafted: 3/15', 'Wayan Darma')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. LESSONS LEARNED (6 records)                          ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_lessons_learned (id, project_id, tenant_id, category, title, situation, impact, lesson, recommendation, submitted_by, submitted_date, phase, tags) VALUES
  ('85000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'technical',       'Vertex AI Cold Start Latency',     'Initial API calls to Vertex AI took 8-12 seconds due to cold start.',              'First users of the day experienced timeout errors.',         'Always implement a warm-up mechanism for ML model endpoints.',   'Add a cron job that sends a health-check request every 10 minutes to keep the model warm.',  'Agus Prasetyo',    '2026-04-10', 'execution', '["ai","performance","vertex-ai"]'),
  ('85000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'process',         'Early QA Involvement Pays Off',     'QA was involved from sprint planning, not just at the end of sprints.',             'Caught 15 design issues during planning that would have cost 3x to fix later.',  'Include QA in sprint planning and design reviews from day one.', 'Make QA participation in sprint planning mandatory in all future projects.',                 'Wayan Darma',      '2026-04-12', 'planning',  '["qa","agile","sprint-planning"]'),
  ('85000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'communication',   'Scope Creep from Stakeholder Demos','Live demos to stakeholders generated 12 new feature requests in 2 weeks.',         'Team morale affected. Sprint velocity dropped 15%.',         'Set clear expectations before demos about what is in scope.',   'Add a "parking lot" section to demo meetings. All new ideas go to backlog for v4.1 review.', 'Bagus Mahendra',   '2026-04-14', 'execution', '["scope","stakeholders","demos"]'),
  ('85000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'technical',       'Infrastructure Inventory Gaps',     'Initial infrastructure assessment missed 8 microservices running on unused VMs.',  'Migration plan had to be revised, adding 2 days.',           'Always cross-reference running processes with documentation.',  'Use automated discovery tools (e.g., AWS Migration Hub) before manual inventory.',           'Nyoman Astra',     '2026-04-08', 'planning',  '["infrastructure","inventory","aws"]'),
  ('85000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'financial',       'AWS Cost Estimation Accuracy',      'Initial cost estimate was 10% below actual due to missing NAT Gateway and data transfer costs.', 'Budget revision needed within first 2 weeks.', 'Include all AWS service charges in estimates, especially networking.', 'Use AWS Pricing Calculator with a 15% contingency buffer for all future estimates.',        'Agus Prasetyo',    '2026-04-15', 'planning',  '["aws","cost","budgeting"]'),
  ('85000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'organizational', 'Gap Analysis Documentation Quality','Documenting gaps with screenshots and evidence made remediation 3x faster.',       'Clear evidence reduced back-and-forth with control owners.', 'Always document gaps with visual evidence and specific examples.', 'Create a standardized gap documentation template with mandatory evidence fields.',          'Wayan Darma',      '2026-04-14', 'execution', '["iso27001","documentation","audit"]')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. RESOURCE PLANS (8 records)                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_resource_plans (id, project_id, tenant_id, resource_name, role, resource_type, allocation_percent, hourly_rate, start_date, end_date, availability_hours, planned_hours, actual_hours, skills, notes, status) VALUES
  ('86000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Bagus Mahendra',   'Project Manager',        'internal', 100, 350000, '2026-04-07', '2026-04-30', 160, 160, 72,  'Agile, Scrum Master, PMBOK',             NULL,                            'active'),
  ('86000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Agus Prasetyo',    'Senior Backend Dev',     'internal', 100, 300000, '2026-04-07', '2026-04-30', 160, 160, 85,  'Go, Python, PostgreSQL, REST API',       NULL,                            'active'),
  ('86000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Kadek Ayu',        'Frontend Developer',     'internal', 100, 280000, '2026-04-07', '2026-04-30', 160, 160, 78,  'React, Next.js, TypeScript, CSS',        NULL,                            'active'),
  ('86000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Wayan Darma',      'QA Lead',                'internal', 50,  250000, '2026-04-07', '2026-04-30', 80,  80,  30,  'Manual Testing, Playwright, k6',         'Also 50% allocated to ISO project', 'active'),
  ('86000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Agus Prasetyo',    'Cloud Architect',        'internal', 50,  300000, '2026-04-01', '2026-04-30', 80,  80,  45,  'AWS, Terraform, Docker, Kubernetes',     'Split with v4.0 project',       'active'),
  ('86000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Nyoman Astra',     'Infrastructure Engineer','internal', 100, 280000, '2026-04-01', '2026-04-30', 160, 160, 90,  'Linux, Networking, AWS, Monitoring',     NULL,                            'active'),
  ('86000000-0000-0000-0000-000000000007', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'AWS Consultant',   'Solutions Architect',    'external', 25,  750000, '2026-04-08', '2026-04-30', 40,  40,  15,  'AWS, Well-Architected, Migration',       'Contracted via AWS Partner',    'active'),
  ('86000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Wayan Darma',      'ISMS Lead',              'internal', 50,  250000, '2026-04-01', '2026-05-20', 120, 120, 55,  'ISO 27001, Risk Assessment, Auditing',   'Also 50% on v4.0 QA',          'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  8. MEETING MINUTES (5 records)                          ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_meeting_minutes (id, project_id, tenant_id, meeting_type, meeting_date, title, attendees, agenda, discussion, decisions, action_items, next_meeting_date) VALUES
  ('87000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'sprint_planning', '2026-04-07 09:00:00+07', 'Sprint 12 Planning',
   'Bagus Mahendra, Agus Prasetyo, Kadek Ayu, Wayan Darma, Nyoman Astra',
   '1. Sprint 11 review\n2. Sprint 12 scope and story points\n3. Capacity check\n4. Risk review',
   '- Sprint 11 completed at 95% (1 story carried over)\n- AI features prioritized for Sprint 12\n- Kadek raised concern about design system completeness\n- Wayan confirmed QA test plan ready',
   '- Sprint 12 scope: 34 story points\n- AI endpoints are #1 priority\n- Dark mode CR-001 approved for this sprint',
   '[{"assignee":"Agus Prasetyo","action":"Begin Vertex AI endpoint","due":"2026-04-09"},{"assignee":"Kadek Ayu","action":"Complete theming system","due":"2026-04-11"},{"assignee":"Wayan Darma","action":"Prepare regression test suite","due":"2026-04-10"}]',
   '2026-04-14 09:00:00+07'),

  ('87000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'standup',         '2026-04-14 09:00:00+07', 'Sprint 12 Mid-Sprint Review',
   'Bagus Mahendra, Agus Prasetyo, Kadek Ayu, Wayan Darma',
   '1. Progress update\n2. Blockers\n3. Scope adjustment if needed',
   '- AI lead scoring at 95% complete\n- Ticket categorization accuracy improved to 93%\n- CSV export utility built and tested\n- 3 new CR requests from stakeholders',
   '- Defer CR-003 (WebSocket) to v4.1\n- Accept CR-001 and CR-002\n- Adjust sprint: add 2 days buffer for QA',
   '[{"assignee":"Bagus Mahendra","action":"Communicate scope decisions to stakeholders","due":"2026-04-15"},{"assignee":"Agus Prasetyo","action":"Deploy AI to staging","due":"2026-04-15"}]',
   '2026-04-21 09:00:00+07'),

  ('87000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'design_review',   '2026-04-10 14:00:00+07', 'AWS Architecture Design Review',
   'Agus Prasetyo, Nyoman Astra, AWS Consultant, Head of Infrastructure',
   '1. VPC architecture walkthrough\n2. Security group rules\n3. Cost estimate review\n4. DR strategy',
   '- Multi-AZ VPC design presented and reviewed\n- Security groups follow least-privilege model\n- Cost estimate: IDR 38.5M/month (10% over initial)\n- DR: Multi-AZ RDS with cross-region backup',
   '- VPC design approved\n- WAF addition approved (CR-004)\n- Revised budget to be submitted to CEO\n- DR strategy: active-passive with automated failover',
   '[{"assignee":"Nyoman Astra","action":"Implement VPC in Terraform","due":"2026-04-16"},{"assignee":"Agus Prasetyo","action":"Submit revised budget","due":"2026-04-12"}]',
   '2026-04-17 14:00:00+07'),

  ('87000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'kickoff',         '2026-04-01 10:00:00+07', 'ISO 27001 Project Kickoff',
   'I Made Suardana, Wayan Darma, CISO, HR Director, Legal Counsel',
   '1. Project overview and timeline\n2. Team assignments\n3. Gap analysis approach\n4. Quick wins',
   '- CEO confirmed full management commitment\n- Wayan assigned as ISMS Lead (50% allocation)\n- Gap analysis to use ISO 27001:2022 Annex A controls\n- Quick wins identified: password policy, MFA enforcement',
   '- Start gap analysis immediately\n- Engage external consultant by May 1\n- Implement MFA for all systems within 2 weeks\n- Target certification audit: July 2026',
   '[{"assignee":"Wayan Darma","action":"Begin gap analysis with A.5 controls","due":"2026-04-03"},{"assignee":"CISO","action":"Enforce MFA on all admin accounts","due":"2026-04-08"},{"assignee":"HR Director","action":"Source security training vendor","due":"2026-04-15"}]',
   '2026-04-15 10:00:00+07'),

  ('87000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'progress_review', '2026-04-15 10:00:00+07', 'ISO 27001 Week 2 Progress Review',
   'I Made Suardana, Wayan Darma, CISO, HR Director',
   '1. Gap analysis results\n2. Policy drafting status\n3. Training vendor selection\n4. CR-005 contractor training',
   '- 93 Annex A controls fully reviewed\n- 18 gaps identified (5 high, 7 medium, 6 low)\n- Top gaps: access control, incident response, asset management\n- Training vendor shortlist: 3 candidates',
   '- Approve CR-005 (include contractors)\n- Prioritize high-severity gaps for immediate remediation\n- Select training vendor by April 22\n- Engage external ISMS consultant',
   '[{"assignee":"Wayan Darma","action":"Draft access control policy","due":"2026-04-22"},{"assignee":"HR Director","action":"Finalize training vendor and contract","due":"2026-04-22"},{"assignee":"CISO","action":"Begin incident response procedure draft","due":"2026-04-20"}]',
   '2026-04-22 10:00:00+07')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  9. RACI MATRIX (12 records)                             ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_raci_matrix (id, project_id, tenant_id, deliverable, person_name, role_type, notes) VALUES
  ('88000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'AI Lead Scoring API',         'Agus Prasetyo',  'responsible', NULL),
  ('88000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'AI Lead Scoring API',         'Bagus Mahendra', 'accountable', NULL),
  ('88000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'AI Lead Scoring API',         'VP Engineering', 'consulted',   NULL),
  ('88000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Frontend Dashboard Redesign', 'Kadek Ayu',      'responsible', NULL),
  ('88000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Frontend Dashboard Redesign', 'Bagus Mahendra', 'accountable', NULL),
  ('88000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'QA & Integration Testing',    'Wayan Darma',    'responsible', NULL),
  ('88000000-0000-0000-0000-000000000007', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'QA & Integration Testing',    'Bagus Mahendra', 'accountable', NULL),
  ('88000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Production Deployment',       'Agus Prasetyo',  'responsible', NULL),
  ('88000000-0000-0000-0000-000000000009', '21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Production Deployment',       'VP Engineering', 'accountable', 'Final go/no-go decision'),
  ('88000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'AWS VPC Architecture',        'Nyoman Astra',   'responsible', NULL),
  ('88000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Data Migration Execution',    'Ketut Wirawan',  'responsible', NULL),
  ('88000000-0000-0000-0000-000000000012', '21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'ISMS Policy Documentation',   'Wayan Darma',    'responsible', NULL)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  10. TASK DEPENDENCIES (6 records)                       ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_task_dependencies (id, project_id, predecessor_id, successor_id, dependency_type, lag_days) VALUES
  ('89000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', 'finish_to_start', 0),
  ('89000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000003', 'finish_to_start', 0),
  ('89000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000003', 'start_to_start',  2),
  ('89000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000004', '23000000-0000-0000-0000-000000000005', 'finish_to_start', 0),
  ('89000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000005', '23000000-0000-0000-0000-000000000006', 'finish_to_start', 1),
  ('89000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000006', '23000000-0000-0000-0000-000000000006', 'finish_to_start', 0)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  11. BOOKING PASSENGERS (18 records)                     ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO booking_passengers (id, booking_id, name, id_number, nationality, seat_label, class, notes) VALUES
  -- BK-2026-001: John Smith (2 pax)
  ('90000000-0000-0000-0000-000000000001', 'd0000001-0001-4000-a000-000000000001', 'John Smith',         'P12345678',  'United States',  'A1',  'VIP',      NULL),
  ('90000000-0000-0000-0000-000000000002', 'd0000001-0001-4000-a000-000000000001', 'Jane Smith',         'P12345679',  'United States',  'A2',  'VIP',      'Vegetarian meal'),
  -- BK-2026-002: Sarah Johnson (1 pax)
  ('90000000-0000-0000-0000-000000000003', 'd0000001-0002-4000-a000-000000000002', 'Sarah Johnson',      'P98765432',  'United Kingdom', 'B1',  'Economy',  NULL),
  -- BK-2026-003: Wayan Dharma (4 pax)
  ('90000000-0000-0000-0000-000000000004', 'd0000001-0003-4000-a000-000000000003', 'Wayan Dharma',       '5171012345', 'Indonesia',      'A1',  'Economy',  NULL),
  ('90000000-0000-0000-0000-000000000005', 'd0000001-0003-4000-a000-000000000003', 'Ni Kadek Wati',      '5171012346', 'Indonesia',      'A2',  'Economy',  NULL),
  ('90000000-0000-0000-0000-000000000006', 'd0000001-0003-4000-a000-000000000003', 'Putu Agung',         '5171012347', 'Indonesia',      'A3',  'Economy',  'Child (8 years)'),
  ('90000000-0000-0000-0000-000000000007', 'd0000001-0003-4000-a000-000000000003', 'Ketut Sari',         '5171012348', 'Indonesia',      'A4',  'Economy',  'Child (5 years)'),
  -- BK-2026-004: Hans Mueller (2 pax)
  ('90000000-0000-0000-0000-000000000008', 'd0000001-0004-4000-a000-000000000004', 'Hans Mueller',       'DE12345678', 'Germany',        'B1',  'Business', NULL),
  ('90000000-0000-0000-0000-000000000009', 'd0000001-0004-4000-a000-000000000004', 'Anna Mueller',       'DE12345679', 'Germany',        'B2',  'Business', 'Wheelchair assistance needed'),
  -- BK-2026-005: Yuki Tanaka (1 pax)
  ('90000000-0000-0000-0000-000000000010', 'd0000001-0005-4000-a000-000000000005', 'Yuki Tanaka',        'JP87654321', 'Japan',          'C1',  'Economy',  NULL),
  -- BK-2026-006: Emma Watson (2 pax)
  ('90000000-0000-0000-0000-000000000011', 'd0000001-0006-4000-a000-000000000006', 'Emma Watson',        'AU55667788', 'Australia',      'A1',  'VIP',      NULL),
  ('90000000-0000-0000-0000-000000000012', 'd0000001-0006-4000-a000-000000000006', 'Oliver Watson',      'AU55667789', 'Australia',      'A2',  'VIP',      'Seasickness medication'),
  -- BK-2026-007: Putu Dharma (3 pax)
  ('90000000-0000-0000-0000-000000000013', 'd0000001-0007-4000-a000-000000000007', 'Putu Dharma',        '5171023456', 'Indonesia',      'C1',  'Economy',  NULL),
  ('90000000-0000-0000-0000-000000000014', 'd0000001-0007-4000-a000-000000000007', 'Made Suryani',       '5171023457', 'Indonesia',      'C2',  'Economy',  NULL),
  ('90000000-0000-0000-0000-000000000015', 'd0000001-0007-4000-a000-000000000007', 'Nyoman Putra',       '5171023458', 'Indonesia',      'C3',  'Economy',  'Infant (11 months)'),
  -- BK-2026-008: Li Wei (2 pax)
  ('90000000-0000-0000-0000-000000000016', 'd0000001-0008-4000-a000-000000000008', 'Li Wei',             'CN33445566', 'China',          'B1',  'Business', NULL),
  ('90000000-0000-0000-0000-000000000017', 'd0000001-0008-4000-a000-000000000008', 'Zhang Min',          'CN33445567', 'China',          'B2',  'Business', NULL),
  -- BK-FIX-001: Test Customer (1 pax)
  ('90000000-0000-0000-0000-000000000018', 'dde8a74e-a5fb-41fa-acf5-54b182c9e5aa', 'Test Customer',      'TEST123456', 'Indonesia',      'X1',  'Economy',  'Test booking passenger')
ON CONFLICT (id) DO NOTHING;


NOTIFY pgrst, 'reload schema';
