// components/finances/net-worth/net-worth-header.tsx
"use client";

import { useExchangeRates, type Currency } from "@/lib/exchange-rates";
import type { FinancialAccount, NwCategory } from "@/lib/supabase/types";
import { grandTotal, totalByCategory } from "@/lib/finances/net-worth";

const CATEGORIES: { key: NwCategory; label: string }[] = [
  { key: "bank", label: "Bank" },
  { key: "stocks", label: "Stocks" },
  { key: "crypto", label: "Crypto" },
  { key: "other", label: "Other" },
];

export function NetWorthHeader({ accounts }: { accounts: FinancialAccount[] }) {
  const { currency, setCurrency, format } = useExchangeRates();
  const total = grandTotal(accounts);
  const breakdown = CATEGORIES.filter((c) => totalByCategory(accounts, c.key) > 0)
    .map((c) => `${c.label}: ${format(totalByCategory(accounts, c.key))}`)
    .join("  •  ");

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
          Total net worth
        </div>
        <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
          {format(total)}
        </div>
        {breakdown && <div className="mt-1 text-[11px] text-[#76746E]">{breakdown}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#76746E]">{currency}</span>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white"
        >
          <option value="CHF">CHF</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
    </div>
  );
}
