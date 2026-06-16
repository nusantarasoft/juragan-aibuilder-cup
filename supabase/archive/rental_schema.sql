-- ═══════════════════════════════════════════════════════
-- Rental Engine Schema
-- Tables: rental_assets, rental_contracts
-- ═══════════════════════════════════════════════════════

-- 1. Rental Assets (individual trackable items)
CREATE TABLE IF NOT EXISTS rental_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    asset_code TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    serial_number TEXT,
    category TEXT,
    condition TEXT DEFAULT 'excellent' CHECK (condition IN ('excellent','good','fair','poor')),
    purchase_date DATE,
    purchase_cost NUMERIC(14,2),
    current_location TEXT,
    daily_rate NUMERIC(14,2) DEFAULT 0,
    deposit_amount NUMERIC(14,2) DEFAULT 0,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    total_rentals INT DEFAULT 0,
    total_revenue NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available','rented','maintenance','retired')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_assets_tenant ON rental_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_assets_status ON rental_assets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_assets_code ON rental_assets(tenant_id, asset_code);

ALTER TABLE rental_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_assets_all" ON rental_assets FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON rental_assets TO anon, authenticated, service_role, authenticator;

-- 2. Rental Contracts (check-out/return records)
CREATE TABLE IF NOT EXISTS rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    contract_code TEXT NOT NULL,
    asset_id UUID NOT NULL REFERENCES rental_assets(id) ON DELETE CASCADE,
    asset_name TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_id_number TEXT,
    checkout_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    daily_rate NUMERIC(14,2) DEFAULT 0,
    deposit_amount NUMERIC(14,2) DEFAULT 0,
    deposit_returned NUMERIC(14,2) DEFAULT 0,
    rental_days INT GENERATED ALWAYS AS (
        CASE WHEN actual_return_date IS NOT NULL
            THEN GREATEST(1, actual_return_date - checkout_date)
            ELSE GREATEST(1, expected_return_date - checkout_date)
        END
    ) STORED,
    subtotal NUMERIC(14,2) DEFAULT 0,
    late_fee NUMERIC(14,2) DEFAULT 0,
    damage_fee NUMERIC(14,2) DEFAULT 0,
    total_charge NUMERIC(14,2) DEFAULT 0,
    checkout_condition TEXT,
    return_condition TEXT,
    checkout_notes TEXT,
    return_notes TEXT,
    returned_by TEXT,
    approved_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','returned','overdue','lost')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_contracts_tenant ON rental_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_asset ON rental_contracts(asset_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON rental_contracts(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_contracts_code ON rental_contracts(tenant_id, contract_code);

ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_contracts_all" ON rental_contracts FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON rental_contracts TO anon, authenticated, service_role, authenticator;
