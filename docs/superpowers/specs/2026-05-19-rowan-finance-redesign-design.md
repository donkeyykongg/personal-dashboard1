# Rowan-style finance redesign + bottom tab bar navigation

**Date:** 2026-05-19
**Status:** Design approved, pending implementation plan

## Goal

Replace the current `/finances` page with a Rowan-finance.html-style layout (dark glassmorphism, Net Worth hero with line/donut charts, activity log, subscription renewal ticker), and replace the collapsible sidebar with a fixed bottom tab bar across the whole app. The existing dashboard page already uses the dark glassmorphism style and is not in scope.

## Scope

**In scope:**
- New `BottomTabBar` component replacing `Sidebar` in `app/layout.tsx`
- Full rebuild of `app/finances/page.tsx` to four sections: Net Worth, Subscriptions, Cash Flow, Business Expenses
- Subscription renewal ticker (NASDAQ-style scrolling banner) at the top of the finance page
- Two new Supabase tables (`nw_activity`, `nw_snapshots`) and two new columns (`accounts.category`, `expenses.is_business`)
- Exchange rate fetch from `open.er-api.com` for CHF/USD/EUR/GBP display switching
- Upgrade `StatementAnalyzer` to use Claude API (Haiku 4.5) for transaction parsing + categorization, replacing the keyword-rules approach

**Out of scope:**
- Dashboard page (already styled, untouched)
- Orders / Wishlist features from Rowan's reference
- Other pages (kanban, notes, schedule, reflections, pomodoro) — they only get the new bottom tab bar wrapping them
- Mobile-vs-desktop nav split — tab bar stays at the bottom on all sizes

## Navigation

The collapsible sidebar is removed. A fixed bottom tab bar replaces it.

**Tab bar structure (5 slots):**
- Home (→ `/dashboard`)
- Finances (→ `/finances`)
- Kanban (→ `/kanban`)
- Notes (→ `/notes`)
- More → opens a bottom sheet listing Schedule, Reflections, Pomodoro, Settings

