-- Notifications Module — Cross-cutting notification system
-- Channels, templates, rules, and delivery logs

-- ─── Channels (email, WhatsApp, webhook, in-app) ────────
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

-- ─── Templates (message templates with variables) ───────
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

-- ─── Rules (trigger conditions) ─────────────────────────
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

-- ─── Delivery Logs ──────────────────────────────────────
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

-- ─── User Inbox ─────────────────────────────────────────
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

-- ─── Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notif_channels_tenant ON notification_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_rules_tenant ON notification_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_rules_module ON notification_rules(module, event);
CREATE INDEX IF NOT EXISTS idx_notif_logs_tenant ON notification_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON notification_channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notification_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notification_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notification_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE notification_channels IS 'Notification delivery channels (email, WhatsApp, webhook, in-app)';
COMMENT ON TABLE notification_templates IS 'Message templates with {{variable}} placeholders';
COMMENT ON TABLE notification_rules IS 'Trigger rules linking module events to channels and templates';
COMMENT ON TABLE notifications IS 'User-facing notification inbox';
