-- ═══════════════════════════════════════════════════════════
-- SEED DATA FOR ALL NON-ITSM MODULES
-- CRM, PM, Inventory, E-Commerce, Permissions
-- ═══════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. CRM MODULE                                           ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ─── Individuals (Leads/People) ──────────────────────────
INSERT INTO individuals (id, tenant_id, first_name, last_name, email, phone, job_title, department, company, source, individual_type, lead_status, status) VALUES
  ('11000000-0000-0000-0000-000000000001', 'default', 'Budi', 'Santoso', 'budi.santoso@tokopintar.id', '+6281234567001', 'CTO', 'Technology', 'PT Toko Pintar', 'website', 'lead', 'qualified', 'active'),
  ('11000000-0000-0000-0000-000000000002', 'default', 'Siti', 'Rahayu', 'siti.rahayu@bankmandala.id', '+6281234567002', 'VP Operations', 'Operations', 'Bank Mandala', 'referral', 'lead', 'contacted', 'active'),
  ('11000000-0000-0000-0000-000000000003', 'default', 'Andi', 'Wijaya', 'andi@logistikjaya.com', '+6281234567003', 'Head of IT', 'IT', 'PT Logistik Jaya', 'conference', 'lead', 'new', 'active'),
  ('11000000-0000-0000-0000-000000000004', 'default', 'Dewi', 'Lestari', 'dewi.l@pertaminaenergi.co.id', '+6281234567004', 'Digital Manager', 'Digital', 'PT Pertamina Energi', 'website', 'contact', 'converted', 'active'),
  ('11000000-0000-0000-0000-000000000005', 'default', 'Reza', 'Firmansyah', 'reza@garuda-tech.com', '+6281234567005', 'CEO', 'Management', 'Garuda Technology', 'partner', 'lead', 'qualified', 'active'),
  ('11000000-0000-0000-0000-000000000006', 'default', 'Putri', 'Handayani', 'putri@edukasinusantara.id', '+6281234567006', 'COO', 'Operations', 'Edukasi Nusantara', 'cold_call', 'lead', 'new', 'active')
ON CONFLICT (id) DO NOTHING;

-- ─── Accounts (Companies/Orgs) ───────────────────────────
INSERT INTO accounts (id, tenant_id, name, email, phone, website, industry, type, status, annual_revenue, employee_count, description) VALUES
  ('12000000-0000-0000-0000-000000000001', 'default', 'PT Toko Pintar', 'info@tokopintar.id', '+622150001', 'https://tokopintar.id', 'E-Commerce', 'prospect', 'active', 5000000, 120, 'Leading Indonesian e-commerce platform for SMEs'),
  ('12000000-0000-0000-0000-000000000002', 'default', 'Bank Mandala', 'corp@bankmandala.id', '+622150002', 'https://bankmandala.id', 'Banking', 'customer', 'active', 50000000, 3500, 'National private bank with 200+ branches'),
  ('12000000-0000-0000-0000-000000000003', 'default', 'PT Logistik Jaya', 'info@logistikjaya.com', '+622150003', 'https://logistikjaya.com', 'Logistics', 'prospect', 'active', 8000000, 500, 'Nationwide logistics and freight forwarding'),
  ('12000000-0000-0000-0000-000000000004', 'default', 'PT Pertamina Energi', 'digital@pertaminaenergi.co.id', '+622150004', 'https://pertaminaenergi.co.id', 'Energy', 'customer', 'active', 200000000, 15000, 'State-owned energy company subsidiary'),
  ('12000000-0000-0000-0000-000000000005', 'default', 'Garuda Technology', 'hello@garuda-tech.com', '+622150005', 'https://garuda-tech.com', 'Technology', 'partner', 'active', 3000000, 80, 'Cloud infrastructure and DevOps consultancy')
ON CONFLICT (id) DO NOTHING;

