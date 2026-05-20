-- supabase/20260519_add_nw_category_to_financial_accounts.sql
ALTER TABLE financial_accounts
  ADD COLUMN nw_category text NOT NULL DEFAULT 'bank'
  CHECK (nw_category IN ('bank', 'stocks', 'crypto', 'other'));

CREATE INDEX financial_accounts_nw_category_idx ON financial_accounts (nw_category);
