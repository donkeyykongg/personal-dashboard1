"use client";

import { useEffect, useState } from "react";

type Row = { label: string; pct: number; detail: string };

function computeRows(now: Date): Row[] {
  const ms = now.getTime();

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayPct = ((ms - dayStart.getTime()) / (24 * 3600_000)) * 100;

  const dow = (now.getDay() + 6) % 7; // Mon = 0
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - dow);
  const weekPct = ((ms - weekStart.getTime()) / (7 * 24 * 3600_000)) * 100;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthPct = ((ms - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime())) * 100;

  const q = Math.floor(now.getMonth() / 3);
  const qStart = new Date(now.getFullYear(), q * 3, 1);
  const qEnd = new Date(now.getFullYear(), q * 3 + 3, 1);
  const qPct = ((ms - qStart.getTime()) / (qEnd.getTime() - qStart.getTime())) * 100;

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const yearPct = ((ms - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())) * 100;

  return [
    { label: "Day", pct: dayPct, detail: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) },
    { label: "Week", pct: weekPct, detail: now.toLocaleDateString("en-US", { weekday: "long" }) },
    { label: "Month", pct: monthPct, detail: now.toLocaleDateString("en-US", { month: "long" }) },
    { label: "Quarter", pct: qPct, detail: `Q${q + 1}` },
    { label: "Year", pct: yearPct, detail: String(now.getFullYear()) },
  ];
}

export function TimeProgress() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="h-32 animate-pulse rounded-md bg-muted/40" />
      </div>
    );
  }

  const rows = computeRows(now);

  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Today</p>
          <h2 className="text-3xl font-medium">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
        </div>
        <p className="text-3xl font-mono tabular-nums">
          {now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-4">
            <div className="relative flex-1 overflow-hidden rounded-full border bg-background">
              <div
                className="h-7 rounded-full bg-foreground/85 transition-[width] duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, r.pct))}%` }}
              />
            </div>
            <div className="w-32 shrink-0 text-sm">
              <span className="font-medium">{r.label}: {r.pct.toFixed(0)}%</span>
              <span className="block text-xs text-muted-foreground">{r.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
