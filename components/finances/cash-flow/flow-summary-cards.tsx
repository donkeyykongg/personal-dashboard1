"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { MonthlyFinancePoint } from "@/lib/finances";

export function FlowSummaryCards({ monthly }: { monthly: MonthlyFinancePoint[] }) {
  const { format } = useExchangeRates();
  const last = monthly[monthly.length - 1];
  const inflow = last?.income ?? 0;
  const outflow = last?.expenses ?? 0;

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
        sparkPath={recent.map((m, i) => ({
          x: (i / Math.max(1, recent.length - 1)) * W,
          y: H - (m.income / maxIn) * H,
        }))}
      />
      <SummaryCard
        label="Outflow this month"
        amount={format(outflow)}
        color="#FF8A8A"
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
  sparkPath,
}: {
  label: string;
  amount: string;
  color: string;
  sparkPath: { x: number; y: number }[];
}) {
  const d = sparkPath.length
    ? "M" + sparkPath.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")
    : "";
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-3">
        <div className="text-3xl font-bold leading-tight text-white">{amount}</div>
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-24" aria-hidden>
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.04em] text-[#76746E]">
        last 3 months
      </div>
    </div>
  );
}
