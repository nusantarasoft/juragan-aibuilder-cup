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


NOTIFY pgrst, 'reload schema';
