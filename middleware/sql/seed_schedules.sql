-- Seed schedules for all 30 speedboats (auto-generate UUIDs)
-- Run AFTER seed_speedboats.sql

-- Boat 1: Maruti Express I
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Nusa Penida (Morning)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '07:30', '08:15', 45, '{"economy":30,"business":10}', 'active' FROM inv_items WHERE sku='SB-MEX-001';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Nusa Penida → Sanur (Afternoon)', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '16:00', '16:45', 45, '{"economy":30,"business":10}', 'active' FROM inv_items WHERE sku='SB-MEX-001';

-- Boat 2: Maruti Express II
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Nusa Penida (Morning)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '08:00', '08:50', 50, '{"economy":30,"business":15,"vip":5}', 'active' FROM inv_items WHERE sku='SB-MEX-002';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Nusa Penida (Midday)', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '11:00', '11:50', 50, '{"economy":30,"business":15,"vip":5}', 'active' FROM inv_items WHERE sku='SB-MEX-002';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Nusa Penida → Sanur (Afternoon)', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '15:30', '16:20', 50, '{"economy":30,"business":15,"vip":5}', 'active' FROM inv_items WHERE sku='SB-MEX-002';

-- Boat 3: Angel Billabong Fast
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Toyapakeh (Morning)', 'Sanur Harbour', 'Toyapakeh Harbour', '07:00', '07:40', 40, '{"economy":35}', 'active' FROM inv_items WHERE sku='SB-ABF-003';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Toyapakeh → Sanur (Afternoon)', 'Toyapakeh Harbour', 'Sanur Harbour', '15:00', '15:40', 40, '{"economy":35}', 'active' FROM inv_items WHERE sku='SB-ABF-003';

-- Boat 4: Penida Wave Runner
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Nusa Penida (Morning)', 'Sanur Harbour', 'Banjar Nyuh, Nusa Penida', '08:30', '09:10', 40, '{"economy":40,"business":20}', 'active' FROM inv_items WHERE sku='SB-PWR-004';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Nusa Penida → Sanur (Afternoon)', 'Banjar Nyuh, Nusa Penida', 'Sanur Harbour', '16:30', '17:10', 40, '{"economy":40,"business":20}', 'active' FROM inv_items WHERE sku='SB-PWR-004';

-- Boat 5: Crystal Bay Express
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Crystal Bay (Morning)', 'Sanur Harbour', 'Crystal Bay, Nusa Penida', '09:00', '09:45', 45, '{"economy":30}', 'active' FROM inv_items WHERE sku='SB-CBE-005';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Crystal Bay → Sanur (Afternoon)', 'Crystal Bay, Nusa Penida', 'Sanur Harbour', '14:30', '15:15', 45, '{"economy":30}', 'active' FROM inv_items WHERE sku='SB-CBE-005';

-- Boat 6: Nusa Penida Jet
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Kusamba → Nusa Penida (Morning)', 'Kusamba Beach', 'Sampalan, Nusa Penida', '06:30', '06:50', 20, '{"economy":25}', 'active' FROM inv_items WHERE sku='SB-NPJ-006';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Nusa Penida → Kusamba (Afternoon)', 'Sampalan, Nusa Penida', 'Kusamba Beach', '17:00', '17:20', 20, '{"economy":25}', 'active' FROM inv_items WHERE sku='SB-NPJ-006';

-- Boat 7: Gili Getaway
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Padang Bai → Gili T (Morning)', 'Padang Bai Harbour', 'Gili Trawangan', '09:00', '11:30', 150, '{"economy":50,"business":20,"vip":10}', 'active' FROM inv_items WHERE sku='SB-GGA-007';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Padang Bai (Afternoon)', 'Gili Trawangan', 'Padang Bai Harbour', '14:00', '16:30', 150, '{"economy":50,"business":20,"vip":10}', 'active' FROM inv_items WHERE sku='SB-GGA-007';

-- Boat 8: Eka Jaya
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Padang Bai → Gili Air → Gili T', 'Padang Bai Harbour', 'Gili Trawangan', '08:30', '11:00', 150, '{"economy":50,"business":20}', 'active' FROM inv_items WHERE sku='SB-EJF-008';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Gili Air → Padang Bai', 'Gili Trawangan', 'Padang Bai Harbour', '13:30', '16:00', 150, '{"economy":50,"business":20}', 'active' FROM inv_items WHERE sku='SB-EJF-008';

