ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS amount_type text DEFAULT 'monthly'
    CHECK (amount_type IN ('monthly', 'total'));

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS already_outflow boolean DEFAULT false;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paid_on date;

UPDATE subscriptions
SET amount_type = 'monthly'
WHERE amount_type IS NULL;

UPDATE subscriptions
SET already_outflow = false
WHERE already_outflow IS NULL;
