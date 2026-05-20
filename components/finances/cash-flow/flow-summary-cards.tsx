"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { MonthlyFinancePoint } from "@/lib/finances";

type Delta = { pct: number | null; abs: number; dir: "up" | "down" | "flat" };

function delta(curr: number, prev: number): Delta {
  const abs = curr - prev;
  if (prev <= 0.005 && curr <= 0.005) return { pct: null, abs: 0, dir: "flat" };
  if (prev <= 0.005) return { pct: null, abs, dir: abs > 0 ? "up" : "flat" };
  const pct = (abs / prev) * 100;
  const dir: Delta["dir"] = Math.abs(pct) < 1 ? "flat" : pct > 0 ? "up" : "down";
  return { pct, abs, dir };
}

export function FlowSummaryCards({ monthly }: { monthly: MonthlyFinancePoint[] }) {
  const { format } = useExchangeRates();
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const inflow = last?.income ?? 0;
  const outflow = last?.expenses ?? 0;
  const inflowDelta = delta(inflow, prev?.income ?? 0);
  const outflowDelta = delta(outflow, prev?.expenses ?? 0);

  const recent = monthly.slice(-3);
  const W = 100;
  const H = 28;
  const maxIn = Math.max(1, ...recent.map((m) => m.income));
  const maxOut = Math.max(1, ...recent.map((m) => m.expenses));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <SummaryCard
        label="Inflow this month"
        amount={format(inflow)}
        color="#6BE3A4"
        delta={inflowDelta}
        deltaIsGood={(d) => d.dir === "up"}
        formatAbs={(n) => format(n)}
        sparkPath={recent.map((m, i) => ({
          x: (i / Math.max(1, recent.length - 1)) * W,
          y: H - (m.income / maxIn) * H,
        }))}
      />
      <SummaryCard
        label="Outflow this month"
        amount={format(outflow)}
        color="#FF8A8A"
        delta={outflowDelta}
        deltaIsGood={(d) => d.dir === "down"}
        formatAbs={(n) => format(n)}
        sparkPath={recent.map((m, i) => ({
          x: (i / Math.max(1, recent.length - 1)) * W,
          y: H - (m.expenses / maxOut) * H,
        }))}
      />
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  color,
  delta: d,
  deltaIsGood,
  formatAbs,
  sparkPath,
}: {
  label: string;
  amount: string;
  color: string;
  delta: Delta;
  deltaIsGood: (d: Delta) => boolean;
  formatAbs: (n: number) => string;
  sparkPath: { x: number; y: number }[];
}) {
  const path = sparkPath.length
    ? "M" + sparkPath.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")
    : "";
  const good = d.dir !== "flat" && deltaIsGood(d);
  const bad = d.dir !== "flat" && !deltaIsGood(d);
  const deltaColor = good ? "#6BE3A4" : bad ? "#FF8A8A" : "#76746E";
  const Icon = d.dir === "up" ? ArrowUp : d.dir === "down" ? ArrowDown : Minus;
  const deltaLabel =
    d.dir === "flat"
      ? "flat vs last month"
      : `${d.pct == null ? "" : `${d.pct > 0 ? "+" : ""}${d.pct.toFixed(0)}%`} (${
          d.abs > 0 ? "+" : "−"
        }${formatAbs(Math.abs(d.abs))}) vs last month`;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-3">
        <div className="text-3xl font-bold leading-tight text-white">{amount}</div>
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-24" aria-hidden>
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
      </div>
      <div
        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums"
        style={{ color: deltaColor }}
      >
        <Icon className="h-3 w-3" />
        <span>{deltaLabel}</span>
      </div>
    </div>
  );
}
