-- Reminder delivery ledger for Telegram notifications.
-- Prevents duplicate sends when /api/reminders/run is called repeatedly.

create table if not exists reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target_id text not null,
  reminder_key text not null,
  sent_at timestamptz not null default now(),
  unique (kind, target_id, reminder_key)
);

create index if not exists reminder_deliveries_sent_at_idx
  on reminder_deliveries (sent_at desc);

alter table public.reminder_deliveries enable row level security;
grant select, insert on public.reminder_deliveries to authenticated;

drop policy if exists "authenticated can read reminder deliveries" on public.reminder_deliveries;
create policy "authenticated can read reminder deliveries"
  on public.reminder_deliveries for select to authenticated using (true);

