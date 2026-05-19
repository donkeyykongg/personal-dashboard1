import { CalendarClock, Layers, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { totalMonthly } from "@/lib/subscriptions";
import type { Subscription } from "@/lib/supabase/types";

export function SubscriptionSummary({ subscriptions }: { subscriptions: Subscription[] }) {
  const active = subscriptions.filter((s) => s.active);
  const monthly = totalMonthly(subscriptions);
  const yearly = monthly * 12;

  const items = [
    {
      label: "Total monthly",
      value: formatCurrency(monthly),
      icon: Wallet,
      hint: `${active.length} active`,
    },
    {
      label: "Projected yearly",
      value: formatCurrency(yearly),
      icon: CalendarClock,
      hint: "Annualised",
    },
    {
      label: "Subscriptions",
      value: subscriptions.length.toString(),
      icon: Layers,
      hint: `${subscriptions.length - active.length} paused`,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ label, value, icon: Icon, hint }) => (
        <div
          key={label}
          className="rounded-xl border bg-card px-5 py-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-mono text-3xl">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
      ))}
    </div>
  );
}
