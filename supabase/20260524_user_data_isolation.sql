-- Per-user data isolation for the personal dashboard.
--
-- Before running this, optionally set the owner for existing rows:
--   set app.owner_user_id = '00000000-0000-0000-0000-000000000000';
--
-- If app.owner_user_id is not set, existing rows are assigned to the
-- oldest Supabase auth user. That matches the current one-user setup.

grant usage on schema public to authenticated;

do $$
declare
  owner_id uuid := coalesce(
    nullif(current_setting('app.owner_user_id', true), '')::uuid,
    (select id from auth.users order by created_at asc limit 1)
  );
  t text;
  owned_tables text[] := array[
    'income',
    'expenses',
    'monthly_cash_flow',
    'subscriptions',
    'reflections',
    'financial_accounts',
    'daily_tasks',
    'journal_prompts',
    'user_settings',
    'schedule_events',
    'oauth_tokens',
    'folders',
    'notes',
    'inbox_items',
    'pomodoro_sessions',
    'habits',
    'habit_logs',
    'todo_goals',
    'todo_streak',
    'journal_entries',
    'journal_summaries',
    'kanban_cards',
    'nw_activity',
    'nw_snapshots',
    'dashboard_goals',
    'pages'
  ];
begin
  if owner_id is null then
    raise exception 'No existing auth user found. Create/verify your owner user first, or set app.owner_user_id.';
  end if;

  foreach t in array owned_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I add column if not exists user_id uuid references auth.users(id) on delete cascade', t);
      execute format('alter table public.%I alter column user_id set default auth.uid()', t);
      execute format('update public.%I set user_id = $1 where user_id is null', t) using owner_id;
      execute format('alter table public.%I alter column user_id set not null', t);
      execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);

      execute format('alter table public.%I enable row level security', t);
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('drop policy if exists %I on public.%I', 'authenticated can manage rows', t);
      execute format('drop policy if exists %I on public.%I', 'users can manage own rows', t);
      execute format(
        'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
        'users can manage own rows',
        t
      );
    end if;
  end loop;
end $$;

-- Tables that used singleton/global uniqueness now need per-user uniqueness.
do $$
begin
  if to_regclass('public.user_settings') is not null then
    alter table public.user_settings drop constraint if exists user_settings_pkey;
    alter table public.user_settings add constraint user_settings_pkey primary key (user_id);
  end if;

  if to_regclass('public.todo_streak') is not null then
    alter table public.todo_streak drop constraint if exists todo_streak_pkey;
    alter table public.todo_streak add constraint todo_streak_pkey primary key (user_id);
  end if;

  if to_regclass('public.monthly_cash_flow') is not null then
    alter table public.monthly_cash_flow drop constraint if exists monthly_cash_flow_month_key;
    create unique index if not exists monthly_cash_flow_user_month_key
      on public.monthly_cash_flow (user_id, month);
  end if;

  if to_regclass('public.journal_summaries') is not null then
    alter table public.journal_summaries drop constraint if exists journal_summaries_period_period_start_key;
    create unique index if not exists journal_summaries_user_period_key
      on public.journal_summaries (user_id, period, period_start);
  end if;

  if to_regclass('public.oauth_tokens') is not null then
    alter table public.oauth_tokens drop constraint if exists oauth_tokens_pkey;
    alter table public.oauth_tokens add constraint oauth_tokens_pkey primary key (user_id, provider);
  end if;

  if to_regclass('public.schedule_events') is not null then
    alter table public.schedule_events drop constraint if exists schedule_events_outlook_event_id_key;
    create unique index if not exists schedule_events_user_outlook_event_key
      on public.schedule_events (user_id, outlook_event_id)
      where outlook_event_id is not null;
  end if;
end $$;
