-- Data Export Audit Log
-- Tracks all PDF/Excel exports for compliance auditing

CREATE TABLE IF NOT EXISTS data_export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    user_id TEXT NOT NULL,
    user_email TEXT,
    user_name TEXT,
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel')),
    module TEXT NOT NULL,
    file_name TEXT NOT NULL,
    record_count INT DEFAULT 0,
    date_range_start TEXT,
    date_range_end TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_export_logs_tenant ON data_export_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user ON data_export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_created ON data_export_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_module ON data_export_logs(module);

-- RLS (disabled for service role access via middleware)
ALTER TABLE data_export_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON data_export_logs FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE data_export_logs IS 'Audit trail for all data exports (PDF/Excel) across admin modules';
