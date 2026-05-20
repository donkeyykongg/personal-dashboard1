# Rowan-style finance redesign + bottom tab bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the collapsible sidebar with a fixed bottom tab bar, rebuild `/finances` to a Rowan-finance.html-style layout (Net Worth, Subscriptions, Cash Flow, Business Expenses), and upgrade the StatementAnalyzer to use Claude API for parsing.

**Architecture:** Next.js 14 App Router with Server Components for data fetching, Client Components for interactivity. Supabase as backend. All amounts stored in CHF; client-side currency conversion via cached exchange rates. Auto-deduct logic runs on each `/finances` page load (no cron). Statement parsing goes through a Next.js API route that calls Claude Haiku 4.5.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase, Recharts (existing), `@anthropic-ai/sdk` (new), `lucide-react` (existing).

**Testing approach:** This codebase has no automated tests. Each task's "verify" step is manual (run dev server, exercise the feature in browser). Commit after each verified task.

**Reference:** [docs/superpowers/specs/2026-05-19-rowan-finance-redesign-design.md](../specs/2026-05-19-rowan-finance-redesign-design.md)

---

## Phase 1: Schema migrations

Establishes all data model changes. After this phase, the database is ready but no UI changes have shipped yet.

### Task 1.1: Add `nw_category` to financial_accounts

**Files:**
- Create: `supabase/migrations/20260519_add_nw_category_to_financial_accounts.sql`
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260519_add_nw_category_to_financial_accounts.sql
ALTER TABLE financial_accounts
  ADD COLUMN nw_category text NOT NULL DEFAULT 'bank'
  CHECK (nw_category IN ('bank', 'stocks', 'crypto', 'other'));

CREATE INDEX financial_accounts_nw_category_idx ON financial_accounts (nw_category);
```

- [ ] **Step 2: Apply migration via Supabase dashboard or CLI**

Run in Supabase SQL editor, OR if Supabase CLI is set up: `supabase db push`.
Expected: column added, no errors. Existing rows now have `nw_category = 'bank'`.

- [ ] **Step 3: Update TypeScript type**

Edit `lib/supabase/types.ts`:

```ts
export type NwCategory = "bank" | "stocks" | "crypto" | "other";

export type FinancialAccount = {
  id: string;
  name: string;
  kind: FinancialAccountKind;
  amount: number;
  interest_rate: number | null;
  min_payment: number | null;
  nw_category: NwCategory;
  created_at: string;
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260519_add_nw_category_to_financial_accounts.sql lib/supabase/types.ts
git commit -m "feat(db): add nw_category column to financial_accounts"
```

---

### Task 1.2: Add `is_business` to expenses

**Files:**
- Create: `supabase/migrations/20260519_add_is_business_to_expenses.sql`
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260519_add_is_business_to_expenses.sql
ALTER TABLE expenses ADD COLUMN is_business boolean NOT NULL DEFAULT false;
CREATE INDEX expenses_is_business_idx ON expenses (is_business) WHERE is_business = true;
```

- [ ] **Step 2: Apply migration**

Apply via Supabase SQL editor or CLI.
Expected: column added.

- [ ] **Step 3: Update FinanceEntry type**

Edit `lib/supabase/types.ts`, add `is_business` to `FinanceEntry`:

```ts
export type FinanceEntry = {
  id: string;
  user_id: string | null;
  amount: number;
  category: string;
  subcategory?: string | null;
  item?: string | null;
  date: string;
  notes: string | null;
  is_recurring?: boolean | null;
  recurring_interval?: "weekly" | "monthly" | "yearly" | null;
  next_due_date?: string | null;
  is_business?: boolean;
  created_at: string;
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260519_add_is_business_to_expenses.sql lib/supabase/types.ts
git commit -m "feat(db): add is_business flag to expenses"
```

---

### Task 1.3: Extend subscriptions with renewal + auto-deduct

**Files:**
- Create: `supabase/migrations/20260519_extend_subscriptions.sql`
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260519_extend_subscriptions.sql
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_renewal date;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS from_account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_deduct boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_deducted_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS entered_amount numeric;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS entered_currency text DEFAULT 'CHF';

-- Backfill next_renewal from billing_date (day-of-month integer)
UPDATE subscriptions
SET next_renewal = (
  CASE
    WHEN EXTRACT(DAY FROM CURRENT_DATE)::int <= billing_date
      THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, LEAST(billing_date, 28))
    ELSE (make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, LEAST(billing_date, 28)) + INTERVAL '1 month')::date
  END
)
WHERE next_renewal IS NULL AND billing_date IS NOT NULL;

CREATE INDEX subscriptions_next_renewal_idx ON subscriptions (next_renewal);
```

- [ ] **Step 2: Apply migration**

Expected: columns added, existing subs get `next_renewal` populated from their `billing_date`.

- [ ] **Step 3: Update Subscription type**

Edit `lib/supabase/types.ts`:

```ts
export type Subscription = {
  id: string;
  name: string;
  amount: number;
  billing_date: number;
  billing_cycle: BillingCycle;
  category: SubscriptionCategory;
  active: boolean;
  next_renewal: string | null;
  from_account_id: string | null;
  auto_deduct: boolean;
  last_deducted_at: string | null;
  entered_amount: number | null;
  entered_currency: string;
  created_at: string;
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors (but existing code reading `subscriptions` may need optional handling — that's fine, address per-file in later tasks).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260519_extend_subscriptions.sql lib/supabase/types.ts
git commit -m "feat(db): extend subscriptions with renewal date + auto-deduct"
```

---

### Task 1.4: Create `nw_activity` table

**Files:**
- Create: `supabase/migrations/20260519_create_nw_activity.sql`
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260519_create_nw_activity.sql
CREATE TABLE nw_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES financial_accounts(id) ON DELETE SET NULL,
  account_name text NOT NULL,
  nw_category text NOT NULL,
  delta_chf numeric NOT NULL,
  kind text NOT NULL CHECK (kind IN ('add', 'edit', 'delete')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nw_activity_created_at_idx ON nw_activity (created_at DESC);
```

- [ ] **Step 2: Apply migration**

- [ ] **Step 3: Add NwActivity type**

Append to `lib/supabase/types.ts`:

```ts
export type NwActivityKind = "add" | "edit" | "delete";

export type NwActivity = {
  id: string;
  account_id: string | null;
  account_name: string;
  nw_category: NwCategory;
  delta_chf: number;
  kind: NwActivityKind;
  created_at: string;
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260519_create_nw_activity.sql lib/supabase/types.ts
git commit -m "feat(db): add nw_activity table for net worth change log"
```

---

### Task 1.5: Create `nw_snapshots` table

**Files:**
- Create: `supabase/migrations/20260519_create_nw_snapshots.sql`
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260519_create_nw_snapshots.sql
CREATE TABLE nw_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_chf numeric NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nw_snapshots_captured_at_idx ON nw_snapshots (captured_at);
```

- [ ] **Step 2: Apply migration**

- [ ] **Step 3: Add NwSnapshot type**

Append to `lib/supabase/types.ts`:

```ts
export type NwSnapshot = {
  id: string;
  total_chf: number;
  captured_at: string;
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260519_create_nw_snapshots.sql lib/supabase/types.ts
git commit -m "feat(db): add nw_snapshots table for history chart"
```

---

## Phase 2: Bottom tab bar navigation

Replaces the sidebar with a fixed bottom tab bar across all pages. After this phase, the new nav works site-wide; the finance page redesign comes next.

### Task 2.1: Create `BottomTabBar` component

**Files:**
- Create: `components/layout/bottom-tab-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/layout/bottom-tab-bar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Wallet, KanbanSquare, StickyNote, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreSheet } from "./more-sheet";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
};

const tabs: Tab[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/finances", label: "Finances", icon: Wallet, matchPrefix: "/finances" },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/notes", label: "Notes", icon: StickyNote, matchPrefix: "/notes" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (tab: Tab) =>
    tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : pathname === tab.href;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-1 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(5,5,6,0.92) 30%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        aria-label="Primary navigation"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-3 right-3 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
          }}
        />
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex max-w-[140px] flex-1 flex-col items-center gap-0.5 rounded-xl border border-transparent px-3.5 py-2 transition-colors",
                active
                  ? "border-white/10 bg-white/[0.06] text-white"
                  : "text-[#76746E] hover:bg-white/[0.025] hover:text-[#B8B6B0]"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.10em]">
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex max-w-[140px] flex-1 flex-col items-center gap-0.5 rounded-xl border border-transparent px-3.5 py-2 text-[#76746E] transition-colors",
            "hover:bg-white/[0.025] hover:text-[#B8B6B0]"
          )}
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.10em]">More</span>
        </button>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: error about `MoreSheet` missing — that's fine, fixed in next task.

---

### Task 2.2: Create `MoreSheet` component

**Files:**
- Create: `components/layout/more-sheet.tsx`

- [ ] **Step 1: Check existing shadcn sheet primitive**

Run: `ls components/ui/sheet.tsx 2>/dev/null && echo "exists" || echo "missing"`
If missing, run: `npx shadcn-ui@latest add sheet`

- [ ] **Step 2: Create the MoreSheet component**

```tsx
// components/layout/more-sheet.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, NotebookPen, Timer, LogOut, TrendingUp, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const moreLinks = [
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/reflections", label: "Reflections", icon: NotebookPen },
  { href: "/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/cash-flow", label: "Cash flow (legacy)", icon: TrendingUp },
];

export function MoreSheet({ open, onOpenChange }: Props) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onOpenChange(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-white/10 bg-[#0A0A0B] text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#76746E]">
            More
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-2 pb-6">
          {moreLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 transition-colors hover:bg-white/[0.05]"
              >
                <Icon className="h-5 w-5 text-[#B8B6B0]" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-sm font-medium text-[#FF8A8A] transition-colors hover:bg-white/[0.05]"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/bottom-tab-bar.tsx components/layout/more-sheet.tsx components/ui/sheet.tsx
git commit -m "feat(nav): add BottomTabBar and MoreSheet components"
```

---

### Task 2.3: Wire BottomTabBar into root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace Sidebar with BottomTabBar**

Edit `app/layout.tsx` — full replacement:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { CommandPalette } from "@/components/layout/command-palette";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Dashboard",
  description: "Finances, subscriptions, notes, and posting schedule",
};

const themeFlashScript = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeFlashScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <main className="min-h-screen overflow-y-auto pb-24">
            <div className="mx-auto max-w-7xl px-6 py-10">{children}</div>
          </main>
          <CommandPalette />
          <BottomTabBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify dev server boots and nav works**

Run: `npm run dev`
Open http://localhost:3000/dashboard. Expected: dashboard renders, bottom tab bar visible, Home tab highlighted.
Click Finances → tab highlight moves, page navigates.
Click More → bottom sheet opens with Schedule, Reflections, Pomodoro, Cash flow (legacy), Log out.

- [ ] **Step 3: Verify no orphaned imports**

