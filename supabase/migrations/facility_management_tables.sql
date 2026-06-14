-- Facility Management Tables: DCIM, BMS, SCADA, BIM
-- Migrations for v2.19.0 to v3.1.0

-- ============================================================================
-- 1. DCIM (Data Center Infrastructure Management)
-- ============================================================================

-- DCIM Sites
CREATE TABLE IF NOT EXISTS dcim_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    tier_level TEXT, -- Tier I, II, III, IV
    total_area_sqm DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Buildings
CREATE TABLE IF NOT EXISTS dcim_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    site_id UUID REFERENCES dcim_sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    floors INT,
    total_area_sqm DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Rooms
CREATE TABLE IF NOT EXISTS dcim_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    building_id UUID REFERENCES dcim_buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    floor TEXT,
    room_type TEXT, -- server_room/network_room/power_room/storage
    total_area_sqm DOUBLE PRECISION,
    max_power_kw DOUBLE PRECISION,
    max_cooling_kw DOUBLE PRECISION,
    raised_floor_height_cm DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    layout_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Rows
CREATE TABLE IF NOT EXISTS dcim_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    orientation TEXT, -- N/S/E/W
    row_type TEXT, -- hot_aisle/cold_aisle
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Racks
CREATE TABLE IF NOT EXISTS dcim_racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    row_id UUID REFERENCES dcim_rows(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    total_u INT DEFAULT 42,
    width_mm INT,
    depth_mm INT,
    max_weight_kg DOUBLE PRECISION,
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    position_z DOUBLE PRECISION,
    orientation TEXT,
    has_front_door BOOLEAN DEFAULT true,
    has_rear_door BOOLEAN DEFAULT true,
    power_feed_a TEXT,
    power_feed_b TEXT,
    status TEXT DEFAULT 'active', -- active/planned/decommissioned
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Device Types
CREATE TABLE IF NOT EXISTS dcim_device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    manufacturer TEXT,
    model TEXT,
    category TEXT, -- server/switch/pdu/ups/patch_panel/storage/other
    u_height INT DEFAULT 1,
    is_full_depth BOOLEAN DEFAULT true,
    max_power_watts INT,
    weight_kg DOUBLE PRECISION,
    front_image_url TEXT,
    rear_image_url TEXT,
    data_sheet_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Devices
CREATE TABLE IF NOT EXISTS dcim_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    device_type_id UUID REFERENCES dcim_device_types(id) ON DELETE RESTRICT,
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    asset_tag TEXT,
    serial_number TEXT,
    position_u INT,
    position_face TEXT DEFAULT 'front', -- front/rear
    hostname TEXT,
    primary_ip TEXT,
    os_version TEXT,
    firmware_version TEXT,
    status TEXT DEFAULT 'active', -- active/planned/staged/failed/decommissioned/inventory
    lifecycle_stage TEXT DEFAULT 'active', -- procurement/deployment/active/maintenance/decommission/disposal
    warranty_start DATE,
    warranty_end DATE,
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    assigned_to TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Rack Units
CREATE TABLE IF NOT EXISTS dcim_rack_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE CASCADE,
    u_position INT NOT NULL,
    device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available', -- available/occupied/reserved/blocked
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rack_id, u_position)
);

-- DCIM Power Feeds
CREATE TABLE IF NOT EXISTS dcim_power_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    feed_type TEXT, -- utility/ats/ups/pdu/branch_circuit
    parent_feed_id UUID REFERENCES dcim_power_feeds(id) ON DELETE SET NULL,
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE SET NULL,
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE SET NULL,
    rated_capacity_kw DOUBLE PRECISION,
    voltage INT,
    phase_count INT DEFAULT 1,
    amperage INT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Power Ports
CREATE TABLE IF NOT EXISTS dcim_power_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    power_feed_id UUID REFERENCES dcim_power_feeds(id) ON DELETE CASCADE,
    device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    port_name TEXT NOT NULL,
    port_type TEXT DEFAULT 'output', -- input/output
    allocated_watts INT,
    measured_watts INT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Power Readings
CREATE TABLE IF NOT EXISTS dcim_power_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    power_feed_id UUID REFERENCES dcim_power_feeds(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    voltage_v DOUBLE PRECISION,
    current_a DOUBLE PRECISION,
    power_kw DOUBLE PRECISION,
    power_factor DOUBLE PRECISION,
    energy_kwh DOUBLE PRECISION,
    frequency_hz DOUBLE PRECISION
);