-- Boat 9: Blue Water Express
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Serangan → Lombok → Gili T', 'Serangan Harbour', 'Gili Trawangan', '08:00', '11:00', 180, '{"economy":35,"vip":20}', 'active' FROM inv_items WHERE sku='SB-BWE-009';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Lombok → Serangan', 'Gili Trawangan', 'Serangan Harbour', '13:00', '16:00', 180, '{"economy":35,"vip":20}', 'active' FROM inv_items WHERE sku='SB-BWE-009';

-- Boat 10: Patagonia Xpress
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Amed → Gili T (Morning)', 'Amed Beach', 'Gili Trawangan', '09:00', '10:30', 90, '{"economy":40}', 'active' FROM inv_items WHERE sku='SB-PAX-010';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Amed (Afternoon)', 'Gili Trawangan', 'Amed Beach', '15:00', '16:30', 90, '{"economy":40}', 'active' FROM inv_items WHERE sku='SB-PAX-010';

-- Boat 11: Wahana Gili Ocean
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Padang Bai → Gili Air → Meno → T', 'Padang Bai Harbour', 'Gili Trawangan', '08:00', '10:30', 150, '{"economy":60,"business":30}', 'active' FROM inv_items WHERE sku='SB-WGO-011';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Meno → Air → Padang Bai', 'Gili Trawangan', 'Padang Bai Harbour', '14:30', '17:00', 150, '{"economy":60,"business":30}', 'active' FROM inv_items WHERE sku='SB-WGO-011';

-- Boat 12: Scoot Fast Cruises
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Gili T (Morning)', 'Sanur Harbour', 'Gili Trawangan', '09:30', '12:00', 150, '{"economy":60,"business":30,"vip":10}', 'active' FROM inv_items WHERE sku='SB-SFC-012';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Sanur (Afternoon)', 'Gili Trawangan', 'Sanur Harbour', '13:00', '15:30', 150, '{"economy":60,"business":30,"vip":10}', 'active' FROM inv_items WHERE sku='SB-SFC-012';

-- Boat 13: Rocky Fast Cruises
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Lembongan (Morning)', 'Sanur Harbour', 'Jungutbatu, Lembongan', '08:00', '08:30', 30, '{"economy":35,"business":10}', 'active' FROM inv_items WHERE sku='SB-RFC-013';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Lembongan → Sanur (Afternoon)', 'Jungutbatu, Lembongan', 'Sanur Harbour', '16:00', '16:30', 30, '{"economy":35,"business":10}', 'active' FROM inv_items WHERE sku='SB-RFC-013';

-- Boat 14: Lembongan Express
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Jungutbatu (Morning)', 'Sanur Harbour', 'Jungutbatu, Lembongan', '07:30', '08:05', 35, '{"economy":35}', 'active' FROM inv_items WHERE sku='SB-LBE-014';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Jungutbatu → Sanur (Afternoon)', 'Jungutbatu, Lembongan', 'Sanur Harbour', '15:30', '16:05', 35, '{"economy":35}', 'active' FROM inv_items WHERE sku='SB-LBE-014';

-- Boat 15: Bounty Cruises
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Benoa → Lembongan Day Cruise', 'Benoa Harbour', 'Lembongan Reef', '09:15', '10:00', 45, '{"economy":80,"vip":40}', 'active' FROM inv_items WHERE sku='SB-BNC-015';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Lembongan → Benoa Return', 'Lembongan Reef', 'Benoa Harbour', '16:00', '16:45', 45, '{"economy":80,"vip":40}', 'active' FROM inv_items WHERE sku='SB-BNC-015';

-- Boat 16: D Camel Fast Ferry
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Mushroom Bay (Morning)', 'Sanur Harbour', 'Mushroom Bay, Lembongan', '08:30', '09:00', 30, '{"economy":30}', 'active' FROM inv_items WHERE sku='SB-DCF-016';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Mushroom Bay → Sanur (Afternoon)', 'Mushroom Bay, Lembongan', 'Sanur Harbour', '16:30', '17:00', 30, '{"economy":30}', 'active' FROM inv_items WHERE sku='SB-DCF-016';

