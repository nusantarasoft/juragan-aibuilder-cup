-- ═══════════════════════════════════════════════════════════
-- AI Studio — E-commerce sales views (read-only, for chat context)
-- Requires: ecom_orders, ecom_order_items (see supabase/ecommerce_schema.sql)
-- Apply: psql -U supabase_admin -d <db> -f middleware/sql/studio_sales_views.sql
-- ═══════════════════════════════════════════════════════════

-- Penjualan hari ini (satu baris ringkasan)
CREATE OR REPLACE VIEW public.v_studio_sales_today AS
SELECT
    CURRENT_DATE AS sales_date,
    'default'::text AS tenant_id,
    COUNT(*)::int AS order_count,
    COUNT(*) FILTER (WHERE payment_status IN ('paid', 'partial'))::int AS paid_order_count,
    COALESCE(SUM(total_amount) FILTER (
        WHERE status NOT IN ('cancelled', 'refunded')
    ), 0)::numeric(15, 2) AS revenue_gross,
    COALESCE(SUM(paid_amount) FILTER (
        WHERE payment_status IN ('paid', 'partial')
          AND status NOT IN ('cancelled', 'refunded')
    ), 0)::numeric(15, 2) AS revenue_paid
FROM public.ecom_orders
WHERE tenant_id = 'default'
  AND created_at::date = CURRENT_DATE;

COMMENT ON VIEW public.v_studio_sales_today IS
    'Ringkasan penjualan hari ini: jumlah order dan omzet (gross/paid).';

-- Penjualan keseluruhan / all-time
CREATE OR REPLACE VIEW public.v_studio_sales_summary AS
SELECT
    'default'::text AS tenant_id,
    COUNT(*)::int AS total_orders,
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS orders_today,
    COALESCE(SUM(total_amount) FILTER (
        WHERE status NOT IN ('cancelled', 'refunded')
    ), 0)::numeric(15, 2) AS revenue_gross_all_time,
    COALESCE(SUM(paid_amount) FILTER (
        WHERE payment_status IN ('paid', 'partial')
          AND status NOT IN ('cancelled', 'refunded')
    ), 0)::numeric(15, 2) AS revenue_paid_all_time,
    MIN(created_at) AS first_order_at,
    MAX(created_at) AS last_order_at
FROM public.ecom_orders
WHERE tenant_id = 'default';

COMMENT ON VIEW public.v_studio_sales_summary IS
    'Ringkasan penjualan keseluruhan tenant default.';

-- Produk paling laris (by revenue, top 15)
CREATE OR REPLACE VIEW public.v_studio_top_products AS
SELECT
    oi.item_sku,
    oi.item_name,
    SUM(oi.quantity)::int AS units_sold,
    COALESCE(SUM(oi.subtotal), 0)::numeric(15, 2) AS revenue,
    COUNT(DISTINCT oi.order_id)::int AS order_count
FROM public.ecom_order_items oi
INNER JOIN public.ecom_orders o ON o.id = oi.order_id
WHERE o.tenant_id = 'default'
  AND o.status NOT IN ('cancelled', 'refunded')
  AND oi.status NOT IN ('cancelled', 'returned')
GROUP BY oi.item_sku, oi.item_name
ORDER BY revenue DESC, units_sold DESC
LIMIT 15;

COMMENT ON VIEW public.v_studio_top_products IS
    'Produk terlaris berdasarkan revenue; untuk pertanyaan produk paling laris.';

-- Order terbaru (detail, max 20 baris di view)
CREATE OR REPLACE VIEW public.v_studio_recent_orders AS
SELECT
    id,
    order_number,
    customer_name,
    customer_email,
    status,
    payment_status,
    total_amount,
    paid_amount,
    source,
    created_at
FROM public.ecom_orders
WHERE tenant_id = 'default'
ORDER BY created_at DESC
LIMIT 20;

COMMENT ON VIEW public.v_studio_recent_orders IS
    '20 pesanan terbaru; untuk lookup nomor order / status pesanan.';

-- Legacy CS views → e-commerce (backward compatible names)
CREATE OR REPLACE VIEW public.v_studio_cs_orders AS
SELECT
    id,
    order_number,
    status,
    customer_id,
    customer_name,
    total_amount,
    payment_status,
    created_at,
    updated_at
FROM public.ecom_orders
WHERE tenant_id = 'default';

CREATE OR REPLACE VIEW public.v_studio_cs_customers AS
SELECT
    id,
    TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS name,
    email,
    phone,
    customer_code,
    total_orders,
    total_spent,
    created_at
FROM public.ecom_customers
WHERE tenant_id = 'default';

-- Data catalog for AI Studio (lightweight metadata)
CREATE TABLE IF NOT EXISTS public.studio_data_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_type TEXT NOT NULL DEFAULT 'view' CHECK (object_type IN ('view', 'table', 'rpc')),
    object_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    example_questions TEXT[] DEFAULT '{}',
    columns_hint JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.studio_data_catalog (object_type, object_name, description, example_questions, columns_hint)
VALUES
    ('view', 'v_studio_sales_today', 'Ringkasan penjualan hari ini (jumlah order, omzet gross & paid).',
     ARRAY['Berapa penjualan hari ini?', 'Omzet hari ini?', 'Ada berapa order hari ini?'],
     '[{"name":"sales_date"},{"name":"order_count"},{"name":"revenue_gross"},{"name":"revenue_paid"}]'::jsonb),
    ('view', 'v_studio_sales_summary', 'Ringkasan penjualan keseluruhan / all-time.',
     ARRAY['Total penjualan?', 'Penjualan keseluruhan?', 'Berapa omzet total?'],
     '[{"name":"total_orders"},{"name":"revenue_gross_all_time"},{"name":"revenue_paid_all_time"}]'::jsonb),
    ('view', 'v_studio_top_products', 'Produk terlaris by revenue.',
     ARRAY['Produk apa yang paling laris?', 'Best seller?', 'Top produk penjualan?'],
     '[{"name":"item_name"},{"name":"item_sku"},{"name":"units_sold"},{"name":"revenue"}]'::jsonb),
    ('view', 'v_studio_recent_orders', 'Daftar pesanan terbaru; cari by order_number.',
     ARRAY['Status pesanan ORD-2026-001', 'Pesanan terbaru apa saja?'],
     '[{"name":"order_number"},{"name":"status"},{"name":"total_amount"}]'::jsonb)
ON CONFLICT (object_name) DO UPDATE SET
    description = EXCLUDED.description,
    example_questions = EXCLUDED.example_questions,
    columns_hint = EXCLUDED.columns_hint;

GRANT SELECT ON public.v_studio_sales_today TO authenticated, service_role, anon;
GRANT SELECT ON public.v_studio_sales_summary TO authenticated, service_role, anon;
GRANT SELECT ON public.v_studio_top_products TO authenticated, service_role, anon;
GRANT SELECT ON public.v_studio_recent_orders TO authenticated, service_role, anon;
GRANT SELECT ON public.v_studio_cs_orders TO authenticated, service_role, anon;
GRANT SELECT ON public.v_studio_cs_customers TO authenticated, service_role, anon;
GRANT SELECT ON public.studio_data_catalog TO authenticated, service_role, anon;
