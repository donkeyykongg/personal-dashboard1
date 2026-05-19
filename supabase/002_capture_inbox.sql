-- Capture inbox: quick-dump text snippets to triage later.
create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  destination text,           -- e.g. 'note', 'task', 'idea' (free-form)
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists inbox_items_created_idx on public.inbox_items (created_at desc);
