-- Notion-like hierarchical knowledge base.
-- One recursive table; top-level (parent_id null) rows are "entities".

create table if not exists brain_pages (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references brain_pages(id) on delete cascade,
  title text not null,
  icon text,
  status_dot text not null default 'green' check (status_dot in ('green', 'yellow', 'red')),
  content_md text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brain_pages_parent_idx on brain_pages (parent_id, sort_order);
create index if not exists brain_pages_updated_idx on brain_pages (updated_at desc);

create or replace function brain_pages_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists brain_pages_touch on brain_pages;
create trigger brain_pages_touch
  before update on brain_pages
  for each row execute function brain_pages_touch_updated_at();

create table if not exists brain_briefings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references brain_pages(id) on delete cascade,
  summary text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists brain_briefings_page_idx on brain_briefings (page_id, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array['brain_pages', 'brain_briefings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated can manage rows', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'authenticated can manage rows', t
    );
  end loop;
end $$;

-- Seed entities matching the user's screenshot. Idempotent: only inserts if no top-level
-- rows exist yet.
insert into brain_pages (title, icon, status_dot, content_md, sort_order)
select * from (values
  ('Business $',        '$',  'green',  'Deals, sponsors, revenue — anything that brings in money.',     0),
  ('Products',          '📦', 'green',  'MHC + new product. Anything you ship.',                          1),
  ('Content',           '🎬', 'yellow', 'All channels — AI Edge, vlogs, IG, Discord, future channels.',   2),
  ('Legal',             '⚖',  'green',  'Contracts, regulatory, lawyer matters across everything.',       3),
  ('Personal Finance',  '💰', 'green',  'Personal cash, accounts, investments, crypto.',                  4),
  ('Property',          '🏠', 'green',  'Real estate / development — homes, payments, paperwork.',        5),
  ('Business Ops',      '⚙',  'green',  'Admin across all businesses — banking, compliance, tooling, accounts.', 6),
  ('OpSec',             '🛡', 'green',  'Security hygiene — 2FA, password manager, leaks, custody.',      7),
  ('Personal Admin',    '📋', 'green',  'Life admin — appointments, sims, calendar, errands.',            8)
) as v(title, icon, status_dot, content_md, sort_order)
where not exists (select 1 from brain_pages where parent_id is null);
