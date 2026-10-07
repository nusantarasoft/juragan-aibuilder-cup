-- ════════════════════════════════════════════════════════════════════════════
-- Agentic OS — Phase 4 (Command Deck · Goals & gate reviews)
--   * aos_goals: outcome goals with a review window and a gate date
--   * aos_goal_reviews: append-only gate reviews (trigger blocks UPDATE/DELETE)
--   * aos_tasks.goal_id: tasks can contribute to a goal
--   * aos_goal_rollup(): review / task counters per goal (exact, no row caps)
--   * aos_deck_stats(): Command Deck numbers in one round-trip (timezone aware)
--   * Seed: two example goals + one review
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Goals ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aos_goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    area_id         UUID REFERENCES aos_memory_areas(id) ON DELETE SET NULL,
    owner_agent_id  UUID REFERENCES aos_agents(id) ON DELETE SET NULL,
    metric          TEXT NOT NULL DEFAULT '',
    target_value    NUMERIC,
    current_value   NUMERIC,
    unit            TEXT NOT NULL DEFAULT '',
    window_days     INT NOT NULL DEFAULT 90 CHECK (window_days BETWEEN 7 AND 366),
    starts_on       DATE NOT NULL DEFAULT CURRENT_DATE,
    gate_on         DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'at_risk', 'paused', 'achieved', 'missed')),
    progress        NUMERIC NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
    next_action     TEXT NOT NULL DEFAULT '',
    next_action_due DATE,
    color           TEXT NOT NULL DEFAULT '#f59e0b',
    sort_order      INT NOT NULL DEFAULT 0,
    created_by      UUID,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aos_goals_gate ON aos_goals(tenant_id, gate_on);

DROP TRIGGER IF EXISTS trg_aos_goals_touch ON aos_goals;
CREATE TRIGGER trg_aos_goals_touch BEFORE UPDATE ON aos_goals FOR EACH ROW EXECUTE FUNCTION aos_touch_updated_at();

-- ── Goal reviews (append-only) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aos_goal_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000010',
    goal_id         UUID NOT NULL REFERENCES aos_goals(id) ON DELETE CASCADE,
    verdict         TEXT NOT NULL CHECK (verdict IN ('on_track', 'at_risk', 'off_track', 'achieved', 'missed')),
    progress        NUMERIC CHECK (progress BETWEEN 0 AND 1),
    current_value   NUMERIC,
    note            TEXT NOT NULL DEFAULT '',
    next_action     TEXT,
    next_gate_on    DATE,
    reviewed_by     UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aos_goal_reviews_goal ON aos_goal_reviews(goal_id, created_at DESC);

-- Append-only review log: UPDATE is always blocked. DELETE is blocked too, except
-- the cascade from a goal hard-delete (by then the parent goal row is already gone).
-- Goals are archived, never deleted, so in practice reviews are permanent.
CREATE OR REPLACE FUNCTION aos_goal_reviews_guard() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM aos_goals WHERE id = OLD.goal_id) THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'aos_goal_reviews is append-only: review % cannot be changed', OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aos_goal_reviews_guard ON aos_goal_reviews;
CREATE TRIGGER trg_aos_goal_reviews_guard
    BEFORE UPDATE OR DELETE ON aos_goal_reviews
    FOR EACH ROW EXECUTE FUNCTION aos_goal_reviews_guard();

-- ── Tasks: link to a goal ───────────────────────────────────────────────────
ALTER TABLE aos_tasks ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES aos_goals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_aos_tasks_goal ON aos_tasks(goal_id) WHERE goal_id IS NOT NULL;

-- ── RLS + grants (same pattern as the Phase 1 tables) ───────────────────────
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['aos_goals', 'aos_goal_reviews']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_service', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', t || '_read', t);
        EXECUTE format('GRANT ALL ON %I TO service_role', t);
        EXECUTE format('GRANT SELECT ON %I TO authenticated', t);
    END LOOP;
END $$;

