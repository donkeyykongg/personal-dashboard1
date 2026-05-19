"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Reflection } from "@/lib/supabase/types";

export function ReflectionChart({ reflections }: { reflections: Reflection[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: Date; key: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: d, key: d.toISOString().slice(0, 10) });
  }

  const map = new Map<string, number>();
  reflections.forEach((r) => map.set(r.date, r.score));

  const data = days.map(({ date, key }) => ({
    label: format(date, "EEE d"),
    score: map.get(key) ?? null,
  }));

  const valid = data.filter((d) => d.score != null) as { label: string; score: number }[];
  const avg = valid.length ? valid.reduce((s, d) => s + d.score, 0) / valid.length : 0;
  const high = valid.length ? Math.max(...valid.map((d) => d.score)) : 0;
  const low = valid.length ? Math.min(...valid.map((d) => d.score)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reflection score (last 14 days)</CardTitle>
        <p className="text-xs text-muted-foreground">Based on your daily reflection scores.</p>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} width={28} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Avg {avg.toFixed(1)}/10 · High {high}/10 · Low {low}/10
        </p>
      </CardContent>
    </Card>
  );
}
