-- Procurement Seed Data
-- 10 Suppliers for speedboat/marine industry

INSERT INTO inv_suppliers (tenant_id, code, name, contact_person, email, phone, address, city, country, tax_id, payment_terms, currency, rating, lead_time_days, tags, status) VALUES
('default', 'SUP-001', 'PT Berlian Marine Parts', 'Budi Santoso', 'budi@berlianmarine.co.id', '+62-361-555-0101', 'Jl. Pelabuhan No. 45', 'Denpasar', 'Indonesia', '01.234.567.8-901.000', 'Net 30', 'IDR', 4.5, 7, '["marine","parts","engine"]', 'active'),
('default', 'SUP-002', 'Yamaha Marine Indonesia', 'Rina Wijaya', 'rina@yamaha-marine.co.id', '+62-21-555-0202', 'Jl. Industri Raya No. 12', 'Jakarta', 'Indonesia', '02.345.678.9-012.000', 'Net 60', 'IDR', 4.8, 14, '["engine","outboard","yamaha"]', 'active'),
('default', 'SUP-003', 'CV Samudera Fuel Supply', 'Agus Setiawan', 'agus@samuderafuel.co.id', '+62-361-555-0303', 'Jl. Benoa Harbor No. 8', 'Denpasar', 'Indonesia', '03.456.789.0-123.000', 'COD', 'IDR', 4.2, 1, '["fuel","diesel","marine"]', 'active'),
('default', 'SUP-004', 'PT Safety Marine Equipment', 'Dewi Lestari', 'dewi@safetymarine.co.id', '+62-31-555-0404', 'Jl. Rungkut Industri No. 22', 'Surabaya', 'Indonesia', '04.567.890.1-234.000', 'Net 30', 'IDR', 4.0, 10, '["safety","lifejacket","equipment"]', 'active'),
('default', 'SUP-005', 'Garuda Fiberglass Co.', 'Hendra Kurniawan', 'hendra@garudafg.co.id', '+62-361-555-0505', 'Jl. Bypass Ngurah Rai No. 67', 'Denpasar', 'Indonesia', '05.678.901.2-345.000', 'Net 45', 'IDR', 3.8, 21, '["fiberglass","hull","repair"]', 'active'),
('default', 'SUP-006', 'Neptune Navigation Systems', 'Alex Chen', 'alex@neptune-nav.com', '+65-555-0606', '10 Harbour Front Walk', 'Singapore', 'Singapore', 'SG-789012', 'Net 30', 'USD', 4.7, 14, '["gps","navigation","electronics"]', 'active'),
('default', 'SUP-007', 'CV Bali Cushion & Upholstery', 'Made Suardana', 'made@balicushion.co.id', '+62-361-555-0707', 'Jl. Sunset Road No. 15', 'Kuta', 'Indonesia', '07.890.123.4-567.000', 'Net 15', 'IDR', 4.3, 5, '["cushion","upholstery","interior"]', 'active'),
('default', 'SUP-008', 'PT Anchor Chain & Rope', 'Wawan Hermawan', 'wawan@anchorchain.co.id', '+62-21-555-0808', 'Jl. Tanjung Priok No. 33', 'Jakarta', 'Indonesia', '08.901.234.5-678.000', 'Net 30', 'IDR', 3.9, 7, '["anchor","chain","rope","mooring"]', 'active'),
('default', 'SUP-009', 'Australian Marine Paints', 'Sarah Johnson', 'sarah@ausmarinepaints.com.au', '+61-2-555-0909', '42 Marine Drive', 'Sydney', 'Australia', 'AU-345678', 'Net 45', 'AUD', 4.6, 30, '["paint","antifouling","coating"]', 'active'),
('default', 'SUP-010', 'PT Electrical Marine Systems', 'Irfan Hakim', 'irfan@elecmarine.co.id', '+62-31-555-1010', 'Jl. Industri Timur No. 55', 'Surabaya', 'Indonesia', '10.012.345.6-789.000', 'Net 30', 'IDR', 4.1, 10, '["electrical","wiring","battery","solar"]', 'active');

