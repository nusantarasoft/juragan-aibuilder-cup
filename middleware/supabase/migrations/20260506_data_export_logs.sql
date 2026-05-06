-- Migration: Create data_export_logs table for compliance audit trail
-- Created: 2026-05-06

CREATE TABLE IF NOT EXISTS data_export_logs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010'::uuid,
    user_id          text NOT NULL,
    user_email       text,
    user_name        text,
    export_type      text NOT NULL CHECK (export_type IN ('pdf', 'excel')),
    module           text NOT NULL,
    file_name        text NOT NULL,
    record_count     integer DEFAULT 0,
    date_range_start text,
    date_range_end   text,
    ip_address       text,
    user_agent       text,
    created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_tenant ON data_export_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user ON data_export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_module ON data_export_logs(module);
CREATE INDEX IF NOT EXISTS idx_export_logs_created ON data_export_logs(created_at DESC);

ALTER TABLE data_export_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'data_export_logs' AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON data_export_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

GRANT ALL ON data_export_logs TO anon, authenticated, service_role, authenticator;
