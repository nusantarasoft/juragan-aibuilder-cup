-- ═══════════════════════════════════════════════════════
-- Stock Opname — Seed Data
-- ═══════════════════════════════════════════════════════

-- Sessions
INSERT INTO inv_opname_sessions (tenant_id, session_code, title, warehouse_id, warehouse_name, counted_by, reviewed_by, scheduled_date, started_at, completed_at, total_items, items_counted, total_variance_qty, total_variance_value, notes, status)
SELECT 'default', v.session_code, v.title, w.id, w.name,
       v.counted_by, v.reviewed_by, v.scheduled_date::date,
       CASE WHEN v.started_at IS NOT NULL THEN v.started_at::timestamptz ELSE NULL END,
       CASE WHEN v.completed_at IS NOT NULL THEN v.completed_at::timestamptz ELSE NULL END,
       v.total_items, v.items_counted, v.total_variance_qty, v.total_variance_value, v.notes, v.status
FROM (VALUES
    ('OPN-2026-001', 'Q1 Full Warehouse Audit — Denpasar', 'WH-DPS-01', 'Ketut Wirawan', 'Made Suardana', '2026-01-15', '2026-01-15T08:00:00+08:00', '2026-01-17T16:30:00+08:00', 5, 5, -3, -540000, 'Quarterly audit completed', 'completed'),
    ('OPN-2026-002', 'March Spot Check — Surabaya DC', 'WH-SBY-01', 'Budi Santoso', NULL, '2026-03-20', '2026-03-20T09:00:00+08:00', NULL, 4, 2, 0, 0, 'Spot check in progress', 'counting'),
    ('OPN-2026-003', 'Q2 Cold Storage Audit — Denpasar', 'WH-DPS-02', 'Made Suardana', NULL, '2026-04-01', NULL, NULL, 3, 0, 0, 0, 'Scheduled for April', 'draft')
) AS v(session_code, title, wh_code, counted_by, reviewed_by, scheduled_date, started_at, completed_at, total_items, items_counted, total_variance_qty, total_variance_value, notes, status)
JOIN inv_warehouses w ON w.code = v.wh_code
ON CONFLICT DO NOTHING;

-- Lines for Session 1 (Completed — all counted)
INSERT INTO inv_opname_lines (session_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
SELECT s.id, v.item_name, v.item_sku, v.zone_name, v.bin_code, v.uom, v.system_qty, v.actual_qty, v.unit_cost,
       v.counted_at::timestamptz, v.counted_by, v.notes, v.status, v.sort_order
FROM inv_opname_sessions s
CROSS JOIN (VALUES
    ('Marine Paint - Anti Fouling', 'CHM-PAF-001', 'Bulk Storage A', 'BLK-A-01-1L', 'ltr', 120, 118, 180000, '2026-01-15T10:15:00+08:00', 'Ketut Wirawan', '2 ltrs damaged in transit', 'counted', 1),
    ('Stainless Steel Bolts M12', 'FST-SSB-M12', 'Bulk Storage B', 'BLK-B-01-1L', 'pcs', 500, 498, 22000, '2026-01-15T11:00:00+08:00', 'Ketut Wirawan', '2 missing — possible mis-pick', 'discrepancy', 2),
    ('Engine Block Casting', 'ENG-BLK-200', 'Receiving Area A', 'RCV-A-01', 'pcs', 3, 3, 5000000, '2026-01-15T13:30:00+08:00', 'Ketut Wirawan', 'Count matches', 'verified', 3),
    ('Cylinder Liner Set', 'ENG-CYL-SET', 'Bulk Storage A', 'BLK-A-01-1L', 'pcs', 12, 11, 750000, '2026-01-16T09:00:00+08:00', 'Ketut Wirawan', '1 unit unaccounted', 'discrepancy', 4),
    ('Piston Assembly', 'ENG-PST-200', 'Bulk Storage A', 'BLK-A-01-1L', 'pcs', 8, 8, 450000, '2026-01-16T10:30:00+08:00', 'Ketut Wirawan', 'OK', 'verified', 5)
) AS v(item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
WHERE s.session_code = 'OPN-2026-001'
ON CONFLICT DO NOTHING;

-- Lines for Session 2 (Counting — 2 of 4 counted)
INSERT INTO inv_opname_lines (session_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
SELECT s.id, v.item_name, v.item_sku, v.zone_name, v.bin_code, v.uom, v.system_qty, v.actual_qty, v.unit_cost,
       CASE WHEN v.counted_at IS NOT NULL THEN v.counted_at::timestamptz ELSE NULL END,
       v.counted_by, v.notes, v.status, v.sort_order
FROM inv_opname_sessions s
CROSS JOIN (VALUES
    ('Steel Plate 10mm Marine Grade', 'STL-PLT-10M', 'Receiving Bay', 'RCV-B-01', 'sheet', 48, 48, 850000, '2026-03-20T10:00:00+08:00', 'Budi Santoso', 'Full count verified', 'counted', 1),
    ('Steel Frame Profile L80', 'STL-FRM-L80', 'Receiving Bay', 'RCV-B-01', 'pcs', 72, 70, 250000, '2026-03-20T11:30:00+08:00', 'Budi Santoso', '2 pcs short', 'counted', 2),
    ('Welding Wire ER70S-6', 'WLD-WIR-70S', 'Packing Zone', 'PCK-A-01', 'kg', 30, NULL, 120000, NULL, NULL, 'Pending count', 'pending', 3),
    ('Marine Primer Coat', 'CHM-PRM-001', 'Packing Zone', 'PCK-A-01', 'ltr', 40, NULL, 190000, NULL, NULL, 'Pending count', 'pending', 4)
) AS v(item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, counted_at, counted_by, notes, status, sort_order)
WHERE s.session_code = 'OPN-2026-002'
ON CONFLICT DO NOTHING;

-- Lines for Session 3 (Draft — no counts yet)
INSERT INTO inv_opname_lines (session_id, item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, notes, status, sort_order)
SELECT s.id, v.item_name, v.item_sku, v.zone_name, v.bin_code, v.uom, v.system_qty, v.actual_qty, v.unit_cost, v.notes, v.status, v.sort_order
FROM inv_opname_sessions s
CROSS JOIN (VALUES
    ('Temperature-Sensitive Sealant', 'CHM-TSS-001', 'Cold Room A', 'CLD-A-01', 'pcs', 60, NULL, 95000, 'For cold storage items', 'pending', 1),
    ('GPS Chartplotter Unit', 'NAV-GPS-12', 'Cold Room A', 'CLD-A-01', 'pcs', 4, NULL, 4500000, 'High value item', 'pending', 2),
    ('Marine VHF Radio', 'NAV-VHF-25W', 'Cold Room A', 'CLD-A-01', 'pcs', 6, NULL, 1800000, 'Verify serial numbers', 'pending', 3)
) AS v(item_name, item_sku, zone_name, bin_code, uom, system_qty, actual_qty, unit_cost, notes, status, sort_order)
WHERE s.session_code = 'OPN-2026-003'
ON CONFLICT DO NOTHING;
