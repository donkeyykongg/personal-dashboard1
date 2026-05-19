import type { Subscription, SubscriptionCategory, BillingCycle } from "@/lib/supabase/types";

export const CATEGORY_META: Record<
  SubscriptionCategory,
  { label: string; classes: string }
> = {
  tools: {
    label: "Tools",
    classes:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200",
  },
  software: {
    label: "Software",
    classes:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200",
  },
  personal: {
    label: "Personal",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  weekly: "Weekly",
};

export function nextBillingDate(
  billingDay: number,
  cycle: BillingCycle,
  today: Date = new Date()
): Date {
  const day = Math.min(Math.max(billingDay, 1), 28);

  if (cycle === "weekly") {
    const target = ((day - 1) % 7 + 7) % 7;
    const todayDow = today.getDay();
    const diff = (target - todayDow + 7) % 7 || 7;
    const next = new Date(today);
    next.setHours(0, 0, 0, 0);
    next.setDate(today.getDate() + diff);
    return next;
  }

  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  candidate.setHours(0, 0, 0, 0);
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  if (candidate < startOfToday) {
    if (cycle === "yearly") {
      candidate.setFullYear(candidate.getFullYear() + 1);
    } else {
      candidate.setMonth(candidate.getMonth() + 1);
    }
  }
  return candidate;
}

export function daysUntil(date: Date, today: Date = new Date()): number {
  const a = new Date(today);
  a.setHours(0, 0, 0, 0);
  const b = new Date(date);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function monthlyCost(sub: Pick<Subscription, "amount" | "billing_cycle">) {
  switch (sub.billing_cycle) {
    case "monthly":
      return sub.amount;
    case "yearly":
      return sub.amount / 12;
    case "weekly":
      return (sub.amount * 52) / 12;
  }
}

export function totalMonthly(subs: Subscription[]) {
  return subs
    .filter((s) => s.active)
    .reduce((sum, s) => sum + monthlyCost(s), 0);
}
