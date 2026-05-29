-- AI Studio — WhatsApp (WAHA) channel tables and conversation extensions

ALTER TABLE public.studio_conversations
    ADD COLUMN IF NOT EXISTS channel text DEFAULT 'web',
    ADD COLUMN IF NOT EXISTS external_chat_id text;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'studio_conversations_channel_check'
    ) THEN
        ALTER TABLE public.studio_conversations
            ADD CONSTRAINT studio_conversations_channel_check
            CHECK (channel IN ('web', 'whatsapp'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_studio_conversations_channel
    ON public.studio_conversations (channel);
CREATE INDEX IF NOT EXISTS idx_studio_conversations_external_chat
    ON public.studio_conversations (external_chat_id)
    WHERE external_chat_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.studio_whatsapp_config (
    tenant_id text PRIMARY KEY DEFAULT 'default',
    notebook_id uuid REFERENCES public.studio_notebooks(id) ON DELETE SET NULL,
    enabled boolean NOT NULL DEFAULT false,
    allowlist_phones text[] DEFAULT '{}',
    use_guided_flow boolean NOT NULL DEFAULT false,
    updated_at timestamptz DEFAULT now()
);

INSERT INTO public.studio_whatsapp_config (tenant_id, enabled)
VALUES ('default', false)
ON CONFLICT (tenant_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.studio_whatsapp_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL DEFAULT 'default',
    chat_id text NOT NULL,
    conversation_id uuid NOT NULL REFERENCES public.studio_conversations(id) ON DELETE CASCADE,
    phone text,
    display_name text,
    last_message_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    CONSTRAINT studio_whatsapp_sessions_chat_unique UNIQUE (tenant_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_studio_whatsapp_sessions_conversation
    ON public.studio_whatsapp_sessions (conversation_id);

ALTER TABLE public.studio_whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_whatsapp_config' AND policyname = 'studio_whatsapp_config_all') THEN
        CREATE POLICY studio_whatsapp_config_all ON public.studio_whatsapp_config FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_whatsapp_sessions' AND policyname = 'studio_whatsapp_sessions_all') THEN
        CREATE POLICY studio_whatsapp_sessions_all ON public.studio_whatsapp_sessions FOR ALL USING (true);
    END IF;
END $$;

GRANT ALL ON public.studio_whatsapp_config TO anon, authenticated, service_role, authenticator;
GRANT ALL ON public.studio_whatsapp_sessions TO anon, authenticated, service_role, authenticator;