-- ── Goal counters (reviews + linked tasks) ──────────────────────────────────
-- open = linked, not archived, status not done/cancelled; done = status 'done'.
CREATE OR REPLACE FUNCTION aos_goal_rollup(p_tenant TEXT)
RETURNS TABLE (
    goal_id          UUID,
    review_count     INT,
    last_reviewed_at TIMESTAMPTZ,
    last_verdict     TEXT,
    open_tasks       INT,
    done_tasks       INT
) AS $$
    SELECT
        g.id,
        COALESCE(rv.n, 0)::int,
        lr.created_at,
        lr.verdict,
        COALESCE(tk.open_n, 0)::int,
        COALESCE(tk.done_n, 0)::int
    FROM aos_goals g
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS n FROM aos_goal_reviews r WHERE r.goal_id = g.id
    ) rv ON TRUE
    LEFT JOIN LATERAL (
        SELECT r.created_at, r.verdict FROM aos_goal_reviews r
        WHERE r.goal_id = g.id ORDER BY r.created_at DESC LIMIT 1
    ) lr ON TRUE
    LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE t.status NOT IN ('done', 'cancelled')) AS open_n,
               COUNT(*) FILTER (WHERE t.status = 'done') AS done_n
        FROM aos_tasks t
        WHERE t.goal_id = g.id AND t.archived_at IS NULL
    ) tk ON TRUE
    WHERE g.tenant_id = p_tenant;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION aos_goal_rollup(TEXT) TO service_role;

