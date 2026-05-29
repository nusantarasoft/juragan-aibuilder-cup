-- ============================================================================
-- Blog System Schema
-- Features: Posts, Tags, Comments, Categories
-- ============================================================================

-- ============================================================================
-- BLOG CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES blog_categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories
INSERT INTO blog_categories (name, slug, description) VALUES
    ('Technology', 'technology', 'Tech news and tutorials'),
    ('Tutorials', 'tutorials', 'Step-by-step guides'),
    ('News', 'news', 'Company news and updates'),
    ('DevOps', 'devops', 'DevOps and infrastructure')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- BLOG TAGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6' -- Tailwind blue-500
);

-- Default tags
INSERT INTO blog_tags (name, slug, color) VALUES
    ('Docker', 'docker', '#2496ED'),
    ('Supabase', 'supabase', '#3ECF8E'),
    ('PostgreSQL', 'postgresql', '#336791'),
    ('Kubernetes', 'kubernetes', '#326CE5'),
    ('Next.js', 'nextjs', '#000000'),
    ('TypeScript', 'typescript', '#3178C6')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- BLOG POSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT, -- Short summary
    content TEXT NOT NULL, -- Markdown content
    
    -- Media
    cover_image TEXT, -- URL or file_id
    cover_image_alt TEXT,
    
    -- Author
    author_id UUID, -- logical FK to auth.users(id)
    
    -- Category
    category_id UUID REFERENCES blog_categories(id),
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- POST TAGS (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- ============================================================================
-- BLOG COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id UUID, -- logical FK to auth.users(id)
    
    -- Guest comments (if user_id is null)
    guest_name TEXT,
    guest_email TEXT,
    
    content TEXT NOT NULL,
    
    -- Reply to another comment
    parent_id UUID REFERENCES blog_comments(id),
    
    -- Moderation
    is_approved BOOLEAN DEFAULT false,
    is_spam BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BLOG LIKES
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_likes (
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id UUID, -- logical FK to auth.users(id) ON DELETE CASCADE
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_author_idx ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS blog_comments_post_idx ON blog_comments(post_id, created_at DESC);

-- Full-text search on posts
CREATE INDEX IF NOT EXISTS blog_posts_search_idx ON blog_posts 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || content));

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can view published posts
CREATE POLICY "View published posts" ON blog_posts
    FOR SELECT USING (status = 'published');

-- Anyone can view approved comments
CREATE POLICY "View approved comments" ON blog_comments
    FOR SELECT USING (is_approved = true AND is_spam = false);

-- Anyone can view categories and tags
CREATE POLICY "View categories" ON blog_categories FOR SELECT USING (true);
CREATE POLICY "View tags" ON blog_tags FOR SELECT USING (true);

-- Auth-dependent policies (only created when auth schema exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE 'CREATE POLICY "Authors manage own posts" ON blog_posts FOR ALL USING (auth.uid() = author_id)';
    EXECUTE 'CREATE POLICY "Users can comment" ON blog_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR guest_email IS NOT NULL)';
    EXECUTE 'CREATE POLICY "Users manage own comments" ON blog_comments FOR ALL USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can like" ON blog_likes FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get post with tags
CREATE OR REPLACE FUNCTION get_post_with_tags(p_slug TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    content TEXT,
    cover_image TEXT,
    author_id UUID,
    category_name TEXT,
    tags TEXT[],
    view_count INTEGER,
    like_count BIGINT,
    comment_count BIGINT,
    published_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Increment view count
    UPDATE blog_posts SET view_count = view_count + 1 WHERE blog_posts.slug = p_slug;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.content,
        p.cover_image,
        p.author_id,
        c.name AS category_name,
        ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) AS tags,
        p.view_count,
        (SELECT COUNT(*) FROM blog_likes WHERE post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM blog_comments WHERE post_id = p.id AND is_approved = true) AS comment_count,
        p.published_at
    FROM blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.id
    LEFT JOIN blog_post_tags pt ON p.id = pt.post_id
    LEFT JOIN blog_tags t ON pt.tag_id = t.id
    WHERE p.slug = p_slug AND p.status = 'published'
    GROUP BY p.id, c.name;
END;
$$;

-- Search posts
CREATE OR REPLACE FUNCTION search_blog_posts(search_query TEXT, limit_count INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    cover_image TEXT,
    published_at TIMESTAMPTZ,
    rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.cover_image,
        p.published_at,
        ts_rank(to_tsvector('english', p.title || ' ' || COALESCE(p.excerpt, '') || ' ' || p.content), plainto_tsquery('english', search_query)) AS rank
    FROM blog_posts p
    WHERE p.status = 'published'
        AND to_tsvector('english', p.title || ' ' || COALESCE(p.excerpt, '') || ' ' || p.content) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC
    LIMIT limit_count;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION blog_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION blog_update_timestamp();

DO $$ BEGIN RAISE NOTICE 'Blog schema created successfully'; END $$;
