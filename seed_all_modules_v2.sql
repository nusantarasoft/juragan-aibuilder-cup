-- ═══════════════════════════════════════════════════════════
-- SEED DATA v2 — Fixed to match actual DB schemas
-- Covers: PM, Inventory, E-Commerce, Permissions
-- (CRM already seeded successfully in v1)
-- ═══════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. PROJECT MANAGEMENT                                   ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Projects — use project_number column correctly
INSERT INTO pm_projects (id, tenant_id, project_number, name, description, status, priority, start_date, end_date, budget, methodology, phase) VALUES
  ('21000000-0000-0000-0000-000000000001', 'default', 'PRJ-NS40', 'Nusantarasoft v4.0 Release', 'Major platform release with new AI features, performance improvements, and mobile app. Target: Q3 2026.', 'active', 'high', '2026-03-01', '2026-09-30', 500000, 'agile', 'executing'),
  ('21000000-0000-0000-0000-000000000002', 'default', 'PRJ-DCMG', 'Data Center Migration to AWS', 'Migrate on-premise infrastructure to AWS Jakarta region. 50+ services, zero-downtime target.', 'active', 'critical', '2026-04-01', '2026-07-31', 300000, 'hybrid', 'planning'),
  ('21000000-0000-0000-0000-000000000003', 'default', 'PRJ-ISO1', 'ISO 27001 Certification', 'Achieve ISO 27001:2022 information security certification. Covers all business processes.', 'planning', 'medium', '2026-05-01', '2026-12-31', 80000, 'waterfall', 'initiating')
ON CONFLICT (id) DO NOTHING;

-- Sprints
INSERT INTO pm_sprints (id, tenant_id, project_id, name, goal, start_date, end_date, status) VALUES
  ('22000000-0000-0000-0000-000000000001', 'default', '21000000-0000-0000-0000-000000000001', 'Sprint 12 — AI Integration', 'Complete Vertex AI integration for CRM lead scoring and ITSM auto-categorization', '2026-04-07', '2026-04-21', 'active'),
  ('22000000-0000-0000-0000-000000000002', 'default', '21000000-0000-0000-0000-000000000001', 'Sprint 11 — ITSM Module', 'Complete ITSM service catalog, change management, and knowledge base', '2026-03-24', '2026-04-07', 'completed'),
  ('22000000-0000-0000-0000-000000000003', 'default', '21000000-0000-0000-0000-000000000002', 'Sprint 1 — Foundation', 'Set up AWS accounts, VPC, IAM roles, and Terraform workspace', '2026-04-01', '2026-04-14', 'active')
ON CONFLICT (id) DO NOTHING;

