-- ═══════════════════════════════════════════════════════════
-- News & Media Intelligence Module — 16 Tables
-- Pattern: tenant_id UUID (no FK), standard timestamps
-- ═══════════════════════════════════════════════════════════

-- 1. News Sources (RSS, Web, API)
CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'rss', -- rss, web, api, manual
    url TEXT,
    config JSONB DEFAULT '{}', -- selectors, auth, headers
    category TEXT DEFAULT 'general',
    language TEXT DEFAULT 'en',
    crawl_schedule TEXT DEFAULT '0 */6 * * *', -- cron
    is_active BOOLEAN DEFAULT true,
    last_crawled_at TIMESTAMPTZ,
    article_count INT DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_sources_tenant ON news_sources(tenant_id);

-- 2. News Articles
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    source_id UUID REFERENCES news_sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT,
    summary TEXT,
    content TEXT,
    url TEXT,
    image_url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    category TEXT DEFAULT 'general',
    language TEXT DEFAULT 'en',
    sentiment_score FLOAT DEFAULT 0, -- -1 to 1
    sentiment_label TEXT DEFAULT 'neutral', -- positive, negative, neutral
    sentiment_magnitude FLOAT DEFAULT 0,
    entities JSONB DEFAULT '[]',
    keywords JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active', -- active, archived, deleted
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_articles_tenant ON news_articles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_sentiment ON news_articles(tenant_id, sentiment_label);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(tenant_id, published_at DESC);

-- 3. News Tags (M:N junction)
CREATE TABLE IF NOT EXISTS news_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_tags_article ON news_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_news_tags_tag ON news_tags(tenant_id, tag);

