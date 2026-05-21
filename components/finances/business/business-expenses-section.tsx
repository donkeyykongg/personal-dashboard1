"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry } from "@/lib/supabase/types";
import { BusinessCategoryDonut } from "./business-category-donut";

type BizActivity = FinanceEntry & { direction: "in" | "out" };

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isThisMonth(date: string): boolean {
  return date.startsWith(monthKey(new Date()));
}

function isThisYear(date: string): boolean {
  return new Date(`${date}T00:00`).getFullYear() === new Date().getFullYear();
}

function total(entries: FinanceEntry[]) {
  return entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
}

function groupBy(entries: FinanceEntry[], keyFor: (entry: FinanceEntry) => string) {
  const out = new Map<string, number>();
  entries.forEach((entry) => {
    const key = keyFor(entry).trim() || "Uncategorized";
    out.set(key, (out.get(key) ?? 0) + (Number(entry.amount) || 0));
  });
  return Array.from(out.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function monthDeltaByCategory(expenses: FinanceEntry[]) {
  const now = new Date();
  const current = monthKey(now);
  const previous = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const currentGroups = groupBy(
    expenses.filter((entry) => entry.date.startsWith(current)),
    (entry) => entry.category
  );
  const previousGroups = groupBy(
    expenses.filter((entry) => entry.date.startsWith(previous)),
    (entry) => entry.category
  );
  const previousMap = new Map(previousGroups.map((entry) => [entry.label, entry.amount]));
  const labels = new Set([...currentGroups.map((entry) => entry.label), ...previousMap.keys()]);

  return Array.from(labels)
    .map((label) => {
      const curr = currentGroups.find((entry) => entry.label === label)?.amount ?? 0;
      const prev = previousMap.get(label) ?? 0;
      return { label, curr, prev, delta: curr - prev };
    })
    .filter((entry) => Math.abs(entry.delta) > 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function BusinessExpensesSection({
  income,
  expenses,
}: {
  income: FinanceEntry[];
  expenses: FinanceEntry[];
}) {
  const { format } = useExchangeRates();
  const monthIncome = total(income.filter((entry) => isThisMonth(entry.date)));
  const monthExpenses = total(expenses.filter((entry) => isThisMonth(entry.date)));
  const monthNet = monthIncome - monthExpenses;
  const ytdSpend = total(expenses.filter((entry) => isThisYear(entry.date)));
  const categoryHotspots = groupBy(expenses, (entry) => entry.category).slice(0, 6);
  const sourceHotspots = groupBy(expenses, (entry) => entry.item || entry.category).slice(0, 6);
  const movers = monthDeltaByCategory(expenses).slice(0, 6);
  const activity: BizActivity[] = [
    ...income.map((entry) => ({ ...entry, direction: "in" as const })),
    ...expenses.map((entry) => ({ ...entry, direction: "out" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="rowan-eyebrow">Biz</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Side-project cash flow</h2>
        </div>
        <div className="text-xs text-[#76746E]">
          Entries marked <span className="font-semibold text-[#B8B6B0]">Biz</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BizMetric label="Biz inflow this month" amount={format(monthIncome)} tone="good" />
        <BizMetric label="Biz outflow this month" amount={format(monthExpenses)} tone="bad" />
        <BizMetric
          label="Net Biz cash flow"
          amount={format(monthNet)}
          tone={monthNet >= 0 ? "good" : "bad"}
        />
        <BizMetric label="YTD Biz spend" amount={format(ytdSpend)} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <BusinessCategoryDonut entries={expenses} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <HotspotList title="Top expense categories" rows={categoryHotspots} />
          <HotspotList title="Top sources / merchants" rows={sourceHotspots} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <MoverList rows={movers} />
        <RecentActivity entries={activity} />
      </div>
    </div>
  );
}

function BizMetric({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: string;
  tone: "good" | "bad" | "neutral";
}) {
  const color = tone === "good" ? "#6BE3A4" : tone === "bad" ? "#FF8A8A" : "#7DD3FC";
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
        {label}
      </div>
      <div className="mt-0.5 text-3xl font-bold leading-tight text-white">{amount}</div>
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.05]">
        <div className="h-full w-2/3 rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}

function HotspotList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; amount: number }[];
}) {
  const { format } = useExchangeRates();
  const max = Math.max(1, ...rows.map((row) => row.amount));

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="py-3 text-center text-[11px] italic text-[#76746E]">
          No Biz expenses yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate font-semibold text-white">{row.label}</span>
                <span className="font-mono text-[#B8B6B0]">{format(row.amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-[#FF8A8A]"
                  style={{ width: `${Math.max(6, (row.amount / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MoverList({ rows }: { rows: { label: string; curr: number; prev: number; delta: number }[] }) {
  const { format } = useExchangeRates();

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        What moved vs last month
      </div>
      {rows.length === 0 ? (
        <div className="py-3 text-center text-[11px] italic text-[#76746E]">
          Add another month of Biz expenses to see movers.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => {
            const isUp = row.delta > 0;
            const Icon = isUp ? ArrowUp : row.delta < 0 ? ArrowDown : Minus;
            const color = isUp ? "#FF8A8A" : "#6BE3A4";
            return (
              <li
                key={row.label}
                className="grid grid-cols-[16px_1fr_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12px]"
                style={{ color }}
              >
                <Icon className="h-3.5 w-3.5" />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{row.label}</div>
                  <div className="font-mono text-[10px] text-[#76746E]">
                    {format(row.curr)} vs {format(row.prev)}
                  </div>
                </div>
                <span className="font-mono font-bold tabular-nums">
                  {isUp ? "+" : "-"}
                  {format(Math.abs(row.delta))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecentActivity({ entries }: { entries: BizActivity[] }) {
  const { format } = useExchangeRates();

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        Recent Biz activity
      </div>
      {entries.length === 0 ? (
        <div className="py-3 text-center text-[11px] italic text-[#76746E]">
          Mark cash-flow entries as Biz to see them here.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {entries.slice(0, 20).map((entry) => {
            const isInflow = entry.direction === "in";
            const color = isInflow ? "#6BE3A4" : "#FF8A8A";
            return (
              <li
                key={`${entry.direction}-${entry.id}`}
                className="grid grid-cols-[4px_1fr_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px]"
                style={{ color }}
              >
                <span className="h-6 w-1 rounded-sm" style={{ background: color }} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-white">
                    {entry.item || entry.category}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-[#76746E]">
                    {entry.category}
                  </div>
                </div>
                <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums">
                  {isInflow ? "+" : "-"}
                  {format(Number(entry.amount) || 0)}
                </span>
                <span className="whitespace-nowrap font-mono text-[10px] text-[#76746E]">
                  {entry.date.slice(5)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
