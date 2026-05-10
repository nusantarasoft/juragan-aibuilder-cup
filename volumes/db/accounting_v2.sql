-- ═══════════════════════════════════════════════════════════
-- Accounting v2: Budgets, Bank Reconciliation, Settings
-- Matches existing acct_* pattern (tenant_id as plain UUID)
-- ═══════════════════════════════════════════════════════════

-- ── System settings (configurable limits) ────────────────
CREATE TABLE IF NOT EXISTS acct_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, key)
);

-- ── Budgets ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    fiscal_period_id UUID,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'closed')),
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES acct_budgets(id) ON DELETE CASCADE,
    account_id UUID,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    budgeted_amount NUMERIC(18,2) DEFAULT 0,
    actual_amount NUMERIC(18,2) DEFAULT 0,
    notes TEXT,
    UNIQUE(budget_id, account_id, month)
);

-- ── Bank Statements (for reconciliation) ─────────────────
CREATE TABLE IF NOT EXISTS acct_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    gl_account_id UUID,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acct_bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES acct_bank_accounts(id) ON DELETE CASCADE,
    statement_date DATE NOT NULL,
    opening_balance NUMERIC(18,2) DEFAULT 0,
    closing_balance NUMERIC(18,2) DEFAULT 0,
    total_credits NUMERIC(18,2) DEFAULT 0,
    total_debits NUMERIC(18,2) DEFAULT 0,
    imported_at TIMESTAMPTZ DEFAULT now(),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'api')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'reconciled'))
);

CREATE TABLE IF NOT EXISTS acct_bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID REFERENCES acct_bank_statements(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference TEXT,
    amount NUMERIC(18,2) NOT NULL,
    running_balance NUMERIC(18,2),
    matched BOOLEAN DEFAULT false,
    matched_journal_id UUID,
    match_type TEXT CHECK (match_type IN ('auto', 'manual', NULL)),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON acct_budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_lines_stmt ON acct_bank_statement_lines(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_lines_matched ON acct_bank_statement_lines(matched);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON acct_bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON acct_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON acct_settings(tenant_id);

-- Default settings for default tenant
INSERT INTO acct_settings (tenant_id, key, value, description) VALUES
    ('00000000-0000-0000-0000-000000000010', 'max_file_size_mb', '0', 'Max upload size in MB (0 = unlimited)'),
    ('00000000-0000-0000-0000-000000000010', 'default_currency', 'IDR', 'Default currency code'),
    ('00000000-0000-0000-0000-000000000010', 'fiscal_year_start_month', '1', 'Fiscal year start month (1-12)'),
    ('00000000-0000-0000-0000-000000000010', 'auto_post_journals', 'false', 'Automatically post journal entries'),
    ('00000000-0000-0000-0000-000000000010', 'require_approval_above', '0', 'Require approval for amounts above this (0 = disabled)')
ON CONFLICT (tenant_id, key) DO NOTHING;
