"use client";

import type { FinanceEntry } from "@/lib/supabase/types";
import type { MonthlyFinancePoint } from "@/lib/finances";
import { IncomeVsExpensesChart } from "@/components/finances/income-vs-expenses-chart";
import { FlowSummaryCards } from "./flow-summary-cards";
import { FlowRecentList } from "./flow-recent-list";

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
      <FlowSummaryCards monthly={monthly} />

      <IncomeVsExpensesChart data={monthly} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FlowRecentList title="Recent inflows" entries={recentIncome} direction="in" />
        <FlowRecentList title="Recent outflows" entries={recentExpenses} direction="out" />
      </div>
    </div>
  );
}
