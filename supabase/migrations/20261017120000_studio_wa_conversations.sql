-- AI Studio — Percakapan WA (super-admin inbox + human takeover)
-- Tenant-scoped message history; middleware/Hermes write via service_role only.

CREATE TABLE IF NOT EXISTS public.studio_wa_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    chat_jid TEXT,
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ,
    takeover_active BOOLEAN NOT NULL DEFAULT false,
    takeover_by_user_id UUID,
    takeover_by_name TEXT,
    takeover_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT studio_wa_conversations_tenant_phone UNIQUE (tenant_id, owner_phone)
);

CREATE INDEX IF NOT EXISTS idx_studio_wa_conv_tenant_last
    ON public.studio_wa_conversations (tenant_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_studio_wa_conv_takeover
    ON public.studio_wa_conversations (takeover_active, takeover_until)
    WHERE takeover_active = true;

CREATE TABLE IF NOT EXISTS public.studio_wa_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.studio_wa_conversations (id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    author_kind TEXT NOT NULL CHECK (author_kind IN ('owner', 'ai', 'human')),
    body_text TEXT NOT NULL,
    author_user_id UUID,
    author_display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_wa_msg_conv_created
    ON public.studio_wa_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_studio_wa_msg_tenant_created
    ON public.studio_wa_messages (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.studio_wa_conversations_touch_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_studio_wa_conversations_touch ON public.studio_wa_conversations;
CREATE TRIGGER trg_studio_wa_conversations_touch
    BEFORE UPDATE ON public.studio_wa_conversations
    FOR EACH ROW EXECUTE FUNCTION public.studio_wa_conversations_touch_updated_at();

ALTER TABLE public.studio_wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_wa_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS studio_wa_conversations_service ON public.studio_wa_conversations;
CREATE POLICY studio_wa_conversations_service ON public.studio_wa_conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS studio_wa_messages_service ON public.studio_wa_messages;
CREATE POLICY studio_wa_messages_service ON public.studio_wa_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.studio_wa_conversations FROM anon, authenticated;
REVOKE ALL ON public.studio_wa_messages FROM anon, authenticated;
GRANT ALL ON public.studio_wa_conversations TO service_role;
GRANT ALL ON public.studio_wa_messages TO service_role;

COMMENT ON TABLE public.studio_wa_conversations IS
    'Per-tenant WA threads (shared NS inbox); super-admin Percakapan WA UI + takeover state.';
COMMENT ON TABLE public.studio_wa_messages IS
    'WA turns: owner inbound, AI reply, human admin reply (author_kind). Retained indefinitely (no purge). History starts empty at deploy — no Hermes state.db import.';
