-- Riset Knowledge UMKM: scheduled fetch + human review before merge into kurikulum notebook.

CREATE TABLE IF NOT EXISTS public.studio_research_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('cron', 'manual')),
    triggered_by UUID,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed')),
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS studio_research_runs_started_idx
    ON public.studio_research_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_research_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'merged', 'expired')),
    category TEXT NOT NULL,
    topic_key TEXT NOT NULL,
    target_notebook_id UUID NOT NULL REFERENCES public.studio_notebooks (id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    effective_date DATE,
    supersedes_url TEXT,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    dedupe_hits JSONB,
    validation_flags JSONB,
    research_run_id UUID REFERENCES public.studio_research_runs (id) ON DELETE SET NULL,
    reject_reason TEXT,
    reviewer_id UUID,
    decided_at TIMESTAMPTZ,
    merged_source_id UUID REFERENCES public.studio_notebook_sources (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS studio_research_items_status_idx
    ON public.studio_research_items (status, created_at DESC);

CREATE INDEX IF NOT EXISTS studio_research_items_category_idx
    ON public.studio_research_items (category, created_at DESC);

CREATE INDEX IF NOT EXISTS studio_research_items_topic_idx
    ON public.studio_research_items (topic_key, created_at DESC);

COMMENT ON TABLE public.studio_research_runs IS
    'Batch runs for AI Studio Riset Knowledge (cron or manual).';

COMMENT ON TABLE public.studio_research_items IS
    'Pending regulatory research summaries; merge into notebook after super-admin approve.';

GRANT ALL ON public.studio_research_runs TO service_role, authenticator;
GRANT ALL ON public.studio_research_items TO service_role, authenticator;
GRANT SELECT, INSERT, UPDATE ON public.studio_research_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.studio_research_items TO authenticated;
