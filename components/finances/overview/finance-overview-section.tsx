"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Minus, Repeat } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry, Subscription } from "@/lib/supabase/types";
import type { MonthlyFinancePoint } from "@/lib/finances";
import { FlowSummaryCards } from "@/components/finances/cash-flow/flow-summary-cards";

const PALETTE = [
  "#6BE3A4",
  "#F2C063",
  "#7DD3FC",
  "#FF8A8A",
  "#C4B5FD",
  "#F472B6",
  "#9CA3AF",
  "#FACC15",
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthlyEquivalentForSub(sub: Subscription): number {
  const amount = Number(sub.amount) || 0;
  if (sub.amount_type === "total") {
    if (!sub.paid_on || !sub.next_renewal) return 0;
    const start = new Date(`${sub.paid_on}T00:00`);
    const end = new Date(`${sub.next_renewal}T00:00`);
    const days = Math.max(1, (end.getTime() - start.getTime()) / 86_400_000);
    return amount * (30.44 / days);
  }
  if (sub.billing_cycle === "weekly") return amount * 4.345;
  if (sub.billing_cycle === "yearly") return amount / 12;
  return amount;
}

export function FinanceOverviewSection({
  monthly,
  expenses,
  income,
  subscriptions,
  netWorth,
}: {
  monthly: MonthlyFinancePoint[];
  expenses: FinanceEntry[];
  income: FinanceEntry[];
  subscriptions: Subscription[];
  netWorth: number;
}) {
  const { format } = useExchangeRates();

  const now = new Date();
  const currentMonth = monthKey(now);
  const prevMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // Subscription monthly burn (active only)
  const subscriptionBurn = useMemo(
    () =>
      subscriptions
        .filter((s) => s.active)
        .reduce((sum, s) => sum + monthlyEquivalentForSub(s), 0),
    [subscriptions]
  );

  // Category breakdown — current month, treats subscriptions as one synthetic category.
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    expenses
      .filter((e) => e.date.startsWith(currentMonth))
      .forEach((e) => {
        const key = (e.category || "Other").trim() || "Other";
        map.set(key, (map.get(key) ?? 0) + (Number(e.amount) || 0));
      });
    if (subscriptionBurn > 0) {
      map.set("Subscriptions", (map.get("Subscriptions") ?? 0) + subscriptionBurn);
    }
    const rows = Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { rows, total };
  }, [expenses, currentMonth, subscriptionBurn]);

  // Top merchants/items — last 90 days
  const topMerchants = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceKey = since.toISOString().slice(0, 10);
    const map = new Map<string, number>();
    expenses
      .filter((e) => e.date >= sinceKey)
      .forEach((e) => {
        const key = (e.item || e.category || "Other").trim() || "Other";
        map.set(key, (map.get(key) ?? 0) + (Number(e.amount) || 0));
      });
    return Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [expenses]);

  // Recurring vs one-time — current month
  const recurringSplit = useMemo(() => {
    let recurring = subscriptionBurn;
    let oneTime = 0;
    expenses
      .filter((e) => e.date.startsWith(currentMonth))
      .forEach((e) => {
        const amt = Number(e.amount) || 0;
        if (e.is_recurring) recurring += amt;
        else oneTime += amt;
      });
    return { recurring, oneTime, total: recurring + oneTime };
  }, [expenses, currentMonth, subscriptionBurn]);

  // Movers — current month vs previous month, by category, including subscriptions.
  const movers = useMemo(() => {
    const groupBy = (entries: FinanceEntry[], month: string) => {
      const map = new Map<string, number>();
      entries
        .filter((e) => e.date.startsWith(month))
        .forEach((e) => {
          const key = (e.category || "Other").trim() || "Other";
          map.set(key, (map.get(key) ?? 0) + (Number(e.amount) || 0));
        });
      return map;
    };
    const curr = groupBy(expenses, currentMonth);
    const prev = groupBy(expenses, prevMonth);
    const currSubs =
      monthly.find((m) => m.key === currentMonth)?.subscriptionExpenses ?? subscriptionBurn;
    const prevSubs = monthly.find((m) => m.key === prevMonth)?.subscriptionExpenses ?? 0;
    if (currSubs > 0) curr.set("Subscriptions", (curr.get("Subscriptions") ?? 0) + currSubs);
    if (prevSubs > 0) prev.set("Subscriptions", (prev.get("Subscriptions") ?? 0) + prevSubs);
    const labels = new Set([...curr.keys(), ...prev.keys()]);
    return Array.from(labels)
      .map((label) => {
        const c = curr.get(label) ?? 0;
        const p = prev.get(label) ?? 0;
        return { label, curr: c, prev: p, delta: c - p };
      })
      .filter((r) => Math.abs(r.delta) > 0.5)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [expenses, currentMonth, prevMonth, monthly, subscriptionBurn]);

  // 12-month net-worth projection — uses avg of last 3 months net cash flow.
  const projection = useMemo(() => {
    const tail = monthly.slice(-3);
    const avgNet =
      tail.length === 0
        ? 0
        : tail.reduce((sum, m) => sum + (m.net ?? m.income - m.expenses), 0) / tail.length;
    const points: { label: string; value: number }[] = [];
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    let running = netWorth;
    for (let i = 0; i <= 12; i += 1) {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + i);
      points.push({
        label: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
        value: running,
      });
      running += avgNet;
    }
    return { points, avgNet };
  }, [monthly, netWorth, now]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="rowan-eyebrow">Finance // Overview</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Where everything stands</h2>
        </div>
        <p className="rowan-eyebrow text-[#76746E]">
          Live · {now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>

      <FlowSummaryCards monthly={monthly} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CategoryDonut
          title="Spending by category — this month"
          rows={categoryBreakdown.rows}
          total={categoryBreakdown.total}
          format={format}
        />
        <HotspotList title="Top merchants — last 90 days" rows={topMerchants} format={format} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecurringSplit
          recurring={recurringSplit.recurring}
          oneTime={recurringSplit.oneTime}
          total={recurringSplit.total}
          format={format}
        />
        <MoverList rows={movers} format={format} />
      </div>

      <Projection points={projection.points} avgNet={projection.avgNet} format={format} />
    </div>
  );
}

