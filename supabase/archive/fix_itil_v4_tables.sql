-- ═══════════════════════════════════════════════════════════
-- ITIL v4 FULL IMPLEMENTATION — New Tables
-- Covers: CMDB, Events, Releases, Workforce, Continuity,
--         Availability, Deployments
-- ═══════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. CMDB — Configuration Management Database             ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS itsm_configuration_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  ci_number TEXT NOT NULL,                       -- CI-0001
  name TEXT NOT NULL,
  ci_class TEXT NOT NULL DEFAULT 'hardware',     -- hardware, software, service, document, network, cloud, virtual
  ci_type TEXT,                                  -- server, workstation, switch, application, database, etc.
  status TEXT DEFAULT 'active',                  -- active, under_maintenance, retired, disposed, planned
  environment TEXT DEFAULT 'production',         -- production, staging, development, dr
  criticality TEXT DEFAULT 'medium',             -- critical, high, medium, low

  -- Location & Ownership
  location TEXT,
  department TEXT,
  owner TEXT,
  managed_by TEXT,
  vendor TEXT,
  manufacturer TEXT,

  -- Technical Details
  model TEXT,
  serial_number TEXT,
  ip_address TEXT,
  mac_address TEXT,
  os_info TEXT,
  version TEXT,
  cpu TEXT,
  memory_gb NUMERIC(10,2),
  storage_gb NUMERIC(10,2),

  -- Lifecycle
  purchase_date DATE,
  warranty_expiry DATE,
  install_date DATE,
  decommission_date DATE,
  end_of_life DATE,

  -- Linkage
  asset_id UUID,                                 -- Link to inv_items
  service_id UUID,                               -- Link to itsm_service_portfolio
  parent_ci_id UUID REFERENCES itsm_configuration_items(id),

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm_ci_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ci_id UUID NOT NULL REFERENCES itsm_configuration_items(id) ON DELETE CASCADE,
  target_ci_id UUID NOT NULL REFERENCES itsm_configuration_items(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'depends_on',  -- depends_on, used_by, runs_on, connected_to, backed_up_by, part_of, hosts
  status TEXT DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_ci_id, target_ci_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_itsm_ci_number ON itsm_configuration_items(ci_number);
CREATE INDEX IF NOT EXISTS idx_itsm_ci_class ON itsm_configuration_items(ci_class);
CREATE INDEX IF NOT EXISTS idx_itsm_ci_status ON itsm_configuration_items(status);
CREATE INDEX IF NOT EXISTS idx_itsm_ci_rel_source ON itsm_ci_relationships(source_ci_id);
CREATE INDEX IF NOT EXISTS idx_itsm_ci_rel_target ON itsm_ci_relationships(target_ci_id);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. MONITORING & EVENT MANAGEMENT                        ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS itsm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event_number TEXT NOT NULL,                    -- EVT-0001
  source TEXT NOT NULL,                          -- prometheus, grafana, uptime_kuma, n8n, manual, api
  source_event_id TEXT,                          -- External ID from monitoring system
  event_type TEXT NOT NULL DEFAULT 'warning',    -- informational, warning, exception, alert
  severity TEXT DEFAULT 'medium',                -- critical, high, medium, low, informational
  status TEXT DEFAULT 'new',                     -- new, acknowledged, correlated, escalated, closed, suppressed

  -- Event Details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,                                 -- infrastructure, application, security, network, database, storage
  resource_name TEXT,                            -- Affected resource (hostname, URL, service name)
  resource_type TEXT,                            -- server, container, service, database, network_device
  metric_name TEXT,                              -- cpu_usage, memory_usage, disk_io, response_time, error_rate
  metric_value TEXT,                             -- "95.2%", "4500ms"
  threshold_value TEXT,                          -- "90%", "3000ms"

  -- Correlation & Escalation
  ci_id UUID REFERENCES itsm_configuration_items(id),             -- Linked CI
  service_id UUID,                                                -- Linked service
  escalated_to_incident_id UUID REFERENCES itsm_tickets(id),      -- Auto-created incident
  correlation_key TEXT,                                           -- Group related events
  suppression_key TEXT,                                           -- Deduplicate noisy alerts

  -- Timestamps
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itsm_events_number ON itsm_events(event_number);
CREATE INDEX IF NOT EXISTS idx_itsm_events_status ON itsm_events(status);
CREATE INDEX IF NOT EXISTS idx_itsm_events_severity ON itsm_events(severity);
CREATE INDEX IF NOT EXISTS idx_itsm_events_source ON itsm_events(source);
CREATE INDEX IF NOT EXISTS idx_itsm_events_correlation ON itsm_events(correlation_key);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. RELEASE MANAGEMENT                                   ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS itsm_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  release_number TEXT NOT NULL,                  -- REL-0001
  title TEXT NOT NULL,
  version TEXT,                                  -- v4.0.0, 2026.04.1
  description TEXT,
  release_type TEXT DEFAULT 'minor',             -- major, minor, patch, emergency, hotfix
  status TEXT DEFAULT 'planning',                -- planning, building, testing, approved, deploying, deployed, rolled_back, cancelled
  priority TEXT DEFAULT 'medium',
  risk_level TEXT DEFAULT 'medium',

  -- Planning
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  build_number TEXT,

  -- Ownership
  release_manager TEXT,
  build_team TEXT,
  test_lead TEXT,

  -- Plans
  deployment_plan TEXT,
  validation_plan TEXT,
  rollback_plan TEXT,
  communication_plan TEXT,

  -- Results
  test_results TEXT,
  deployment_notes TEXT,
  post_release_review TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm_release_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES itsm_releases(id) ON DELETE CASCADE,
  change_id UUID NOT NULL REFERENCES itsm_changes(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(release_id, change_id)
);

CREATE INDEX IF NOT EXISTS idx_itsm_releases_number ON itsm_releases(release_number);
CREATE INDEX IF NOT EXISTS idx_itsm_releases_status ON itsm_releases(status);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. WORKFORCE & TALENT MANAGEMENT                        ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS itsm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  agent_code TEXT NOT NULL,                      -- AGT-0001
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  department TEXT,
  team TEXT,
  role TEXT DEFAULT 'agent',                     -- agent, senior_agent, team_lead, manager, specialist
  status TEXT DEFAULT 'active',                  -- active, on_leave, unavailable, off_shift, inactive

  -- Capacity
  shift TEXT DEFAULT 'day',                      -- day, night, swing, flexible
  shift_start TIME,
  shift_end TIME,
  timezone TEXT DEFAULT 'Asia/Jakarta',
  max_tickets INT DEFAULT 10,
  current_ticket_count INT DEFAULT 0,
  utilization_pct NUMERIC(5,2) DEFAULT 0,

  -- Performance
  avg_resolution_hours NUMERIC(8,2),
  customer_satisfaction_score NUMERIC(3,2),      -- 1.0 - 5.0
  total_tickets_resolved INT DEFAULT 0,
  sla_compliance_pct NUMERIC(5,2),

  -- Metadata
  user_id UUID,                                  -- Link to auth user
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm_agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES itsm_agents(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,                      -- networking, active_directory, linux, cloud_aws, database, security
  proficiency_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced, expert
  certified BOOLEAN DEFAULT FALSE,
  certification_name TEXT,
  certification_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_itsm_agents_code ON itsm_agents(agent_code);
CREATE INDEX IF NOT EXISTS idx_itsm_agents_status ON itsm_agents(status);
CREATE INDEX IF NOT EXISTS idx_itsm_agents_team ON itsm_agents(team);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. SERVICE CONTINUITY MANAGEMENT                        ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS itsm_continuity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  plan_number TEXT NOT NULL,                     -- BCP-0001
  title TEXT NOT NULL,
  plan_type TEXT DEFAULT 'bcp',                  -- bcp (business continuity), drp (disaster recovery), crisis
  status TEXT DEFAULT 'draft',                   -- draft, under_review, approved, active, archived, superseded

  -- Scope
  service_id UUID,                               -- Link to itsm_service_portfolio
  description TEXT,
  scope TEXT,                                    -- What systems/processes are covered
  assumptions TEXT,

  -- Targets
  rto_hours NUMERIC(8,2),                        -- Recovery Time Objective
  rpo_hours NUMERIC(8,2),                        -- Recovery Point Objective
  mtpd_hours NUMERIC(8,2),                       -- Maximum Tolerable Period of Disruption
  recovery_priority TEXT DEFAULT 'medium',        -- critical, high, medium, low

  -- Plan Details
  risk_assessment TEXT,
  business_impact_analysis TEXT,
  recovery_strategy TEXT,
  recovery_procedures TEXT,
  communication_plan TEXT,
  escalation_contacts TEXT,

  -- Testing
  last_test_date DATE,
  last_test_result TEXT,                          -- passed, partial, failed
  next_test_date DATE,
  test_frequency TEXT DEFAULT 'annually',         -- quarterly, semi_annually, annually

  -- Ownership
  plan_owner TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  review_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itsm_continuity_number ON itsm_continuity_plans(plan_number);
CREATE INDEX IF NOT EXISTS idx_itsm_continuity_status ON itsm_continuity_plans(status);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. AVAILABILITY MANAGEMENT                              ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS itsm_availability_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  service_id UUID,                               -- Link to itsm_service_portfolio
  ci_id UUID REFERENCES itsm_configuration_items(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  uptime_minutes NUMERIC(12,2) DEFAULT 0,
  downtime_minutes NUMERIC(12,2) DEFAULT 0,
  availability_pct NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN (uptime_minutes + downtime_minutes) > 0
         THEN ROUND((uptime_minutes / (uptime_minutes + downtime_minutes)) * 100, 2)
         ELSE 100
    END
  ) STORED,
  planned_downtime_minutes NUMERIC(12,2) DEFAULT 0,
  unplanned_downtime_minutes NUMERIC(12,2) DEFAULT 0,
  mtbf_hours NUMERIC(10,2),                      -- Mean Time Between Failures
  mtrs_hours NUMERIC(10,2),                      -- Mean Time to Restore Service
  incident_count INT DEFAULT 0,
  sla_target_pct NUMERIC(5,2) DEFAULT 99.9,
  sla_met BOOLEAN GENERATED ALWAYS AS (
    CASE WHEN (uptime_minutes + downtime_minutes) > 0
         THEN ROUND((uptime_minutes / (uptime_minutes + downtime_minutes)) * 100, 2) >= sla_target_pct
         ELSE TRUE
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itsm_avail_service ON itsm_availability_records(service_id);
CREATE INDEX IF NOT EXISTS idx_itsm_avail_period ON itsm_availability_records(period_start, period_end);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. DEPLOYMENT MANAGEMENT                                ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS itsm_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  deployment_number TEXT NOT NULL,               -- DEP-0001
  title TEXT NOT NULL,
  description TEXT,
  deployment_type TEXT DEFAULT 'standard',       -- standard, phased, blue_green, canary, big_bang, rolling
  status TEXT DEFAULT 'planned',                 -- planned, in_progress, completed, failed, rolled_back, cancelled
  environment TEXT DEFAULT 'production',         -- development, staging, production, dr

  -- Links
  release_id UUID REFERENCES itsm_releases(id),
  change_id UUID REFERENCES itsm_changes(id),
  ci_id UUID REFERENCES itsm_configuration_items(id),

  -- Schedule
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,

  -- Execution
  deployed_by TEXT,
  deployment_team TEXT,
  deployment_steps TEXT,                          -- Step-by-step deployment procedure
  validation_steps TEXT,                         -- Post-deployment validation
  rollback_steps TEXT,

  -- Results
  validation_result TEXT,                        -- passed, failed, partial
  deployment_log TEXT,
  issues_found TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itsm_deploy_number ON itsm_deployments(deployment_number);
CREATE INDEX IF NOT EXISTS idx_itsm_deploy_status ON itsm_deployments(status);
CREATE INDEX IF NOT EXISTS idx_itsm_deploy_release ON itsm_deployments(release_id);


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  8. SCHEMA ENHANCEMENT — Add asset_id to tickets         ║
-- ╚═══════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itsm_tickets' AND column_name = 'asset_id'
  ) THEN
    ALTER TABLE itsm_tickets ADD COLUMN asset_id UUID;
    ALTER TABLE itsm_tickets ADD COLUMN ci_id UUID REFERENCES itsm_configuration_items(id);
  END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════
-- GRANTS & RELOAD
-- ═══════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, authenticator;

NOTIFY pgrst, 'reload schema';
