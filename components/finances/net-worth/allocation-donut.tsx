"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinancialAccount, Subscription } from "@/lib/supabase/types";
import { monthlyEquivalentCHF } from "@/lib/finances/net-worth";

// Debt has no color here because debts are not a *positive* allocation slice —
// they're excluded from the donut entirely. They still show up in the breakdown
// line and in the net-worth grand total.
const CAT_COLOR: Record<string, string> = {
  bank: "#7DD3FC",
  stocks: "#6EE7B7",
  other: "#B794F4",
  subs: "#FF8A8A",
};

type Slice = { key: string; name: string; color: string; value: number };

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a1: number, a2: number) {
  const x1o = cx + rOuter * Math.cos(a1);
  const y1o = cy + rOuter * Math.sin(a1);
  const x2o = cx + rOuter * Math.cos(a2);
  const y2o = cy + rOuter * Math.sin(a2);
  const x1i = cx + rInner * Math.cos(a2);
  const y1i = cy + rInner * Math.sin(a2);
  const x2i = cx + rInner * Math.cos(a1);
  const y2i = cy + rInner * Math.sin(a1);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${x1o.toFixed(2)} ${y1o.toFixed(2)} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o.toFixed(
    2
  )} ${y2o.toFixed(2)} L ${x1i.toFixed(2)} ${y1i.toFixed(2)} A ${rInner} ${rInner} 0 ${large} 0 ${x2i.toFixed(
    2
  )} ${y2i.toFixed(2)} Z`;
}

export function AllocationDonut({
  accounts,
  subscriptions,
}: {
  accounts: FinancialAccount[];
  subscriptions: Subscription[];
}) {
  const { format } = useExchangeRates();

  const slices = useMemo<Slice[]>(() => {
    const out: Slice[] = [];
    accounts.forEach((a, i) => {
      if (a.nw_category === "debt") return; // debts don't contribute to a positive allocation pie
      const v = Number(a.amount) || 0;
      if (v > 0) {
        out.push({
          key: `${a.nw_category}::${i}`,
          name: a.name,
          color: CAT_COLOR[a.nw_category] || "#FFFFFF",
          value: v,
        });
      }
    });
    const annualSubs = subscriptions
      .filter((s) => s.active)
      .reduce((sum, s) => sum + monthlyEquivalentCHF(s) * 12, 0);
    if (annualSubs > 0) {
      out.push({ key: "subs", name: "Subs/yr", color: CAT_COLOR.subs, value: annualSubs });
    }
    return out.sort((a, b) => b.value - a.value);
  }, [accounts, subscriptions]);

  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="relative flex flex-col rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>Allocation</span>
        <span>
          {slices.length} slice{slices.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="relative mx-auto my-1.5 h-[140px] w-[140px]">
        <svg viewBox="0 0 140 140" className="block h-[140px] w-[140px] -rotate-90" aria-hidden>
          {total > 0 ? (
            (() => {
              let angle = -Math.PI / 2;
              return slices.map((s) => {
                const sliceAngle = (s.value / total) * Math.PI * 2;
                const pad = slices.length > 1 ? 0.015 : 0;
                const a1 = angle + pad;
                const a2 = angle + sliceAngle - pad;
                angle += sliceAngle;
                if (a2 <= a1) return null;
                return <path key={s.key} d={arcPath(70, 70, 60, 44, a1, a2)} fill={s.color} />;
              });
            })()
          ) : (
            <>
              <circle cx="70" cy="70" r="60" fill="rgba(255,255,255,0.025)" />
              <circle cx="70" cy="70" r="44" fill="#0A0A0B" />
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-base font-bold leading-none text-white">
            {total > 0 ? format(total).split(" ")[1] || format(total) : "—"}
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#76746E]">
            total
          </div>
        </div>
      </div>

      {slices.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1">
          {slices.map((s) => {
            const pct = ((s.value / total) * 100).toFixed(1);
            return (
              <div
                key={s.key}
                className="grid grid-cols-[8px_1fr_auto] items-center gap-2 rounded-md px-1.5 py-1 text-[11px] tabular-nums"
                style={{ color: s.color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                />
                <span className="text-[#B8B6B0]">{s.name}</span>
                <span className="font-mono text-[10.5px] font-bold text-white">{pct}%</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-2 text-center text-[11px] italic text-[#76746E]">
          Add an account to see your breakdown
        </div>
      )}
    </div>
  );
}
