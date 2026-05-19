"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyCashFlow } from "@/lib/supabase/types";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function CashFlowChart({ statements }: { statements: MonthlyCashFlow[] }) {
  const sorted = useMemo(
    () => [...statements].sort((a, b) => a.month.localeCompare(b.month)),
    [statements]
  );

  const earliest = sorted[0]?.month ?? "";
  const latest = sorted[sorted.length - 1]?.month ?? "";

  const [fromMonth, setFromMonth] = useState(earliest);
  const [toMonth, setToMonth] = useState(latest);

  useEffect(() => {
    if (!fromMonth && earliest) setFromMonth(earliest);
    if (!toMonth && latest) setToMonth(latest);
  }, [earliest, latest, fromMonth, toMonth]);

  const sliced = useMemo(() => {
    if (!fromMonth || !toMonth) return sorted;
    return sorted.filter((s) => s.month >= fromMonth && s.month <= toMonth);
  }, [sorted, fromMonth, toMonth]);

  const data = sliced.map((s) => ({
    month: monthLabel(s.month),
    revenue: s.revenue,
    expenses: s.expenses,
    profit: s.revenue - s.expenses,
  }));

  const totals = sliced.reduce(
    (acc, s) => {
      acc.revenue += s.revenue;
      acc.expenses += s.expenses;
      return acc;
    },
    { revenue: 0, expenses: 0 }
  );
  const net = totals.revenue - totals.expenses;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-base uppercase tracking-wide text-muted-foreground">
          Revenue and expense trend
        </CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-muted-foreground">
            From
            <input
              type="month"
              value={fromMonth}
              min={earliest}
              max={toMonth || latest}
              onChange={(e) => setFromMonth(e.target.value)}
              className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs text-muted-foreground">
            To
            <input
              type="month"
              value={toMonth}
              min={fromMonth || earliest}
              max={latest}
              onChange={(e) => setToMonth(e.target.value)}
              className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setFromMonth(earliest);
              setToMonth(latest);
            }}
            className="h-9 self-end rounded-md border px-3 text-xs hover:bg-accent"
          >
            Reset
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-72">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No data in this range yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={48}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total ({fromMonth || "…"} → {toMonth || "…"})
            </p>
            <p className="text-xs text-muted-foreground">{sliced.length} months</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Revenue" value={totals.revenue} tone="text-blue-600" />
            <Stat label="Expenses" value={totals.expenses} tone="text-amber-600" />
            <Stat
              label="Net"
              value={net}
              tone={net >= 0 ? "text-emerald-600" : "text-rose-600"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{formatCurrency(value)}</p>
    </div>
  );
}