-- DCIM Sensors
CREATE TABLE IF NOT EXISTS dcim_sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    rack_id UUID REFERENCES dcim_racks(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sensor_type TEXT, -- temperature/humidity/smoke/water_leak/airflow/door
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    position_z DOUBLE PRECISION,
    unit TEXT,
    min_threshold DOUBLE PRECISION,
    max_threshold DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Sensor Readings
CREATE TABLE IF NOT EXISTS dcim_sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID REFERENCES dcim_sensors(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    value DOUBLE PRECISION
);

-- DCIM Cables
CREATE TABLE IF NOT EXISTS dcim_cables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    cable_type TEXT, -- power/network/fiber/serial
    label TEXT,
    color TEXT,
    length_m DOUBLE PRECISION,
    a_device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    a_port_name TEXT,
    b_device_id UUID REFERENCES dcim_devices(id) ON DELETE SET NULL,
    b_port_name TEXT,
    status TEXT DEFAULT 'connected', -- connected/planned/decommissioned
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Network Ports
CREATE TABLE IF NOT EXISTS dcim_network_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES dcim_devices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    port_type TEXT, -- ethernet/fiber/serial/usb/console
    speed TEXT,
    cable_id UUID REFERENCES dcim_cables(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCIM Maintenance Logs
CREATE TABLE IF NOT EXISTS dcim_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    device_id UUID REFERENCES dcim_devices(id) ON DELETE CASCADE,
    maintenance_type TEXT, -- preventive/corrective/emergency
    title TEXT NOT NULL,
    description TEXT,
    performed_by TEXT,
    performed_at TIMESTAMPTZ,
    next_maintenance_at TIMESTAMPTZ,
    cost DECIMAL(12,2),
    status TEXT DEFAULT 'scheduled', -- scheduled/in_progress/completed/cancelled
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. BMS (Building Management System)
-- ============================================================================

-- BMS Systems
CREATE TABLE IF NOT EXISTS bms_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    system_type TEXT, -- hvac/lighting/fire/access/elevator/water/energy
    status TEXT DEFAULT 'active',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Zones
CREATE TABLE IF NOT EXISTS bms_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor TEXT,
    area_sqm DOUBLE PRECISION,
    occupancy_capacity INT,
    current_occupancy INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Equipment
CREATE TABLE IF NOT EXISTS bms_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    equipment_type TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    installation_date DATE,
    status TEXT DEFAULT 'online', -- online/offline/fault/maintenance
    last_service_date DATE,
    next_service_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Points
CREATE TABLE IF NOT EXISTS bms_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES bms_equipment(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    point_type TEXT, -- analog_input/analog_output/binary_input/binary_output/setpoint
    engineering_unit TEXT,
    current_value TEXT,
    setpoint_value TEXT,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    is_writable BOOLEAN DEFAULT false,
    is_alarmed BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Schedules
CREATE TABLE IF NOT EXISTS bms_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    schedule_type TEXT, -- daily/weekly/holiday
    cron_expression TEXT,
    action_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Schedule Overrides
CREATE TABLE IF NOT EXISTS bms_schedule_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES bms_schedules(id) ON DELETE CASCADE,
    reason TEXT,
    override_data JSONB DEFAULT '{}',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Alarms
CREATE TABLE IF NOT EXISTS bms_alarms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    system_id UUID REFERENCES bms_systems(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES bms_equipment(id) ON DELETE SET NULL,
    point_id UUID REFERENCES bms_points(id) ON DELETE SET NULL,
    alarm_type TEXT,
    priority TEXT, -- critical/high/medium/low/diagnostic
    condition TEXT,
    setpoint DOUBLE PRECISION,
    deadband DOUBLE PRECISION,
    delay_seconds INT,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Alarm Events
CREATE TABLE IF NOT EXISTS bms_alarm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alarm_id UUID REFERENCES bms_alarms(id) ON DELETE CASCADE,
    state TEXT, -- active_unack/active_ack/cleared_unack/cleared
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    cleared_at TIMESTAMPTZ,
    value_at_trigger TEXT,
    notes TEXT
);

-- BMS Energy Meters
CREATE TABLE IF NOT EXISTS bms_energy_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    meter_type TEXT, -- electricity/gas/water/steam/chilled_water/solar
    unit TEXT,
    ct_ratio DOUBLE PRECISION,
    location TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Energy Readings
CREATE TABLE IF NOT EXISTS bms_energy_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID REFERENCES bms_energy_meters(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    value DOUBLE PRECISION,
    demand_kw DOUBLE PRECISION,
    power_factor DOUBLE PRECISION
);

-- BMS Access Credentials
CREATE TABLE IF NOT EXISTS bms_access_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    credential_type TEXT, -- card/biometric/pin/mobile
    credential_number TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    holder_id TEXT,
    access_level TEXT,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMS Access Events
CREATE TABLE IF NOT EXISTS bms_access_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    credential_id UUID REFERENCES bms_access_credentials(id) ON DELETE SET NULL,
    door_id TEXT,
    zone_id UUID REFERENCES bms_zones(id) ON DELETE SET NULL,
    event_type TEXT, -- entry/exit/denied/forced/propped
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- BMS Maintenance Tasks
CREATE TABLE IF NOT EXISTS bms_maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    equipment_id UUID REFERENCES bms_equipment(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT, -- preventive/corrective/inspection
    priority TEXT,
    assigned_to TEXT,
    scheduled_date DATE,
    completed_date DATE,
    status TEXT DEFAULT 'scheduled', -- scheduled/in_progress/completed/overdue/cancelled
    cost DECIMAL(12,2),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. SCADA (Supervisory Control and Data Acquisition)
-- ============================================================================

-- SCADA Data Sources
CREATE TABLE IF NOT EXISTS scada_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    protocol TEXT, -- mqtt/opcua/modbus/bacnet/dnp3/sparkplug
    host TEXT,
    port INT,
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'disconnected', -- connected/disconnected/error
    last_connected_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Tags
CREATE TABLE IF NOT EXISTS scada_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    source_id UUID REFERENCES scada_data_sources(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tag_path TEXT,
    description TEXT,
    data_type TEXT, -- float/int/bool/string
    engineering_unit TEXT,
    address TEXT,
    scaling_factor DOUBLE PRECISION DEFAULT 1.0,
    offset_val DOUBLE PRECISION DEFAULT 0.0,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    deadband DOUBLE PRECISION,
    scan_rate_ms INT DEFAULT 1000,
    is_writable BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Tag Values
CREATE TABLE IF NOT EXISTS scada_tag_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES scada_tags(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    value_numeric DOUBLE PRECISION,
    value_text TEXT,
    quality TEXT DEFAULT 'good' -- good/bad/uncertain
);

-- SCADA Alarm Definitions
CREATE TABLE IF NOT EXISTS scada_alarm_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    tag_id UUID REFERENCES scada_tags(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    alarm_type TEXT, -- high/low/high_high/low_low/deviation/rate_of_change/digital
    priority TEXT, -- critical/high/medium/low/diagnostic
    condition_value DOUBLE PRECISION,
    deadband DOUBLE PRECISION,
    delay_ms INT DEFAULT 0,
    purpose TEXT,
    cause TEXT,
    corrective_action TEXT,
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Alarm Events
CREATE TABLE IF NOT EXISTS scada_alarm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alarm_id UUID REFERENCES scada_alarm_definitions(id) ON DELETE CASCADE,
    state TEXT, -- active_unack/active_ack/cleared_unack/cleared
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    cleared_at TIMESTAMPTZ,
    shelved_until TIMESTAMPTZ,
    shelved_by TEXT,
    shelve_reason TEXT,
    trigger_value DOUBLE PRECISION,
    notes TEXT
);

-- SCADA HMI Screens
CREATE TABLE IF NOT EXISTS scada_hmi_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    canvas_width INT DEFAULT 1920,
    canvas_height INT DEFAULT 1080,
    background_color TEXT DEFAULT '#ffffff',
    background_image_url TEXT,
    is_default BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA HMI Elements
CREATE TABLE IF NOT EXISTS scada_hmi_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screen_id UUID REFERENCES scada_hmi_screens(id) ON DELETE CASCADE,
    element_type TEXT, -- pump/valve/tank/motor/sensor/pipe/label/gauge/chart/indicator/shape
    x INT,
    y INT,
    width INT,
    height INT,
    rotation DOUBLE PRECISION DEFAULT 0.0,
    tag_id UUID REFERENCES scada_tags(id) ON DELETE SET NULL,
    display_config JSONB DEFAULT '{}',
    animation_config JSONB DEFAULT '{}',
    style_config JSONB DEFAULT '{}',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Trend Configs
CREATE TABLE IF NOT EXISTS scada_trend_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    tag_ids JSONB DEFAULT '[]',
    time_range TEXT DEFAULT '1h',
    auto_refresh BOOLEAN DEFAULT true,
    chart_type TEXT DEFAULT 'line',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Report Templates
CREATE TABLE IF NOT EXISTS scada_report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    report_type TEXT, -- soe/shift/compliance/custom
    template_config JSONB DEFAULT '{}',
    schedule_cron TEXT,
    recipients JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. BIM (Building Information Modeling)
-- ============================================================================

-- BIM Models
CREATE TABLE IF NOT EXISTS bim_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    format TEXT, -- ifc/gltf/obj/fbx/stl/dae/3ds/dwg/dxf/rvt
    original_filename TEXT,
    s3_key TEXT,
    converted_s3_key TEXT,
    file_size_bytes BIGINT,
    site_id UUID REFERENCES dcim_sites(id) ON DELETE SET NULL,
    building_id UUID REFERENCES dcim_buildings(id) ON DELETE SET NULL,
    version INT DEFAULT 1,
    status TEXT DEFAULT 'ready', -- processing/ready/error
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Model Versions
CREATE TABLE IF NOT EXISTS bim_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    version INT,
    s3_key TEXT,
    change_description TEXT,
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Elements
CREATE TABLE IF NOT EXISTS bim_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    ifc_global_id TEXT,
    element_type TEXT,
    name TEXT,
    description TEXT,
    level TEXT,
    material TEXT,
    properties JSONB DEFAULT '{}',
    geometry_hash TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Annotations
CREATE TABLE IF NOT EXISTS bim_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    element_id UUID REFERENCES bim_elements(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    position_x DOUBLE PRECISION,
    position_y DOUBLE PRECISION,
    position_z DOUBLE PRECISION,
    camera_position JSONB,
    camera_target JSONB,
    annotation_type TEXT, -- comment/issue/info/warning
    priority TEXT,
    status TEXT DEFAULT 'open', -- open/resolved/closed
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Viewpoints
CREATE TABLE IF NOT EXISTS bim_viewpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    camera_position JSONB,
    camera_target JSONB,
    camera_up JSONB,
    clipping_planes JSONB DEFAULT '[]',
    visible_elements JSONB DEFAULT '[]',
    hidden_elements JSONB DEFAULT '[]',
    highlighted_elements JSONB DEFAULT '[]',
    snapshot_url TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Clash Results
CREATE TABLE IF NOT EXISTS bim_clash_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    clash_type TEXT, -- hard/soft/clearance
    element_a_id UUID REFERENCES bim_elements(id) ON DELETE CASCADE,
    element_b_id UUID REFERENCES bim_elements(id) ON DELETE CASCADE,
    distance DOUBLE PRECISION,
    position JSONB,
    severity TEXT, -- critical/major/minor
    status TEXT DEFAULT 'new', -- new/active/resolved/ignored
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIM Issues
CREATE TABLE IF NOT EXISTS bim_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    element_id UUID REFERENCES bim_elements(id) ON DELETE SET NULL,
    viewpoint_id UUID REFERENCES bim_viewpoints(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    issue_type TEXT, -- design/construction/coordination/other
    priority TEXT, -- critical/high/medium/low
    status TEXT DEFAULT 'open', -- open/in_progress/resolved/closed
    assigned_to TEXT,
    due_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_dcim_racks_room_id ON dcim_racks(room_id);
CREATE INDEX IF NOT EXISTS idx_dcim_devices_rack_id ON dcim_devices(rack_id);
CREATE INDEX IF NOT EXISTS idx_dcim_power_readings_feed_id ON dcim_power_readings(power_feed_id);
CREATE INDEX IF NOT EXISTS idx_dcim_sensor_readings_sensor_id ON dcim_sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_bms_alarm_events_alarm_id ON bms_alarm_events(alarm_id);
CREATE INDEX IF NOT EXISTS idx_scada_tag_values_tag_id ON scada_tag_values(tag_id);
CREATE INDEX IF NOT EXISTS idx_bim_elements_model_id ON bim_elements(model_id);

-- SEED DATA
INSERT INTO dcim_sites (id, name, code, city, tier_level, total_area_sqm)
VALUES ('00000000-0000-0000-0000-000000000001', 'HQ Data Center', 'HQ-DC-1', 'Jakarta', 'Tier III', 5000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dcim_buildings (id, site_id, name, floors)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Facility', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dcim_rooms (id, building_id, name, room_type, max_power_kw)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Server Hall A', 'server_room', 1000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dcim_racks (id, room_id, name, code, position_x, position_y, position_z)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Rack A1', 'A1', 0, 0, 0),
       ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Rack A2', 'A2', 1, 0, 0)
ON CONFLICT (id) DO NOTHING;