-- ── Command Deck stats (one round-trip, timezone aware) ─────────────────────
-- Day / week boundaries are computed in p_tz. Weeks start on Monday (ISO).
-- today / yesterday: every aos_runs row (all triggers) by started_at;
--   failed = failed + timeout, blocked = blocked, tokens = tokens_in + tokens_out.
-- week: the current week; reviewsWaiting and overdueTasks are live snapshots.
-- weeks: every ISO week overlapping the current calendar year, ascending
--   (tasks done by completion time, runs by start, approvals by decision time,
--   notes = non-archived memory items by creation time).
CREATE OR REPLACE FUNCTION aos_deck_stats(p_tenant TEXT, p_tz TEXT DEFAULT 'Asia/Jakarta')
RETURNS JSONB AS $$
WITH b AS (
    SELECT
        (now() AT TIME ZONE p_tz)::date                     AS today,
        date_trunc('week', now() AT TIME ZONE p_tz)::date   AS week_start,
        date_trunc('year', now() AT TIME ZONE p_tz)::date   AS year_start
),
bo AS (
    SELECT
        b.*,
        (b.today::timestamp AT TIME ZONE p_tz)                                         AS today_t0,
        ((b.today + 1)::timestamp AT TIME ZONE p_tz)                                   AS today_t1,
        ((b.today - 1)::timestamp AT TIME ZONE p_tz)                                   AS yday_t0,
        (b.week_start::timestamp AT TIME ZONE p_tz)                                    AS week_t0,
        ((b.week_start + 7)::timestamp AT TIME ZONE p_tz)                              AS week_t1,
        date_trunc('week', b.year_start::timestamp)::date                              AS first_week,
        date_trunc('week', b.year_start + interval '1 year' - interval '1 day')::date  AS last_week,
        (date_trunc('week', b.year_start::timestamp) AT TIME ZONE p_tz)                AS range_t0
    FROM b
),
days AS (
    SELECT
        (SELECT jsonb_build_object(
                'date',    to_char(x.today, 'YYYY-MM-DD'),
                'runs',    COUNT(*),
                'success', COUNT(*) FILTER (WHERE r.status = 'success'),
                'failed',  COUNT(*) FILTER (WHERE r.status IN ('failed', 'timeout')),
                'blocked', COUNT(*) FILTER (WHERE r.status = 'blocked'),
                'costUsd', COALESCE(SUM(r.cost_usd), 0),
                'tokens',  COALESCE(SUM(r.tokens_in + r.tokens_out), 0))
           FROM aos_runs r
          WHERE r.tenant_id = p_tenant AND r.started_at >= x.today_t0 AND r.started_at < x.today_t1) AS today_j,
        (SELECT jsonb_build_object(
                'date',    to_char(x.today - 1, 'YYYY-MM-DD'),
                'runs',    COUNT(*),
                'success', COUNT(*) FILTER (WHERE r.status = 'success'),
                'failed',  COUNT(*) FILTER (WHERE r.status IN ('failed', 'timeout')),
                'blocked', COUNT(*) FILTER (WHERE r.status = 'blocked'),
                'costUsd', COALESCE(SUM(r.cost_usd), 0),
                'tokens',  COALESCE(SUM(r.tokens_in + r.tokens_out), 0))
           FROM aos_runs r
          WHERE r.tenant_id = p_tenant AND r.started_at >= x.yday_t0 AND r.started_at < x.today_t0) AS yday_j
    FROM bo x
),
wk AS (
    SELECT jsonb_build_object(
        'weekStart',        to_char(x.week_start, 'YYYY-MM-DD'),
        'tasksCreated',     (SELECT COUNT(*) FROM aos_tasks t
                              WHERE t.tenant_id = p_tenant AND t.created_at >= x.week_t0 AND t.created_at < x.week_t1),
        'tasksDone',        (SELECT COUNT(*) FROM aos_tasks t
                              WHERE t.tenant_id = p_tenant AND t.status = 'done'
                                AND COALESCE(t.completed_at, t.finished_at, t.updated_at) >= x.week_t0
                                AND COALESCE(t.completed_at, t.finished_at, t.updated_at) < x.week_t1),
        'reviewsWaiting',   (SELECT COUNT(*) FROM aos_tasks t
                              WHERE t.tenant_id = p_tenant AND t.status = 'review' AND t.archived_at IS NULL),
        'approvalsDecided', (SELECT COUNT(*) FROM aos_approvals a
                              WHERE a.tenant_id = p_tenant AND a.requested_at >= x.week_t0 AND a.requested_at < x.week_t1
                                AND a.status <> 'pending'),
        'approvalsTotal',   (SELECT COUNT(*) FROM aos_approvals a
                              WHERE a.tenant_id = p_tenant AND a.requested_at >= x.week_t0 AND a.requested_at < x.week_t1),
        'notesAdded',       (SELECT COUNT(*) FROM aos_memory_items m
                              WHERE m.tenant_id = p_tenant AND m.archived_at IS NULL
                                AND m.created_at >= x.week_t0 AND m.created_at < x.week_t1),
        'runs',             (SELECT COUNT(*) FROM aos_runs r
                              WHERE r.tenant_id = p_tenant AND r.started_at >= x.week_t0 AND r.started_at < x.week_t1),
        'overdueTasks',     (SELECT COUNT(*) FROM aos_tasks t
                              WHERE t.tenant_id = p_tenant AND t.archived_at IS NULL AND t.due_at < now()
                                AND t.status NOT IN ('done', 'cancelled'))
    ) AS j
    FROM bo x
),
weeks AS (
    SELECT gs::date AS ws
    FROM bo x, generate_series(x.first_week::timestamp, x.last_week::timestamp, interval '1 week') AS gs
),
run_w AS (
    SELECT date_trunc('week', r.started_at AT TIME ZONE p_tz)::date AS ws, COUNT(*) AS n
    FROM aos_runs r, bo x
    WHERE r.tenant_id = p_tenant AND r.started_at >= x.range_t0
    GROUP BY 1
),
done_w AS (
    SELECT date_trunc('week', COALESCE(t.completed_at, t.finished_at, t.updated_at) AT TIME ZONE p_tz)::date AS ws, COUNT(*) AS n
    FROM aos_tasks t, bo x
    WHERE t.tenant_id = p_tenant AND t.status = 'done'
      AND COALESCE(t.completed_at, t.finished_at, t.updated_at) >= x.range_t0
    GROUP BY 1
),
appr_w AS (
    SELECT date_trunc('week', a.decided_at AT TIME ZONE p_tz)::date AS ws, COUNT(*) AS n
    FROM aos_approvals a, bo x
    WHERE a.tenant_id = p_tenant AND a.decided_at IS NOT NULL AND a.decided_at >= x.range_t0
    GROUP BY 1
),
note_w AS (
    SELECT date_trunc('week', m.created_at AT TIME ZONE p_tz)::date AS ws, COUNT(*) AS n
    FROM aos_memory_items m, bo x
    WHERE m.tenant_id = p_tenant AND m.archived_at IS NULL AND m.created_at >= x.range_t0
    GROUP BY 1
)
SELECT jsonb_build_object(
    'today',     d.today_j,
    'yesterday', d.yday_j,
    'week',      w.j,
    'weeks', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'weekStart', to_char(k.ws, 'YYYY-MM-DD'),
                   'tasksDone', COALESCE(dn.n, 0),
                   'runs',      COALESCE(rn.n, 0),
                   'approvals', COALESCE(ap.n, 0),
                   'notes',     COALESCE(nt.n, 0),
                   'score',     COALESCE(dn.n, 0) + COALESCE(rn.n, 0) + COALESCE(ap.n, 0) + COALESCE(nt.n, 0)
               ) ORDER BY k.ws), '[]'::jsonb)
        FROM weeks k
        LEFT JOIN done_w dn ON dn.ws = k.ws
        LEFT JOIN run_w  rn ON rn.ws = k.ws
        LEFT JOIN appr_w ap ON ap.ws = k.ws
        LEFT JOIN note_w nt ON nt.ws = k.ws
    )
)
FROM days d, wk w;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION aos_deck_stats(TEXT, TEXT) TO service_role;