-- 4. News Bookmarks
CREATE TABLE IF NOT EXISTS news_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(article_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_news_bookmarks_user ON news_bookmarks(tenant_id, user_id);

-- 5. Web Crawler Jobs
CREATE TABLE IF NOT EXISTS news_crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    job_type TEXT DEFAULT 'web', -- web, rss, sitemap, api
    target_url TEXT NOT NULL,
    schedule TEXT DEFAULT '0 */6 * * *',
    selectors JSONB DEFAULT '{}', -- title, content, date, author CSS selectors
    pagination JSONB DEFAULT '{}', -- next page selector, max pages
    filters JSONB DEFAULT '{}', -- include/exclude patterns
    max_depth INT DEFAULT 1,
    status TEXT DEFAULT 'active', -- active, paused, error, completed
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    total_pages_crawled INT DEFAULT 0,
    total_articles_extracted INT DEFAULT 0,
    error_message TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_crawl_jobs_tenant ON news_crawl_jobs(tenant_id);

-- 6. Crawl History
CREATE TABLE IF NOT EXISTS news_crawl_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES news_crawl_jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    pages_crawled INT DEFAULT 0,
    articles_found INT DEFAULT 0,
    articles_new INT DEFAULT 0,
    errors INT DEFAULT 0,
    status TEXT DEFAULT 'running', -- running, completed, failed
    error_log JSONB DEFAULT '[]',
    duration_ms INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_news_crawl_history_job ON news_crawl_history(job_id);

-- 7. Social Media Accounts
CREATE TABLE IF NOT EXISTS news_social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    platform TEXT NOT NULL, -- twitter, facebook, instagram, linkedin, tiktok
    account_name TEXT NOT NULL,
    display_name TEXT,
    profile_url TEXT,
    avatar_url TEXT,
    access_token TEXT, -- encrypted in production
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    status TEXT DEFAULT 'connected', -- connected, disconnected, expired, error
    last_synced_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_social_accounts_tenant ON news_social_accounts(tenant_id);

-- 8. Social Media Posts
CREATE TABLE IF NOT EXISTS news_social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_id UUID REFERENCES news_social_accounts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    hashtags JSONB DEFAULT '[]',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    external_post_id TEXT,
    post_url TEXT,
    status TEXT DEFAULT 'draft', -- draft, scheduled, published, failed
    error_message TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_social_posts_tenant ON news_social_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_social_posts_status ON news_social_posts(tenant_id, status);

-- 9. Social Media Metrics
CREATE TABLE IF NOT EXISTS news_social_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES news_social_posts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    comments INT DEFAULT 0,
    reach INT DEFAULT 0,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    engagement_rate FLOAT DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_social_metrics_post ON news_social_metrics(post_id);

-- 10. Sentiment Entries
CREATE TABLE IF NOT EXISTS news_sentiment_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    source_type TEXT NOT NULL, -- article, social_post, crawled
    source_id UUID,
    text_snippet TEXT,
    score FLOAT DEFAULT 0, -- -1 to 1
    label TEXT DEFAULT 'neutral', -- positive, negative, neutral, mixed
    magnitude FLOAT DEFAULT 0, -- 0 to 1 (confidence)
    entities JSONB DEFAULT '[]', -- extracted entities
    keywords JSONB DEFAULT '[]', -- key phrases
    language TEXT DEFAULT 'en',
    analyzed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_tenant ON news_sentiment_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_label ON news_sentiment_entries(tenant_id, label);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_date ON news_sentiment_entries(tenant_id, analyzed_at DESC);

-- 11. Market Competitors
CREATE TABLE IF NOT EXISTS news_market_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    description TEXT,
    logo_url TEXT,
    social_profiles JSONB DEFAULT '{}', -- platform -> url
    keywords JSONB DEFAULT '[]', -- tracking keywords
    status TEXT DEFAULT 'tracking', -- tracking, archived
    last_activity_at TIMESTAMPTZ,
    signal_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_market_competitors_tenant ON news_market_competitors(tenant_id);

-- 12. Market Signals
CREATE TABLE IF NOT EXISTS news_market_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    competitor_id UUID REFERENCES news_market_competitors(id) ON DELETE SET NULL,
    signal_type TEXT NOT NULL, -- news, price_change, product_launch, hiring, funding, partnership
    title TEXT NOT NULL,
    description TEXT,
    source_url TEXT,
    impact TEXT DEFAULT 'neutral', -- positive, negative, neutral
    confidence FLOAT DEFAULT 0.5,
    data JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_market_signals_tenant ON news_market_signals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_market_signals_competitor ON news_market_signals(competitor_id);

-- 13. Content Drafts
CREATE TABLE IF NOT EXISTS news_content_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    content_type TEXT DEFAULT 'article', -- article, social_post, newsletter, press_release
    target_channels JSONB DEFAULT '[]', -- website, twitter, facebook, etc.
    media_urls JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft', -- draft, review, approved, scheduled, published, rejected
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_content_drafts_tenant ON news_content_drafts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_content_drafts_status ON news_content_drafts(tenant_id, status);

-- 14. Content Calendar
CREATE TABLE IF NOT EXISTS news_content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    draft_id UUID REFERENCES news_content_drafts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    channel TEXT NOT NULL, -- website, twitter, facebook, linkedin, instagram
    status TEXT DEFAULT 'planned', -- planned, confirmed, published, cancelled
    color TEXT DEFAULT '#3b82f6',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_content_calendar_tenant ON news_content_calendar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_content_calendar_date ON news_content_calendar(tenant_id, scheduled_date);

-- 15. Alert Rules
CREATE TABLE IF NOT EXISTS news_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- keyword, sentiment, competitor, volume
    conditions JSONB NOT NULL DEFAULT '{}', -- keyword patterns, thresholds
    channels JSONB DEFAULT '["inbox"]', -- inbox, email, webhook
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INT DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_alerts_tenant ON news_alerts(tenant_id);

-- 16. Module Settings
CREATE TABLE IF NOT EXISTS news_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    value_json JSONB,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, key)
);

-- Seed default settings
INSERT INTO news_settings (tenant_id, key, value, description) VALUES
    ('00000000-0000-0000-0000-000000000010', 'crawl_interval_minutes', '360', 'Default crawl interval'),
    ('00000000-0000-0000-0000-000000000010', 'max_articles_per_source', '100', 'Max articles stored per source'),
    ('00000000-0000-0000-0000-000000000010', 'sentiment_engine', 'builtin', 'Sentiment engine: builtin or external'),
    ('00000000-0000-0000-0000-000000000010', 'auto_sentiment', 'true', 'Auto-run sentiment on new articles'),
    ('00000000-0000-0000-0000-000000000010', 'social_post_approval', 'false', 'Require approval for social posts')
ON CONFLICT (tenant_id, key) DO NOTHING;
