-- ═══════════════════════════════════════════════════════════
-- AI Studio UMKM — database prerequisites
-- Run after: ecommerce_schema.sql, studio_sales_views.sql, studio_whatsapp.sql, studio_whatsapp_multitenant.sql
-- ═══════════════════════════════════════════════════════════

-- 1. E-commerce tables (if not yet applied)
-- \i supabase/ecommerce_schema.sql

-- 2. Sales views (legacy single-tenant; laporan WA uses tenant-scoped queries in middleware)
-- \i middleware/sql/studio_sales_views.sql

-- 3. Multi-UMKM WhatsApp columns
-- \i middleware/sql/studio_whatsapp_multitenant.sql

-- ── Single UMKM (dev) ─────────────────────────────────────
-- Satu nomor bisnis = satu tenant_id = satu notebook UMKM

-- UPDATE studio_notebooks SET context_config = context_config || '{"umkm_mode":true,"tenant_id":"default"}'::jsonb
-- WHERE id = 'NOTEBOOK_ID';

-- UPDATE studio_whatsapp_config SET
--   notebook_id = 'NOTEBOOK_ID',
--   waha_session = 'default',
--   business_phone = '6281110115321',
--   label = 'UMKM Dev',
--   enabled = true,
--   use_guided_flow = true,
--   updated_at = now()
-- WHERE tenant_id = 'default';

-- ── UMKM kedua (contoh) ───────────────────────────────────
-- 1. Buat notebook baru di Studio, lalu:

-- INSERT INTO studio_whatsapp_config (
--   tenant_id, notebook_id, waha_session, business_phone, label,
--   enabled, allowlist_phones, use_guided_flow, updated_at
-- ) VALUES (
--   'umkm-toko-bu-ani',
--   'NOTEBOOK_UUID_BU_ANI',
--   'toko-bu-ani',
--   '6282223344556',
--   'Warung Bu Ani',
--   true,
--   '{}',
--   true,
--   now()
-- ) ON CONFLICT (tenant_id) DO UPDATE SET
--   notebook_id = EXCLUDED.notebook_id,
--   waha_session = EXCLUDED.waha_session,
--   business_phone = EXCLUDED.business_phone,
--   label = EXCLUDED.label,
--   enabled = EXCLUDED.enabled,
--   use_guided_flow = EXCLUDED.use_guided_flow,
--   updated_at = now();

-- 2. GraphQL: studioSetupUmkmNotebook(notebookId, tenantId: "umkm-toko-bu-ani", publishGuideFlow: true)

-- 3. WAHA: buat session baru `toko-bu-ani` dengan nomor bisnis 6282223344556
--    Webhook body.session harus sama dengan waha_session di config.

-- 4. Katalog per UMKM:
-- INSERT INTO inv_items (tenant_id, name, sku, selling_price, status) VALUES
--   ('umkm-toko-bu-ani', 'Nasi Goreng', 'NG-01', 15000, 'active');

COMMENT ON TABLE public.studio_whatsapp_config IS
    'Satu baris per UMKM: tenant_id + waha_session (nomor bisnis WA) → notebook + data terisolasi.';
