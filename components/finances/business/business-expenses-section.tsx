"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry } from "@/lib/supabase/types";
import { BusinessCategoryDonut } from "./business-category-donut";
import { BusinessAddForm } from "./business-add-form";

function isThisMonth(date: string): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isThisYear(date: string): boolean {
  return new Date(date).getFullYear() === new Date().getFullYear();
}

export function BusinessExpensesSection({ entries }: { entries: FinanceEntry[] }) {
  const { format } = useExchangeRates();
  const thisMonth = useMemo(
    () => entries.filter((e) => isThisMonth(e.date)).reduce((s, e) => s + Number(e.amount), 0),
    [entries]
  );
  const ytd = useMemo(
    () => entries.filter((e) => isThisYear(e.date)).reduce((s, e) => s + Number(e.amount), 0),
    [entries]
  );
  const knownCategories = useMemo(
    () => Array.from(new Set(entries.map((e) => e.category))).filter(Boolean).sort(),
    [entries]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
          <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
            This month
          </div>
          <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
            {format(thisMonth)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
          <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
            Year to date
          </div>
          <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
            {format(ytd)}
          </div>
        </div>
      </div>

      <BusinessCategoryDonut entries={entries} />

      <div className="rounded-xl bg-white/[0.025] p-4">
        <div className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
          Recent business expenses
        </div>
        {entries.length === 0 ? (
          <div className="py-3 text-center text-[11px] italic text-[#76746E]">
            No business expenses yet. Add one below.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {entries.slice(0, 20).map((e) => (
              <li
                key={e.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px]"
              >
                <div className="min-w-0 truncate text-[13px] font-semibold text-white">
                  {e.item || e.category}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-[#B8B6B0]">
                  {e.category}
                </span>
                <span className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums text-white">
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

      <BusinessAddForm knownCategories={knownCategories} />
    </div>
  );
}
