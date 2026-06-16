-- ═══════════════════════════════════════════════════════
-- Manufacturing Module — Seed Data
-- ═══════════════════════════════════════════════════════

-- BOMs
INSERT INTO mfg_boms (tenant_id, code, name, version, product_name, product_sku, description, uom, yield_qty, labor_hours, labor_cost, overhead_cost, total_material_cost, total_cost, status)
VALUES
    ('default', 'BOM-ENG-001', 'Marine Diesel Engine Assembly', '2.1', 'Marine Diesel Engine 200HP', 'ENG-200HP', 'Complete assembly BOM for 200HP marine diesel engine including all sub-components', 'unit', 1, 40, 2400000, 800000, 15000000, 18200000, 'active'),
    ('default', 'BOM-HULL-001', 'Steel Hull Section - Bow', '1.3', 'Bow Hull Section 12m', 'HULL-BOW-12', 'Fabrication BOM for 12-meter bow hull section with steel plating and frame', 'unit', 1, 120, 7200000, 2500000, 35000000, 44700000, 'active'),
    ('default', 'BOM-NAV-001', 'Navigation Console Assembly', '1.0', 'Nav Console Type-A', 'NAV-CON-A', 'Assembly BOM for bridge navigation console including instruments and wiring', 'unit', 1, 16, 960000, 400000, 8500000, 9860000, 'draft')
ON CONFLICT DO NOTHING;

-- BOM Lines for Marine Engine
INSERT INTO mfg_bom_lines (bom_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
SELECT b.id, v.item_name, v.item_sku, v.quantity, v.uom, v.unit_cost, v.total_cost, v.scrap_pct, v.sort_order
FROM mfg_boms b
CROSS JOIN (VALUES
    ('Engine Block Casting', 'ENG-BLK-200', 1, 'pcs', 5000000, 5000000, 2.0, 1),
    ('Cylinder Liner Set', 'ENG-CYL-SET', 4, 'pcs', 750000, 3000000, 1.5, 2),
    ('Piston Assembly', 'ENG-PST-200', 4, 'pcs', 450000, 1800000, 1.0, 3),
    ('Crankshaft Forging', 'ENG-CRK-200', 1, 'pcs', 3200000, 3200000, 0.5, 4),
    ('Marine Paint - Anti Fouling', 'CHM-PAF-001', 5, 'ltr', 180000, 900000, 5.0, 5),
    ('Stainless Steel Bolts M12', 'FST-SSB-M12', 48, 'pcs', 22000, 1056000, 3.0, 6)
) AS v(item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
WHERE b.code = 'BOM-ENG-001'
ON CONFLICT DO NOTHING;

-- BOM Lines for Hull Section
INSERT INTO mfg_bom_lines (bom_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
SELECT b.id, v.item_name, v.item_sku, v.quantity, v.uom, v.unit_cost, v.total_cost, v.scrap_pct, v.sort_order
FROM mfg_boms b
CROSS JOIN (VALUES
    ('Steel Plate 10mm Marine Grade', 'STL-PLT-10M', 24, 'sheet', 850000, 20400000, 5.0, 1),
    ('Steel Frame Profile L80', 'STL-FRM-L80', 36, 'pcs', 250000, 9000000, 3.0, 2),
    ('Welding Wire ER70S-6', 'WLD-WIR-70S', 15, 'kg', 120000, 1800000, 10.0, 3),
    ('Marine Primer Coat', 'CHM-PRM-001', 20, 'ltr', 190000, 3800000, 5.0, 4)
) AS v(item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
WHERE b.code = 'BOM-HULL-001'
ON CONFLICT DO NOTHING;

-- BOM Lines for Nav Console
INSERT INTO mfg_bom_lines (bom_id, item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
SELECT b.id, v.item_name, v.item_sku, v.quantity, v.uom, v.unit_cost, v.total_cost, v.scrap_pct, v.sort_order
FROM mfg_boms b
CROSS JOIN (VALUES
    ('GPS Chartplotter Unit', 'NAV-GPS-12', 1, 'pcs', 4500000, 4500000, 0.0, 1),
    ('Marine VHF Radio', 'NAV-VHF-25W', 1, 'pcs', 1800000, 1800000, 0.0, 2),
    ('Console Housing Fiberglass', 'NAV-HSG-A', 1, 'pcs', 1200000, 1200000, 2.0, 3),
    ('Marine Cable Harness', 'ELC-CBL-NAV', 1, 'set', 650000, 650000, 1.0, 4),
    ('Toggle Switch Panel', 'ELC-SWT-8P', 1, 'pcs', 350000, 350000, 0.0, 5)
) AS v(item_name, item_sku, quantity, uom, unit_cost, total_cost, scrap_pct, sort_order)
WHERE b.code = 'BOM-NAV-001'
ON CONFLICT DO NOTHING;

-- Work Orders
INSERT INTO mfg_work_orders (tenant_id, wo_number, bom_id, bom_name, warehouse_id, warehouse_name, planned_qty, completed_qty, uom, priority, assigned_to, planned_start, planned_end, actual_start, estimated_cost, actual_cost, notes, status)
SELECT 'default', v.wo_number, b.id, b.name, w.id, w.name,
       v.planned_qty, v.completed_qty, v.uom, v.priority, v.assigned_to,
       v.planned_start::date, v.planned_end::date,
       CASE WHEN v.actual_start IS NOT NULL THEN v.actual_start::timestamptz ELSE NULL END,
       v.estimated_cost, v.actual_cost, v.notes, v.status
FROM (VALUES
    ('WO-2026-001', 'BOM-ENG-001', 'WH-DPS-01', 2, 1, 'unit', 'high', 'Ketut Wirawan', '2026-03-01', '2026-03-20', '2026-03-02T08:00:00+08:00', 36400000, 18500000, 'Engine batch #1 — 1 of 2 completed', 'in_progress'),
    ('WO-2026-002', 'BOM-HULL-001', 'WH-SBY-01', 1, 0, 'unit', 'urgent', 'Budi Santoso', '2026-03-10', '2026-04-15', NULL, 44700000, 0, 'Hull section for vessel KM Nusantara', 'planned'),
    ('WO-2026-003', 'BOM-ENG-001', 'WH-DPS-01', 1, 1, 'unit', 'normal', 'Made Suardana', '2026-02-01', '2026-02-20', '2026-02-02T07:30:00+08:00', 18200000, 17800000, 'Engine for patrol boat PB-07', 'completed'),
    ('WO-2026-004', 'BOM-NAV-001', 'WH-DPS-01', 3, 0, 'unit', 'low', 'Ketut Wirawan', '2026-04-01', '2026-04-10', NULL, 29580000, 0, 'Nav consoles for fleet upgrade', 'draft')
) AS v(wo_number, bom_code, wh_code, planned_qty, completed_qty, uom, priority, assigned_to, planned_start, planned_end, actual_start, estimated_cost, actual_cost, notes, status)
JOIN mfg_boms b ON b.code = v.bom_code
JOIN inv_warehouses w ON w.code = v.wh_code
ON CONFLICT DO NOTHING;
