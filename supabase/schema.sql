-- ===========================================
-- Nusantarasoft CMS Database Schema
-- Run this in Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PAGES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID,
    meta_title VARCHAR(255),
    meta_description TEXT,
    og_image VARCHAR(500),
    og_title VARCHAR(255),
    og_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Sample pages data
INSERT INTO public.pages (id, title, slug, status, content, meta_title) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Home Page', 'home', 'published', '[]', 'Welcome to Nusantarasoft'),
    ('00000000-0000-0000-0000-000000000002', 'About Us', 'about', 'published', '[]', 'About Our Company'),
    ('00000000-0000-0000-0000-000000000003', 'Contact', 'contact', 'draft', '[]', 'Contact Us'),
    ('00000000-0000-0000-0000-000000000004', 'Services', 'services', 'draft', '[]', 'Our Services')
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- SETTINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    group_name VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample settings
INSERT INTO public.settings (key, value, group_name) VALUES
    ('site_name', '"Nusantarasoft CMS"', 'general'),
    ('site_description', '"A modern content management system"', 'general'),
    ('primary_color', '"#1890ff"', 'theme')
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- MEDIA TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    size INTEGER,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    folder VARCHAR(255) DEFAULT '/',
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- BLOCKS TABLE (Block Library)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    thumbnail VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample blocks
INSERT INTO public.blocks (name, category, description, content) VALUES
    ('Hero Section', 'layout', 'Full-width hero with title and CTA', '{"type": "hero", "props": {}}'),
    ('Text Block', 'content', 'Rich text content block', '{"type": "text", "props": {}}'),
    ('Image Gallery', 'media', 'Responsive image gallery', '{"type": "gallery", "props": {}}')
ON CONFLICT DO NOTHING;

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Allow read access to anon role
CREATE POLICY "Allow public read" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.media FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.blocks FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service full access" ON public.pages FOR ALL USING (true);
CREATE POLICY "Allow service full access" ON public.settings FOR ALL USING (true);
CREATE POLICY "Allow service full access" ON public.media FOR ALL USING (true);
CREATE POLICY "Allow service full access" ON public.blocks FOR ALL USING (true);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);
CREATE INDEX IF NOT EXISTS idx_media_folder ON public.media(folder);
CREATE INDEX IF NOT EXISTS idx_blocks_category ON public.blocks(category);

-- Done!
-- Now test with: SELECT * FROM pages;
