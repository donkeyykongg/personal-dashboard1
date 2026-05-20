import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Subscription } from "@/lib/supabase/types";

type Props = { subscriptions: Subscription[]; horizon?: number };

function nextRenewalDate(iso: string, cycle: string, today: Date): Date | null {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso;
  const d = new Date(safe);
  if (isNaN(d.getTime())) return null;
  let safety = 0;
  while (d < today && safety++ < 600) {
    if (cycle === "weekly") d.setDate(d.getDate() + 7);
    else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function RenewalAlerts({ subscriptions, horizon = 7 }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alerts = subscriptions
    .filter((s) => s.active && s.next_renewal)
    .map((s) => {
      const due = nextRenewalDate(s.next_renewal!, s.billing_cycle, today);
      if (!due) return null;
      const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
      return { sub: s, due, days };
    })
    .filter((a): a is { sub: Subscription; due: Date; days: number } => a !== null)
    .filter((a) => a.days <= horizon)
    .sort((a, b) => a.days - b.days);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="rowan-eyebrow">Heads-up</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Renewing in next {horizon} days
          </h2>
        </div>
        <Link
          href="/finances?tab=subscriptions"
          className="flex items-center gap-1 text-xs text-[#B8B6B0] hover:text-white"
        >
          All subscriptions <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="rowan-panel border-dashed p-6 text-center text-sm text-[#B8B6B0]">
          Nothing renewing in the next {horizon} days.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map(({ sub, due, days }) => (
            <li
              key={sub.id}
              className="rowan-panel flex items-center justify-between gap-3 p-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    days <= 1
                      ? "bg-[#FF8A8A]/10 text-[#FF8A8A]"
                      : days <= 3
                      ? "bg-[#F2C063]/10 text-[#F2C063]"
                      : "bg-[#7DD3FC]/10 text-[#7DD3FC]"
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{sub.name}</p>
                  <p className="text-xs text-[#B8B6B0]">
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
              <p className="font-mono text-lg text-white">{formatCurrency(sub.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
