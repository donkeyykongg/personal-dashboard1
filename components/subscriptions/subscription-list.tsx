"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Pause, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBadge } from "./category-badge";
import { SubscriptionForm } from "./subscription-form";
import { CYCLE_LABEL, daysUntil, nextBillingDate } from "@/lib/subscriptions";
import { formatCurrency, cn } from "@/lib/utils";
import type { Subscription } from "@/lib/supabase/types";

const WARNING_DAYS = 5;

export function SubscriptionList({ subscriptions }: { subscriptions: Subscription[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const rows = useMemo(() => {
    const now = new Date();
    return subscriptions
      .map((s) => {
        const next = nextBillingDate(s.billing_date, s.billing_cycle, now);
        return { sub: s, next, days: daysUntil(next, now) };
      })
      .sort((a, b) => a.next.getTime() - b.next.getTime());
  }, [subscriptions]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(s: Subscription) {
    setEditing(s);
    setOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Subscriptions</CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New subscription
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              No subscriptions yet. Add your first one to start tracking.
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map(({ sub, next, days }) => {
                const warn = sub.active && days <= WARNING_DAYS;
                return (
                  <li
                    key={sub.id}
                    className={cn(
                      "flex items-center justify-between gap-4 py-3 px-2 -mx-2 rounded-md transition-colors",
                      warn && "bg-amber-50/70 dark:bg-amber-950/30",
                      !sub.active && "opacity-60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{sub.name}</span>
                        <CategoryBadge category={sub.category} />
                        {!sub.active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            <Pause className="h-3 w-3" /> Paused
                          </span>
                        )}
                        {warn && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            {days <= 0 ? "Due today" : `${days}d`}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {CYCLE_LABEL[sub.billing_cycle]} · next {format(next, "MMM d")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">
                          {formatCurrency(sub.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          per {sub.billing_cycle.replace(/ly$/, "")}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(sub)}
                        aria-label={`Edit ${sub.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <SubscriptionForm open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
