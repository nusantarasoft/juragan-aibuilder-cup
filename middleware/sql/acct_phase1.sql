-- ═══════════════════════════════════════════════════════════
-- Accounting Module — Phase 1 Schema
-- Multi-tenant, double-entry, multi-currency (IDR default)
-- Indonesian tax compliance ready
-- ═══════════════════════════════════════════════════════════

-- ─── Currencies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_currencies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    code        VARCHAR(3) NOT NULL,           -- ISO 4217: IDR, USD, EUR
    name        VARCHAR(100) NOT NULL,
    symbol      VARCHAR(10) DEFAULT '',
    decimal_places INT DEFAULT 2,
    is_default  BOOLEAN DEFAULT false,
    exchange_rate NUMERIC(18,8) DEFAULT 1.0,   -- rate to base (IDR)
    rate_date   DATE DEFAULT CURRENT_DATE,
    status      VARCHAR(20) DEFAULT 'active',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ─── Fiscal Periods ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_fiscal_periods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    name        VARCHAR(100) NOT NULL,          -- "FY 2026", "Jan 2026"
    period_type VARCHAR(20) DEFAULT 'month',    -- year, quarter, month
    parent_id   UUID REFERENCES acct_fiscal_periods(id),
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) DEFAULT 'open',     -- open, closed, locked
    closed_by   VARCHAR(255),
    closed_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Chart of Accounts ──────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    account_code    VARCHAR(20) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    account_type    VARCHAR(30) NOT NULL,        -- asset, liability, equity, revenue, expense
    account_subtype VARCHAR(50),                 -- cash, bank, receivable, payable, etc
    parent_id       UUID REFERENCES acct_accounts(id),
    currency_code   VARCHAR(3) DEFAULT 'IDR',
    description     TEXT,
    is_header       BOOLEAN DEFAULT false,       -- header/group vs postable
    is_system       BOOLEAN DEFAULT false,       -- system accounts can't be deleted
    opening_balance NUMERIC(18,4) DEFAULT 0,
    current_balance NUMERIC(18,4) DEFAULT 0,
    normal_balance  VARCHAR(10) DEFAULT 'debit', -- debit or credit
    tags            TEXT[],
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, account_code)
);

-- ─── Cost Centers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_cost_centers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    code        VARCHAR(20) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    parent_id   UUID REFERENCES acct_cost_centers(id),
    manager     VARCHAR(255),
    description TEXT,
    status      VARCHAR(20) DEFAULT 'active',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ─── Tax Rates ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_taxes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    code            VARCHAR(20) NOT NULL,        -- PPN, PPH21, PPH23, PPH4_2
    name            VARCHAR(100) NOT NULL,       -- "PPN 11%", "PPh 21"
    tax_type        VARCHAR(30) NOT NULL,        -- vat, income_tax, withholding
    rate            NUMERIC(8,4) NOT NULL,       -- 11.0000 for 11%
    is_inclusive     BOOLEAN DEFAULT false,
    account_id      UUID REFERENCES acct_accounts(id),  -- tax payable/receivable account
    description     TEXT,
    effective_from  DATE,
    effective_to    DATE,
    is_default      BOOLEAN DEFAULT false,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ─── Journal Entries (Header) ───────────────────────────
CREATE TABLE IF NOT EXISTS acct_journals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    journal_number  VARCHAR(30) NOT NULL,        -- auto-generated: JV-2026-0001
    journal_type    VARCHAR(30) DEFAULT 'general', -- general, adjusting, closing, opening, reversal
    fiscal_period_id UUID REFERENCES acct_fiscal_periods(id),
    journal_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    reference       VARCHAR(100),                -- external reference (PO number, invoice, etc)
    memo            TEXT,
    currency_code   VARCHAR(3) DEFAULT 'IDR',
    exchange_rate   NUMERIC(18,8) DEFAULT 1.0,
    total_debit     NUMERIC(18,4) DEFAULT 0,
    total_credit    NUMERIC(18,4) DEFAULT 0,
    source_module   VARCHAR(50),                 -- inventory, ecommerce, manual
    source_id       VARCHAR(100),                -- PO id, order id, etc
    status          VARCHAR(20) DEFAULT 'draft', -- draft, posted, reversed, void
    posted_by       VARCHAR(255),
    posted_at       TIMESTAMPTZ,
    reversed_by     VARCHAR(255),
    reversed_at     TIMESTAMPTZ,
    reversal_of     UUID REFERENCES acct_journals(id),
    tags            TEXT[],
    attachments     JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, journal_number)
);