-- ── Seed: example goals (keyed on title) ────────────────────────────────────
INSERT INTO aos_goals (tenant_id, title, description, area_id, owner_agent_id, metric, target_value, current_value, unit,
                       window_days, starts_on, gate_on, status, progress, next_action, next_action_due, color, sort_order)
SELECT
    '00000000-0000-0000-0000-000000000010',
    'Cut ITSM resolution time below 4h',
    'Bring the mean time to resolve ITSM tickets under four hours by the gate date.',
    (SELECT id FROM aos_memory_areas
      WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND (slug LIKE '%itsm%' OR slug LIKE '%ops%')
      ORDER BY sort_order, slug LIMIT 1),
    (SELECT id FROM aos_agents WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND slug = 'semar'),
    'Mean time to resolve', 4, 6.5, 'h',
    90, CURRENT_DATE - 34, CURRENT_DATE + 56, 'active', 0.45,
    'Review SLA-breach playbook with Semar', CURRENT_DATE + 3, '#f97316', 0
WHERE NOT EXISTS (
    SELECT 1 FROM aos_goals
    WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Cut ITSM resolution time below 4h'
);

INSERT INTO aos_goals (tenant_id, title, description, metric, target_value, current_value, unit,
                       window_days, starts_on, gate_on, status, progress, next_action, color, sort_order)
SELECT
    '00000000-0000-0000-0000-000000000010',
    'Agents cover every core module',
    'Every core Nusantarasoft module has at least one assigned agent with playbooks.',
    'Modules with an assigned agent', 12, 9, 'modules',
    90, CURRENT_DATE - 6, CURRENT_DATE + 84, 'active', 0.3,
    'Draft playbooks for the remaining modules', '#38bdf8', 1
WHERE NOT EXISTS (
    SELECT 1 FROM aos_goals
    WHERE tenant_id = '00000000-0000-0000-0000-000000000010' AND title = 'Agents cover every core module'
);

INSERT INTO aos_goal_reviews (tenant_id, goal_id, verdict, progress, current_value, note, created_at)
SELECT g.tenant_id, g.id, 'at_risk', 0.45, 6.5,
       'Backlog spike after the network outage; mitigation playbook in progress.',
       NOW() - interval '7 days'
FROM aos_goals g
WHERE g.tenant_id = '00000000-0000-0000-0000-000000000010'
  AND g.title = 'Cut ITSM resolution time below 4h'
  AND NOT EXISTS (SELECT 1 FROM aos_goal_reviews r WHERE r.goal_id = g.id);

-- New tables / columns / functions must be visible to PostgREST right away.
NOTIFY pgrst, 'reload schema';