-- Tasks (uses title, logged_hours instead of actual_hours)
INSERT INTO pm_tasks (id, tenant_id, project_id, sprint_id, title, description, status, priority, estimated_hours, logged_hours, due_date) VALUES
  ('23000000-0000-0000-0000-000000000001', 'default', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Implement Vertex AI lead scoring endpoint', 'Create GraphQL mutation for AI-powered lead scoring in CRM module', 'in_progress', 'high', 16, 8, '2026-04-18'),
  ('23000000-0000-0000-0000-000000000002', 'default', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Build AI ticket categorization for ITSM', 'Auto-categorize incoming tickets using Vertex AI text classification', 'todo', 'high', 12, 0, '2026-04-20'),
  ('23000000-0000-0000-0000-000000000003', 'default', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'Create ITSM service catalog CRUD', 'Full CRUD for service catalog with publish-from-portfolio flow', 'done', 'high', 8, 7, '2026-04-04'),
  ('23000000-0000-0000-0000-000000000004', 'default', '21000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000003', 'Set up AWS VPC and subnets', 'Create production VPC with public/private subnets in ap-southeast-3', 'in_progress', 'critical', 8, 4, '2026-04-10'),
  ('23000000-0000-0000-0000-000000000005', 'default', '21000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000003', 'Configure Terraform workspace', 'Set up Terraform Cloud workspace with state locking and remote backend', 'done', 'high', 4, 3, '2026-04-08'),
  ('23000000-0000-0000-0000-000000000006', 'default', '21000000-0000-0000-0000-000000000003', NULL, 'Gap analysis — current vs ISO 27001 requirements', 'Document current security controls and identify gaps against ISO 27001:2022', 'todo', 'medium', 40, 0, '2026-05-15')
ON CONFLICT (id) DO NOTHING;

-- Risk Registers (uses risk_name, mitigation_strategy, contingency_plan)
INSERT INTO pm_risk_registers (id, project_id, tenant_id, risk_name, description, category, probability, impact, mitigation_strategy, contingency_plan, status) VALUES
  ('24000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'default', 'Data loss during migration', 'Risk of data corruption or loss during database migration from on-prem PostgreSQL to AWS RDS', 'technical', 1, 5, 'Full backup before migration. Parallel-run both environments for 2 weeks.', 'Restore from latest backup and retry migration during next window.', 'open'),
  ('24000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'default', 'Downtime exceeds maintenance window', 'Migration may take longer than planned 4-hour maintenance window', 'schedule', 3, 4, 'Pre-stage all resources. Use blue-green deployment.', 'Rollback to on-prem within 30 minutes.', 'open'),
  ('24000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', 'default', 'Vertex AI API cost overrun', 'AI feature usage may exceed budgeted API costs if adoption is higher than expected', 'cost', 3, 3, 'Monitor usage weekly. Set billing alerts at 80% budget.', 'Implement request caching and rate limiting.', 'open')
ON CONFLICT (id) DO NOTHING;

-- Milestones
INSERT INTO pm_milestones (id, project_id, tenant_id, name, description, due_date, status) VALUES
  ('25000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'default', 'Alpha Release', 'All core features complete and deployed to staging', '2026-06-30', 'pending'),
  ('25000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', 'default', 'Beta Release', 'Beta testing with 5 pilot customers', '2026-08-15', 'pending'),
  ('25000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', 'default', 'VPC & Networking Ready', 'AWS infrastructure foundation complete', '2026-04-30', 'in_progress'),
  ('25000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', 'default', 'Full Migration Complete', 'All 50+ services migrated and validated', '2026-07-15', 'pending')
ON CONFLICT (id) DO NOTHING;

-- Stakeholders (uses influence_level integer, interest_level integer, etc.)
INSERT INTO pm_stakeholders (id, project_id, tenant_id, name, title, email, role, organization, influence_level, interest_level, current_engagement, desired_engagement) VALUES
  ('26000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'default', 'CEO NusantaraSoft', 'Chief Executive Officer', 'ceo@nusantarasoft.local', 'Sponsor', 'NusantaraSoft', 5, 5, 'leading', 'leading'),
  ('26000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', 'default', 'VP Engineering', 'VP of Engineering', 'vp.eng@nusantarasoft.local', 'Project Manager', 'NusantaraSoft', 5, 5, 'leading', 'leading'),
  ('26000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', 'default', 'Head of Infrastructure', 'Infrastructure Manager', 'infra@nusantarasoft.local', 'Technical Lead', 'NusantaraSoft', 4, 5, 'leading', 'leading'),
  ('26000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000002', 'default', 'AWS Solutions Architect', 'Solutions Architect', 'sa@aws.com', 'Vendor', 'AWS', 3, 3, 'supportive', 'supportive')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. INVENTORY — Warehouses & Items                       ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Warehouses (uses warehouse_type, code)
INSERT INTO inv_warehouses (id, tenant_id, name, code, address, city, warehouse_type, status) VALUES
  ('33000000-0000-0000-0000-000000000001', 'default', 'Jakarta Main Warehouse', 'WH-JKT', 'Jl. Industri Raya 45, Cakung', 'Jakarta', 'general', 'active'),
  ('33000000-0000-0000-0000-000000000002', 'default', 'Surabaya Branch Store', 'WH-SBY', 'Jl. Rungkut Industri 12', 'Surabaya', 'general', 'active')
ON CONFLICT (id) DO NOTHING;

-- Items (uses selling_price, cost_price, primary_uom, min_stock, reorder_point)
INSERT INTO inv_items (id, tenant_id, name, sku, description, category_id, selling_price, cost_price, currency, primary_uom, min_stock, reorder_point, reorder_qty, status) VALUES
  ('34000000-0000-0000-0000-000000000001', 'default', 'Dell Latitude 5550 Laptop', 'LAP-DELL-5550', 'Intel i7-13800H, 16GB RAM, 512GB SSD, 15.6" FHD', '31000000-0000-0000-0000-000000000001', 18500000, 15200000, 'IDR', 'unit', 5, 10, 20, 'active'),
  ('34000000-0000-0000-0000-000000000002', 'default', 'Dell 27" Monitor P2723QE', 'MON-DELL-P27', '4K UHD, USB-C Hub, IPS Panel', '31000000-0000-0000-0000-000000000001', 7500000, 5800000, 'IDR', 'unit', 2, 5, 10, 'active'),
  ('34000000-0000-0000-0000-000000000003', 'default', 'Cisco Catalyst 9200 Switch', 'NET-CSCO-9200', '48-port Gigabit Managed Switch with PoE+', '31000000-0000-0000-0000-000000000003', 45000000, 38000000, 'IDR', 'unit', 1, 2, 3, 'active'),
  ('34000000-0000-0000-0000-000000000004', 'default', 'A4 Copy Paper 80gsm', 'OFC-PAPER-A4', '500 sheets per ream, 80gsm', '31000000-0000-0000-0000-000000000002', 55000, 42000, 'IDR', 'ream', 20, 50, 100, 'active'),
  ('34000000-0000-0000-0000-000000000005', 'default', 'APC Smart-UPS 3000VA', 'SRV-APC-3000', 'Rack-mount UPS, 3000VA/2700W, LCD, 2U', '31000000-0000-0000-0000-000000000004', 15000000, 12000000, 'IDR', 'unit', 1, 3, 5, 'active'),
  ('34000000-0000-0000-0000-000000000006', 'default', 'Microsoft 365 Business Premium', 'LIC-M365-BIZ', 'Annual subscription per user. Includes Office, Teams, OneDrive.', '31000000-0000-0000-0000-000000000005', 2640000, 2100000, 'IDR', 'license', 10, 20, 50, 'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. E-COMMERCE                                           ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Customers (uses first_name, last_name, company)
INSERT INTO ecom_customers (id, tenant_id, first_name, last_name, email, phone, company, customer_type, status) VALUES
  ('42000000-0000-0000-0000-000000000001', 'default', 'Agung', 'Prasetyo', 'agung@majubersama.id', '+622150501', 'PT Maju Bersama', 'business', 'active'),
  ('42000000-0000-0000-0000-000000000002', 'default', 'Rina', 'Wulandari', 'rina.w@gmail.com', '+6281345678901', NULL, 'individual', 'active'),
  ('42000000-0000-0000-0000-000000000003', 'default', 'Hadi', 'Kurniawan', 'hadi@teknusantara.com', '+622150502', 'CV Teknologi Nusantara', 'business', 'active')
ON CONFLICT (id) DO NOTHING;

-- Orders (uses total_amount, customer_name)
INSERT INTO ecom_orders (id, tenant_id, order_number, customer_id, customer_name, customer_email, status, payment_status, subtotal, tax_amount, total_amount, shipping_address, shipping_city, notes) VALUES
  ('43000000-0000-0000-0000-000000000001', 'default', 'ORD-2026-001', '42000000-0000-0000-0000-000000000001', 'Agung Prasetyo', 'agung@majubersama.id', 'delivered', 'paid', 37000000, 4070000, 41070000, 'Jl. Gatot Subroto 15', 'Jakarta', 'Bulk laptop order for new employees'),
  ('43000000-0000-0000-0000-000000000002', 'default', 'ORD-2026-002', '42000000-0000-0000-0000-000000000002', 'Rina Wulandari', 'rina.w@gmail.com', 'processing', 'paid', 18500000, 2035000, 20535000, 'Jl. Kemang Raya 28', 'Jakarta', NULL),
  ('43000000-0000-0000-0000-000000000003', 'default', 'ORD-2026-003', '42000000-0000-0000-0000-000000000003', 'Hadi Kurniawan', 'hadi@teknusantara.com', 'pending', 'pending', 45000000, 4950000, 49950000, 'Jl. HR Rasuna Said Kav C-17', 'Jakarta', 'PO: PO-TN-2026-0089')
ON CONFLICT (id) DO NOTHING;

-- Order items (uses subtotal, not total)
INSERT INTO ecom_order_items (order_id, item_id, item_name, quantity, unit_price, subtotal) VALUES
  ('43000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 'Dell Latitude 5550 Laptop', 2, 18500000, 37000000),
  ('43000000-0000-0000-0000-000000000002', '34000000-0000-0000-0000-000000000001', 'Dell Latitude 5550 Laptop', 1, 18500000, 18500000),
  ('43000000-0000-0000-0000-000000000003', '34000000-0000-0000-0000-000000000003', 'Cisco Catalyst 9200 Switch', 1, 45000000, 45000000);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. PERMISSIONS (tenant_id is UUID type)                 ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Use a consistent UUID for the 'default' tenant
-- First, check and handle the UUID-typed tenant_id columns
INSERT INTO roles (id, tenant_id, name, description) VALUES
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CEO', 'Chief Executive Officer — full access'),
  ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'VP Engineering', 'VP of Engineering — manages all tech teams'),
  ('51000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'IT Manager', 'IT department manager'),
  ('51000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Sales Manager', 'Sales team manager'),
  ('51000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Support Agent', 'Customer support / ITSM agent'),
  ('51000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Developer', 'Software developer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, tenant_id, name, description) VALUES
  ('52000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'System Administrator', 'Full system access — all objects, all permissions'),
  ('52000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Standard User', 'Standard access — CRM read/write, PM read/write, limited admin'),
  ('52000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Read Only', 'View-only access to all modules'),
  ('52000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Sales Profile', 'Full CRM + Deal access, limited ITSM'),
  ('52000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'IT Support Profile', 'Full ITSM access, read CRM contacts/accounts')
ON CONFLICT (id) DO NOTHING;

INSERT INTO permission_sets (id, tenant_id, name, description) VALUES
  ('53000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'API Access', 'Grants access to REST/GraphQL API endpoints'),
  ('53000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Report Builder', 'Allows creating and exporting custom reports'),
  ('53000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Bulk Data Import', 'Allows CSV/Excel bulk import of records'),
  ('53000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'AI Features', 'Access to AI-powered features (lead scoring, ticket categorization)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO teams (id, tenant_id, name, description) VALUES
  ('54000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering Team', 'Product development and engineering'),
  ('54000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Sales Team', 'Sales and business development'),
  ('54000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'IT Support Team', 'IT helpdesk and infrastructure support'),
  ('54000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Management', 'C-suite and VP-level management')
ON CONFLICT (id) DO NOTHING;


-- Signal PostgREST to reload
NOTIFY pgrst, 'reload schema';
