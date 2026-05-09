-- Guide flows: playbook definitions per notebook + conversation state + telemetry
-- Apply after studio_notebooks / studio_conversations exist.

CREATE TABLE IF NOT EXISTS studio_guide_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES studio_notebooks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    definition JSONB NOT NULL DEFAULT '{"version":1,"startNodeId":"","nodes":[]}'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_guide_flows_notebook ON studio_guide_flows(notebook_id);
CREATE INDEX IF NOT EXISTS idx_studio_guide_flows_status ON studio_guide_flows(notebook_id, status);

-- At most one published flow per notebook
CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_guide_flows_one_published_per_notebook
    ON studio_guide_flows(notebook_id)
    WHERE status = 'published';

ALTER TABLE studio_conversations
    ADD COLUMN IF NOT EXISTS guide_flow_id UUID REFERENCES studio_guide_flows(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS guide_flow_node_id TEXT,
    ADD COLUMN IF NOT EXISTS guide_flow_context JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_studio_conversations_guide_flow ON studio_conversations(guide_flow_id);

CREATE TABLE IF NOT EXISTS studio_guide_flow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES studio_conversations(id) ON DELETE CASCADE,
    flow_id UUID NOT NULL REFERENCES studio_guide_flows(id) ON DELETE CASCADE,
    from_node_id TEXT,
    to_node_id TEXT,
    event_type VARCHAR(40) NOT NULL,
    user_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_guide_flow_events_conversation ON studio_guide_flow_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_studio_guide_flow_events_flow ON studio_guide_flow_events(flow_id);

ALTER TABLE studio_guide_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_guide_flow_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_guide_flows' AND policyname = 'studio_guide_flows_all') THEN
        CREATE POLICY studio_guide_flows_all ON studio_guide_flows FOR ALL USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'studio_guide_flow_events' AND policyname = 'studio_guide_flow_events_all') THEN
        CREATE POLICY studio_guide_flow_events_all ON studio_guide_flow_events FOR ALL USING (TRUE);
    END IF;
END $$;

GRANT ALL ON studio_guide_flows TO anon, authenticated, service_role, authenticator;
GRANT ALL ON studio_guide_flow_events TO anon, authenticated, service_role, authenticator;
