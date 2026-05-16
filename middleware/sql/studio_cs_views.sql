-- Optional read-only views for AI Studio customer-service DB context.
-- Adjust table/column names to match your CRM schema before applying.

CREATE OR REPLACE VIEW public.v_studio_cs_orders AS
SELECT
    id,
    order_number,
    status,
    customer_id,
    total_amount,
    created_at,
    updated_at
FROM public.orders
WHERE true;

CREATE OR REPLACE VIEW public.v_studio_cs_customers AS
SELECT
    id,
    name,
    email,
    phone,
    created_at
FROM public.customers
WHERE true;

GRANT SELECT ON public.v_studio_cs_orders TO authenticated, service_role, anon;
GRANT SELECT ON public.v_studio_cs_customers TO authenticated, service_role, anon;
