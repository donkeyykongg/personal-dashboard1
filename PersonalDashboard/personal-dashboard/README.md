# Personal Dashboard

Next.js 14 App Router + Supabase + Tailwind + shadcn/ui.

## Setup

```bash
cd personal-dashboard
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:3000 — `/` redirects to `/dashboard`.

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor. It creates:

- `income`, `expenses` — finances tracker
- `subscriptions` — recurring services
- `folders`, `notes` — notes app (Tiptap JSON in `notes.content`)
- `scheduled_posts` — social media calendar

Add RLS policies once you wire up auth.

## Structure

```
app/
  layout.tsx              # Sidebar shell
  page.tsx                # → redirects to /dashboard
  dashboard/page.tsx      # Financial summary + quick links
  finances/page.tsx       # Chart, summary cards, entry form
  subscriptions/page.tsx  # Stub
  notes/page.tsx          # Stub
  schedule/page.tsx       # Stub
components/
  ui/                     # shadcn primitives (button, card, input, label, select, textarea)
  layout/sidebar.tsx
  finances/               # SummaryCards, IncomeVsExpensesChart, EntryForm
lib/
  supabase/{client,server,types}.ts
  finances.ts             # Aggregates 12-month income/expenses
  utils.ts                # cn(), formatCurrency()
```

## What's wired up

- `/dashboard` and `/finances` query Supabase server-side via `lib/finances.ts`,
  bucketing the last 12 months of income/expenses.
- `EntryForm` inserts into `income` or `expenses` from the browser, then
  `router.refresh()` re-runs the server fetch.
- Recharts renders `BarChart` with income (emerald) vs expenses (rose).

## Next up

- Subscriptions: list + "due in <7 days" notification banner.
- Notes: folder tree + Tiptap editor with autosave.
- Schedule: monthly calendar with per-platform color coding.
- Auth + RLS so each user only sees their own rows.
