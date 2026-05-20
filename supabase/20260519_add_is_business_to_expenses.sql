-- supabase/20260519_add_is_business_to_expenses.sql
ALTER TABLE expenses ADD COLUMN is_business boolean NOT NULL DEFAULT false;
CREATE INDEX expenses_is_business_idx ON expenses (is_business) WHERE is_business = true;
