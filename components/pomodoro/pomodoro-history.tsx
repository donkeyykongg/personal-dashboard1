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
import type { PomodoroSession } from "@/lib/supabase/types";
import styles from "./focus-page.module.css";

type Props = { sessions: PomodoroSession[] };

const COLORS = ["var(--rowan-accent, #6BE3A4)", "#7DD3FC", "#F2C063", "#B794F4", "#FF8A8A", "#14B8A6"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function heatLevel(minutes: number) {
  if (minutes <= 0) return styles.level0;
  if (minutes < 30) return styles.level1;
  if (minutes < 60) return styles.level2;
  if (minutes < 120) return styles.level3;
  return styles.level4;
}

type HeatDay = {
  key: string;
  date: Date;
  minutes: number;
  inMonth: boolean;
};

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function currentMonthWeeks(sessions: PomodoroSession[]) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));

  const minutes = new Map<string, number>();

  sessions
    .filter((s) => s.completed && (s.mode ?? "focus") === "focus")
    .forEach((s) => {
      const key = localDayKey(s.started_at);
      minutes.set(key, (minutes.get(key) ?? 0) + sessionMinutes(s));
    });

  const weeks: HeatDay[][] = [];
  let week: HeatDay[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    week.push({
      key,
      date: new Date(d),
      minutes: minutes.get(key) ?? 0,
      inMonth: d.getMonth() === now.getMonth(),
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  return weeks;
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

  const lastSeven = new Date();
  lastSeven.setDate(lastSeven.getDate() - 6);
  lastSeven.setHours(0, 0, 0, 0);
  const weekMinutes = completed
    .filter((s) => new Date(s.started_at) >= lastSeven && (s.mode ?? "focus") === "focus")
    .reduce((sum, s) => sum + sessionMinutes(s), 0);

  const heatWeeks = currentMonthWeeks(completed);
  const monthDays = heatWeeks.flat().filter((day) => day.inMonth);
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  let streak = 0;
  let skippedOpenToday = false;
  for (let i = monthDays.length - 1; i >= 0; i--) {
    if (monthDays[i].date > new Date()) continue;
    if (monthDays[i].minutes > 0) streak += 1;
    else if (monthDays[i].key === today && !skippedOpenToday) skippedOpenToday = true;
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
    ["Last 7 days", formatDuration(weekMinutes, durationUnit), "total focus"],
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
        <div className={`${styles.panel} p-5`}>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className={styles.eyebrow}>Activity heatmap</p>
              <h2 className="mt-1 text-xl font-semibold">Focus rhythm</h2>
              <p className="mt-1 font-mono text-xs text-[#B8B6B0]">{monthLabel}</p>
            </div>
            <p className="font-mono text-[11px] text-[#B8B6B0]">
              {monthDays.filter((d) => d.minutes > 0).length} active days
            </p>
          </div>

          <div className={styles.heatmapBoard}>
            <div className={styles.heatWeekHeader}>
              <span />
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
              <span />
            </div>
            <div className={styles.heatWeekStack}>
              {heatWeeks.map((week) => (
                <div key={week[0].key} className={styles.heatWeekRow}>
                  <span className={styles.heatDateLabel}>{shortDate(week[0].date)}</span>
                  {week.map((day) => (
                    <div
                      key={day.key}
                      title={`${day.date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}: ${day.minutes} focused min`}
                      className={`${styles.heatCell} ${heatLevel(day.minutes)} ${
                        day.key === today ? styles.todayCell : ""
                      } ${day.inMonth ? "" : styles.outsideMonthCell}`}
                    />
                  ))}
                  <span className={styles.heatDateLabel}>{shortDate(week[6].date)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.heatLegend} mt-5 flex items-center gap-2 text-xs text-[#B8B6B0]`}>
            <span>less</span>
            {[0, 20, 45, 90, 150].map((mins) => (
              <span key={mins} className={`${styles.heatCell} ${heatLevel(mins)}`} />
            ))}
            <span>more</span>
          </div>
        </div>

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
