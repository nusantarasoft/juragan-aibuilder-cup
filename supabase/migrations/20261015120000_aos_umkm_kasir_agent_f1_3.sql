-- F1-3: persisted Kasir UMKM agent for WA task queue (browser runner — not cloud worker).
INSERT INTO aos_agents (
    tenant_id,
    slug,
    name,
    role,
    persona,
    color,
    zone,
    desk_id,
    modules,
    skills,
    tools,
    permissions,
    runner,
    status,
    stats
) VALUES (
    '00000000-0000-0000-0000-000000000010',
    'umkm-kasir',
    'Kasir UMKM',
    'UMKM WhatsApp Kasir',
    'Kasir WhatsApp untuk UMKM — catat jual, stok, dan konsultasi.',
    '#22c55e',
    'operations',
    'ops-1',
    ARRAY['ai-studio']::text[],
    ARRAY['Kasir WA', 'Konsultasi', 'Stok']::text[],
    ARRAY['module.read', 'activity.log']::text[],
    '{"ai-studio": "write"}'::jsonb,
    'browser',
    'active',
    '{}'::jsonb
) ON CONFLICT (tenant_id, slug) DO UPDATE SET
    runner = EXCLUDED.runner,
    zone = EXCLUDED.zone,
    desk_id = EXCLUDED.desk_id,
    modules = EXCLUDED.modules,
    archived_at = NULL;
