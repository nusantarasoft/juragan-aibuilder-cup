-- WMS Demo Seed Data
-- Run this AFTER running wms_putaway_pick_schema.sql and having warehouses/zones/bins set up
-- This creates sample bin contents, put-away tasks, and pick tasks

-- First, check if we have bins and items
DO $$
DECLARE
    v_bin_count INT;
    v_item_count INT;
    v_zone_id UUID;
    v_wh_id UUID;
    v_bin_ids UUID[];
    v_bin_codes TEXT[];
    v_item_ids UUID[];
    v_item_names TEXT[];
BEGIN
    SELECT count(*) INTO v_bin_count FROM inv_bins;
    SELECT count(*) INTO v_item_count FROM inv_items;
    
    IF v_bin_count = 0 OR v_item_count = 0 THEN
        RAISE NOTICE 'No bins or items found. Skipping WMS seed data.';
        RETURN;
    END IF;

    -- Get first warehouse
    SELECT id INTO v_wh_id FROM inv_warehouses LIMIT 1;
    
    -- Get first zone
    SELECT id INTO v_zone_id FROM inv_zones WHERE warehouse_id = v_wh_id LIMIT 1;
    IF v_zone_id IS NULL THEN
        SELECT id INTO v_zone_id FROM inv_zones LIMIT 1;
    END IF;

    -- Get up to 10 bins
    SELECT array_agg(id), array_agg(code)
    INTO v_bin_ids, v_bin_codes
    FROM (SELECT id, code FROM inv_bins ORDER BY code LIMIT 10) sub;

    -- Get up to 10 items
    SELECT array_agg(id), array_agg(name)
    INTO v_item_ids, v_item_names
    FROM (SELECT id, name FROM inv_items ORDER BY name LIMIT 10) sub;

    -- Seed bin contents (items in bins)
    IF array_length(v_bin_ids, 1) >= 3 AND array_length(v_item_ids, 1) >= 3 THEN
        INSERT INTO inv_bin_contents (tenant_id, bin_id, item_id, quantity, uom)
        VALUES 
            ('default', v_bin_ids[1], v_item_ids[1], 25, 'pcs'),
            ('default', v_bin_ids[2], v_item_ids[2], 50, 'pcs'),
            ('default', v_bin_ids[3], v_item_ids[3], 15, 'pcs')
        ON CONFLICT DO NOTHING;

        -- Mark those bins as occupied
        UPDATE inv_bins SET is_occupied = true, current_item_count = 1, status = 'occupied'
        WHERE id IN (v_bin_ids[1], v_bin_ids[2], v_bin_ids[3]);
    END IF;

    -- Seed put-away tasks
    IF array_length(v_bin_ids, 1) >= 6 AND array_length(v_item_ids, 1) >= 6 THEN
        -- Completed put-away
        INSERT INTO inv_putaway_tasks (
            tenant_id, task_number, warehouse_id, item_id, item_name, quantity, uom,
            suggested_bin_id, suggested_bin_code, actual_bin_id, actual_bin_code,
            status, priority, started_at, completed_at
        ) VALUES (
            'default', 'PA-2026-0001', v_wh_id, v_item_ids[1],
            v_item_names[1], 25, 'pcs',
            v_bin_ids[1], v_bin_codes[1], v_bin_ids[1], v_bin_codes[1],
            'completed', 'medium',
            NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'
        ) ON CONFLICT DO NOTHING;

        -- In-progress put-away
        INSERT INTO inv_putaway_tasks (
            tenant_id, task_number, warehouse_id, item_id, item_name, quantity, uom,
            suggested_bin_id, suggested_bin_code,
            status, priority, started_at
        ) VALUES (
            'default', 'PA-2026-0002', v_wh_id, v_item_ids[4],
            v_item_names[4], 30, 'pcs',
            v_bin_ids[4], v_bin_codes[4],
            'in_progress', 'high',
            NOW() - INTERVAL '30 minutes'
        ) ON CONFLICT DO NOTHING;

        -- Pending put-away tasks
        INSERT INTO inv_putaway_tasks (
            tenant_id, task_number, warehouse_id, item_id, item_name, quantity, uom,
            suggested_bin_id, suggested_bin_code,
            status, priority
        ) VALUES 
        (
            'default', 'PA-2026-0003', v_wh_id, v_item_ids[5],
            v_item_names[5], 20, 'pcs',
            v_bin_ids[5], v_bin_codes[5],
            'pending', 'medium'
        ),
        (
            'default', 'PA-2026-0004', v_wh_id, v_item_ids[6],
            v_item_names[6], 100, 'pcs',
            v_bin_ids[6], v_bin_codes[6],
            'pending', 'low'
        ) ON CONFLICT DO NOTHING;
    END IF;

    -- Seed pick tasks
    IF array_length(v_bin_ids, 1) >= 3 AND array_length(v_item_ids, 1) >= 3 THEN
        -- Completed pick
        INSERT INTO inv_pick_tasks (
            tenant_id, task_number, warehouse_id, item_id, item_name,
            quantity, picked_quantity, uom,
            from_bin_id, from_bin_code,
            order_reference, status, priority,
            started_at, completed_at
        ) VALUES (
            'default', 'PK-2026-0001', v_wh_id, v_item_ids[2],
            v_item_names[2], 10, 10, 'pcs',
            v_bin_ids[2], v_bin_codes[2],
            'SO-2026-001', 'completed', 'high',
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours'
        ) ON CONFLICT DO NOTHING;

        -- In-progress pick
        INSERT INTO inv_pick_tasks (
            tenant_id, task_number, warehouse_id, item_id, item_name,
            quantity, uom, from_bin_id, from_bin_code,
            order_reference, status, priority, started_at
        ) VALUES (
            'default', 'PK-2026-0002', v_wh_id, v_item_ids[1],
            v_item_names[1], 5, 'pcs',
            v_bin_ids[1], v_bin_codes[1],
            'SO-2026-002', 'in_progress', 'urgent',
            NOW() - INTERVAL '15 minutes'
        ) ON CONFLICT DO NOTHING;

        -- Pending pick tasks
        INSERT INTO inv_pick_tasks (
            tenant_id, task_number, warehouse_id, item_id, item_name,
            quantity, uom, from_bin_id, from_bin_code,
            order_reference, status, priority
        ) VALUES 
        (
            'default', 'PK-2026-0003', v_wh_id, v_item_ids[3],
            v_item_names[3], 8, 'pcs',
            v_bin_ids[3], v_bin_codes[3],
            'SO-2026-003', 'pending', 'medium'
        ),
        (
            'default', 'PK-2026-0004', v_wh_id, v_item_ids[2],
            v_item_names[2], 15, 'pcs',
            v_bin_ids[2], v_bin_codes[2],
            'SO-2026-004', 'pending', 'low'
        ) ON CONFLICT DO NOTHING;

        -- Short-picked task
        INSERT INTO inv_pick_tasks (
            tenant_id, task_number, warehouse_id, item_id, item_name,
            quantity, picked_quantity, uom,
            from_bin_id, from_bin_code,
            order_reference, status, priority,
            started_at, completed_at
        ) VALUES (
            'default', 'PK-2026-0005', v_wh_id, v_item_ids[3],
            v_item_names[3], 20, 12, 'pcs',
            v_bin_ids[3], v_bin_codes[3],
            'SO-2026-005', 'short_picked', 'high',
            NOW() - INTERVAL '1 hour', NOW() - INTERVAL '45 minutes'
        ) ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'WMS seed data created successfully!';
END $$;
