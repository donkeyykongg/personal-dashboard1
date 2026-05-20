"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
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
      <div className="flex justify-end">
        <Link
          href="/finances/import"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#B8B6B0] hover:bg-white/[0.08]"
        >
          <FileText className="h-3.5 w-3.5" />
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
