"use client";

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

export type MonthlyPoint = {
  month: string; // "Jan 2026"
  income: number;
  expenses: number;
  net?: number;
};

export function IncomeVsExpensesChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Month-by-month cash flow and expenses</CardTitle>
      </CardHeader>
      <CardContent className="h-[28rem]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No income or expense entries yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                }
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="income"
                name="Inflows"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net cash flow"
                stroke="#7dd3fc"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
