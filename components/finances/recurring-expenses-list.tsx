import { CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { RecurringFinanceEntry } from "@/lib/finances";

export function RecurringExpensesList({
  entries,
}: {
  entries: RecurringFinanceEntry[];
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Recurring expenses</h2>
        <span className="text-xs text-muted-foreground">next up</span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          Mark an expense as recurring to track the next upcoming charge.
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.slice(0, 6).map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.category}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {entry.nextDueDate} · {entry.recurring_interval ?? "monthly"}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-rose-600">
                {formatCurrency(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