-- ─── Journal Entry Lines ────────────────────────────────
CREATE TABLE IF NOT EXISTS acct_journal_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id      UUID NOT NULL REFERENCES acct_journals(id) ON DELETE CASCADE,
    line_number     INT NOT NULL DEFAULT 1,
    account_id      UUID NOT NULL REFERENCES acct_accounts(id),
    cost_center_id  UUID REFERENCES acct_cost_centers(id),
    description     TEXT,
    debit           NUMERIC(18,4) DEFAULT 0,
    credit          NUMERIC(18,4) DEFAULT 0,
    currency_code   VARCHAR(3) DEFAULT 'IDR',
    exchange_rate   NUMERIC(18,8) DEFAULT 1.0,
    base_debit      NUMERIC(18,4) DEFAULT 0,    -- amount in base currency (IDR)
    base_credit     NUMERIC(18,4) DEFAULT 0,
    tax_id          UUID REFERENCES acct_taxes(id),
    tax_amount      NUMERIC(18,4) DEFAULT 0,
    reference       VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Contacts (Vendors/Customers for AP/AR) ─────────────
CREATE TABLE IF NOT EXISTS acct_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    contact_type    VARCHAR(20) NOT NULL,        -- vendor, customer, both
    code            VARCHAR(30),
    name            VARCHAR(255) NOT NULL,
    company         VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'Indonesia',
    tax_id_number   VARCHAR(50),                 -- NPWP
    default_account_id UUID REFERENCES acct_accounts(id),
    currency_code   VARCHAR(3) DEFAULT 'IDR',
    payment_terms   INT DEFAULT 30,              -- days
    credit_limit    NUMERIC(18,4),
    notes           TEXT,
    -- Links to other modules
    crm_account_id  UUID,
    inv_supplier_id UUID,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_acct_accounts_tenant ON acct_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_accounts_type ON acct_accounts(tenant_id, account_type);
CREATE INDEX IF NOT EXISTS idx_acct_accounts_parent ON acct_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_acct_journals_tenant ON acct_journals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_journals_date ON acct_journals(tenant_id, journal_date);
CREATE INDEX IF NOT EXISTS idx_acct_journals_status ON acct_journals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_acct_journal_lines_journal ON acct_journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_acct_journal_lines_account ON acct_journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_acct_contacts_tenant ON acct_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_fiscal_tenant ON acct_fiscal_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_taxes_tenant ON acct_taxes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_currencies_tenant ON acct_currencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_cost_centers_tenant ON acct_cost_centers(tenant_id);

-- ═══════════════════════════════════════════════════════════
-- Trigger: Update account balance on journal post
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION acct_update_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act when status changes TO 'posted'
    IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
        UPDATE acct_accounts a
        SET current_balance = a.current_balance + COALESCE(sub.net, 0),
            updated_at = NOW()
        FROM (
            SELECT account_id,
                   SUM(base_debit) - SUM(base_credit) AS net
            FROM acct_journal_lines
            WHERE journal_id = NEW.id
            GROUP BY account_id
        ) sub
        WHERE a.id = sub.account_id;
    END IF;

    -- Reverse balances when status changes TO 'reversed'
    IF NEW.status = 'reversed' AND OLD.status = 'posted' THEN
        UPDATE acct_accounts a
        SET current_balance = a.current_balance - COALESCE(sub.net, 0),
            updated_at = NOW()
        FROM (
            SELECT account_id,
                   SUM(base_debit) - SUM(base_credit) AS net
            FROM acct_journal_lines
            WHERE journal_id = NEW.id
            GROUP BY account_id
        ) sub
        WHERE a.id = sub.account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_acct_journal_balance ON acct_journals;
