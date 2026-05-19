-- Paste this into the Supabase SQL editor to support the updated finances page.

alter table public.income
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurring_interval text check (recurring_interval in ('weekly', 'monthly', 'yearly')),
  add column if not exists next_due_date date;

alter table public.expenses
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurring_interval text check (recurring_interval in ('weekly', 'monthly', 'yearly')),
  add column if not exists next_due_date date;

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('asset', 'liability', 'income', 'expense')),
  amount numeric not null default 0,
  interest_rate numeric,
  min_payment numeric,
  created_at timestamptz not null default now()
);

create index if not exists income_next_due_date_idx on public.income (next_due_date);
create index if not exists expenses_next_due_date_idx on public.expenses (next_due_date);
create index if not exists financial_accounts_kind_idx on public.financial_accounts (kind);