-- Boat 17: Coconut Island Boat
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Lembongan → Ceningan', 'Sanur Harbour', 'Nusa Ceningan', '07:45', '08:30', 45, '{"economy":28}', 'active' FROM inv_items WHERE sku='SB-CIB-017';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Ceningan → Lembongan → Sanur', 'Nusa Ceningan', 'Sanur Harbour', '15:30', '16:15', 45, '{"economy":28}', 'active' FROM inv_items WHERE sku='SB-CIB-017';

-- Boat 18: Mola Mola Express
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Lembongan Premium', 'Sanur Harbour', 'Jungutbatu, Lembongan', '09:00', '09:35', 35, '{"economy":25,"vip":15}', 'active' FROM inv_items WHERE sku='SB-MME-018';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Lembongan → Sanur Premium', 'Jungutbatu, Lembongan', 'Sanur Harbour', '16:00', '16:35', 35, '{"economy":25,"vip":15}', 'active' FROM inv_items WHERE sku='SB-MME-018';

-- Boat 19: Kila Fast Boat (3 schedules)
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Bangsal → Gili T (Morning)', 'Bangsal Harbour, Lombok', 'Gili Trawangan', '08:00', '08:15', 15, '{"economy":20}', 'active' FROM inv_items WHERE sku='SB-KFB-019';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Bangsal → Gili T (Midday)', 'Bangsal Harbour, Lombok', 'Gili Trawangan', '12:00', '12:15', 15, '{"economy":20}', 'active' FROM inv_items WHERE sku='SB-KFB-019';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Bangsal (Afternoon)', 'Gili Trawangan', 'Bangsal Harbour, Lombok', '17:00', '17:15', 15, '{"economy":20}', 'active' FROM inv_items WHERE sku='SB-KFB-019';

-- Boat 20: Lombok Strait Jet
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Teluk Nare → Gili Air → Gili T', 'Teluk Nare, Lombok', 'Gili Trawangan', '09:00', '09:30', 30, '{"economy":30}', 'active' FROM inv_items WHERE sku='SB-LSJ-020';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Gili Air → Teluk Nare', 'Gili Trawangan', 'Teluk Nare, Lombok', '16:00', '16:30', 30, '{"economy":30}', 'active' FROM inv_items WHERE sku='SB-LSJ-020';

-- Boat 21: Gili Shuttle (3 schedules)
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili Air → Meno → T (Morning)', 'Gili Air', 'Gili Trawangan', '08:00', '08:30', 30, '{"economy":15}', 'active' FROM inv_items WHERE sku='SB-GSE-021';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Meno → Air (Morning)', 'Gili Trawangan', 'Gili Air', '10:00', '10:30', 30, '{"economy":15}', 'active' FROM inv_items WHERE sku='SB-GSE-021';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili Air → Meno → T (Afternoon)', 'Gili Air', 'Gili Trawangan', '14:00', '14:30', 30, '{"economy":15}', 'active' FROM inv_items WHERE sku='SB-GSE-021';

-- Boat 22: Senggigi Sunset
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Senggigi → Gili T (Afternoon)', 'Senggigi, Lombok', 'Gili Trawangan', '14:00', '14:45', 45, '{"economy":25,"business":10}', 'active' FROM inv_items WHERE sku='SB-SSB-022';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Gili T → Senggigi (Evening)', 'Gili Trawangan', 'Senggigi, Lombok', '17:30', '18:15', 45, '{"economy":25,"business":10}', 'active' FROM inv_items WHERE sku='SB-SSB-022';

-- Boat 23: Komodo Jet
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Labuan Bajo → Komodo (Morning)', 'Labuan Bajo Harbour', 'Komodo Island', '07:00', '09:00', 120, '{"economy":25,"business":5}', 'active' FROM inv_items WHERE sku='SB-KJT-023';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Komodo → Labuan Bajo (Afternoon)', 'Komodo Island', 'Labuan Bajo Harbour', '15:00', '17:00', 120, '{"economy":25,"business":5}', 'active' FROM inv_items WHERE sku='SB-KJT-023';

