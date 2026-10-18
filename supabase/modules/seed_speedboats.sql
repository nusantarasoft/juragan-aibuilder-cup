-- Seed: 30 Speedboats with Schedules
-- Run this AFTER inventory_schema.sql

-- ─── Categories ─────────────────────────────
INSERT INTO inv_categories (id, tenant_id, name, description, icon, color, sort_order) VALUES
('c0000001-0001-4000-a000-000000000001', 'default', 'Transportation', 'All transportation services', '🚢', '#0ea5e9', 1),
('c0000001-0002-4000-a000-000000000002', 'default', 'Speedboat', 'Fast boat transfer services', '🚤', '#6366f1', 2),
('c0000001-0003-4000-a000-000000000003', 'default', 'Ferry', 'Regular ferry services', '⛴️', '#10b981', 3)
ON CONFLICT (id) DO NOTHING;

UPDATE inv_categories SET parent_id = 'c0000001-0001-4000-a000-000000000001' 
WHERE id IN ('c0000001-0002-4000-a000-000000000002', 'c0000001-0003-4000-a000-000000000003');

-- ─── 30 Speedboat Items ─────────────────────
INSERT INTO inv_items (id, tenant_id, name, sku, description, item_type, fulfillment_type, category_id, brand, tags, cost_price, selling_price, currency, tax_rate, primary_uom, metadata, status) VALUES
-- Bali ↔ Nusa Penida (Boats 1-6)
('b0000001-0001-4000-a000-000000000001', 'default', 'Maruti Express I', 'SB-MEX-001', 'Premium speedboat Sanur → Nusa Penida. 40-seat capacity, air-conditioned cabin.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Maruti Group', '["speedboat","bali","nusa-penida","sanur"]', 150000, 350000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":40,"amenities":["ac","life-jacket","insurance"],"operator":"Maruti Group"}', 'active'),
('b0000001-0002-4000-a000-000000000002', 'default', 'Maruti Express II', 'SB-MEX-002', 'Premium speedboat Sanur → Nusa Penida. 50-seat capacity with VIP deck.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Maruti Group', '["speedboat","bali","nusa-penida","sanur","vip"]', 200000, 500000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":50,"amenities":["ac","vip-deck","life-jacket","insurance","snack"],"operator":"Maruti Group"}', 'active'),
('b0000001-0003-4000-a000-000000000003', 'default', 'Angel Billabong Fast', 'SB-ABF-003', 'Fast boat Sanur → Nusa Penida direct to Toyapakeh harbour.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Angel Billabong Marine', '["speedboat","bali","nusa-penida","toyapakeh"]', 120000, 300000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":35,"amenities":["life-jacket","insurance"],"operator":"Angel Billabong Marine"}', 'active'),
('b0000001-0004-4000-a000-000000000004', 'default', 'Penida Wave Runner', 'SB-PWR-004', 'High-speed catamaran Sanur → Nusa Penida. Smooth ride even in rough sea.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Penida Wave', '["speedboat","bali","nusa-penida","catamaran"]', 180000, 400000, 'IDR', 11, 'seat', '{"vessel_type":"catamaran","capacity":60,"amenities":["ac","life-jacket","insurance","toilet"],"operator":"Penida Wave"}', 'active'),
('b0000001-0005-4000-a000-000000000005', 'default', 'Crystal Bay Express', 'SB-CBE-005', 'Daily speedboat from Sanur to Crystal Bay, Nusa Penida.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Crystal Bay Marine', '["speedboat","bali","nusa-penida","crystal-bay"]', 130000, 325000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":30,"amenities":["life-jacket","insurance"],"operator":"Crystal Bay Marine"}', 'active'),
('b0000001-0006-4000-a000-000000000006', 'default', 'Nusa Penida Jet', 'SB-NPJ-006', 'Kusamba → Nusa Penida speedboat. Closest departure point with 20min crossing.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'NP Jet Transport', '["speedboat","bali","nusa-penida","kusamba","fast"]', 100000, 250000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":25,"amenities":["life-jacket","insurance"],"operator":"NP Jet Transport"}', 'active'),

-- Bali ↔ Gili Islands (Boats 7-12)
('b0000001-0007-4000-a000-000000000007', 'default', 'Gili Getaway', 'SB-GGA-007', 'Premium fast boat Padang Bai → Gili Trawangan. 2.5-hour crossing.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Gili Getaway', '["speedboat","bali","gili","trawangan","padang-bai"]', 250000, 600000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":80,"amenities":["ac","life-jacket","insurance","entertainment","snack"],"operator":"Gili Getaway"}', 'active'),
('b0000001-0008-4000-a000-000000000008', 'default', 'Eka Jaya Fast Boat', 'SB-EJF-008', 'Daily fast boat Padang Bai → Gili Air → Gili Trawangan.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Eka Jaya', '["speedboat","bali","gili","gili-air","padang-bai"]', 220000, 550000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":70,"amenities":["ac","life-jacket","insurance","snack"],"operator":"Eka Jaya"}', 'active'),
('b0000001-0009-4000-a000-000000000009', 'default', 'Blue Water Express', 'SB-BWE-009', 'Luxury fast boat Serangan → Gili Trawangan with stop at Lombok.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Blue Water Express', '["speedboat","bali","gili","lombok","serangan","luxury"]', 300000, 750000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":55,"amenities":["ac","vip-lounge","life-jacket","insurance","meal","wifi"],"operator":"Blue Water Express"}', 'active'),
('b0000001-0010-4000-a000-000000000010', 'default', 'Patagonia Xpress', 'SB-PAX-010', 'Fast boat Amed → Gili Islands. Departing from beautiful East Bali.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Patagonia Xpress', '["speedboat","bali","gili","amed","east-bali"]', 200000, 500000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":40,"amenities":["life-jacket","insurance","snack"],"operator":"Patagonia Xpress"}', 'active'),
('b0000001-0011-4000-a000-000000000011', 'default', 'Wahana Gili Ocean', 'SB-WGO-011', 'High-speed catamaran Padang Bai → Gili Air → Gili Meno → Gili T.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Wahana Gili Ocean', '["speedboat","bali","gili","gili-meno","catamaran"]', 230000, 575000, 'IDR', 11, 'seat', '{"vessel_type":"catamaran","capacity":90,"amenities":["ac","life-jacket","insurance","toilet","snack"],"operator":"Wahana Gili Ocean"}', 'active'),
('b0000001-0012-4000-a000-000000000012', 'default', 'Scoot Fast Cruises', 'SB-SFC-012', 'Premium cruise-style fast boat Sanur → Gili T. Includes meal & entertainment.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Scoot Fast Cruises', '["speedboat","bali","gili","sanur","cruise","premium"]', 350000, 850000, 'IDR', 11, 'seat', '{"vessel_type":"cruise-speedboat","capacity":100,"amenities":["ac","vip-lounge","life-jacket","insurance","meal","entertainment","wifi","toilet"],"operator":"Scoot Fast Cruises"}', 'active'),

-- Bali ↔ Lembongan (Boats 13-18)
('b0000001-0013-4000-a000-000000000013', 'default', 'Rocky Fast Cruises', 'SB-RFC-013', 'Sanur → Nusa Lembongan fast boat. Just 30 minutes crossing.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Rocky Fast Cruises', '["speedboat","bali","lembongan","sanur"]', 130000, 300000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":45,"amenities":["ac","life-jacket","insurance"],"operator":"Rocky Fast Cruises"}', 'active'),
('b0000001-0014-4000-a000-000000000014', 'default', 'Lembongan Express', 'SB-LBE-014', 'Direct fast boat Sanur → Jungutbatu, Nusa Lembongan.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Lembongan Express', '["speedboat","bali","lembongan","jungutbatu"]', 110000, 275000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":35,"amenities":["life-jacket","insurance"],"operator":"Lembongan Express"}', 'active'),
('b0000001-0015-4000-a000-000000000015', 'default', 'Bounty Cruises', 'SB-BNC-015', 'Luxury catamaran Benoa → Nusa Lembongan day trip.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Bounty Cruises', '["speedboat","bali","lembongan","benoa","luxury","catamaran"]', 400000, 950000, 'IDR', 11, 'seat', '{"vessel_type":"catamaran","capacity":120,"amenities":["ac","pool","slide","bbq","snorkeling","life-jacket","insurance","meal","entertainment"],"operator":"Bounty Cruises"}', 'active'),
('b0000001-0016-4000-a000-000000000016', 'default', 'D''Camel Fast Ferry', 'SB-DCF-016', 'Budget-friendly speedboat Sanur → Mushroom Bay, Lembongan.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'D''Camel', '["speedboat","bali","lembongan","mushroom-bay","budget"]', 80000, 200000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":30,"amenities":["life-jacket","insurance"],"operator":"D Camel"}', 'active'),
('b0000001-0017-4000-a000-000000000017', 'default', 'Coconut Island Boat', 'SB-CIB-017', 'Traditional speedboat Sanur → Nusa Lembongan → Nusa Ceningan.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Coconut Island', '["speedboat","bali","lembongan","ceningan"]', 100000, 250000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":28,"amenities":["life-jacket","insurance"],"operator":"Coconut Island"}', 'active'),
('b0000001-0018-4000-a000-000000000018', 'default', 'Mola Mola Express', 'SB-MME-018', 'Premium speedboat Sanur → Lembongan with underwater viewing glass.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Mola Mola Express', '["speedboat","bali","lembongan","premium","underwater"]', 200000, 450000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":40,"amenities":["ac","glass-bottom","life-jacket","insurance","snack"],"operator":"Mola Mola Express"}', 'active'),

-- Lombok ↔ Gili (Boats 19-22)
('b0000001-0019-4000-a000-000000000019', 'default', 'Kila Fast Boat', 'SB-KFB-019', 'Bangsal → Gili Trawangan speedboat shuttle. 15-minute ride.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Kila Senggigi', '["speedboat","lombok","gili","bangsal","shuttle"]', 50000, 150000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":20,"amenities":["life-jacket"],"operator":"Kila Senggigi"}', 'active'),
('b0000001-0020-4000-a000-000000000020', 'default', 'Lombok Strait Jet', 'SB-LSJ-020', 'Teluk Nare → Gili Air → Gili Meno → Gili T. Private harbour departure.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Lombok Strait Jet', '["speedboat","lombok","gili","teluk-nare","private"]', 80000, 200000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":30,"amenities":["life-jacket","insurance"],"operator":"Lombok Strait Jet"}', 'active'),
('b0000001-0021-4000-a000-000000000021', 'default', 'Gili Shuttle Express', 'SB-GSE-021', 'Inter-island shuttle: Gili Air ↔ Gili Meno ↔ Gili Trawangan.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Gili Shuttle', '["speedboat","gili","shuttle","inter-island"]', 30000, 85000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":15,"amenities":["life-jacket"],"operator":"Gili Shuttle"}', 'active'),
('b0000001-0022-4000-a000-000000000022', 'default', 'Senggigi Sunset Boat', 'SB-SSB-022', 'Senggigi → Gili Trawangan sunset departure speedboat.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Senggigi Marine', '["speedboat","lombok","gili","senggigi","sunset"]', 120000, 300000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":35,"amenities":["ac","life-jacket","insurance","snack"],"operator":"Senggigi Marine"}', 'active'),

-- Flores ↔ Komodo (Boats 23-26)
('b0000001-0023-4000-a000-000000000023', 'default', 'Komodo Jet', 'SB-KJT-023', 'Labuan Bajo → Komodo Island fast boat. Daily departure.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Komodo Jet', '["speedboat","flores","komodo","labuan-bajo"]', 200000, 500000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":30,"amenities":["life-jacket","insurance","guide"],"operator":"Komodo Jet"}', 'active'),
('b0000001-0024-4000-a000-000000000024', 'default', 'Rinca Explorer', 'SB-REX-024', 'Labuan Bajo → Rinca Island → Komodo. Full day tour boat.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Rinca Explorer', '["speedboat","flores","komodo","rinca","tour"]', 350000, 850000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":25,"amenities":["ac","life-jacket","insurance","guide","meal","snorkeling"],"operator":"Rinca Explorer"}', 'active'),
('b0000001-0025-4000-a000-000000000025', 'default', 'Flores Sea Star', 'SB-FSS-025', 'Premium speedboat Labuan Bajo → Padar → Pink Beach → Komodo.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Flores Sea Star', '["speedboat","flores","komodo","padar","pink-beach","premium"]', 450000, 1200000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":20,"amenities":["ac","vip-deck","life-jacket","insurance","guide","meal","snorkeling","drone-photo"],"operator":"Flores Sea Star"}', 'active'),
('b0000001-0026-4000-a000-000000000026', 'default', 'Dragon Bay Cruise', 'SB-DBC-026', 'Luxury phinisi-style speedboat Labuan Bajo multi-stop Komodo tour.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Dragon Bay', '["speedboat","flores","komodo","phinisi","luxury"]', 500000, 1500000, 'IDR', 11, 'seat', '{"vessel_type":"phinisi","capacity":15,"amenities":["ac","cabin","life-jacket","insurance","guide","meal","snorkeling","kayak","sunset-dinner"],"operator":"Dragon Bay"}', 'active'),

-- Inter-island Long Distance (Boats 27-30)
('b0000001-0027-4000-a000-000000000027', 'default', 'Nusa Islands Hopper', 'SB-NIH-027', 'Sanur → Nusa Lembongan → Nusa Penida → Sanur circuit.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Nusa Hopper', '["speedboat","bali","lembongan","nusa-penida","circuit"]', 250000, 650000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":45,"amenities":["ac","life-jacket","insurance","snack","guide"],"operator":"Nusa Hopper"}', 'active'),
('b0000001-0028-4000-a000-000000000028', 'default', 'Bali Lombok Express', 'SB-BLE-028', 'Fast boat Padang Bai → Lombok (Bangsal). 1.5 hours direct.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Bali Lombok Express', '["speedboat","bali","lombok","padang-bai","bangsal"]', 200000, 450000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":60,"amenities":["ac","life-jacket","insurance","toilet"],"operator":"Bali Lombok Express"}', 'active'),
('b0000001-0029-4000-a000-000000000029', 'default', 'Sumbawa Swift', 'SB-SWS-029', 'Lombok → Sumbawa fast boat crossing. Adventure route.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Sumbawa Swift', '["speedboat","lombok","sumbawa","adventure"]', 300000, 700000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":35,"amenities":["life-jacket","insurance","snack"],"operator":"Sumbawa Swift"}', 'active'),
('b0000001-0030-4000-a000-000000000030', 'default', 'Raja Ampat Flyer', 'SB-RAF-030', 'Sorong → Waisai, Raja Ampat premium speedboat.', 'service', 'scheduled', 'c0000001-0002-4000-a000-000000000002', 'Raja Ampat Flyer', '["speedboat","raja-ampat","sorong","waisai","papua","premium"]', 500000, 1350000, 'IDR', 11, 'seat', '{"vessel_type":"speedboat","capacity":20,"amenities":["ac","life-jacket","insurance","meal","guide","snorkeling"],"operator":"Raja Ampat Flyer"}', 'active')
ON CONFLICT (id) DO NOTHING;


-- ─── Schedules (2-3 per boat) ───────────────

-- Boat 1: Maruti Express I
INSERT INTO inv_item_schedules (id, item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status) VALUES
('s0000001-0001-4000-a000-000000000001', 'b0000001-0001-4000-a000-000000000001', 'Sanur → Nusa Penida (Morning)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '07:30', '08:15', 45, '{"economy":30,"business":10}', 'active'),
('s0000001-0002-4000-a000-000000000002', 'b0000001-0001-4000-a000-000000000001', 'Nusa Penida → Sanur (Afternoon)', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '16:00', '16:45', 45, '{"economy":30,"business":10}', 'active'),
-- Boat 2: Maruti Express II
('s0000001-0003-4000-a000-000000000003', 'b0000001-0002-4000-a000-000000000002', 'Sanur → Nusa Penida (Morning)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '08:00', '08:50', 50, '{"economy":30,"business":15,"vip":5}', 'active'),
('s0000001-0004-4000-a000-000000000004', 'b0000001-0002-4000-a000-000000000002', 'Sanur → Nusa Penida (Midday)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '11:00', '11:50', 50, '{"economy":30,"business":15,"vip":5}', 'active'),
('s0000001-0005-4000-a000-000000000005', 'b0000001-0002-4000-a000-000000000002', 'Nusa Penida → Sanur (Afternoon)', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '15:30', '16:20', 50, '{"economy":30,"business":15,"vip":5}', 'active'),
-- Boat 3: Angel Billabong Fast
('s0000001-0006-4000-a000-000000000006', 'b0000001-0003-4000-a000-000000000003', 'Sanur → Toyapakeh (Morning)', 'Sanur Harbour', 'Toyapakeh Harbour', '07:00', '07:40', 40, '{"economy":35}', 'active'),
('s0000001-0007-4000-a000-000000000007', 'b0000001-0003-4000-a000-000000000003', 'Toyapakeh → Sanur (Afternoon)', 'Toyapakeh Harbour', 'Sanur Harbour', '15:00', '15:40', 40, '{"economy":35}', 'active'),
-- Boat 4: Penida Wave Runner
('s0000001-0008-4000-a000-000000000008', 'b0000001-0004-4000-a000-000000000004', 'Sanur → Nusa Penida (Morning)', 'Sanur Harbour', 'Banjar Nyuh, Nusa Penida', '08:30', '09:10', 40, '{"economy":40,"business":20}', 'active'),
('s0000001-0009-4000-a000-000000000009', 'b0000001-0004-4000-a000-000000000004', 'Nusa Penida → Sanur (Afternoon)', 'Banjar Nyuh, Nusa Penida', 'Sanur Harbour', '16:30', '17:10', 40, '{"economy":40,"business":20}', 'active'),
-- Boat 5: Crystal Bay Express
('s0000001-0010-4000-a000-000000000010', 'b0000001-0005-4000-a000-000000000005', 'Sanur → Crystal Bay (Morning)', 'Sanur Harbour', 'Crystal Bay, Nusa Penida', '09:00', '09:45', 45, '{"economy":30}', 'active'),
('s0000001-0011-4000-a000-000000000011', 'b0000001-0005-4000-a000-000000000005', 'Crystal Bay → Sanur (Afternoon)', 'Crystal Bay, Nusa Penida', 'Sanur Harbour', '14:30', '15:15', 45, '{"economy":30}', 'active'),
-- Boat 6: Nusa Penida Jet
('s0000001-0012-4000-a000-000000000012', 'b0000001-0006-4000-a000-000000000006', 'Kusamba → Nusa Penida (Morning)', 'Kusamba Beach', 'Sampalan, Nusa Penida', '06:30', '06:50', 20, '{"economy":25}', 'active'),
('s0000001-0013-4000-a000-000000000013', 'b0000001-0006-4000-a000-000000000006', 'Nusa Penida → Kusamba (Afternoon)', 'Sampalan, Nusa Penida', 'Kusamba Beach', '17:00', '17:20', 20, '{"economy":25}', 'active'),
-- Boat 7: Gili Getaway
('s0000001-0014-4000-a000-000000000014', 'b0000001-0007-4000-a000-000000000007', 'Padang Bai → Gili T (Morning)', 'Padang Bai Harbour', 'Gili Trawangan', '09:00', '11:30', 150, '{"economy":50,"business":20,"vip":10}', 'active'),
('s0000001-0015-4000-a000-000000000015', 'b0000001-0007-4000-a000-000000000007', 'Gili T → Padang Bai (Afternoon)', 'Gili Trawangan', 'Padang Bai Harbour', '14:00', '16:30', 150, '{"economy":50,"business":20,"vip":10}', 'active'),
-- Boat 8: Eka Jaya Fast Boat
('s0000001-0016-4000-a000-000000000016', 'b0000001-0008-4000-a000-000000000008', 'Padang Bai → Gili Air → Gili T (Morning)', 'Padang Bai Harbour', 'Gili Trawangan', '08:30', '11:00', 150, '{"economy":50,"business":20}', 'active'),
('s0000001-0017-4000-a000-000000000017', 'b0000001-0008-4000-a000-000000000008', 'Gili T → Gili Air → Padang Bai (Afternoon)', 'Gili Trawangan', 'Padang Bai Harbour', '13:30', '16:00', 150, '{"economy":50,"business":20}', 'active'),
-- Boat 9: Blue Water Express
('s0000001-0018-4000-a000-000000000018', 'b0000001-0009-4000-a000-000000000009', 'Serangan → Lombok → Gili T (Morning)', 'Serangan Harbour', 'Gili Trawangan', '08:00', '11:00', 180, '{"economy":35,"vip":20}', 'active'),
('s0000001-0019-4000-a000-000000000019', 'b0000001-0009-4000-a000-000000000009', 'Gili T → Lombok → Serangan (Afternoon)', 'Gili Trawangan', 'Serangan Harbour', '13:00', '16:00', 180, '{"economy":35,"vip":20}', 'active'),
-- Boat 10: Patagonia Xpress
('s0000001-0020-4000-a000-000000000020', 'b0000001-0010-4000-a000-000000000010', 'Amed → Gili T (Morning)', 'Amed Beach', 'Gili Trawangan', '09:00', '10:30', 90, '{"economy":40}', 'active'),
('s0000001-0021-4000-a000-000000000021', 'b0000001-0010-4000-a000-000000000010', 'Gili T → Amed (Afternoon)', 'Gili Trawangan', 'Amed Beach', '15:00', '16:30', 90, '{"economy":40}', 'active'),
-- Boat 11: Wahana Gili Ocean
('s0000001-0022-4000-a000-000000000022', 'b0000001-0011-4000-a000-000000000011', 'Padang Bai → Gili Air → Gili Meno → Gili T', 'Padang Bai Harbour', 'Gili Trawangan', '08:00', '10:30', 150, '{"economy":60,"business":30}', 'active'),
('s0000001-0023-4000-a000-000000000023', 'b0000001-0011-4000-a000-000000000011', 'Gili T → Gili Meno → Gili Air → Padang Bai', 'Gili Trawangan', 'Padang Bai Harbour', '14:30', '17:00', 150, '{"economy":60,"business":30}', 'active'),
-- Boat 12: Scoot Fast Cruises
('s0000001-0024-4000-a000-000000000024', 'b0000001-0012-4000-a000-000000000012', 'Sanur → Gili T (Morning)', 'Sanur Harbour', 'Gili Trawangan', '09:30', '12:00', 150, '{"economy":60,"business":30,"vip":10}', 'active'),
('s0000001-0025-4000-a000-000000000025', 'b0000001-0012-4000-a000-000000000012', 'Gili T → Sanur (Afternoon)', 'Gili Trawangan', 'Sanur Harbour', '13:00', '15:30', 150, '{"economy":60,"business":30,"vip":10}', 'active'),
-- Boat 13: Rocky Fast Cruises
('s0000001-0026-4000-a000-000000000026', 'b0000001-0013-4000-a000-000000000013', 'Sanur → Lembongan (Morning)', 'Sanur Harbour', 'Jungutbatu, Lembongan', '08:00', '08:30', 30, '{"economy":35,"business":10}', 'active'),
('s0000001-0027-4000-a000-000000000027', 'b0000001-0013-4000-a000-000000000013', 'Lembongan → Sanur (Afternoon)', 'Jungutbatu, Lembongan', 'Sanur Harbour', '16:00', '16:30', 30, '{"economy":35,"business":10}', 'active'),
-- Boat 14: Lembongan Express
('s0000001-0028-4000-a000-000000000028', 'b0000001-0014-4000-a000-000000000014', 'Sanur → Jungutbatu (Morning)', 'Sanur Harbour', 'Jungutbatu, Lembongan', '07:30', '08:05', 35, '{"economy":35}', 'active'),
('s0000001-0029-4000-a000-000000000029', 'b0000001-0014-4000-a000-000000000014', 'Jungutbatu → Sanur (Afternoon)', 'Jungutbatu, Lembongan', 'Sanur Harbour', '15:30', '16:05', 35, '{"economy":35}', 'active'),
-- Boat 15: Bounty Cruises
('s0000001-0030-4000-a000-000000000030', 'b0000001-0015-4000-a000-000000000015', 'Benoa → Lembongan Day Cruise', 'Benoa Harbour', 'Lembongan Reef', '09:15', '10:00', 45, '{"economy":80,"vip":40}', 'active'),
('s0000001-0031-4000-a000-000000000031', 'b0000001-0015-4000-a000-000000000015', 'Lembongan → Benoa Return', 'Lembongan Reef', 'Benoa Harbour', '16:00', '16:45', 45, '{"economy":80,"vip":40}', 'active'),
-- Boat 16: D'Camel Fast Ferry
('s0000001-0032-4000-a000-000000000032', 'b0000001-0016-4000-a000-000000000016', 'Sanur → Mushroom Bay (Morning)', 'Sanur Harbour', 'Mushroom Bay, Lembongan', '08:30', '09:00', 30, '{"economy":30}', 'active'),
('s0000001-0033-4000-a000-000000000033', 'b0000001-0016-4000-a000-000000000016', 'Mushroom Bay → Sanur (Afternoon)', 'Mushroom Bay, Lembongan', 'Sanur Harbour', '16:30', '17:00', 30, '{"economy":30}', 'active'),
-- Boat 17: Coconut Island Boat
('s0000001-0034-4000-a000-000000000034', 'b0000001-0017-4000-a000-000000000017', 'Sanur → Lembongan → Ceningan', 'Sanur Harbour', 'Nusa Ceningan', '07:45', '08:30', 45, '{"economy":28}', 'active'),
('s0000001-0035-4000-a000-000000000035', 'b0000001-0017-4000-a000-000000000017', 'Ceningan → Lembongan → Sanur', 'Nusa Ceningan', 'Sanur Harbour', '15:30', '16:15', 45, '{"economy":28}', 'active'),
-- Boat 18: Mola Mola Express
('s0000001-0036-4000-a000-000000000036', 'b0000001-0018-4000-a000-000000000018', 'Sanur → Lembongan Premium (Morning)', 'Sanur Harbour', 'Jungutbatu, Lembongan', '09:00', '09:35', 35, '{"economy":25,"vip":15}', 'active'),
('s0000001-0037-4000-a000-000000000037', 'b0000001-0018-4000-a000-000000000018', 'Lembongan → Sanur Premium (Afternoon)', 'Jungutbatu, Lembongan', 'Sanur Harbour', '16:00', '16:35', 35, '{"economy":25,"vip":15}', 'active'),
-- Boat 19: Kila Fast Boat
('s0000001-0038-4000-a000-000000000038', 'b0000001-0019-4000-a000-000000000019', 'Bangsal → Gili T (Morning)', 'Bangsal Harbour, Lombok', 'Gili Trawangan', '08:00', '08:15', 15, '{"economy":20}', 'active'),
('s0000001-0039-4000-a000-000000000039', 'b0000001-0019-4000-a000-000000000019', 'Bangsal → Gili T (Midday)', 'Bangsal Harbour, Lombok', 'Gili Trawangan', '12:00', '12:15', 15, '{"economy":20}', 'active'),
('s0000001-0040-4000-a000-000000000040', 'b0000001-0019-4000-a000-000000000019', 'Gili T → Bangsal (Afternoon)', 'Gili Trawangan', 'Bangsal Harbour, Lombok', '17:00', '17:15', 15, '{"economy":20}', 'active'),
-- Boat 20: Lombok Strait Jet
('s0000001-0041-4000-a000-000000000041', 'b0000001-0020-4000-a000-000000000020', 'Teluk Nare → Gili Air → Gili T', 'Teluk Nare, Lombok', 'Gili Trawangan', '09:00', '09:30', 30, '{"economy":30}', 'active'),
('s0000001-0042-4000-a000-000000000042', 'b0000001-0020-4000-a000-000000000020', 'Gili T → Gili Air → Teluk Nare', 'Gili Trawangan', 'Teluk Nare, Lombok', '16:00', '16:30', 30, '{"economy":30}', 'active'),
-- Boat 21: Gili Shuttle Express
('s0000001-0043-4000-a000-000000000043', 'b0000001-0021-4000-a000-000000000021', 'Gili Air → Gili Meno → Gili T (Morning)', 'Gili Air', 'Gili Trawangan', '08:00', '08:30', 30, '{"economy":15}', 'active'),
('s0000001-0044-4000-a000-000000000044', 'b0000001-0021-4000-a000-000000000021', 'Gili T → Gili Meno → Gili Air (Morning)', 'Gili Trawangan', 'Gili Air', '10:00', '10:30', 30, '{"economy":15}', 'active'),
('s0000001-0045-4000-a000-000000000045', 'b0000001-0021-4000-a000-000000000021', 'Gili Air → Gili Meno → Gili T (Afternoon)', 'Gili Air', 'Gili Trawangan', '14:00', '14:30', 30, '{"economy":15}', 'active'),
-- Boat 22: Senggigi Sunset Boat
('s0000001-0046-4000-a000-000000000046', 'b0000001-0022-4000-a000-000000000022', 'Senggigi → Gili T (Afternoon)', 'Senggigi, Lombok', 'Gili Trawangan', '14:00', '14:45', 45, '{"economy":25,"business":10}', 'active'),
('s0000001-0047-4000-a000-000000000047', 'b0000001-0022-4000-a000-000000000022', 'Gili T → Senggigi (Evening)', 'Gili Trawangan', 'Senggigi, Lombok', '17:30', '18:15', 45, '{"economy":25,"business":10}', 'active'),
-- Boat 23: Komodo Jet
('s0000001-0048-4000-a000-000000000048', 'b0000001-0023-4000-a000-000000000023', 'Labuan Bajo → Komodo (Morning)', 'Labuan Bajo Harbour', 'Komodo Island', '07:00', '09:00', 120, '{"economy":25,"business":5}', 'active'),
('s0000001-0049-4000-a000-000000000049', 'b0000001-0023-4000-a000-000000000023', 'Komodo → Labuan Bajo (Afternoon)', 'Komodo Island', 'Labuan Bajo Harbour', '15:00', '17:00', 120, '{"economy":25,"business":5}', 'active'),
-- Boat 24: Rinca Explorer
('s0000001-0050-4000-a000-000000000050', 'b0000001-0024-4000-a000-000000000024', 'Labuan Bajo → Rinca → Komodo (Full Day)', 'Labuan Bajo Harbour', 'Komodo Island', '06:30', '12:00', 330, '{"economy":15,"vip":10}', 'active'),
('s0000001-0051-4000-a000-000000000051', 'b0000001-0024-4000-a000-000000000024', 'Komodo → Rinca → Labuan Bajo (Return)', 'Komodo Island', 'Labuan Bajo Harbour', '13:00', '17:30', 270, '{"economy":15,"vip":10}', 'active'),
-- Boat 25: Flores Sea Star
('s0000001-0052-4000-a000-000000000052', 'b0000001-0025-4000-a000-000000000025', 'Labuan Bajo → Padar → Pink Beach → Komodo', 'Labuan Bajo Harbour', 'Komodo Island', '06:00', '14:00', 480, '{"vip":20}', 'active'),
('s0000001-0053-4000-a000-000000000053', 'b0000001-0025-4000-a000-000000000025', 'Komodo → Pink Beach → Padar → Labuan Bajo', 'Komodo Island', 'Labuan Bajo Harbour', '08:00', '16:00', 480, '{"vip":20}', 'active'),
-- Boat 26: Dragon Bay Cruise
('s0000001-0054-4000-a000-000000000054', 'b0000001-0026-4000-a000-000000000026', 'Labuan Bajo Sunset Cruise', 'Labuan Bajo Harbour', 'Kalong Island', '16:00', '19:00', 180, '{"vip":15}', 'active'),
('s0000001-0055-4000-a000-000000000055', 'b0000001-0026-4000-a000-000000000026', 'Labuan Bajo Full Day Explorer', 'Labuan Bajo Harbour', 'Komodo Island', '07:00', '17:00', 600, '{"vip":15}', 'active'),
-- Boat 27: Nusa Islands Hopper
('s0000001-0056-4000-a000-000000000056', 'b0000001-0027-4000-a000-000000000027', 'Sanur → Lembongan → Penida Circuit (Morning)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '08:00', '10:30', 150, '{"economy":30,"business":15}', 'active'),
('s0000001-0057-4000-a000-000000000057', 'b0000001-0027-4000-a000-000000000027', 'Penida → Lembongan → Sanur Circuit (Afternoon)', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '14:00', '16:30', 150, '{"economy":30,"business":15}', 'active'),
-- Boat 28: Bali Lombok Express
('s0000001-0058-4000-a000-000000000058', 'b0000001-0028-4000-a000-000000000028', 'Padang Bai → Bangsal (Morning)', 'Padang Bai Harbour', 'Bangsal, Lombok', '08:00', '09:30', 90, '{"economy":40,"business":20}', 'active'),
('s0000001-0059-4000-a000-000000000059', 'b0000001-0028-4000-a000-000000000028', 'Bangsal → Padang Bai (Afternoon)', 'Bangsal, Lombok', 'Padang Bai Harbour', '14:00', '15:30', 90, '{"economy":40,"business":20}', 'active'),
-- Boat 29: Sumbawa Swift
('s0000001-0060-4000-a000-000000000060', 'b0000001-0029-4000-a000-000000000029', 'Lombok → Sumbawa (Morning)', 'Lembar, Lombok', 'Poto Tano, Sumbawa', '07:00', '09:00', 120, '{"economy":35}', 'active'),
('s0000001-0061-4000-a000-000000000061', 'b0000001-0029-4000-a000-000000000029', 'Sumbawa → Lombok (Afternoon)', 'Poto Tano, Sumbawa', 'Lembar, Lombok', '14:00', '16:00', 120, '{"economy":35}', 'active'),
-- Boat 30: Raja Ampat Flyer
('s0000001-0062-4000-a000-000000000062', 'b0000001-0030-4000-a000-000000000030', 'Sorong → Waisai (Morning)', 'Sorong Harbour', 'Waisai, Raja Ampat', '08:00', '10:00', 120, '{"economy":10,"vip":10}', 'active'),
('s0000001-0063-4000-a000-000000000063', 'b0000001-0030-4000-a000-000000000030', 'Waisai → Sorong (Afternoon)', 'Waisai, Raja Ampat', 'Sorong Harbour', '14:00', '16:00', 120, '{"economy":10,"vip":10}', 'active')
ON CONFLICT (id) DO NOTHING;

-- ─── Generate schedule occurrences for the next 30 days ───
INSERT INTO inv_schedule_occurrences (schedule_id, departure_date, departure_time, status)
SELECT s.id, d.dt, s.departure_time, 'scheduled'
FROM inv_item_schedules s
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', INTERVAL '1 day') AS d(dt)
WHERE s.id::text LIKE 's0000001-%'
ON CONFLICT DO NOTHING;

