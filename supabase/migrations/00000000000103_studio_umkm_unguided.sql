-- AI Studio UMKM — flip WhatsApp configs off Guide Flow (labels only).
--
-- Apply AFTER new middleware is Up (umkm-first inbound router).
-- Do not apply while old containers still serve inbound: old routing checked
-- use_guided_flow first, so this UPDATE on stale code would drop shops onto
-- handleMessage before agentic-ask / apology exist (S9).
--
-- Behavior source of truth is notebook context_config.umkm_mode, not this flag.
-- Idempotent. Leaves rows with null notebook_id unchanged.

UPDATE public.studio_whatsapp_config c
SET use_guided_flow = false
FROM public.studio_notebooks n
WHERE c.notebook_id = n.id
  AND n.context_config->'umkm_mode' = 'true'::jsonb
  AND c.use_guided_flow = true;
