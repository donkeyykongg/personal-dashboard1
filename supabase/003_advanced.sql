-- Tier 3: pomodoro history + kanban persistence with priority matrix.

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  ended_at timestamptz not null default now(),
  minutes int not null,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists pomodoro_sessions_started_idx
  on public.pomodoro_sessions (started_at desc);

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  column_key text not null default 'backlog'
    check (column_key in ('backlog','todo','doing','done')),
  priority text not null default 'medium'
    check (priority in ('high','medium','low')),
  effort text not null default 'medium'
    check (effort in ('high','medium','low')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kanban_cards_col_idx
  on public.kanban_cards (column_key, sort);

drop trigger if exists kanban_cards_set_updated_at on public.kanban_cards;
create trigger kanban_cards_set_updated_at
  before update on public.kanban_cards
  for each row execute function public.set_updated_at();