-- 5 Purchase Requisitions
INSERT INTO inv_purchase_requisitions (tenant_id, pr_number, title, description, requested_by, department, priority, required_date, total_estimated, currency, status, created_at) VALUES
('default', 'PR-2026-001', 'Monthly Engine Spare Parts', 'Routine monthly order for engine maintenance spare parts', 'Kadek Ayu', 'Operations', 'normal', '2026-04-10', 45000000, 'IDR', 'approved', '2026-03-01'),
('default', 'PR-2026-002', 'Safety Equipment Replenishment', 'Replace expired life jackets and fire extinguishers', 'Wayan Darma', 'Safety', 'high', '2026-04-05', 28000000, 'IDR', 'approved', '2026-03-05'),
('default', 'PR-2026-003', 'Navigation System Upgrade', 'Upgrade GPS and radar for 5 speedboats', 'Bagus Mahendra', 'Fleet Management', 'normal', '2026-04-20', 125000000, 'IDR', 'pending_approval', '2026-03-10'),
('default', 'PR-2026-004', 'Hull Maintenance Materials', 'Fiberglass repair kits and antifouling paint', 'Nyoman Astra', 'Maintenance', 'low', '2026-05-01', 35000000, 'IDR', 'draft', '2026-03-15'),
('default', 'PR-2026-005', 'Fuel Stock - April', 'Monthly diesel fuel procurement for fleet', 'Kadek Ayu', 'Operations', 'urgent', '2026-04-01', 180000000, 'IDR', 'approved', '2026-03-20');

-- 5 Purchase Orders (linked to PRs and suppliers)
INSERT INTO inv_purchase_orders (tenant_id, po_number, pr_id, supplier_id, title, payment_terms, expected_delivery, subtotal, tax_amount, total_amount, currency, status, created_at) VALUES
('default', 'PO-2026-001', (SELECT id FROM inv_purchase_requisitions WHERE pr_number='PR-2026-001'), (SELECT id FROM inv_suppliers WHERE code='SUP-002'), 'Engine Spare Parts - Yamaha', 'Net 60', '2026-04-10', 40000000, 4400000, 44400000, 'IDR', 'confirmed', '2026-03-03'),
('default', 'PO-2026-002', (SELECT id FROM inv_purchase_requisitions WHERE pr_number='PR-2026-002'), (SELECT id FROM inv_suppliers WHERE code='SUP-004'), 'Safety Equipment Order', 'Net 30', '2026-04-05', 25000000, 2750000, 27750000, 'IDR', 'sent', '2026-03-07'),
('default', 'PO-2026-003', (SELECT id FROM inv_purchase_requisitions WHERE pr_number='PR-2026-005'), (SELECT id FROM inv_suppliers WHERE code='SUP-003'), 'Diesel Fuel - April Supply', 'COD', '2026-04-01', 175000000, 0, 175000000, 'IDR', 'confirmed', '2026-03-22'),
('default', 'PO-2026-004', NULL, (SELECT id FROM inv_suppliers WHERE code='SUP-001'), 'Propeller & Impeller Set', 'Net 30', '2026-04-15', 18000000, 1980000, 19980000, 'IDR', 'draft', '2026-03-24'),
('default', 'PO-2026-005', NULL, (SELECT id FROM inv_suppliers WHERE code='SUP-007'), 'Seat Cushion Replacement', 'Net 15', '2026-04-08', 12000000, 1320000, 13320000, 'IDR', 'sent', '2026-03-20');

-- 3 GRNs
INSERT INTO inv_goods_received_notes (tenant_id, grn_number, po_id, supplier_id, received_by, received_date, warehouse_id, delivery_note_number, quality_check, status, created_at) VALUES
('default', 'GRN-2026-001', (SELECT id FROM inv_purchase_orders WHERE po_number='PO-2026-001'), (SELECT id FROM inv_suppliers WHERE code='SUP-002'), 'Ketut Wirawan', '2026-03-25', 'default', 'DN-YMH-20260325', 'passed', 'accepted', '2026-03-25'),
('default', 'GRN-2026-002', (SELECT id FROM inv_purchase_orders WHERE po_number='PO-2026-003'), (SELECT id FROM inv_suppliers WHERE code='SUP-003'), 'Kadek Ayu', '2026-03-25', 'default', 'DN-SMF-20260325', 'passed', 'accepted', '2026-03-25'),
('default', 'GRN-2026-003', (SELECT id FROM inv_purchase_orders WHERE po_number='PO-2026-005'), (SELECT id FROM inv_suppliers WHERE code='SUP-007'), 'Wayan Darma', '2026-03-24', 'default', 'DN-BLC-20260324', 'partial', 'inspecting', '2026-03-24');
