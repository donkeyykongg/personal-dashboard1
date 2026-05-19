"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { FinanceEntry } from "@/lib/supabase/types";

const COLORS = [
  "#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
  "#a855f7", "#eab308",
];

type Props = { expenses: FinanceEntry[] };

export function ExpenseBreakdownPie({ expenses }: Props) {
  const months = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.date.slice(0, 7)));
    return [...set].sort();
  }, [expenses]);

  const earliest = months[0] ?? "";
  const latest = months[months.length - 1] ?? "";
  const [from, setFrom] = useState(earliest);
  const [to, setTo] = useState(latest);
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!from || !to) return expenses;
    return expenses.filter((e) => {
      const m = e.date.slice(0, 7);
      return m >= from && m <= to;
    });
  }, [expenses, from, to]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      const key = e.subcategory ?? e.category ?? "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + (Number(e.amount) || 0));
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const drillItems = useMemo(() => {
    if (!drillCategory) return [];
    const map = new Map<string, number>();
    filtered
      .filter((e) => (e.subcategory ?? e.category) === drillCategory)
      .forEach((e) => {
        const key = e.item ?? "(no item)";
        map.set(key, (map.get(key) ?? 0) + (Number(e.amount) || 0));
      });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, drillCategory]);

  const data = drillCategory ? drillItems : byCategory;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-base uppercase tracking-wide text-muted-foreground">
            Where the money goes
          </CardTitle>
          {drillCategory && (
            <button
              onClick={() => setDrillCategory(null)}
              className="mt-1 text-xs text-primary hover:underline"
            >
              ← Back to all categories
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-muted-foreground">
            From
            <input
              type="month"
              value={from}
              min={earliest}
              max={to || latest}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs text-muted-foreground">
            To
            <input
              type="month"
              value={to}
              min={from || earliest}
              max={latest}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No expenses in this range yet.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    onClick={(entry) => {
                      if (!drillCategory) setDrillCategory(entry.name as string);
                    }}
                  >
                    {data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} cursor="pointer" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n: string) => [formatCurrency(v), n]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 overflow-auto text-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                {drillCategory ? `Items in ${drillCategory}` : "Click a slice to drill in"}
              </p>
              {data.map((d, idx) => (
                <button
                  key={d.name}
                  onClick={() => {
                    if (!drillCategory) setDrillCategory(d.name);
                  }}
                  disabled={!!drillCategory}
                  className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left disabled:cursor-default hover:bg-accent disabled:hover:bg-background"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    {d.name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(d.value)}{" "}
                    <span className="text-xs">
                      ({total ? Math.round((d.value / total) * 100) : 0}%)
                    </span>
                  </span>
                </button>
              ))}
              <div className="mt-3 flex justify-between rounded-md bg-muted/30 px-3 py-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