-- ─── Contacts (Individual↔Account links) ────────────────
INSERT INTO contacts (id, tenant_id, individual_id, account_id, title, role, is_primary, status) VALUES
  ('13000000-0000-0000-0000-000000000001', 'default', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'CTO', 'decision_maker', true, 'active'),
  ('13000000-0000-0000-0000-000000000002', 'default', '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'VP Operations', 'influencer', true, 'active'),
  ('13000000-0000-0000-0000-000000000004', 'default', '11000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', 'Digital Manager', 'champion', true, 'active'),
  ('13000000-0000-0000-0000-000000000005', 'default', '11000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', 'CEO', 'decision_maker', true, 'active')
ON CONFLICT (id) DO NOTHING;

-- ─── Deals (Pipeline) ───────────────────────────────────
INSERT INTO deals (id, tenant_id, name, amount, currency, stage, probability, close_date, account_id, contact_id, type, lead_source, next_step, status) VALUES
  ('14000000-0000-0000-0000-000000000001', 'default', 'Toko Pintar — Platform Modernization', 450000, 'USD', 'proposal', 60, '2026-06-30', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'new_business', 'website', 'Send revised proposal with microservices architecture', 'open'),
  ('14000000-0000-0000-0000-000000000002', 'default', 'Bank Mandala — Core Banking API', 1200000, 'USD', 'negotiation', 75, '2026-05-15', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'new_business', 'referral', 'Schedule final pricing call with CFO', 'open'),
  ('14000000-0000-0000-0000-000000000003', 'default', 'Pertamina — IoT Monitoring Dashboard', 800000, 'USD', 'closed_won', 100, '2026-03-01', '12000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000004', 'existing_business', 'partner', NULL, 'won'),
  ('14000000-0000-0000-0000-000000000004', 'default', 'Logistik Jaya — Fleet Management System', 320000, 'USD', 'qualification', 30, '2026-08-30', '12000000-0000-0000-0000-000000000003', NULL, 'new_business', 'conference', 'Conduct technical discovery workshop', 'open')
ON CONFLICT (id) DO NOTHING;

-- ─── Activities ──────────────────────────────────────────
INSERT INTO crm_activities (id, tenant_id, activity_type, subject, description, related_to_type, related_to_id, due_date, priority, status, is_completed) VALUES
  ('15000000-0000-0000-0000-000000000001', 'default', 'call', 'Follow-up call with Budi — Tech requirements', 'Discuss microservices vs monolith approach for platform modernization', 'deal', '14000000-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days', 'high', 'open', false),
  ('15000000-0000-0000-0000-000000000002', 'default', 'meeting', 'Pricing negotiation with Bank Mandala', 'Final pricing review with VP Operations and CFO', 'deal', '14000000-0000-0000-0000-000000000002', NOW() + INTERVAL '3 days', 'high', 'open', false),
  ('15000000-0000-0000-0000-000000000003', 'default', 'email', 'Send case study to Logistik Jaya', 'Share fleet management case study from similar logistics client', 'deal', '14000000-0000-0000-0000-000000000004', NOW() + INTERVAL '1 day', 'normal', 'completed', true),
  ('15000000-0000-0000-0000-000000000004', 'default', 'task', 'Prepare RFP response for Bank Mandala', 'Draft technical architecture section of the RFP response', 'account', '12000000-0000-0000-0000-000000000002', NOW() + INTERVAL '5 days', 'high', 'open', false)
ON CONFLICT (id) DO NOTHING;

-- ─── Cases (Support) ────────────────────────────────────
INSERT INTO cases (id, tenant_id, subject, description, status, priority, origin, type, contact_id, account_id) VALUES
  ('16000000-0000-0000-0000-000000000001', 'default', 'API rate limiting issues on production', 'Client reports 429 errors during peak hours. Current limit 100 req/min may be too low.', 'in_progress', 'high', 'email', 'technical', '13000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004'),
  ('16000000-0000-0000-0000-000000000002', 'default', 'Invoice discrepancy Q1 2026', 'Client found Rp 15M difference between purchase order and invoice for March delivery.', 'new', 'medium', 'phone', 'billing', '13000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002'),
  ('16000000-0000-0000-0000-000000000003', 'default', 'Request for custom SSO integration', 'Client needs SAML 2.0 SSO integration with their Keycloak instance.', 'closed', 'low', 'portal', 'feature_request', '13000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ─── Campaigns ──────────────────────────────────────────
INSERT INTO campaigns (id, tenant_id, name, type, status, start_date, end_date, budget, actual_cost, expected_revenue, description) VALUES
  ('17000000-0000-0000-0000-000000000001', 'default', 'Q2 2026 Digital Transformation Webinar', 'webinar', 'active', '2026-04-15', '2026-04-15', 5000, 3200, 150000, 'Free webinar on digital transformation for Indonesian enterprises. Targeting CTO/CIOs.'),
  ('17000000-0000-0000-0000-000000000002', 'default', 'Cloud Migration Email Drip Campaign', 'email', 'active', '2026-04-01', '2026-06-30', 2000, 800, 500000, '8-email sequence targeting enterprises considering cloud migration.'),
  ('17000000-0000-0000-0000-000000000003', 'default', 'LinkedIn Ads — Enterprise Solutions', 'social', 'planned', '2026-05-01', '2026-07-31', 15000, 0, 300000, 'LinkedIn sponsored content targeting VP+ in Banking, Energy, Logistics.')
ON CONFLICT (id) DO NOTHING;

-- ─── Products ───────────────────────────────────────────
INSERT INTO products (id, tenant_id, name, code, description, unit_price, currency, category, is_active) VALUES
  ('18000000-0000-0000-0000-000000000001', 'default', 'NusantaraSoft Platform — Standard', 'NSP-STD', 'Full platform license for up to 50 users. Includes CRM, PM, ITSM modules.', 50000, 'USD', 'license', true),
  ('18000000-0000-0000-0000-000000000002', 'default', 'NusantaraSoft Platform — Enterprise', 'NSP-ENT', 'Enterprise license for unlimited users. All modules + priority support + SLA.', 150000, 'USD', 'license', true),
  ('18000000-0000-0000-0000-000000000003', 'default', 'Custom Integration Service', 'SVC-INT', 'Custom API integration and middleware development. Per-project pricing.', 25000, 'USD', 'service', true),
  ('18000000-0000-0000-0000-000000000004', 'default', 'Annual Support & Maintenance', 'SVC-SUP', '24/7 support, bug fixes, security patches, and version upgrades.', 30000, 'USD', 'service', true),
  ('18000000-0000-0000-0000-000000000005', 'default', 'AI/ML Add-on Module', 'NSP-AI', 'MindsDB-powered AI features: lead scoring, forecasting, anomaly detection.', 40000, 'USD', 'addon', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Quotes ─────────────────────────────────────────────
INSERT INTO quotes (id, tenant_id, name, deal_id, account_id, contact_id, status, subtotal, discount_percent, tax_percent, total, valid_until, description) VALUES
  ('19000000-0000-0000-0000-000000000001', 'default', 'Q-2026-001: Toko Pintar Platform', '14000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'sent', 200000, 10, 11, 197780, '2026-05-31', 'Platform + Integration + 1yr Support'),
  ('19000000-0000-0000-0000-000000000002', 'default', 'Q-2026-002: Bank Mandala Enterprise', '14000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'draft', 350000, 5, 11, 369082.50, '2026-06-15', 'Enterprise license + AI module + 3yr support')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quote_items (quote_id, product_id, product_name, quantity, unit_price, discount_percent, total, sort_order) VALUES
  ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 'NusantaraSoft Platform — Standard', 1, 50000, 0, 50000, 0),
  ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000003', 'Custom Integration Service', 4, 25000, 0, 100000, 1),
  ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000004', 'Annual Support & Maintenance', 1, 30000, 0, 30000, 2),
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002', 'NusantaraSoft Platform — Enterprise', 1, 150000, 0, 150000, 0),
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000005', 'AI/ML Add-on Module', 1, 40000, 0, 40000, 1),
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000004', 'Annual Support & Maintenance', 3, 30000, 0, 90000, 2);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. PROJECT MANAGEMENT MODULE                            ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_projects (id, tenant_id, name, description, status, priority, start_date, end_date, budget, methodology) VALUES
  ('21000000-0000-0000-0000-000000000001', 'default', 'Nusantarasoft v4.0 Release', 'Major platform release with new AI features, performance improvements, and mobile app. Target: Q3 2026.', 'active', 'high', '2026-03-01', '2026-09-30', 500000, 'agile'),
  ('21000000-0000-0000-0000-000000000002', 'default', 'Data Center Migration to AWS', 'Migrate on-premise infrastructure to AWS Jakarta region. 50+ services, zero-downtime target.', 'active', 'critical', '2026-04-01', '2026-07-31', 300000, 'hybrid'),
  ('21000000-0000-0000-0000-000000000003', 'default', 'ISO 27001 Certification', 'Achieve ISO 27001:2022 information security certification. Covers all business processes.', 'planning', 'medium', '2026-05-01', '2026-12-31', 80000, 'waterfall')
ON CONFLICT (id) DO NOTHING;

-- ─── Sprints ────────────────────────────────────────────
INSERT INTO pm_sprints (id, tenant_id, project_id, name, goal, start_date, end_date, status) VALUES
  ('22000000-0000-0000-0000-000000000001', 'default', '21000000-0000-0000-0000-000000000001', 'Sprint 12 — AI Integration', 'Complete Vertex AI integration for CRM lead scoring and ITSM auto-categorization', '2026-04-07', '2026-04-21', 'active'),
  ('22000000-0000-0000-0000-000000000002', 'default', '21000000-0000-0000-0000-000000000001', 'Sprint 11 — ITSM Module', 'Complete ITSM service catalog, change management, and knowledge base', '2026-03-24', '2026-04-07', 'completed'),
  ('22000000-0000-0000-0000-000000000003', 'default', '21000000-0000-0000-0000-000000000002', 'Sprint 1 — Foundation', 'Set up AWS accounts, VPC, IAM roles, and Terraform workspace', '2026-04-01', '2026-04-14', 'active')
ON CONFLICT (id) DO NOTHING;

-- ─── Tasks ──────────────────────────────────────────────
INSERT INTO pm_tasks (id, tenant_id, project_id, sprint_id, title, description, status, priority, assignee_id, estimated_hours, actual_hours, due_date) VALUES
  ('23000000-0000-0000-0000-000000000001', 'default', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Implement Vertex AI lead scoring endpoint', 'Create GraphQL mutation for AI-powered lead scoring in CRM module', 'in_progress', 'high', NULL, 16, 8, '2026-04-18'),
  ('23000000-0000-0000-0000-000000000002', 'default', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Build AI ticket categorization for ITSM', 'Auto-categorize incoming tickets using Vertex AI text classification', 'todo', 'high', NULL, 12, 0, '2026-04-20'),
  ('23000000-0000-0000-0000-000000000003', 'default', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'Create ITSM service catalog CRUD', 'Full CRUD for service catalog with publish-from-portfolio flow', 'done', 'high', NULL, 8, 7, '2026-04-04'),
  ('23000000-0000-0000-0000-000000000004', 'default', '21000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000003', 'Set up AWS VPC and subnets', 'Create production VPC with public/private subnets in ap-southeast-3', 'in_progress', 'critical', NULL, 8, 4, '2026-04-10'),
  ('23000000-0000-0000-0000-000000000005', 'default', '21000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000003', 'Configure Terraform workspace', 'Set up Terraform Cloud workspace with state locking and remote backend', 'done', 'high', NULL, 4, 3, '2026-04-08'),
  ('23000000-0000-0000-0000-000000000006', 'default', '21000000-0000-0000-0000-000000000003', NULL, 'Gap analysis — current vs ISO 27001 requirements', 'Document current security controls and identify gaps against ISO 27001:2022', 'todo', 'medium', NULL, 40, 0, '2026-05-15')
ON CONFLICT (id) DO NOTHING;

-- ─── Risk Registers ─────────────────────────────────────
INSERT INTO pm_risk_registers (id, tenant_id, project_id, title, description, category, probability, impact, risk_score, response_strategy, response_plan, owner, status) VALUES
  ('24000000-0000-0000-0000-000000000001', 'default', '21000000-0000-0000-0000-000000000002', 'Data loss during migration', 'Risk of data corruption or loss during database migration from on-prem PostgreSQL to AWS RDS', 'technical', 'low', 'critical', 4, 'mitigate', 'Full backup before migration. Parallel-run both environments for 2 weeks. Automated data validation scripts.', 'Ahmad Rizky', 'open'),
  ('24000000-0000-0000-0000-000000000002', 'default', '21000000-0000-0000-0000-000000000002', 'Downtime exceeds maintenance window', 'Migration may take longer than planned 4-hour maintenance window', 'schedule', 'medium', 'high', 6, 'mitigate', 'Pre-stage all resources. Use blue-green deployment. Have rollback plan ready within 30 minutes.', 'Dimas Prayoga', 'open'),
  ('24000000-0000-0000-0000-000000000003', 'default', '21000000-0000-0000-0000-000000000001', 'Vertex AI API cost overrun', 'AI feature usage may exceed budgeted API costs if adoption is higher than expected', 'cost', 'medium', 'medium', 4, 'accept', 'Monitor usage weekly. Set billing alerts at 80% budget. Implement request caching for repeated queries.', 'Reza Firmansyah', 'open')
ON CONFLICT (id) DO NOTHING;

-- ─── Milestones ─────────────────────────────────────────
INSERT INTO pm_milestones (id, tenant_id, project_id, name, description, due_date, status) VALUES
  ('25000000-0000-0000-0000-000000000001', 'default', '21000000-0000-0000-0000-000000000001', 'Alpha Release', 'All core features complete and deployed to staging', '2026-06-30', 'not_started'),
  ('25000000-0000-0000-0000-000000000002', 'default', '21000000-0000-0000-0000-000000000001', 'Beta Release', 'Beta testing with 5 pilot customers', '2026-08-15', 'not_started'),
  ('25000000-0000-0000-0000-000000000003', 'default', '21000000-0000-0000-0000-000000000002', 'VPC & Networking Ready', 'AWS infrastructure foundation complete', '2026-04-30', 'in_progress'),
  ('25000000-0000-0000-0000-000000000004', 'default', '21000000-0000-0000-0000-000000000002', 'Full Migration Complete', 'All 50+ services migrated and validated', '2026-07-15', 'not_started')
ON CONFLICT (id) DO NOTHING;

-- ─── Stakeholders ───────────────────────────────────────
INSERT INTO pm_stakeholders (id, tenant_id, project_id, name, email, role, organization, influence, interest, engagement_level) VALUES
  ('26000000-0000-0000-0000-000000000001', 'default', '21000000-0000-0000-0000-000000000001', 'CEO NusantaraSoft', 'ceo@nusantarasoft.local', 'Sponsor', 'NusantaraSoft', 'high', 'high', 'leading'),
  ('26000000-0000-0000-0000-000000000002', 'default', '21000000-0000-0000-0000-000000000001', 'VP Engineering', 'vp.eng@nusantarasoft.local', 'Project Manager', 'NusantaraSoft', 'high', 'high', 'leading'),
  ('26000000-0000-0000-0000-000000000003', 'default', '21000000-0000-0000-0000-000000000002', 'Head of Infrastructure', 'infra@nusantarasoft.local', 'Technical Lead', 'NusantaraSoft', 'high', 'high', 'leading'),
  ('26000000-0000-0000-0000-000000000004', 'default', '21000000-0000-0000-0000-000000000002', 'AWS Solutions Architect', 'sa@aws.com', 'Vendor', 'AWS', 'medium', 'medium', 'supportive')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. INVENTORY & SUPPLY CHAIN MODULE                      ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ─── Categories ─────────────────────────────────────────
INSERT INTO inv_categories (id, tenant_id, name, description, sort_order) VALUES
  ('31000000-0000-0000-0000-000000000001', 'default', 'Electronics', 'Computers, laptops, monitors, peripherals', 1),
  ('31000000-0000-0000-0000-000000000002', 'default', 'Office Supplies', 'Paper, pens, folders, stationery', 2),
  ('31000000-0000-0000-0000-000000000003', 'default', 'Networking', 'Routers, switches, cables, access points', 3),
  ('31000000-0000-0000-0000-000000000004', 'default', 'Server Hardware', 'Rack servers, storage arrays, UPS', 4),
  ('31000000-0000-0000-0000-000000000005', 'default', 'Software Licenses', 'OS, productivity, development tools', 5)
ON CONFLICT (id) DO NOTHING;

-- ─── Suppliers ──────────────────────────────────────────
INSERT INTO inv_suppliers (id, tenant_id, name, code, email, phone, address, payment_terms, status) VALUES
  ('32000000-0000-0000-0000-000000000001', 'default', 'PT Dell Indonesia', 'SUP-DELL', 'orders@dell.co.id', '+622150100', 'Jl. Sudirman Kav 1, Jakarta', 'net_30', 'active'),
  ('32000000-0000-0000-0000-000000000002', 'default', 'Cisco Systems Indonesia', 'SUP-CSCO', 'sales@cisco.co.id', '+622150200', 'Menara BCA, Jakarta', 'net_45', 'active'),
  ('32000000-0000-0000-0000-000000000003', 'default', 'PT Synnex Metrodata', 'SUP-SNNX', 'procurement@metrodata.co.id', '+622150300', 'APL Tower, Jakarta', 'net_30', 'active')
ON CONFLICT (id) DO NOTHING;

-- ─── Warehouses ─────────────────────────────────────────
INSERT INTO inv_warehouses (id, tenant_id, name, code, address, type, status) VALUES
  ('33000000-0000-0000-0000-000000000001', 'default', 'Jakarta Main Warehouse', 'WH-JKT', 'Jl. Industri Raya 45, Cakung, Jakarta Timur', 'main', 'active'),
  ('33000000-0000-0000-0000-000000000002', 'default', 'Surabaya Branch Store', 'WH-SBY', 'Jl. Rungkut Industri 12, Surabaya', 'branch', 'active')
ON CONFLICT (id) DO NOTHING;

-- ─── Items ──────────────────────────────────────────────
INSERT INTO inv_items (id, tenant_id, name, sku, description, category_id, unit_price, cost_price, uom, current_stock, reorder_level, reorder_qty, status) VALUES
  ('34000000-0000-0000-0000-000000000001', 'default', 'Dell Latitude 5550 Laptop', 'LAP-DELL-5550', 'Intel i7-13800H, 16GB RAM, 512GB SSD, 15.6" FHD', '31000000-0000-0000-0000-000000000001', 18500000, 15200000, 'unit', 25, 10, 20, 'active'),
  ('34000000-0000-0000-0000-000000000002', 'default', 'Dell 27" Monitor P2723QE', 'MON-DELL-P27', '4K UHD, USB-C Hub, IPS Panel', '31000000-0000-0000-0000-000000000001', 7500000, 5800000, 'unit', 15, 5, 10, 'active'),
  ('34000000-0000-0000-0000-000000000003', 'default', 'Cisco Catalyst 9200 Switch', 'NET-CSCO-9200', '48-port Gigabit Managed Switch with PoE+', '31000000-0000-0000-0000-000000000003', 45000000, 38000000, 'unit', 5, 2, 3, 'active'),
  ('34000000-0000-0000-0000-000000000004', 'default', 'A4 Copy Paper 80gsm', 'OFC-PAPER-A4', '500 sheets per ream, 80gsm', '31000000-0000-0000-0000-000000000002', 55000, 42000, 'ream', 200, 50, 100, 'active'),
  ('34000000-0000-0000-0000-000000000005', 'default', 'APC Smart-UPS 3000VA', 'SRV-APC-3000', 'Rack-mount UPS, 3000VA/2700W, LCD, 2U', '31000000-0000-0000-0000-000000000004', 15000000, 12000000, 'unit', 8, 3, 5, 'active'),
  ('34000000-0000-0000-0000-000000000006', 'default', 'Microsoft 365 Business Premium', 'LIC-M365-BIZ', 'Annual subscription per user. Includes Office, Teams, OneDrive.', '31000000-0000-0000-0000-000000000005', 2640000, 2100000, 'license', 100, 20, 50, 'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. E-COMMERCE MODULE                                    ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO ecom_store_settings (id, tenant_id, store_name, store_email, default_currency, tax_rate, tax_included, order_prefix, invoice_prefix) VALUES
  ('41000000-0000-0000-0000-000000000001', 'default', 'NusantaraSoft Store', 'store@nusantarasoft.local', 'IDR', 11, false, 'ORD', 'INV')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ecom_customers (id, tenant_id, name, email, phone, customer_type, status) VALUES
  ('42000000-0000-0000-0000-000000000001', 'default', 'PT Maju Bersama', 'purchasing@majubersama.id', '+622150501', 'business', 'active'),
  ('42000000-0000-0000-0000-000000000002', 'default', 'Rina Wulandari', 'rina.w@gmail.com', '+6281345678901', 'individual', 'active'),
  ('42000000-0000-0000-0000-000000000003', 'default', 'CV Teknologi Nusantara', 'admin@teknusantara.com', '+622150502', 'business', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ecom_orders (id, tenant_id, order_number, customer_id, status, payment_status, subtotal, tax_amount, total, shipping_address, notes) VALUES
  ('43000000-0000-0000-0000-000000000001', 'default', 'ORD-2026-001', '42000000-0000-0000-0000-000000000001', 'delivered', 'paid', 37000000, 4070000, 41070000, 'Jl. Gatot Subroto 15, Jakarta Selatan', 'Bulk laptop order for new employees'),
  ('43000000-0000-0000-0000-000000000002', 'default', 'ORD-2026-002', '42000000-0000-0000-0000-000000000002', 'processing', 'paid', 18500000, 2035000, 20535000, 'Jl. Kemang Raya 28, Jakarta Selatan', NULL),
  ('43000000-0000-0000-0000-000000000003', 'default', 'ORD-2026-003', '42000000-0000-0000-0000-000000000003', 'pending', 'pending', 45000000, 4950000, 49950000, 'Jl. HR Rasuna Said Kav C-17, Jakarta', 'PO: PO-TN-2026-0089')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ecom_order_items (order_id, item_id, item_name, quantity, unit_price, total) VALUES
  ('43000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 'Dell Latitude 5550 Laptop', 2, 18500000, 37000000),
  ('43000000-0000-0000-0000-000000000002', '34000000-0000-0000-0000-000000000001', 'Dell Latitude 5550 Laptop', 1, 18500000, 18500000),
  ('43000000-0000-0000-0000-000000000003', '34000000-0000-0000-0000-000000000003', 'Cisco Catalyst 9200 Switch', 1, 45000000, 45000000);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. PERMISSIONS MODULE                                   ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO roles (id, tenant_id, name, description) VALUES
  ('51000000-0000-0000-0000-000000000001', 'default', 'CEO', 'Chief Executive Officer — full access'),
  ('51000000-0000-0000-0000-000000000002', 'default', 'VP Engineering', 'VP of Engineering — manages all tech teams'),
  ('51000000-0000-0000-0000-000000000003', 'default', 'IT Manager', 'IT department manager'),
  ('51000000-0000-0000-0000-000000000004', 'default', 'Sales Manager', 'Sales team manager'),
  ('51000000-0000-0000-0000-000000000005', 'default', 'Support Agent', 'Customer support / ITSM agent'),
  ('51000000-0000-0000-0000-000000000006', 'default', 'Developer', 'Software developer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, tenant_id, name, description) VALUES
  ('52000000-0000-0000-0000-000000000001', 'default', 'System Administrator', 'Full system access — all objects, all permissions'),
  ('52000000-0000-0000-0000-000000000002', 'default', 'Standard User', 'Standard access — CRM read/write, PM read/write, limited admin'),
  ('52000000-0000-0000-0000-000000000003', 'default', 'Read Only', 'View-only access to all modules'),
  ('52000000-0000-0000-0000-000000000004', 'default', 'Sales Profile', 'Full CRM + Deal access, limited ITSM'),
  ('52000000-0000-0000-0000-000000000005', 'default', 'IT Support Profile', 'Full ITSM access, read CRM contacts/accounts')
ON CONFLICT (id) DO NOTHING;

INSERT INTO permission_sets (id, tenant_id, name, description) VALUES
  ('53000000-0000-0000-0000-000000000001', 'default', 'API Access', 'Grants access to REST/GraphQL API endpoints'),
  ('53000000-0000-0000-0000-000000000002', 'default', 'Report Builder', 'Allows creating and exporting custom reports'),
  ('53000000-0000-0000-0000-000000000003', 'default', 'Bulk Data Import', 'Allows CSV/Excel bulk import of records'),
  ('53000000-0000-0000-0000-000000000004', 'default', 'AI Features', 'Access to AI-powered features (lead scoring, ticket categorization)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO teams (id, tenant_id, name, description) VALUES
  ('54000000-0000-0000-0000-000000000001', 'default', 'Engineering Team', 'Product development and engineering'),
  ('54000000-0000-0000-0000-000000000002', 'default', 'Sales Team', 'Sales and business development'),
  ('54000000-0000-0000-0000-000000000003', 'default', 'IT Support Team', 'IT helpdesk and infrastructure support'),
  ('54000000-0000-0000-0000-000000000004', 'default', 'Management', 'C-suite and VP-level management')
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_wide_defaults (id, tenant_id, object_name, internal_access, external_access) VALUES
  ('55000000-0000-0000-0000-000000000001', 'default', 'individuals', 'public_read_write', 'private'),
  ('55000000-0000-0000-0000-000000000002', 'default', 'accounts', 'public_read_write', 'private'),
  ('55000000-0000-0000-0000-000000000003', 'default', 'deals', 'public_read', 'private'),
  ('55000000-0000-0000-0000-000000000004', 'default', 'cases', 'public_read_write', 'private'),
  ('55000000-0000-0000-0000-000000000005', 'default', 'pm_projects', 'public_read', 'private'),
  ('55000000-0000-0000-0000-000000000006', 'default', 'itsm_tickets', 'public_read_write', 'private')
ON CONFLICT (id) DO NOTHING;

-- Signal PostgREST to reload
NOTIFY pgrst, 'reload schema';
