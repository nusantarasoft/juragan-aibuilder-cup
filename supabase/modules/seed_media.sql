-- Insert media records for speedboat images and link to items

-- 1. Create media records (6 images)
INSERT INTO media (id, filename, original_name, s3_key, url, mime_type, size_bytes, alt_text, bucket_name, created_at, updated_at) VALUES
('a1000001-0001-4000-b000-000000000001', 'speedboat-bali-penida.png', 'speedboat-bali-penida.png', 'inventory/speedboat-bali-penida.png', 'http://localhost:9000/b-01/inventory/speedboat-bali-penida.png', 'image/png', 94208, 'Speedboat cruising in crystal clear turquoise waters near Nusa Penida, Bali', 'b-01', NOW(), NOW()),
('a1000001-0002-4000-b000-000000000002', 'speedboat-gili-islands.png', 'speedboat-gili-islands.png', 'inventory/speedboat-gili-islands.png', 'http://localhost:9000/b-01/inventory/speedboat-gili-islands.png', 'image/png', 102400, 'Fast boat cruising between Gili Islands with white sandy beaches', 'b-01', NOW(), NOW()),
('a1000001-0003-4000-b000-000000000003', 'speedboat-lembongan.png', 'speedboat-lembongan.png', 'inventory/speedboat-lembongan.png', 'http://localhost:9000/b-01/inventory/speedboat-lembongan.png', 'image/png', 98304, 'Speedboat approaching Nusa Lembongan harbour with cliff coastline', 'b-01', NOW(), NOW()),
('a1000001-0004-4000-b000-000000000004', 'speedboat-lombok-shuttle.png', 'speedboat-lombok-shuttle.png', 'inventory/speedboat-lombok-shuttle.png', 'http://localhost:9000/b-01/inventory/speedboat-lombok-shuttle.png', 'image/png', 90112, 'Speedboat shuttle near Lombok beach pier with Mount Rinjani', 'b-01', NOW(), NOW()),
('a1000001-0005-4000-b000-000000000005', 'speedboat-komodo-flores.png', 'speedboat-komodo-flores.png', 'inventory/speedboat-komodo-flores.png', 'http://localhost:9000/b-01/inventory/speedboat-komodo-flores.png', 'image/png', 106496, 'Premium speedboat near Komodo Island with pink sand beach', 'b-01', NOW(), NOW()),
('a1000001-0006-4000-b000-000000000006', 'speedboat-raja-ampat.png', 'speedboat-raja-ampat.png', 'inventory/speedboat-raja-ampat.png', 'http://localhost:9000/b-01/inventory/speedboat-raja-ampat.png', 'image/png', 118784, 'Luxury speedboat in turquoise waters of Raja Ampat with limestone islands', 'b-01', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Link media to items (media_ids array)
-- Bali <> Nusa Penida (boats 1-6) -> bali-penida image
UPDATE inv_items SET media_ids = '["a1000001-0001-4000-b000-000000000001"]'
WHERE sku IN ('SB-MEX-001', 'SB-MEX-002', 'SB-ABF-003', 'SB-PWR-004', 'SB-CBE-005', 'SB-NPJ-006');

-- Bali <> Gili Islands (boats 7-12) -> gili-islands image
UPDATE inv_items SET media_ids = '["a1000001-0002-4000-b000-000000000002"]'
WHERE sku IN ('SB-GGA-007', 'SB-EJF-008', 'SB-BWE-009', 'SB-PAX-010', 'SB-WGO-011', 'SB-SFC-012');

-- Bali <> Lembongan (boats 13-18) -> lembongan image
UPDATE inv_items SET media_ids = '["a1000001-0003-4000-b000-000000000003"]'
WHERE sku IN ('SB-RFC-013', 'SB-LBE-014', 'SB-BNC-015', 'SB-DCF-016', 'SB-CIB-017', 'SB-MME-018');

-- Lombok <> Gili (boats 19-22) -> lombok-shuttle image
UPDATE inv_items SET media_ids = '["a1000001-0004-4000-b000-000000000004"]'
WHERE sku IN ('SB-KFB-019', 'SB-LSJ-020', 'SB-GSE-021', 'SB-SSB-022');

-- Flores <> Komodo (boats 23-26) -> komodo-flores image
UPDATE inv_items SET media_ids = '["a1000001-0005-4000-b000-000000000005"]'
WHERE sku IN ('SB-KJT-023', 'SB-REX-024', 'SB-FSS-025', 'SB-DBC-026');

-- Long distance: Nusa Hopper + Bali-Lombok get penida, Sumbawa gets lombok, Raja Ampat gets raja-ampat
UPDATE inv_items SET media_ids = '["a1000001-0001-4000-b000-000000000001"]' WHERE sku = 'SB-NIH-027';
UPDATE inv_items SET media_ids = '["a1000001-0002-4000-b000-000000000002"]' WHERE sku = 'SB-BLE-028';
UPDATE inv_items SET media_ids = '["a1000001-0004-4000-b000-000000000004"]' WHERE sku = 'SB-SWS-029';
UPDATE inv_items SET media_ids = '["a1000001-0006-4000-b000-000000000006"]' WHERE sku = 'SB-RAF-030';
