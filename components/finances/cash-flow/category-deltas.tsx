"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";

export type CategoryDelta = {
  category: string;
  curr: number;
  prev: number;
  abs: number;
};

export function CategoryDeltas({ deltas }: { deltas: CategoryDelta[] }) {
  const { format } = useExchangeRates();
  const movers = deltas.filter((d) => Math.abs(d.abs) > 0.5).slice(0, 6);

  if (movers.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.025] p-4 text-[11px] italic text-[#76746E]">
        Not enough history yet to compare months. Add or import a few expenses to see what moved.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2.5 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>What moved vs last month</span>
        <span>top {movers.length}</span>
      </div>
      <ul className="space-y-1.5">
        {movers.map((d) => {
          const isUp = d.abs > 0;
          const color = isUp ? "#FF8A8A" : "#6BE3A4";
          const pct =
            d.prev > 0.005 ? `${isUp ? "+" : ""}${((d.abs / d.prev) * 100).toFixed(0)}%` : "new";
          const Icon = isUp ? TrendingUp : TrendingDown;
          return (
            <li
              key={d.category}
              className="grid grid-cols-[16px_1fr_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px]"
              style={{ color }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate text-[13px] font-semibold text-white">{d.category}</span>
              <span className="whitespace-nowrap font-mono text-[12px] font-bold tabular-nums">
                {isUp ? "+" : "−"}
                {format(Math.abs(d.abs))}
              </span>
              <span className="whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[#76746E]">
                {pct} · {format(d.curr)} vs {format(d.prev)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
