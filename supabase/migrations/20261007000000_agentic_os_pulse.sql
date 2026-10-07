-- ════════════════════════════════════════════════════════════════════════════
-- Agentic OS — Phase 2: Pulse (real routine execution) + Governance
--   * aos_settings: llm_mode (live | dry_run), pulse_enabled, run_cost_ceiling_usd
--   * aos_runs: routine/kind/output/prompt context, blocked_reason, approval_id,
--     requested_by; append-only guard (no DELETE; finished runs are frozen)
--   * aos_approvals: run_id / routine_id for routine output deliveries (no task)
--   * aos_usage_summary(): exact usage counters for the deterministic gate
-- Idempotent: safe to re-run. No seed changes (the 3 routines stay disabled).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Settings ─────────────────────────────────────────────────────────────────
ALTER TABLE aos_settings ADD COLUMN IF NOT EXISTS llm_mode TEXT NOT NULL DEFAULT 'live'
    CHECK (llm_mode IN ('live', 'dry_run'));
ALTER TABLE aos_settings ADD COLUMN IF NOT EXISTS pulse_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE aos_settings ADD COLUMN IF NOT EXISTS run_cost_ceiling_usd NUMERIC(10,2) NOT NULL DEFAULT 5;

-- ── Runs ─────────────────────────────────────────────────────────────────────
ALTER TABLE aos_runs ADD COLUMN IF NOT EXISTS routine_name TEXT;
ALTER TABLE aos_runs ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE aos_runs ADD COLUMN IF NOT EXISTS output_target TEXT;
ALTER TABLE aos_runs ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE aos_runs ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE aos_runs ADD COLUMN IF NOT EXISTS approval_id UUID;
ALTER TABLE aos_runs ADD COLUMN IF NOT EXISTS requested_by UUID;

CREATE INDEX IF NOT EXISTS idx_aos_runs_agent_started ON aos_runs(tenant_id, agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_aos_run_queue_unpicked ON aos_run_queue(tenant_id) WHERE picked_at IS NULL;

-- Append-only run log: DELETE is always blocked; a finished run (status <> 'running')
-- is frozen. The only UPDATE allowed on a finished run is the FK housekeeping done by
-- ON DELETE SET NULL (routine_id / task_id / agent_id becoming NULL, nothing else).
CREATE OR REPLACE FUNCTION aos_runs_guard() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'aos_runs is append-only';
    END IF;
    IF OLD.status <> 'running' THEN
        IF (to_jsonb(NEW) - ARRAY['routine_id', 'task_id', 'agent_id'])
               = (to_jsonb(OLD) - ARRAY['routine_id', 'task_id', 'agent_id'])
           AND (NEW.routine_id IS NULL OR NEW.routine_id IS NOT DISTINCT FROM OLD.routine_id)
           AND (NEW.task_id IS NULL OR NEW.task_id IS NOT DISTINCT FROM OLD.task_id)
           AND (NEW.agent_id IS NULL OR NEW.agent_id IS NOT DISTINCT FROM OLD.agent_id) THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'aos_runs is append-only: run % is already %', OLD.id, OLD.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aos_runs_guard ON aos_runs;
CREATE TRIGGER trg_aos_runs_guard
    BEFORE UPDATE OR DELETE ON aos_runs
    FOR EACH ROW EXECUTE FUNCTION aos_runs_guard();

-- ── Approvals for routine output deliveries ──────────────────────────────────
ALTER TABLE aos_approvals ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES aos_runs(id) ON DELETE SET NULL;
ALTER TABLE aos_approvals ADD COLUMN IF NOT EXISTS routine_id UUID REFERENCES aos_routines(id) ON DELETE SET NULL;

-- ── Usage counters for the deterministic gate / Pulse status ─────────────────
-- Exact aggregates (PostgREST row caps make client-side sums unreliable).
-- p_agent NULL = whole tenant. Blocked runs never count against ceilings.
-- Only Pulse runs (kind IS NOT NULL) count: Phase 1 simulated task runs
-- (kind IS NULL, 0 tokens) must never consume the Pulse ceilings.
CREATE OR REPLACE FUNCTION aos_usage_summary(
    p_tenant TEXT,
    p_day_start TIMESTAMPTZ,
    p_window_start TIMESTAMPTZ,
    p_month_start TIMESTAMPTZ,
    p_agent UUID DEFAULT NULL
) RETURNS JSONB AS $$
    SELECT jsonb_build_object(
        'runs_today',    COUNT(*) FILTER (WHERE started_at >= p_day_start AND status <> 'blocked'),
        'runs_window',   COUNT(*) FILTER (WHERE started_at >= p_window_start AND status <> 'blocked'),
        'tokens_month',  COALESCE(SUM(tokens_in + tokens_out) FILTER (WHERE started_at >= p_month_start), 0),
        'tokens_today',  COALESCE(SUM(tokens_in + tokens_out) FILTER (WHERE started_at >= p_day_start), 0),
        'cost_today',    COALESCE(SUM(cost_usd) FILTER (WHERE started_at >= p_day_start), 0),
        'all_today',     COUNT(*) FILTER (WHERE started_at >= p_day_start),
        'success_today', COUNT(*) FILTER (WHERE started_at >= p_day_start AND status = 'success'),
        'failed_today',  COUNT(*) FILTER (WHERE started_at >= p_day_start AND status IN ('failed', 'timeout')),
        'blocked_today', COUNT(*) FILTER (WHERE started_at >= p_day_start AND status = 'blocked')
    )
    FROM aos_runs
    WHERE tenant_id = p_tenant
      AND (p_agent IS NULL OR agent_id = p_agent)
      AND kind IS NOT NULL
      AND started_at >= LEAST(p_day_start, p_window_start, p_month_start);
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION aos_usage_summary(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO service_role;

-- New columns / function must be visible to PostgREST right away.
NOTIFY pgrst, 'reload schema';