-- Boat 24: Rinca Explorer
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Labuan Bajo → Rinca → Komodo', 'Labuan Bajo Harbour', 'Komodo Island', '06:30', '12:00', 330, '{"economy":15,"vip":10}', 'active' FROM inv_items WHERE sku='SB-REX-024';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Komodo → Rinca → Labuan Bajo', 'Komodo Island', 'Labuan Bajo Harbour', '13:00', '17:30', 270, '{"economy":15,"vip":10}', 'active' FROM inv_items WHERE sku='SB-REX-024';

-- Boat 25: Flores Sea Star
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Labuan Bajo → Padar → Pink Beach → Komodo', 'Labuan Bajo Harbour', 'Komodo Island', '06:00', '14:00', 480, '{"vip":20}', 'active' FROM inv_items WHERE sku='SB-FSS-025';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Komodo → Pink Beach → Padar → Labuan Bajo', 'Komodo Island', 'Labuan Bajo Harbour', '08:00', '16:00', 480, '{"vip":20}', 'active' FROM inv_items WHERE sku='SB-FSS-025';

-- Boat 26: Dragon Bay Cruise
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Labuan Bajo Sunset Cruise', 'Labuan Bajo Harbour', 'Kalong Island', '16:00', '19:00', 180, '{"vip":15}', 'active' FROM inv_items WHERE sku='SB-DBC-026';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Labuan Bajo Full Day Explorer', 'Labuan Bajo Harbour', 'Komodo Island', '07:00', '17:00', 600, '{"vip":15}', 'active' FROM inv_items WHERE sku='SB-DBC-026';

-- Boat 27: Nusa Islands Hopper
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sanur → Lembongan → Penida Circuit', 'Sanur Harbour', 'Toya Pakeh, Nusa Penida', '08:00', '10:30', 150, '{"economy":30,"business":15}', 'active' FROM inv_items WHERE sku='SB-NIH-027';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Penida → Lembongan → Sanur Circuit', 'Toya Pakeh, Nusa Penida', 'Sanur Harbour', '14:00', '16:30', 150, '{"economy":30,"business":15}', 'active' FROM inv_items WHERE sku='SB-NIH-027';

-- Boat 28: Bali Lombok Express
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Padang Bai → Bangsal (Morning)', 'Padang Bai Harbour', 'Bangsal, Lombok', '08:00', '09:30', 90, '{"economy":40,"business":20}', 'active' FROM inv_items WHERE sku='SB-BLE-028';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Bangsal → Padang Bai (Afternoon)', 'Bangsal, Lombok', 'Padang Bai Harbour', '14:00', '15:30', 90, '{"economy":40,"business":20}', 'active' FROM inv_items WHERE sku='SB-BLE-028';

-- Boat 29: Sumbawa Swift
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Lombok → Sumbawa (Morning)', 'Lembar, Lombok', 'Poto Tano, Sumbawa', '07:00', '09:00', 120, '{"economy":35}', 'active' FROM inv_items WHERE sku='SB-SWS-029';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sumbawa → Lombok (Afternoon)', 'Poto Tano, Sumbawa', 'Lembar, Lombok', '14:00', '16:00', 120, '{"economy":35}', 'active' FROM inv_items WHERE sku='SB-SWS-029';

-- Boat 30: Raja Ampat Flyer
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Sorong → Waisai (Morning)', 'Sorong Harbour', 'Waisai, Raja Ampat', '08:00', '10:00', 120, '{"economy":10,"vip":10}', 'active' FROM inv_items WHERE sku='SB-RAF-030';
INSERT INTO inv_item_schedules (item_id, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity_per_class, status)
SELECT id, 'Waisai → Sorong (Afternoon)', 'Waisai, Raja Ampat', 'Sorong Harbour', '14:00', '16:00', 120, '{"economy":10,"vip":10}', 'active' FROM inv_items WHERE sku='SB-RAF-030';

-- Generate 30 days of schedule occurrences for all schedules
INSERT INTO inv_schedule_occurrences (schedule_id, departure_date, departure_time, status)
SELECT s.id, d.dt, s.departure_time, 'scheduled'
FROM inv_item_schedules s
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', INTERVAL '1 day') AS d(dt);
