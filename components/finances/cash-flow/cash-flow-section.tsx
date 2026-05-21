"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FileText } from "lucide-react";
import type { FinanceEntry, Subscription } from "@/lib/supabase/types";
import type { MonthlyFinancePoint } from "@/lib/finances";
import { IncomeVsExpensesChart } from "@/components/finances/income-vs-expenses-chart";
import { FlowSummaryCards } from "./flow-summary-cards";
import { FlowRecentList, type FlowListItem } from "./flow-recent-list";
import { CategoryDeltas, type CategoryDelta } from "./category-deltas";
import { CashFlowAddForm } from "./cash-flow-add-form";

function monthlyEquivalent(sub: Subscription): number {
  const amount = Number(sub.amount) || 0;
  if (sub.amount_type === "total") {
    if (!sub.paid_on || !sub.next_renewal) return amount;
    const start = new Date(`${sub.paid_on}T00:00`);
    const end = new Date(`${sub.next_renewal}T00:00`);
    const days = Math.max(1, (end.getTime() - start.getTime()) / 86_400_000);
    return amount * (30.44 / days);
  }
  if (sub.billing_cycle === "weekly") return amount * 4.345;
  if (sub.billing_cycle === "yearly") return amount / 12;
  return amount;
}

function subscriptionsAsOutflowItems(subs: Subscription[]): FlowListItem[] {
  return subs
    .filter((s) => s.active)
    .map((s) => {
      const monthly = monthlyEquivalent(s);
      const date =
        s.next_renewal ??
        s.paid_on ??
        s.last_deducted_at?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10);
      return {
        id: `sub-${s.id}`,
        user_id: null,
        amount: monthly,
        category: "Subscriptions",
        subcategory: null,
        item: s.name,
        date,
        notes: null,
        is_recurring: true,
        recurring_interval: "monthly",
        next_due_date: s.next_renewal,
        is_business: false,
        created_at: s.created_at,
        is_subscription: true,
      } satisfies FlowListItem;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function CashFlowSection({
  monthly,
  recentIncome,
  recentExpenses,
  subscriptions,
  categoryDeltas,
  knownIncomeCategories,
  knownExpenseCategories,
}: {
  monthly: MonthlyFinancePoint[];
  recentIncome: FinanceEntry[];
  recentExpenses: FinanceEntry[];
  subscriptions: Subscription[];
  categoryDeltas: CategoryDelta[];
  knownIncomeCategories: string[];
  knownExpenseCategories: string[];
}) {
  const mergedOutflows = useMemo<FlowListItem[]>(() => {
    const fromEntries: FlowListItem[] = recentExpenses.map((e) => ({ ...e }));
    const fromSubs = subscriptionsAsOutflowItems(subscriptions);
    return [...fromEntries, ...fromSubs].sort((a, b) => b.date.localeCompare(a.date));
  }, [recentExpenses, subscriptions]);

  const inflows = useMemo<FlowListItem[]>(
    () => recentIncome.map((e) => ({ ...e })),
    [recentIncome]
  );

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

      <CashFlowAddForm
        knownIncomeCategories={knownIncomeCategories}
        knownExpenseCategories={knownExpenseCategories}
      />

      <CategoryDeltas deltas={categoryDeltas} />

      <IncomeVsExpensesChart data={monthly} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FlowRecentList title="Recent inflows" entries={inflows} direction="in" />
        <FlowRecentList title="Recent outflows" entries={mergedOutflows} direction="out" />
      </div>
    </div>
  );
}
