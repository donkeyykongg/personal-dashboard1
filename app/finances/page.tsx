import { AccountForm } from "@/components/finances/account-form";
import { AccountList } from "@/components/finances/account-list";
import { BalanceSheetSummary } from "@/components/finances/balance-sheet-summary";
import { EntryForm } from "@/components/finances/entry-form";
import { EntryList } from "@/components/finances/entry-list";
import { ExpenseBreakdownPie } from "@/components/finances/expense-breakdown-pie";
import { FinancesTabs } from "@/components/finances/finances-tabs";
import { IncomeVsExpensesChart } from "@/components/finances/income-vs-expenses-chart";
import { RecurringExpensesList } from "@/components/finances/recurring-expenses-list";
import { StatementAnalyzer } from "@/components/finances/statement-analyzer";
import { SummaryCards } from "@/components/finances/summary-cards";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { SubscriptionSummary } from "@/components/subscriptions/subscription-summary";
import { createClient } from "@/lib/supabase/server";
import { getFinanceOverview } from "@/lib/finances";
import type { FinanceEntry, Subscription } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const supabase = createClient();

  const [overview, allExpensesRes, subsRes] = await Promise.all([
    getFinanceOverview(supabase),
    supabase.from("expenses").select("*").order("date", { ascending: false }),
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
  ]);

  const allExpenses = (allExpensesRes.data ?? []) as FinanceEntry[];
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const error = overview.error;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Finances</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track income, expenses, subscriptions, and analyze bank statements.
        </p>
      </header>

      <FinancesTabs
        overviewContent={
          <div className="space-y-6">
            <SummaryCards income={overview.currentIncome} expenses={overview.currentExpenses} />
            <BalanceSheetSummary
              totalCash={overview.totalCash}
              totalInflow={overview.currentIncome}
              totalDebt={overview.totalDebt}
              netWorth={overview.netWorth}
            />
            <IncomeVsExpensesChart data={overview.monthly} />
            <ExpenseBreakdownPie expenses={allExpenses} />
            <StatementAnalyzer />
            <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <EntryForm />
              <div className="grid gap-6 lg:grid-cols-2">
                <AccountForm />
                <AccountList accounts={overview.accounts} />
              </div>
            </section>
            <section className="grid gap-6 xl:grid-cols-3">
              <EntryList
                title="Recent inflows"
                entries={overview.recentIncome}
                table="income"
                tone="text-emerald-600"
              />
              <EntryList
                title="Recent expenses"
                entries={overview.recentExpenses}
                table="expenses"
                tone="text-rose-600"
              />
              <RecurringExpensesList entries={overview.recurringExpenses} />
            </section>
            {error && (
              <p className="text-sm text-destructive">
                Couldn&apos;t load from Supabase: {error}
              </p>
            )}
          </div>
        }
        subscriptionsContent={
          <div className="space-y-6">
            <SubscriptionSummary subscriptions={subscriptions} />
            <SubscriptionList subscriptions={subscriptions} />
          </div>
        }
      />
    </div>
  );
}
