"use client";

import { useMemo } from "react";
import type { JournalEntry } from "@/lib/supabase/types";

type Props = {
  entries: JournalEntry[];
};

function buildLast30Days(): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function JournalStats({ entries }: Props) {
  const days = useMemo(buildLast30Days, []);

  const stats = useMemo(() => {
    const perDay = new Map<string, number>();
    days.forEach((d) => perDay.set(d, 0));
    let app = 0;
    let tg = 0;
    let totalLen = 0;
    let activeDays = 0;
    const perHour = new Array(24).fill(0) as number[];

    entries.forEach((e) => {
      const key = e.date;
      if (perDay.has(key)) {
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
      }
      if (e.source === "telegram") tg += 1;
      else app += 1;
      totalLen += e.content.length;
      const h = new Date(e.created_at).getHours();
      perHour[h] += 1;
    });

    perDay.forEach((v) => {
      if (v > 0) activeDays += 1;
    });

    const counts = days.map((d) => perDay.get(d) ?? 0);
    const max = Math.max(1, ...counts);
    const avgLen = entries.length > 0 ? Math.round(totalLen / entries.length) : 0;

    // Build daily streak (consecutive trailing days with ≥1 entry, walking backward from today)
    let streak = 0;
    for (let i = counts.length - 1; i >= 0; i--) {
      if (counts[i] > 0) streak += 1;
      else break;
    }

    return { counts, max, app, tg, avgLen, activeDays, perHour, streak };
  }, [entries, days]);

  const total = entries.length;
  const sourceTotal = stats.app + stats.tg;
  const appPct = sourceTotal === 0 ? 0 : Math.round((stats.app / sourceTotal) * 100);
  const tgPct = sourceTotal === 0 ? 0 : 100 - appPct;
  const peakHour = stats.perHour.indexOf(Math.max(...stats.perHour));
  const peakLabel =
    stats.perHour[peakHour] > 0
      ? `${peakHour % 12 || 12}${peakHour < 12 ? "am" : "pm"}`
      : "—";

  return (
    <div className="rowan-panel space-y-4 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="rowan-eyebrow">Journal // Stats</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Last 30 days</h2>
        </div>
        <p className="rowan-eyebrow text-[#76746E]">{total} ENTRIES</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={String(total)} />
        <Stat label="Active days" value={`${stats.activeDays}/30`} />
        <Stat label="Avg length" value={`${stats.avgLen}c`} />
        <Stat
          label="Daily streak"
          value={`${stats.streak}d`}
          accent={stats.streak > 0}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="rowan-eyebrow">Entries per day</p>
          <p className="rowan-eyebrow text-[#76746E]">PEAK {peakLabel}</p>
        </div>
        <div className="flex h-24 items-end gap-[3px] rounded-lg bg-white/[0.02] p-2">
          {stats.counts.map((c, i) => {
            const date = days[i];
            const heightPct = c === 0 ? 4 : Math.max(8, (c / stats.max) * 100);
            const active = c > 0;
            return (
              <div
                key={date}
                title={`${date} — ${c} entr${c === 1 ? "y" : "ies"}`}
                className="flex-1 rounded-sm transition-colors"
                style={{
                  height: `${heightPct}%`,
                  background: active
                    ? "var(--rowan-accent, #6BE3A4)"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: active
                    ? "0 0 8px color-mix(in srgb, var(--rowan-accent, #6BE3A4) 35%, transparent)"
                    : "none",
                  minHeight: "4px",
                }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9.5px] tracking-[0.14em] text-[#76746E]">
          <span>{formatShort(days[0])}</span>
          <span>{formatShort(days[Math.floor(days.length / 2)])}</span>
          <span>TODAY</span>
        </div>
      </div>

      <div>
        <p className="rowan-eyebrow mb-2">Source mix</p>
        {sourceTotal === 0 ? (
          <p className="text-xs italic text-[#76746E]">No entries yet.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full"
                style={{ width: `${appPct}%`, background: "rgba(255,255,255,0.4)" }}
                title={`App: ${stats.app}`}
              />
              <div
                className="h-full"
                style={{
                  width: `${tgPct}%`,
                  background: "var(--rowan-accent, #6BE3A4)",
                }}
                title={`Telegram: ${stats.tg}`}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#B8B6B0]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                APP {stats.app} ({appPct}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--rowan-accent, #6BE3A4)" }}
                />
                TG {stats.tg} ({tgPct}%)
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/[0.025] p-3">
      <p className="rowan-eyebrow text-[#76746E]">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight ${
          accent ? "text-[var(--rowan-accent,#6BE3A4)]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatShort(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}
