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


NOTIFY pgrst, 'reload schema';
