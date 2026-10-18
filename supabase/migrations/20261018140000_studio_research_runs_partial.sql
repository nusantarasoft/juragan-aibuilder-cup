-- Allow partial completion when some topic URLs fail LLM/dedupe but others succeed.

ALTER TABLE public.studio_research_runs
    DROP CONSTRAINT IF EXISTS studio_research_runs_status_check;

ALTER TABLE public.studio_research_runs
    ADD CONSTRAINT studio_research_runs_status_check
    CHECK (status IN ('running', 'completed', 'failed', 'partial'));