Run: `grep -r "SidebarStateProvider\|from \"@/components/layout/sidebar\"" --include="*.tsx" --include="*.ts" .`
Expected: only references inside `components/layout/sidebar.tsx` and `components/layout/sidebar-state.tsx` themselves (those files still exist but are unused). Any imports from `app/` should now be gone.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(nav): replace sidebar with bottom tab bar in root layout"
```

---

### Task 2.4: Delete unused sidebar files

**Files:**
- Delete: `components/layout/sidebar.tsx`
- Delete: `components/layout/sidebar-state.tsx`

- [ ] **Step 1: Verify nothing else imports them**

Run: `grep -rn "components/layout/sidebar" --include="*.tsx" --include="*.ts" . | grep -v node_modules | grep -v ".next/"`
Expected: zero results. If any results, fix those imports first.

- [ ] **Step 2: Delete the files**

```bash
rm components/layout/sidebar.tsx components/layout/sidebar-state.tsx
```

- [ ] **Step 3: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(nav): delete unused Sidebar and SidebarStateProvider"
```

---

## Phase 3: Finance page shell + shared utilities

Sets up the finance page skeleton, tab routing, exchange-rate hook, and shared lib functions. Each tab gets filled in by subsequent phases.

### Task 3.1: Create exchange-rates provider/hook

**Files:**
- Create: `lib/exchange-rates.tsx`

- [ ] **Step 1: Create the provider**

```tsx
// lib/exchange-rates.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Currency = "CHF" | "USD" | "EUR" | "GBP";

type Rates = Record<Currency, number>;

const DEFAULT_RATES: Rates = { CHF: 1, USD: 1, EUR: 1, GBP: 1 };

type ContextValue = {
  rates: Rates;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (chfAmount: number) => number;
  format: (chfAmount: number) => string;
};

const ExchangeRatesContext = createContext<ContextValue | null>(null);

const CURRENCY_KEY = "nw_currency";

export function ExchangeRatesProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [currency, setCurrencyState] = useState<Currency>("CHF");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(CURRENCY_KEY) : null;
    if (saved === "CHF" || saved === "USD" || saved === "EUR" || saved === "GBP") {
      setCurrencyState(saved);
    }
    let cancelled = false;
    fetch("https://open.er-api.com/v6/latest/CHF")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.rates) return;
        setRates({
          CHF: 1,
          USD: Number(data.rates.USD) || 1,
          EUR: Number(data.rates.EUR) || 1,
          GBP: Number(data.rates.GBP) || 1,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") window.localStorage.setItem(CURRENCY_KEY, c);
  };

  const convert = (chfAmount: number) => (Number(chfAmount) || 0) * (rates[currency] || 1);
  const format = (chfAmount: number) => {
    const num = convert(chfAmount);
    const fractionDigits = Math.abs(num % 1) < 0.005 ? 0 : 2;
    return `${currency} ${num.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <ExchangeRatesContext.Provider value={{ rates, currency, setCurrency, convert, format }}>
      {children}
    </ExchangeRatesContext.Provider>
  );
}

export function useExchangeRates() {
  const ctx = useContext(ExchangeRatesContext);
  if (!ctx) throw new Error("useExchangeRates must be used within ExchangeRatesProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/exchange-rates.tsx
git commit -m "feat(finances): add ExchangeRatesProvider with localStorage persistence"
```

---

### Task 3.2: Create net-worth lib helpers

**Files:**
- Create: `lib/finances/net-worth.ts`

- [ ] **Step 1: Create the helper module**

```ts
// lib/finances/net-worth.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FinancialAccount,
  NwActivity,
  NwActivityKind,
  NwCategory,
  NwSnapshot,
  Subscription,
} from "@/lib/supabase/types";

export type NetWorthData = {
  accounts: FinancialAccount[];
  activity: NwActivity[];
  snapshots: NwSnapshot[];
};

export async function getNetWorthData(supabase: SupabaseClient): Promise<NetWorthData> {
  const [accountsRes, activityRes, snapshotsRes] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("nw_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("nw_snapshots")
      .select("*")
      .order("captured_at", { ascending: true })
      .limit(500),
  ]);
  return {
    accounts: (accountsRes.data ?? []) as FinancialAccount[],
    activity: (activityRes.data ?? []) as NwActivity[],
    snapshots: (snapshotsRes.data ?? []) as NwSnapshot[],
  };
}

export function grandTotal(accounts: FinancialAccount[]): number {
  return accounts.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
}

export function totalByCategory(accounts: FinancialAccount[], category: NwCategory): number {
  return accounts
    .filter((a) => a.nw_category === category)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
}

export function monthlyEquivalentCHF(sub: Subscription): number {
  const amt = Number(sub.amount) || 0;
  switch (sub.billing_cycle) {
    case "weekly":
      return amt * 4.345;
    case "yearly":
      return amt / 12;
    case "monthly":
    default:
      return amt;
  }
}

export async function writeActivity(
  supabase: SupabaseClient,
  row: {
    account_id: string | null;
    account_name: string;
    nw_category: NwCategory;
    delta_chf: number;
    kind: NwActivityKind;
  }
): Promise<void> {
  await supabase.from("nw_activity").insert(row);
}

export async function maybeSnapshot(supabase: SupabaseClient, totalChf: number): Promise<void> {
  const { data } = await supabase
    .from("nw_snapshots")
    .select("total_chf")
    .order("captured_at", { ascending: false })
    .limit(1);
  const last = data?.[0]?.total_chf as number | undefined;
  if (last !== undefined && Math.abs(last - totalChf) < 0.005) return;
  await supabase.from("nw_snapshots").insert({ total_chf: totalChf });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/finances/net-worth.ts
git commit -m "feat(finances): add net worth lib helpers (totals, activity, snapshots)"
```

---

### Task 3.3: Create FinanceTabs component (URL-driven)

**Files:**
- Create: `components/finances/finance-tabs.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/finance-tabs.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "net-worth", label: "Net Worth" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "cash-flow", label: "Cash Flow" },
  { key: "business", label: "Business" },
] as const;

export type FinanceTabKey = (typeof TABS)[number]["key"];

export function FinanceTabs({ active }: { active: FinanceTabKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.025] p-1">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("tab", t.key);
              router.replace(`${pathname}?${next.toString()}`, { scroll: false });
            }}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.10em] transition-colors",
              isActive
                ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                : "text-[#76746E] hover:text-[#B8B6B0]"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function parseTab(searchParam: string | string[] | undefined): FinanceTabKey {
  const v = Array.isArray(searchParam) ? searchParam[0] : searchParam;
  if (v === "subscriptions" || v === "cash-flow" || v === "business") return v;
  return "net-worth";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/finance-tabs.tsx
git commit -m "feat(finances): add URL-driven FinanceTabs component"
```

---

### Task 3.4: Rebuild finances/page.tsx as a tabs shell

**Files:**
- Modify: `app/finances/page.tsx`

- [ ] **Step 1: Replace the page**

```tsx
// app/finances/page.tsx
import { createClient } from "@/lib/supabase/server";
import { ExchangeRatesProvider } from "@/lib/exchange-rates";
import { FinanceTabs, parseTab } from "@/components/finances/finance-tabs";

export const dynamic = "force-dynamic";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const active = parseTab(searchParams.tab);

  // Data fetching is deferred to each section component (added in later tasks).
  void supabase;

  return (
    <ExchangeRatesProvider>
      <div className="dash-hub space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Finances</h1>
          <p className="mt-1 text-sm text-[#76746E]">
            Net worth, subscriptions, cash flow, and business expenses.
          </p>
        </header>

        {/* Renewal ticker placeholder — filled by Phase 5 */}
        <div data-slot="renewal-ticker" />

        <FinanceTabs active={active} />

        {/* Section content — filled by Phase 4-7 */}
        {active === "net-worth" && <div data-slot="net-worth">Net Worth tab coming in Phase 4</div>}
        {active === "subscriptions" && <div data-slot="subscriptions">Subscriptions tab coming in Phase 5</div>}
        {active === "cash-flow" && <div data-slot="cash-flow">Cash Flow tab coming in Phase 6</div>}
        {active === "business" && <div data-slot="business">Business tab coming in Phase 7</div>}
      </div>
    </ExchangeRatesProvider>
  );
}
```

- [ ] **Step 2: Verify dev server boots**

Run: `npm run dev`
Open http://localhost:3000/finances. Expected: header + tabs render; clicking tabs updates URL `?tab=...` and the placeholder text changes.

- [ ] **Step 3: Commit**

```bash
git add app/finances/page.tsx
git commit -m "feat(finances): rebuild page as tabs shell (Net Worth default)"
```

---

## Phase 4: Net Worth tab

The biggest section. Built component-by-component so each piece is committable.

### Task 4.1: NetWorthHeader component

**Files:**
- Create: `components/finances/net-worth/net-worth-header.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/net-worth/net-worth-header.tsx
"use client";

import { useExchangeRates, type Currency } from "@/lib/exchange-rates";
import type { FinancialAccount, NwCategory } from "@/lib/supabase/types";
import { grandTotal, totalByCategory } from "@/lib/finances/net-worth";

const CATEGORIES: { key: NwCategory; label: string }[] = [
  { key: "bank", label: "Bank" },
  { key: "stocks", label: "Stocks" },
  { key: "crypto", label: "Crypto" },
  { key: "other", label: "Other" },
];

