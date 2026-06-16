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
