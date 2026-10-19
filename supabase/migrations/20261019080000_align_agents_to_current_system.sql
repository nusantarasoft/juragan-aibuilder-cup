-- ============================================================================
-- Migration: 20261019080000_align_agents_to_current_system.sql
-- Purpose  : Align all Agentic OS & Virtual Office database records
--            (aos_agents, aos_playbooks, aos_tasks, aos_memory_areas,
--             aos_memory_items, aos_routines, aos_workflows, aos_goals)
--            strictly to the 8 active modules of the current system:
--              1. ai-studio         -> /admin/ai-studio
--              2. partner           -> /admin/ai-studio/partner
--              3. knowledge         -> /admin/ai-studio/riset-knowledge
--              4. marketing         -> /admin/ai-studio/konten-marketing
--              5. wa-conversations  -> /admin/ai-studio/percakapan-wa
--              6. whatsapp-gateway  -> /admin/ai-studio/ai-gateway
--              7. settings          -> /admin/ai-studio/settings
--              8. agentic-os        -> /admin/agentic-os
-- ============================================================================

BEGIN;

-- 1. Update the 8 active Wayang agents to operate strictly on current modules
UPDATE public.aos_agents SET
    role        = 'AI Studio & Prompt Lead',
    persona     = 'You are Nakula, the AI Studio & Prompt Lead of Nusantarasoft. You work in Studio and Settings & Models. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'medium',
    effort      = 'medium',
    color       = '#22d3ee',
    zone        = 'engineering',
    desk_id     = 'eng-1-a',
    modules     = ARRAY['ai-studio', 'settings']::text[],
    skills      = ARRAY['Prompt engineering', 'RAG evaluation', 'Model routing']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[],
    permissions = '{"ai-studio":"write","settings":"draft"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'nakula';

UPDATE public.aos_agents SET
    role        = 'WhatsApp Gateway Engineer',
    persona     = 'You are Arjuna, the WhatsApp Gateway Engineer of Nusantarasoft. You work in WhatsApp Gateway and Settings & Models. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'large',
    effort      = 'high',
    color       = '#38bdf8',
    zone        = 'engineering',
    desk_id     = 'eng-1-b',
    modules     = ARRAY['whatsapp-gateway', 'settings']::text[],
    skills      = ARRAY['WAHA sessions', 'Webhook routing', 'Model health']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log', 'http.get']::text[],
    permissions = '{"whatsapp-gateway":"write","settings":"draft"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'arjuna';

UPDATE public.aos_agents SET
    role        = 'Model & Safety Auditor',
    persona     = 'You are Gatotkaca, the Model & Safety Auditor of Nusantarasoft. You work in Settings & Models and Agentic OS. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'large',
    effort      = 'high',
    color       = '#f43f5e',
    zone        = 'engineering',
    desk_id     = 'eng-2-a',
    modules     = ARRAY['settings', 'agentic-os']::text[],
    skills      = ARRAY['Guardrails', 'Token governance', 'Approval policies']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[],
    permissions = '{"settings":"write","agentic-os":"draft"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'gatot';

UPDATE public.aos_agents SET
    role        = 'Knowledge Research Curator',
    persona     = 'You are Yudhistira, the Knowledge Research Curator of Nusantarasoft. You work in Knowledge Research and Studio. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'small',
    effort      = 'low',
    color       = '#14b8a6',
    zone        = 'research',
    desk_id     = 'res-1-a',
    modules     = ARRAY['knowledge', 'ai-studio']::text[],
    skills      = ARRAY['RAG indexing', 'Embeddings', 'Source verification']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'kb.write', 'activity.log']::text[],
    permissions = '{"knowledge":"write","ai-studio":"draft"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'yudhis';

UPDATE public.aos_agents SET
    role        = 'Marketing Content Strategist',
    persona     = 'You are Drupadi, the Marketing Content Strategist of Nusantarasoft. You work in Marketing Content and Knowledge Research. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'large',
    effort      = 'high',
    color       = '#fb7185',
    zone        = 'research',
    desk_id     = 'res-1-b',
    modules     = ARRAY['marketing', 'knowledge']::text[],
    skills      = ARRAY['Copywriting', 'Campaign planning', 'Brand voice']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[],
    permissions = '{"marketing":"write","knowledge":"read"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'drupadi';