CREATE TRIGGER trg_acct_journal_balance
    AFTER UPDATE OF status ON acct_journals
    FOR EACH ROW
    EXECUTE FUNCTION acct_update_balances();

-- ═══════════════════════════════════════════════════════════
-- Seed: Default IDR currency
-- ═══════════════════════════════════════════════════════════
INSERT INTO acct_currencies (tenant_id, code, name, symbol, decimal_places, is_default, exchange_rate)
VALUES ('00000000-0000-0000-0000-000000000010', 'IDR', 'Indonesian Rupiah', 'Rp', 0, true, 1.0)
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO acct_currencies (tenant_id, code, name, symbol, decimal_places, is_default, exchange_rate)
VALUES ('00000000-0000-0000-0000-000000000010', 'USD', 'US Dollar', '$', 2, false, 16200.0)
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO acct_currencies (tenant_id, code, name, symbol, decimal_places, is_default, exchange_rate)
VALUES ('00000000-0000-0000-0000-000000000010', 'EUR', 'Euro', '€', 2, false, 17800.0)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Seed: Default Indonesian Tax Rates
-- ═══════════════════════════════════════════════════════════
INSERT INTO acct_taxes (tenant_id, code, name, tax_type, rate, is_default)
VALUES
    ('00000000-0000-0000-0000-000000000010', 'PPN', 'PPN 11%', 'vat', 11.0, true),
    ('00000000-0000-0000-0000-000000000010', 'PPH21', 'PPh 21', 'income_tax', 5.0, false),
    ('00000000-0000-0000-0000-000000000010', 'PPH23', 'PPh 23', 'withholding', 2.0, false),
    ('00000000-0000-0000-0000-000000000010', 'PPH4_2', 'PPh 4(2)', 'withholding', 10.0, false),
    ('00000000-0000-0000-0000-000000000010', 'PPN_0', 'PPN 0% (Exempt)', 'vat', 0.0, false)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Seed: Standard Indonesian Chart of Accounts
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    tid UUID := '00000000-0000-0000-0000-000000000010';
    -- Header IDs
    h_asset UUID; h_cas UUID; h_rec UUID; h_inv UUID; h_fix UUID;
    h_liab UUID; h_cur_l UUID; h_ltl UUID;
    h_equity UUID;
    h_rev UUID;
    h_exp UUID; h_cogs UUID; h_opex UUID;
