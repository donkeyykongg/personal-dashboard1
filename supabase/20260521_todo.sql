-- Move the dashboard To-Do list off localStorage.
-- One row per goal per day. Streak persisted as a singleton row.

create table if not exists todo_goals (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  text text not null,
  done boolean not null default false,
  done_at timestamptz,
  queued boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todo_goals_date_idx on todo_goals (date);
create index if not exists todo_goals_date_sort_idx on todo_goals (date, sort_order);

create or replace function todo_goals_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists todo_goals_touch on todo_goals;
create trigger todo_goals_touch
  before update on todo_goals
  for each row execute function todo_goals_touch_updated_at();

create table if not exists todo_streak (
  id int primary key default 1,
  count int not null default 0,
  last_processed_date date,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

insert into todo_streak (id, count) values (1, 0) on conflict (id) do nothing;

do $$
declare
  t text;
begin
  foreach t in array array['todo_goals', 'todo_streak'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated can manage rows', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'authenticated can manage rows', t
    );
  end loop;
end $$;
