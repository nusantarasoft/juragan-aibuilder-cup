-- BSS period aggregate for Hermes WA reports (CEO+eng 2026-10-06).
-- Matches Hermes _combined_report / top-products filters:
--   sales: ecom_orders.status NOT IN (cancelled, refunded); window on created_at
--   items: ecom_order_items.status NOT IN (cancelled, returned)
--   buys: studio_umkm_purchases.status = completed; window on purchase_date (date)

CREATE INDEX IF NOT EXISTS idx_ecom_orders_tenant_created
    ON public.ecom_orders (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ecom_order_items_order_id
    ON public.ecom_order_items (order_id);

CREATE OR REPLACE FUNCTION public.kasir_period_report(
    p_tenant_id text,
    p_from timestamptz,
    p_to timestamptz,
    p_top_n int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_limit int;
    v_order_count bigint;
    v_revenue numeric;
    v_purchase_total numeric;
    v_top jsonb;
BEGIN
    PERFORM set_config('statement_timeout', '15s', true);

    IF p_tenant_id IS NULL OR btrim(p_tenant_id) = '' THEN
        RAISE EXCEPTION 'tenant_id required';
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
        RAISE EXCEPTION 'invalid range';
    END IF;

    v_limit := GREATEST(1, LEAST(COALESCE(p_top_n, 5), 20));

    SELECT
        COUNT(*)::bigint,
        COALESCE(SUM(o.total_amount), 0)
    INTO v_order_count, v_revenue
    FROM public.ecom_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.created_at >= p_from
      AND o.created_at <= p_to
      AND lower(COALESCE(o.status, '')) NOT IN ('cancelled', 'refunded');

    SELECT COALESCE(SUM(p.total_cost), 0)
    INTO v_purchase_total
    FROM public.studio_umkm_purchases p
    WHERE p.tenant_id = p_tenant_id
      AND p.status = 'completed'
      AND p.purchase_date >= (p_from AT TIME ZONE 'Asia/Jakarta')::date
      AND p.purchase_date <= (p_to AT TIME ZONE 'Asia/Jakarta')::date;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'name', x.name,
                'units', x.units,
                'revenue', x.revenue
            )
            ORDER BY x.revenue DESC, x.units DESC
        ),
        '[]'::jsonb
    )
    INTO v_top
    FROM (
        SELECT
            COALESCE(NULLIF(btrim(oi.item_name), ''), 'Produk') AS name,
            SUM(COALESCE(oi.quantity, 0))::numeric AS units,
            SUM(COALESCE(oi.subtotal, 0))::numeric AS revenue
        FROM public.ecom_order_items oi
        INNER JOIN public.ecom_orders o ON o.id = oi.order_id
        WHERE o.tenant_id = p_tenant_id
          AND o.created_at >= p_from
          AND o.created_at <= p_to
          AND lower(COALESCE(o.status, '')) NOT IN ('cancelled', 'refunded')
          AND lower(COALESCE(oi.status, '')) NOT IN ('cancelled', 'returned')
        GROUP BY 1
        ORDER BY SUM(COALESCE(oi.subtotal, 0)) DESC, SUM(COALESCE(oi.quantity, 0)) DESC
        LIMIT v_limit
    ) x;

    RETURN jsonb_build_object(
        'order_count', v_order_count,
        'revenue', v_revenue,
        'purchase_total', v_purchase_total,
        'top_products', v_top
    );
END;
$$;

REVOKE ALL ON FUNCTION public.kasir_period_report(text, timestamptz, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kasir_period_report(text, timestamptz, timestamptz, int) TO service_role;

NOTIFY pgrst, 'reload schema';
