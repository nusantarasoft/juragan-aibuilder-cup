-- ═══════════════════════════════════════════════════════════
-- FIX: Create 11 tables referenced in middleware code but
--      missing from the database
-- ═══════════════════════════════════════════════════════════

-- ─── CRM: products ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  unit_price NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CRM: quotes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  deal_id UUID REFERENCES deals(id),
  account_id UUID REFERENCES accounts(id),
  contact_id UUID REFERENCES contacts(id),
  status TEXT DEFAULT 'draft',
  subtotal NUMERIC(14,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  valid_until DATE,
  description TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CRM: quote_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_benefits ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'tangible',
  target_value TEXT,
  actual_value TEXT,
  measurement_method TEXT,
  realization_date DATE,
  status TEXT DEFAULT 'planned',
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_domain_health ────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_domain_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  health_status TEXT DEFAULT 'green',
  score NUMERIC(5,2),
  notes TEXT,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_focus_areas ──────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_governance ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_governance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  decision TEXT,
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  impact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_principle_assessments ────────────────────────
CREATE TABLE IF NOT EXISTS pm_principle_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  principle_name TEXT NOT NULL,
  maturity_level INT DEFAULT 1,
  assessment_notes TEXT,
  evidence TEXT,
  action_items TEXT,
  assessed_by TEXT,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_risks (separate from pm_risk_registers) ─────
CREATE TABLE IF NOT EXISTS pm_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  risk_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'technical',
  probability TEXT DEFAULT 'medium',
  impact TEXT DEFAULT 'medium',
  risk_score NUMERIC(5,2),
  response_strategy TEXT DEFAULT 'mitigate',
  response_plan TEXT,
  owner TEXT,
  status TEXT DEFAULT 'open',
  identified_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_sustainability ───────────────────────────────
CREATE TABLE IF NOT EXISTS pm_sustainability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  category TEXT DEFAULT 'environmental',
  target_value TEXT,
  actual_value TEXT,
  unit TEXT,
  measurement_date DATE,
  status TEXT DEFAULT 'on_track',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PM: pm_tailoring_log ────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_tailoring_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  process_area TEXT NOT NULL,
  original_approach TEXT,
  tailored_approach TEXT,
  justification TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, authenticator;

-- Signal PostgREST to reload
NOTIFY pgrst, 'reload schema';
