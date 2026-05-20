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
