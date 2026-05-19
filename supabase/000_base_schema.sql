-- Run FIRST in Supabase SQL editor.
-- Idempotent: safe to re-run. Creates the base tables the app reads from.

-- Income / expenses (FinanceEntry) ------------------------------------
create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  amount numeric not null default 0,
  category text not null,
  subcategory text,
  item text,
  date date not null default current_date,
  notes text,
  is_recurring boolean not null default false,
  recurring_interval text check (recurring_interval in ('weekly','monthly','yearly')),
  next_due_date date,
  created_at timestamptz not null default now()
);
create index if not exists income_date_idx on public.income (date desc);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  amount numeric not null default 0,
  category text not null,
  subcategory text,
  item text,
  date date not null default current_date,
  notes text,
  is_recurring boolean not null default false,
  recurring_interval text check (recurring_interval in ('weekly','monthly','yearly')),
  next_due_date date,
  created_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses (date desc);

-- Monthly cash flow (manual logging) ----------------------------------
create table if not exists public.monthly_cash_flow (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,           -- 'YYYY-MM'
  revenue numeric not null default 0,
  expenses numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- Subscriptions -------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null default 0,
  billing_date int not null default 1,  -- day of month
  billing_cycle text not null default 'monthly' check (billing_cycle in ('weekly','monthly','yearly')),
  category text not null default 'tools' check (category in ('tools','software','personal')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Reflections ---------------------------------------------------------
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  score int not null default 5 check (score between 1 and 10),
  content text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reflections_date_idx on public.reflections (date desc);

-- Financial accounts (also defined in finance-updates.sql; duplicate-safe)
create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('asset','liability','income','expense')),
  amount numeric not null default 0,
  interest_rate numeric,
  min_payment numeric,
  created_at timestamptz not null default now()
);