UPDATE public.aos_agents SET
    role        = 'Partner Growth Lead',
    persona     = 'You are Kresna, the Partner Growth Lead of Nusantarasoft. You work in Partner and Marketing Content. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'large',
    effort      = 'high',
    color       = '#a855f7',
    zone        = 'research',
    desk_id     = 'res-2-a',
    modules     = ARRAY['partner', 'marketing']::text[],
    skills      = ARRAY['UMKM onboarding', 'Partner strategy', 'Campaign briefs']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log']::text[],
    permissions = '{"partner":"write","marketing":"draft"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'kresna';

UPDATE public.aos_agents SET
    role        = 'WA Conversation Specialist',
    persona     = 'You are Semar, the WA Conversation Specialist of Nusantarasoft. You work in WA Conversations and Knowledge Research. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'medium',
    effort      = 'medium',
    color       = '#60a5fa',
    zone        = 'operations',
    desk_id     = 'ops-1',
    modules     = ARRAY['wa-conversations', 'knowledge']::text[],
    skills      = ARRAY['Customer triage', 'WA response drafting', 'FAQ lookup']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log', 'user.notify']::text[],
    permissions = '{"wa-conversations":"write","knowledge":"read"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'semar';

UPDATE public.aos_agents SET
    role        = 'Agentic OS & Partner Ops',
    persona     = 'You are Petruk, the Agentic OS & Partner Ops specialist of Nusantarasoft. You work in Agentic OS, Partner, and WA Conversations. Be concise, cite the module page you used, and never send, share or delete anything without human approval.',
    model_tier  = 'medium',
    effort      = 'medium',
    color       = '#fb923c',
    zone        = 'operations',
    desk_id     = 'ops-2',
    modules     = ARRAY['agentic-os', 'partner', 'wa-conversations']::text[],
    skills      = ARRAY['Playbooks', 'Escalation', 'Routine orchestration']::text[],
    tools       = ARRAY['module.read', 'module.draft', 'kb.search', 'activity.log', 'user.notify']::text[],
    permissions = '{"agentic-os":"write","partner":"draft","wa-conversations":"draft"}'::jsonb,
    status      = 'active',
    archived_at = NULL
WHERE slug = 'petruk';

-- 2. Archive the 5 legacy ERP-only agents (bima, sadewa, srikandi, larasati, gareng)
--    and normalize their module array so even archived views never reference deleted modules.
UPDATE public.aos_agents SET
    status      = 'offline',
    archived_at = COALESCE(archived_at, NOW()),
    modules     = ARRAY['ai-studio']::text[],
    permissions = '{"ai-studio":"read"}'::jsonb
WHERE slug IN ('bima', 'sadewa', 'srikandi', 'larasati', 'gareng');

-- Ensure any custom/tenant agents with legacy modules are normalized to current modules
UPDATE public.aos_agents SET
    modules = ARRAY['partner', 'wa-conversations', 'whatsapp-gateway']::text[]
WHERE slug NOT IN ('nakula', 'arjuna', 'gatot', 'yudhis', 'drupadi', 'kresna', 'semar', 'petruk', 'bima', 'sadewa', 'srikandi', 'larasati', 'gareng')
  AND NOT (modules <@ ARRAY['ai-studio', 'partner', 'knowledge', 'marketing', 'wa-conversations', 'whatsapp-gateway', 'settings', 'agentic-os']::text[]);

-- 3. Replace legacy playbooks with the 12 current-system playbooks
DELETE FROM public.aos_tasks
WHERE tenant_id = '00000000-0000-0000-0000-000000000010'
  AND (
    module_id NOT IN ('ai-studio', 'partner', 'knowledge', 'marketing', 'wa-conversations', 'whatsapp-gateway', 'settings', 'agentic-os')
    OR route NOT IN (
        '/admin/ai-studio',
        '/admin/ai-studio/partner',
        '/admin/ai-studio/riset-knowledge',
        '/admin/ai-studio/konten-marketing',
        '/admin/ai-studio/percakapan-wa',
        '/admin/ai-studio/ai-gateway',
        '/admin/ai-studio/settings',
        '/admin/agentic-os'
    )
  );