BEGIN
    -- ═══ ASSETS ═══
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,is_header,normal_balance) VALUES (tid,'1000','Assets','asset',true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_asset;
    SELECT id INTO h_asset FROM acct_accounts WHERE tenant_id=tid AND account_code='1000';
    
    -- Cash & Bank
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,is_header,normal_balance) VALUES (tid,'1100','Cash & Bank','asset','cash',h_asset,true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_cas;
    SELECT id INTO h_cas FROM acct_accounts WHERE tenant_id=tid AND account_code='1100';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance,is_system) VALUES
        (tid,'1110','Cash on Hand','asset','cash',h_cas,'debit',true),
        (tid,'1120','Bank IDR','asset','bank',h_cas,'debit',true),
        (tid,'1130','Bank USD','asset','bank',h_cas,'debit',false),
        (tid,'1140','Petty Cash','asset','cash',h_cas,'debit',false)
    ON CONFLICT DO NOTHING;
    
    -- Receivables
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,is_header,normal_balance) VALUES (tid,'1200','Receivables','asset','receivable',h_asset,true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_rec;
    SELECT id INTO h_rec FROM acct_accounts WHERE tenant_id=tid AND account_code='1200';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance,is_system) VALUES
        (tid,'1210','Accounts Receivable','asset','receivable',h_rec,'debit',true),
        (tid,'1220','Allowance for Doubtful Accounts','asset','receivable',h_rec,'credit',false),
        (tid,'1230','PPN Masukan (VAT In)','asset','tax_receivable',h_rec,'debit',true)
    ON CONFLICT DO NOTHING;
    
    -- Inventory
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,is_header,normal_balance) VALUES (tid,'1300','Inventory','asset','inventory',h_asset,true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_inv;
    SELECT id INTO h_inv FROM acct_accounts WHERE tenant_id=tid AND account_code='1300';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance) VALUES
        (tid,'1310','Merchandise Inventory','asset','inventory',h_inv,'debit'),
        (tid,'1320','Raw Materials','asset','inventory',h_inv,'debit'),
        (tid,'1330','Work in Progress','asset','inventory',h_inv,'debit'),
        (tid,'1340','Finished Goods','asset','inventory',h_inv,'debit')
    ON CONFLICT DO NOTHING;
    
    -- Fixed Assets
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,is_header,normal_balance) VALUES (tid,'1400','Fixed Assets','asset','fixed_asset',h_asset,true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_fix;
    SELECT id INTO h_fix FROM acct_accounts WHERE tenant_id=tid AND account_code='1400';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance) VALUES
        (tid,'1410','Equipment','asset','fixed_asset',h_fix,'debit'),
        (tid,'1420','Vehicles','asset','fixed_asset',h_fix,'debit'),
        (tid,'1430','Buildings','asset','fixed_asset',h_fix,'debit'),
        (tid,'1490','Accumulated Depreciation','asset','depreciation',h_fix,'credit')
    ON CONFLICT DO NOTHING;

    -- ═══ LIABILITIES ═══
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,is_header,normal_balance) VALUES (tid,'2000','Liabilities','liability',true,'credit') ON CONFLICT DO NOTHING RETURNING id INTO h_liab;
    SELECT id INTO h_liab FROM acct_accounts WHERE tenant_id=tid AND account_code='2000';
    
    -- Current Liabilities
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,parent_id,is_header,normal_balance) VALUES (tid,'2100','Current Liabilities','liability',h_liab,true,'credit') ON CONFLICT DO NOTHING RETURNING id INTO h_cur_l;
    SELECT id INTO h_cur_l FROM acct_accounts WHERE tenant_id=tid AND account_code='2100';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance,is_system) VALUES
        (tid,'2110','Accounts Payable','liability','payable',h_cur_l,'credit',true),
        (tid,'2120','PPN Keluaran (VAT Out)','liability','tax_payable',h_cur_l,'credit',true),
        (tid,'2130','PPh 21 Payable','liability','tax_payable',h_cur_l,'credit',false),
        (tid,'2140','PPh 23 Payable','liability','tax_payable',h_cur_l,'credit',false),
        (tid,'2150','Accrued Expenses','liability','accrued',h_cur_l,'credit',false),
        (tid,'2160','Unearned Revenue','liability','deferred',h_cur_l,'credit',false)
    ON CONFLICT DO NOTHING;
    
    -- Long-Term Liabilities
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,parent_id,is_header,normal_balance) VALUES (tid,'2200','Long-Term Liabilities','liability',h_liab,true,'credit') ON CONFLICT DO NOTHING RETURNING id INTO h_ltl;
    SELECT id INTO h_ltl FROM acct_accounts WHERE tenant_id=tid AND account_code='2200';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance) VALUES
        (tid,'2210','Bank Loans','liability','loan',h_ltl,'credit'),
        (tid,'2220','Long-Term Debt','liability','loan',h_ltl,'credit')
    ON CONFLICT DO NOTHING;

    -- ═══ EQUITY ═══
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,is_header,normal_balance) VALUES (tid,'3000','Equity','equity',true,'credit') ON CONFLICT DO NOTHING RETURNING id INTO h_equity;
    SELECT id INTO h_equity FROM acct_accounts WHERE tenant_id=tid AND account_code='3000';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance,is_system) VALUES
        (tid,'3100','Owner''s Capital','equity','capital',h_equity,'credit',true),
        (tid,'3200','Retained Earnings','equity','retained',h_equity,'credit',true),
        (tid,'3300','Current Year Earnings','equity','retained',h_equity,'credit',true),
        (tid,'3400','Owner''s Drawing','equity','drawing',h_equity,'debit',false)
    ON CONFLICT DO NOTHING;

    -- ═══ REVENUE ═══
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,is_header,normal_balance) VALUES (tid,'4000','Revenue','revenue',true,'credit') ON CONFLICT DO NOTHING RETURNING id INTO h_rev;
    SELECT id INTO h_rev FROM acct_accounts WHERE tenant_id=tid AND account_code='4000';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance) VALUES
        (tid,'4100','Sales Revenue','revenue','sales',h_rev,'credit'),
        (tid,'4200','Service Revenue','revenue','service',h_rev,'credit'),
        (tid,'4300','Other Income','revenue','other',h_rev,'credit'),
        (tid,'4400','Interest Income','revenue','interest',h_rev,'credit'),
        (tid,'4500','Foreign Exchange Gain','revenue','forex',h_rev,'credit'),
        (tid,'4900','Sales Returns & Allowances','revenue','contra',h_rev,'debit')
    ON CONFLICT DO NOTHING;

    -- ═══ EXPENSES ═══
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,is_header,normal_balance) VALUES (tid,'5000','Expenses','expense',true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_exp;
    SELECT id INTO h_exp FROM acct_accounts WHERE tenant_id=tid AND account_code='5000';
    
    -- COGS
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,is_header,normal_balance) VALUES (tid,'5100','Cost of Goods Sold','expense','cogs',h_exp,true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_cogs;
    SELECT id INTO h_cogs FROM acct_accounts WHERE tenant_id=tid AND account_code='5100';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance) VALUES
        (tid,'5110','Direct Materials','expense','cogs',h_cogs,'debit'),
        (tid,'5120','Direct Labor','expense','cogs',h_cogs,'debit'),
        (tid,'5130','Manufacturing Overhead','expense','cogs',h_cogs,'debit')
    ON CONFLICT DO NOTHING;
    
    -- Operating Expenses
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,is_header,normal_balance) VALUES (tid,'5200','Operating Expenses','expense','operating',h_exp,true,'debit') ON CONFLICT DO NOTHING RETURNING id INTO h_opex;
    SELECT id INTO h_opex FROM acct_accounts WHERE tenant_id=tid AND account_code='5200';
    INSERT INTO acct_accounts (tenant_id,account_code,name,account_type,account_subtype,parent_id,normal_balance) VALUES
        (tid,'5210','Salaries & Wages','expense','payroll',h_opex,'debit'),
        (tid,'5220','Rent Expense','expense','operating',h_opex,'debit'),
        (tid,'5230','Utilities','expense','operating',h_opex,'debit'),
        (tid,'5240','Office Supplies','expense','operating',h_opex,'debit'),
        (tid,'5250','Depreciation Expense','expense','depreciation',h_opex,'debit'),
        (tid,'5260','Insurance','expense','operating',h_opex,'debit'),
        (tid,'5270','Professional Fees','expense','operating',h_opex,'debit'),
        (tid,'5280','Marketing & Advertising','expense','marketing',h_opex,'debit'),
        (tid,'5290','Travel & Entertainment','expense','operating',h_opex,'debit'),
        (tid,'5300','Bank Charges','expense','financial',h_exp,'debit'),
        (tid,'5310','Interest Expense','expense','financial',h_exp,'debit'),
        (tid,'5320','Foreign Exchange Loss','expense','forex',h_exp,'debit'),
        (tid,'5900','Other Expenses','expense','other',h_exp,'debit')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Accounting Chart of Accounts seeded successfully';
END $$;
