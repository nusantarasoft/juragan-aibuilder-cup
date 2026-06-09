-- ═══════════════════════════════════════════════════════════
-- AI Studio UMKM — database prerequisites
-- Run after: ecommerce_schema.sql, studio_sales_views.sql, studio_whatsapp.sql,
--            studio_whatsapp_multitenant.sql, studio_whatsapp_shared_inbox.sql
-- ═══════════════════════════════════════════════════════════

-- Model: SATU nomor WhatsApp admin (WAHA session `default`).
-- Setiap UMKM didaftarkan dengan nomor HP PEMILIK yang mengirim WA ke nomor admin.
-- Routing tenant = cocokkan nomor pengirim (from) dengan business_phone / allowlist_phones.

-- ── UMKM pertama (dev) ────────────────────────────────────

-- UPDATE studio_whatsapp_config SET
--   notebook_id = 'NOTEBOOK_ID',
--   waha_session = 'default',
--   business_phone = '6288123456789',
--   label = 'Toko Dev',
--   enabled = true,
--   use_guided_flow = true,
--   updated_at = now()
-- WHERE tenant_id = 'default';

-- ── UMKM kedua (contoh) ───────────────────────────────────

-- INSERT INTO studio_whatsapp_config (
--   tenant_id, notebook_id, waha_session, business_phone, label,
--   enabled, allowlist_phones, use_guided_flow, updated_at
-- ) VALUES (
--   'umkm-toko-bu-ani',
--   'NOTEBOOK_UUID',
--   'default',
--   '6282223344556',
--   'Warung Bu Ani',
--   true,
--   '{}',
--   true,
--   now()
-- ) ON CONFLICT (tenant_id) DO UPDATE SET
--   business_phone = EXCLUDED.business_phone,
--   label = EXCLUDED.label,
--   updated_at = now();

COMMENT ON TABLE public.studio_whatsapp_config IS
    'Satu inbox WA admin; tiap baris = satu UMKM (tenant) dengan nomor pemilik terdaftar.';
