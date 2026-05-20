-- supabase/20260519_create_nw_snapshots.sql
CREATE TABLE nw_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_chf numeric NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nw_snapshots_captured_at_idx ON nw_snapshots (captured_at);
