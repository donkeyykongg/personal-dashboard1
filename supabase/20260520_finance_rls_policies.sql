-- RLS policies for the personal dashboard.
-- Run this in Supabase SQL Editor after the app tables exist.
--
-- This does NOT make the tables public/unrestricted.
-- It lets signed-in dashboard users read and edit the app's data, while
-- keeping anonymous visitors blocked by row-level security.

grant usage on schema public to authenticated;

do $$
declare
  table_name text;
  editable_tables text[] := array[
    -- Dashboard
    'daily_tasks',
    'dashboard_goals',
    'inbox_items',
    'journal_prompts',
    'user_settings',

    -- Calendar / schedule
    'schedule_events',
    'oauth_tokens',

    -- Notes
    'folders',
    'notes',
    'pages',

    -- Kanban / focus
    'kanban_cards',
    'pomodoro_sessions',
    'reflections',

    -- Finances
    'financial_accounts',
    'nw_activity',
    'nw_snapshots',
    'subscriptions',
    'income',
    'expenses',
    'monthly_cash_flow'
  ];
begin
  foreach table_name in array editable_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);

      execute format(
        'drop policy if exists %I on public.%I',
        'authenticated can manage rows',
        table_name
      );

      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        'authenticated can manage rows',
        table_name
      );
    end if;
  end loop;
end $$;
