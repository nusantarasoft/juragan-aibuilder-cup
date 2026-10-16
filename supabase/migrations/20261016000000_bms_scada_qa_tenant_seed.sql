-- QA / default tenant facility telemetry for BMS + SCADA GraphQL (tenant matches admin DEFAULT_TENANT_ID)

INSERT INTO bms_systems (id, tenant_id, name, system_type, status)
VALUES
    ('55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000010', 'Main HVAC System', 'hvac', 'operational'),
    ('55555555-5555-5555-5555-555555555552', '00000000-0000-0000-0000-000000000010', 'Smart Lighting System', 'lighting', 'operational')
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    system_type = EXCLUDED.system_type,
    status = EXCLUDED.status;

INSERT INTO bms_zones (id, tenant_id, system_id, name, floor, status)
VALUES
    ('66666666-6666-6666-6666-666666666661', '00000000-0000-0000-0000-000000000010', '55555555-5555-5555-5555-555555555551', 'Executive Boardroom AC', 'Floor 3', 'active'),
    ('66666666-6666-6666-6666-666666666662', '00000000-0000-0000-0000-000000000010', '55555555-5555-5555-5555-555555555552', 'Data Hall Corridors', 'Floor 1', 'active')
ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name;

INSERT INTO scada_data_sources (id, tenant_id, name, protocol, host, port, status)
VALUES
    ('77777777-7777-7777-7777-777777777771', '00000000-0000-0000-0000-000000000010', 'Chiller Plant PLC', 'modbus', '192.168.1.100', 502, 'connected')
ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name, status = EXCLUDED.status;

INSERT INTO scada_tags (id, tenant_id, source_id, name, data_type, engineering_unit, status)
VALUES
    ('88888888-8888-8888-8888-888888888881', '00000000-0000-0000-0000-000000000010', '77777777-7777-7777-7777-777777777771', 'Chilled Water Temp Out', 'float', '°C', 'active'),
    ('88888888-8888-8888-8888-888888888882', '00000000-0000-0000-0000-000000000010', '77777777-7777-7777-7777-777777777771', 'Pump 1 Frequency', 'float', 'Hz', 'active')
ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name;