function CategoryDonut({
  title,
  rows,
  total,
  format,
}: {
  title: string;
  rows: { label: string; amount: number }[];
  total: number;
  format: (n: number) => string;
}) {
  const segs = rows.slice(0, 8);
  const top = segs[0];
  const cx = 70;
  const cy = 70;
  const r = 56;
  const stroke = 18;

  let cumulative = 0;
  const arcs = segs.map((row, i) => {
    const fraction = total === 0 ? 0 : row.amount / total;
    const startAngle = cumulative * Math.PI * 2 - Math.PI / 2;
    const endAngle = (cumulative + fraction) * Math.PI * 2 - Math.PI / 2;
    cumulative += fraction;
    const large = fraction > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return {
      d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      color: PALETTE[i % PALETTE.length],
      row,
      fraction,
    };
  });

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-3 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        {title}
      </div>
      {rows.length === 0 || total === 0 ? (
        <div className="py-6 text-center text-[11px] italic text-[#76746E]">
          No outflows logged this month yet.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative h-[140px] w-[140px] shrink-0">
            <svg viewBox="0 0 140 140" className="h-full w-full" aria-hidden>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={stroke}
              />
              {arcs.map((arc, i) => (
                <path
                  key={i}
                  d={arc.d}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#76746E]">
                {top?.label.slice(0, 12) ?? "—"}
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white">
                {format(total)}
              </div>
            </div>
          </div>
          <ul className="flex-1 min-w-[180px] space-y-1.5">
            {arcs.map((arc, i) => (
              <li
                key={i}
                className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-[12px]"
              >
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: arc.color, boxShadow: `0 0 6px ${arc.color}80` }}
                />
                <span className="truncate text-white">{arc.row.label}</span>
                <span className="font-mono tabular-nums text-[#B8B6B0]">
                  {format(arc.row.amount)}
                  <span className="ml-1 text-[10px] text-[#76746E]">
                    {(arc.fraction * 100).toFixed(0)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HotspotList({
  title,
  rows,
  format,
}: {
  title: string;
  rows: { label: string; amount: number }[];
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-3 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-[11px] italic text-[#76746E]">
          No expenses in the last 90 days.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate font-semibold text-white">{r.label}</span>
                <span className="font-mono tabular-nums text-[#B8B6B0]">{format(r.amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-[#FF8A8A]"
                  style={{ width: `${Math.max(6, (r.amount / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecurringSplit({
  recurring,
  oneTime,
  total,
  format,
}: {
  recurring: number;
  oneTime: number;
  total: number;
  format: (n: number) => string;
}) {
  const recPct = total === 0 ? 0 : Math.round((recurring / total) * 100);
  const onePct = total === 0 ? 0 : 100 - recPct;
  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>Recurring vs one-time — this month</span>
        <span className="inline-flex items-center gap-1 text-[#F2C063]">
          <Repeat className="h-3 w-3" />
          {format(recurring)} locked in
        </span>
      </div>
      {total === 0 ? (
        <div className="py-6 text-center text-[11px] italic text-[#76746E]">
          Nothing this month yet.
        </div>
      ) : (
        <>
          <div className="flex h-4 overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className="h-full"
              style={{ width: `${recPct}%`, background: "#F2C063" }}
              title={`Recurring: ${format(recurring)}`}
            />
            <div
              className="h-full"
              style={{ width: `${onePct}%`, background: "#FF8A8A" }}
              title={`One-time: ${format(oneTime)}`}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Tile label="Recurring" amount={format(recurring)} pct={recPct} color="#F2C063" />
            <Tile label="One-time" amount={format(oneTime)} pct={onePct} color="#FF8A8A" />
          </div>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  amount,
  pct,
  color,
}: {
  label: string;
  amount: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.025] p-3">
      <div
        className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]"
        style={{ color }}
      >
        <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-white">{amount}</div>
      <div className="font-mono text-[10px] text-[#76746E]">{pct}% of outflow</div>
    </div>
  );
}

function MoverList({
  rows,
  format,
}: {
  rows: { label: string; curr: number; prev: number; delta: number }[];
  format: (n: number) => string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-3 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        What moved vs last month
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-[11px] italic text-[#76746E]">
          Need another month of data to spot movers.
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
                  {isUp ? "+" : "−"}
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

function Projection({
  points,
  avgNet,
  format,
}: {
  points: { label: string; value: number }[];
  avgNet: number;
  format: (n: number) => string;
}) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const W = 700;
  const H = 180;
  const xs = points.map((_, i) => (i / Math.max(1, points.length - 1)) * W);
  const ys = values.map((v) => H - ((v - min) / range) * (H - 20) - 10);
  const path = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)} ` +
    xs
      .slice(1)
      .map((x, i) => `L ${x.toFixed(1)} ${ys[i + 1].toFixed(1)}`)
      .join(" ");
  const area = `${path} L ${xs[xs.length - 1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`;
  const direction = avgNet > 0 ? "up" : avgNet < 0 ? "down" : "flat";
  const tone = direction === "up" ? "#6BE3A4" : direction === "down" ? "#FF8A8A" : "#7DD3FC";

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
            12-month net-worth projection
          </div>
          <p className="mt-1 text-[11px] text-[#76746E]">
            Straight-line from today using the avg net cash flow of the last 3 months.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#76746E]">
            Avg monthly net
          </div>
          <div
            className="mt-0.5 text-base font-bold tabular-nums"
            style={{ color: tone }}
          >
            {avgNet >= 0 ? "+" : "−"}
            {format(Math.abs(avgNet))}
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full" aria-hidden>
        <defs>
          <linearGradient id="proj-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity={0.28} />
            <stop offset="100%" stopColor={tone} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#proj-fill)" />
        <path
          d={path}
          fill="none"
          stroke={tone}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${tone})` }}
        />
        {/* Today marker */}
        <line
          x1={xs[0]}
          y1={0}
          x2={xs[0]}
          y2={H}
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="3 3"
        />
      </svg>

      <div className="mt-2 flex justify-between font-mono text-[9.5px] tracking-[0.14em] text-[#76746E]">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Now" amount={format(points[0]?.value ?? 0)} />
        <Stat label="6 months" amount={format(points[6]?.value ?? 0)} />
        <Stat
          label="12 months"
          amount={format(points[points.length - 1]?.value ?? 0)}
          accent={tone}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  amount,
  accent,
}: {
  label: string;
  amount: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.025] p-3">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#76746E]">
        {label}
      </div>
      <div
        className="mt-1 text-base font-bold tabular-nums"
        style={{ color: accent ?? "#FAFAFA" }}
      >
        {amount}
      </div>
    </div>
  );
}
