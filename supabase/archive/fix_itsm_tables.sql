-- ═══════════════════════════════════════════════════════════
-- NUCLEAR FIX: Drop ALL itsm tables and recreate from scratch
-- This forces PostgREST to discover them on next startup
-- ═══════════════════════════════════════════════════════════

-- Drop everything in reverse dependency order
DROP TABLE IF EXISTS itsm_approvals CASCADE;
DROP TABLE IF EXISTS itsm_knowledge_articles CASCADE;
DROP TABLE IF EXISTS itsm_changes CASCADE;
DROP TABLE IF EXISTS itsm_problem_incidents CASCADE;
DROP TABLE IF EXISTS itsm_problems CASCADE;
DROP TABLE IF EXISTS itsm_service_requests CASCADE;
DROP TABLE IF EXISTS itsm_service_catalog CASCADE;
DROP TABLE IF EXISTS itsm_service_portfolio CASCADE;
DROP TABLE IF EXISTS itsm_ticket_comments CASCADE;
DROP TABLE IF EXISTS itsm_tickets CASCADE;
DROP TABLE IF EXISTS itsm_sla_policies CASCADE;
DROP TABLE IF EXISTS itsm_categories CASCADE;

-- ─── CATEGORIES ────────────────────────────────────────────
CREATE TABLE itsm_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES itsm_categories(id),
  icon TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SLA POLICIES ──────────────────────────────────────────
CREATE TABLE itsm_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  response_time_minutes INT NOT NULL,
  resolution_time_minutes INT NOT NULL,
  escalation_after_minutes INT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INCIDENTS (INC-) ─────────────────────────────────────
CREATE TABLE itsm_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  impact TEXT DEFAULT 'medium',
  urgency TEXT DEFAULT 'medium',
  contact_id UUID,
  account_id UUID,
  individual_id UUID,
  pm_stakeholder_id UUID,
  reporter_name TEXT,
  reporter_email TEXT,
  assigned_to TEXT,
  assigned_group TEXT,
  sla_policy_id UUID REFERENCES itsm_sla_policies(id),
  sla_response_due TIMESTAMPTZ,
  sla_resolution_due TIMESTAMPTZ,
  sla_response_met BOOLEAN,
  sla_resolution_met BOOLEAN,
  channel TEXT DEFAULT 'portal',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TICKET COMMENTS ──────────────────────────────────────
CREATE TABLE itsm_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES itsm_tickets(id) ON DELETE CASCADE,
  author TEXT DEFAULT 'System',
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SERVICE PORTFOLIO ─────────────────────────────────────
CREATE TABLE itsm_service_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  service_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  business_owner TEXT,
  technical_owner TEXT,
  lifecycle_status TEXT DEFAULT 'pipeline',
  service_type TEXT DEFAULT 'business',
  criticality TEXT DEFAULT 'medium',
  cost_center TEXT,
  budget_allocated NUMERIC(12,2),
  sla_target TEXT,
  dependencies TEXT,
  risks TEXT,
  notes TEXT,
  published_to_catalog BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SERVICE CATALOG ───────────────────────────────────────
CREATE TABLE itsm_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  portfolio_service_id UUID REFERENCES itsm_service_portfolio(id),
  catalog_code TEXT NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  icon TEXT,
  estimated_delivery TEXT,
  cost TEXT,
  approval_required BOOLEAN DEFAULT FALSE,
  approval_type TEXT DEFAULT 'simple',
  fulfillment_group TEXT,
  status TEXT DEFAULT 'active',
  request_count INT DEFAULT 0,
  form_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SERVICE REQUESTS (SR-) ───────────────────────────────
CREATE TABLE itsm_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  catalog_item_id UUID REFERENCES itsm_service_catalog(id),
  category_id UUID REFERENCES itsm_categories(id),
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'submitted',
  requested_for TEXT,
  requester_name TEXT,
  requester_email TEXT,
  contact_id UUID,
  account_id UUID,
  fulfillment_group TEXT,
  fulfilled_by TEXT,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,
  sla_policy_id UUID REFERENCES itsm_sla_policies(id),
  sla_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROBLEMS (PRB-) ──────────────────────────────────────
CREATE TABLE itsm_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  problem_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  impact TEXT DEFAULT 'medium',
  root_cause TEXT,
  workaround TEXT,
  is_known_error BOOLEAN DEFAULT FALSE,
  knowledge_article_id UUID,
  assigned_to TEXT,
  assigned_group TEXT,
  reporter_name TEXT,
  reporter_email TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROBLEM-INCIDENT LINKS ─────────────────────────────
CREATE TABLE itsm_problem_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES itsm_problems(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES itsm_tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id, incident_id)
);

-- ─── CHANGE REQUESTS (CHG-) ───────────────────────────────
CREATE TABLE itsm_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  change_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  change_type TEXT DEFAULT 'normal',
  priority TEXT DEFAULT 'medium',
  risk_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft',
  impact TEXT DEFAULT 'medium',
  implementation_plan TEXT,
  rollback_plan TEXT,
  test_plan TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  cab_required BOOLEAN DEFAULT TRUE,
  cab_decision TEXT,
  cab_notes TEXT,
  cab_date TIMESTAMPTZ,
  requested_by TEXT,
  assigned_to TEXT,
  assigned_group TEXT,
  related_incident_id UUID REFERENCES itsm_tickets(id),
  related_problem_id UUID REFERENCES itsm_problems(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KNOWLEDGE ARTICLES (KA-) ─────────────────────────────
CREATE TABLE itsm_knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  article_number TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category_id UUID REFERENCES itsm_categories(id),
  article_type TEXT DEFAULT 'solution',
  status TEXT DEFAULT 'draft',
  related_problem_id UUID REFERENCES itsm_problems(id),
  author TEXT,
  tags TEXT[] DEFAULT '{}',
  views INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── APPROVALS ─────────────────────────────────────────────
CREATE TABLE itsm_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  approval_level INT DEFAULT 1,
  approver_name TEXT NOT NULL,
  approver_email TEXT,
  status TEXT DEFAULT 'pending',
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- GRANTS - required for PostgREST / Supabase
-- ═══════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, authenticator;

-- Signal PostgREST to reload
NOTIFY pgrst, 'reload schema';
