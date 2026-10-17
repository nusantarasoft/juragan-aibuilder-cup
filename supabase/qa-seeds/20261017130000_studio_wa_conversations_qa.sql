-- QA only — Percakapan WA list/thread (not applied by apply-migrations.sh).
-- Apply manually: docker exec -i postgres psql -U postgres -d nusantarasoft -v ON_ERROR_STOP=1 < supabase/qa-seeds/20261017130000_studio_wa_conversations_qa.sql

INSERT INTO public.studio_wa_conversations (
    id,
    tenant_id,
    owner_phone,
    chat_jid,
    last_message_preview,
    last_message_at,
    takeover_active,
    takeover_by_name,
    takeover_until
) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000010',
    '6289990000001',
    '6289990000001@s.whatsapp.net',
    'Halo kasir, stok indomie?',
    now() - interval '5 minutes',
    false,
    null,
    null
) ON CONFLICT (tenant_id, owner_phone) DO UPDATE SET
    last_message_preview = EXCLUDED.last_message_preview,
    last_message_at = EXCLUDED.last_message_at,
    takeover_active = false,
    takeover_until = null;

DELETE FROM public.studio_wa_messages
WHERE conversation_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO public.studio_wa_messages (conversation_id, tenant_id, author_kind, body_text, created_at)
VALUES
    (
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        '00000000-0000-0000-0000-000000000010',
        'owner',
        'Halo kasir, stok indomie?',
        now() - interval '5 minutes'
    ),
    (
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        '00000000-0000-0000-0000-000000000010',
        'ai',
        'Stok Indomie goreng: 12 pcs.',
        now() - interval '4 minutes'
    );

INSERT INTO public.studio_wa_conversations (
    id,
    tenant_id,
    owner_phone,
    chat_jid,
    last_message_preview,
    last_message_at,
    takeover_active,
    takeover_by_name,
    takeover_until
) VALUES (
    'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000010',
    '6289990000002',
    '6289990000002@s.whatsapp.net',
    'Expired takeover thread',
    now() - interval '1 hour',
    true,
    'QA Admin',
    now() - interval '10 minutes'
) ON CONFLICT (tenant_id, owner_phone) DO UPDATE SET
    takeover_active = EXCLUDED.takeover_active,
    takeover_until = EXCLUDED.takeover_until,
    last_message_preview = EXCLUDED.last_message_preview;
