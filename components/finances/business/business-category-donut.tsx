"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinanceEntry } from "@/lib/supabase/types";

const PALETTE = ["#7DD3FC", "#6EE7B7", "#FBBF24", "#B794F4", "#FF8A8A", "#F2C063", "#E07658", "#BFE3F8"];

function arc(cx: number, cy: number, rO: number, rI: number, a1: number, a2: number) {
  const x1o = cx + rO * Math.cos(a1);
  const y1o = cy + rO * Math.sin(a1);
  const x2o = cx + rO * Math.cos(a2);
  const y2o = cy + rO * Math.sin(a2);
  const x1i = cx + rI * Math.cos(a2);
  const y1i = cy + rI * Math.sin(a2);
  const x2i = cx + rI * Math.cos(a1);
  const y2i = cy + rI * Math.sin(a1);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${x1o.toFixed(2)} ${y1o.toFixed(2)} A ${rO} ${rO} 0 ${large} 1 ${x2o.toFixed(2)} ${y2o.toFixed(2)} L ${x1i.toFixed(2)} ${y1i.toFixed(2)} A ${rI} ${rI} 0 ${large} 0 ${x2i.toFixed(2)} ${y2i.toFixed(2)} Z`;
}

export function BusinessCategoryDonut({ entries }: { entries: FinanceEntry[] }) {
  const { format } = useExchangeRates();

  const slices = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    });
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        Breakdown
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className="relative mx-auto h-[140px] w-[140px]">
          <svg viewBox="0 0 140 140" className="block h-[140px] w-[140px] -rotate-90" aria-hidden>
            {total > 0 ? (
              (() => {
                let angle = -Math.PI / 2;
                return slices.map((s) => {
                  const sa = (s.value / total) * Math.PI * 2;
                  const pad = slices.length > 1 ? 0.015 : 0;
                  const a1 = angle + pad;
                  const a2 = angle + sa - pad;
                  angle += sa;
                  if (a2 <= a1) return null;
                  return <path key={s.name} d={arc(70, 70, 60, 44, a1, a2)} fill={s.color} />;
                });
              })()
            ) : (
              <>
                <circle cx="70" cy="70" r="60" fill="rgba(255,255,255,0.025)" />
                <circle cx="70" cy="70" r="44" fill="#0A0A0B" />
              </>
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-base font-bold text-white">
              {total > 0 ? format(total).split(" ")[1] || format(total) : "—"}
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#76746E]">
              total
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {slices.length === 0 ? (
            <div className="py-2 text-center text-[11px] italic text-[#76746E]">
              No business expenses yet
            </div>
          ) : (
            slices.map((s) => {
              const pct = ((s.value / total) * 100).toFixed(1);
              return (
                <div
                  key={s.name}
                  className="grid grid-cols-[8px_1fr_auto_auto] items-center gap-2 rounded-md px-1.5 py-1 text-[11px] tabular-nums"
                  style={{ color: s.color }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                  />
                  <span className="text-[#B8B6B0]">{s.name}</span>
                  <span className="font-mono text-[10.5px] font-bold text-white">{pct}%</span>
                  <span className="font-mono text-[10.5px] text-[#76746E]">{format(s.value)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
