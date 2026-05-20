"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { NwActivity } from "@/lib/supabase/types";

const CAT_COLOR: Record<string, string> = {
  bank: "#7DD3FC",
  stocks: "#6EE7B7",
  debt: "#FF8A8A",
  other: "#B794F4",
};
const CAT_LABEL: Record<string, string> = {
  bank: "Bank",
  stocks: "Stocks",
  debt: "Debt",
  other: "Other",
};

function fmtRelative(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86_400_000;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (day === today) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (day === yesterday) return "yest";
  const mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${mons[d.getMonth()]} ${d.getDate()}`;
}

export function ActivityLog({ activity }: { activity: NwActivity[] }) {
  const { format } = useExchangeRates();
  const rows = activity.slice(0, 30);

  return (
    <div className="rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2.5 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        <span>Recent activity</span>
        <span>
          {activity.length} event{activity.length === 1 ? "" : "s"}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="py-3 text-center text-[11px] italic text-[#76746E]">
          No activity yet — add your first account.
        </div>
      ) : (
        <ul className="max-h-[156px] space-y-1.5 overflow-y-auto">
          {rows.map((e) => {
            const color = CAT_COLOR[e.nw_category] || "#FFFFFF";
            const isUp = Number(e.delta_chf) >= 0;
            const sign = isUp ? "+" : "−";
            return (
              <li
                key={e.id}
                className="grid grid-cols-[4px_1fr_auto_auto] items-center gap-2.5 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px] transition-colors hover:bg-white/[0.05]"
                style={{ color }}
              >
                <span
                  className="h-6 w-1 rounded-sm"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-white">
                    {e.account_name || "(unnamed)"}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-[#76746E]">
                    {CAT_LABEL[e.nw_category] || e.nw_category} · {e.kind.toUpperCase()}
                  </div>
                </div>
                <span
                  className="whitespace-nowrap font-mono text-[13px] font-bold tabular-nums"
                  style={{ color: isUp ? "#6BE3A4" : "#FF8A8A" }}
                >
                  {sign}
                  {format(Math.abs(Number(e.delta_chf)))}
                </span>
                <span className="whitespace-nowrap font-mono text-[10.5px] tabular-nums text-[#76746E]">
                  {fmtRelative(e.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
