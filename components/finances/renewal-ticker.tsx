"use client";

import { useEffect, useMemo, useState } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { Subscription } from "@/lib/supabase/types";

type Entry = { name: string; amount: number; days: number; period: string };

function nextRenewalDate(iso: string, period: string): Date | null {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso;
  let d = new Date(safe);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let safety = 0;
  while (d < today && safety++ < 600) {
    if (period === "weekly") d.setDate(d.getDate() + 7);
    else if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function RenewalTicker({ subscriptions }: { subscriptions: Subscription[] }) {
  const { format } = useExchangeRates();

  const entries = useMemo<Entry[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: Entry[] = [];
    subscriptions.forEach((s) => {
      if (!s.active || !s.next_renewal) return;
      const next = nextRenewalDate(s.next_renewal, s.billing_cycle);
      if (!next) return;
      const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
      out.push({ name: s.name, amount: Number(s.amount) || 0, days, period: s.billing_cycle });
    });
    return out.sort((a, b) => a.days - b.days);
  }, [subscriptions]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (entries.length <= 1) return;
    const interval = setInterval(() => setIdx((i) => (i + 1) % entries.length), 5000);
    return () => clearInterval(interval);
  }, [entries.length]);

  if (entries.length === 0) return null;
  const current = entries[idx] || entries[0];
  const urgent = current.days <= 5;

  const daysLabel =
    current.days < 0
      ? `${Math.abs(current.days)}d late`
      : current.days === 0
      ? "TODAY"
      : current.days === 1
      ? "TOMORROW"
      : `in ${current.days}d`;

  return (
    <div
      className={`relative flex min-h-[38px] items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 font-mono text-xs transition-colors ${
        urgent
          ? "animate-pulse border-[#FF8A8A]/30 bg-gradient-to-r from-[#FF8A8A]/10 to-[#FF8A8A]/[0.04]"
          : "border-[#6EE7B7]/14 bg-gradient-to-r from-[#6EE7B7]/[0.06] to-[#7DD3FC]/[0.04]"
      }`}
    >
      <span
        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.18em] ${
          urgent ? "bg-[#FF8A8A]/10 text-[#FF8A8A]" : "bg-black/30 text-[#76746E]"
        }`}
      >
        Renews
      </span>
      <div className="relative h-[18px] flex-1 overflow-hidden">
        <div className="flex items-center gap-3 whitespace-nowrap text-[#B8B6B0]">
          <span className="font-bold uppercase tracking-[0.04em] text-white">{current.name}</span>
          <span className={`font-bold ${urgent ? "text-[#FF8A8A]" : "text-[#6BE3A4]"}`}>
            {format(current.amount)}
          </span>
          <span
            className={`text-[11px] uppercase tracking-[0.06em] ${
              urgent ? "font-bold text-[#FF8A8A]" : "text-[#76746E]"
            }`}
          >
            {daysLabel}
          </span>
        </div>
      </div>
      {entries.length > 1 && (
        <div className="flex flex-shrink-0 gap-1">
          {entries.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors"
              style={{
                background:
                  i === idx
                    ? urgent
                      ? "#FF8A8A"
                      : "#6BE3A4"
                    : "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
