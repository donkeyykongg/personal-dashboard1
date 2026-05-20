-- supabase/20260520_replace_crypto_with_debt.sql
-- Swap the 'crypto' net-worth category for 'debt'. Debt amounts are stored
-- positive (like a balance owed); calculations in lib/finances/net-worth.ts
-- subtract them from grand total so net worth = assets - debt.

UPDATE financial_accounts SET nw_category = 'other' WHERE nw_category = 'crypto';

ALTER TABLE financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_nw_category_check;
ALTER TABLE financial_accounts ADD CONSTRAINT financial_accounts_nw_category_check
  CHECK (nw_category IN ('bank', 'stocks', 'debt', 'other'));
