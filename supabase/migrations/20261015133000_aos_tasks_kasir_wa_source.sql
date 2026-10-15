-- F1-3: allow WA kasir mirror tasks (source kasir_wa)
ALTER TABLE aos_tasks DROP CONSTRAINT IF EXISTS aos_tasks_source_check;
ALTER TABLE aos_tasks ADD CONSTRAINT aos_tasks_source_check
    CHECK (source IN ('manual', 'dispatch', 'routine', 'workflow', 'autopilot', 'seed', 'kasir_wa'));