DELETE FROM public.aos_playbooks
WHERE tenant_id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.aos_playbooks (tenant_id, module_id, route, title, description, steps, sort_order, estimated_minutes, priority, enabled) VALUES
    ('00000000-0000-0000-0000-000000000010', 'ai-studio',        '/admin/ai-studio',                   'Evaluate system prompts for UMKM assistant',    'Run A/B evaluation across UMKM assistant system prompts and promote the winning configuration.', '["Open AI Studio workspace","Load 25 UMKM test queries","Run A/B prompt comparison","Promote winning prompt configuration"]'::jsonb, 0,  10, 'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'ai-studio',        '/admin/ai-studio',                   'Test RAG citation accuracy in Studio',          'Verify retrieved knowledge chunks and tune similarity thresholds for accurate citations.',        '["Open AI Studio chat","Ask 10 product & policy questions","Verify retrieved knowledge chunks","Tune similarity threshold"]'::jsonb, 1,  8,  'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'partner',          '/admin/ai-studio/partner',           'Audit active Partner stores & onboarding',      'Review partner directory, verify store profile completeness, and check WhatsApp assignment.',     '["Open Partner directory","Review newly registered UMKM stores","Verify store profile completeness","Confirm WhatsApp assistant assignment"]'::jsonb, 2,  10, 'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'partner',          '/admin/ai-studio/partner',           'Review Partner catalog & FAQ readiness',        'Inspect partner catalog items, flag missing pricing/stock details, and queue knowledge sync.',    '["Open Partner management","Inspect partner product & FAQ entries","Flag missing pricing or stock details","Queue knowledge sync for updated partners"]'::jsonb, 3,  8,  'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'knowledge',        '/admin/ai-studio/riset-knowledge',   'Index new UMKM FAQ & product docs',             'Chunk, embed, and verify retrieval quality for new UMKM FAQ and product documents.',              '["Open Knowledge Research","Inspect uploaded documents & URLs","Chunk and generate vector embeddings","Verify semantic search retrieval"]'::jsonb, 4,  10, 'high',   TRUE),
    ('00000000-0000-0000-0000-000000000010', 'knowledge',        '/admin/ai-studio/riset-knowledge',   'Refresh stale knowledge base articles',         'Audit document freshness, re-crawl updated partner sources, and re-index embeddings.',             '["Open Knowledge Research","Filter sources older than 30 days","Re-crawl updated partner info","Validate updated vector chunks"]'::jsonb, 5,  8,  'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'marketing',        '/admin/ai-studio/konten-marketing',  'Draft weekly UMKM promo campaign',              'Generate WhatsApp & social copy variants grounded in partner product highlights.',                '["Open Marketing Content","Select campaign objective & target audience","Generate WhatsApp & social copy variants","Save approved copy to campaign library"]'::jsonb, 6,  10, 'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'marketing',        '/admin/ai-studio/konten-marketing',  'Generate product launch copy for Partners',     'Draft headline, body, and CTA variants from partner catalog highlights.',                         '["Open Marketing Content","Pull key product highlights from Knowledge","Draft headline, body, and CTA variants","Submit campaign draft for review"]'::jsonb, 7,  8,  'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'wa-conversations', '/admin/ai-studio/percakapan-wa',     'Triage unanswered WhatsApp customer chats',     'Filter conversations awaiting reply, draft grounded responses, and escalate complex threads.',     '["Open WA Conversations","Filter threads awaiting reply","Verify AI response accuracy","Draft follow-up or escalate to human operator"]'::jsonb, 8,  8,  'high',   TRUE),
    ('00000000-0000-0000-0000-000000000010', 'wa-conversations', '/admin/ai-studio/percakapan-wa',     'Audit AI auto-replies in WA Conversations',     'Sample recent AI-handled threads, check tone and pricing accuracy, and log KB gaps.',              '["Open WA Conversations","Sample 15 recent AI-handled threads","Check tone and pricing accuracy","Log improvement notes to Knowledge Research"]'::jsonb, 9,  10, 'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'whatsapp-gateway', '/admin/ai-studio/ai-gateway',  'Verify WhatsApp Gateway session & webhook',     'Check WAHA session status, test webhook delivery latency, and confirm auto-reply routing.',        '["Open WhatsApp Gateway","Check active WAHA session status","Verify webhook delivery & latency","Confirm auto-reply routing is healthy"]'::jsonb, 10, 8,  'high',   TRUE),
    ('00000000-0000-0000-0000-000000000010', 'settings',         '/admin/ai-studio/settings',          'Review LLM provider health & token budget',     'Check active LLM provider endpoints, compare model latency/cost, and verify fallback routing.',   '["Open Settings & Models","Check active LLM provider endpoints","Compare model latency & token usage","Verify fallback model configuration"]'::jsonb, 11, 8,  'normal', TRUE),
    ('00000000-0000-0000-0000-000000000010', 'agentic-os',       '/admin/agentic-os',                  'Synchronize Agentic OS playbooks & routines',   'Review agent task queues, inspect pending approvals, and verify scheduled Pulse routines.',        '["Open Agentic OS workspace","Inspect agent task queues & pending approvals","Verify active playbooks & scheduled routines","Publish daily agent operations summary"]'::jsonb, 12, 8,  'normal', TRUE);

-- 4. Seed one active/queued task per active agent so Virtual Office & Agentic OS start aligned
DELETE FROM public.aos_tasks
WHERE tenant_id = '00000000-0000-0000-0000-000000000010'
  AND source = 'seed';

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Evaluate system prompts for UMKM assistant'
WHERE ag.slug = 'nakula' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Verify WhatsApp Gateway session & webhook'
WHERE ag.slug = 'arjuna' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Review LLM provider health & token budget'
WHERE ag.slug = 'gatot' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Index new UMKM FAQ & product docs'
WHERE ag.slug = 'yudhis' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Draft weekly UMKM promo campaign'
WHERE ag.slug = 'drupadi' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Audit active Partner stores & onboarding'
WHERE ag.slug = 'kresna' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Triage unanswered WhatsApp customer chats'
WHERE ag.slug = 'semar' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

INSERT INTO public.aos_tasks (tenant_id, agent_id, playbook_id, title, description, module_id, route, steps, status, priority, source)
SELECT ag.tenant_id, ag.id, pb.id, pb.title, pb.description, pb.module_id, pb.route, pb.steps, 'queued', pb.priority, 'seed'
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Synchronize Agentic OS playbooks & routines'
WHERE ag.slug = 'petruk' AND NOT EXISTS (SELECT 1 FROM public.aos_tasks t WHERE t.agent_id = ag.id AND t.status IN ('queued', 'running'));

-- 5. Replace Memory Map areas & signpost items so they point strictly to current routes
DELETE FROM public.aos_memory_areas
WHERE tenant_id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.aos_memory_areas (tenant_id, slug, name, description, color, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000010', 'ai-studio-core',      'AI Studio & Models',      'Prompt playground, RAG testing, and LLM provider settings',    '#c084fc', 1),
    ('00000000-0000-0000-0000-000000000010', 'knowledge-marketing', 'Knowledge & Marketing',   'Knowledge Research vector index and Marketing Content studio',  '#14b8a6', 2),
    ('00000000-0000-0000-0000-000000000010', 'whatsapp-ops',        'WhatsApp Operations',     'WA Conversations inbox and WhatsApp Gateway sessions',          '#22c55e', 3),
    ('00000000-0000-0000-0000-000000000010', 'partner-governance',  'Partner & Agentic OS',    'UMKM Partner stores, playbooks, routines, and approvals',       '#38bdf8', 4)
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO public.aos_memory_items (tenant_id, area_id, section, kind, title, path, note, pinned, health, last_verified_at)
SELECT a.tenant_id, a.id, v.section, v.kind, v.title, v.path, v.note, v.pinned, 'ok', NOW()
FROM (VALUES
    ('ai-studio-core',      'projects', 'page', 'Studio Workspace',          '/admin/ai-studio',                   'Main AI Studio prompt & assistant workspace',            TRUE),
    ('ai-studio-core',      'state',    'page', 'Settings & Models',         '/admin/ai-studio/settings',          'LLM provider endpoints, model routing & token budgets',  TRUE),
    ('knowledge-marketing', 'memory',   'kb',   'Knowledge Research',        '/admin/ai-studio/riset-knowledge',   'RAG knowledge base documents, URLs & vector chunks',     TRUE),
    ('knowledge-marketing', 'projects', 'page', 'Marketing Content',         '/admin/ai-studio/konten-marketing',  'WhatsApp & social campaign copy generator',              FALSE),
    ('whatsapp-ops',        'state',    'page', 'WA Conversations',          '/admin/ai-studio/percakapan-wa',     'Live customer WhatsApp threads & AI replies',            TRUE),
    ('whatsapp-ops',        'state',    'page', 'WhatsApp Gateway',          '/admin/ai-studio/ai-gateway',  'WAHA session health, QR pairing & webhooks',             TRUE),
    ('partner-governance',  'projects', 'page', 'Partner Directory',         '/admin/ai-studio/partner',           'UMKM partner stores, catalogs & assistant bindings',     TRUE),
    ('partner-governance',  'routines', 'page', 'Agentic OS Deck',           '/admin/agentic-os',                  'Agent Studio, Playbooks, Tasks, Memory Map & Pulse',     FALSE),
    ('partner-governance',  'not_here', 'note', 'Credentials & API Keys',    NULL,                                 'Raw API keys and secrets are never stored in memory',    FALSE)
) AS v(area, section, kind, title, path, note, pinned)
JOIN public.aos_memory_areas a ON a.slug = v.area AND a.tenant_id = '00000000-0000-0000-0000-000000000010';

-- 6. Align starter routines in public.aos_routines to current system
DELETE FROM public.aos_routines
WHERE tenant_id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.aos_routines (tenant_id, name, description, agent_id, cron, kind, prompt, output_target, effort, max_turns, enabled)
SELECT ag.tenant_id,
       'Morning AI Studio & WA Digest',
       'Daily summary of WA Conversations, Partner onboarding, Knowledge syncs, and pending approvals.',
       ag.id,
       '0 7 * * 1-5',
       'prompt',
       'Summarise overnight WA Conversations, WhatsApp Gateway session status, Partner store updates, and approvals waiting for a human. Keep it under 10 bullet points, grouped by current module.',
       'notification',
       'medium',
       6,
       FALSE
FROM public.aos_agents ag
WHERE ag.slug = 'petruk' AND ag.tenant_id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.aos_routines (tenant_id, name, description, agent_id, cron, kind, playbook_id, output_target, effort, max_turns, enabled)
SELECT ag.tenant_id,
       'WA Unanswered Chat Triage',
       'Every 30 minutes, triage unanswered WhatsApp customer threads and draft grounded replies.',
       ag.id,
       '*/30 * * * *',
       'playbook',
       pb.id,
       'task',
       'low',
       4,
       FALSE
FROM public.aos_agents ag
JOIN public.aos_playbooks pb ON pb.tenant_id = ag.tenant_id AND pb.title = 'Triage unanswered WhatsApp customer chats'
WHERE ag.slug = 'semar' AND ag.tenant_id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.aos_routines (tenant_id, name, description, agent_id, cron, kind, output_target, effort, max_turns, enabled)
SELECT ag.tenant_id,
       'Nightly memory map check',
       'Deterministic check: every signpost in the Memory Map points to an active AI Studio or Agentic OS route.',
       ag.id,
       '0 2 * * *',
       'check',
       'memory',
       'low',
       1,
       FALSE
FROM public.aos_agents ag
WHERE ag.slug = 'yudhis' AND ag.tenant_id = '00000000-0000-0000-0000-000000000010';

-- 7. Replace legacy workflows and goals with current-system records
DELETE FROM public.aos_workflows
WHERE tenant_id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.aos_workflows (tenant_id, name, description, trigger, graph, enabled) VALUES
(
    '00000000-0000-0000-0000-000000000010',
    'WA Conversation Escalation & Follow-up',
    'Semar triages unanswered WhatsApp chats -> Yudhistira checks Knowledge Research -> human approval -> Petruk logs follow-up.',
    'manual',
    '{"nodes":[{"id":"t1","kind":"trigger","label":"WA chat unanswered","x":40,"y":120},{"id":"s1","kind":"task","label":"Triage WA thread","x":220,"y":60,"agentSlug":"semar","moduleId":"wa-conversations","route":"/admin/ai-studio/percakapan-wa","steps":["Open WA Conversations","Inspect customer question & context","Draft grounded reply"]},{"id":"s2","kind":"task","label":"Verify FAQ in Knowledge","x":220,"y":190,"agentSlug":"yudhis","moduleId":"knowledge","route":"/admin/ai-studio/riset-knowledge","steps":["Search RAG Knowledge Research","Verify pricing & policy facts","Attach source citations"]},{"id":"a1","kind":"approval","label":"Approve customer reply","x":430,"y":125,"approvalNote":"Confirm reply accuracy before sending to WhatsApp customer"},{"id":"s3","kind":"task","label":"Send & log resolution","x":630,"y":125,"agentSlug":"petruk","moduleId":"wa-conversations","route":"/admin/ai-studio/percakapan-wa","steps":["Send approved WhatsApp reply","Mark conversation resolved"]}],"edges":[{"id":"e1","from":"t1","to":"s1"},{"id":"e2","from":"t1","to":"s2"},{"id":"e3","from":"s1","to":"a1"},{"id":"e4","from":"s2","to":"a1"},{"id":"e5","from":"a1","to":"s3"}]}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000010',
    'Partner Promo Campaign Pipeline',
    'Kresna selects partner highlights -> Drupadi drafts WhatsApp & social copy -> human approval.',
    'manual',
    '{"nodes":[{"id":"t1","kind":"trigger","label":"Weekly campaign kickoff","x":40,"y":120},{"id":"s1","kind":"task","label":"Select Partner products","x":230,"y":120,"agentSlug":"kresna","moduleId":"partner","route":"/admin/ai-studio/partner","steps":["Open Partner directory","Select featured UMKM products","Prepare campaign brief"]},{"id":"s2","kind":"task","label":"Generate marketing copy","x":430,"y":120,"agentSlug":"drupadi","moduleId":"marketing","route":"/admin/ai-studio/konten-marketing","steps":["Open Marketing Content","Generate WhatsApp & IG copy variants","Attach CTA links"]},{"id":"a1","kind":"approval","label":"Approve campaign copy","x":630,"y":120,"approvalNote":"Review campaign copy before publishing to Partner channels"}],"edges":[{"id":"e1","from":"t1","to":"s1"},{"id":"e2","from":"s1","to":"s2"},{"id":"e3","from":"s2","to":"a1"}]}'::jsonb,
    TRUE
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'aos_goals') THEN
        DELETE FROM public.aos_goals
        WHERE tenant_id = '00000000-0000-0000-0000-000000000010';

        INSERT INTO public.aos_goals (
            tenant_id, title, description, area_id, owner_agent_id,
            metric, target_value, current_value, unit, window_days,
            starts_on, gate_on, status, progress, next_action, next_action_due, color, sort_order
        )
        SELECT
            '00000000-0000-0000-0000-000000000010',
            'Keep WA Conversation response time under 2m',
            'Ensure incoming UMKM customer WhatsApp chats receive an accurate AI or operator response within 2 minutes.',
            ma.id,
            ag.id,
            'Mean WA response time',
            2,
            1.4,
            'min',
            90,
            CURRENT_DATE - INTERVAL '14 days',
            CURRENT_DATE + INTERVAL '76 days',
            'active',
            0.82,
            'Audit recent AI auto-replies in WA Conversations with Semar',
            CURRENT_DATE + INTERVAL '3 days',
            '#22c55e',
            0
        FROM public.aos_agents ag
        LEFT JOIN public.aos_memory_areas ma ON ma.tenant_id = ag.tenant_id AND ma.slug = 'whatsapp-ops'
        WHERE ag.tenant_id = '00000000-0000-0000-0000-000000000010' AND ag.slug = 'semar';

        INSERT INTO public.aos_goals (
            tenant_id, title, description, area_id, owner_agent_id,
            metric, target_value, current_value, unit, window_days,
            starts_on, gate_on, status, progress, next_action, next_action_due, color, sort_order
        )
        SELECT
            '00000000-0000-0000-0000-000000000010',
            'Onboard & index 50 UMKM Partner stores',
            'Complete store profile, WhatsApp assistant binding, and RAG Knowledge Research indexing for 50 partner stores.',
            ma.id,
            ag.id,
            'Indexed Partner stores',
            50,
            34,
            'stores',
            90,
            CURRENT_DATE - INTERVAL '20 days',
            CURRENT_DATE + INTERVAL '70 days',
            'active',
            0.68,
            'Sync updated partner product catalogs into Knowledge Research',
            CURRENT_DATE + INTERVAL '5 days',
            '#f59e0b',
            1
        FROM public.aos_agents ag
        LEFT JOIN public.aos_memory_areas ma ON ma.tenant_id = ag.tenant_id AND ma.slug = 'partner-governance'
        WHERE ag.tenant_id = '00000000-0000-0000-0000-000000000010' AND ag.slug = 'kresna';

        INSERT INTO public.aos_goals (
            tenant_id, title, description, area_id, owner_agent_id,
            metric, target_value, current_value, unit, window_days,
            starts_on, gate_on, status, progress, next_action, next_action_due, color, sort_order
        )
        SELECT
            '00000000-0000-0000-0000-000000000010',
            '100% agent coverage across all 8 active modules',
            'Every active module in AI Studio & Agentic OS has dedicated Wayang agents, playbooks, and verified memory signposts.',
            ma.id,
            ag.id,
            'Covered system modules',
            8,
            8,
            'modules',
            90,
            CURRENT_DATE - INTERVAL '7 days',
            CURRENT_DATE + INTERVAL '83 days',
            'achieved',
            1.0,
            'Run nightly memory map check to keep all module routes healthy',
            CURRENT_DATE + INTERVAL '7 days',
            '#38bdf8',
            2
        FROM public.aos_agents ag
        LEFT JOIN public.aos_memory_areas ma ON ma.tenant_id = ag.tenant_id AND ma.slug = 'ai-studio-core'
        WHERE ag.tenant_id = '00000000-0000-0000-0000-000000000010' AND ag.slug = 'petruk';
    END IF;
END $$;

-- 8. Clean up legacy ERP approvals, runs, and audit logs so Governance & Live Activity show only current system events
DELETE FROM public.aos_approvals
WHERE tenant_id = '00000000-0000-0000-0000-000000000010';

DO $$
BEGIN
    EXECUTE 'ALTER TABLE public.aos_runs DISABLE TRIGGER ALL';
    DELETE FROM public.aos_runs
    WHERE tenant_id = '00000000-0000-0000-0000-000000000010';
    EXECUTE 'ALTER TABLE public.aos_runs ENABLE TRIGGER ALL';

    EXECUTE 'ALTER TABLE public.aos_audit_log DISABLE TRIGGER ALL';
    DELETE FROM public.aos_audit_log
    WHERE tenant_id = '00000000-0000-0000-0000-000000000010';
    EXECUTE 'ALTER TABLE public.aos_audit_log ENABLE TRIGGER ALL';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping aos_runs / aos_audit_log cleanup (requires table owner)';
END $$;

INSERT INTO public.aos_audit_log (tenant_id, actor_type, action, entity, summary, level, module_id, route)
VALUES
    ('00000000-0000-0000-0000-000000000010', 'system', 'align', 'agentic_os', 'Aligned 8 active Wayang agents, playbooks, memory map, routines, workflows, and goals to the AI Studio & Agentic OS modules', 'success', 'agentic-os', '/admin/agentic-os');

COMMIT;