export function NetWorthHeader({ accounts }: { accounts: FinancialAccount[] }) {
  const { currency, setCurrency, format } = useExchangeRates();
  const total = grandTotal(accounts);
  const breakdown = CATEGORIES.filter((c) => totalByCategory(accounts, c.key) > 0)
    .map((c) => `${c.label}: ${format(totalByCategory(accounts, c.key))}`)
    .join("  •  ");

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
          Total net worth
        </div>
        <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
          {format(total)}
        </div>
        {breakdown && <div className="mt-1 text-[11px] text-[#76746E]">{breakdown}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#76746E]">{currency}</span>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white"
        >
          <option value="CHF">CHF</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/net-worth/net-worth-header.tsx
git commit -m "feat(finances): add NetWorthHeader with currency switcher"
```

---

### Task 4.2: CategoryCard component (inline add/edit/delete)

**Files:**
- Create: `components/finances/net-worth/category-card.tsx`
- Create: `app/finances/actions.ts`

- [ ] **Step 1: Create server actions**

```ts
// app/finances/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NwCategory } from "@/lib/supabase/types";
import { writeActivity, maybeSnapshot, grandTotal } from "@/lib/finances/net-worth";

async function refreshSnapshot() {
  const supabase = createClient();
  const { data } = await supabase.from("financial_accounts").select("amount");
  const total = grandTotal((data ?? []) as { amount: number }[] as any);
  await maybeSnapshot(supabase, total);
}

export async function addAccount(input: {
  name: string;
  amount_chf: number;
  nw_category: NwCategory;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_accounts")
    .insert({
      name: input.name,
      amount: input.amount_chf,
      nw_category: input.nw_category,
      kind: "asset",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await writeActivity(supabase, {
    account_id: data.id,
    account_name: data.name,
    nw_category: input.nw_category,
    delta_chf: input.amount_chf,
    kind: "add",
  });
  await refreshSnapshot();
  revalidatePath("/finances");
}

export async function updateAccount(input: {
  id: string;
  name?: string;
  amount_chf?: number;
}) {
  const supabase = createClient();
  const { data: existing, error: readErr } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("id", input.id)
    .single();
  if (readErr || !existing) throw new Error(readErr?.message ?? "Account not found");

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.amount_chf !== undefined) patch.amount = input.amount_chf;

  const { error } = await supabase.from("financial_accounts").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);

  if (input.amount_chf !== undefined) {
    const delta = input.amount_chf - Number(existing.amount);
    if (Math.abs(delta) > 0.005) {
      await writeActivity(supabase, {
        account_id: existing.id,
        account_name: input.name ?? existing.name,
        nw_category: existing.nw_category,
        delta_chf: delta,
        kind: "edit",
      });
    }
  }
  await refreshSnapshot();
  revalidatePath("/finances");
}

export async function deleteAccount(id: string) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("id", id)
    .single();
  if (existing) {
    await writeActivity(supabase, {
      account_id: null,
      account_name: existing.name,
      nw_category: existing.nw_category,
      delta_chf: -(Number(existing.amount) || 0),
      kind: "delete",
    });
  }
  const { error } = await supabase.from("financial_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await refreshSnapshot();
  revalidatePath("/finances");
}
```

- [ ] **Step 2: Create the CategoryCard component**

```tsx
// components/finances/net-worth/category-card.tsx
"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinancialAccount, NwCategory } from "@/lib/supabase/types";
import { totalByCategory } from "@/lib/finances/net-worth";
import { addAccount, updateAccount, deleteAccount } from "@/app/finances/actions";

const META: Record<NwCategory, { label: string; emoji: string }> = {
  bank: { label: "Bank accounts", emoji: "🏦" },
  stocks: { label: "Stocks / Investments", emoji: "📈" },
  crypto: { label: "Crypto", emoji: "🪙" },
  other: { label: "Other assets", emoji: "💼" },
};

export function CategoryCard({
  category,
  accounts,
}: {
  category: NwCategory;
  accounts: FinancialAccount[];
}) {
  const { format, convert, rates, currency } = useExchangeRates();
  const filtered = accounts.filter((a) => a.nw_category === category);
  const total = totalByCategory(accounts, category);
  const meta = META[category];
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const n = name.trim();
    const a = parseFloat(amount);
    if (!n || isNaN(a)) return;
    setPending(true);
    try {
      // Input amount is in DISPLAY currency; convert to CHF for storage.
      const rate = rates[currency] || 1;
      await addAccount({ name: n, amount_chf: a / rate, nw_category: category });
      setName("");
      setAmount("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-white/5 bg-white/[0.025] p-5"
      style={{ backdropFilter: "blur(24px) saturate(1.2)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#76746E]">
          {meta.emoji} {meta.label}
        </span>
        <span className="text-xs font-semibold text-white">{format(total)}</span>
      </div>

      <ul className="space-y-1.5 text-sm">
        {filtered.map((a) => (
          <CategoryRow key={a.id} account={a} />
        ))}
        {filtered.length === 0 && (
          <li className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
            No accounts yet
          </li>
        )}
      </ul>

      <div className="mt-3 flex gap-1.5 rounded-xl bg-black/30 p-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Account name"
          className="flex-1 bg-transparent px-2.5 py-2 text-sm text-white outline-none placeholder:text-[#76746E]"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Amount"
          step="0.01"
          className="w-24 bg-transparent px-2.5 py-2 text-right text-sm text-white outline-none placeholder:text-[#76746E]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="rounded-lg bg-white/[0.06] px-3 text-sm font-bold text-white hover:bg-white/[0.12] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CategoryRow({ account }: { account: FinancialAccount }) {
  const { format, convert, rates, currency } = useExchangeRates();
  const [editing, setEditing] = useState<"name" | "amount" | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  async function saveName() {
    const v = draft.trim();
    setEditing(null);
    if (!v || v === account.name) return;
    setPending(true);
    try {
      await updateAccount({ id: account.id, name: v });
    } finally {
      setPending(false);
    }
  }

  async function saveAmount() {
    const rate = rates[currency] || 1;
    setEditing(null);
    const v = draft.trim();
    if (!v) return;
    const curDisplay = convert(Number(account.amount));
    let nextDisplay = curDisplay;
    if (/^[+\-]\s*\d/.test(v)) {
      const delta = parseFloat(v.replace(/\s+/g, ""));
      if (!isNaN(delta)) nextDisplay = curDisplay + delta;
    } else {
      const n = parseFloat(v);
      if (!isNaN(n)) nextDisplay = n;
    }
    if (nextDisplay < 0) nextDisplay = 0;
    setPending(true);
    try {
      await updateAccount({ id: account.id, amount_chf: nextDisplay / rate });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      await deleteAccount(account.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 py-1">
      {editing === "name" ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName();
            else if (e.key === "Escape") setEditing(null);
          }}
          onBlur={saveName}
          className="flex-1 rounded-md bg-black/30 px-2 py-1 text-sm text-white outline-none"
        />
      ) : (
        <span
          className="flex-1 cursor-pointer truncate text-white hover:bg-white/[0.06] rounded px-1 py-0.5 -mx-1"
          onClick={() => {
            setDraft(account.name);
            setEditing("name");
          }}
        >
          {account.name}
        </span>
      )}
      {editing === "amount" ? (
        <input
          autoFocus
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveAmount();
            else if (e.key === "Escape") setEditing(null);
          }}
          onBlur={saveAmount}
          className="w-28 rounded-md bg-black/30 px-2 py-1 text-right text-xs font-mono text-white outline-none"
        />
      ) : (
        <span
          className="cursor-pointer font-mono text-xs font-semibold text-white hover:bg-white/[0.06] rounded px-1 py-0.5 -mx-1"
          title="Click to edit · type +500 to add or -200 to subtract"
          onClick={() => {
            setDraft(convert(Number(account.amount)).toFixed(2));
            setEditing("amount");
          }}
        >
          {format(Number(account.amount))}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded p-1 text-[#76746E] hover:bg-white/[0.06] hover:text-[#FF8A8A] disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add components/finances/net-worth/category-card.tsx app/finances/actions.ts
git commit -m "feat(finances): add CategoryCard with inline add/edit/delete + server actions"
```

---

### Task 4.3: NetWorthLineChart component

**Files:**
- Create: `components/finances/net-worth/net-worth-line-chart.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/net-worth/net-worth-line-chart.tsx
"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { NwSnapshot } from "@/lib/supabase/types";

type Point = { x: number; y: number };

function smoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  const d = [`M${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`);
  }
  return d.join(" ");
}

export function NetWorthLineChart({ snapshots }: { snapshots: NwSnapshot[] }) {
  const { format } = useExchangeRates();
  const W = 600;
  const H = 200;
  const PAD = 8;

  const { lineD, areaD, color, deltaLabel, stats } = useMemo(() => {
    if (snapshots.length === 0) {
      return { lineD: "", areaD: "", color: "#76746E", deltaLabel: "—", stats: null };
    }
    const vals = snapshots.map((s) => Number(s.total_chf));
    const first = vals[0];
    const last = vals[vals.length - 1];
    const change = last - first;
    const direction = Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down";
    const color = direction === "up" ? "#6BE3A4" : direction === "down" ? "#FF8A8A" : "#76746E";

    let deltaLabel = "Flat";
    if (direction !== "flat") {
      if (Math.abs(first) < 0.5) {
        deltaLabel = `${change > 0 ? "+" : "−"}${format(Math.abs(change))}`;
      } else {
        const pct = (change / Math.abs(first)) * 100;
        const abs = Math.abs(pct);
        const pctStr = abs >= 100 ? abs.toFixed(0) : abs >= 10 ? abs.toFixed(1) : abs.toFixed(2);
        deltaLabel = `${change > 0 ? "+" : "−"}${pctStr}%`;
      }
    }

    const high = Math.max(...vals);
    const low = Math.min(...vals);
    const stats = {
      onePct: last / 100,
      high,
      low,
      count: snapshots.length,
    };

    if (snapshots.length === 1) {
      const y = H / 2;
      return {
        lineD: `M0,${y} L${W},${y}`,
        areaD: `M0,${y} L${W},${y} L${W},${H} L0,${H} Z`,
        color,
        deltaLabel,
        stats,
      };
    }

    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || Math.max(1, Math.abs(maxV));
    const points: Point[] = snapshots.map((s, i) => ({
      x: (i / (snapshots.length - 1)) * W,
      y: H - PAD - ((Number(s.total_chf) - minV) / range) * (H - PAD * 2),
    }));
    const lineD = smoothPath(points);
    const lastPt = points[points.length - 1];
    const firstPt = points[0];
    return {
      lineD,
      areaD: `${lineD} L${lastPt.x},${H} L${firstPt.x},${H} Z`,
      color,
      deltaLabel,
      stats,
    };
  }, [snapshots, format]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em]">
        <span className="text-[#76746E]">All-time</span>
        <span style={{ color }}>{deltaLabel}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[200px] w-full overflow-visible"
        style={{ color }}
        aria-hidden
      >
        <defs>
          <linearGradient id="nwChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={W} y1="40" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <line x1="0" x2={W} y1="100" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <line x1="0" x2={W} y1="160" y2="160" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <path d={areaD} fill="url(#nwChartGrad)" />
        <path
          d={lineD}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
        />
      </svg>

      {stats ? (
        <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/5 pt-3 sm:grid-cols-4">
          <Stat label="1% =" value={format(stats.onePct)} />
          <Stat label="All-time high" value={format(stats.high)} />
          <Stat label="All-time low" value={format(stats.low)} />
          <Stat label="Snapshots" value={String(stats.count)} />
        </div>
      ) : (
        <div className="mt-3 text-center text-[11px] italic text-[#76746E]">
          Add or edit an account to start tracking your net worth over time.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-1.5 py-1">
      <div className="font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        {label}
      </div>
      <div className="truncate font-mono text-xs font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/net-worth/net-worth-line-chart.tsx
git commit -m "feat(finances): add NetWorthLineChart with smooth path and stats"
```

---

### Task 4.4: AllocationDonut component

**Files:**
- Create: `components/finances/net-worth/allocation-donut.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/net-worth/allocation-donut.tsx
"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinancialAccount, Subscription } from "@/lib/supabase/types";
import { monthlyEquivalentCHF } from "@/lib/finances/net-worth";

const CAT_COLOR: Record<string, string> = {
  bank: "#7DD3FC",
  stocks: "#6EE7B7",
  crypto: "#FBBF24",
  other: "#B794F4",
  subs: "#FF8A8A",
};

type Slice = { key: string; name: string; color: string; value: number };

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a1: number, a2: number) {
  const x1o = cx + rOuter * Math.cos(a1);
  const y1o = cy + rOuter * Math.sin(a1);
  const x2o = cx + rOuter * Math.cos(a2);
  const y2o = cy + rOuter * Math.sin(a2);
  const x1i = cx + rInner * Math.cos(a2);
  const y1i = cy + rInner * Math.sin(a2);
  const x2i = cx + rInner * Math.cos(a1);
  const y2i = cy + rInner * Math.sin(a1);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${x1o.toFixed(2)} ${y1o.toFixed(2)} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o.toFixed(
    2
  )} ${y2o.toFixed(2)} L ${x1i.toFixed(2)} ${y1i.toFixed(2)} A ${rInner} ${rInner} 0 ${large} 0 ${x2i.toFixed(
    2
  )} ${y2i.toFixed(2)} Z`;
}

export function AllocationDonut({
  accounts,
  subscriptions,
}: {
  accounts: FinancialAccount[];
  subscriptions: Subscription[];
}) {
  const { format } = useExchangeRates();

  const slices = useMemo<Slice[]>(() => {
    const out: Slice[] = [];
    accounts.forEach((a, i) => {
      const v = Number(a.amount) || 0;
      if (v > 0) {
        out.push({
          key: `${a.nw_category}::${i}`,
          name: a.name,
          color: CAT_COLOR[a.nw_category] || "#FFFFFF",
          value: v,
        });
      }
    });
    const annualSubs = subscriptions
      .filter((s) => s.active)
      .reduce((sum, s) => sum + monthlyEquivalentCHF(s) * 12, 0);
    if (annualSubs > 0) {
      out.push({ key: "subs", name: "Subs/yr", color: CAT_COLOR.subs, value: annualSubs });
    }
    return out.sort((a, b) => b.value - a.value);
  }, [accounts, subscriptions]);

  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="relative flex flex-col rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>Allocation</span>
        <span>
          {slices.length} slice{slices.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="relative mx-auto my-1.5 h-[140px] w-[140px]">
        <svg viewBox="0 0 140 140" className="block h-[140px] w-[140px] -rotate-90" aria-hidden>
          {total > 0 ? (
            (() => {
              let angle = -Math.PI / 2;
              return slices.map((s) => {
                const sliceAngle = (s.value / total) * Math.PI * 2;
                const pad = slices.length > 1 ? 0.015 : 0;
                const a1 = angle + pad;
                const a2 = angle + sliceAngle - pad;
                angle += sliceAngle;
                if (a2 <= a1) return null;
                return <path key={s.key} d={arcPath(70, 70, 60, 44, a1, a2)} fill={s.color} />;
              });
            })()
          ) : (
            <>
              <circle cx="70" cy="70" r="60" fill="rgba(255,255,255,0.025)" />
              <circle cx="70" cy="70" r="44" fill="#0A0A0B" />
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-base font-bold leading-none text-white">
            {total > 0 ? format(total).split(" ")[1] || format(total) : "—"}
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#76746E]">
            total
          </div>
        </div>
      </div>

      {slices.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1">
          {slices.map((s) => {
            const pct = ((s.value / total) * 100).toFixed(1);
            return (
              <div
                key={s.key}
                className="grid grid-cols-[8px_1fr_auto] items-center gap-2 rounded-md px-1.5 py-1 text-[11px] tabular-nums"
                style={{ color: s.color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                />
                <span className="text-[#B8B6B0]">{s.name}</span>
                <span className="font-mono text-[10.5px] font-bold text-white">{pct}%</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-2 text-center text-[11px] italic text-[#76746E]">
          Add an account to see your breakdown
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/net-worth/allocation-donut.tsx
git commit -m "feat(finances): add AllocationDonut with per-account slices + subs"
```

---

### Task 4.5: ActivityLog component

**Files:**
- Create: `components/finances/net-worth/activity-log.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/net-worth/activity-log.tsx
"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { NwActivity } from "@/lib/supabase/types";

const CAT_COLOR: Record<string, string> = {
  bank: "#7DD3FC",
  stocks: "#6EE7B7",
  crypto: "#FBBF24",
  other: "#B794F4",
};
const CAT_LABEL: Record<string, string> = {
  bank: "Bank",
  stocks: "Stocks",
  crypto: "Crypto",
  other: "Other",
};

function fmtRelative(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86_400_000;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (day === today) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (day === yesterday) return "yest";
  const mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${mons[d.getMonth()]} ${d.getDate()}`;
}

export function ActivityLog({ activity }: { activity: NwActivity[] }) {
  const { format } = useExchangeRates();
  const rows = activity.slice(0, 30);

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2.5 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>Recent activity</span>
        <span>
          {activity.length} event{activity.length === 1 ? "" : "s"}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="py-3 text-center text-[11px] italic text-[#76746E]">
          No activity yet — add your first account.
        </div>
      ) : (
        <ul className="max-h-[156px] space-y-1.5 overflow-y-auto">
          {rows.map((e) => {
            const color = CAT_COLOR[e.nw_category] || "#FFFFFF";
            const isUp = Number(e.delta_chf) >= 0;
            const sign = isUp ? "+" : "−";
            return (
              <li
                key={e.id}
                className="grid grid-cols-[4px_1fr_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px] transition-colors hover:bg-white/[0.05]"
                style={{ color }}
              >
                <span
                  className="h-6 w-1 rounded-sm"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-white">
                    {e.account_name || "(unnamed)"}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-[#76746E]">
                    {CAT_LABEL[e.nw_category] || e.nw_category} · {e.kind.toUpperCase()}
                  </div>
                </div>
                <span
                  className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums"
                  style={{ color: isUp ? "#6BE3A4" : "#FF8A8A" }}
                >
                  {sign}
                  {format(Math.abs(Number(e.delta_chf)))}
                </span>
                <span className="whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[#76746E]">
                  {fmtRelative(e.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/net-worth/activity-log.tsx
git commit -m "feat(finances): add ActivityLog with category color bars"
```

---

### Task 4.6: NetWorthSection orchestrator + wire into page

**Files:**
- Create: `components/finances/net-worth/net-worth-section.tsx`
- Modify: `app/finances/page.tsx`

- [ ] **Step 1: Create the section**

```tsx
// components/finances/net-worth/net-worth-section.tsx
"use client";

import type { FinancialAccount, NwActivity, NwSnapshot, Subscription } from "@/lib/supabase/types";
import { NetWorthHeader } from "./net-worth-header";
import { CategoryCard } from "./category-card";
import { NetWorthLineChart } from "./net-worth-line-chart";
import { AllocationDonut } from "./allocation-donut";
import { ActivityLog } from "./activity-log";

export function NetWorthSection({
  accounts,
  activity,
  snapshots,
  subscriptions,
}: {
  accounts: FinancialAccount[];
  activity: NwActivity[];
  snapshots: NwSnapshot[];
  subscriptions: Subscription[];
}) {
  return (
    <div className="space-y-4">
      <NetWorthHeader accounts={accounts} />

      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <NetWorthLineChart snapshots={snapshots} />
        <AllocationDonut accounts={accounts} subscriptions={subscriptions} />
      </div>

      <ActivityLog activity={activity} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CategoryCard category="bank" accounts={accounts} />
        <CategoryCard category="stocks" accounts={accounts} />
        <CategoryCard category="crypto" accounts={accounts} />
        <CategoryCard category="other" accounts={accounts} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into app/finances/page.tsx**

Update `app/finances/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ExchangeRatesProvider } from "@/lib/exchange-rates";
import { FinanceTabs, parseTab } from "@/components/finances/finance-tabs";
import { NetWorthSection } from "@/components/finances/net-worth/net-worth-section";
import { getNetWorthData } from "@/lib/finances/net-worth";
import type { Subscription } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const active = parseTab(searchParams.tab);

  const [nwData, subsRes] = await Promise.all([
    getNetWorthData(supabase),
    supabase.from("subscriptions").select("*"),
  ]);
  const subscriptions = (subsRes.data ?? []) as Subscription[];

  return (
    <ExchangeRatesProvider>
      <div className="dash-hub space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Finances</h1>
          <p className="mt-1 text-sm text-[#76746E]">
            Net worth, subscriptions, cash flow, and business expenses.
          </p>
        </header>

        <div data-slot="renewal-ticker" />

        <FinanceTabs active={active} />

        {active === "net-worth" && (
          <NetWorthSection
            accounts={nwData.accounts}
            activity={nwData.activity}
            snapshots={nwData.snapshots}
            subscriptions={subscriptions}
          />
        )}
        {active === "subscriptions" && (
          <div data-slot="subscriptions">Subscriptions tab coming in Phase 5</div>
        )}
        {active === "cash-flow" && (
          <div data-slot="cash-flow">Cash Flow tab coming in Phase 6</div>
        )}
        {active === "business" && <div data-slot="business">Business tab coming in Phase 7</div>}
      </div>
    </ExchangeRatesProvider>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`
Open http://localhost:3000/finances. Expected:
- Header with total net worth + currency switcher
- Line chart (empty state if no snapshots, message about adding accounts)
- Donut chart (empty state if no accounts)
- Activity log (empty state if no activity)
- 2×2 grid of category cards (Bank, Stocks, Crypto, Other)
- Add an account in Bank: it appears in the list, donut updates, activity log shows new row, total updates
- Click amount: inline edit field appears; type a new value, press Enter → saves and reflects in donut + activity log
- Click name: inline rename works
- Click trash: account deleted, activity log shows delete row
- Switch currency: all amounts re-format

- [ ] **Step 4: Commit**

```bash
git add components/finances/net-worth/net-worth-section.tsx app/finances/page.tsx
git commit -m "feat(finances): wire Net Worth section into finances page"
```

---

## Phase 5: Subscriptions tab + renewal ticker

### Task 5.1: RenewalTicker component

**Files:**
- Create: `components/finances/renewal-ticker.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/renewal-ticker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { Subscription } from "@/lib/supabase/types";

type Entry = { name: string; amount: number; days: number; period: string };

function nextRenewalDate(iso: string, period: string): Date | null {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso;
  let d = new Date(safe);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let safety = 0;
  while (d < today && safety++ < 600) {
    if (period === "weekly") d.setDate(d.getDate() + 7);
    else if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function RenewalTicker({ subscriptions }: { subscriptions: Subscription[] }) {
  const { format } = useExchangeRates();

  const entries = useMemo<Entry[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: Entry[] = [];
    subscriptions.forEach((s) => {
      if (!s.active || !s.next_renewal) return;
      const next = nextRenewalDate(s.next_renewal, s.billing_cycle);
      if (!next) return;
      const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
      out.push({ name: s.name, amount: Number(s.amount) || 0, days, period: s.billing_cycle });
    });
    return out.sort((a, b) => a.days - b.days);
  }, [subscriptions]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (entries.length <= 1) return;
    const interval = setInterval(() => setIdx((i) => (i + 1) % entries.length), 5000);
    return () => clearInterval(interval);
  }, [entries.length]);

  if (entries.length === 0) return null;
  const current = entries[idx] || entries[0];
  const urgent = current.days <= 5;

  const daysLabel =
    current.days < 0
      ? `${Math.abs(current.days)}d late`
      : current.days === 0
      ? "TODAY"
      : current.days === 1
      ? "TOMORROW"
      : `in ${current.days}d`;

  return (
    <div
      className={`relative flex min-h-[38px] items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 font-mono text-xs transition-colors ${
        urgent
          ? "animate-pulse border-[#FF8A8A]/30 bg-gradient-to-r from-[#FF8A8A]/10 to-[#FF8A8A]/[0.04]"
          : "border-[#6EE7B7]/14 bg-gradient-to-r from-[#6EE7B7]/[0.06] to-[#7DD3FC]/[0.04]"
      }`}
    >
      <span
        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.18em] ${
          urgent ? "bg-[#FF8A8A]/10 text-[#FF8A8A]" : "bg-black/30 text-[#76746E]"
        }`}
      >
        Renews
      </span>
      <div className="relative h-[18px] flex-1 overflow-hidden">
        <div className="flex items-center gap-3 whitespace-nowrap text-[#B8B6B0]">
          <span className="font-bold uppercase tracking-[0.04em] text-white">{current.name}</span>
          <span className={`font-bold ${urgent ? "text-[#FF8A8A]" : "text-[#6BE3A4]"}`}>
            {format(current.amount)}
          </span>
          <span
            className={`text-[11px] uppercase tracking-[0.06em] ${
              urgent ? "font-bold text-[#FF8A8A]" : "text-[#76746E]"
            }`}
          >
            {daysLabel}
          </span>
        </div>
      </div>
      {entries.length > 1 && (
        <div className="flex flex-shrink-0 gap-1">
          {entries.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors"
              style={{
                background:
                  i === idx
                    ? urgent
                      ? "#FF8A8A"
                      : "#6BE3A4"
                    : "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/renewal-ticker.tsx
git commit -m "feat(finances): add scrolling RenewalTicker with urgency state"
```

---

### Task 5.2: Subscription server actions + auto-deduct

**Files:**
- Modify: `app/finances/actions.ts`

- [ ] **Step 1: Add subscription actions and processAutoDeduct**

Append to `app/finances/actions.ts`:

```ts
import type { Subscription, BillingCycle } from "@/lib/supabase/types";

function rollNextRenewal(iso: string, cycle: BillingCycle): string {
  const d = new Date(`${iso}T00:00`);
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function addSubscription(input: {
  name: string;
  amount_chf: number;
  entered_amount: number;
  entered_currency: string;
  billing_cycle: BillingCycle;
  next_renewal: string | null;
  from_account_id: string | null;
  auto_deduct: boolean;
}) {
  const supabase = createClient();
  // billing_date keeps day-of-month for legacy compatibility
  let billing_date = 1;
  if (input.next_renewal) {
    const d = new Date(`${input.next_renewal}T00:00`);
    billing_date = d.getDate();
  }
  const { error } = await supabase.from("subscriptions").insert({
    name: input.name,
    amount: input.amount_chf,
    billing_date,
    billing_cycle: input.billing_cycle,
    category: "personal",
    active: true,
    next_renewal: input.next_renewal,
    from_account_id: input.from_account_id,
    auto_deduct: input.auto_deduct,
    entered_amount: input.entered_amount,
    entered_currency: input.entered_currency,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}

export async function updateSubscription(input: {
  id: string;
  name?: string;
  amount_chf?: number;
  entered_amount?: number;
  entered_currency?: string;
  billing_cycle?: BillingCycle;
  next_renewal?: string | null;
  from_account_id?: string | null;
  auto_deduct?: boolean;
}) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.amount_chf !== undefined) patch.amount = input.amount_chf;
  if (input.entered_amount !== undefined) patch.entered_amount = input.entered_amount;
  if (input.entered_currency !== undefined) patch.entered_currency = input.entered_currency;
  if (input.billing_cycle !== undefined) patch.billing_cycle = input.billing_cycle;
  if (input.next_renewal !== undefined) patch.next_renewal = input.next_renewal;
  if (input.from_account_id !== undefined) patch.from_account_id = input.from_account_id;
  if (input.auto_deduct !== undefined) patch.auto_deduct = input.auto_deduct;
  const { error } = await supabase.from("subscriptions").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}

export async function deleteSubscription(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}

export async function processAutoDeductSubs(): Promise<{ deducted: number }> {
  const supabase = createClient();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("active", true)
    .eq("auto_deduct", true);
  if (!subs || subs.length === 0) return { deducted: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let deducted = 0;

  for (const sub of subs as Subscription[]) {
    if (!sub.next_renewal || !sub.from_account_id) continue;
    let renewal = new Date(`${sub.next_renewal}T00:00`);
    let lastRenewalMs = renewal.getTime();
    let safety = 0;

    while (renewal.getTime() <= today.getTime() && safety++ < 200) {
      const renewalMs = renewal.getTime();
      const alreadyDeducted = sub.last_deducted_at && new Date(sub.last_deducted_at).getTime() >= renewalMs;
      if (!alreadyDeducted) {
        const { data: acct } = await supabase
          .from("financial_accounts")
          .select("*")
          .eq("id", sub.from_account_id)
          .single();
        if (!acct) break;
        const newAmount = (Number(acct.amount) || 0) - (Number(sub.amount) || 0);
        await supabase.from("financial_accounts").update({ amount: newAmount }).eq("id", acct.id);
        await writeActivity(supabase, {
          account_id: acct.id,
          account_name: acct.name,
          nw_category: acct.nw_category,
          delta_chf: -(Number(sub.amount) || 0),
          kind: "edit",
        });
        deducted++;
        sub.last_deducted_at = new Date().toISOString();
      }
      lastRenewalMs = renewalMs;
      const nextIso = rollNextRenewal(
        `${renewal.getFullYear()}-${String(renewal.getMonth() + 1).padStart(2, "0")}-${String(renewal.getDate()).padStart(2, "0")}`,
        sub.billing_cycle
      );
      renewal = new Date(`${nextIso}T00:00`);
      sub.next_renewal = nextIso;
    }

    await supabase
      .from("subscriptions")
      .update({
        next_renewal: sub.next_renewal,
        last_deducted_at: sub.last_deducted_at,
      })
      .eq("id", sub.id);
  }

  if (deducted > 0) {
    const { data: accts } = await supabase.from("financial_accounts").select("amount");
    const total = (accts ?? []).reduce(
      (s: number, a: { amount: number }) => s + (Number(a.amount) || 0),
      0
    );
    await maybeSnapshot(supabase, total);
    revalidatePath("/finances");
  }
  return { deducted };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/finances/actions.ts
git commit -m "feat(finances): add subscription actions + auto-deduct processor"
```

---

### Task 5.3: SubscriptionRow component

**Files:**
- Create: `components/finances/subscriptions/subscription-row.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/subscriptions/subscription-row.tsx
"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinancialAccount, Subscription } from "@/lib/supabase/types";
import { monthlyEquivalentCHF } from "@/lib/finances/net-worth";
import { updateSubscription, deleteSubscription } from "@/app/finances/actions";

function fmtRenewal(iso: string | null): { label: string; daysLeft: number | null } {
  if (!iso) return { label: "", daysLeft: null };
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso;
  const d = new Date(safe);
  if (isNaN(d.getTime())) return { label: iso, daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  let prefix = "";
  if (diff < 0) prefix = "past · ";
  else if (diff === 0) prefix = "today · ";
  else if (diff === 1) prefix = "tomorrow · ";
  else if (diff <= 7) prefix = `in ${diff}d · `;
  return { label: `${prefix}${date}`, daysLeft: diff };
}

export function SubscriptionRow({
  sub,
  accounts,
}: {
  sub: Subscription;
  accounts: FinancialAccount[];
}) {
  const { format } = useExchangeRates();
  const monthly = monthlyEquivalentCHF(sub);
  const renewal = fmtRenewal(sub.next_renewal);
  const urgent = renewal.daysLeft != null && renewal.daysLeft <= 5;
  const linked = accounts.find((a) => a.id === sub.from_account_id);
  const [pending, setPending] = useState(false);

  async function toggleAuto() {
    if (!sub.auto_deduct && !sub.from_account_id) {
      alert('Pick a "From account" first (use the ✎ button) so auto-deduct knows where to take the money from.');
      return;
    }
    setPending(true);
    try {
      await updateSubscription({ id: sub.id, auto_deduct: !sub.auto_deduct });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${sub.name}"?`)) return;
    setPending(true);
    try {
      await deleteSubscription(sub.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl p-3.5 transition-colors ${
        urgent
          ? "animate-pulse border border-[#FF8A8A]/30 bg-gradient-to-br from-[#FF8A8A]/14 to-[#FF8A8A]/[0.06]"
          : "bg-white/[0.025]"
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{sub.name}</div>
        <div className="mt-0.5 text-[11px] capitalize text-[#76746E]">{sub.billing_cycle}</div>
        {renewal.label && (
          <div
            className={`mt-1 text-[10px] ${urgent ? "font-bold text-[#FF8A8A]" : "text-[#F2C063]"}`}
          >
            ↻ Renews {renewal.label}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {linked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-[#BFE3F8]">
              from · {linked.name}
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={toggleAuto}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] ${
              sub.auto_deduct
                ? "border-[#6BE3A4]/30 bg-[#6BE3A4]/10 text-[#6BE3A4]"
                : "border-white/8 bg-white/[0.04] text-[#76746E]"
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: sub.auto_deduct ? "#6BE3A4" : "rgba(255,255,255,0.25)",
                boxShadow: sub.auto_deduct ? "0 0 6px rgba(107,227,164,0.7)" : "none",
              }}
            />
            {sub.auto_deduct ? "Auto-deduct ON" : "Auto-deduct off"}
          </button>
        </div>
      </div>

      <div className="text-right leading-tight">
        <div className="text-xl font-bold tabular-nums text-white">{format(monthly)}</div>
        <div className="mt-0.5 text-[10px] text-[#76746E]">/ month</div>
        {sub.entered_currency !== "CHF" && sub.entered_amount != null && (
          <div className="mt-0.5 text-[10px] text-[#76746E]">
            billed {sub.entered_currency} {sub.entered_amount.toFixed(2)} / {sub.billing_cycle}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="rounded border border-white/10 p-1 text-[#76746E] hover:text-[#FF8A8A]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/subscriptions/subscription-row.tsx
git commit -m "feat(finances): add SubscriptionRow with auto-deduct toggle"
```

---

### Task 5.4: SubscriptionAddForm component

**Files:**
- Create: `components/finances/subscriptions/subscription-add-form.tsx`

- [ ] **Step 1: Create the form**

```tsx
// components/finances/subscriptions/subscription-add-form.tsx
"use client";

import { useState } from "react";
import { useExchangeRates, type Currency } from "@/lib/exchange-rates";
import type { BillingCycle, FinancialAccount } from "@/lib/supabase/types";
import { addSubscription } from "@/app/finances/actions";

export function SubscriptionAddForm({ accounts }: { accounts: FinancialAccount[] }) {
  const { rates } = useExchangeRates();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("CHF");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [renewal, setRenewal] = useState("");
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [autoDeduct, setAutoDeduct] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const n = name.trim();
    const a = parseFloat(amount);
    if (!n || isNaN(a)) return;
    if (autoDeduct && !fromAccountId) {
      alert('Pick a "From account" — auto-deduct needs somewhere to take the money from.');
      return;
    }
    setPending(true);
    try {
      const rate = rates[currency] || 1;
      await addSubscription({
        name: n,
        amount_chf: a / rate,
        entered_amount: a,
        entered_currency: currency,
        billing_cycle: cycle,
        next_renewal: renewal || null,
        from_account_id: fromAccountId || null,
        auto_deduct: autoDeduct,
      });
      setName("");
      setAmount("");
      setRenewal("");
      setAutoDeduct(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 rounded-xl bg-black/30 p-1.5 sm:grid-cols-[2fr_1fr_1fr_1fr]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Service (e.g. Netflix)"
        className="rounded-md bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Amount"
        className="rounded-md bg-transparent px-3 py-2 text-right text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-white"
      >
        <option value="CHF">CHF</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
      </select>
      <select
        value={cycle}
        onChange={(e) => setCycle(e.target.value as BillingCycle)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-white"
      >
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="weekly">Weekly</option>
      </select>
      <input
        type="date"
        value={renewal}
        onChange={(e) => setRenewal(e.target.value)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-sm text-white sm:col-span-2"
        style={{ colorScheme: "dark" }}
      />
      <select
        value={fromAccountId}
        onChange={(e) => setFromAccountId(e.target.value)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white"
      >
        <option value="">No account linked</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <label className="flex items-center justify-center gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-xs">
        <input
          type="checkbox"
          checked={autoDeduct}
          onChange={(e) => setAutoDeduct(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        <span className={autoDeduct ? "font-bold text-[#6BE3A4]" : "text-[#B8B6B0]"}>
          Auto-deduct
        </span>
      </label>
      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="rounded-md bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.12] disabled:opacity-50 sm:col-span-4"
      >
        + Add
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/subscriptions/subscription-add-form.tsx
git commit -m "feat(finances): add SubscriptionAddForm with from-account selector"
```

---

### Task 5.5: SubscriptionsSection + wire ticker into page

**Files:**
- Create: `components/finances/subscriptions/subscriptions-section.tsx`
- Modify: `app/finances/page.tsx`

- [ ] **Step 1: Create the section**

```tsx
// components/finances/subscriptions/subscriptions-section.tsx
"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinancialAccount, Subscription } from "@/lib/supabase/types";
import { monthlyEquivalentCHF } from "@/lib/finances/net-worth";
import { SubscriptionRow } from "./subscription-row";
import { SubscriptionAddForm } from "./subscription-add-form";

export function SubscriptionsSection({
  subscriptions,
  accounts,
}: {
  subscriptions: Subscription[];
  accounts: FinancialAccount[];
}) {
  const { format } = useExchangeRates();
  const active = subscriptions.filter((s) => s.active);
  const monthly = active.reduce((s, x) => s + monthlyEquivalentCHF(x), 0);

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(83,74,183,0.07), rgba(216,90,48,0.05))",
          borderColor: "rgba(83,74,183,0.20)",
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
              Monthly burn
            </div>
            <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
              {format(monthly)}{" "}
              <span className="text-sm font-medium text-[#76746E]">/ mo</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#76746E]">
              ~{format(monthly * 12)} per year
            </div>
          </div>
          <div className="text-[11px] text-[#76746E]">
            {active.length} subscription{active.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {active.length === 0 ? (
            <div className="rounded-lg py-4 text-center text-[10px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
              No subscriptions yet
            </div>
          ) : (
            active.map((s) => <SubscriptionRow key={s.id} sub={s} accounts={accounts} />)
          )}
        </div>

        <div className="mt-3">
          <SubscriptionAddForm accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update page to fetch accounts, render ticker + section**

Replace `app/finances/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ExchangeRatesProvider } from "@/lib/exchange-rates";
import { FinanceTabs, parseTab } from "@/components/finances/finance-tabs";
import { NetWorthSection } from "@/components/finances/net-worth/net-worth-section";
import { SubscriptionsSection } from "@/components/finances/subscriptions/subscriptions-section";
import { RenewalTicker } from "@/components/finances/renewal-ticker";
import { getNetWorthData } from "@/lib/finances/net-worth";
import { processAutoDeductSubs } from "@/app/finances/actions";
import type { Subscription } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  // Fire-and-process auto-deduct before reading subscription/account state.
  await processAutoDeductSubs();

  const supabase = createClient();
  const active = parseTab(searchParams.tab);

  const [nwData, subsRes] = await Promise.all([
    getNetWorthData(supabase),
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
  ]);
  const subscriptions = (subsRes.data ?? []) as Subscription[];

  return (
    <ExchangeRatesProvider>
      <div className="dash-hub space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Finances</h1>
          <p className="mt-1 text-sm text-[#76746E]">
            Net worth, subscriptions, cash flow, and business expenses.
          </p>
        </header>

        <RenewalTicker subscriptions={subscriptions} />

        <FinanceTabs active={active} />

        {active === "net-worth" && (
          <NetWorthSection
            accounts={nwData.accounts}
            activity={nwData.activity}
            snapshots={nwData.snapshots}
            subscriptions={subscriptions}
          />
        )}
        {active === "subscriptions" && (
          <SubscriptionsSection subscriptions={subscriptions} accounts={nwData.accounts} />
        )}
        {active === "cash-flow" && (
          <div data-slot="cash-flow">Cash Flow tab coming in Phase 6</div>
        )}
        {active === "business" && <div data-slot="business">Business tab coming in Phase 7</div>}
      </div>
    </ExchangeRatesProvider>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`
Open http://localhost:3000/finances?tab=subscriptions. Expected:
- Monthly burn hero card visible
- Existing subs (if any) render as rows
- Add new sub via form → appears in list, ticker shows it
- Set renewal date in the past → on page refresh, see auto-deduct happen if linked to an account + auto-deduct ON. Activity log on Net Worth tab should show the new "edit" row.
- Set renewal ≤5 days away → ticker pulses red, row pulses red

- [ ] **Step 4: Commit**

```bash
git add components/finances/subscriptions/subscriptions-section.tsx app/finances/page.tsx
git commit -m "feat(finances): wire Subscriptions section + RenewalTicker into page"
```

---

## Phase 6: Cash Flow tab

### Task 6.1: FlowSummaryCards

**Files:**
- Create: `components/finances/cash-flow/flow-summary-cards.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/cash-flow/flow-summary-cards.tsx
"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { MonthlyFinancePoint } from "@/lib/finances";

export function FlowSummaryCards({ monthly }: { monthly: MonthlyFinancePoint[] }) {
  const { format } = useExchangeRates();
  const last = monthly[monthly.length - 1];
  const inflow = last?.income ?? 0;
  const outflow = last?.expenses ?? 0;

  const recent = monthly.slice(-3);
  const W = 100;
  const H = 28;
  const maxIn = Math.max(1, ...recent.map((m) => m.income));
  const maxOut = Math.max(1, ...recent.map((m) => m.expenses));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <SummaryCard
        label="Inflow this month"
        amount={format(inflow)}
        color="#6BE3A4"
        sparkPath={recent.map((m, i) => ({
          x: (i / Math.max(1, recent.length - 1)) * W,
          y: H - (m.income / maxIn) * H,
        }))}
      />
      <SummaryCard
        label="Outflow this month"
        amount={format(outflow)}
        color="#FF8A8A"
        sparkPath={recent.map((m, i) => ({
          x: (i / Math.max(1, recent.length - 1)) * W,
          y: H - (m.expenses / maxOut) * H,
        }))}
      />
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  color,
  sparkPath,
}: {
  label: string;
  amount: string;
  color: string;
  sparkPath: { x: number; y: number }[];
}) {
  const d = sparkPath.length
    ? "M" + sparkPath.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")
    : "";
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-3">
        <div className="text-3xl font-bold leading-tight text-white">{amount}</div>
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-24" aria-hidden>
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.04em] text-[#76746E]">
        last 3 months
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/cash-flow/flow-summary-cards.tsx
git commit -m "feat(finances): add FlowSummaryCards with 3-month sparklines"
```

---

### Task 6.2: FlowRecentList component

**Files:**
- Create: `components/finances/cash-flow/flow-recent-list.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/cash-flow/flow-recent-list.tsx
"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry } from "@/lib/supabase/types";

export function FlowRecentList({
  title,
  entries,
  direction,
}: {
  title: string;
  entries: FinanceEntry[];
  direction: "in" | "out";
}) {
  const { format } = useExchangeRates();
  const color = direction === "in" ? "#6BE3A4" : "#FF8A8A";

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2.5 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>{title}</span>
        <span>
          {entries.length} entr{entries.length === 1 ? "y" : "ies"}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="py-3 text-center text-[11px] italic text-[#76746E]">
          No {direction === "in" ? "inflows" : "outflows"} yet.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {entries.slice(0, 12).map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[4px_1fr_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px]"
              style={{ color }}
            >
              <span
                className="h-6 w-1 rounded-sm"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-white">
                  {e.item || e.category}
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-[#76746E]">
                  {e.category}
                </div>
              </div>
              <span
                className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums"
                style={{ color }}
              >
                {direction === "in" ? "+" : "−"}
                {format(Number(e.amount))}
              </span>
              <span className="whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[#76746E]">
                {e.date.slice(5)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/cash-flow/flow-recent-list.tsx
git commit -m "feat(finances): add FlowRecentList for recent income/expense rows"
```

---

### Task 6.3: CashFlowSection orchestrator + wire into page

**Files:**
- Create: `components/finances/cash-flow/cash-flow-section.tsx`
- Modify: `app/finances/page.tsx`

- [ ] **Step 1: Create the section**

```tsx
// components/finances/cash-flow/cash-flow-section.tsx
"use client";

import type { FinanceEntry } from "@/lib/supabase/types";
import type { MonthlyFinancePoint } from "@/lib/finances";
import { IncomeVsExpensesChart } from "@/components/finances/income-vs-expenses-chart";
import { FlowSummaryCards } from "./flow-summary-cards";
import { FlowRecentList } from "./flow-recent-list";
import Link from "next/link";

export function CashFlowSection({
  monthly,
  recentIncome,
  recentExpenses,
}: {
  monthly: MonthlyFinancePoint[];
  recentIncome: FinanceEntry[];
  recentExpenses: FinanceEntry[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Link
          href="/finances/import"
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.10em] text-white hover:bg-white/[0.08]"
        >
          Import statement
        </Link>
      </div>

      <FlowSummaryCards monthly={monthly} />

      <IncomeVsExpensesChart data={monthly} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FlowRecentList title="Recent inflows" entries={recentIncome} direction="in" />
        <FlowRecentList title="Recent outflows" entries={recentExpenses} direction="out" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into page**

Update `app/finances/page.tsx` — add the cash-flow imports and section wiring:

```tsx
// At top:
import { getFinanceOverview } from "@/lib/finances";
import { CashFlowSection } from "@/components/finances/cash-flow/cash-flow-section";

// Inside the component, alongside existing data fetches:
const overview = await getFinanceOverview(supabase);

// In JSX, replace the cash-flow placeholder:
{active === "cash-flow" && (
  <CashFlowSection
    monthly={overview.monthly}
    recentIncome={overview.recentIncome}
    recentExpenses={overview.recentExpenses.filter((e) => !e.is_business)}
  />
)}
```

- [ ] **Step 3: Manual verification**

Open http://localhost:3000/finances?tab=cash-flow. Expected:
- Two summary cards (Inflow / Outflow) at the top with 3-month sparklines
- Existing `IncomeVsExpensesChart` renders (may need restyling later; that's OK for now)
- Two columns underneath: Recent inflows / Recent outflows
- "Import statement" button visible (will be hooked up in Phase 8)

- [ ] **Step 4: Commit**

```bash
git add components/finances/cash-flow/cash-flow-section.tsx app/finances/page.tsx
git commit -m "feat(finances): wire Cash Flow section into page"
```

---

## Phase 7: Business Expenses tab

### Task 7.1: BusinessAddForm

**Files:**
- Create: `components/finances/business/business-add-form.tsx`
- Modify: `app/finances/actions.ts`

- [ ] **Step 1: Add business expense server actions**

Append to `app/finances/actions.ts`:

```ts
export async function addBusinessExpense(input: {
  item: string;
  amount: number;
  category: string;
  date: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("expenses").insert({
    item: input.item,
    amount: input.amount,
    category: input.category,
    date: input.date,
    is_business: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}

export async function setExpenseBusinessFlag(id: string, isBusiness: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .update({ is_business: isBusiness })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}
```

- [ ] **Step 2: Create the form**

```tsx
// components/finances/business/business-add-form.tsx
"use client";

import { useState } from "react";
import { addBusinessExpense } from "@/app/finances/actions";

export function BusinessAddForm({ knownCategories }: { knownCategories: string[] }) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const i = item.trim();
    const a = parseFloat(amount);
    const c = category.trim();
    if (!i || isNaN(a) || !c) return;
    setPending(true);
    try {
      await addBusinessExpense({ item: i, amount: a, category: c, date });
      setItem("");
      setAmount("");
      setCategory("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 rounded-xl bg-black/30 p-1.5 sm:grid-cols-[2fr_1fr_1.5fr_1.2fr_auto]">
      <input
        value={item}
        onChange={(e) => setItem(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Description"
        className="rounded-md bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Amount"
        className="rounded-md bg-transparent px-3 py-2 text-right text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <input
        list="biz-categories"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Category (Software, Travel...)"
        className="rounded-md bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <datalist id="biz-categories">
        {knownCategories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-sm text-white"
        style={{ colorScheme: "dark" }}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="rounded-md bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.12] disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add components/finances/business/business-add-form.tsx app/finances/actions.ts
git commit -m "feat(finances): add BusinessAddForm + server actions"
```

---

### Task 7.2: BusinessCategoryDonut

**Files:**
- Create: `components/finances/business/business-category-donut.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/finances/business/business-category-donut.tsx
"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry } from "@/lib/supabase/types";

const PALETTE = ["#7DD3FC", "#6EE7B7", "#FBBF24", "#B794F4", "#FF8A8A", "#F2C063", "#E07658", "#BFE3F8"];

function arc(cx: number, cy: number, rO: number, rI: number, a1: number, a2: number) {
  const x1o = cx + rO * Math.cos(a1);
  const y1o = cy + rO * Math.sin(a1);
  const x2o = cx + rO * Math.cos(a2);
  const y2o = cy + rO * Math.sin(a2);
  const x1i = cx + rI * Math.cos(a2);
  const y1i = cy + rI * Math.sin(a2);
  const x2i = cx + rI * Math.cos(a1);
  const y2i = cy + rI * Math.sin(a1);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${x1o.toFixed(2)} ${y1o.toFixed(2)} A ${rO} ${rO} 0 ${large} 1 ${x2o.toFixed(2)} ${y2o.toFixed(2)} L ${x1i.toFixed(2)} ${y1i.toFixed(2)} A ${rI} ${rI} 0 ${large} 0 ${x2i.toFixed(2)} ${y2i.toFixed(2)} Z`;
}

export function BusinessCategoryDonut({ entries }: { entries: FinanceEntry[] }) {
  const { format } = useExchangeRates();

  const slices = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    });
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        Breakdown
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className="relative mx-auto h-[140px] w-[140px]">
          <svg viewBox="0 0 140 140" className="block h-[140px] w-[140px] -rotate-90" aria-hidden>
            {total > 0 ? (
              (() => {
                let angle = -Math.PI / 2;
                return slices.map((s) => {
                  const sa = (s.value / total) * Math.PI * 2;
                  const pad = slices.length > 1 ? 0.015 : 0;
                  const a1 = angle + pad;
                  const a2 = angle + sa - pad;
                  angle += sa;
                  if (a2 <= a1) return null;
                  return <path key={s.name} d={arc(70, 70, 60, 44, a1, a2)} fill={s.color} />;
                });
              })()
            ) : (
              <>
                <circle cx="70" cy="70" r="60" fill="rgba(255,255,255,0.025)" />
                <circle cx="70" cy="70" r="44" fill="#0A0A0B" />
              </>
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-base font-bold text-white">
              {total > 0 ? format(total).split(" ")[1] || format(total) : "—"}
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#76746E]">
              total
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {slices.length === 0 ? (
            <div className="py-2 text-center text-[11px] italic text-[#76746E]">
              No business expenses yet
            </div>
          ) : (
            slices.map((s) => {
              const pct = ((s.value / total) * 100).toFixed(1);
              return (
                <div
                  key={s.name}
                  className="grid grid-cols-[8px_1fr_auto_auto] items-center gap-2 rounded-md px-1.5 py-1 text-[11px] tabular-nums"
                  style={{ color: s.color }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                  />
                  <span className="text-[#B8B6B0]">{s.name}</span>
                  <span className="font-mono text-[10.5px] font-bold text-white">{pct}%</span>
                  <span className="font-mono text-[10.5px] text-[#76746E]">{format(s.value)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/finances/business/business-category-donut.tsx
git commit -m "feat(finances): add BusinessCategoryDonut"
```

---

### Task 7.3: BusinessExpensesSection + wire into page

**Files:**
- Create: `components/finances/business/business-expenses-section.tsx`
- Modify: `app/finances/page.tsx`

- [ ] **Step 1: Create the section**

```tsx
// components/finances/business/business-expenses-section.tsx
"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry } from "@/lib/supabase/types";
import { BusinessCategoryDonut } from "./business-category-donut";
import { BusinessAddForm } from "./business-add-form";

function isThisMonth(date: string): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isThisYear(date: string): boolean {
  return new Date(date).getFullYear() === new Date().getFullYear();
}

export function BusinessExpensesSection({ entries }: { entries: FinanceEntry[] }) {
  const { format } = useExchangeRates();
  const thisMonth = useMemo(
    () => entries.filter((e) => isThisMonth(e.date)).reduce((s, e) => s + Number(e.amount), 0),
    [entries]
  );
  const ytd = useMemo(
    () => entries.filter((e) => isThisYear(e.date)).reduce((s, e) => s + Number(e.amount), 0),
    [entries]
  );
  const knownCategories = useMemo(
    () => Array.from(new Set(entries.map((e) => e.category))).filter(Boolean).sort(),
    [entries]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
          <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
            This month
          </div>
          <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
            {format(thisMonth)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
          <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
            Year to date
          </div>
          <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
            {format(ytd)}
          </div>
        </div>
      </div>

      <BusinessCategoryDonut entries={entries} />

      <div className="rounded-xl bg-white/[0.025] p-4">
        <div className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
          Recent business expenses
        </div>
        {entries.length === 0 ? (
          <div className="py-3 text-center text-[11px] italic text-[#76746E]">
            No business expenses yet. Add one below.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {entries.slice(0, 20).map((e) => (
              <li
                key={e.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px]"
              >
                <div className="min-w-0 truncate text-[13px] font-semibold text-white">
                  {e.item || e.category}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-[#B8B6B0]">
                  {e.category}
                </span>
                <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums text-white">
                  {format(Number(e.amount))}
                </span>
                <span className="whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[#76746E]">
                  {e.date.slice(5)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BusinessAddForm knownCategories={knownCategories} />
    </div>
  );
}
```

- [ ] **Step 2: Wire into page**

Update `app/finances/page.tsx` — add the import and section:

```tsx
import { BusinessExpensesSection } from "@/components/finances/business/business-expenses-section";

// In the data fetches block, also fetch business expenses:
const businessRes = await supabase
  .from("expenses")
  .select("*")
  .eq("is_business", true)
  .order("date", { ascending: false });
const businessEntries = (businessRes.data ?? []) as FinanceEntry[];

// In JSX, replace the placeholder:
{active === "business" && <BusinessExpensesSection entries={businessEntries} />}
```

Also add `import type { FinanceEntry } from "@/lib/supabase/types";` at top if missing.

- [ ] **Step 3: Manual verification**

Open http://localhost:3000/finances?tab=business. Expected:
- "This month" and "YTD" cards
- Empty-state donut when no business expenses
- Add a business expense → it appears in the list, donut updates, totals update
- Switch tab to Cash Flow → business expenses do NOT appear in Recent outflows (because of the `.filter((e) => !e.is_business)` we added in Task 6.3)

- [ ] **Step 4: Commit**

```bash
git add components/finances/business/business-expenses-section.tsx app/finances/page.tsx
git commit -m "feat(finances): wire Business Expenses section into page"
```

---

## Phase 8: Statement Analyzer Claude API upgrade

### Task 8.1: Install Anthropic SDK and create client

**Files:**
- Create: `lib/anthropic.ts`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the SDK**

Run: `npm install @anthropic-ai/sdk`

- [ ] **Step 2: Add env var template**

Append to `.env.local` (and `.env.example` if it exists):

```
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 3: Create the SDK client**

```ts
// lib/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

export const STATEMENT_PARSER_MODEL = "claude-haiku-4-5-20251001";
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/anthropic.ts .env.local
git commit -m "feat(anthropic): add SDK client + ANTHROPIC_API_KEY env"
```

---

### Task 8.2: Statement parsing prompt + tool call wrapper

**Files:**
- Create: `lib/finances/parse-statement.ts`

- [ ] **Step 1: Create the parser module**

```ts
// lib/finances/parse-statement.ts
import { getAnthropic, STATEMENT_PARSER_MODEL } from "@/lib/anthropic";

export type ParsedTransaction = {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
};

const CATEGORIES = [
  "Dining",
  "Coffee & Drinks",
  "Groceries",
  "Transit",
  "AI & Tech",
  "Subscriptions",
  "Shopping",
  "Rent",
  "Salary",
  "Transfer",
  "Other",
] as const;

const SYSTEM_PROMPT = `You parse bank/credit-card statements into structured JSON. Extract every transaction. Categorize each one into ONE of these categories: ${CATEGORIES.join(", ")}. Use "income" for credits/deposits and "expense" for debits/charges. Dates must be ISO YYYY-MM-DD. Amounts are positive numbers (the type field indicates direction). Hints for known merchants: TST-, "burger king", "mcdonald" → Dining; "starbucks", "coffee", "cafe" → Coffee & Drinks; "presto", "uber", "lyft" → Transit; "claude.ai", "anthropic", "openai", "github", "vercel" → AI & Tech; "loblaws", "metro", "no frills", "real canadian" → Groceries.`;

export async function parseStatement(input: {
  text?: string;
  pdfBase64?: string;
}): Promise<ParsedTransaction[]> {
  const client = getAnthropic();

  const userBlocks: any[] = [];
  if (input.pdfBase64) {
    userBlocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 },
    });
  }
  if (input.text) {
    userBlocks.push({ type: "text", text: input.text });
  }
  if (userBlocks.length === 0) {
    throw new Error("No input provided");
  }

  const response = await client.messages.create({
    model: STATEMENT_PARSER_MODEL,
    max_tokens: 8192,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [
      {
        name: "save_transactions",
        description: "Save the parsed transactions",
        input_schema: {
          type: "object",
          properties: {
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", description: "YYYY-MM-DD" },
                  description: { type: "string" },
                  category: { type: "string", enum: [...CATEGORIES] },
                  amount: { type: "number", description: "Positive number" },
                  type: { type: "string", enum: ["income", "expense"] },
                },
                required: ["date", "description", "category", "amount", "type"],
              },
            },
          },
          required: ["transactions"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "save_transactions" },
    messages: [{ role: "user", content: userBlocks }],
  });

  const toolUse = response.content.find((c: any) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block");
  }
  const transactions = (toolUse.input as { transactions: ParsedTransaction[] }).transactions || [];
  return transactions;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add lib/finances/parse-statement.ts
git commit -m "feat(finances): add parseStatement wrapper using Claude Haiku 4.5"
```

---

### Task 8.3: API route `/api/parse-statement`

**Files:**
- Create: `app/api/parse-statement/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/parse-statement/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseStatement } from "@/lib/finances/parse-statement";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  let body: { text?: string; pdfBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.text && !body.pdfBase64) {
    return NextResponse.json({ error: "Provide either `text` or `pdfBase64`" }, { status: 400 });
  }

  try {
    const transactions = await parseStatement(body);
    if (transactions.length === 0) {
      return NextResponse.json({ error: "No transactions found" }, { status: 422 });
    }
    return NextResponse.json({ transactions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/api/parse-statement/route.ts
git commit -m "feat(api): add /api/parse-statement route"
```

---

### Task 8.4: Statement import page + UI components

**Files:**
- Create: `app/finances/import/page.tsx`
- Create: `components/finances/statement-import/statement-import-page.tsx`
- Create: `components/finances/statement-import/parsed-transactions-table.tsx`

- [ ] **Step 1: Create the page wrapper**

```tsx
// app/finances/import/page.tsx
import { StatementImportPage } from "@/components/finances/statement-import/statement-import-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return <StatementImportPage />;
}
```

- [ ] **Step 2: Create the import UI**

```tsx
// components/finances/statement-import/statement-import-page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { ParsedTransactionsTable } from "./parsed-transactions-table";
import type { ParsedTransaction } from "@/lib/finances/parse-statement";

export function StatementImportPage() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTransaction[] | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    if (file.type === "application/pdf") {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      setPdfBase64(typeof window !== "undefined" ? window.btoa(binary) : "");
    } else {
      const txt = await file.text();
      setText(txt);
      setPdfBase64(null);
    }
  }

  async function handleParse() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/parse-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfBase64 ? undefined : text, pdfBase64: pdfBase64 ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setParsed(data.transactions as ParsedTransaction[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/finances?tab=cash-flow"
        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#B8B6B0] hover:bg-white/[0.08]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Cash Flow
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-white">Import statement</h1>
      <p className="text-sm text-[#76746E]">
        Paste statement text or upload a PDF. Claude parses transactions and you review before
        importing.
      </p>

      {!parsed ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
            <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#76746E]">
              Paste text
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste your statement text here…"
              className="w-full rounded-md bg-black/30 p-3 text-sm text-white outline-none placeholder:text-[#76746E]"
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
            <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#76746E]">
              Or upload PDF / text file
            </div>
            <input
              type="file"
              accept=".pdf,.txt,.csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block text-sm text-white"
            />
            {fileName && (
              <div className="mt-2 text-xs text-[#76746E]">Loaded: {fileName}</div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-[#FF8A8A]/30 bg-[#FF8A8A]/10 px-3 py-2 text-sm text-[#FF8A8A]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleParse}
            disabled={pending || (!text && !pdfBase64)}
            className="inline-flex items-center gap-2 rounded-md bg-white/[0.08] px-4 py-2 text-sm font-bold uppercase tracking-[0.10em] text-white hover:bg-white/[0.12] disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Parse with Claude
          </button>
        </div>
      ) : (
        <ParsedTransactionsTable
          transactions={parsed}
          onReset={() => {
            setParsed(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the table**

```tsx
// components/finances/statement-import/parsed-transactions-table.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { ParsedTransaction } from "@/lib/finances/parse-statement";

type Row = ParsedTransaction & { id: string; include: boolean; isBusiness: boolean };

export function ParsedTransactionsTable({
  transactions,
  onReset,
}: {
  transactions: ParsedTransaction[];
  onReset: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    transactions.map((t, i) => ({
      ...t,
      id: `r${i}_${Date.now()}`,
      include: true,
      isBusiness: false,
    }))
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  async function handleImport() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/parse-statement/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.filter((r) => r.include).map(({ id, include, ...rest }) => rest),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      router.push(`/finances?tab=cash-flow&imported=${data.inserted ?? 0}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#B8B6B0]">
          {includedCount} of {rows.length} selected
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.10em] text-[#B8B6B0] hover:bg-white/[0.04]"
        >
          Start over
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.025]">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
              <th className="p-3">✓</th>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Type</th>
              <th className="p-3">Business?</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.03]">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                  />
                </td>
                <td className="p-3 font-mono text-[12px] tabular-nums text-[#B8B6B0]">{r.date}</td>
                <td className="p-3 text-white">
                  <input
                    value={r.description}
                    onChange={(e) => updateRow(r.id, { description: e.target.value })}
                    className="w-full bg-transparent outline-none"
                  />
                </td>
                <td className="p-3">
                  <input
                    value={r.category}
                    onChange={(e) => updateRow(r.id, { category: e.target.value })}
                    className="w-full rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white outline-none"
                  />
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-white">
                  <input
                    type="number"
                    step="0.01"
                    value={r.amount}
                    onChange={(e) => updateRow(r.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-24 bg-transparent text-right outline-none"
                  />
                </td>
                <td className="p-3">
                  <select
                    value={r.type}
                    onChange={(e) => updateRow(r.id, { type: e.target.value as "income" | "expense" })}
                    className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={r.isBusiness}
                    onChange={(e) => updateRow(r.id, { isBusiness: e.target.checked })}
                    disabled={r.type === "income"}
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="rounded p-1 text-[#76746E] hover:text-[#FF8A8A]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-md border border-[#FF8A8A]/30 bg-[#FF8A8A]/10 px-3 py-2 text-sm text-[#FF8A8A]">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={pending || includedCount === 0}
        className="inline-flex items-center gap-2 rounded-md bg-[#6EE7B7] px-4 py-2 text-sm font-bold uppercase tracking-[0.10em] text-[#04201A] hover:bg-[#4ED4A0] disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Import {includedCount} transaction{includedCount === 1 ? "" : "s"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add app/finances/import/page.tsx components/finances/statement-import/
git commit -m "feat(finances): add statement import page with parse + review UI"
```

---

### Task 8.5: Bulk import API route

**Files:**
- Create: `app/api/parse-statement/import/route.ts`

- [ ] **Step 1: Create the bulk-insert route**

```ts
// app/api/parse-statement/import/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/lib/finances/parse-statement";

type Row = ParsedTransaction & { isBusiness: boolean };

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows?: Row[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const expenses = rows
    .filter((r) => r.type === "expense")
    .map((r) => ({
      item: r.description,
      category: r.category,
      amount: r.amount,
      date: r.date,
      is_business: r.isBusiness,
      notes: null,
    }));
  const incomes = rows
    .filter((r) => r.type === "income")
    .map((r) => ({
      item: r.description,
      category: r.category,
      amount: r.amount,
      date: r.date,
      notes: null,
    }));

  let inserted = 0;
  if (expenses.length) {
    const { error, count } = await supabase.from("expenses").insert(expenses).select("*", { count: "exact" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted += count ?? expenses.length;
  }
  if (incomes.length) {
    const { error, count } = await supabase.from("income").insert(incomes).select("*", { count: "exact" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted += count ?? incomes.length;
  }

  return NextResponse.json({ inserted });
}
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Open http://localhost:3000/finances/import.
- Paste a small fake statement (e.g. 3-5 lines like `2026-05-01 STARBUCKS 6.50` etc.)
- Click "Parse with Claude" → loading spinner → table appears
- Edit categories/amounts as needed; uncheck any rows you don't want
- Click "Import N transactions" → redirects to Cash Flow tab with the imported count
- Open Cash Flow tab → new entries visible in Recent outflows / Recent inflows

- [ ] **Step 3: Commit**

```bash
git add app/api/parse-statement/import/route.ts
git commit -m "feat(api): add bulk-insert route for parsed transactions"
```

---

## Phase 9: Cleanup of replaced finance components

### Task 9.1: Delete unused finance components

**Files:**
- Delete: `components/finances/balance-sheet-summary.tsx`
- Delete: `components/finances/summary-cards.tsx`
- Delete: `components/finances/expense-breakdown-pie.tsx`
- Delete: `components/finances/account-form.tsx`
- Delete: `components/finances/account-list.tsx`
- Delete: `components/finances/recurring-expenses-list.tsx`
- Delete: `components/finances/finances-tabs.tsx`
- Delete: `components/finances/statement-analyzer.tsx`

- [ ] **Step 1: Confirm no imports remain**

Run each:
```bash
grep -rn "balance-sheet-summary\|BalanceSheetSummary" --include="*.tsx" --include="*.ts" .
grep -rn "summary-cards\|SummaryCards" --include="*.tsx" --include="*.ts" .
grep -rn "expense-breakdown-pie\|ExpenseBreakdownPie" --include="*.tsx" --include="*.ts" .
grep -rn "components/finances/account-form\|AccountForm" --include="*.tsx" --include="*.ts" .
grep -rn "components/finances/account-list\|AccountList" --include="*.tsx" --include="*.ts" .
grep -rn "recurring-expenses-list\|RecurringExpensesList" --include="*.tsx" --include="*.ts" .
grep -rn "components/finances/finances-tabs\|FinancesTabs" --include="*.tsx" --include="*.ts" .
grep -rn "components/finances/statement-analyzer\|StatementAnalyzer" --include="*.tsx" --include="*.ts" .
```
Expected for each: zero results outside `node_modules` and `.next`.

If anything has lingering imports, fix those first (e.g., dashboard or other pages still using these components).

- [ ] **Step 2: Delete the files**

```bash
rm components/finances/balance-sheet-summary.tsx \
   components/finances/summary-cards.tsx \
   components/finances/expense-breakdown-pie.tsx \
   components/finances/account-form.tsx \
   components/finances/account-list.tsx \
   components/finances/recurring-expenses-list.tsx \
   components/finances/finances-tabs.tsx \
   components/finances/statement-analyzer.tsx
```

- [ ] **Step 3: Verify TypeScript and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(finances): delete legacy components replaced by Rowan redesign"
```

---

### Task 9.2: Final end-to-end manual verification

- [ ] **Step 1: Boot dev server and run through each tab**

Run: `npm run dev`. For each of `/dashboard`, `/finances` (all 4 tabs), `/finances/import`, `/kanban`, `/notes`, `/schedule`, `/reflections`, `/pomodoro`:
- Page renders without errors
- Bottom tab bar visible, More sheet works
- Active tab highlighted correctly

- [ ] **Step 2: Run through the finance flows once**

- Add a Bank account → confirm donut, header total, activity log all update
- Add a Stocks account → confirm donut shows two slices
- Add a subscription with renewal date 2 days from now → confirm ticker shows it pulsing red
- Add a subscription with renewal date 30 days ago, auto-deduct ON, linked to Bank → refresh page, confirm Bank balance dropped, activity log shows the deduction
- Switch currency to USD → all amounts re-format
- Add a business expense → confirm Business tab donut updates
- Confirm business expense does NOT appear in Cash Flow's Recent outflows
- Import a fake statement via `/finances/import` → confirm a few rows insert correctly

- [ ] **Step 3: Tag the release**

```bash
git tag rowan-finance-redesign-v1
```

(No push — that's a manual step the user can take.)

---

## Self-Review

After completing all tasks, re-read the spec and verify:
- Bottom tab bar (Phase 2): ✓ done in Tasks 2.1–2.4
- Net Worth tab (Phase 4): ✓ done in Tasks 4.1–4.6
- Subscriptions tab + ticker (Phase 5): ✓ done in Tasks 5.1–5.5
- Cash Flow tab (Phase 6): ✓ done in Tasks 6.1–6.3
- Business Expenses tab (Phase 7): ✓ done in Tasks 7.1–7.3
- StatementAnalyzer Claude upgrade (Phase 8): ✓ done in Tasks 8.1–8.5
- Schema migrations (Phase 1): ✓ done in Tasks 1.1–1.5
- Exchange rate provider: ✓ Task 3.1
- Cleanup of legacy components: ✓ Task 9.1

Notes:
- `IncomeVsExpensesChart` is reused in Phase 6 without restyle — if its visual doesn't match Rowan aesthetic, that's a follow-up task (not in this plan to keep scope contained).
- No `RLS` policies are written for the new tables (`nw_activity`, `nw_snapshots`). If the existing tables use RLS, mirror those policies in the migrations. Verify against existing `subscriptions` / `financial_accounts` RLS before applying.
