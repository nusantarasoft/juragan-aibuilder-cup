-- D-40 (Akbar): one WhatsApp owner number per store.
-- Does NOT delete rows; skips constraints when duplicates exist (prod: umkm-warung-klontong-bahagia).

DO $$
DECLARE
  dup RECORD;
  cfg RECORD;
  phone_count INT;
BEGIN
  FOR dup IN
    SELECT store_id, COUNT(*) AS row_count
    FROM public.tenant_wa_whitelist
    GROUP BY store_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'D-40 skip UNIQUE(store_id) on tenant_wa_whitelist: store_id=% rows=%',
      dup.store_id, dup.row_count;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tenant_wa_whitelist
    GROUP BY store_id
    HAVING COUNT(*) > 1
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'tenant_wa_whitelist_one_per_store'
    ) THEN
      ALTER TABLE public.tenant_wa_whitelist
        ADD CONSTRAINT tenant_wa_whitelist_one_per_store UNIQUE (store_id);
    END IF;
  END IF;

  FOR cfg IN SELECT tenant_id, business_phone, allowlist_phones FROM public.studio_whatsapp_config LOOP
    SELECT COUNT(DISTINCT p) INTO phone_count
    FROM (
      SELECT regexp_replace(COALESCE(cfg.business_phone, ''), '\D', '', 'g') AS p
      UNION ALL
      SELECT regexp_replace(x, '\D', '', 'g')
      FROM unnest(COALESCE(cfg.allowlist_phones, '{}')) AS x
    ) phones
    WHERE length(p) >= 8;

    IF phone_count > 1 THEN
      RAISE NOTICE 'D-40 skip allowlist CHECK: tenant_id=% distinct_phones=%',
        cfg.tenant_id, phone_count;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.studio_whatsapp_config c
    WHERE (
      SELECT COUNT(DISTINCT p)
      FROM (
        SELECT regexp_replace(COALESCE(c.business_phone, ''), '\D', '', 'g') AS p
        UNION ALL
        SELECT regexp_replace(x, '\D', '', 'g')
        FROM unnest(COALESCE(c.allowlist_phones, '{}')) AS x
      ) phones
      WHERE length(p) >= 8
    ) > 1
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'studio_whatsapp_config_allowlist_max_one'
    ) THEN
      ALTER TABLE public.studio_whatsapp_config
        ADD CONSTRAINT studio_whatsapp_config_allowlist_max_one
        CHECK (cardinality(COALESCE(allowlist_phones, '{}')) <= 1);
      COMMENT ON CONSTRAINT studio_whatsapp_config_allowlist_max_one ON public.studio_whatsapp_config IS
        'D-40: at most one allowlist slot; owner phone lives in business_phone.';
    END IF;
  END IF;
END $$;
