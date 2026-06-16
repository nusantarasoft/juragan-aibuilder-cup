-- ===============================================================================
-- Consolidated Seed Data Migration
-- Generated: 2026-06-16
-- Description: All seed data for NusantaraSoft ERP platform consolidated into
--              a single idempotent migration file. Includes CRM, Inventory,
--              Warehouse, Procurement, Stock Opname, Manufacturing, E-commerce,
--              E-commerce PM, Booking, Rental, PM Advanced, PM Booking, and
--              Studio Sales seed data.
-- ===============================================================================

-- No transaction wrapper for resilience`n

-- ===============================================================================
-- ======  CRM SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════════
-- CRM COMPREHENSIVE SEED DATA
-- Covers ALL CRM modules with rich, realistic data
-- Run AFTER crm_schema.sql and crm_*_schema.sql files
-- ═══════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. INDIVIDUALS (Leads / People)                         ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO individuals (id, tenant_id, first_name, last_name, email, phone, job_title, department, company, source, individual_type, lead_status, lead_source, status) VALUES
  -- Existing qualified leads
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Budi',    'Santoso',    'budi.santoso@tokopintar.id',       '+6281234567001', 'CTO',                 'Technology',   'PT Toko Pintar',          'website',    'lead',    'qualified',  'web',      'active'),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Siti',    'Rahayu',     'siti.rahayu@bankmandala.id',        '+6281234567002', 'VP Operations',       'Operations',   'Bank Mandala',            'referral',   'lead',    'contacted',  'referral', 'active'),
  ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Andi',    'Wijaya',     'andi@logistikjaya.com',             '+6281234567003', 'Head of IT',          'IT',           'PT Logistik Jaya',        'conference', 'lead',    'new',        'other',    'active'),
  ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Dewi',    'Lestari',    'dewi.l@pertaminaenergi.co.id',      '+6281234567004', 'Digital Manager',     'Digital',      'PT Pertamina Energi',     'website',    'contact', 'converted',  'web',      'active'),
  ('11000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Reza',    'Firmansyah', 'reza@garuda-tech.com',              '+6281234567005', 'CEO',                 'Management',   'Garuda Technology',       'partner',    'lead',    'qualified',  'partner',  'active'),
  ('11000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Putri',   'Handayani',  'putri@edukasinusantara.id',          '+6281234567006', 'COO',                 'Operations',   'Edukasi Nusantara',       'cold_call',  'lead',    'new',        'phone',    'active'),
  -- New leads & contacts
  ('11000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Agus',    'Prasetyo',   'agus.prasetyo@telkomdigital.co.id', '+6281234567007', 'VP Engineering',      'Engineering',  'Telkom Digital',          'campaign',   'lead',    'qualified',  'campaign', 'active'),
  ('11000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'Maya',    'Sari',       'maya.sari@astrafintech.com',        '+6281234567008', 'Head of Product',     'Product',      'Astra Fintech',           'social',     'lead',    'contacted',  'social',   'active'),
  ('11000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'Hendra',  'Gunawan',    'hendra@medikaprima.co.id',          '+6281234567009', 'IT Director',         'IT',           'RS Medika Prima',         'website',    'lead',    'new',        'web',      'active'),
  ('11000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'Rina',    'Wulandari',  'rina@smartcity.go.id',              '+6281234567010', 'Program Director',    'Smart City',   'Jakarta Smart City',      'referral',   'lead',    'qualified',  'referral', 'active'),
  ('11000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'Fajar',   'Nugraha',    'fajar@bukalapak.com',               '+6281234567011', 'Engineering Manager', 'Engineering',  'Bukalapak',               'website',    'contact', 'converted',  'web',      'active'),
  ('11000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'Diana',   'Kusuma',     'diana.k@bni.co.id',                 '+6281234567012', 'SVP Digital Banking', 'Digital',      'Bank BNI',                'conference', 'lead',    'contacted',  'other',    'active'),
  ('11000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000010', 'Wahyu',   'Hidayat',    'wahyu@sinarmasland.com',            '+6281234567013', 'CIO',                 'IT',           'Sinar Mas Land',          'partner',    'lead',    'qualified',  'partner',  'active'),
  ('11000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000010', 'Lina',    'Marlina',    'lina@shopee.co.id',                 '+6281234567014', 'Platform Lead',       'Platform',     'Shopee Indonesia',        'social',     'lead',    'new',        'social',   'active'),
  ('11000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000010', 'Arief',   'Rahman',     'arief@gojek.com',                   '+6281234567015', 'Staff Engineer',      'Backend',      'Gojek',                   'website',    'contact', 'converted',  'web',      'active'),
  ('11000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000010', 'Nurul',   'Aini',       'nurul@kemendikbud.go.id',           '+6281234567016', 'Kabid Teknologi',     'Teknologi',    'Kemendikbud',             'referral',   'lead',    'contacted',  'referral', 'active'),
  ('11000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000010', 'Tommy',   'Setiawan',   'tommy@indofood.com',                '+6281234567017', 'Head of IT',          'IT',           'Indofood',                'campaign',   'lead',    'new',        'campaign', 'active'),
  ('11000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000010', 'Sri',     'Mulyani',    'sri.m@ojk.go.id',                   '+6281234567018', 'Deputy Director',     'Fintech',      'OJK',                     'conference', 'lead',    'qualified',  'other',    'active'),
  ('11000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000010', 'Bambang', 'Hartono',    'bambang@semen-indonesia.com',       '+6281234567019', 'VP Technology',       'Technology',   'Semen Indonesia',         'website',    'lead',    'contacted',  'web',      'active'),
  ('11000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Kartika', 'Dewi',       'kartika@grab.com',                  '+6281234567020', 'Data Lead',           'Data Science', 'Grab Indonesia',          'social',     'contact', 'converted',  'social',   'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. ACCOUNTS (Companies / Organizations)                 ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO accounts (id, tenant_id, name, email, phone, website, industry, type, status, annual_revenue, employee_count, description, rating, ownership) VALUES
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'PT Toko Pintar',          'info@tokopintar.id',              '+622150001', 'https://tokopintar.id',            'E-Commerce',        'prospect',  'active', 5000000,   120,   'Leading Indonesian e-commerce platform for SMEs',                                'warm',  'private'),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Bank Mandala',            'corp@bankmandala.id',             '+622150002', 'https://bankmandala.id',            'Banking',           'customer',  'active', 50000000,  3500,  'National private bank with 200+ branches',                                       'hot',   'public'),
  ('12000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'PT Logistik Jaya',        'info@logistikjaya.com',           '+622150003', 'https://logistikjaya.com',          'Logistics',         'prospect',  'active', 8000000,   500,   'Nationwide logistics and freight forwarding',                                    'warm',  'private'),
  ('12000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'PT Pertamina Energi',     'digital@pertaminaenergi.co.id',   '+622150004', 'https://pertaminaenergi.co.id',     'Energy',            'customer',  'active', 200000000, 15000, 'State-owned energy company subsidiary',                                          'hot',   'government'),
  ('12000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Garuda Technology',       'hello@garuda-tech.com',           '+622150005', 'https://garuda-tech.com',           'Technology',        'partner',   'active', 3000000,   80,    'Cloud infrastructure and DevOps consultancy',                                    'hot',   'private'),
  ('12000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Telkom Digital',          'enterprise@telkomdigital.co.id',  '+622150006', 'https://telkomdigital.co.id',       'Telecommunications','customer',  'active', 120000000, 8000,  'Digital arm of Indonesia''s largest telco. Cloud, data center, and SaaS.',       'hot',   'public'),
  ('12000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Astra Fintech',          'info@astrafintech.com',           '+622150007', 'https://astrafintech.com',          'Finance',           'prospect',  'active', 25000000,  450,   'Financial technology subsidiary of Astra International',                         'warm',  'subsidiary'),
  ('12000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'RS Medika Prima',        'admin@medikaprima.co.id',         '+622150008', 'https://medikaprima.co.id',         'Healthcare',        'prospect',  'active', 15000000,  1200,  'Hospital group with 5 locations across Java. Focused on digital health.',        'cold',  'private'),
  ('12000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'Jakarta Smart City',     'sekretariat@smartcity.go.id',     '+622150009', 'https://smartcity.jakarta.go.id',   'Government',        'customer',  'active', 0,         300,   'DKI Jakarta smart city initiative — IoT, open data, citizen services.',          'hot',   'government'),
  ('12000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'PT Bukalapak',           'partnerships@bukalapak.com',      '+622150010', 'https://bukalapak.com',             'E-Commerce',        'customer',  'active', 80000000,  3000,  'One of Indonesia''s largest e-commerce marketplaces',                            'warm',  'public'),
  ('12000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'Bank BNI',               'digital@bni.co.id',               '+622150011', 'https://bni.co.id',                 'Banking',           'prospect',  'active', 300000000, 25000, 'State-owned bank, 4th largest in Indonesia by assets',                           'hot',   'government'),
  ('12000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'Sinar Mas Land',         'tech@sinarmasland.com',           '+622150012', 'https://sinarmasland.com',          'Real Estate',       'prospect',  'active', 40000000,  2000,  'Largest property developer in Indonesia. Smart building initiatives.',           'warm',  'public'),
  ('12000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000010', 'Edukasi Nusantara',      'info@edukasinusantara.id',        '+622150013', 'https://edukasinusantara.id',       'Education',         'prospect',  'active', 2000000,   150,   'EdTech startup providing K-12 digital learning platform',                        'cold',  'private'),
  ('12000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000010', 'Semen Indonesia Group',  'it@semen-indonesia.com',          '+622150014', 'https://semen-indonesia.com',       'Manufacturing',     'prospect',  'active', 180000000, 7000,  'Indonesia''s largest cement producer. Digital transformation in progress.',      'warm',  'public'),
  ('12000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000010', 'Grab Indonesia',         'enterprise@grab.com',             '+622150015', 'https://grab.com/id',               'Technology',        'partner',   'active', 150000000, 5000,  'Southeast Asia''s leading superapp — ride-hailing, food, payments.',             'hot',   'private')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. CONTACTS (Individual ↔ Account links)                ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO contacts (id, tenant_id, individual_id, account_id, title, department, role, email, phone, is_primary, status) VALUES
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'CTO',                 'Technology',   'decision_maker', 'budi.santoso@tokopintar.id',       '+6281234567001', true,  'active'),
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'VP Operations',       'Operations',   'influencer',     'siti.rahayu@bankmandala.id',        '+6281234567002', true,  'active'),
  ('13000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', 'Head of IT',          'IT',           'decision_maker', 'andi@logistikjaya.com',             '+6281234567003', true,  'active'),
  ('13000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', 'Digital Manager',     'Digital',      'champion',       'dewi.l@pertaminaenergi.co.id',      '+6281234567004', true,  'active'),
  ('13000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', 'CEO',                 'Management',   'decision_maker', 'reza@garuda-tech.com',              '+6281234567005', true,  'active'),
  ('13000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000007', '12000000-0000-0000-0000-000000000006', 'VP Engineering',      'Engineering',  'decision_maker', 'agus.prasetyo@telkomdigital.co.id', '+6281234567007', true,  'active'),
  ('13000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000008', '12000000-0000-0000-0000-000000000007', 'Head of Product',     'Product',      'influencer',     'maya.sari@astrafintech.com',        '+6281234567008', true,  'active'),
  ('13000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000009', '12000000-0000-0000-0000-000000000008', 'IT Director',         'IT',           'decision_maker', 'hendra@medikaprima.co.id',          '+6281234567009', true,  'active'),
  ('13000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000010', '12000000-0000-0000-0000-000000000009', 'Program Director',    'Smart City',   'decision_maker', 'rina@smartcity.go.id',              '+6281234567010', true,  'active'),
  ('13000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000011', '12000000-0000-0000-0000-000000000010', 'Engineering Manager', 'Engineering',  'champion',       'fajar@bukalapak.com',               '+6281234567011', false, 'active'),
  ('13000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000012', '12000000-0000-0000-0000-000000000011', 'SVP Digital Banking', 'Digital',      'decision_maker', 'diana.k@bni.co.id',                 '+6281234567012', true,  'active'),
  ('13000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000013', '12000000-0000-0000-0000-000000000012', 'CIO',                 'IT',           'decision_maker', 'wahyu@sinarmasland.com',            '+6281234567013', true,  'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. DEALS / OPPORTUNITIES (Pipeline)                     ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO deals (id, tenant_id, name, description, amount, currency, stage, probability, close_date, account_id, contact_id, type, lead_source, next_step, loss_reason, status) VALUES
  ('14000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Toko Pintar — Platform Modernization',           'Full platform migration to microservices architecture with cloud deployment',                     450000,  'USD', 'proposal',      60,  '2026-06-30', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'new_business',      'website',  'Send revised proposal with microservices architecture',      NULL,                         'open'),
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Bank Mandala — Core Banking API',                 'Complete API layer for core banking system with open banking compliance',                          1200000, 'USD', 'negotiation',   75,  '2026-05-15', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'new_business',      'referral', 'Schedule final pricing call with CFO',                       NULL,                         'open'),
  ('14000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Pertamina — IoT Monitoring Dashboard',            'Real-time IoT monitoring dashboard for refinery operations',                                      800000,  'USD', 'closed_won',    100, '2026-03-01', '12000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000004', 'existing_business', 'partner',  NULL,                                                         NULL,                         'won'),
  ('14000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Logistik Jaya — Fleet Management System',         'GPS fleet tracking with route optimization and maintenance scheduling',                            320000,  'USD', 'qualification', 30,  '2026-08-30', '12000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000003', 'new_business',      'other',    'Conduct technical discovery workshop',                       NULL,                         'open'),
  ('14000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Telkom Digital — Multi-Cloud Orchestration',      'Multi-cloud management platform for Telkom''s hybrid cloud infrastructure',                       2500000, 'USD', 'proposal',      50,  '2026-07-31', '12000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000006', 'new_business',      'campaign', 'Present POC results to steering committee',                  NULL,                         'open'),
  ('14000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Astra Fintech — Payment Gateway Integration',     'White-label payment gateway with PCI DSS compliance',                                             650000,  'USD', 'prospecting',   10,  '2026-09-30', '12000000-0000-0000-0000-000000000007', '13000000-0000-0000-0000-000000000007', 'new_business',      'social',   'Schedule initial discovery meeting',                         NULL,                         'open'),
  ('14000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Jakarta Smart City — Citizen Portal v2',          'Next-gen citizen services portal with AI chatbot and e-government integration',                    900000,  'USD', 'negotiation',   80,  '2026-06-15', '12000000-0000-0000-0000-000000000009', '13000000-0000-0000-0000-000000000009', 'existing_business', 'referral', 'Finalize contract terms with legal',                         NULL,                         'open'),
  ('14000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'Bank BNI — Digital Onboarding Platform',          'Digital KYC and customer onboarding with biometric verification',                                 1800000, 'USD', 'qualification', 25,  '2026-10-31', '12000000-0000-0000-0000-000000000011', '13000000-0000-0000-0000-000000000011', 'new_business',      'other',    'Submit technical pre-qualification documents',               NULL,                         'open'),
  ('14000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'Bukalapak — Seller Analytics Dashboard',          'Advanced seller analytics with AI-driven demand forecasting',                                     380000,  'USD', 'closed_won',    100, '2026-02-15', '12000000-0000-0000-0000-000000000010', '13000000-0000-0000-0000-000000000010', 'existing_business', 'web',      NULL,                                                         NULL,                         'won'),
  ('14000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'Sinar Mas Land — Smart Building Platform',        'IoT-based smart building management for BSD City development',                                    550000,  'USD', 'closed_lost',   0,   '2026-03-15', '12000000-0000-0000-0000-000000000012', '13000000-0000-0000-0000-000000000012', 'new_business',      'partner',  NULL,                                                         'Budget reallocation to 2027', 'lost')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. CRM ACTIVITIES (Calls, Emails, Meetings, Tasks)      ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO crm_activities (id, tenant_id, activity_type, subject, description, related_to_type, related_to_id, due_date, priority, status, is_completed) VALUES
  -- Calls
  ('15000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'call',    'Follow-up call with Budi — Tech requirements',          'Discuss microservices vs monolith approach for platform modernization',                        'deal',       '14000000-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days',   'high',   'open',        false),
  ('15000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'call',    'Discovery call with Maya — Astra Fintech needs',         'Initial discovery: understand payment gateway requirements and compliance constraints',        'account',    '12000000-0000-0000-0000-000000000007', NOW() + INTERVAL '4 days',   'normal', 'open',        false),
  ('15000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'call',    'Check-in with Dewi — Pertamina IoT post-launch',         'Monthly check-in on IoT dashboard performance and upcoming feature requests',                  'deal',       '14000000-0000-0000-0000-000000000003', NOW() - INTERVAL '3 days',   'normal', 'completed',   true),
  -- Emails
  ('15000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'email',   'Send case study to Logistik Jaya',                       'Share fleet management case study from similar logistics client',                              'deal',       '14000000-0000-0000-0000-000000000004', NOW() + INTERVAL '1 day',    'normal', 'completed',   true),
  ('15000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'email',   'Follow-up: Telkom Digital POC results',                  'Send POC benchmark results and architecture recommendation document',                          'deal',       '14000000-0000-0000-0000-000000000005', NOW() + INTERVAL '3 days',   'high',   'open',        false),
  ('15000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'email',   'Send compliance checklist to Bank BNI',                  'OJK regulatory compliance checklist for digital onboarding platform',                          'deal',       '14000000-0000-0000-0000-000000000008', NOW() + INTERVAL '5 days',   'high',   'open',        false),
  -- Meetings
  ('15000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'meeting', 'Pricing negotiation with Bank Mandala',                  'Final pricing review with VP Operations and CFO',                                              'deal',       '14000000-0000-0000-0000-000000000002', NOW() + INTERVAL '3 days',   'high',   'open',        false),
  ('15000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'meeting', 'Jakarta Smart City — Contract review meeting',            'Review final contract terms with procurement and legal teams',                                 'deal',       '14000000-0000-0000-0000-000000000007', NOW() + INTERVAL '7 days',   'high',   'open',        false),
  ('15000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'meeting', 'Quarterly business review — Bukalapak',                  'QBR to review dashboard performance, usage metrics, and upsell opportunities',                 'account',    '12000000-0000-0000-0000-000000000010', NOW() + INTERVAL '14 days',  'normal', 'open',        false),
  ('15000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'meeting', 'Webinar prep — Digital Transformation series',            'Internal meeting to prepare content and demo flow for upcoming webinar',                       'account',    '12000000-0000-0000-0000-000000000006', NOW() - INTERVAL '1 day',    'normal', 'completed',   true),
  -- Tasks
  ('15000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'task',    'Prepare RFP response for Bank Mandala',                  'Draft technical architecture section of the RFP response',                                     'account',    '12000000-0000-0000-0000-000000000002', NOW() + INTERVAL '5 days',   'high',   'in_progress', false),
  ('15000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'task',    'Create demo environment for Astra Fintech',              'Set up sandbox payment gateway environment with test credentials',                              'deal',       '14000000-0000-0000-0000-000000000006', NOW() + INTERVAL '10 days',  'normal', 'open',        false),
  ('15000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000010', 'task',    'Update pricing sheet for Enterprise tier',               'Revise enterprise pricing to include AI add-on module and volume discounts',                   'account',    '12000000-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days',   'urgent', 'open',        false),
  ('15000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000010', 'task',    'Review SOW for Jakarta Smart City project',              'Legal review of Statement of Work before sending to client',                                   'deal',       '14000000-0000-0000-0000-000000000007', NOW() + INTERVAL '4 days',   'high',   'in_progress', false),
  ('15000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000010', 'task',    'Collect NDA from RS Medika Prima',                       'Send and follow up on mutual NDA before sharing technical documentation',                      'account',    '12000000-0000-0000-0000-000000000008', NOW() + INTERVAL '6 days',   'normal', 'open',        false)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. CASES (Customer Support)                             ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO cases (id, tenant_id, subject, description, status, priority, origin, type, contact_id, account_id) VALUES
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'API rate limiting issues on production',                'Client reports 429 errors during peak hours. Current limit 100 req/min may be too low for their traffic pattern.',     'working',   'high',     'email',  'problem',         '13000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004'),
  ('16000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Invoice discrepancy Q1 2026',                          'Client found Rp 15M difference between purchase order and invoice for March delivery. Need finance reconciliation.', 'new',       'medium',   'phone',  'question',        '13000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002'),
  ('16000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Request for custom SSO integration',                   'Client needs SAML 2.0 SSO integration with their Keycloak instance for enterprise deployment.',                       'closed',    'low',      'web',    'feature_request', '13000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Dashboard loading timeout — Bukalapak',                'Seller analytics dashboard timing out when loading > 100K records. Need pagination or caching optimization.',         'working',   'critical', 'chat',   'problem',         '13000000-0000-0000-0000-000000000010', '12000000-0000-0000-0000-000000000010'),
  ('16000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Telkom Digital — VPN tunnel drops',                     'Site-to-site VPN tunnel between on-prem DC and AWS periodically drops. Avg 2x per day lasting ~5 min each.',           'escalated', 'critical', 'phone',  'incident',        '13000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006'),
  ('16000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Jakarta Smart City — Data export feature request',      'Requesting bulk data export capability for open data initiative. CSV and JSON format support needed.',                 'new',       'medium',   'email',  'feature_request', '13000000-0000-0000-0000-000000000009', '12000000-0000-0000-0000-000000000009'),
  ('16000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Pertamina — Sensor data ingestion latency',             'IoT sensor data showing 30+ second latency in dashboard. SLA requires < 5 seconds.',                                  'working',   'high',     'email',  'problem',         '13000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004'),
  ('16000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'User access management — bulk operations',              'Bank Mandala needs ability to bulk add/remove users via CSV upload instead of one-by-one.',                            'new',       'low',      'web',    'feature_request', '13000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002'),
  ('16000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'SSL certificate expiry warning — Logistik Jaya',        'Client reported browser SSL warning. Certificate expires in 7 days. Urgent renewal needed.',                           'working',   'high',     'chat',   'incident',        '13000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003'),
  ('16000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'Mobile app crash on Android 14',                        'Several users reporting app crash on startup with Android 14 devices. Affects Samsung S24 and Pixel 8.',               'new',       'high',     'web',    'problem',         NULL,                                   NULL)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. CAMPAIGNS (Marketing)                                ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO campaigns (id, tenant_id, name, type, status, start_date, end_date, budget, actual_cost, expected_revenue, description) VALUES
  ('17000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Q2 2026 Digital Transformation Webinar',        'webinar', 'active',    '2026-04-15', '2026-04-15', 5000,  3200,  150000,  'Free webinar on digital transformation for Indonesian enterprises. Targeting CTO/CIOs.'),
  ('17000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Cloud Migration Email Drip Campaign',           'email',   'active',    '2026-04-01', '2026-06-30', 2000,  800,   500000,  '8-email sequence targeting enterprises considering cloud migration. Focus on cost + security.'),
  ('17000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'LinkedIn Ads — Enterprise Solutions',            'social',  'planned',   '2026-05-01', '2026-07-31', 15000, 0,     300000,  'LinkedIn sponsored content targeting VP+ in Banking, Energy, Logistics verticals.'),
  ('17000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Indonesia Tech Summit 2026 — Booth',             'event',   'planned',   '2026-06-20', '2026-06-22', 25000, 0,     800000,  'Exhibition booth at Indonesia''s largest tech conference. 3-day event with live demos.'),
  ('17000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'AI for Enterprise — Video Ad Campaign',          'ad',      'active',    '2026-04-10', '2026-05-31', 8000,  4500,  250000,  'YouTube and Instagram video ads showcasing AI features: lead scoring, chatbot, analytics.'),
  ('17000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Partner Referral Program Q2',                    'other',   'active',    '2026-04-01', '2026-06-30', 3000,  1500,  600000,  'Incentivize existing partners (Garuda Tech, Grab) to refer enterprise clients. 10% commission.'),
  ('17000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Government Sector Whitepaper Release',           'email',   'completed', '2026-03-01', '2026-03-31', 1500,  1200,  200000,  'Whitepaper: "Digital Government in Indonesia — 2026 Roadmap". Gated download + nurturing.'),
  ('17000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'Healthcare Digital Transformation Webinar',      'webinar', 'planned',   '2026-05-20', '2026-05-20', 4000,  0,     180000,  'Webinar targeting hospital CIOs on EMR, telehealth, and patient portal modernization.')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  8. CAMPAIGN MEMBERS                                     ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO campaign_members (campaign_id, individual_id, status, responded_at) VALUES
  -- Digital Transformation Webinar
  ('17000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'responded', NOW() - INTERVAL '1 day'),
  ('17000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000007', 'responded', NOW() - INTERVAL '2 days'),
  ('17000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000010', 'sent',      NULL),
  ('17000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000013', 'sent',      NULL),
  -- Cloud Migration Email Campaign
  ('17000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000003', 'sent',      NULL),
  ('17000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000009', 'responded', NOW() - INTERVAL '5 days'),
  ('17000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000019', 'sent',      NULL),
  -- AI Video Campaign
  ('17000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000008', 'responded', NOW() - INTERVAL '3 days'),
  ('17000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000012', 'sent',      NULL),
  ('17000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000014', 'responded', NOW() - INTERVAL '1 day'),
  -- Government Whitepaper
  ('17000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000010', 'converted', NOW() - INTERVAL '20 days'),
  ('17000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000016', 'responded', NOW() - INTERVAL '15 days'),
  ('17000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000018', 'responded', NOW() - INTERVAL '18 days')
ON CONFLICT DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  9. PRODUCTS (Catalog)                                   ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO products (id, tenant_id, name, code, description, unit_price, currency, category, is_active) VALUES
  ('18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'NusantaraSoft Platform — Standard',       'NSP-STD',   'Full platform license for up to 50 users. Includes CRM, PM, ITSM modules.',       50000,  'USD', 'license',      true),
  ('18000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'NusantaraSoft Platform — Enterprise',     'NSP-ENT',   'Enterprise license for unlimited users. All modules + priority support + SLA.',    150000, 'USD', 'license',      true),
  ('18000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Custom Integration Service',              'SVC-INT',   'Custom API integration and middleware development. Per-project pricing.',          25000,  'USD', 'service',      true),
  ('18000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Annual Support & Maintenance',            'SVC-SUP',   '24/7 support, bug fixes, security patches, and version upgrades.',                30000,  'USD', 'service',      true),
  ('18000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'AI/ML Add-on Module',                     'NSP-AI',    'MindsDB-powered AI features: lead scoring, forecasting, anomaly detection.',       40000,  'USD', 'addon',        true),
  ('18000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'IoT Gateway License',                     'NSP-IOT',   'IoT device management and data ingestion gateway. Up to 10,000 devices.',         35000,  'USD', 'license',      true),
  ('18000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Data Analytics Add-on',                   'NSP-DAT',   'Advanced analytics dashboard with custom reports, BI integration, data export.',   20000,  'USD', 'addon',        true),
  ('18000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'Cloud Hosting — Standard',                'CLD-STD',   'Managed cloud hosting on AWS Jakarta. 4 vCPU, 16GB RAM, 200GB SSD.',              12000,  'USD', 'subscription', true),
  ('18000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'Cloud Hosting — Premium',                 'CLD-PRM',   'High-availability managed hosting. 16 vCPU, 64GB RAM, 1TB SSD, auto-scaling.',   36000,  'USD', 'subscription', true),
  ('18000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'Training & Certification (per user)',      'TRN-USR',   '5-day instructor-led training + certification exam. Covers all platform modules.', 2000,   'USD', 'service',      true)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  10. QUOTES (Sales Proposals)                            ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO quotes (id, tenant_id, name, deal_id, account_id, contact_id, status, subtotal, discount_percent, tax_percent, total, valid_until, description) VALUES
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Q-2026-001: Toko Pintar Platform',              '14000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'presented', 200000,  10,  11,  197780,    '2026-05-31', 'Platform + Integration + 1yr Support'),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Q-2026-002: Bank Mandala Enterprise',           '14000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'draft',     350000,  5,   11,  369082.5,  '2026-06-15', 'Enterprise license + AI module + 3yr support'),
  ('19000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Q-2026-003: Telkom Multi-Cloud Package',        '14000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000006', 'presented', 450000,  8,   11,  459540,    '2026-07-15', 'Enterprise + IoT + Analytics + Premium Hosting + Training'),
  ('19000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Q-2026-004: Jakarta Smart City Renewal',        '14000000-0000-0000-0000-000000000007', '12000000-0000-0000-0000-000000000009', '13000000-0000-0000-0000-000000000009', 'accepted',  280000,  15,  11,  264110,    '2026-06-30', 'Platform renewal + AI add-on + extended support'),
  ('19000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Q-2026-005: Bukalapak Analytics Expansion',     '14000000-0000-0000-0000-000000000009', '12000000-0000-0000-0000-000000000010', '13000000-0000-0000-0000-000000000010', 'accepted',  120000,  5,   11,  126540,    '2026-03-15', 'Data Analytics add-on + Premium hosting upgrade')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  11. QUOTE ITEMS (Line Items)                            ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO quote_items (quote_id, product_id, product_name, quantity, unit_price, discount_percent, total, sort_order) VALUES
  -- Q-2026-001: Toko Pintar
  ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 'NusantaraSoft Platform — Standard',   1, 50000,  0, 50000,  0),
  ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000003', 'Custom Integration Service',          4, 25000,  0, 100000, 1),
  ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000004', 'Annual Support & Maintenance',        1, 30000,  0, 30000,  2),
  ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000010', 'Training & Certification (per user)', 10, 2000,  0, 20000,  3),
  -- Q-2026-002: Bank Mandala
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002', 'NusantaraSoft Platform — Enterprise', 1,  150000, 0, 150000, 0),
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000005', 'AI/ML Add-on Module',                 1,  40000,  0, 40000,  1),
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000004', 'Annual Support & Maintenance',        3,  30000,  0, 90000,  2),
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000003', 'Custom Integration Service',          2,  25000,  0, 50000,  3),
  ('19000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000010', 'Training & Certification (per user)', 10, 2000,   0, 20000,  4),
  -- Q-2026-003: Telkom Multi-Cloud
  ('19000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000002', 'NusantaraSoft Platform — Enterprise', 1,  150000, 0, 150000, 0),
  ('19000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000006', 'IoT Gateway License',                 1,  35000,  0, 35000,  1),
  ('19000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000007', 'Data Analytics Add-on',               1,  20000,  0, 20000,  2),
  ('19000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000009', 'Cloud Hosting — Premium',             3,  36000,  0, 108000, 3),
  ('19000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000005', 'AI/ML Add-on Module',                 1,  40000,  0, 40000,  4),
  ('19000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000003', 'Custom Integration Service',          2,  25000,  0, 50000,  5),
  ('19000000-0000-0000-0000-000000000003', '18000000-0000-0000-0000-000000000010', 'Training & Certification (per user)', 25, 2000,   0, 50000,  6),
  -- Q-2026-004: Jakarta Smart City
  ('19000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000002', 'NusantaraSoft Platform — Enterprise', 1,  150000, 0, 150000, 0),
  ('19000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000005', 'AI/ML Add-on Module',                 1,  40000,  0, 40000,  1),
  ('19000000-0000-0000-0000-000000000004', '18000000-0000-0000-0000-000000000004', 'Annual Support & Maintenance',        3,  30000,  0, 90000,  2),
  -- Q-2026-005: Bukalapak
  ('19000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000007', 'Data Analytics Add-on',               1,  20000,  0, 20000,  0),
  ('19000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000009', 'Cloud Hosting — Premium',             2,  36000,  0, 72000,  1),
  ('19000000-0000-0000-0000-000000000005', '18000000-0000-0000-0000-000000000004', 'Annual Support & Maintenance',        1,  30000,  0, 30000,  2);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  12. CRM NOTES (Free-text notes on entities)             ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO crm_notes (id, tenant_id, title, body, related_to_type, related_to_id, is_pinned) VALUES
  ('1A000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Strategic Importance',                   'Key strategic partner with high growth potential in the next fiscal year. They are expanding to 3 new cities and need scalable infrastructure.',                                                     'account', '12000000-0000-0000-0000-000000000001', true),
  ('1A000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Competitor Intel — Bank Mandala',         'Bank Mandala is also evaluating Oracle Cloud and SAP. Our advantage: local support, OJK compliance expertise, and 40% lower TCO.',                                                                  'deal',    '14000000-0000-0000-0000-000000000002', true),
  ('1A000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Budget Cycle Info',                       'Pertamina operates on fiscal year Jan-Dec. Capex approval for next FY happens in Sep-Oct. Plan upsell discussions accordingly.',                                                                     'account', '12000000-0000-0000-0000-000000000004', true),
  ('1A000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Technical Requirements — Telkom',         'Telkom requires: (1) Multi-tenant architecture, (2) ISO 27001 certification, (3) Data residency in Indonesia, (4) 99.99% SLA. All confirmed achievable.',                                           'deal',    '14000000-0000-0000-0000-000000000005', true),
  ('1A000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Meeting Notes — Jakarta Smart City',      'Met with Rina and her team on Apr 3. Key takeaways: (1) They want AI chatbot for citizen queries (2) Integration with DKI Jakarta data lake (3) Bilingual UI (ID/EN). Timeline: launch Aug 2026.',   'deal',    '14000000-0000-0000-0000-000000000007', false),
  ('1A000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Upsell Opportunity — Bukalapak',          'Current analytics dashboard performing well. Usage up 45% QoQ. Good candidate for AI/ML add-on module for demand forecasting.',                                                                     'account', '12000000-0000-0000-0000-000000000010', false),
  ('1A000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Why We Lost — Sinar Mas Land',            'Lost due to budget reallocation to 2027. Not a fit issue. They indicated they will revisit in Q4 2026 for FY2027 budget cycle. Set reminder for Oct 2026.',                                          'deal',    '14000000-0000-0000-0000-000000000010', true),
  ('1A000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'Decision Maker Mapping — Bank BNI',       'Diana (SVP Digital Banking) is the champion but final sign-off requires Director level approval from Pak Hartono (not yet in CRM). Need warm intro.',                                                'account', '12000000-0000-0000-0000-000000000011', true),
  ('1A000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'Astra Fintech — Regulatory Note',         'PCI DSS compliance is non-negotiable for their payment gateway. Our platform is PCI DSS Level 1 certified. Key selling point.',                                                                     'deal',    '14000000-0000-0000-0000-000000000006', false),
  ('1A000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'Healthcare Market Research',               'Indonesia healthcare IT market expected to grow 25% YoY through 2028. Key drivers: telemedicine regulation, BPJS digitization, hospital accreditation requirements.',                               'account', '12000000-0000-0000-0000-000000000008', false)
ON CONFLICT (id) DO NOTHING;


-- Signal PostgREST to reload


-- ===============================================================================
-- ======  INVENTORY SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════════
-- INVENTORY & SUPPLY CHAIN SEED DATA
-- Bins, Item Variants, Stock Ledger, Stock Movements,
-- Stock Operations, Stock Transfers, Fixed Assets
-- ═══════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. BINS (Storage Locations — 20 records)                ║
-- ╚═══════════════════════════════════════════════════════════╝
-- Zone A (Spare Parts) — WH Denpasar
-- Zone B (Safety Equipment) — WH Denpasar
-- Zone C (Fuel Storage) — WH Denpasar
-- Zone D (Transit Goods) — Sanur Harbour
-- Zone E (Passenger Supplies) — Sanur Harbour
-- Zone F (Heavy Equipment) — Padang Bai
-- Zone G (Paint & Chemicals) — Padang Bai
-- Zone H (Electronics) — Padang Bai

INSERT INTO inv_bins (id, zone_id, code, aisle, rack, level, position, bin_type, max_weight, max_volume, current_item_count, is_occupied, barcode, sort_order, status) VALUES
  -- Zone A: Spare Parts
  ('c0000001-0001-4000-a000-000000000001', 'b0000001-0001-4000-a000-000000000001', 'A-01-01-A', 'A-01', 'R01', 'L1', 'A', 'shelf',    50,   0.5,  4, true,  'BIN-A0101A', 0,  'occupied'),
  ('c0000001-0002-4000-a000-000000000002', 'b0000001-0001-4000-a000-000000000001', 'A-01-01-B', 'A-01', 'R01', 'L1', 'B', 'shelf',    50,   0.5,  2, true,  'BIN-A0101B', 1,  'occupied'),
  ('c0000001-0003-4000-a000-000000000003', 'b0000001-0001-4000-a000-000000000001', 'A-01-02-A', 'A-01', 'R02', 'L1', 'A', 'shelf',    50,   0.5,  0, false, 'BIN-A0102A', 2,  'available'),
  ('c0000001-0004-4000-a000-000000000004', 'b0000001-0001-4000-a000-000000000001', 'A-02-01-A', 'A-02', 'R01', 'L1', 'A', 'pallet',  500,   2.0,  3, true,  'BIN-A0201A', 3,  'occupied'),
  -- Zone B: Safety Equipment
  ('c0000001-0005-4000-a000-000000000005', 'b0000001-0002-4000-a000-000000000002', 'B-01-01-A', 'B-01', 'R01', 'L1', 'A', 'shelf',    30,   0.4,  2, true,  'BIN-B0101A', 0,  'occupied'),
  ('c0000001-0006-4000-a000-000000000006', 'b0000001-0002-4000-a000-000000000002', 'B-01-01-B', 'B-01', 'R01', 'L1', 'B', 'shelf',    30,   0.4,  1, true,  'BIN-B0101B', 1,  'occupied'),
  ('c0000001-0007-4000-a000-000000000007', 'b0000001-0002-4000-a000-000000000002', 'B-01-02-A', 'B-01', 'R02', 'L1', 'A', 'standard', 40,   0.5,  0, false, 'BIN-B0102A', 2,  'available'),
  -- Zone C: Fuel Storage
  ('c0000001-0008-4000-a000-000000000008', 'b0000001-0003-4000-a000-000000000003', 'C-FL-01',   'C-01', NULL,  NULL, NULL, 'floor',  2000, 10.0,  1, true,  'BIN-CFL01',  0,  'occupied'),
  ('c0000001-0009-4000-a000-000000000009', 'b0000001-0003-4000-a000-000000000003', 'C-FL-02',   'C-01', NULL,  NULL, NULL, 'floor',  2000, 10.0,  0, false, 'BIN-CFL02',  1,  'available'),
  -- Zone D: Transit Goods
  ('c0000001-0010-4000-a000-000000000010', 'b0000001-0004-4000-a000-000000000004', 'D-01-01-A', 'D-01', 'R01', 'L1', 'A', 'pallet',  500,   2.0,  2, true,  'BIN-D0101A', 0,  'occupied'),
  ('c0000001-0011-4000-a000-000000000011', 'b0000001-0004-4000-a000-000000000004', 'D-01-02-A', 'D-01', 'R02', 'L1', 'A', 'pallet',  500,   2.0,  0, false, 'BIN-D0102A', 1,  'reserved'),
  -- Zone E: Passenger Supplies
  ('c0000001-0012-4000-a000-000000000012', 'b0000001-0005-4000-a000-000000000005', 'E-01-01-A', 'E-01', 'R01', 'L1', 'A', 'shelf',    30,   0.3,  3, true,  'BIN-E0101A', 0,  'occupied'),
  ('c0000001-0013-4000-a000-000000000013', 'b0000001-0005-4000-a000-000000000005', 'E-01-01-B', 'E-01', 'R01', 'L1', 'B', 'shelf',    30,   0.3,  1, true,  'BIN-E0101B', 1,  'occupied'),
  -- Zone F: Heavy Equipment
  ('c0000001-0014-4000-a000-000000000014', 'b0000001-0006-4000-a000-000000000006', 'F-01-01-A', 'F-01', 'R01', 'L1', 'A', 'pallet', 1000,   5.0,  1, true,  'BIN-F0101A', 0,  'occupied'),
  ('c0000001-0015-4000-a000-000000000015', 'b0000001-0006-4000-a000-000000000006', 'F-FL-01',   'F-02', NULL,  NULL, NULL, 'floor',  3000, 15.0,  1, true,  'BIN-FFL01',  1,  'occupied'),
  -- Zone G: Paint & Chemicals
  ('c0000001-0016-4000-a000-000000000016', 'b0000001-0007-4000-a000-000000000007', 'G-01-01-A', 'G-01', 'R01', 'L1', 'A', 'shelf',    40,   0.5,  3, true,  'BIN-G0101A', 0,  'occupied'),
  ('c0000001-0017-4000-a000-000000000017', 'b0000001-0007-4000-a000-000000000007', 'G-01-02-A', 'G-01', 'R02', 'L1', 'A', 'shelf',    40,   0.5,  0, false, 'BIN-G0102A', 1,  'available'),
  -- Zone H: Electronics
  ('c0000001-0018-4000-a000-000000000018', 'b0000001-0008-4000-a000-000000000008', 'H-01-01-A', 'H-01', 'R01', 'L1', 'A', 'shelf',    20,   0.2,  2, true,  'BIN-H0101A', 0,  'occupied'),
  ('c0000001-0019-4000-a000-000000000019', 'b0000001-0008-4000-a000-000000000008', 'H-01-01-B', 'H-01', 'R01', 'L1', 'B', 'shelf',    20,   0.2,  0, false, 'BIN-H0101B', 1,  'available'),
  ('c0000001-0020-4000-a000-000000000020', 'b0000001-0008-4000-a000-000000000008', 'H-01-02-A', 'H-01', 'R02', 'L1', 'A', 'shelf',    20,   0.2,  1, true,  'BIN-H0102A', 2,  'occupied')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. ITEM VARIANTS (12 records)                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_item_variants (id, item_id, name, sku, attributes, cost_price, selling_price, barcode, status) VALUES
  -- Life Jacket variants (sizes)
  ('d0000001-0001-4000-a000-000000000001', 'af000001-0002-4000-a000-000000000002', 'Life Jacket — Small',    'LJ-III-S',   '{"size":"S","color":"Orange"}',    580000,   650000,   '8991234001001', 'active'),
  ('d0000001-0002-4000-a000-000000000002', 'af000001-0002-4000-a000-000000000002', 'Life Jacket — Medium',   'LJ-III-M',   '{"size":"M","color":"Orange"}',    600000,   650000,   '8991234001002', 'active'),
  ('d0000001-0003-4000-a000-000000000003', 'af000001-0002-4000-a000-000000000002', 'Life Jacket — Large',    'LJ-III-L',   '{"size":"L","color":"Orange"}',    620000,   680000,   '8991234001003', 'active'),
  ('d0000001-0004-4000-a000-000000000004', 'af000001-0002-4000-a000-000000000002', 'Life Jacket — XL',       'LJ-III-XL',  '{"size":"XL","color":"Orange"}',   650000,   720000,   '8991234001004', 'active'),
  -- Snorkeling Set variants
  ('d0000001-0005-4000-a000-000000000005', 'af000001-0019-4000-a000-000000000019', 'Snorkel Set — Small',    'SNK-CRS-S',  '{"size":"S","color":"Blue"}',      420000,   500000,   '8991234002001', 'active'),
  ('d0000001-0006-4000-a000-000000000006', 'af000001-0019-4000-a000-000000000019', 'Snorkel Set — Medium',   'SNK-CRS-M',  '{"size":"M","color":"Blue"}',      430000,   500000,   '8991234002002', 'active'),
  ('d0000001-0007-4000-a000-000000000007', 'af000001-0019-4000-a000-000000000019', 'Snorkel Set — Large',    'SNK-CRS-L',  '{"size":"L","color":"Black"}',     440000,   520000,   '8991234002003', 'active'),
  -- Antifouling Paint variants (colors)
  ('d0000001-0008-4000-a000-000000000008', 'af000001-0006-4000-a000-000000000006', 'Antifouling Paint — Blue',    'PNT-AF-BLU', '{"color":"Blue","volume":"5L"}',   1350000,  1500000,  '8991234003001', 'active'),
  ('d0000001-0009-4000-a000-000000000009', 'af000001-0006-4000-a000-000000000006', 'Antifouling Paint — Red',     'PNT-AF-RED', '{"color":"Red","volume":"5L"}',    1380000,  1550000,  '8991234003002', 'active'),
  ('d0000001-0010-4000-a000-000000000010', 'af000001-0006-4000-a000-000000000006', 'Antifouling Paint — Black',   'PNT-AF-BLK', '{"color":"Black","volume":"5L"}',  1400000,  1600000,  '8991234003003', 'active'),
  -- Fiberglass Hull variants
  ('d0000001-0011-4000-a000-000000000011', 'af000001-0014-4000-a000-000000000014', 'Hull 35ft — Standard',   'HULL-35-STD', '{"type":"Standard","length":"35ft"}', 85000000, 95000000, '8991234004001', 'active'),
  ('d0000001-0012-4000-a000-000000000012', 'af000001-0014-4000-a000-000000000014', 'Hull 35ft — Premium',    'HULL-35-PRM', '{"type":"Premium","length":"35ft"}',  110000000, 125000000, '8991234004002', 'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. STOCK LEDGER (current stock levels — 20 records)     ║
-- ╚═══════════════════════════════════════════════════════════╝
-- warehouse_id uses warehouse code strings (WH-DPS-01, WH-SNR-02, WH-PDG-03)

INSERT INTO inv_stock_ledger (id, tenant_id, item_id, variant_id, warehouse_id, on_hand, reserved, committed) VALUES
  -- WH-DPS-01: Main warehouse
  ('e0000001-0001-4000-a000-000000000001', '00000000-0000-0000-0000-000000000010', 'af000001-0001-4000-a000-000000000001', NULL, 'WH-DPS-01', 24,  0,  6),    -- Oil Filters
  ('e0000001-0002-4000-a000-000000000002', '00000000-0000-0000-0000-000000000010', 'af000001-0004-4000-a000-000000000004', NULL, 'WH-DPS-01', 6,   0,  2),    -- Impeller Kits
  ('e0000001-0003-4000-a000-000000000003', '00000000-0000-0000-0000-000000000010', 'af000001-0002-4000-a000-000000000002', NULL, 'WH-DPS-01', 35,  5,  0),    -- Life Jackets
  ('e0000001-0004-4000-a000-000000000004', '00000000-0000-0000-0000-000000000010', 'af000001-0005-4000-a000-000000000005', NULL, 'WH-DPS-01', 18,  0,  0),    -- Fire Extinguishers
  ('e0000001-0005-4000-a000-000000000005', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-DPS-01', 450, 0,  50),   -- Diesel Fuel (L)
  ('e0000001-0006-4000-a000-000000000006', '00000000-0000-0000-0000-000000000010', 'af000001-0006-4000-a000-000000000006', NULL, 'WH-DPS-01', 3,   0,  0),    -- Antifouling Paint
  ('e0000001-0007-4000-a000-000000000007', '00000000-0000-0000-0000-000000000010', 'af000001-0007-4000-a000-000000000007', NULL, 'WH-DPS-01', 5,   0,  1),    -- Fiberglass Cloth
  ('e0000001-0008-4000-a000-000000000008', '00000000-0000-0000-0000-000000000010', 'af000001-0008-4000-a000-000000000008', NULL, 'WH-DPS-01', 3,   0,  0),    -- Polyester Resin
  -- WH-SNR-02: Sanur Harbour
  ('e0000001-0009-4000-a000-000000000009', '00000000-0000-0000-0000-000000000010', 'af000001-0002-4000-a000-000000000002', NULL, 'WH-SNR-02', 15,  0,  0),    -- Life Jackets (at harbour)
  ('e0000001-0010-4000-a000-000000000010', '00000000-0000-0000-0000-000000000010', 'af000001-0019-4000-a000-000000000019', NULL, 'WH-SNR-02', 30,  0,  5),    -- Snorkeling Sets
  ('e0000001-0011-4000-a000-000000000011', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-SNR-02', 200, 0,  0),    -- Diesel at Sanur
  ('e0000001-0012-4000-a000-000000000012', '00000000-0000-0000-0000-000000000010', 'af000001-0001-4000-a000-000000000001', NULL, 'WH-SNR-02', 8,   0,  0),    -- Oil Filters at Sanur
  -- WH-PDG-03: Padang Bai
  ('e0000001-0013-4000-a000-000000000013', '00000000-0000-0000-0000-000000000010', 'af000001-0014-4000-a000-000000000014', NULL, 'WH-PDG-03', 2,   1,  0),    -- Fiberglass Hull
  ('e0000001-0014-4000-a000-000000000014', '00000000-0000-0000-0000-000000000010', 'af000001-0006-4000-a000-000000000006', NULL, 'WH-PDG-03', 8,   0,  2),    -- Paint at Padang Bai
  ('e0000001-0015-4000-a000-000000000015', '00000000-0000-0000-0000-000000000010', 'af000001-0015-4000-a000-000000000015', NULL, 'WH-PDG-03', 3,   0,  0),    -- GPS Nav Console
  -- WH-JKT: Jakarta
  ('e0000001-0016-4000-a000-000000000016', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000001', NULL, 'WH-JKT',    12,  0,  5),    -- Dell Laptops
  ('e0000001-0017-4000-a000-000000000017', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000002', NULL, 'WH-JKT',    8,   0,  3),    -- Dell Monitors
  ('e0000001-0018-4000-a000-000000000018', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000003', NULL, 'WH-JKT',    5,   0,  2),    -- Cisco Switches
  ('e0000001-0019-4000-a000-000000000019', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000004', NULL, 'WH-JKT',    50,  0,  0),    -- A4 Paper
  ('e0000001-0020-4000-a000-000000000020', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000005', NULL, 'WH-JKT',    3,   0,  1)     -- APC UPS
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. STOCK MOVEMENTS (25 records)                         ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_stock_movements (id, tenant_id, item_id, variant_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference, reference_type, reference_id, batch_number, notes, created_by, created_at) VALUES
  -- Inbound: GRN receipts
  ('f0000001-0001-4000-a000-000000000001', '00000000-0000-0000-0000-000000000010', 'af000001-0001-4000-a000-000000000001', NULL, 'WH-DPS-01', 'in',  24,  250000,  6000000,  'GRN-2026-001', 'grn', '23000000-0000-0000-0000-000000000001', 'YMH-OF-2026Q2', 'Received from Yamaha — routine oil filters',         'Ketut Wirawan', '2026-04-08 15:00:00+07'),
  ('f0000001-0002-4000-a000-000000000002', '00000000-0000-0000-0000-000000000010', 'af000001-0004-4000-a000-000000000004', NULL, 'WH-DPS-01', 'in',  6,   3500000, 21000000, 'GRN-2026-001', 'grn', '23000000-0000-0000-0000-000000000001', 'YMH-IK-2026Q2', 'Received from Yamaha — impeller kits',               'Ketut Wirawan', '2026-04-08 15:00:00+07'),
  ('f0000001-0003-4000-a000-000000000003', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-DPS-01', 'in',  225, 400000,  90000000, 'GRN-2026-002', 'grn', '23000000-0000-0000-0000-000000000002', 'FUEL-APR-B1',   'Diesel fuel batch 1 — April delivery',               'Kadek Ayu',     '2026-04-01 10:00:00+07'),
  ('f0000001-0004-4000-a000-000000000004', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-DPS-01', 'in',  225, 400000,  90000000, 'GRN-2026-003', 'grn', '23000000-0000-0000-0000-000000000003', 'FUEL-APR-B2',   'Diesel fuel batch 2',                                 'Kadek Ayu',     '2026-04-15 09:30:00+07'),
  ('f0000001-0005-4000-a000-000000000005', '00000000-0000-0000-0000-000000000010', 'af000001-0002-4000-a000-000000000002', NULL, 'WH-DPS-01', 'in',  15,  650000,  9750000,  'GRN-2026-006', 'grn', '23000000-0000-0000-0000-000000000006', 'SSE-LJ-2026-1', 'Life jackets partial delivery',                       'Wayan Darma',   '2026-04-12 11:00:00+07'),
  ('f0000001-0006-4000-a000-000000000006', '00000000-0000-0000-0000-000000000010', 'af000001-0005-4000-a000-000000000005', NULL, 'WH-DPS-01', 'in',  10,  450000,  4500000,  'GRN-2026-006', 'grn', '23000000-0000-0000-0000-000000000006', 'SSE-FE-2026-1', 'Fire extinguishers complete delivery',                'Wayan Darma',   '2026-04-12 11:00:00+07'),
  ('f0000001-0007-4000-a000-000000000007', '00000000-0000-0000-0000-000000000010', 'af000001-0019-4000-a000-000000000019', NULL, 'WH-SNR-02', 'in',  30,  475000,  14250000, 'GRN-2026-007', 'grn', '23000000-0000-0000-0000-000000000007', 'CRS-SNK-2026',  'Cressi snorkeling sets — full delivery',              'Komang Sudiarta','2026-05-05 11:00:00+07'),
  -- Outbound: Usage/consumption
  ('f0000001-0008-4000-a000-000000000008', '00000000-0000-0000-0000-000000000010', 'af000001-0001-4000-a000-000000000001', NULL, 'WH-DPS-01', 'out', 4,   250000,  1000000,  'WO-2026-015',  'work_order', NULL, NULL,           'Used for scheduled maintenance on SB-01, SB-02',     'Ketut Wirawan', '2026-04-09 08:00:00+07'),
  ('f0000001-0009-4000-a000-000000000009', '00000000-0000-0000-0000-000000000010', 'af000001-0004-4000-a000-000000000004', NULL, 'WH-DPS-01', 'out', 2,   3500000, 7000000,  'WO-2026-015',  'work_order', NULL, NULL,           'Impeller replacement on SB-01, SB-02',                'Ketut Wirawan', '2026-04-09 08:30:00+07'),
  ('f0000001-0010-4000-a000-000000000010', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-DPS-01', 'out', 50,  400000,  20000000, 'FUEL-DAILY',   'consumption', NULL, NULL,          'Daily fleet refueling — 10 boats',                    'Kadek Ayu',     '2026-04-10 06:00:00+07'),
  ('f0000001-0011-4000-a000-000000000011', '00000000-0000-0000-0000-000000000010', 'af000001-0019-4000-a000-000000000019', NULL, 'WH-SNR-02', 'out', 5,   475000,  2375000,  'TOUR-20260412', 'tour', NULL, NULL,              'Issued to tour guide for Nusa Penida trip',           'Komang Sudiarta','2026-04-12 07:00:00+07'),
  -- Transfer movements
  ('f0000001-0012-4000-a000-000000000012', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-DPS-01', 'out', 200, 400000,  80000000, 'TRF-2026-001', 'transfer', NULL, NULL,           'Fuel transfer to Sanur Harbour depot',                'Kadek Ayu',     '2026-04-05 07:00:00+07'),
  ('f0000001-0013-4000-a000-000000000013', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-SNR-02', 'in',  200, 400000,  80000000, 'TRF-2026-001', 'transfer', NULL, NULL,           'Fuel received from main warehouse',                   'Kadek Ayu',     '2026-04-05 09:00:00+07'),
  ('f0000001-0014-4000-a000-000000000014', '00000000-0000-0000-0000-000000000010', 'af000001-0002-4000-a000-000000000002', NULL, 'WH-DPS-01', 'out', 15,  650000,  9750000,  'TRF-2026-002', 'transfer', NULL, NULL,           'Life jackets to Sanur for boat fleet',                'Wayan Darma',   '2026-04-13 08:00:00+07'),
  ('f0000001-0015-4000-a000-000000000015', '00000000-0000-0000-0000-000000000010', 'af000001-0002-4000-a000-000000000002', NULL, 'WH-SNR-02', 'in',  15,  650000,  9750000,  'TRF-2026-002', 'transfer', NULL, NULL,           'Life jackets received from main warehouse',           'Wayan Darma',   '2026-04-13 10:00:00+07'),
  -- Adjustments
  ('f0000001-0016-4000-a000-000000000016', '00000000-0000-0000-0000-000000000010', 'af000001-0005-4000-a000-000000000005', NULL, 'WH-DPS-01', 'in',  2,   450000,  900000,   'ADJ-2026-001', 'adjustment', NULL, NULL,         'Stock correction — 2 units found in wrong zone',     'Ketut Wirawan', '2026-04-07 14:00:00+07'),
  ('f0000001-0017-4000-a000-000000000017', '00000000-0000-0000-0000-000000000010', 'af000001-0001-4000-a000-000000000001', NULL, 'WH-SNR-02', 'in',  8,   250000,  2000000,  'TRF-2026-003', 'transfer', NULL, NULL,           'Oil filters transferred to Sanur for local boats',    'Ketut Wirawan', '2026-04-10 09:00:00+07'),
  -- More consumption
  ('f0000001-0018-4000-a000-000000000018', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-DPS-01', 'out', 45,  400000,  18000000, 'FUEL-DAILY',   'consumption', NULL, NULL,          'Daily refueling — 9 boats',                           'Kadek Ayu',     '2026-04-11 06:00:00+07'),
  ('f0000001-0019-4000-a000-000000000019', '00000000-0000-0000-0000-000000000010', 'af000001-0003-4000-a000-000000000003', NULL, 'WH-DPS-01', 'out', 40,  400000,  16000000, 'FUEL-DAILY',   'consumption', NULL, NULL,          'Daily refueling — 8 boats (Sat reduced)',             'Kadek Ayu',     '2026-04-12 06:00:00+07'),
  -- IT equipment movements
  ('f0000001-0020-4000-a000-000000000020', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000001', NULL, 'WH-JKT',    'out', 3,   15000000, 45000000, 'IT-DEPLOY-001','deployment', NULL, NULL,          'Laptops deployed to marketing department',            'Agus Prasetyo', '2026-04-14 10:00:00+07'),
  ('f0000001-0021-4000-a000-000000000021', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000002', NULL, 'WH-JKT',    'out', 2,   6500000,  13000000, 'IT-DEPLOY-001','deployment', NULL, NULL,          'Monitors deployed with laptops',                      'Agus Prasetyo', '2026-04-14 10:00:00+07'),
  -- Write-off
  ('f0000001-0022-4000-a000-000000000022', '00000000-0000-0000-0000-000000000010', 'af000001-0006-4000-a000-000000000006', NULL, 'WH-DPS-01', 'out', 2,   1500000, 3000000,  'WO-DMG-001',  'write_off', NULL, NULL,            'Paint damaged in shipping — written off per GRN-008', 'Nyoman Astra',  '2026-04-19 10:00:00+07'),
  -- Returns
  ('f0000001-0023-4000-a000-000000000023', '00000000-0000-0000-0000-000000000010', 'af000001-0019-4000-a000-000000000019', NULL, 'WH-SNR-02', 'in',  3,   475000,  1425000,  'RTN-TOUR-003', 'return', NULL, NULL,             'Snorkel sets returned from tour — 2 need cleaning',  'Komang Sudiarta','2026-04-12 16:00:00+07'),
  -- Outbound to Padang Bai
  ('f0000001-0024-4000-a000-000000000024', '00000000-0000-0000-0000-000000000010', 'af000001-0006-4000-a000-000000000006', NULL, 'WH-PDG-03', 'in',  8,   1500000, 12000000, 'TRF-2026-004', 'transfer', NULL, NULL,           'Paint stock for dry dock season',                     'Nyoman Astra',  '2026-03-25 09:00:00+07'),
  ('f0000001-0025-4000-a000-000000000025', '00000000-0000-0000-0000-000000000010', 'af000001-0015-4000-a000-000000000015', NULL, 'WH-PDG-03', 'in',  3,   25000000,75000000, 'PO-DIRECT',    'purchase', NULL, NULL,            'GPS Nav consoles — direct delivery to Padang Bai',    'Bagus Mahendra','2026-03-20 11:00:00+07')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. STOCK OPERATIONS (10 records)                        ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_stock_operations (id, tenant_id, operation_number, operation_type, item_id, item_name, warehouse_id, quantity, unit_cost, reason, reference, batch_number, expiry_date, approved_by, notes, status, created_by, created_at) VALUES
  ('f1000001-0001-4000-a000-000000000001', '00000000-0000-0000-0000-000000000010', 'OP-2026-001', 'adjustment_in',  'af000001-0005-4000-a000-000000000005', 'Fire Extinguisher 3kg',       'WH-DPS-01', 2,   450000,  'Found in wrong zone during stock opname',          'OPNAME-2026-Q1', NULL,           NULL,         'I Made Suardana', 'Moved from Zone C to Zone B. Count corrected.',                      'completed', 'Ketut Wirawan',  '2026-04-07 14:00:00+07'),
  ('f1000001-0002-4000-a000-000000000002', '00000000-0000-0000-0000-000000000010', 'OP-2026-002', 'write_off',      'af000001-0006-4000-a000-000000000006', 'Antifouling Paint 5L',        'WH-DPS-01', 2,   1500000, 'Damaged during shipping — leaked in transit',      'GRN-2026-008',   'YMH-AP-2026',  NULL,         'I Made Suardana', 'Supplier to send replacement. Claim filed.',                          'completed', 'Nyoman Astra',   '2026-04-19 10:00:00+07'),
  ('f1000001-0003-4000-a000-000000000003', '00000000-0000-0000-0000-000000000010', 'OP-2026-003', 'adjustment_out', '34000000-0000-0000-0000-000000000004', 'A4 Copy Paper 80gsm',         'WH-JKT',    5,   55000,   'Expired stock — water damage during rainy season', NULL,             NULL,           NULL,         'Agus Prasetyo',   'Paper stock ruined by leak in Jakarta warehouse roof.',               'completed', 'Agus Prasetyo',  '2026-04-03 11:00:00+07'),
  ('f1000001-0004-4000-a000-000000000004', '00000000-0000-0000-0000-000000000010', 'OP-2026-004', 'adjustment_in',  'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',   'WH-SNR-02', 3,   475000,  'Returned from tour — cleaned and restocked',       'RTN-TOUR-003',   NULL,           NULL,         'Wayan Darma',     'Sets cleaned, inspected, and returned to sellable inventory.',        'completed', 'Komang Sudiarta','2026-04-12 17:00:00+07'),
  ('f1000001-0005-4000-a000-000000000005', '00000000-0000-0000-0000-000000000010', 'OP-2026-005', 'recount',        'af000001-0002-4000-a000-000000000002', 'Marine Life Jacket Type III', 'WH-DPS-01', 35,  650000,  'Quarterly stock verification',                     'OPNAME-2026-Q1', NULL,           NULL,         'I Made Suardana', 'Physical count confirms 35 units. System matched.',                   'completed', 'Wayan Darma',    '2026-04-06 09:00:00+07'),
  ('f1000001-0006-4000-a000-000000000006', '00000000-0000-0000-0000-000000000010', 'OP-2026-006', 'disposal',       'af000001-0001-4000-a000-000000000001', 'Yamaha Outboard Oil Filter',  'WH-DPS-01', 3,   250000,  'Expired — past shelf life date',                   NULL,             'YMH-OF-2025Q1','2026-03-31', 'I Made Suardana', 'Filters from 2025 Q1 batch expired. Cannot be used.',                 'completed', 'Ketut Wirawan',  '2026-04-02 10:00:00+07'),
  ('f1000001-0007-4000-a000-000000000007', '00000000-0000-0000-0000-000000000010', 'OP-2026-007', 'adjustment_in',  'af000001-0003-4000-a000-000000000003', 'Diesel Fuel (Solar)',          'WH-DPS-01', 15,  400000,  'Meter recalibration — actual higher than recorded','METER-CAL-001',  NULL,           NULL,         'I Made Suardana', 'Fuel meter re-calibrated. Added difference to stock.',                'completed', 'Kadek Ayu',      '2026-04-08 07:00:00+07'),
  ('f1000001-0008-4000-a000-000000000008', '00000000-0000-0INSERT INTO inv_stock_transfers (id, tenant_id, transfer_number, from_warehouse_id, to_warehouse_id, from_bin_id, to_bin_id, item_id, item_name, quantity, uom, reason, requested_by, approved_by, approved_at, completed_at, notes, status) VALUES
  ('f2000001-0001-4000-a000-000000000001', '00000000-0000-0000-0000-000000000010', 'TRF-2026-001', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0002-4000-a000-000000000002', 'c0000001-0008-4000-a000-000000000008', NULL, 'af000001-0003-4000-a000-000000000003', 'Diesel Fuel (Solar)',          200, 'L',    'Refuel Sanur Harbour depot for daily operations',          'Kadek Ayu',      'I Made Suardana', '2026-04-05 06:45:00+07', '2026-04-05 09:00:00+07', 'Tanker delivery via road. Driver: Wayan Gede.',  'completed'),
  ('f2000001-0002-4000-a000-000000000002', '00000000-0000-0000-0000-000000000010', 'TRF-2026-002', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0002-4000-a000-000000000002', 'c0000001-0005-4000-a000-000000000005', 'c0000001-0012-4000-a000-000000000012', 'af000001-0002-4000-a000-000000000002', 'Marine Life Jacket Type III',  15,  'pcs',  'Replenish life jackets at Sanur boat fleet',               'Wayan Darma',    'I Made Suardana', '2026-04-13 07:30:00+07', '2026-04-13 10:00:00+07', 'Delivered by pickup truck.',                      'completed'),
  ('f2000001-0003-4000-a000-000000000003', '00000000-0000-0000-0000-000000000010', 'TRF-2026-003', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0002-4000-a000-000000000002', 'c0000001-0001-4000-a000-000000000001', 'c0000001-0010-4000-a000-000000000010', 'af000001-0001-4000-a000-000000000001', 'Yamaha Outboard Oil Filter',   8,   'pcs',  'Oil filters for Sanur fleet maintenance',                  'Ketut Wirawan',  'I Made Suardana', '2026-04-10 08:15:00+07', '2026-04-10 09:30:00+07', NULL,                                              'completed'),
  ('f2000001-0004-4000-a000-000000000004', '00000000-0000-0000-0000-000000000010', 'TRF-2026-004', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0003-4000-a000-000000000003', 'c0000001-0016-4000-a000-000000000016', NULL, 'af000001-0006-4000-a000-000000000006', 'Antifouling Paint 5L',         8,   'pcs',  'Paint stock for upcoming dry dock season',                 'Nyoman Astra',   'I Made Suardana', '2026-03-25 08:30:00+07', '2026-03-25 12:00:00+07', 'Padang Bai drydock needs paint before May.',      'completed'),
  ('f2000001-0005-4000-a000-000000000005', '00000000-0000-0000-0000-000000000010', 'TRF-2026-005', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0003-4000-a000-000000000003', NULL,                                   NULL, 'af000001-0007-4000-a000-000000000007', 'Fiberglass Cloth Roll',        2,   'rolls','Fiberglass for Padang Bai hull repairs',                   'Nyoman Astra',   'I Made Suardana', '2026-04-16 08:30:00+07', NULL,                     'In transit — expected arrival Apr 16 afternoon.', 'in_transit'),
  ('f2000001-0006-4000-a000-000000000006', '00000000-0000-0000-0000-000000000010', 'TRF-2026-006', 'a0000001-0002-4000-a000-000000000002', 'a0000001-0001-4000-a000-000000000001', NULL,                                   NULL, 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',    5,   'sets', 'Return damaged snorkeling sets for inspection',            'Komang Sudiarta','Wayan Darma',     '2026-04-14 09:30:00+07', NULL,                     'Sets with damaged straps, need repair.',           'approved'),
  ('f2000001-0007-4000-a000-000000000007', '00000000-0000-0000-0000-000000000010', 'TRF-2026-007', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0002-4000-a000-000000000002', NULL,                                   NULL, 'af000001-0005-4000-a000-000000000005', 'Fire Extinguisher 3kg',        4,   'pcs',  'Safety compliance — each boat needs 2 extinguishers',      'Wayan Darma',    NULL,              NULL,                     NULL,                     'Awaiting safety officer approval.',               'pending'),
  ('f2000001-0008-4000-a000-000000000008', '00000000-0000-0000-0000-000000000010', 'TRF-2026-008', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0003-4000-a000-000000000003', NULL,                                   NULL, 'af000001-0004-4000-a000-000000000004', 'Impeller Kit Yamaha 150HP',    2,   'sets', 'Padang Bai scheduled maintenance next week',               'Ketut Wirawan',  'I Made Suardana', '2026-04-15 09:15:00+07', NULL,                     'Priority — SB-09 + SB-10 due for service.',       'in_transit')
ON CONFLICT (id) DO NOTHING;8:00:00+07', '2026-04-16 08:30:00+07', NULL,                     'In transit — expected arrival Apr 16 afternoon.', 'in_transit'),
  ('f2000001-0006-4000-a000-000000000006', '00000000-0000-0000-0000-000000000010', 'TRF-2026-006', 'a0000001-0002-4000-a000-000000000002', 'a0000001-0001-4000-a000-000000000001', NULL,                                   NULL, 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',    5,   'sets', 'Return damaged snorkeling sets for inspection',            'Komang Sudiarta','Wayan Darma',     '2026-04-14 09:00:00+07', '2026-04-14 09:30:00+07', NULL,                     'Sets with damaged straps, need repair.',           'approved'),
  ('f2000001-0007-4000-a000-000000000007', '00000000-0000-0000-0000-000000000010', 'TRF-2026-007', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0002-4000-a000-000000000002', NULL,                                   NULL, 'af000001-0005-4000-a000-000000000005', 'Fire Extinguisher 3kg',        4,   'pcs',  'Safety compliance — each boat needs 2 extinguishers',      'Wayan Darma',    NULL,              '2026-04-15 14:00:00+07', NULL,                    NULL,                     'Awaiting safety officer approval.',               'pending'),
  ('f2000001-0008-4000-a000-000000000008', '00000000-0000-0000-0000-000000000010', 'TRF-2026-008', 'a0000001-0001-4000-a000-000000000001', 'a0000001-0003-4000-a000-000000000003', NULL,                                   NULL, 'af000001-0004-4000-a000-000000000004', 'Impeller Kit Yamaha 150HP',    2,   'sets', 'Padang Bai scheduled maintenance next week',               'Ketut Wirawan',  'I Made Suardana', '2026-04-15 09:00:00+07', '2026-04-15 09:15:00+07', NULL,                     'Priority — SB-09 + SB-10 due for service.',       'in_transit')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. FIXED ASSETS (12 records)                            ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_fixed_assets (id, tenant_id, item_id, asset_number, asset_name, asset_category, serial_number, purchase_date, purchase_price, current_value, salvage_value, depreciation_method, useful_life_months, accumulated_depreciation, last_depreciation_date, warranty_expiry, location, warehouse_id, assigned_to, condition, insurance_policy, insurance_expiry, maintenance_schedule, last_maintenance_date, next_maintenance_date, notes, status) VALUES
  -- Speedboats
  ('f3000001-0001-4000-a000-000000000001', '00000000-0000-0000-0000-000000000010', NULL, 'FA-SB-001', 'Speedboat SB-01 — Nusa Dua Express',     'Vehicle',     'SB-01-2022-DPS',  '2022-06-15', 850000000,  637500000,  170000000, 'straight_line', 120, 212500000, '2026-03-31', '2025-06-15', 'Sanur Harbour',   'WH-SNR-02', 'Ketut Wirawan',   'good',      'MAR-INS-2026-001', '2026-12-31', 'Monthly engine check, quarterly hull inspection',       '2026-04-01', '2026-05-01', 'Primary tourist boat — Sanur to Nusa Penida route',                'active'),
  ('f3000001-0002-4000-a000-000000000002', '00000000-0000-0000-0000-000000000010', NULL, 'FA-SB-002', 'Speedboat SB-02 — Lembongan Star',       'Vehicle',     'SB-02-2022-DPS',  '2022-08-20', 850000000,  620000000,  170000000, 'straight_line', 120, 230000000, '2026-03-31', '2025-08-20', 'Sanur Harbour',   'WH-SNR-02', 'Ketut Wirawan',   'good',      'MAR-INS-2026-002', '2026-12-31', 'Monthly engine check, quarterly hull inspection',       '2026-04-01', '2026-05-01', 'Sanur to Lembongan daily service',                                  'active'),
  ('f3000001-0003-4000-a000-000000000003', '00000000-0000-0000-0000-000000000010', NULL, 'FA-SB-005', 'Speedboat SB-05 — Ocean Breeze',         'Vehicle',     'SB-05-2020-DPS',  '2020-03-10', 750000000,  437500000,  150000000, 'straight_line', 120, 312500000, '2026-03-31', '2023-03-10', 'Padang Bai Dock', 'WH-PDG-03', 'Nyoman Astra',    'fair',      'MAR-INS-2026-005', '2026-12-31', 'Monthly engine check, quarterly hull inspection',       '2026-03-15', '2026-04-15', 'Oldest in fleet — hull crack repaired April 2026',                  'active'),
  ('f3000001-0004-4000-a000-000000000004', '00000000-0000-0000-0000-000000000010', NULL, 'FA-SB-007', 'Speedboat SB-07 — Coral Finder',         'Vehicle',     'SB-07-2021-DPS',  '2021-11-05', 800000000,  533333000,  160000000, 'straight_line', 120, 266667000, '2026-03-31', '2024-11-05', 'Sanur Harbour',   'WH-SNR-02', 'Ketut Wirawan',   'under_repair','MAR-INS-2026-007','2026-12-31','Monthly engine check, quarterly hull inspection',      '2026-04-11', '2026-05-11', 'Engine failure April 11. Water pump replaced. Under observation.', 'under_maintenance'),
  -- Office IT Assets
  ('f3000001-0005-4000-a000-000000000005', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000001', 'FA-IT-001', 'Dell Latitude 5550 — CEO',         'IT Equipment','DELL-5550-SN-001', '2024-01-15', 15000000, 10000000, 1500000, 'straight_line', 48,  5000000,  '2026-03-31', '2027-01-15', 'Head Office',     'WH-JKT',    'I Made Suardana', 'good',      NULL,               NULL,         'Annual cleaning, OS update quarterly',                  '2026-04-01', '2026-07-01', NULL,                                                                'active'),
  ('f3000001-0006-4000-a000-000000000006', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000001', 'FA-IT-002', 'Dell Latitude 5550 — Finance',     'IT Equipment','DELL-5550-SN-002', '2024-01-15', 15000000, 10000000, 1500000, 'straight_line', 48,  5000000,  '2026-03-31', '2027-01-15', 'Head Office',     'WH-JKT',    'Kadek Ayu',       'good',      NULL,               NULL,         'Annual cleaning, OS update quarterly',                  '2026-04-01', '2026-07-01', NULL,                                                                'active'),
  ('f3000001-0007-4000-a000-000000000007', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000003', 'FA-IT-010', 'Cisco Catalyst 9200 — Server Room', 'IT Equipment','CSCO-9200-SN-001', '2024-06-01', 12000000, 9000000,  1200000, 'straight_line', 60,  3000000,  '2026-03-31', '2027-06-01', 'Server Room',     'WH-JKT',    'Agus Prasetyo',   'good',      NULL,               NULL,         'Firmware update quarterly, port check monthly',         '2026-03-01', '2026-06-01', 'Core switch — handles all office network traffic.',                 'active'),
  ('f3000001-0008-4000-a000-000000000008', '00000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000005', 'FA-IT-011', 'APC Smart-UPS 3000VA — Server Room','IT Equipment','APC-3000-SN-001',  '2024-06-01', 11000000, 8250000,  1100000, 'straight_line', 60,  2750000,  '2026-03-31', '2027-06-01', 'Server Room',     'WH-JKT',    'Agus Prasetyo',   'good',      NULL,               NULL,         'Battery test quarterly, replace battery every 3 years', '2026-03-01', '2026-06-01', 'Protects server rack during outages. Avg 15 min runtime.',          'active'),
  -- Marine Equipment
  ('f3000001-0009-4000-a000-000000000009', '00000000-0000-0000-0000-000000000010', 'af000001-0015-4000-a000-000000000015', 'FA-NAV-001', 'GPS Navigation Console V2 — SB-01','Marine Equipment','NAV-V2-SN-001','2023-09-01', 25000000, 18750000, 2500000, 'straight_line', 60,  6250000,  '2026-03-31', '2026-09-01', 'Speedboat SB-01', 'WH-SNR-02', 'Ketut Wirawan',   'good',      NULL,               NULL,         'Firmware update annually, calibration every 6 months',  '2026-03-01', '2026-09-01', 'Garmin GPSMAP 8612xsv. Primary navigation for Nusa Penida route.', 'active'),
  ('f3000001-0010-4000-a000-000000000010', '00000000-0000-0000-0000-000000000010', 'af000001-0015-4000-a000-000000000015', 'FA-NAV-002', 'GPS Navigation Console V2 — SB-02','Marine Equipment','NAV-V2-SN-002','2023-09-01', 25000000, 18750000, 2500000, 'straight_line', 60,  6250000,  '2026-03-31', '2026-09-01', 'Speedboat SB-02', 'WH-SNR-02', 'Ketut Wirawan',   'good',      NULL,               NULL,         'Firmware update annually, calibration every 6 months',  '2026-03-01', '2026-09-01', NULL,                                                                'active'),
  -- Disposed asset
  ('f3000001-0011-4000-a000-000000000011', '00000000-0000-0000-0000-000000000010', NULL, 'FA-SB-003', 'Speedboat SB-03 — Wave Runner (OLD)',    'Vehicle',     'SB-03-2016-DPS',  '2016-02-01', 600000000,  0,          60000000,  'straight_line', 120, 540000000, '2026-02-28', '2019-02-01', 'Disposed',        NULL,         NULL,              'scrapped',  NULL,               NULL,         NULL,                                                    '2025-12-15', NULL,         'Decommissioned Dec 2025. Hull beyond economical repair. Scrapped.', 'disposed'),
  -- Furniture
  ('f3000001-0012-4000-a000-000000000012', '00000000-0000-0000-0000-000000000010', NULL, 'FA-FUR-001','Office Furniture Set — Head Office',     'Furniture',   NULL,               '2023-01-10', 35000000,  26250000,   3500000,   'straight_line', 96,  8750000,   '2026-03-31', NULL,         'Head Office',     'WH-JKT',    NULL,              'good',      NULL,               NULL,         'Annual deep cleaning',                                  '2026-01-15', '2027-01-15', '10 desks, 10 chairs, 2 meeting tables, 4 cabinets.',                'active')
ON CONFLICT (id) DO NOTHING;


-- ===============================================================================
-- ======  WAREHOUSE SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════════
-- WAREHOUSE MODULE — Seed Data
-- ═══════════════════════════════════════════════════════════

-- 3 Warehouses
INSERT INTO public.inv_warehouses (id, tenant_id, code, name, warehouse_type, address, city, country, total_capacity, used_capacity, manager, phone, status) VALUES
('a0000001-0000-0000-0000-000000000001', 'default', 'WH-DPS-01', 'Denpasar Main Warehouse', 'general', 'Jl. Gatot Subroto No. 88, Denpasar', 'Denpasar', 'Indonesia', 5000, 3200, 'Ketut Wirawan', '+62 361 555 001', 'active'),
('a0000001-0000-0000-0000-000000000002', 'default', 'WH-SBY-01', 'Surabaya Distribution Center', 'general', 'Jl. Rungkut Industri No. 12, Surabaya', 'Surabaya', 'Indonesia', 8000, 4500, 'Budi Santoso', '+62 31 555 002', 'active'),
('a0000001-0000-0000-0000-000000000003', 'default', 'WH-DPS-02', 'Denpasar Cold Storage', 'cold', 'Jl. Imam Bonjol No. 45, Denpasar', 'Denpasar', 'Indonesia', 2000, 800, 'Made Suardana', '+62 361 555 003', 'active')
ON CONFLICT (id) DO NOTHING;

-- 8 Zones (spread across warehouses)
INSERT INTO public.inv_zones (id, warehouse_id, code, name, zone_type, description, capacity, sort_order, status) VALUES
-- WH-DPS-01 zones
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'RCV-A', 'Receiving Area A', 'receiving', 'Inbound goods receiving and inspection', 500, 1, 'active'),
('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'BLK-A', 'Bulk Storage A', 'storage', 'High-density pallet storage', 2000, 2, 'active'),
('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'PCK-A', 'Packing Zone', 'packing', 'Order packing and labaling area', 300, 3, 'active'),
('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'SHP-A', 'Shipping Dock', 'shipping', 'Outbound loading docks', 400, 4, 'active'),
-- WH-SBY-01 zones
('b0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 'RCV-B', 'Receiving Bay', 'receiving', 'Surabaya inbound receiving', 800, 1, 'active'),
('b0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000002', 'BLK-B', 'Bulk Storage B', 'storage', 'Main storage area', 4000, 2, 'active'),
-- WH-DPS-02 zones (cold)
('b0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000003', 'CLD-A', 'Cold Room A', 'cold', 'Temperature-controlled storage 2-8°C', 1000, 1, 'active'),
('b0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000003', 'FRZ-A', 'Freezer Room', 'cold', 'Deep freeze storage -18°C', 500, 2, 'active')
ON CONFLICT (id) DO NOTHING;

-- 16 Bins
INSERT INTO public.inv_bins (id, zone_id, code, aisle, rack, level, position, bin_type, max_weight, status, sort_order) VALUES
-- Receiving Area A bins
('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'RCV-A-01', 'A', '01', '1', 'L', 'floor', 2000, 'available', 1),
('c0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'RCV-A-02', 'A', '01', '1', 'R', 'floor', 2000, 'available', 2),
-- Bulk Storage A bins
('c0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000002', 'BLK-A-01-1L', 'A', '01', '1', 'L', 'pallet', 1500, 'occupied', 1),
('c0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000002', 'BLK-A-01-2L', 'A', '01', '2', 'L', 'pallet', 1500, 'occupied', 2),
('c0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000002', 'BLK-A-01-3L', 'A', '01', '3', 'L', 'shelf', 500, 'available', 3),
('c0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000002', 'BLK-A-02-1L', 'A', '02', '1', 'L', 'pallet', 1500, 'reserved', 4),
('c0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000002', 'BLK-A-02-2L', 'A', '02', '2', 'L', 'pallet', 1500, 'available', 5),
('c0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000002', 'BLK-A-02-3L', 'A', '02', '3', 'L', 'shelf', 500, 'available', 6),
-- Packing Zone bins
('c0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000003', 'PCK-A-01', 'P', '01', '1', 'L', 'standard', 200, 'available', 1),
('c0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000003', 'PCK-A-02', 'P', '02', '1', 'L', 'standard', 200, 'occupied', 2),
-- Surabaya Receiving bins
('c0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000005', 'RCV-B-01', 'B', '01', '1', 'L', 'floor', 3000, 'available', 1),
('c0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000005', 'RCV-B-02', 'B', '01', '1', 'R', 'floor', 3000, 'available', 2),
-- Surabaya Bulk bins
('c0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000006', 'BLK-B-01-1L', 'B', '01', '1', 'L', 'pallet', 2000, 'occupied', 1),
('c0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000006', 'BLK-B-01-2L', 'B', '01', '2', 'L', 'pallet', 2000, 'available', 2),
-- Cold Room bins
('c0000001-0000-0000-0000-000000000015', 'b0000001-0000-0000-0000-000000000007', 'CLD-A-01', 'C', '01', '1', 'L', 'cold', 500, 'occupied', 1),
('c0000001-0000-0000-0000-000000000016', 'b0000001-0000-0000-0000-000000000008', 'FRZ-A-01', 'F', '01', '1', 'L', 'cold', 300, 'available', 1)
ON CONFLICT (id) DO NOTHING;

-- 3 Transfers
INSERT INTO public.inv_stock_transfers (id, tenant_id, transfer_number, from_warehouse_id, to_warehouse_id, item_name, quantity, uom, reason, requested_by, status) VALUES
('d0000001-0000-0000-0000-000000000001', 'default', 'TRF-2026-001', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'Marine Paint - Anti Fouling Red', 50, 'pcs', 'Restock Surabaya warehouse', 'Ketut Wirawan', 'completed'),
('d0000001-0000-0000-0000-000000000002', 'default', 'TRF-2026-002', 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Stainless Steel Bolts M12', 200, 'pcs', 'Urgent order fulfillment Denpasar', 'Budi Santoso', 'approved'),
('d0000001-0000-0000-0000-000000000003', 'default', 'TRF-2026-003', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'Temperature-Sensitive Sealant', 30, 'pcs', 'Move to cold storage', 'Made Suardana', 'pending')
ON CONFLICT (id) DO NOTHING;


-- ===============================================================================
-- ======  PROCUREMENT SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════════
-- PROCUREMENT SEED DATA
-- Suppliers, Requisitions, Purchase Orders, Goods Received
-- ═══════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  0. ADDITIONAL SUPPLIERS                                 ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_suppliers (id, tenant_id, code, name, contact_person, email, phone, address, city, country, tax_id, payment_terms, currency, rating, lead_time_days, tags, status) VALUES
  ('ae000001-0010-4000-a000-000000000010', '00000000-0000-0000-0000-000000000010', 'SUP-FUEL', 'CV Samudera Fuel Supply',       'Agus Setiawan',    'agus@samuderafuel.co.id',    '+62-361-555-0303', 'Jl. Benoa Harbor No. 8',          'Denpasar',  'Indonesia', '03.456.789.0-123.000', 'COD',    'IDR', 4.2, 1,  '["fuel","diesel","marine"]',                'active'),
  ('ae000001-0011-4000-a000-000000000011', '00000000-0000-0000-0000-000000000010', 'SUP-ACR', 'PT Anchor Chain & Rope',         'Wawan Hermawan',   'wawan@anchorchain.co.id',    '+62-21-555-0808',  'Jl. Tanjung Priok No. 33',        'Jakarta',   'Indonesia', '08.901.234.5-678.000', 'Net 30', 'IDR', 3.9, 7,  '["anchor","chain","rope","mooring"]',       'active'),
  ('ae000001-0012-4000-a000-000000000012', '00000000-0000-0000-0000-000000000010', 'SUP-EMS', 'PT Electrical Marine Systems',   'Irfan Hakim',      'irfan@elecmarine.co.id',     '+62-31-555-1010',  'Jl. Industri Timur No. 55',       'Surabaya',  'Indonesia', '10.012.345.6-789.000', 'Net 30', 'IDR', 4.1, 10, '["electrical","wiring","battery","solar"]', 'active')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. PURCHASE REQUISITIONS (10 records)                   ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_purchase_requisitions (id, tenant_id, pr_number, title, description, requested_by, department, priority, required_date, total_estimated, currency, status, approved_by, approved_at, rejection_reason, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'PR-2026-001', 'Monthly Engine Spare Parts',              'Routine monthly order for engine maintenance spare parts — oil filters, impeller kits, gaskets',               'Kadek Ayu',        'Operations',       'normal', '2026-04-10', 45000000,  'IDR', 'approved',         'I Made Suardana', '2026-03-03 09:00:00+07', NULL,                              '2026-03-01'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'PR-2026-002', 'Safety Equipment Replenishment',          'Replace expired life jackets (20 units) and fire extinguishers (10 units) per maritime safety audit',          'Wayan Darma',      'Safety',           'high',   '2026-04-05', 28000000,  'IDR', 'approved',         'I Made Suardana', '2026-03-07 10:30:00+07', NULL,                              '2026-03-05'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'PR-2026-003', 'Navigation System Upgrade',               'Upgrade GPS and radar units for 5 speedboats. Current units are 4+ years old.',                               'Bagus Mahendra',   'Fleet Management', 'normal', '2026-04-20', 125000000, 'IDR', 'pending_approval', NULL,              NULL,                     NULL,                              '2026-03-10'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'PR-2026-004', 'Hull Maintenance Materials',              'Fiberglass repair kits, polyester resin, and antifouling paint for scheduled dry-dock Q2',                     'Nyoman Astra',     'Maintenance',      'low',    '2026-05-01', 35000000,  'IDR', 'draft',            NULL,              NULL,                     NULL,                              '2026-03-15'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'PR-2026-005', 'Fuel Stock — April',                      'Monthly diesel fuel procurement for fleet operations. 450L for 12 boats.',                                    'Kadek Ayu',        'Operations',       'urgent', '2026-04-01', 180000000, 'IDR', 'approved',         'I Made Suardana', '2026-03-22 08:00:00+07', NULL,                              '2026-03-20'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'PR-2026-006', 'IT Equipment — Office Refresh',           'Replace 5 aging laptops and 3 monitors for office staff.',                                                    'Agus Prasetyo',    'IT',               'normal', '2026-04-25', 95000000,  'IDR', 'approved',         'I Made Suardana', '2026-03-28 14:00:00+07', NULL,                              '2026-03-25'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'PR-2026-007', 'Seat Cushion Replacement — 8 Boats',      'Replace worn seat cushions and upholstery on 8 passenger boats.',                                             'Wayan Darma',      'Maintenance',      'normal', '2026-05-10', 48000000,  'IDR', 'approved',         'I Made Suardana', '2026-04-01 10:00:00+07', NULL,                              '2026-03-28'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'PR-2026-008', 'Mooring & Anchoring Equipment',           'New anchor chains (3 sets), ropes, and fenders for dock upgrades at Sanur pier',                               'Ketut Wirawan',    'Operations',       'high',   '2026-04-15', 22000000,  'IDR', 'pending_approval', NULL,              NULL,                     NULL,                              '2026-04-02'),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'PR-2026-009', 'Electrical System Overhaul',              'Replace corroded wiring and upgrade battery bank for 3 oldest boats',                                         'Nyoman Astra',     'Maintenance',      'high',   '2026-04-30', 38000000,  'IDR', 'rejected',         'I Made Suardana', '2026-04-05 16:00:00+07', 'Budget exceeded Q2 allocation. Resubmit after May review.', '2026-04-03'),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'PR-2026-010', 'Snorkeling Equipment — Tour Fleet',       'Replenish snorkeling sets for tour operations. 30 sets. Cressi brand preferred.',                              'Komang Sudiarta',  'Tour Operations',  'normal', '2026-05-15', 15000000,  'IDR', 'approved',         'I Made Suardana', '2026-04-08 09:30:00+07', NULL,                              '2026-04-05')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. PR LINE ITEMS                                        ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_pr_lines (pr_id, item_id, item_name, description, quantity, uom, estimated_unit_price, estimated_total, preferred_supplier_id, sort_order) VALUES
  -- PR-001: Engine Spare Parts
  ('20000000-0000-0000-0000-000000000001', 'af000001-0001-4000-a000-000000000001', 'Yamaha Outboard Oil Filter', 'OEM oil filters for 150HP/200HP',         24, 'pcs',  250000,  6000000,  'ae000001-0001-4000-a000-000000000001', 0),
  ('20000000-0000-0000-0000-000000000001', 'af000001-0004-4000-a000-000000000004', 'Impeller Kit Yamaha 150HP',  'Complete impeller replacement kit',         6, 'sets', 3500000, 21000000, 'ae000001-0001-4000-a000-000000000001', 1),
  ('20000000-0000-0000-0000-000000000001', NULL,                                   'Spark Plug NGK BPR6ES',      'Standard marine spark plugs',              48, 'pcs',  85000,   4080000,  'ae000001-0001-4000-a000-000000000001', 2),
  ('20000000-0000-0000-0000-000000000001', NULL,                                   'Engine Gasket Set Yamaha',    'Complete gasket set for 150HP',             6, 'sets', 1250000, 7500000,  'ae000001-0001-4000-a000-000000000001', 3),
  -- PR-002: Safety Equipment
  ('20000000-0000-0000-0000-000000000002', 'af000001-0002-4000-a000-000000000002', 'Marine Life Jacket Type III', 'SOLAS-approved, adult size',              20, 'pcs',  650000,  13000000, 'ae000001-0006-4000-a000-000000000006', 0),
  ('20000000-0000-0000-0000-000000000002', 'af000001-0005-4000-a000-000000000005', 'Fire Extinguisher 3kg',       'ABC dry chemical, marine-rated',          10, 'pcs',  450000,  4500000,  'ae000001-0006-4000-a000-000000000006', 1),
  ('20000000-0000-0000-0000-000000000002', NULL,                                   'First Aid Kit Marine',        'Waterproof first aid kit',                12, 'pcs',  350000,  4200000,  'ae000001-0006-4000-a000-000000000006', 2),
  ('20000000-0000-0000-0000-000000000002', NULL,                                   'Emergency Flare Kit',         'Red hand flares + smoke signals',          6, 'sets', 1200000, 7200000,  'ae000001-0006-4000-a000-000000000006', 3),
  -- PR-005: Fuel
  ('20000000-0000-0000-0000-000000000005', 'af000001-0003-4000-a000-000000000003', 'Diesel Fuel (Solar)',          'Marine diesel fuel',                    450, 'L',    400000,  180000000, 'ae000001-0010-4000-a000-000000000010', 0),
  -- PR-006: IT Equipment
  ('20000000-0000-0000-0000-000000000006', '34000000-0000-0000-0000-000000000001', 'Dell Latitude 5550 Laptop',   'i7, 16GB, 512GB, Win 11 Pro',             5, 'pcs',  15000000, 75000000, '32000000-0000-0000-0000-000000000001', 0),
  ('20000000-0000-0000-0000-000000000006', '34000000-0000-0000-0000-000000000002', 'Dell 27" Monitor P2723QE',    '4K USB-C hub monitor',                    3, 'pcs',  6500000,  19500000, '32000000-0000-0000-0000-000000000001', 1),
  -- PR-007: Seat Cushions
  ('20000000-0000-0000-0000-000000000007', NULL,                                   'Marine Seat Cushion Set',     'UV-resistant, per boat',                   8, 'sets', 6000000,  48000000, 'ae000001-0005-4000-a000-000000000005', 0),
  -- PR-010: Snorkeling
  ('20000000-0000-0000-0000-000000000010', 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',   'Mask + snorkel + fins',                  30, 'sets', 500000,   15000000, 'ae000001-0004-4000-a000-000000000004', 0);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. PURCHASE ORDERS (10 records)                         ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_purchase_orders (id, tenant_id, po_number, pr_id, supplier_id, title, shipping_address, payment_terms, expected_delivery, subtotal, tax_amount, discount_amount, total_amount, currency, notes, status, sent_at, confirmed_at, created_at) VALUES
  ('21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'PO-2026-001', '20000000-0000-0000-0000-000000000001', 'ae000001-0001-4000-a000-000000000001', 'Engine Spare Parts — Yamaha Q2',        'Jl. Pelabuhan Sanur No. 1, Denpasar',       'Net 30',  '2026-04-10', 38580000,  4243800,  0,       42823800,  'IDR', 'Urgent — required before Lebaran holiday rush',                        'confirmed',        '2026-03-03 10:00:00+07', '2026-03-05 14:00:00+07', '2026-03-03'),
  ('21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'PO-2026-002', '20000000-0000-0000-0000-000000000002', 'ae000001-0006-4000-a000-000000000006', 'Safety Equipment — April Audit',        'Jl. Pelabuhan Sanur No. 1, Denpasar',       'Net 30',  '2026-04-05', 28900000,  3179000,  0,       32079000,  'IDR', 'SOLAS-compliant equipment only',                                       'sent',             '2026-03-08 09:00:00+07', NULL,                     '2026-03-07'),
  ('21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'PO-2026-003', '20000000-0000-0000-0000-000000000005', 'ae000001-0010-4000-a000-000000000010', 'Diesel Fuel — April Supply',            'Dermaga BBM Benoa Harbor, Denpasar',        'COD',     '2026-04-01', 180000000, 0,        0,       180000000, 'IDR', 'Delivery in 2 batches: Apr 1 + Apr 15',                                'received',         '2026-03-22 11:00:00+07', '2026-03-23 08:00:00+07', '2026-03-22'),
  ('21000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'PO-2026-004', NULL,                                   'ae000001-0003-4000-a000-000000000003', 'Propeller & Impeller Spares',           'Jl. Pelabuhan Sanur No. 1, Denpasar',       'Net 30',  '2026-04-15', 18000000,  1980000,  0,       19980000,  'IDR', NULL,                                                                   'draft',            NULL,                     NULL,                     '2026-03-24'),
  ('21000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'PO-2026-005', '20000000-0000-0000-0000-000000000007', 'ae000001-0005-4000-a000-000000000005', 'Seat Cushion Replacement × 8 Boats',    'Jl. Pelabuhan Sanur No. 1, Denpasar',       'Net 15',  '2026-05-08', 48000000,  5280000,  2400000, 50880000,  'IDR', '5% discount for bulk. Color: Navy Blue.',                              'confirmed',        '2026-04-02 10:00:00+07', '2026-04-04 11:00:00+07', '2026-04-01'),
  ('21000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'PO-2026-006', '20000000-0000-0000-0000-000000000006', '32000000-0000-0000-0000-000000000001', 'Dell Laptops & Monitors — IT Refresh',  'Jl. Raya Bypass No. 45, Denpasar',          'Net 60',  '2026-04-25', 94500000,  10395000, 0,       104895000, 'IDR', 'Include 3-year ProSupport warranty',                                   'sent',             '2026-03-29 09:00:00+07', NULL,                     '2026-03-28'),
  ('21000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'PO-2026-007', '20000000-0000-0000-0000-000000000010', 'ae000001-0004-4000-a000-000000000004', 'Cressi Snorkeling Sets — Tour Fleet',   'Jl. Pelabuhan Sanur No. 1, Denpasar',       'Net 30',  '2026-05-10', 15000000,  1650000,  750000,  15900000,  'IDR', '5% discount for 30+ units',                                            'confirmed',        '2026-04-09 10:00:00+07', '2026-04-10 14:00:00+07', '2026-04-08'),
  ('21000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'PO-2026-008', NULL,                                   'ae000001-0001-4000-a000-000000000001', 'Antifouling Paint & Supplies',          'Dry Dock Benoa, Denpasar',                  'Net 30',  '2026-04-20', 12500000,  1375000,  0,       13875000,  'IDR', 'For scheduled dry dock maintenance in May',                            'sent',             '2026-04-05 09:00:00+07', NULL,                     '2026-04-04'),
  ('21000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'PO-2026-009', NULL,                                   '32000000-0000-0000-0000-000000000003', 'Network Switch & UPS — Office',         'Jl. Raya Bypass No. 45, Denpasar',          'Net 30',  '2026-04-28', 35000000,  3850000,  0,       38850000,  'IDR', 'Cisco switch + APC UPS for server room',                               'draft',            NULL,                     NULL,                     '2026-04-10'),
  ('21000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'PO-2026-010', NULL,                                   'ae000001-0001-4000-a000-000000000001', 'Emergency Engine Parts — SB-07',        'Jl. Pelabuhan Sanur No. 1, Denpasar',       'COD',     '2026-04-12', 8500000,   935000,   0,       9435000,   'IDR', 'URGENT: Boat SB-07 engine failure',                                    'partial_received', '2026-04-11 07:00:00+07', '2026-04-11 09:00:00+07', '2026-04-11')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. PO LINE ITEMS                                        ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_po_lines (id, po_id, item_id, item_name, description, quantity, received_qty, uom, unit_price, discount_percent, tax_percent, line_total, sort_order) VALUES
  -- PO-001: Engine Spares
  ('22000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'af000001-0001-4000-a000-000000000001', 'Yamaha Outboard Oil Filter', 'OEM oil filters',            24, 24, 'pcs',  250000,  0, 11, 6000000,   0),
  ('22000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', 'af000001-0004-4000-a000-000000000004', 'Impeller Kit Yamaha 150HP',  'Complete impeller kit',        6,  6, 'sets', 3500000, 0, 11, 21000000,  1),
  ('22000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', NULL,                                   'Spark Plug NGK BPR6ES',      'Marine spark plugs',         48, 48, 'pcs',  85000,   0, 11, 4080000,   2),
  ('22000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001', NULL,                                   'Engine Gasket Set Yamaha',    'Gasket set 150HP',            6,  6, 'sets', 1250000, 0, 11, 7500000,   3),
  -- PO-002: Safety Equipment
  ('22000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000002', 'af000001-0002-4000-a000-000000000002', 'Marine Life Jacket Type III', 'SOLAS-approved, adult',      20,  0, 'pcs',  650000,  0, 11, 13000000,  0),
  ('22000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000002', 'af000001-0005-4000-a000-000000000005', 'Fire Extinguisher 3kg',       'ABC dry chemical',           10,  0, 'pcs',  450000,  0, 11, 4500000,   1),
  ('22000000-0000-0000-0000-000000000007', '21000000-0000-0000-0000-000000000002', NULL,                                   'First Aid Kit Marine',        'Waterproof marine kit',      12,  0, 'pcs',  350000,  0, 11, 4200000,   2),
  ('22000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-000000000002', NULL,                                   'Emergency Flare Kit',         'Flares + smoke signals',      6,  0, 'sets', 1200000, 0, 11, 7200000,   3),
  -- PO-003: Diesel Fuel
  ('22000000-0000-0000-0000-000000000009', '21000000-0000-0000-0000-000000000003', 'af000001-0003-4000-a000-000000000003', 'Diesel Fuel (Solar)',          'Marine diesel',            450, 450, 'L', 400000,  0, 0, 180000000, 0),
  -- PO-005: Seat Cushions
  ('22000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000005', NULL,                                   'Marine Seat Cushion Set',     'UV-resistant, navy blue',    8,  3, 'sets', 6000000, 5, 11, 45600000,  0),
  -- PO-006: IT Equipment
  ('22000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000006', '34000000-0000-0000-0000-000000000001', 'Dell Latitude 5550 Laptop',   'i7/16GB/512GB/Win11',        5,  0, 'pcs',  15000000, 0, 11, 75000000,  0),
  ('22000000-0000-0000-0000-000000000012', '21000000-0000-0000-0000-000000000006', '34000000-0000-0000-0000-000000000002', 'Dell 27" Monitor P2723QE',    '4K USB-C hub',               3,  0, 'pcs',  6500000,  0, 11, 19500000,  1),
  -- PO-007: Snorkeling Sets
  ('22000000-0000-0000-0000-000000000013', '21000000-0000-0000-0000-000000000007', 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',   'Mask+snorkel+fins',         30,  0, 'sets', 500000,  5, 11, 14250000,  0),
  -- PO-008: Antifouling Paint
  ('22000000-0000-0000-0000-000000000014', '21000000-0000-0000-0000-000000000008', 'af000001-0006-4000-a000-000000000006', 'Antifouling Paint 5L',        'International brand',        5,  0, 'pcs',  1500000, 0, 11, 7500000,   0),
  ('22000000-0000-0000-0000-000000000015', '21000000-0000-0000-0000-000000000008', 'af000001-0007-4000-a000-000000000007', 'Fiberglass Cloth Roll',       'Woven roving 600g/m²',       3,  0, 'rolls', 850000, 0, 11, 2550000,   1),
  ('22000000-0000-0000-0000-000000000016', '21000000-0000-0000-0000-000000000008', 'af000001-0008-4000-a000-000000000008', 'Polyester Resin 20L',         'Marine-grade polyester',     2,  0, 'pcs',  1225000, 0, 11, 2450000,   2),
  -- PO-009: Network Equipment
  ('22000000-0000-0000-0000-000000000017', '21000000-0000-0000-0000-000000000009', '34000000-0000-0000-0000-000000000003', 'Cisco Catalyst 9200 Switch',  '24-port PoE+ managed',       2,  0, 'pcs', 12000000, 0, 11, 24000000,  0),
  ('22000000-0000-0000-0000-000000000018', '21000000-0000-0000-0000-000000000009', '34000000-0000-0000-0000-000000000005', 'APC Smart-UPS 3000VA',        'Rack-mount UPS',             1,  0, 'pcs', 11000000, 0, 11, 11000000,  1),
  -- PO-010: Emergency Engine Parts
  ('22000000-0000-0000-0000-000000000019', '21000000-0000-0000-0000-000000000010', NULL,                                   'Water Pump Assembly Yamaha',  'For 200HP outboard',         1,  1, 'pcs',  5500000, 0, 11, 5500000,   0),
  ('22000000-0000-0000-0000-000000000020', '21000000-0000-0000-0000-000000000010', NULL,                                   'Thermostat Assembly Yamaha',  'Thermostat + housing',       1,  0, 'pcs',  3000000, 0, 11, 3000000,   1)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. GOODS RECEIVED NOTES (8 records)                     ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_goods_received_notes (id, tenant_id, grn_number, po_id, supplier_id, received_by, received_date, warehouse_id, delivery_note_number, invoice_number, quality_check, notes, status, accepted_at, created_at) VALUES
  ('23000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'GRN-2026-001', '21000000-0000-0000-0000-000000000001', 'ae000001-0001-4000-a000-000000000001', 'Ketut Wirawan',   '2026-04-08', 'default', 'DN-YMH-20260408', 'INV-YMH-2026-0312', 'passed',  'All items received in good condition.',                                    'accepted',   '2026-04-08 15:00:00+07', '2026-04-08'),
  ('23000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'GRN-2026-002', '21000000-0000-0000-0000-000000000003', 'ae000001-0010-4000-a000-000000000010', 'Kadek Ayu',       '2026-04-01', 'default', 'DN-SMF-20260401', NULL,                'passed',  'Batch 1: 225L received at Benoa dock. COD paid.',                         'accepted',   '2026-04-01 10:00:00+07', '2026-04-01'),
  ('23000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'GRN-2026-003', '21000000-0000-0000-0000-000000000003', 'ae000001-0010-4000-a000-000000000010', 'Kadek Ayu',       '2026-04-15', 'default', 'DN-SMF-20260415', NULL,                'passed',  'Batch 2: 225L received. April fuel stock complete.',                      'accepted',   '2026-04-15 09:30:00+07', '2026-04-15'),
  ('23000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'GRN-2026-004', '21000000-0000-0000-0000-000000000005', 'ae000001-0005-4000-a000-000000000005', 'Wayan Darma',     '2026-04-20', 'default', 'DN-BLC-20260420', 'INV-BME-2026-0089', 'partial', '3 of 8 sets delivered. 5 remaining expected May 1.',                      'inspecting', NULL,                     '2026-04-20'),
  ('23000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'GRN-2026-005', '21000000-0000-0000-0000-000000000010', 'ae000001-0001-4000-a000-000000000001', 'Ketut Wirawan',   '2026-04-11', 'default', 'DN-YMH-20260411', 'INV-YMH-2026-0315', 'passed',  'Emergency part received same day. Installed on SB-07.',                   'accepted',   '2026-04-11 14:00:00+07', '2026-04-11'),
  ('23000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'GRN-2026-006', '21000000-0000-0000-0000-000000000002', 'ae000001-0006-4000-a000-000000000006', 'Wayan Darma',     '2026-04-12', 'default', 'DN-SSE-20260412', 'INV-SSE-2026-0045', 'partial', '15 of 20 life jackets received. 5 on backorder.',                        'inspecting', NULL,                     '2026-04-12'),
  ('23000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'GRN-2026-007', '21000000-0000-0000-0000-000000000007', 'ae000001-0004-4000-a000-000000000004', 'Komang Sudiarta', '2026-05-05', 'default', 'DN-CRS-20260505', 'INV-CRS-2026-0201', 'passed',  'All 30 snorkeling sets received. Quality check passed.',                  'accepted',   '2026-05-05 11:00:00+07', '2026-05-05'),
  ('23000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'GRN-2026-008', '21000000-0000-0000-0000-000000000008', 'ae000001-0001-4000-a000-000000000001', 'Nyoman Astra',    '2026-04-18', 'default', 'DN-YMH-20260418', 'INV-YMH-2026-0320', 'failed',  '2 of 5 paint cans damaged in shipping. Requesting replacement.',          'rejected',   NULL,                     '2026-04-18')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. GRN LINE ITEMS                                       ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO inv_grn_lines (grn_id, po_line_id, item_id, item_name, ordered_qty, received_qty, accepted_qty, rejected_qty, uom, unit_cost, batch_number, quality_status, rejection_reason, sort_order) VALUES
  -- GRN-001: Engine Spares (full)
  ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'af000001-0001-4000-a000-000000000001', 'Yamaha Outboard Oil Filter', 24, 24, 24, 0, 'pcs',  250000,  'YMH-OF-2026Q2', 'passed', NULL, 0),
  ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'af000001-0004-4000-a000-000000000004', 'Impeller Kit Yamaha 150HP',  6,  6,  6,  0, 'sets', 3500000, 'YMH-IK-2026Q2', 'passed', NULL, 1),
  ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000003', NULL,                                   'Spark Plug NGK BPR6ES',     48, 48, 48, 0, 'pcs',  85000,   'NGK-SP-2026Q2', 'passed', NULL, 2),
  ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000004', NULL,                                   'Engine Gasket Set Yamaha',   6,  6,  6,  0, 'sets', 1250000, 'YMH-GS-2026Q2', 'passed', NULL, 3),
  -- GRN-002: Fuel batch 1
  ('23000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000009', 'af000001-0003-4000-a000-000000000003', 'Diesel Fuel (Solar)', 450, 225, 225, 0, 'L', 400000, 'FUEL-APR-B1', 'passed', NULL, 0),
  -- GRN-003: Fuel batch 2
  ('23000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000009', 'af000001-0003-4000-a000-000000000003', 'Diesel Fuel (Solar)', 450, 225, 225, 0, 'L', 400000, 'FUEL-APR-B2', 'passed', NULL, 0),
  -- GRN-004: Seat Cushions (partial)
  ('23000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000010', NULL, 'Marine Seat Cushion Set', 8, 3, 3, 0, 'sets', 5700000, 'BME-SC-2026-1', 'passed', NULL, 0),
  -- GRN-005: Emergency water pump
  ('23000000-0000-0000-0000-000000000005', '22000000-0000-0000-0000-000000000019', NULL, 'Water Pump Assembly Yamaha', 1, 1, 1, 0, 'pcs', 5500000, 'YMH-WP-EMG', 'passed', NULL, 0),
  -- GRN-006: Safety Equipment (partial)
  ('23000000-0000-0000-0000-000000000006', '22000000-0000-0000-0000-000000000005', 'af000001-0002-4000-a000-000000000002', 'Marine Life Jacket Type III', 20, 15, 15, 0, 'pcs',  650000,  'SSE-LJ-2026-1', 'passed', NULL, 0),
  ('23000000-0000-0000-0000-000000000006', '22000000-0000-0000-0000-000000000006', 'af000001-0005-4000-a000-000000000005', 'Fire Extinguisher 3kg',       10, 10, 10, 0, 'pcs',  450000,  'SSE-FE-2026-1', 'passed', NULL, 1),
  ('23000000-0000-0000-0000-000000000006', '22000000-0000-0000-0000-000000000007', NULL,                                   'First Aid Kit Marine',        12, 12, 12, 0, 'pcs',  350000,  'SSE-FK-2026-1', 'passed', NULL, 2),
  ('23000000-0000-0000-0000-000000000006', '22000000-0000-0000-0000-000000000008', NULL,                                   'Emergency Flare Kit',          6,  6,  6, 0, 'sets', 1200000, 'SSE-EF-2026-1', 'passed', NULL, 3),
  -- GRN-007: Snorkeling Sets (full)
  ('23000000-0000-0000-0000-000000000007', '22000000-0000-0000-0000-000000000013', 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro', 30, 30, 30, 0, 'sets', 475000, 'CRS-SNK-2026', 'passed', NULL, 0),
  -- GRN-008: Paint (2 damaged)
  ('23000000-0000-0000-0000-000000000008', '22000000-0000-0000-0000-000000000014', 'af000001-0006-4000-a000-000000000006', 'Antifouling Paint 5L',    5, 5, 3, 2, 'pcs',   1500000, 'YMH-AP-2026', 'partial', '2 cans dented in transit. Paint leaked.',                  0),
  ('23000000-0000-0000-0000-000000000008', '22000000-0000-0000-0000-000000000015', 'af000001-0007-4000-a000-000000000007', 'Fiberglass Cloth Roll',   3, 3, 3, 0, 'rolls',  850000, 'YMH-FG-2026', 'passed',  NULL,                                                       1),
  ('23000000-0000-0000-0000-000000000008', '22000000-0000-0000-0000-000000000016', 'af000001-0008-4000-a000-000000000008', 'Polyester Resin 20L',     2, 2, 2, 0, 'pcs',   1225000, 'YMH-PR-2026', 'passed',  NULL,                                                       2);


-- ===============================================================================
-- ======  STOCK OPNAME SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════
-- Stock Opname — Seed Data
-- ═══════════════════════════════════════════════════════

-- Sessions
INSERT INTO inv_opname_sessions (tenant_id, session_code, title, warehouse_id, warehouse_name, counted_by, reviewed_by, scheduled_date, started_at, completed_at, total_items, items_counted, total_variance_qty, total_variance_value, notes, status)
SELECT 'default', v.session_code, v.title, w.id, w.name,
       v.counted_by, v.reviewed_by, v.scheduled_date::date,
       CASE WHEN v.started_at IS NOT NULL THEN v.started_at::timestamptz ELSE NULL END,
       CASE WHEN v.completed_at IS NOT NULL THEN v.completed_at::timestamptz ELSE NULL END,
       v.total_items, v.items_counted, v.total_variance_qty, v.total_variance_value, v.notes, v.status
FROM (VALUES
    ('OPN-2026-001', 'Q1 Full Warehouse Audit — Denpasar', 'WH-DPS-01', 'Ketut Wirawan', 'Made Suardana', '2026-01-15', '2026-01-15T08:00:00+08:00', '2026-01-17T16:30:00+08:00', 5, 5, -3, -540000, 'Quarterly audit completed', 'completed'),
    ('OPN-2026-002', 'March Spot Check — Surabaya DC', 'WH-SBY-01', 'Budi Santoso', NULL, '2026-03-20', '2026-03-20T09:00:00+08:00', NULL, 4, 2, 0, 0, 'Spot check in progress', 'counting'),
    ('OPN-2026-003', 'Q2 Cold Storage Audit — Denpasar', 'WH-DPS-02', 'Made Suardana', NULL, '2026-04-01', NULL, NULL, 3, 0, 0, 0, 'Scheduled for April', 'draft')
) AS v(session_code, title, wh_code, counted_by, reviewed_by, scheduled_date, started_at, completed_at, total_items, items_counted, total_variance_qty, total_variance_value, notes, status)
JOIN inv_warehouses w ON w.code = v.wh_code
ON CONFLICT DO NOTHING;

-- Lines for Session 1 (Completed — all counted)
INSERT INTO inv_opname_lines (session_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
SELECT s.id, v.item_name, v.item_sku, v.zone_name, v.bin_code, v.uom, v.system_qty, v.actual_qty, v.unit_cost,
       v.counted_at::timestamptz, v.counted_by, v.notes, v.status, v.sort_order
FROM inv_opname_sessions s
CROSS JOIN (VALUES
    ('Marine Paint - Anti Fouling', 'CHM-PAF-001', 'Bulk Storage A', 'BLK-A-01-1L', 'ltr', 120, 118, 180000, '2026-01-15T10:15:00+08:00', 'Ketut Wirawan', '2 ltrs damaged in transit', 'counted', 1),
    ('Stainless Steel Bolts M12', 'FST-SSB-M12', 'Bulk Storage B', 'BLK-B-01-1L', 'pcs', 500, 498, 22000, '2026-01-15T11:00:00+08:00', 'Ketut Wirawan', '2 missing — possible mis-pick', 'discrepancy', 2),
    ('Engine Block Casting', 'ENG-BLK-200', 'Receiving Area A', 'RCV-A-01', 'pcs', 3, 3, 5000000, '2026-01-15T13:30:00+08:00', 'Ketut Wirawan', 'Count matches', 'verified', 3),
    ('Cylinder Liner Set', 'ENG-CYL-SET', 'Bulk Storage A', 'BLK-A-01-1L', 'pcs', 12, 11, 750000, '2026-01-16T09:00:00+08:00', 'Ketut Wirawan', '1 unit unaccounted', 'discrepancy', 4),
    ('Piston Assembly', 'ENG-PST-200', 'Bulk Storage A', 'BLK-A-01-1L', 'pcs', 8, 8, 450000, '2026-01-16T10:30:00+08:00', 'Ketut Wirawan', 'OK', 'verified', 5)
) AS v(item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
WHERE s.session_code = 'OPN-2026-001'
ON CONFLICT DO NOTHING;

-- Lines for Session 2 (Counting — 2 of 4 counted)
INSERT INTO inv_opname_lines (session_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
SELECT s.id, v.item_name, v.item_sku, v.zone_name, v.bin_code, v.uom, v.system_qty, v.actual_qty, v.unit_cost,
       CASE WHEN v.counted_at IS NOT NULL THEN v.counted_at::timestamptz ELSE NULL END,
       v.counted_by, v.notes, v.status, v.sort_order
FROM inv_opname_sessions s
CROSS JOIN (VALUES
    ('Steel Plate 10mm Marine Grade', 'STL-PLT-10M', 'Receiving Bay', 'RCV-B-01', 'sheet', 48, 48, 850000, '2026-03-20T10:00:00+08:00', 'Budi Santoso', 'Full count verified', 'counted', 1),
    ('Steel Frame Profile L80', 'STL-FRM-L80', 'Receiving Bay', 'RCV-B-01', 'pcs', 72, 70, 250000, '2026-03-20T11:30:00+08:00', 'Budi Santoso', '2 pcs short', 'counted', 2),
    ('Welding Wire ER70S-6', 'WLD-WIR-70S', 'Packing Zone', 'PCK-A-01', 'kg', 30, NULL, 120000, NULL, NULL, 'Pending count', 'pending', 3),
    ('Marine Primer Coat', 'CHM-PRM-001', 'Packing Zone', 'PCK-A-01', 'ltr', 40, NULL, 190000, NULL, NULL, 'Pending count', 'pending', 4)
) AS v(item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
WHERE s.session_code = 'OPN-2026-002'
ON CONFLICT DO NOTHING;

-- Lines for Session 3 (Draft — no counts yet)
INSERT INTO inv_opname_lines (session_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, notes, status, sort_order)
SELECT s.id, v.item_name, v.item_sku, v.zone_name, v.bin_code, v.uom, v.system_qty, v.actual_qty, v.unit_cost, v.notes, v.status, v.sort_order
FROM inv_opname_sessions s
CROSS JOIN (VALUES
    ('Temperature-Sensitive Sealant', 'CHM-TSS-001', 'Cold Room A', 'CLD-A-01', 'pcs', 60, NULL, 95000, 'For cold storage items', 'pending', 1),
    ('GPS Chartplotter Unit', 'NAV-GPS-12', 'Cold Room A', 'CLD-A-01', 'pcs', 4, NULL, 4500000, 'High value item', 'pending', 2),
    ('Marine VHF Radio', 'NAV-VHF-25W', 'Cold Room A', 'CLD-A-01', 'pcs', 6, NULL, 1800000, 'Verify serial numbers', 'pending', 3)
) AS v(item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, notes, status, sort_order)
WHERE s.session_code = 'OPN-2026-003'
ON CONFLICT DO NOTHING;


-- ===============================================================================
-- ======  MANUFACTURING SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════
-- Manufacturing Module — Seed Data
-- ═══════════════════════════════════════════════════════

-- BOMs
INSERT INTO mfg_boms (tenant_id, code, name, version, product_name, product_sku, description, uom, yield_qty, labor_hours, labor_cost, overhead_cost, total_material_cost, total_cost, status)
VALUES
    ('default', 'BOM-ENG-001', 'Marine Diesel Engine Assembly', '2.1', 'Marine Diesel Engine 200HP', 'ENG-200HP', 'Complete assembly BOM for 200HP marine diesel engine including all sub-components', 'unit', 1, 40, 2400000, 800000, 15000000, 18200000, 'active'),
    ('default', 'BOM-HULL-001', 'Steel Hull Section - Bow', '1.3', 'Bow Hull Section 12m', 'HULL-BOW-12', 'Fabrication BOM for 12-meter bow hull section with steel plating and frame', 'unit', 1, 120, 7200000, 2500000, 35000000, 44700000, 'active'),
    ('default', 'BOM-NAV-001', 'Navigation Console Assembly', '1.0', 'Nav Console Type-A', 'NAV-CON-A', 'Assembly BOM for bridge navigation console including instruments and wiring', 'unit', 1, 16, 960000, 400000, 8500000, 9860000, 'draft')
ON CONFLICT DO NOTHING;

-- BOM Lines for Marine Engine
INSERT INTO mfg_bom_lines (bom_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
SELECT b.id, v.item_name, v.item_sku, v.quantity, v.uom, v.unit_cost, v.total_cost, v.scrap_pct, v.sort_order
FROM mfg_boms b
CROSS JOIN (VALUES
    ('Engine Block Casting', 'ENG-BLK-200', 1, 'pcs', 5000000, 5000000, 2.0, 1),
    ('Cylinder Liner Set', 'ENG-CYL-SET', 4, 'pcs', 750000, 3000000, 1.5, 2),
    ('Piston Assembly', 'ENG-PST-200', 4, 'pcs', 450000, 1800000, 1.0, 3),
    ('Crankshaft Forging', 'ENG-CRK-200', 1, 'pcs', 3200000, 3200000, 0.5, 4),
    ('Marine Paint - Anti Fouling', 'CHM-PAF-001', 5, 'ltr', 180000, 900000, 5.0, 5),
    ('Stainless Steel Bolts M12', 'FST-SSB-M12', 48, 'pcs', 22000, 1056000, 3.0, 6)
) AS v(item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
WHERE b.code = 'BOM-ENG-001'
ON CONFLICT DO NOTHING;

-- BOM Lines for Hull Section
INSERT INTO mfg_bom_lines (bom_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
SELECT b.id, v.item_name, v.item_sku, v.quantity, v.uom, v.unit_cost, v.total_cost, v.scrap_pct, v.sort_order
FROM mfg_boms b
CROSS JOIN (VALUES
    ('Steel Plate 10mm Marine Grade', 'STL-PLT-10M', 24, 'sheet', 850000, 20400000, 5.0, 1),
    ('Steel Frame Profile L80', 'STL-FRM-L80', 36, 'pcs', 250000, 9000000, 3.0, 2),
    ('Welding Wire ER70S-6', 'WLD-WIR-70S', 15, 'kg', 120000, 1800000, 10.0, 3),
    ('Marine Primer Coat', 'CHM-PRM-001', 20, 'ltr', 190000, 3800000, 5.0, 4)
) AS v(item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
WHERE b.code = 'BOM-HULL-001'
ON CONFLICT DO NOTHING;

-- BOM Lines for Nav Console
INSERT INTO mfg_bom_lines (bom_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
SELECT b.id, v.item_name, v.item_sku, v.quantity, v.uom, v.unit_cost, v.total_cost, v.scrap_pct, v.sort_order
FROM mfg_boms b
CROSS JOIN (VALUES
    ('GPS Chartplotter Unit', 'NAV-GPS-12', 1, 'pcs', 4500000, 4500000, 0.0, 1),
    ('Marine VHF Radio', 'NAV-VHF-25W', 1, 'pcs', 1800000, 1800000, 0.0, 2),
    ('Console Housing Fiberglass', 'NAV-HSG-A', 1, 'pcs', 1200000, 1200000, 2.0, 3),
    ('Marine Cable Harness', 'ELC-CBL-NAV', 1, 'set', 650000, 650000, 1.0, 4),
    ('Toggle Switch Panel', 'ELC-SWT-8P', 1, 'pcs', 350000, 350000, 0.0, 5)
) AS v(item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
WHERE b.code = 'BOM-NAV-001'
ON CONFLICT DO NOTHING;

-- Work Orders
INSERT INTO mfg_work_orders (tenant_id, wo_number, bom_id, bom_name, warehouse_id, warehouse_name, planned_qty, completed_qty, uom, priority, assigned_to, planned_start, planned_end, actual_start, estimated_cost, actual_cost, notes, status)
SELECT 'default', v.wo_number, b.id, b.name, w.id, w.name,
       v.planned_qty, v.completed_qty, v.uom, v.priority, v.assigned_to,
       v.planned_start::date, v.planned_end::date,
       CASE WHEN v.actual_start IS NOT NULL THEN v.actual_start::timestamptz ELSE NULL END,
       v.estimated_cost, v.actual_cost, v.notes, v.status
FROM (VALUES
    ('WO-2026-001', 'BOM-ENG-001', 'WH-DPS-01', 2, 1, 'unit', 'high', 'Ketut Wirawan', '2026-03-01', '2026-03-20', '2026-03-02T08:00:00+08:00', 36400000, 18500000, 'Engine batch #1 — 1 of 2 completed', 'in_progress'),
    ('WO-2026-002', 'BOM-HULL-001', 'WH-SBY-01', 1, 0, 'unit', 'urgent', 'Budi Santoso', '2026-03-10', '2026-04-15', NULL, 44700000, 0, 'Hull section for vessel KM Nusantara', 'planned'),
    ('WO-2026-003', 'BOM-ENG-001', 'WH-DPS-01', 1, 1, 'unit', 'normal', 'Made Suardana', '2026-02-01', '2026-02-20', '2026-02-02T07:30:00+08:00', 18200000, 17800000, 'Engine for patrol boat PB-07', 'completed'),
    ('WO-2026-004', 'BOM-NAV-001', 'WH-DPS-01', 3, 0, 'unit', 'low', 'Ketut Wirawan', '2026-04-01', '2026-04-10', NULL, 29580000, 0, 'Nav consoles for fleet upgrade', 'draft')
) AS v(wo_number, bom_code, wh_code, planned_qty, completed_qty, uom, priority, assigned_to, planned_start, planned_end, actual_start, estimated_cost, actual_cost, notes, status)
JOIN mfg_boms b ON b.code = v.bom_code
JOIN inv_warehouses w ON w.code = v.wh_code
ON CONFLICT DO NOTHING;


-- ===============================================================================
-- ======  E-COMMERCE SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════════
-- E-COMMERCE MODULE — Seed Data
-- 8 customers, 10 orders, 18 order items, 1 store settings
-- ═══════════════════════════════════════════════════════════

-- ─── Store Settings ────────────────────────────────────────
INSERT INTO ecom_store_settings (tenant_id, store_name, store_email, store_phone, store_address, default_currency, tax_rate)
VALUES ('default', 'Nusantara Maritime Store', 'store@nusantarasoft.com', '+62-361-555-100', 'Jl. Raya Denpasar No. 88, Bali', 'IDR', 11.00);

-- ─── Customers ─────────────────────────────────────────────
INSERT INTO ecom_customers (tenant_id, customer_code, first_name, last_name, email, phone, company, address, city, province, postal_code, customer_type, total_orders, total_spent) VALUES
('default', 'CUST-001', 'Adi', 'Pratama', 'adi.pratama@email.com', '+62-812-1001', NULL, 'Jl. Sudirman No. 45', 'Jakarta', 'DKI Jakarta', '10220', 'individual', 3, 2850000),
('default', 'CUST-002', 'Sari', 'Dewi', 'sari.dewi@email.com', '+62-813-2002', NULL, 'Jl. Diponegoro No. 12', 'Surabaya', 'Jawa Timur', '60241', 'individual', 2, 1680000),
('default', 'CUST-003', 'Budi', 'Santoso', 'budi@ptmaritim.co.id', '+62-821-3003', 'PT Maritim Jaya', 'Jl. Pelabuhan Raya No. 8', 'Makassar', 'Sulawesi Selatan', '90112', 'company', 4, 12500000),
('default', 'CUST-004', 'Lina', 'Wijaya', 'lina.wijaya@email.com', '+62-857-4004', NULL, 'Jl. Gatot Subroto No. 22', 'Denpasar', 'Bali', '80234', 'individual', 1, 350000),
('default', 'CUST-005', 'Raka', 'Putra', 'raka@divepro.id', '+62-878-5005', 'DivePro Indonesia', 'Jl. Pantai Kuta No. 15', 'Badung', 'Bali', '80361', 'reseller', 5, 8750000),
('default', 'CUST-006', 'Mega', 'Sari', 'mega.sari@email.com', '+62-815-6006', NULL, 'Jl. Ahmad Yani No. 30', 'Bandung', 'Jawa Barat', '40111', 'individual', 2, 920000),
('default', 'CUST-007', 'Haris', 'Fadillah', 'haris@logistindo.com', '+62-822-7007', 'CV Logistindo', 'Jl. Industri No. 5', 'Semarang', 'Jawa Tengah', '50134', 'company', 3, 6200000),
('default', 'CUST-008', 'Putri', 'Anggraini', 'putri.a@email.com', '+62-838-8008', NULL, 'Jl. Teuku Umar No. 18', 'Medan', 'Sumatera Utara', '20112', 'individual', 1, 180000);

-- ─── Orders (referencing existing inv_items via order_items) ───
-- Order 1: Physical goods order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_province, shipping_method, shipping_cost, subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status, source, status, confirmed_at)
VALUES ('default', 'ORD-2026-001',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-001'),
    'Adi Pratama', 'adi.pratama@email.com', '+62-812-1001',
    'Jl. Sudirman No. 45', 'Jakarta', 'DKI Jakarta', 'JNE Regular', 25000,
    850000, 93500, 968500, 968500, 'bank_transfer', 'paid', 'web', 'delivered',
    now() - interval '5 days');

-- Order 2: Ticket booking order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, shipping_method, subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status, source, status, confirmed_at)
VALUES ('default', 'ORD-2026-002',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-002'),
    'Sari Dewi', 'sari.dewi@email.com', 'e-ticket', 
    360000, 39600, 399600, 399600, 'credit_card', 'paid', 'web', 'completed',
    now() - interval '3 days');

-- Order 3: Scheduled service (ship route) order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, shipping_method, subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status, source, status, confirmed_at)
VALUES ('default', 'ORD-2026-003',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-003'),
    'Budi Santoso', 'budi@ptmaritim.co.id', 'boarding-pass',
    1300000, 143000, 1443000, 1443000, 'bank_transfer', 'paid', 'admin', 'confirmed',
    now() - interval '1 day');

-- Order 4: Rental order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, shipping_method, subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status, source, status, confirmed_at)
VALUES ('default', 'ORD-2026-004',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-005'),
    'Raka Putra', 'raka@divepro.id', 'pickup',
    2500000, 275000, 2775000, 5000000, 'cash', 'paid', 'admin', 'processing',
    now() - interval '2 days');

-- Order 5: Mixed order (physical + ticket)
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, shipping_address, shipping_city, shipping_method, shipping_cost, subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status, source, status)
VALUES ('default', 'ORD-2026-005',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-001'),
    'Adi Pratama', 'adi.pratama@email.com',
    'Jl. Sudirman No. 45', 'Jakarta', 'JNE Regular', 25000,
    1200000, 132000, 1357000, 1357000, 'credit_card', 'paid', 'web', 'shipped');

-- Order 6: Pending order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, shipping_address, shipping_city, shipping_method, subtotal, tax_amount, total_amount, payment_method, payment_status, source, status)
VALUES ('default', 'ORD-2026-006',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-006'),
    'Mega Sari', 'mega.sari@email.com',
    'Jl. Ahmad Yani No. 30', 'Bandung', 'SiCepat', 
    450000, 49500, 499500, 'bank_transfer', 'unpaid', 'web', 'pending');

-- Order 7: Cancelled order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, subtotal, tax_amount, total_amount, payment_status, source, status, cancelled_at)
VALUES ('default', 'ORD-2026-007',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-004'),
    'Lina Wijaya', 'lina.wijaya@email.com',
    350000, 38500, 388500, 'unpaid', 'web', 'cancelled', now() - interval '4 days');

-- Order 8: Large company order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, shipping_address, shipping_city, shipping_method, shipping_cost, subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status, source, status, confirmed_at)
VALUES ('default', 'ORD-2026-008',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-007'),
    'Haris Fadillah', 'haris@logistindo.com',
    'Jl. Industri No. 5', 'Semarang', 'Pos Indonesia', 35000,
    3200000, 352000, 3587000, 3587000, 'bank_transfer', 'paid', 'api', 'processing',
    now() - interval '1 day');

-- Order 9: Refunded order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status, source, status)
VALUES ('default', 'ORD-2026-009',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-008'),
    'Putri Anggraini', 'putri.a@email.com',
    180000, 19800, 199800, 199800, 'credit_card', 'refunded', 'mobile', 'refunded');

-- Order 10: New pending order
INSERT INTO ecom_orders (tenant_id, order_number, customer_id, customer_name, customer_email, shipping_address, shipping_city, shipping_method, subtotal, tax_amount, total_amount, payment_method, payment_status, source, status)
VALUES ('default', 'ORD-2026-010',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-005'),
    'Raka Putra', 'raka@divepro.id',
    'Jl. Pantai Kuta No. 15', 'Badung', 'pickup',
    750000, 82500, 832500, 'cash', 'unpaid', 'admin', 'pending');

-- ─── Order Items ───────────────────────────────────────────
-- Order 1 items (physical goods)
INSERT INTO ecom_order_items (order_id, item_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-001'), (SELECT id FROM inv_items WHERE sku = 'MRN-ROPE-001' LIMIT 1), 'Marine Rope 10m', 'MRN-ROPE-001', 'physical', 5, 85000, 425000, 'delivered'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-001'), (SELECT id FROM inv_items WHERE sku = 'MRN-ANCH-001' LIMIT 1), 'Anchor Steel 15kg', 'MRN-ANCH-001', 'physical', 1, 425000, 425000, 'delivered');

-- Order 2 items (ticket)
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, variant_info, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-002'), 'Bali Maritime Festival', 'EV-MUS-DPS', 'ticket', 2, 75000, 150000, '{"class": "economy", "event_date": "2026-04-05"}', 'fulfilled'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-002'), 'Bali Maritime Festival VIP', 'EV-MUS-DPS', 'ticket', 1, 210000, 210000, '{"class": "business", "event_date": "2026-04-05"}', 'fulfilled');

-- Order 3 items (scheduled service — ship route)
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, variant_info, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-003'), 'Jakarta → Surabaya Ship Route', 'RT-JKT-SBY', 'scheduled', 2, 650000, 1300000, '{"class": "business", "departure_date": "2026-04-01", "passengers": ["Budi Santoso", "Rina Santoso"]}', 'pending');

-- Order 4 items (rental)
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, variant_info, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-004'), 'Canon EOS R5 Camera Rental', 'RNT-CAM-001', 'rental', 1, 500000, 2500000, '{"rental_days": 5, "checkout_date": "2026-03-25", "return_date": "2026-03-30", "deposit": 5000000}', 'fulfilled');

-- Order 5 items (mixed: physical + ticket)
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-005'), 'Life Jacket Adult', 'MRN-JACK-001', 'physical', 2, 350000, 700000, 'shipped'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-005'), 'Bali → Lombok Ship Economy', 'RT-DPS-LBK', 'scheduled', 2, 180000, 360000, 'fulfilled'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-005'), 'Bali → Lombok Ship Business', 'RT-DPS-LBK', 'scheduled', 1, 140000, 140000, 'fulfilled');

-- Order 6 items (pending physical)
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-006'), 'Stainless Steel Bolt M10', 'MRN-BOLT-001', 'physical', 100, 2500, 250000, 'pending'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-006'), 'Marine Paint Blue 5L', 'MRN-PANT-001', 'physical', 2, 100000, 200000, 'pending');

-- Order 7 items (cancelled)
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-007'), 'Bali Maritime Festival', 'EV-MUS-DPS', 'ticket', 2, 75000, 150000, 'cancelled'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-007'), 'Festival Souvenir Pack', 'SVC-SOU-001', 'physical', 1, 200000, 200000, 'cancelled');

-- Order 8 items (large company — bulk physical)
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-008'), 'Marine Rope 10m', 'MRN-ROPE-001', 'physical', 20, 85000, 1700000, 'pending'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-008'), 'Anchor Steel 15kg', 'MRN-ANCH-001', 'physical', 3, 425000, 1275000, 'pending'),
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-008'), 'Navigation Compass', 'MRN-COMP-001', 'physical', 5, 45000, 225000, 'pending');

-- Order 10 items
INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, variant_info, status) VALUES
((SELECT id FROM ecom_orders WHERE order_number = 'ORD-2026-010'), 'DJI Mavic 3 Pro Rental', 'RNT-DRN-001', 'rental', 1, 750000, 750000, '{"rental_days": 1, "checkout_date": "2026-03-28"}', 'pending');


-- ===============================================================================
-- ======  E-COMMERCE & PM SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════════
-- E-COMMERCE & PROJECT MANAGEMENT SEED DATA
-- Offers, Packages, Discounts, Returns + PM Activities,
-- Risks, Time Logs
-- ═══════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. E-COMMERCE: OFFERS (8 records)                       ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO ecom_offers (id, tenant_id, name, description, offer_type, discount_type, discount_value, min_order_amount, max_uses, current_uses, start_date, end_date, applies_to, target_ids, banner_text, badge_text, notes, status) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Lebaran Flash Sale',          'Special Lebaran holiday prices on all snorkeling and diving tours',                     'flash_sale',     'percentage', 25, 500000,   200, 87,  '2026-03-28 00:00:00+07', '2026-04-05 23:59:59+07', 'category',     '["tours","snorkeling"]',   'LEBARAN SALE — Up to 25% Off!',          'SALE',       'Highest conversion rate of Q1',                      'active'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Early Bird Komodo',           'Book Komodo Island package 30+ days in advance for 15% discount',                       'early_bird',     'percentage', 15, 2000000,  100, 23,  '2026-04-01 00:00:00+07', '2026-06-30 23:59:59+07', 'specific',     '["af000001-0027-4000-a000-000000000027"]', 'Book Early, Save 15%!',   'EARLY BIRD', 'Target: international tourists planning summer trips', 'active'),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Weekend Getaway Bundle',      'Friday to Sunday bookings get free sunset cruise add-on',                               'bundle',         'fixed',      350000, 1500000, 50, 12, '2026-04-10 00:00:00+07', '2026-05-31 23:59:59+07', 'all_products', '[]',                      'Weekend Escape + Free Sunset Cruise',    'BUNDLE',     NULL,                                                  'active'),
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Honeymoon Special',           'Exclusive honeymoon package with private boat and romantic dinner',                      'seasonal',       'percentage', 20, 5000000,  30,  8,   '2026-05-01 00:00:00+07', '2026-08-31 23:59:59+07', 'category',     '["honeymoon","private"]',  'Honeymoon Bliss — 20% Off',              'HONEYMOON',  'High-margin offering for couples',                    'active'),
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Group Discount 10+',          'Groups of 10 or more get 10% off any tour',                                             'group',          'percentage', 10, 3000000,  0,   34,  '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', 'all_products', '[]',                      'Bring Your Group, Save 10%',             'GROUP',      'Permanent offer — corporate team building popular',   'active'),
  ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Rainy Season Clearance',      'Discounted rates during low season — Nov to Feb',                                       'clearance',      'percentage', 30, 0,        500, 0,   '2026-11-01 00:00:00+07', '2027-02-28 23:59:59+07', 'all_products', '[]',                      'Low Season = Low Prices!',               'CLEARANCE',  NULL,                                                  'scheduled'),
  ('50000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Return Customer Reward',      'Customers with 3+ previous orders get 12% off',                                        'loyalty',        'percentage', 12, 0,        0,   45,  '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', 'all_products', '[]',                      'Welcome Back — Enjoy 12% Off',           'LOYALTY',    'Applied automatically at checkout',                   'active'),
  ('50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'Summer 2025 Expired',         'Last summer promotion — no longer valid',                                               'flash_sale',     'percentage', 20, 500000,   100, 98,  '2025-06-01 00:00:00+07', '2025-08-31 23:59:59+07', 'all_products', '[]',                      NULL,                                     NULL,         'Expired — archived for reporting',                    'expired')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. E-COMMERCE: PACKAGES (6 records)                     ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO ecom_packages (id, tenant_id, name, sku, description, package_price, regular_price, savings, tags, max_quantity, times_sold, notes, status) VALUES
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Bali Island Explorer',           'PKG-BALI-EXP',  'Complete Bali marine experience: Nusa Penida snorkeling + Sunset dolphin cruise + Mangrove kayak tour. 3 days of adventure.', 2850000,  3500000,  650000,  '["bali","adventure","popular"]',    100, 67,  'Best seller Q1 2026',                              'active'),
  ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Komodo Discovery 4D3N',          'PKG-KOMODO-4D',  'Complete Komodo experience: Raja Ampat dive + Komodo Island day pass + inter-island ferry. All inclusive.',                   8500000,  10500000, 2000000, '["komodo","diving","premium"]',     50,  23,  'Premium package — high AOV',                       'active'),
  ('51000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Snorkeler Starter Kit',          'PKG-SNORK-KIT',  'Cressi snorkeling set + Nusa Penida snorkeling tour. Own your gear and hit the water!',                                       1200000,  1450000,  250000,  '["snorkeling","beginner","value"]', 200, 41,  'Popular with first-timers',                        'active'),
  ('51000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Gili Islands Hopper',            'PKG-GILI-HOP',   'Ferry tickets + snorkeling gear rental for Gili T, Gili Meno, and Gili Air. 3-island tour.',                                  1800000,  2200000,  400000,  '["gili","island-hop","tropical"]',  150, 52,  NULL,                                               'active'),
  ('51000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Corporate Team Building',        'PKG-CORP-TB',    'Private boat charter + kayak + snorkeling for up to 20 people. Includes lunch and photos.',                                   12000000, 15000000, 3000000, '["corporate","team","private"]',    20,  8,   'Requires 7-day advance booking',                   'active'),
  ('51000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Romantic Sunset Package',        'PKG-SUNSET-ROM', 'Private sunset cruise for 2 + champagne + dinner on deck. The perfect proposal setting.',                                     3500000,  4200000,  700000,  '["romantic","sunset","premium"]',   30,  15,  'Archived — being redesigned for Q3',               'draft')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. E-COMMERCE: PACKAGE ITEMS                            ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO ecom_package_items (id, package_id, item_id, item_name, item_sku, quantity, unit_price, sort_order) VALUES
  -- Bali Island Explorer
  ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'af000001-0024-4000-a000-000000000024', 'Nusa Penida Snorkeling Tour',  'SVC-NP-SNK',  1, 1200000, 0),
  ('52000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 'af000001-0025-4000-a000-000000000025', 'Sunset Dolphin Watch Cruise',  'SVC-DLP-SS',  1, 1100000, 1),
  ('52000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', 'af000001-0026-4000-a000-000000000026', 'Mangrove Kayak Tour',          'SVC-MNG-KYK', 1, 1200000, 2),
  -- Komodo Discovery
  ('52000000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000002', 'af000001-0027-4000-a000-000000000027', 'Raja Ampat Dive Package',      'SVC-RA-DVE',  1, 5500000, 0),
  ('52000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000002', 'af000001-0023-4000-a000-000000000023', 'Komodo Island Day Pass',       'TKT-KOMODO',  1, 1500000, 1),
  ('52000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000002', 'af000001-0030-4000-a000-000000000030', 'Ferry Ticket LB - Komodo',     'TKT-LB-KMD',  2, 750000,  2),
  -- Snorkeler Starter Kit
  ('52000000-0000-0000-0000-000000000007', '51000000-0000-0000-0000-000000000003', 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',    'RNT-SNK-CRS', 1, 500000,  0),
  ('52000000-0000-0000-0000-000000000008', '51000000-0000-0000-0000-000000000003', 'af000001-0024-4000-a000-000000000024', 'Nusa Penida Snorkeling Tour',  'SVC-NP-SNK',  1, 1200000, 1),
  -- Gili Islands Hopper
  ('52000000-0000-0000-0000-000000000009', '51000000-0000-0000-0000-000000000004', 'af000001-0021-4000-a000-000000000021', 'Ferry Padang Bai - Gili T',    'TKT-PB-GT',   1, 400000,  0),
  ('52000000-0000-0000-0000-000000000010', '51000000-0000-0000-0000-000000000004', 'af000001-0029-4000-a000-000000000029', 'Ferry Gili T - Padang Bai',    'TKT-GT-PB',   1, 400000,  1),
  ('52000000-0000-0000-0000-000000000011', '51000000-0000-0000-0000-000000000004', 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',    'RNT-SNK-CRS', 1, 500000,  2)
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. E-COMMERCE: DISCOUNTS (8 records)                    ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO ecom_discounts (id, tenant_id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, times_used, valid_from, valid_until, auto_apply, applies_to, stackable, notes, status) VALUES
  ('53000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'WELCOME10',    'New Customer Welcome',     'First-time customer 10% discount',                'percentage', 10,  0,        500000,   0,   156, '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', false, 'order',    false, 'Emailed to new signups after registration',           'active'),
  ('53000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'BALI15',       'Bali Lovers',              '15% off all Bali tours and activities',           'percentage', 15,  1000000,  750000,   200, 89,  '2026-03-01 00:00:00+07', '2026-06-30 23:59:59+07', false, 'category', false, 'Promoted on Instagram and TikTok',                    'active'),
  ('53000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'FERRY50K',     'Ferry Discount',           'Rp 50.000 off any ferry ticket booking',          'fixed',      50000, 200000, 50000,    500, 245, '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', true,  'category', true,  'Auto-applied at checkout for ferry category',         'active'),
  ('53000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'DIVEPRO20',    'Pro Diver Discount',       '20% off Raja Ampat dive packages for certified divers', 'percentage', 20, 3000000, 1500000, 50, 12, '2026-04-01 00:00:00+07', '2026-09-30 23:59:59+07', false, 'specific', false, 'Requires PADI/SSI cert number at checkout',           'active'),
  ('53000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'BIRTHDAY',     'Birthday Special',         'Birthday month - get Rp 200K off',                'fixed',      200000, 500000, 200000,   0, 67,  '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', false, 'order',    false, 'Verified via customer DOB in profile',                'active'),
  ('53000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'REFERRAL15',   'Refer a Friend',           'Give 15%, get 15% — referral program',            'percentage', 15,  500000,  500000,   0,   203,'2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', false, 'order',    false, 'Both referrer and referee get 15%',                   'active'),
  ('53000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'STAFF25',      'Staff Employee Discount',  '25% employee discount — internal use only',       'percentage', 25,  0,        0,        0,   15, '2026-01-01 00:00:00+07', '2026-12-31 23:59:59+07', false, 'order',    false, 'Restricted to verified employee emails',              'active'),
  ('53000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'EXPIRED2025',  'Old Year End Sale',        'Last years year-end discount — expired',          'percentage', 30,  0,        1000000,  100, 100,'2025-12-20 00:00:00+07', '2025-12-31 23:59:59+07', false, 'order',    false, 'Archived',                                            'expired')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. E-COMMERCE: RETURNS (5 records)                      ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO ecom_returns (id, tenant_id, return_number, order_id, order_number, customer_name, customer_email, reason, resolution, subtotal, refund_amount, restocking_fee, refund_method, refund_status, status, approved_at, received_at, completed_at, notes, internal_notes) VALUES
  ('54000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'RTN-2026-001', 'b1000001-0003-4000-a000-000000000003', 'ORD-2026-003', 'CV Nusa Travel',   'nusa.travel@mail.com',   'changed_mind',     'refund',       1500000,  1350000,  150000,  'original_payment', 'completed', 'completed', '2026-04-02 10:00:00+07', '2026-04-05 14:00:00+07', '2026-04-07 09:00:00+07', 'Corporate event postponed to Q3',                             'Refund processed via BCA transfer. Restocking fee applied.'),
  ('54000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'RTN-2026-002', 'b1000001-0002-4000-a000-000000000002', 'ORD-2026-002', 'PT Bali Tours',    'ops@balitours.co.id',    'defective',        'replacement',  2500000,  2500000,  0,       'store_credit',     'completed', 'approved',  '2026-04-08 09:00:00+07', '2026-04-10 11:00:00+07', NULL,                     'Snorkeling equipment had manufacturing defect — cracked lens', 'Replaced with new batch. Supplier claim filed with Cressi.'),
  ('54000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'RTN-2026-003', 'b1000001-0007-4000-a000-000000000007', 'ORD-2026-007', 'Ketut Wirawan',    'ketut.w@gmail.com',      'wrong_item',       'refund',       302500,   302500,   0,       'original_payment', 'pending',   'requested', NULL,                     NULL,                     NULL,                     'Received wrong size life jacket',                              NULL),
  ('54000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'RTN-2026-004', 'b1000001-0008-4000-a000-000000000008', 'ORD-2026-008', 'Made Astawa',      'made.astawa@yahoo.com',  'not_as_described', 'refund',       500000,   450000,   50000,   'original_payment', 'processing','inspecting',  '2026-04-12 09:00:00+07', '2026-04-14 10:00:00+07', NULL,                     'Tour description did not match actual experience',             'Customer video evidence reviewed. Partial refund approved.'),
  ('54000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'RTN-2026-005', '43000000-0000-0000-0000-000000000001', 'ORD-2026-001', 'Agung Prasetyo',   'agung.p@company.co.id',  'changed_mind',     'refund',       18500000, 17575000, 925000,  'bank_transfer',    'completed', 'completed', '2026-04-10 14:00:00+07', '2026-04-12 09:00:00+07', '2026-04-14 11:00:00+07', 'Returning 1 laptop — decided to go with different spec',       'Laptop inspected — no damage. Restocked to WH-JKT.')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. E-COMMERCE: RETURN ITEMS (7 records)                 ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO ecom_return_items (id, return_id, order_item_id, item_id, item_name, item_sku, quantity, unit_price, subtotal, condition, restock, reason, notes) VALUES
  ('55000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', NULL, 'af000001-0024-4000-a000-000000000024', 'Nusa Penida Snorkeling Tour', 'SVC-NP-SNK',  1, 1200000,  1200000, 'unused',     false, 'Event postponed',                    'Unused voucher — full refund eligible'),
  ('55000000-0000-0000-0000-000000000002', '54000000-0000-0000-0000-000000000001', NULL, 'af000001-0025-4000-a000-000000000025', 'Sunset Dolphin Watch Cruise', 'SVC-DLP-SS',  1, 300000,   300000,  'unused',     false, 'Event postponed',                    'Unused voucher'),
  ('55000000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000002', NULL, 'af000001-0019-4000-a000-000000000019', 'Cressi Snorkeling Set Pro',   'RNT-SNK-CRS', 5, 500000,   2500000, 'defective',  true,  'Cracked lens on 5 masks',            'Supplier warranty claim filed'),
  ('55000000-0000-0000-0000-000000000004', '54000000-0000-0000-0000-000000000003', NULL, 'af000001-0002-4000-a000-000000000002', 'Marine Life Jacket Type III', 'LJ-III-STD',  1, 302500,   302500,  'new_sealed', true,  'Wrong size — ordered M, received XL', NULL),
  ('55000000-0000-0000-0000-000000000005', '54000000-0000-0000-0000-000000000004', NULL, 'af000001-0024-4000-a000-000000000024', 'Nusa Penida Snorkeling Tour', 'SVC-NP-SNK',  1, 500000,   500000,  'used',       false, 'Service did not match description',   'Customer provided video evidence'),
  ('55000000-0000-0000-0000-000000000006', '54000000-0000-0000-0000-000000000005', '7c5f2a7a-69d8-47b5-b4ae-5f3efea23fb3', '34000000-0000-0000-0000-000000000001', 'Dell Latitude 5550 Laptop', 'LAP-DELL-5550', 1, 18500000, 18500000, 'like_new', true, 'Changed mind — different spec needed', 'Laptop in original packaging. Restocked.')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. PM: ACTIVITIES (15 records)                          ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_activities (id, tenant_id, project_id, name, description, predecessor_id, duration_days, start_date, end_date, status, assigned_to) VALUES
  -- Nusantarasoft v4.0 Release
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Sprint Planning — Sprint 12',        'Plan scope and tasks for Sprint 12 focusing on AI features',            NULL,                                   2,  '2026-04-07', '2026-04-08', 'completed',   'Bagus Mahendra'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Backend API Development',            'REST API endpoints for CRM and inventory modules',                       '60000000-0000-0000-0000-000000000001', 10, '2026-04-09', '2026-04-22', 'in_progress', 'Agus Prasetyo'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Frontend Dashboard Redesign',        'Implement new glassmorphism UI with dynamic theming',                    '60000000-0000-0000-0000-000000000001', 10, '2026-04-09', '2026-04-22', 'in_progress', 'Kadek Ayu'),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'QA & Integration Testing',           'End-to-end testing of all v4.0 features',                                '60000000-0000-0000-0000-000000000002', 5,  '2026-04-23', '2026-04-29', 'not_started', 'Wayan Darma'),
  ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Performance Optimization',           'Load testing, query optimization, CDN setup',                            '60000000-0000-0000-0000-000000000003', 3,  '2026-04-23', '2026-04-25', 'not_started', 'Nyoman Astra'),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'Production Deployment',              'Blue-green deploy to production cluster with rollback plan',             '60000000-0000-0000-0000-000000000004', 1,  '2026-04-30', '2026-04-30', 'not_started', 'Agus Prasetyo'),
  -- Data Center Migration
  ('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Infrastructure Assessment',          'Audit current on-prem infrastructure and create migration inventory',    NULL,                                   5,  '2026-04-01', '2026-04-07', 'completed',   'Agus Prasetyo'),
  ('60000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'AWS Architecture Design',            'Design VPC, subnets, security groups, and IAM policies',                 '60000000-0000-0000-0000-000000000007', 7,  '2026-04-08', '2026-04-16', 'in_progress', 'Nyoman Astra'),
  ('60000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Data Migration Planning',            'Plan database migration strategy with minimal downtime',                 '60000000-0000-0000-0000-000000000008', 5,  '2026-04-17', '2026-04-23', 'not_started', 'Ketut Wirawan'),
  ('60000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Staging Environment Setup',          'Provision staging AWS environment and replicate services',               '60000000-0000-0000-0000-000000000008', 3,  '2026-04-17', '2026-04-21', 'not_started', 'Agus Prasetyo'),
  ('60000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'Migration Execution & Cutover',      'Execute migration with planned maintenance window',                      '60000000-0000-0000-0000-000000000009', 2,  '2026-04-28', '2026-04-29', 'not_started', 'Agus Prasetyo'),
  -- ISO 27001
  ('60000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Gap Analysis',                       'Assess current security posture against ISO 27001 controls',             NULL,                                   10, '2026-04-01', '2026-04-14', 'completed',   'Wayan Darma'),
  ('60000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Policy & Procedure Drafting',        'Write ISMS policies, risk treatment plans, and SOPs',                    '60000000-0000-0000-0000-000000000012', 15, '2026-04-15', '2026-05-06', 'in_progress', 'Wayan Darma'),
  ('60000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Staff Security Awareness Training',  'Conduct security awareness training for all 50+ staff',                  '60000000-0000-0000-0000-000000000013', 5,  '2026-05-07', '2026-05-13', 'not_started', 'Kadek Ayu'),
  ('60000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'Internal Audit & Management Review', 'Internal audit simulation before certification audit',                   '60000000-0000-0000-0000-000000000014', 5,  '2026-05-14', '2026-05-20', 'not_started', 'I Made Suardana')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  8. PM: RISKS (8 records)                                ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_risks (id, tenant_id, project_id, risk_number, title, description, category, probability, impact, risk_score, response_strategy, response_plan, owner, status, identified_date, due_date) VALUES
  ('61000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'RSK-001', 'API Performance Degradation',      'High request volume during holiday season may cause API response times >3s',  'technical',    'high',   'high',   25, 'mitigate', 'Implement Redis caching layer and horizontal scaling for API pods',                 'Agus Prasetyo', 'open',     '2026-03-15', '2026-04-20'),
  ('61000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'RSK-002', 'Key Developer Unavailability',     'Lead backend developer has family medical leave pending',                      'resource',     'medium', 'high',   15, 'mitigate', 'Cross-train Nyoman on backend services. Maintain documentation.',                  'Bagus Mahendra','open',     '2026-03-20', '2026-04-15'),
  ('61000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000001', 'RSK-003', 'Scope Creep on Dashboard',         'Stakeholders requesting additional dashboard widgets beyond scope',            'scope',        'high',   'medium', 15, 'accept',   'Document change requests in backlog. Implement in v4.1 if approved.',              'Kadek Ayu',     'monitoring','2026-04-01', '2026-04-30'),
  ('61000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'RSK-004', 'Data Loss During Migration',       'Risk of data corruption or loss during DB migration from on-prem to AWS',      'technical',    'low',    'critical',12, 'mitigate', 'Full backup before migration. Parallel run for 48h. Automated integrity checks.', 'Ketut Wirawan', 'open',      '2026-04-01', '2026-04-28'),
  ('61000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'RSK-005', 'AWS Cost Overrun',                 'Cloud costs may exceed budget if resources not right-sized after migration',   'financial',    'medium', 'medium', 9,  'mitigate', 'Set AWS Budgets alerts at 75% and 90%. Use Savings Plans for baseline compute.',  'Agus Prasetyo', 'open',      '2026-04-05', '2026-05-15'),
  ('61000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000002', 'RSK-006', 'Network Latency Increase',         'Jakarta users may experience higher latency after AWS ap-southeast-1 move',    'technical',    'medium', 'low',    6,  'accept',   'Monitor with CloudWatch. CDN for static assets. Acceptable if <200ms.',           'Nyoman Astra',  'monitoring','2026-04-08', '2026-05-30'),
  ('61000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'RSK-007', 'Audit Readiness Gap',              'Staff may not complete required security training before certification',       'organizational','medium', 'high',   15, 'mitigate', 'Mandatory training schedule. Weekly progress tracking. Makeup sessions planned.', 'Wayan Darma',   'open',      '2026-04-10', '2026-05-10'),
  ('61000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000003', 'RSK-008', 'Non-Conformity in Controls',       'Existing access control policies may not meet ISO 27001 Annex A requirements', 'compliance',   'high',   'high',   25, 'mitigate', 'Remediate all critical gaps before audit. Engage external ISMS consultant.',      'I Made Suardana','open',     '2026-04-12', '2026-05-15')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  9. PM: TIME LOGS (15 records)                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO pm_time_logs (id, tenant_id, task_id, user_id, hours, log_date, description) VALUES
  ('62000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000001', NULL, 6.0, '2026-04-07', 'Implemented Vertex AI endpoint scaffolding and auth middleware'),
  ('62000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000001', NULL, 7.5, '2026-04-08', 'Built lead scoring model integration and unit tests'),
  ('62000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000001', NULL, 4.0, '2026-04-09', 'Code review fixes and performance optimization'),
  ('62000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000002', NULL, 8.0, '2026-04-09', 'Built NLP pipeline for ticket categorization using Gemini API'),
  ('62000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000002', NULL, 6.5, '2026-04-10', 'Training data preparation and model fine-tuning'),
  ('62000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000002', NULL, 5.0, '2026-04-11', 'Integration testing with ITSM ticket workflow'),
  ('62000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000003', NULL, 7.0, '2026-04-10', 'CRUD operations for service catalog — list, create, update'),
  ('62000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000003', NULL, 6.0, '2026-04-11', 'Search and filtering functionality with pagination'),
  ('62000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000003', NULL, 3.5, '2026-04-12', 'UI polish and accessibility improvements'),
  ('62000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000001', NULL, 2.0, '2026-04-14', 'Deployed Vertex AI endpoint to staging and ran smoke tests'),
  ('62000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000002', NULL, 3.0, '2026-04-14', 'Bug fixes — ticket categorization accuracy improvement from 87% to 93%'),
  ('62000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000003', NULL, 4.5, '2026-04-14', 'Added bulk operations and CSV export to service catalog'),
  ('62000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000001', NULL, 1.5, '2026-04-15', 'Documentation and API reference update for lead scoring'),
  ('62000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000002', NULL, 2.0, '2026-04-15', 'Monitoring dashboard setup for AI categorization metrics'),
  ('62000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000003', NULL, 5.0, '2026-04-15', 'Sprint review demo prep and knowledge transfer docs')
ON CONFLICT (id) DO NOTHING;


-- ===============================================================================
-- ======  BOOKING SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════
-- Booking & Ticketing — Seed Data
-- ═══════════════════════════════════════════════════════

-- Schedules (2 ship routes + 1 event)
INSERT INTO booking_schedules (tenant_id, schedule_code, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity, vehicle_name, vessel_type, price_economy, price_business, price_vip, status)
VALUES
    ('default', 'RT-JKT-SBY', 'Jakarta → Surabaya Express', 'Tanjung Priok, Jakarta', 'Tanjung Perak, Surabaya', '08:00', '20:00', 720, 250, 'KM Nusantara Jaya', 'Ferry', 350000, 650000, 1200000, 'active'),
    ('default', 'RT-DPS-LBK', 'Bali → Lombok Fast Boat', 'Sanur Beach, Bali', 'Bangsal Harbor, Lombok', '09:30', '12:00', 150, 80, 'FB Gili Express', 'Fast Boat', 180000, 350000, 500000, 'active'),
    ('default', 'EV-MUS-DPS', 'Bali Maritime Museum Visit', 'Denpasar Maritime Museum', NULL, '10:00', '16:00', 360, 50, NULL, 'Event', 75000, 150000, 0, 'active')
ON CONFLICT DO NOTHING;

-- Occurrences (6 departures)
INSERT INTO booking_occurrences (schedule_id, departure_date, departure_time, total_capacity, booked_count, checked_in_count, status)
SELECT s.id, v.dep_date::date, v.dep_time::time, v.capacity, v.booked, v.checked_in, v.status
FROM booking_schedules s
JOIN (VALUES
    ('RT-JKT-SBY', '2026-03-28', '08:00', 250, 142, 0, 'scheduled'),
    ('RT-JKT-SBY', '2026-03-29', '08:00', 250, 78, 0, 'scheduled'),
    ('RT-DPS-LBK', '2026-03-28', '09:30', 80, 64, 62, 'departed'),
    ('RT-DPS-LBK', '2026-03-29', '09:30', 80, 23, 0, 'scheduled'),
    ('EV-MUS-DPS', '2026-04-05', '10:00', 50, 35, 0, 'scheduled'),
    ('RT-JKT-SBY', '2026-03-27', '08:00', 250, 210, 208, 'completed')
) AS v(scode, dep_date, dep_time, capacity, booked, checked_in, status)
ON s.schedule_code = v.scode
ON CONFLICT DO NOTHING;

-- Bookings (8 bookings)
INSERT INTO bookings (tenant_id, booking_code, schedule_id, occurrence_id, customer_name, customer_email, customer_phone, passenger_count, class, total_amount, paid_amount, status)
SELECT 'default', v.bcode, s.id, o.id, v.cust_name, v.cust_email, v.cust_phone, v.pax, v.class, v.total, v.paid, v.status
FROM booking_schedules s
JOIN booking_occurrences o ON o.schedule_id = s.id
JOIN (VALUES
    ('RT-JKT-SBY', '2026-03-28', 'BK-2026-0001', 'Wayan Sudiarta', 'wayan@mail.com', '081234567001', 3, 'economy', 1050000, 1050000, 'confirmed'),
    ('RT-JKT-SBY', '2026-03-28', 'BK-2026-0002', 'Ni Made Dewi', 'dewi@mail.com', '081234567002', 2, 'business', 1300000, 1300000, 'confirmed'),
    ('RT-JKT-SBY', '2026-03-28', 'BK-2026-0003', 'John Smith', 'john@mail.com', '081234567003', 1, 'vip', 1200000, 1200000, 'confirmed'),
    ('RT-DPS-LBK', '2026-03-28', 'BK-2026-0004', 'Sarah Connor', 'sarah@mail.com', '081234567004', 2, 'economy', 360000, 360000, 'checked_in'),
    ('RT-DPS-LBK', '2026-03-28', 'BK-2026-0005', 'Budi Hartono', 'budi@mail.com', '081234567005', 4, 'business', 1400000, 1400000, 'checked_in'),
    ('RT-DPS-LBK', '2026-03-29', 'BK-2026-0006', 'Ketut Adi', 'ketut@mail.com', '081234567006', 1, 'economy', 180000, 0, 'pending'),
    ('EV-MUS-DPS', '2026-04-05', 'BK-2026-0007', 'Museum Group A', 'group@museum.com', '081234567007', 10, 'economy', 750000, 750000, 'confirmed'),
    ('RT-JKT-SBY', '2026-03-27', 'BK-2026-0008', 'Past Traveler', 'traveler@mail.com', '081234567008', 2, 'economy', 700000, 700000, 'completed')
) AS v(scode, dep_date, bcode, cust_name, cust_email, cust_phone, pax, class, total, paid, status)
ON s.schedule_code = v.scode AND o.departure_date = v.dep_date::date
ON CONFLICT DO NOTHING;

-- Passengers (10 passengers across bookings)
INSERT INTO booking_passengers (booking_id, name, id_number, nationality, class, notes)
SELECT b.id, v.pname, v.pid, v.nat, v.class, v.notes
FROM bookings b
JOIN (VALUES
    ('BK-2026-0001', 'Wayan Sudiarta', '3171010101800001', 'Indonesian', 'economy', NULL),
    ('BK-2026-0001', 'Ketut Sudiarta', '3171020201900002', 'Indonesian', 'economy', 'Child'),
    ('BK-2026-0001', 'Ni Luh Ayu', '3171030301950003', 'Indonesian', 'economy', NULL),
    ('BK-2026-0002', 'Ni Made Dewi', '3171040401880004', 'Indonesian', 'business', NULL),
    ('BK-2026-0002', 'I Gede Oka', '3171050501850005', 'Indonesian', 'business', NULL),
    ('BK-2026-0003', 'John Smith', 'P12345678', 'American', 'vip', 'Special assistance'),
    ('BK-2026-0004', 'Sarah Connor', 'P87654321', 'Australian', 'economy', NULL),
    ('BK-2026-0004', 'Kyle Reese', 'P11223344', 'Australian', 'economy', NULL),
    ('BK-2026-0005', 'Budi Hartono', '3173010101900001', 'Indonesian', 'business', NULL),
    ('BK-2026-0005', 'Siti Rahayu', '3173020201920002', 'Indonesian', 'business', NULL)
) AS v(bcode, pname, pid, nat, class, notes)
ON b.booking_code = v.bcode
ON CONFLICT DO NOTHING;


-- ===============================================================================
-- ======  RENTAL SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════
-- Rental Engine — Seed Data
-- ═══════════════════════════════════════════════════════

-- Assets (6 rental items)
INSERT INTO rental_assets (tenant_id, asset_code, asset_name, serial_number, category, condition, purchase_date, purchase_cost, current_location, daily_rate, deposit_amount, last_maintenance_date, next_maintenance_date, total_rentals, total_revenue, status)
VALUES
    ('default', 'RNT-CAM-001', 'Canon EOS R5 Camera Kit', 'CAM-2024-R5-0012', 'Camera', 'excellent', '2024-06-15', 65000000, 'Denpasar Office', 500000, 5000000, '2026-02-15', '2026-05-15', 28, 14000000, 'available'),
    ('default', 'RNT-CAM-002', 'Sony A7 IV Camera Kit', 'CAM-2024-A7-0034', 'Camera', 'good', '2024-03-20', 42000000, 'Denpasar Office', 400000, 4000000, '2026-01-10', '2026-04-10', 35, 14000000, 'rented'),
    ('default', 'RNT-PRJ-001', 'Epson EB-L735U Projector', 'PRJ-2025-EB-0001', 'Projector', 'excellent', '2025-01-10', 18000000, 'Surabaya Office', 300000, 2000000, '2026-03-01', '2026-06-01', 12, 3600000, 'available'),
    ('default', 'RNT-DRN-001', 'DJI Mavic 3 Pro Drone', 'DRN-2024-M3P-0008', 'Drone', 'good', '2024-09-01', 35000000, 'Denpasar Office', 750000, 7500000, '2026-02-20', '2026-05-20', 18, 13500000, 'rented'),
    ('default', 'RNT-VEH-001', 'Toyota HiAce Commuter Van', 'VEH-2023-HIA-B1234', 'Vehicle', 'good', '2023-07-15', 450000000, 'Denpasar Depot', 1200000, 12000000, '2026-03-10', '2026-06-10', 45, 54000000, 'available'),
    ('default', 'RNT-AUD-001', 'JBL PartyBox 710 Speaker', 'AUD-2025-JBL-0003', 'Audio', 'fair', '2025-02-01', 12000000, 'Denpasar Office', 250000, 2000000, '2025-12-15', '2026-03-15', 22, 5500000, 'maintenance')
ON CONFLICT DO NOTHING;

-- Contracts (4 in various states)
INSERT INTO rental_contracts (tenant_id, contract_code, asset_id, asset_name, customer_name, customer_email, customer_phone, customer_id_number, checkout_date, expected_return_date, actual_return_date, daily_rate, deposit_amount, deposit_returned, subtotal, late_fee, damage_fee, total_charge, checkout_condition, return_condition, checkout_notes, return_notes, status)
SELECT 'default', v.ccode, a.id, a.asset_name, v.cust_name, v.cust_email, v.cust_phone, v.cust_id,
       v.checkout_date::date, v.expected_return::date,
       CASE WHEN v.actual_return IS NOT NULL THEN v.actual_return::date ELSE NULL END,
       v.daily_rate, v.deposit, v.deposit_returned, v.subtotal, v.late_fee, v.damage_fee, v.total,
       v.checkout_cond, v.return_cond, v.checkout_notes, v.return_notes, v.status
FROM rental_assets a
JOIN (VALUES
    ('RNT-CAM-002', 'RC-2026-001', 'Ahmad Firdaus', 'ahmad@mail.com', '081234568001', '3171060601000001', '2026-03-20', '2026-03-25', NULL, 400000, 4000000, 0, 2000000, 0, 0, 2000000, 'good', NULL, 'Wedding photography project', NULL, 'active'),
    ('RNT-DRN-001', 'RC-2026-002', 'PT Aerial Survey Indonesia', 'ops@aerial.co.id', '081234568002', 'PKP-2024-123456', '2026-03-18', '2026-03-22', NULL, 750000, 7500000, 0, 3000000, 0, 0, 3000000, 'good', NULL, 'Mapping project — Nusa Penida', NULL, 'active'),
    ('RNT-CAM-001', 'RC-2026-003', 'Lestari Photo Studio', 'lestari@photo.com', '081234568003', '3171070701950003', '2026-03-10', '2026-03-15', '2026-03-15', 500000, 5000000, 5000000, 2500000, 0, 0, 2500000, 'excellent', 'excellent', 'Product photography', 'Returned in perfect condition', 'returned'),
    ('RNT-PRJ-001', 'RC-2026-004', 'Bali Convention Center', 'events@balicc.com', '081234568004', 'PKP-2025-654321', '2026-03-01', '2026-03-05', '2026-03-08', 300000, 2000000, 1500000, 1500000, 900000, 500000, 2900000, 'excellent', 'fair', 'Conference presentation', 'Minor lens damage + 3 days late', 'returned')
) AS v(acode, ccode, cust_name, cust_email, cust_phone, cust_id, checkout_date, expected_return, actual_return, daily_rate, deposit, deposit_returned, subtotal, late_fee, damage_fee, total, checkout_cond, return_cond, checkout_notes, return_notes, status)
ON a.asset_code = v.acode
ON CONFLICT DO NOTHING;


-- ===============================================================================
-- ======  PM ADVANCED SEED DATA  ======
-- ===============================================================================

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


-- ===============================================================================
-- ======  PM BOOKING SEED DATA  ======
-- ===============================================================================

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


-- ===============================================================================
-- ======  STUDIO SALES SEED DATA  ======
-- ===============================================================================

-- ═══════════════════════════════════════════════════════════
-- AI Studio — Seed penjualan "hari ini" (idempotent)
-- Jalankan setelah ecommerce_schema.sql + ecommerce_seed.sql
-- ═══════════════════════════════════════════════════════════

-- Order penjualan hari ini #1
INSERT INTO ecom_orders (
    tenant_id, order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_province, shipping_method, shipping_cost,
    subtotal, tax_amount, total_amount, paid_amount, payment_method, payment_status,
    source, status, confirmed_at, created_at
)
SELECT
    'default', 'ORD-TODAY-001',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-001' LIMIT 1),
    'Adi Pratama', 'adi.pratama@email.com', '+62-812-1001',
    'Jl. Sudirman No. 45', 'Jakarta', 'DKI Jakarta', 'JNE Regular', 25000,
    595000, 65450, 685450, 685450, 'bank_transfer', 'paid',
    'web', 'confirmed', NOW(), date_trunc('day', NOW()) + interval '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM ecom_orders WHERE order_number = 'ORD-TODAY-001');

INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status)
SELECT
    (SELECT id FROM ecom_orders WHERE order_number = 'ORD-TODAY-001'),
    'Marine Rope 10m', 'MRN-ROPE-001', 'physical', 3, 85000, 255000, 'pending'
WHERE EXISTS (SELECT 1 FROM ecom_orders WHERE order_number = 'ORD-TODAY-001')
  AND NOT EXISTS (
    SELECT 1 FROM ecom_order_items oi
    JOIN ecom_orders o ON o.id = oi.order_id
    WHERE o.order_number = 'ORD-TODAY-001' AND oi.item_sku = 'MRN-ROPE-001'
  );

INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status)
SELECT
    (SELECT id FROM ecom_orders WHERE order_number = 'ORD-TODAY-001'),
    'Navigation Compass', 'MRN-COMP-001', 'physical', 8, 45000, 360000, 'pending'
WHERE EXISTS (SELECT 1 FROM ecom_orders WHERE order_number = 'ORD-TODAY-001')
  AND NOT EXISTS (
    SELECT 1 FROM ecom_order_items oi
    JOIN ecom_orders o ON o.id = oi.order_id
    WHERE o.order_number = 'ORD-TODAY-001' AND oi.item_sku = 'MRN-COMP-001'
  );

-- Order penjualan hari ini #2 (boost Marine Rope ranking)
INSERT INTO ecom_orders (
    tenant_id, order_number, customer_id, customer_name, customer_email,
    shipping_method, subtotal, tax_amount, total_amount, paid_amount,
    payment_method, payment_status, source, status, confirmed_at, created_at
)
SELECT
    'default', 'ORD-TODAY-002',
    (SELECT id FROM ecom_customers WHERE customer_code = 'CUST-005' LIMIT 1),
    'Raka Putra', 'raka@divepro.id',
    'pickup', 1275000, 140250, 1415250, 1415250,
    'bank_transfer', 'paid', 'admin', 'processing', NOW(), date_trunc('day', NOW()) + interval '5 hours'
WHERE NOT EXISTS (SELECT 1 FROM ecom_orders WHERE order_number = 'ORD-TODAY-002');

INSERT INTO ecom_order_items (order_id, item_name, item_sku, fulfillment_type, quantity, unit_price, subtotal, status)
SELECT
    (SELECT id FROM ecom_orders WHERE order_number = 'ORD-TODAY-002'),
    'Marine Rope 10m', 'MRN-ROPE-001', 'physical', 15, 85000, 1275000, 'pending'
WHERE EXISTS (SELECT 1 FROM ecom_orders WHERE order_number = 'ORD-TODAY-002')
  AND NOT EXISTS (
    SELECT 1 FROM ecom_order_items oi
    JOIN ecom_orders o ON o.id = oi.order_id
    WHERE o.order_number = 'ORD-TODAY-002'
  );


-- ===============================================================================
-- Signal PostgREST to reload schema
-- ===============================================================================
NOTIFY pgrst, 'reload schema';

-- End of consolidated seed data`n