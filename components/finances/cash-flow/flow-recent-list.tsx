"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry } from "@/lib/supabase/types";

export function FlowRecentList({
  title,
  entries,
  direction,
}: {
  title: string;
  entries: FinanceEntry[];
  direction: "in" | "out";
}) {
  const { format } = useExchangeRates();
  const color = direction === "in" ? "#6BE3A4" : "#FF8A8A";

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2.5 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>{title}</span>
        <span>
          {entries.length} entr{entries.length === 1 ? "y" : "ies"}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="py-3 text-center text-[11px] italic text-[#76746E]">
          No {direction === "in" ? "inflows" : "outflows"} yet.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {entries.slice(0, 12).map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[4px_1fr_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px]"
              style={{ color }}
            >
              <span
                className="h-6 w-1 rounded-sm"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-white">
                  {e.item || e.category}
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-[#76746E]">
                  {e.category}
                </div>
              </div>
              <span
                className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums"
                style={{ color }}
              >
                {direction === "in" ? "+" : "−"}
                {format(Number(e.amount))}
              </span>
              <span className="whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[#76746E]">
                {e.date.slice(5)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
