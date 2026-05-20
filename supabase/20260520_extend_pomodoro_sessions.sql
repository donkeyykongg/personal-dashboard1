-- Extend Pomodoro sessions so focus time can be grouped by activity.
-- Run this in Supabase SQL Editor before using the new Focus analytics.

alter table public.pomodoro_sessions
  add column if not exists planned_minutes int,
  add column if not exists activity_label text not null default 'Focus',
  add column if not exists activity_category text not null default 'Focus',
  add column if not exists mode text not null default 'focus'
    check (mode in ('focus', 'break')),
  add column if not exists notes text;

create index if not exists pomodoro_sessions_category_idx
  on public.pomodoro_sessions (activity_category, started_at desc);
