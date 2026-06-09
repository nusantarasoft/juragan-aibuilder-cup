-- ═══════════════════════════════════════════════════════════
-- AI Studio UMKM — database prerequisites
-- Run after: ecommerce_schema.sql, studio_sales_views.sql, studio_whatsapp.sql
-- ═══════════════════════════════════════════════════════════

-- 1. E-commerce tables (if not yet applied)
-- \i supabase/ecommerce_schema.sql

-- 2. Sales views for laporan WA
-- \i middleware/sql/studio_sales_views.sql

-- 3. Optional demo orders for testing laporan
-- \i supabase/studio_sales_seed.sql

-- 4. Enable UMKM mode on a notebook (replace NOTEBOOK_ID)
-- UPDATE studio_notebooks
-- SET context_config = context_config || '{
--   "umkm_mode": true,
--   "audience": "customer",
--   "tenant_id": "default",
--   "supabase_views": [
--     "v_studio_sales_today",
--     "v_studio_sales_summary",
--     "v_studio_top_products",
--     "v_studio_recent_orders"
--   ]
-- }'::jsonb,
--     audience = 'customer',
--     updated_at = now()
-- WHERE id = 'NOTEBOOK_ID';

-- 5. WhatsApp config (replace NOTEBOOK_ID and phone)
-- INSERT INTO studio_whatsapp_config (tenant_id, notebook_id, enabled, allowlist_phones, use_guided_flow, updated_at)
-- VALUES ('default', 'NOTEBOOK_ID', true, ARRAY['6281234567890'], true, now())
-- ON CONFLICT (tenant_id) DO UPDATE SET
--   notebook_id = EXCLUDED.notebook_id,
--   enabled = EXCLUDED.enabled,
--   allowlist_phones = EXCLUDED.allowlist_phones,
--   use_guided_flow = EXCLUDED.use_guided_flow,
--   updated_at = now();

COMMENT ON VIEW public.v_studio_sales_today IS
    'UMKM laporan harian — dipakai StudioUmkmService.fetchDailyReport().';
