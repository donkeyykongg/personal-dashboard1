-- Paste this into the Supabase SQL editor.
-- Additive to finance-updates.sql. Safe to re-run.

-- 1. Notes / folders --------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  type text not null default 'standard' check (type in ('standard','vault')),
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders(id) on delete cascade,
  title text not null default 'Untitled',
  content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_folder_id_idx on public.notes (folder_id);
create index if not exists folders_parent_id_idx on public.folders (parent_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- 2. Editable Next-7-days --------------------------------------------
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  day_offset int not null check (day_offset between 0 and 6),
  task text not null,
  tone text not null default 'bg-slate-100 text-slate-700',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists daily_tasks_day_idx on public.daily_tasks (day_offset, sort);

-- 3. Editable journal prompts ----------------------------------------
create table if not exists public.journal_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- 4. User settings (single row) --------------------------------------
create table if not exists public.user_settings (
  id int primary key default 1,
  last_pomodoro_minutes int not null default 25,
  updated_at timestamptz not null default now()
);
insert into public.user_settings (id) values (1) on conflict (id) do nothing;

-- 5. Schedule events --------------------------------------------------
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  body text,
  outlook_event_id text unique,
  sync_status text not null default 'local' check (sync_status in ('local','synced','pending','error','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists schedule_events_start_idx on public.schedule_events (start_at);
drop trigger if exists schedule_events_set_updated_at on public.schedule_events;
create trigger schedule_events_set_updated_at
  before update on public.schedule_events
  for each row execute function public.set_updated_at();

-- 6. OAuth tokens -----------------------------------------------------
create table if not exists public.oauth_tokens (
  provider text primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  account_email text,
  delta_link text,
  updated_at timestamptz not null default now()
);

-- 7. Subcategory + item on income/expenses ---------------------------
alter table public.income   add column if not exists subcategory text;
alter table public.income   add column if not exists item text;
alter table public.expenses add column if not exists subcategory text;
alter table public.expenses add column if not exists item text;

-- 8. Seed defaults so UI isn't empty on first load -------------------
insert into public.daily_tasks (day_offset, task, tone, sort)
select * from (values
  (0, 'Review month-to-date inflows and outflows', 'bg-emerald-100 text-emerald-700', 0),
  (0, 'Check any unusual expense categories',      'bg-emerald-100 text-emerald-700', 1),
  (1, 'Audit subscriptions due this week',         'bg-sky-100 text-sky-700',         0),
  (1, 'Cancel or update anything stale',           'bg-sky-100 text-sky-700',         1),
  (2, 'Clean loose notes',                         'bg-amber-100 text-amber-700',     0),
  (2, 'Move account details into the vault',      'bg-amber-100 text-amber-700',     1),
  (3, 'Log actual cash flow',                      'bg-indigo-100 text-indigo-700',   0),
  (3, 'Update recurring expense dates',            'bg-indigo-100 text-indigo-700',   1),
  (4, 'Plan upcoming content',                     'bg-rose-100 text-rose-700',       0),
  (4, 'Add launch reminders to calendar',          'bg-rose-100 text-rose-700',       1),
  (5, 'Write quick reflection',                    'bg-violet-100 text-violet-700',   0),
  (5, 'Capture blockers and follow-ups',           'bg-violet-100 text-violet-700',   1),
  (6, 'Clear open loops',                          'bg-slate-100 text-slate-700',     0),
  (6, 'Set priorities for next week',              'bg-slate-100 text-slate-700',     1)
) as v(day_offset, task, tone, sort)
where not exists (select 1 from public.daily_tasks);

insert into public.journal_prompts (prompt, sort)
select * from (values
  ('What felt easy today, and what felt heavier than expected?',          0),
  ('What spending decision do I want to understand better?',              1),
  ('What is one thing I should move into notes, schedule, or Kanban?',    2),
  ('What should tomorrow''s first focus sprint be?',                      3)
) as v(prompt, sort)
where not exists (select 1 from public.journal_prompts);
