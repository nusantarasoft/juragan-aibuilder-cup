-- Set default sales views on notebooks that still have empty context_config.
UPDATE public.studio_notebooks
SET context_config = '{
  "supabase_views": [
    "v_studio_sales_today",
    "v_studio_sales_summary",
    "v_studio_top_products",
    "v_studio_recent_orders"
  ]
}'::jsonb,
    updated_at = NOW()
WHERE context_config IS NULL
   OR context_config = '{}'::jsonb;
