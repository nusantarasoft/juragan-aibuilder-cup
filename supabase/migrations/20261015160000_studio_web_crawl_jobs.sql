-- P2-1: AI Studio Web Crawler — persisted job queue (tenant-scoped)
CREATE TABLE IF NOT EXISTS studio_web_crawl_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    name                TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
    config              JSONB NOT NULL DEFAULT '{}'::jsonb,
    progress            INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    pages_found         INT NOT NULL DEFAULT 0,
    pages_scraped       INT NOT NULL DEFAULT 0,
    errors              INT NOT NULL DEFAULT 0,
    documents_generated INT NOT NULL DEFAULT 0,
    error_message       TEXT,
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_web_crawl_jobs_tenant_status
    ON studio_web_crawl_jobs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_studio_web_crawl_jobs_pending
    ON studio_web_crawl_jobs (created_at)
    WHERE status = 'pending';

COMMENT ON TABLE studio_web_crawl_jobs IS
    'AI Studio Web Crawler jobs — queued and processed by middleware worker (P2-1).';
