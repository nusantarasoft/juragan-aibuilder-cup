-- Align inv_items with inventory.service createItem/updateItem fields
ALTER TABLE public.inv_items
    ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS default_shelf_life_days INT,
    ADD COLUMN IF NOT EXISTS has_depreciation BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS depreciation_method TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS useful_life_months INT,
    ADD COLUMN IF NOT EXISTS salvage_value NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_fixed_asset BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS asset_category TEXT;

NOTIFY pgrst, 'reload schema';
