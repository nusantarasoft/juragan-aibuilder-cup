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
