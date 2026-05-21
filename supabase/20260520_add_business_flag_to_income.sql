ALTER TABLE income ADD COLUMN IF NOT EXISTS is_business boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS income_is_business_idx ON income (is_business) WHERE is_business = true;
