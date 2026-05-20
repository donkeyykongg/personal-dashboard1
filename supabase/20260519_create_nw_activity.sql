-- supabase/20260519_create_nw_activity.sql
CREATE TABLE nw_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL,
  account_name text NOT NULL,
  nw_category text NOT NULL,
  delta_chf numeric NOT NULL,
  kind text NOT NULL CHECK (kind IN ('add', 'edit', 'delete')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nw_activity_created_at_idx ON nw_activity (created_at DESC);
