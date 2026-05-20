-- supabase/20260519_extend_subscriptions.sql
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_renewal date;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS from_account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_deduct boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_deducted_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS entered_amount numeric;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS entered_currency text DEFAULT 'CHF';

-- Backfill next_renewal from billing_date (day-of-month integer)
UPDATE subscriptions
SET next_renewal = (
  CASE
    WHEN EXTRACT(DAY FROM CURRENT_DATE)::int <= billing_date
      THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, LEAST(billing_date, 28))
    ELSE (make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, LEAST(billing_date, 28)) + INTERVAL '1 month')::date
  END
)
WHERE next_renewal IS NULL AND billing_date IS NOT NULL;

CREATE INDEX subscriptions_next_renewal_idx ON subscriptions (next_renewal);
