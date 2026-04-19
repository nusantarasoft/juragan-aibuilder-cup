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
NOTIFY pgrst, 'reload schema';
