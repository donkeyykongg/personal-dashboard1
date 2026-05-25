"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonthlyActivityHeatmap } from "@/components/activity/monthly-activity-heatmap";
import type { PomodoroSession } from "@/lib/supabase/types";
import styles from "./focus-page.module.css";

type Props = { sessions: PomodoroSession[] };

const COLORS = ["var(--rowan-accent, #6BE3A4)", "#7DD3FC", "#F2C063", "#B794F4", "#FF8A8A", "#14B8A6"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDayKey(iso: string) {
  return dayKey(new Date(iso));
}

function sessionMinutes(session: PomodoroSession) {
  return Number(session.minutes) || 0;
}

function formatDuration(minutes: number, unit: "minutes" | "hours") {
  if (unit === "minutes") return `${minutes}m`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function AllocationEmptyRing() {
  return (
    <div className={styles.allocationRingBox}>
      <svg viewBox="0 0 220 220" className="h-full w-full">
        <circle
          cx="110"
          cy="110"
          r="88"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="10"
        />
      </svg>
      <div className={styles.allocationCenter}>
        <div className={styles.allocationPct}>0%</div>
        <div className={styles.allocationLabel}>0/0 focus</div>
      </div>
    </div>
  );
}

export function PomodoroHistory({ sessions }: Props) {
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");
  const completed = sessions.filter((s) => s.completed);
  const today = dayKey(new Date());
  const todaySessions = completed.filter((s) => localDayKey(s.started_at) === today);
  const focusSessionsToday = todaySessions.filter((s) => (s.mode ?? "focus") === "focus");
  const focusToday = focusSessionsToday.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const breakToday = todaySessions
    .filter((s) => s.mode === "break")
    .reduce((sum, s) => sum + sessionMinutes(s), 0);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekMinutes = completed
    .filter((s) => new Date(s.started_at) >= weekStart && (s.mode ?? "focus") === "focus")
    .reduce((sum, s) => sum + sessionMinutes(s), 0);

  const monthFocusValues = completed
    .filter((s) => (s.mode ?? "focus") === "focus")
    .map((s) => ({ date: localDayKey(s.started_at), value: sessionMinutes(s) }));
  const monthFocusByDate = new Map<string, number>();
  monthFocusValues.forEach(({ date, value }) => {
    monthFocusByDate.set(date, (monthFocusByDate.get(date) ?? 0) + value);
  });
  let streak = 0;
  let skippedOpenToday = false;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  for (let d = new Date(cursor); d >= firstOfMonth; d.setDate(d.getDate() - 1)) {
    const key = dayKey(d);
    const minutes = monthFocusByDate.get(key) ?? 0;
    if (minutes > 0) streak += 1;
    else if (key === today && !skippedOpenToday) skippedOpenToday = true;
    else break;
  }

  const allocationMap = new Map<string, number>();
  focusSessionsToday.forEach((s) => {
    const key = s.activity_category || "Focus";
    allocationMap.set(key, (allocationMap.get(key) ?? 0) + sessionMinutes(s));
  });
  const allocation = [...allocationMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    label: `${hour}:00`,
    minutes: 0,
  }));
  focusSessionsToday.forEach((s) => {
    hourly[new Date(s.started_at).getHours()].minutes += sessionMinutes(s);
  });
  const visibleHours = hourly.slice(6, 23);

  const stats = [
    ["Focused today", formatDuration(focusToday, durationUnit), `${focusSessionsToday.length} focus sessions`],
    ["Breaks", formatDuration(breakToday, durationUnit), "recovery"],
    ["This week", formatDuration(weekMinutes, durationUnit), "since Monday"],
    ["Streak", `${streak}d`, "current month"],
  ];

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(["minutes", "hours"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setDurationUnit(unit)}
              className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                durationUnit === unit ? "bg-white/10 text-white" : "text-[#B8B6B0] hover:text-white"
              }`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <div key={label} className={`${styles.panel} p-4`}>
            <p className={styles.eyebrow}>{label}</p>
            <p className={styles.statValue}>{value}</p>
            <p className="text-xs text-[#B8B6B0]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <MonthlyActivityHeatmap
          title="Focus rhythm"
          values={monthFocusValues}
          valueLabel="focused minute"
          thresholds={[30, 60, 120, 180]}
        />

        <div className={`${styles.panel} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className={styles.eyebrow}>Today&apos;s allocation</p>
              <h2 className="mt-1 text-xl font-semibold">Where focus went</h2>
            </div>
            <p className="font-mono text-[11px] text-[#B8B6B0]">
              {formatDuration(focusToday, durationUnit)}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
            <div className="flex min-h-64 items-center justify-center">
              {allocation.length === 0 ? (
                <AllocationEmptyRing />
              ) : (
                <div className={styles.allocationRingBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={88}
                        outerRadius={102}
                        paddingAngle={3}
                      >
                        {allocation.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [formatDuration(value, durationUnit), name]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "#050506",
                          color: "#FAFAFA",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.allocationCenter}>
                    <div className={styles.allocationPct}>100%</div>
                    <div className={styles.allocationLabel}>
                      {focusSessionsToday.length}/{focusSessionsToday.length} focus
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {allocation.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 px-3 py-8 text-center text-sm italic text-[#B8B6B0]">
                  Complete a focus session to build today&apos;s allocation.
                </div>
              ) : (
                allocation.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg bg-white/[0.025] px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono text-[#B8B6B0]">
                      {formatDuration(item.value, durationUnit)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.panel} p-5`}>
        <p className={styles.eyebrow}>Focus levels throughout the day</p>
        <div className="mt-4 h-72">
          {focusSessionsToday.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm italic text-[#B8B6B0]">
              Complete a session to build today&apos;s timeline.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visibleHours} margin={{ top: 12, right: 24, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#FAFAFA" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#FAFAFA" }}
                  tickFormatter={(v) => formatDuration(Number(v), durationUnit)}
                />
                <Tooltip
                  formatter={(value: number) => [formatDuration(value, durationUnit), "Focus"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "#050506",
                    color: "#FAFAFA",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--rowan-accent, #6BE3A4)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--rowan-accent, #6BE3A4)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={`${styles.panel} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <p className={styles.eyebrow}>Recent activity</p>
          <p className="font-mono text-[11px] text-[#B8B6B0]">
            {sessions.length} event{sessions.length === 1 ? "" : "s"}
          </p>
        </div>
        {sessions.length === 0 ? (
          <p className="py-5 text-center text-sm italic text-[#B8B6B0]">No sessions logged yet.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {sessions.slice(0, 16).map((session) => (
              <li
                key={session.id}
                className="grid grid-cols-[4px_1fr_auto_auto] items-center gap-3 rounded-lg bg-white/[0.025] px-3 py-2"
              >
                <span
                  className="h-7 w-1 rounded-sm bg-[var(--rowan-accent)]"
                  style={{
                    boxShadow:
                      "0 0 8px color-mix(in srgb, var(--rowan-accent, #6BE3A4) 55%, transparent)",
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {session.activity_label || "Focus"}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#B8B6B0]">
                    {session.activity_category || "Focus"} · {session.mode ?? "focus"}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-[var(--rowan-accent)]">
                  {formatDuration(sessionMinutes(session), durationUnit)}
                </span>
                <span className="font-mono text-[11px] text-[#B8B6B0]">
                  {fmtTime(session.started_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
