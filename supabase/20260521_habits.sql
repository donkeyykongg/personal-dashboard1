-- Daily habits + per-day completion logs.
-- Streaks are computed on the fly from habit_logs (no materialized column).

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  parent_id uuid references habits(id) on delete cascade,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists habits_parent_sort_idx on habits (parent_id, sort_order);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  completed_at timestamptz not null default now(),
  unique (habit_id, date)
);

create index if not exists habit_logs_date_idx on habit_logs (date);
create index if not exists habit_logs_habit_date_idx on habit_logs (habit_id, date);

-- Apply the same authenticated-can-manage RLS policy used by other dashboard tables.
do $$
declare
  t text;
begin
  foreach t in array array['habits', 'habit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated can manage rows', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'authenticated can manage rows', t
    );
  end loop;
end $$;
