-- Report stores / tenants with more than one registered WA owner number (D-40).
-- Run: psql "$DATABASE_URL" -f scripts/report-wa-duplicate-numbers.sql

\echo '--- tenant_wa_whitelist: multiple rows per store_id ---'
SELECT ts.studio_slug, ts.display_name, w.store_id, COUNT(*) AS whitelist_rows
FROM public.tenant_wa_whitelist w
JOIN public.tenant_stores ts ON ts.id = w.store_id
GROUP BY ts.studio_slug, ts.display_name, w.store_id
HAVING COUNT(*) > 1
ORDER BY whitelist_rows DESC, ts.studio_slug;

\echo '--- studio_whatsapp_config: >1 distinct owner phone (business + allowlist) ---'
SELECT c.tenant_id,
       c.label,
       c.business_phone,
       c.allowlist_phones,
       sub.distinct_phones
FROM public.studio_whatsapp_config c
JOIN LATERAL (
  SELECT COUNT(DISTINCT p) AS distinct_phones
  FROM (
    SELECT regexp_replace(COALESCE(c.business_phone, ''), '\D', '', 'g') AS p
    UNION ALL
    SELECT regexp_replace(x, '\D', '', 'g')
    FROM unnest(COALESCE(c.allowlist_phones, '{}')) AS x
  ) phones
  WHERE length(p) >= 8
) sub ON true
WHERE sub.distinct_phones > 1
ORDER BY sub.distinct_phones DESC, c.tenant_id;
