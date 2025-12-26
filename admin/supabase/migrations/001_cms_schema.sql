-- CMS Database Schema for Nusantarasoft
-- Run this in Supabase SQL Editor

-- ===============================
-- USER PROFILES (extends auth.users)
-- ===============================
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

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- ===============================
-- ROLES
-- ===============================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO public.roles (name, description, permissions) VALUES
    ('super_admin', 'Full access to all features', '["all"]'::jsonb),
    ('admin', 'Access to most features', '["pages", "media", "users"]'::jsonb),
    ('editor', 'Can create and edit content', '["pages", "media"]'::jsonb),
    ('viewer', 'Can only view content', '["pages.read", "media.read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ===============================
-- CMS PAGES
-- ===============================
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

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Policy: Published pages are public
CREATE POLICY "Published pages are public" ON public.pages
    FOR SELECT USING (status = 'published');

-- Policy: Authenticated users can CRUD pages
CREATE POLICY "Authenticated users can manage pages" ON public.pages
    FOR ALL USING (auth.role() = 'authenticated');

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);

-- ===============================
-- MEDIA LIBRARY
-- ===============================
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
    embedding vector(512), -- CLIP embeddings for similarity search
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Policy: Public media is readable
CREATE POLICY "Public media is readable" ON public.media
    FOR SELECT USING (true);

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload media" ON public.media
    FOR ALL USING (auth.role() = 'authenticated');

-- Create index for folder
CREATE INDEX IF NOT EXISTS idx_media_folder ON public.media(folder);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS idx_media_embedding ON public.media USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ===============================
-- MEDIA SIMILARITY SEARCH FUNCTION
-- ===============================
CREATE OR REPLACE FUNCTION search_similar_media(
    query_embedding vector(512),
    match_threshold float8 DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    filename text,
    url text,
    similarity float8
)
LANGUAGE sql STABLE AS $$
    SELECT 
        m.id, 
        m.filename, 
        m.url,
        1 - (m.embedding <=> query_embedding) as similarity
    FROM public.media m
    WHERE m.embedding IS NOT NULL
      AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ===============================
-- COMPONENT BLOCKS (Templates)
-- ===============================
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

-- Insert default template blocks
INSERT INTO public.blocks (name, category, type, description, icon, default_props, is_system) VALUES
    -- Template Blocks
    ('Navigation', 'template', 'navigation', 'Header with logo and menu', 'MenuOutlined', '{"logo": "", "items": [], "style": "default"}'::jsonb, true),
    ('Hero Banner', 'template', 'hero', 'Full-width hero section', 'PictureOutlined', '{"title": "Welcome", "subtitle": "", "cta": {"text": "Get Started", "link": "#"}, "background": ""}'::jsonb, true),
    ('Footer', 'template', 'footer', 'Page footer with links', 'BorderBottomOutlined', '{"copyright": "© 2024", "links": [], "socials": []}'::jsonb, true),
    
    -- Content Blocks
    ('Text Block', 'content', 'text', 'Rich text content', 'FileTextOutlined', '{"content": ""}'::jsonb, true),
    ('Features Grid', 'content', 'features', 'Grid of feature cards', 'AppstoreOutlined', '{"columns": 3, "items": []}'::jsonb, true),
    ('Testimonials', 'content', 'testimonials', 'Animated testimonials', 'CommentOutlined', '{"items": []}'::jsonb, true),
    ('Pricing Table', 'content', 'pricing', 'Pricing cards', 'DollarOutlined', '{"plans": []}'::jsonb, true),
    ('Image Gallery', 'content', 'gallery', 'Image grid or carousel', 'PictureOutlined', '{"images": [], "layout": "grid"}'::jsonb, true),
    ('Contact Form', 'content', 'contact', 'Contact form', 'MailOutlined', '{"fields": ["name", "email", "message"]}'::jsonb, true),
    
    -- Widgets
    ('Floating Dock', 'widget', 'dock', 'Mac-style floating dock', 'AppstoreOutlined', '{"items": [], "position": "bottom"}'::jsonb, true),
    ('Mini Games', 'widget', 'games', 'Embedded mini games', 'PlayCircleOutlined', '{"game": "snake"}'::jsonb, true),
    ('Chat Widget', 'widget', 'chat', 'Live chat widget', 'MessageOutlined', '{"enabled": true}'::jsonb, true),
    ('Analytics Counter', 'widget', 'counter', 'Animated stats counter', 'LineChartOutlined', '{"items": []}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- ===============================
-- SITE SETTINGS
-- ===============================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category TEXT DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.settings (key, value, category) VALUES
    ('site_name', '"Nusantarasoft"'::jsonb, 'general'),
    ('site_description', '"Powered by Nusantarasoft CMS"'::jsonb, 'general'),
    ('site_logo', '""'::jsonb, 'general'),
    ('primary_color', '"#1677ff"'::jsonb, 'appearance'),
    ('seo_title_template', '"%s | Nusantarasoft"'::jsonb, 'seo'),
    ('social_links', '{"facebook": "", "twitter": "", "instagram": "", "linkedin": ""}'::jsonb, 'social')
ON CONFLICT (key) DO NOTHING;

-- ===============================
-- CREATE SUPER ADMIN USER
-- ===============================
-- Note: Run this after creating the user in Supabase Auth
-- INSERT INTO public.user_profiles (id, email, full_name, role, two_factor_enabled)
-- SELECT id, email, 'Super Admin', 'super_admin', false
-- FROM auth.users WHERE email = 'admin@nusantarasoft.local';

-- ===============================
-- FUNCTIONS
-- ===============================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to pages
CREATE TRIGGER pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apply to user_profiles
CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apply to settings
CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
