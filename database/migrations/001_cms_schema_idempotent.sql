-- Idempotent CMS ensure (policies/triggers safe on re-run).
-- Full schema: admin/supabase/migrations/001_cms_schema.sql

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'editor',
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (name, description, permissions) VALUES
    ('super_admin', 'Full access to all features', '["all"]'::jsonb),
    ('admin', 'Access to most features', '["pages", "media", "users"]'::jsonb),
    ('editor', 'Can create and edit content', '["pages", "media"]'::jsonb),
    ('viewer', 'Can only view content', '["pages.read", "media.read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    author_id UUID REFERENCES auth.users(id),
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    featured_image TEXT,
    template TEXT DEFAULT 'default',
    sort_order INTEGER DEFAULT 0,
    parent_id UUID REFERENCES public.pages(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_name TEXT,
    url TEXT NOT NULL,
    s3_key TEXT,
    storage_path TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    caption TEXT,
    folder TEXT DEFAULT 'uploads',
    embedding vector(512),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('template', 'content', 'widget')),
    type TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    preview_image TEXT,
    default_props JSONB DEFAULT '{}'::jsonb,
    props_schema JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category TEXT DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_media_folder ON public.media(folder);

INSERT INTO public.settings (key, value, category) VALUES
    ('site_name', '"Nusantarasoft"'::jsonb, 'general'),
    ('site_description', '"Powered by Nusantarasoft CMS"'::jsonb, 'general'),
    ('site_logo', '""'::jsonb, 'general'),
    ('primary_color', '"#1677ff"'::jsonb, 'appearance'),
    ('seo_title_template', '"%s | Nusantarasoft"'::jsonb, 'seo'),
    ('social_links', '{"facebook": "", "twitter": "", "instagram": "", "linkedin": ""}'::jsonb, 'social')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pages_updated_at ON public.pages;
CREATE TRIGGER pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS settings_updated_at ON public.settings;
CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
