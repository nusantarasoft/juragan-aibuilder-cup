-- Idempotent: volumes/db/migrations/20260506_notifications_module.sql

CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name TEXT NOT NULL,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('email','whatsapp','webhook','in_app')),
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    event TEXT NOT NULL,
    channel_id UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    recipient_type TEXT DEFAULT 'assignee' CHECK (recipient_type IN ('assignee','creator','role','email','webhook')),
    recipient_value TEXT,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,
    channel_type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','bounced')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    module TEXT,
    link TEXT,
    icon TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_channels_tenant ON notification_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_rules_tenant ON notification_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_rules_module ON notification_rules(module, event);
CREATE INDEX IF NOT EXISTS idx_notif_logs_tenant ON notification_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['notification_channels','notification_templates','notification_rules','notification_logs','notifications'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'Service role full access'
        ) THEN
            EXECUTE format('CREATE POLICY "Service role full access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
        END IF;
    END LOOP;
END $$;
