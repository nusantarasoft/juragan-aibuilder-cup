-- Create dcim_pods table
CREATE TABLE IF NOT EXISTS dcim_pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    room_id UUID REFERENCES dcim_rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add pod_id to dcim_rows
ALTER TABLE dcim_rows ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES dcim_pods(id) ON DELETE CASCADE;

-- Enforce the hierarchy Site -> Building -> Room -> Pod -> Row -> Rack
-- However, we don't want to drop room_id from racks and rows immediately if there is existing data,
-- but the user requested strict hierarchy.
-- Add pod_id to dcim_racks
ALTER TABLE dcim_racks ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES dcim_pods(id) ON DELETE CASCADE;

-- Add management network and remote access fields to dcim_devices
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS management_ip TEXT;
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS management_url TEXT;
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS management_protocol TEXT; -- e.g., 'SSH', 'RDP', 'VNC', 'IPMI', 'HTTP', 'HTTPS'
ALTER TABLE dcim_devices ADD COLUMN IF NOT EXISTS remote_credentials_id UUID; -- if using a credential store

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dcim_pods_room_id ON dcim_pods(room_id);
CREATE INDEX IF NOT EXISTS idx_dcim_rows_pod_id ON dcim_rows(pod_id);
CREATE INDEX IF NOT EXISTS idx_dcim_racks_pod_id ON dcim_racks(pod_id);
