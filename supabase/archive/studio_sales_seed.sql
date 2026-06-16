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
