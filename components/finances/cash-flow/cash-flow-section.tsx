"use client";

import Link from "next/link";
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
