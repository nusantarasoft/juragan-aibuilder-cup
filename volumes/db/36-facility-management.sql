-- ==============================================================================
-- NUSANTARASOFT v3.1
-- Phase 9: Facility Management Schema (DCIM, BMS, SCADA, BIM)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. DCIM (Data Center Infrastructure Management)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.dcim_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dcim_buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES public.dcim_sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    total_floors INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dcim_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES public.dcim_buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor_number INT DEFAULT 1,
    type VARCHAR(50) DEFAULT 'server_room', -- server_room, telco, power, cooling
    capacity_kw NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dcim_racks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.dcim_rooms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_u INT DEFAULT 42,
    used_u INT DEFAULT 0,
    max_weight_kg NUMERIC,
    max_power_kw NUMERIC,
    status VARCHAR(50) DEFAULT 'active', -- active, maintenance, critical
    x_pos NUMERIC DEFAULT 0,
    y_pos NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dcim_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rack_id UUID REFERENCES public.dcim_racks(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100), -- server, switch, router, pdu
    u_position INT,
    u_height INT DEFAULT 1,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    power_draw_w NUMERIC DEFAULT 0,
    status VARCHAR(50) DEFAULT 'online',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. BMS (Building Management System)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.bms_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- hvac, lighting, fire, access, elevator
    status VARCHAR(50) DEFAULT 'operational',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bms_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_id UUID REFERENCES public.bms_systems(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bms_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES public.bms_zones(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100), -- ahu, chiller, fcu, panel
    status VARCHAR(50) DEFAULT 'active',
    last_maintenance_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. SCADA (Supervisory Control & Data Acquisition)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.scada_data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255) NOT NULL,
    protocol VARCHAR(50), -- mqtt, opc-ua, modbus
    connection_string TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'disconnected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scada_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES public.scada_data_sources(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) DEFAULT 'float', -- int, float, bool, string
    unit VARCHAR(20),
    last_value TEXT,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scada_alarms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES public.scada_tags(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    condition VARCHAR(50), -- >, <, ==, !=
    threshold TEXT,
    severity VARCHAR(50), -- low, medium, high, critical
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 4. DUMMY DATA SEEDING
-- ==========================================

-- Seed DCIM
DO $$
DECLARE
    site_uuid UUID := '11111111-1111-1111-1111-111111111111';
    bldg_uuid UUID := '22222222-2222-2222-2222-222222222222';
    room_uuid UUID := '33333333-3333-3333-3333-333333333333';
    rack1_uuid UUID := '44444444-4444-4444-4444-444444444441';
    rack2_uuid UUID := '44444444-4444-4444-4444-444444444442';
BEGIN
    INSERT INTO public.dcim_sites (id, name, location) 
    VALUES (site_uuid, 'Jakarta HQ Data Center', 'Jakarta, Indonesia') 
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dcim_buildings (id, site_id, name, total_floors) 
    VALUES (bldg_uuid, site_uuid, 'Tower A', 5) 
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dcim_rooms (id, building_id, name, type, capacity_kw) 
    VALUES (room_uuid, bldg_uuid, 'Server Hall 1', 'server_room', 500) 
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dcim_racks (id, room_id, name, total_u, used_u, max_weight_kg, max_power_kw, status, x_pos, y_pos)
    VALUES 
        (rack1_uuid, room_uuid, 'Row A - Rack 01', 42, 20, 1000, 10, 'active', 10, 10),
        (rack2_uuid, room_uuid, 'Row A - Rack 02', 42, 38, 1000, 10, 'critical', 20, 10)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dcim_devices (rack_id, name, type, u_position, u_height, manufacturer, model, power_draw_w, status)
    VALUES 
        (rack1_uuid, 'Core Router A', 'router', 40, 2, 'Cisco', 'Nexus 9000', 450, 'online'),
        (rack1_uuid, 'App Server 01', 'server', 10, 1, 'Dell', 'PowerEdge R740', 300, 'online'),
        (rack2_uuid, 'DB Server 01', 'server', 5, 2, 'HP', 'ProLiant DL380', 500, 'warning')
    ON CONFLICT DO NOTHING;
END $$;

-- Seed BMS
DO $$
DECLARE
    sys_hvac_uuid UUID := '55555555-5555-5555-5555-555555555551';
    sys_light_uuid UUID := '55555555-5555-5555-5555-555555555552';
    zone1_uuid UUID := '66666666-6666-6666-6666-666666666661';
    zone2_uuid UUID := '66666666-6666-6666-6666-666666666662';
BEGIN
    INSERT INTO public.bms_systems (id, name, type, status)
    VALUES 
        (sys_hvac_uuid, 'Main HVAC System', 'hvac', 'operational'),
        (sys_light_uuid, 'Smart Lighting System', 'lighting', 'operational')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.bms_zones (id, system_id, name, floor)
    VALUES 
        (zone1_uuid, sys_hvac_uuid, 'Executive Boardroom AC', 'Floor 3'),
        (zone2_uuid, sys_light_uuid, 'Data Hall Corridors', 'Floor 1')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.bms_equipment (zone_id, name, type, status)
    VALUES 
        (zone1_uuid, 'AHU-01', 'ahu', 'active'),
        (zone1_uuid, 'Chiller-01', 'chiller', 'active'),
        (zone2_uuid, 'Lighting Panel A', 'panel', 'active')
    ON CONFLICT DO NOTHING;
END $$;

-- Seed SCADA
DO $$
DECLARE
    src1_uuid UUID := '77777777-7777-7777-7777-777777777771';
    tag1_uuid UUID := '88888888-8888-8888-8888-888888888881';
    tag2_uuid UUID := '88888888-8888-8888-8888-888888888882';
BEGIN
    INSERT INTO public.scada_data_sources (id, name, protocol, connection_string, status)
    VALUES (src1_uuid, 'Chiller Plant PLC', 'modbus', 'tcp://192.168.1.100:502', 'connected')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.scada_tags (id, source_id, name, address, data_type, unit, last_value)
    VALUES 
        (tag1_uuid, src1_uuid, 'Chilled Water Temp Out', '40001', 'float', '°C', '6.5'),
        (tag2_uuid, src1_uuid, 'Pump 1 Frequency', '40002', 'float', 'Hz', '60.0')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.scada_alarms (tag_id, name, condition, threshold, severity, is_active)
    VALUES 
        (tag1_uuid, 'High Chilled Water Temp', '>', '10.0', 'high', false),
        (tag2_uuid, 'Pump Frequency Drop', '<', '45.0', 'critical', false)
    ON CONFLICT DO NOTHING;
END $$;