**Styling** (matches Rowan):
- Background: `rgba(5, 5, 6, 0.92)` with `backdrop-filter: blur(20px)`
- Top border: 1px gradient `linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)`
- Active tab: glassmorphism pill — `rgba(255,255,255,0.06)` background with `rgba(255,255,255,0.10)` border
- Inactive tab: `color: var(--text-tertiary)` (#76746E)
- Icon + 10px uppercase label per tab
- `env(safe-area-inset-bottom)` padding for iPhone home indicator

**Layout impact:**
- Main content area gets `pb-20` padding to avoid the tab bar overlapping content
- The tab bar stays at the bottom on all viewport sizes — this is a personal app, optimized for the user's actual usage pattern (phone + laptop)

**Implementation:**
- Remove `Sidebar` import and `SidebarStateProvider` wrapper from `app/layout.tsx`
- Add new client component `components/layout/bottom-tab-bar.tsx`
- Add new client component `components/layout/more-sheet.tsx` (uses existing shadcn Sheet primitive)
- The `BottomTabBar` reads `usePathname()` to highlight the active tab

## Finance page layout

Four tabs at the top of `/finances`. Tab state lives in URL search param (`?tab=net-worth`) so deep linking works.

### Renewal ticker (above tabs)

A horizontal pill above the tab strip, full-width, scrolling through upcoming subscription renewals from the `subscriptions` Supabase table.

- Each rotation shows: subscription name + amount + "in Nd" / "TODAY" / "TOMORROW" / "Nd late"
- Auto-rotates every 5 seconds
- Dot indicators show position
- Background: subtle green-blue gradient by default; flips to red gradient + pulse animation when active item is ≤5 days out
- Hides itself when no subscriptions have renewal dates set

### Tab 1 — Net Worth (default)

- **Header row:** "Total net worth" label, large number, breakdown line (Bank: X • Stocks: Y • ...), currency switcher dropdown (CHF/USD/EUR/GBP, default CHF)
- **Two-column overview row:**
  - Left: line chart of NW history (all-time), with delta % vs first snapshot, color-coded (green up / red down), stats overlay underneath (1% =, all-time high, all-time low, snapshot count)
  - Right: donut chart of allocation — one slice per individual account, colored by parent category, plus a red slice for annualized subscription burn (computed as `sum(monthly_equivalent(sub)) * 12` where weekly = amount × 4.345, yearly = amount ÷ 12, monthly = amount)
- **Activity log:** last 30 add/edit/delete events from `nw_activity` table, each row colored by category, with delta amount and relative date
- **2×2 grid of category sub-cards:** Bank, Stocks, Crypto, Other. Each shows:
  - Category total
  - List of accounts with inline-editable name + amount, delete button
  - Quick-add form (name + amount)

### Tab 2 — Subscriptions

- **Hero card:** Monthly burn (large number with `/ mo` suffix), yearly equivalent below, subscription count
- **Subscription rows:** name + period + renewal date + "from account" pill + auto-deduct toggle, with amount + per-month equivalent on the right. Urgent rows (≤5 days to renewal) get red border + pulse animation
- **Quick-add form:** name / amount / currency / period (monthly/yearly/weekly) / renewal date / from account / auto-deduct toggle
- **Auto-deduct logic:** on each `/finances` page load, `processAutoDeductSubs()` scans subs where `auto_deduct=true`, finds any whose renewal has passed and hasn't been deducted yet, subtracts amount from linked account, writes an `nw_activity` row, rolls renewal date forward by period. Idempotent via `last_deducted_at` field.
- **Known limitation:** auto-deduct fires only when the user visits the finance page — there's no server-side cron. A user who skips the page for months will see all the deductions catch up on their next visit (correct totals, just bursty activity log). Server-side cron is out of scope.

### Tab 3 — Cash Flow

- **Top:** two summary cards side-by-side — Inflow this month / Outflow this month, each with a small sparkline of the last 3 months
- **Main chart:** existing `IncomeVsExpensesChart` (income vs expenses by month) — restyled to match Rowan's chart aesthetic (currentColor stroke, gradient fill, dashed grid)
- **Two lists side-by-side:** Recent inflows / Recent outflows, using Rowan's activity-row styling (left colored bar, name + meta, amount on right, date)

### Tab 4 — Business Expenses

- **Hero:** total business spend this month + YTD
- **Donut:** breakdown by user-defined category (the `expenses.category` column for rows where `is_business=true`)
- **Category list:** for each category, total + percentage of business spend
- **Recent business expenses:** rows with category pill, date, amount, edit/delete actions
- **Quick-add form:** description / amount / category (combobox — pick existing or type new; values come from `DISTINCT category FROM expenses WHERE is_business = true`) / date / `is_business=true` checked by default

## Statement analyzer (Claude API)

A dedicated import route at `/finances/import`, accessed via an "Import statement" button on the Cash Flow tab. Replaces the existing keyword-rule parser entirely.

**Flow:**
1. User pastes statement text OR uploads a PDF
2. Frontend POSTs to `/api/parse-statement` with the content
3. Server route calls Claude Haiku 4.5 via the Anthropic SDK with a structured-output prompt
4. Response is parsed into `ParsedTransaction[]` with `{date, description, category, amount, type, account_id?}`
5. UI shows the parsed transactions in a reviewable table — user can edit category, toggle `is_business`, exclude rows, pick destination account
6. "Import N transactions" button bulk-inserts into `expenses` (and `income` for credits) via Supabase

**Model choice:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — fast enough, accurate enough for personal use, ~$0.02 per statement.

**Prompt structure (system prompt cacheable):**
- System: "You are a bank statement parser. Extract transactions as JSON array. Categories: [Dining, Coffee & Drinks, Groceries, Transit, AI & Tech, Subscriptions, Shopping, Rent, Salary, Transfer, Other]."
- User: pasted statement text or PDF document
- `tool_choice` for structured output via tools API, returning typed JSON

**PDF handling:** Anthropic SDK accepts PDFs directly as document blocks. Image-only PDFs go through vision. Text PDFs are parsed as text.

**Auth:** Anthropic API key lives in `ANTHROPIC_API_KEY` env var (added to Vercel + `.env.local`). Never exposed to the client — all calls go through the Next.js API route.

**Rate / abuse safeguards:** none needed for a personal app. The route checks Supabase auth (user must be logged in) and rejects anonymous requests.

**Failure modes:**
- API key missing → 500 with "Set ANTHROPIC_API_KEY"
- Anthropic API failure (network, rate limit) → 502 with the upstream error message; UI shows a retry button
- Empty/unparseable input → 422 with "No transactions found"; UI keeps the input so the user can edit

**File structure:**
```
app/
  finances/
    import/
      page.tsx                                ← new route
  api/
    parse-statement/
      route.ts                                ← new server route
components/
  finances/
    statement-import/
      statement-import-page.tsx               ← upload + paste UI
      parsed-transactions-table.tsx          ← reviewable table
      bulk-import-button.tsx                  ← inserts into Supabase
lib/
  anthropic.ts                                ← SDK client init
  finances/
    parse-statement.ts                        ← prompt + tool-call wrapper
```

The old `components/finances/statement-analyzer.tsx` file is deleted; its categorization rules become hints in the Claude system prompt (so user's known merchants like "TST-FRESH BURRITO" still categorize correctly even without prior learning).

## Data model changes

### New columns

```sql
ALTER TABLE financial_accounts ADD COLUMN nw_category text DEFAULT 'bank'
  CHECK (nw_category IN ('bank', 'stocks', 'crypto', 'other'));

ALTER TABLE expenses ADD COLUMN is_business boolean DEFAULT false;
```

Existing `financial_accounts` rows get `nw_category = 'bank'` by default; user can recategorize via the UI. Column is named `nw_category` (not `category`) to avoid collision with the existing `FinancialAccount.kind` field used for asset/liability/income/expense classification.
Existing `expenses` rows get `is_business = false`; user can flag them via the edit form.

### New tables

```sql
CREATE TABLE nw_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL,
  account_name text NOT NULL,
  nw_category text NOT NULL,
  delta_chf numeric NOT NULL,
  kind text NOT NULL CHECK (kind IN ('add', 'edit', 'delete')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX nw_activity_created_at_idx ON nw_activity (created_at DESC);

CREATE TABLE nw_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_chf numeric NOT NULL,
  captured_at timestamptz DEFAULT now()
);
CREATE INDEX nw_snapshots_captured_at_idx ON nw_snapshots (captured_at);
```

A new snapshot is written whenever the NW total changes by more than 0.005 CHF. The line chart reads from this table.

### Subscription additions

The existing `subscriptions` table already has `billing_cycle` (monthly/yearly/weekly) and `billing_date` (day of month, integer). The ticker and auto-deduct need a real next-renewal date plus auto-deduct wiring:

```sql
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_renewal date;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS from_account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_deduct boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_deducted_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS entered_amount numeric;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS entered_currency text DEFAULT 'CHF';
```

On migration, backfill `next_renewal` from existing `billing_date` (day of month) by picking the next occurrence of that day from today. `billing_cycle` is reused as the period; no new column needed.

## Exchange rates

Fetched client-side once per session from `https://open.er-api.com/v6/latest/CHF` (no API key required). Cached in a React context (`ExchangeRatesProvider`) at the finance page level. Falls back to `{CHF:1, USD:1, EUR:1, GBP:1}` if the fetch fails. All Supabase amounts stored in CHF; display currency converts on render.

## Component file structure

```
app/
  layout.tsx                                  ← remove Sidebar, add BottomTabBar
  finances/
    page.tsx                                  ← rebuilt
components/
  layout/
    bottom-tab-bar.tsx                        ← new
    more-sheet.tsx                            ← new
  finances/
    renewal-ticker.tsx                        ← new
    finance-tabs.tsx                          ← new (URL-driven tab nav)
    net-worth/
      net-worth-section.tsx                   ← new (orchestrator)
      net-worth-header.tsx                    ← new (total + currency switcher)
      net-worth-line-chart.tsx                ← new
      allocation-donut.tsx                    ← new
      activity-log.tsx                        ← new
      category-card.tsx                       ← new (one per Bank/Stocks/Crypto/Other)
    subscriptions/
      subscriptions-section.tsx               ← new
      subscription-row.tsx                    ← new (with auto-deduct toggle)
      subscription-add-form.tsx               ← new
    cash-flow/
      cash-flow-section.tsx                   ← new
      flow-summary-cards.tsx                  ← new
      flow-recent-list.tsx                    ← new
    business/
      business-expenses-section.tsx           ← new
      business-category-donut.tsx             ← new
      business-add-form.tsx                   ← new
lib/
  exchange-rates.tsx                          ← new (provider + hook)
  finances/
    net-worth.ts                              ← new (helpers: grand total, snapshot logic)
    activity.ts                               ← new (write nw_activity row)
```

Existing finance components that survive (with restyle, not rebuild):
- `IncomeVsExpensesChart` — restyle to Rowan aesthetic
- `EntryForm`, `EntryList` — used inside Cash Flow tab
- `SubscriptionSummary`, `SubscriptionList` — replaced by new components

Existing finance components removed:
- `BalanceSheetSummary` (replaced by NW header)
- `SummaryCards` (replaced by Cash Flow summary)
- `ExpenseBreakdownPie` (replaced by Business donut)
- `AccountForm`, `AccountList` (replaced by NW category cards)
- `RecurringExpensesList` (covered by Subscriptions tab)

Existing finance components rebuilt:
- `StatementAnalyzer` — replace keyword-rules categorization with Claude API. Lives on a dedicated route `/finances/import` accessed via a button in the Cash Flow tab.

## Error handling

- Exchange rate API failure → fall back to 1.0 for all currencies, log a console warning, no toast (silent fallback so the page still works offline)
- Supabase migration failure → caught at write time, user sees an inline error on the form
- Auto-deduct collision (account doesn't exist anymore) → skip that sub, write a console warning, leave the subscription's `last_deducted_at` unchanged
- Network failure on writes → optimistic UI with rollback on error (existing pattern in the codebase)

## Testing

This is a personal dashboard — the existing repo has no automated tests. Verification will be manual:

1. Run the dev server, exercise each tab on desktop + iPhone
2. Add/edit/delete accounts in each NW category, verify chart + donut + activity log update
3. Add a subscription with a renewal in the past, verify auto-deduct fires once, doesn't double-charge on refresh
4. Add a business expense, verify it appears in Business tab but not in regular Cash Flow outflow list
5. Switch currencies, verify all amounts re-render correctly
6. Trigger the ticker urgency state by setting a renewal date to today

## Open questions / risks

- **Net worth history backfill:** When `nw_snapshots` is first created, there's no history. The line chart will show empty until the user makes their first edit. Acceptable for a personal app.
- **Existing subscription data:** If the live `subscriptions` table is missing the new columns, we add them with defaults; existing rows get `period='monthly'`, `auto_deduct=false`, no renewal date. User needs to fill those in to populate the ticker.
- **NW category for existing accounts:** All default to `'bank'`. User has to recategorize manually after the migration. Could add a one-shot UI hint on first load.
- **Anthropic API key required:** `ANTHROPIC_API_KEY` must be set in Vercel env vars + `.env.local`. Statement import will show a setup error if missing. Cost ~$0.25/year at one statement per month with Haiku 4.5.
