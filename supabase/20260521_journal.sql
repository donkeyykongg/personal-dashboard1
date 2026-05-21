-- Unified journal entries (app + Telegram) and AI-generated summaries.

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text not null default 'app',  -- 'app' | 'telegram'
  created_at timestamptz not null default now(),
  -- Local-day partition. Stored as a generated column so day-grouping is cheap.
  date date generated always as ((created_at at time zone 'America/Toronto')::date) stored
);

create index if not exists journal_entries_date_idx on journal_entries (date desc);
create index if not exists journal_entries_created_idx on journal_entries (created_at desc);

create table if not exists journal_summaries (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period in ('day', 'week', 'month')),
  period_start date not null,
  summary text not null,
  model text,
  created_at timestamptz not null default now(),
  unique (period, period_start)
);

create index if not exists journal_summaries_period_idx on journal_summaries (period, period_start desc);

do $$
declare
  t text;
begin
  foreach t in array array['journal_entries', 'journal_summaries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated can manage rows', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'authenticated can manage rows', t
    );
  end loop;
end $$;
