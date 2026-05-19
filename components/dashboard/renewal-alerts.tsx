import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { daysUntil, nextBillingDate } from "@/lib/subscriptions";
import type { Subscription } from "@/lib/supabase/types";

type Props = { subscriptions: Subscription[]; horizon?: number };

export function RenewalAlerts({ subscriptions, horizon = 7 }: Props) {
  const today = new Date();
  const alerts = subscriptions
    .filter((s) => s.active)
    .map((s) => {
      const due = nextBillingDate(s.billing_date, s.billing_cycle, today);
      return { sub: s, due, days: daysUntil(due, today) };
    })
    .filter((a) => a.days <= horizon)
    .sort((a, b) => a.days - b.days);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Heads-up
          </p>
          <h2 className="text-xl">Renewing in next {horizon} days</h2>
        </div>
        <Link
          href="/subscriptions"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          All subscriptions <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Nothing renewing in the next {horizon} days.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map(({ sub, due, days }) => (
            <li
              key={sub.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    days <= 1
                      ? "bg-rose-100 text-rose-700"
                      : days <= 3
                      ? "bg-amber-100 text-amber-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {due.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                  </p>
                </div>
              </div>
              <p className="font-mono text-lg">{formatCurrency(sub.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
