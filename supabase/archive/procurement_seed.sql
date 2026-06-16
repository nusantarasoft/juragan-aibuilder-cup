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


NOTIFY pgrst, 'reload schema';
