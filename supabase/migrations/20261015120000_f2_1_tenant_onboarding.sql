-- F2-1: self-serve tenant onboarding (UUID tenants, slug aliases, WA whitelist, trial plan)

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.trial_ends_at IS 'When subscription_plan=trial, downgrade to free after this timestamp';

CREATE TABLE IF NOT EXISTS public.tenant_slug_aliases (
    slug TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_slug_aliases_tenant ON public.tenant_slug_aliases(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    studio_slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_stores_tenant ON public.tenant_stores(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_wa_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.tenant_stores(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    label TEXT,
    is_owner BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (store_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_tenant_wa_whitelist_store ON public.tenant_wa_whitelist(store_id);

-- Extend CMS roles for store owners
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'tenant_owner'));

-- Legacy prod tenant: ensure UUID row + slug alias without moving studio string keys
DO $$
DECLARE
    legacy_slug TEXT := 'umkm-warung-klontong-bahagia';
    tid UUID;
BEGIN
    SELECT tenant_id INTO tid FROM public.tenant_slug_aliases WHERE slug = legacy_slug;
    IF tid IS NULL THEN
        SELECT id INTO tid FROM public.tenants WHERE slug = legacy_slug;
    END IF;
    IF tid IS NULL THEN
        INSERT INTO public.tenants (name, slug, subscription_plan, settings, is_active)
        VALUES (
            'Warung Klontong Bahagia',
            legacy_slug || '-uuid',
            'free',
            jsonb_build_object(
                'onboarding', jsonb_build_object('source', 'legacy_migration', 'storeDisplayName', 'Warung Klontong Bahagia'),
                'modules', jsonb_build_array('aos', 'vo')
            ),
            true
        )
        RETURNING id INTO tid;
    END IF;

    INSERT INTO public.tenant_slug_aliases (slug, tenant_id)
    VALUES (legacy_slug, tid)
    ON CONFLICT (slug) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;

    INSERT INTO public.tenant_stores (tenant_id, display_name, studio_slug)
    VALUES (tid, 'Warung Klontong Bahagia', legacy_slug)
    ON CONFLICT (tenant_id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            studio_slug = EXCLUDED.studio_slug,
            updated_at = NOW();

    -- Seed whitelist from existing studio_whatsapp_config if present
    INSERT INTO public.tenant_wa_whitelist (store_id, phone, is_owner, label)
    SELECT ts.id, normalize_phone, true, 'owner'
    FROM public.tenant_stores ts
    JOIN public.studio_whatsapp_config sw ON sw.tenant_id = legacy_slug
    CROSS JOIN LATERAL (
        SELECT regexp_replace(COALESCE(sw.business_phone, ''), '[^0-9]', '', 'g') AS normalize_phone
    ) p
    WHERE ts.studio_slug = legacy_slug
      AND length(p.normalize_phone) >= 8
    ON CONFLICT (store_id, phone) DO NOTHING;
END $$;

GRANT ALL ON public.tenant_slug_aliases TO service_role;
GRANT ALL ON public.tenant_stores TO service_role;
GRANT ALL ON public.tenant_wa_whitelist TO service_role;

NOTIFY pgrst, 'reload schema';
