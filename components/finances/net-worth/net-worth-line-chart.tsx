// components/finances/net-worth/net-worth-line-chart.tsx
"use client";

import { useMemo } from "react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { NwSnapshot } from "@/lib/supabase/types";

type Point = { x: number; y: number };

function smoothPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  const d = [`M${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`);
  }
  return d.join(" ");
}

export function NetWorthLineChart({ snapshots }: { snapshots: NwSnapshot[] }) {
  const { format } = useExchangeRates();
  const W = 600;
  const H = 200;
  const PAD = 8;

  const { lineD, areaD, color, deltaLabel, stats } = useMemo(() => {
    if (snapshots.length === 0) {
      return { lineD: "", areaD: "", color: "#76746E", deltaLabel: "—", stats: null };
    }
    const vals = snapshots.map((s) => Number(s.total_chf));
    const first = vals[0];
    const last = vals[vals.length - 1];
    const change = last - first;
    const direction = Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down";
    const color = direction === "up" ? "#6BE3A4" : direction === "down" ? "#FF8A8A" : "#76746E";

    let deltaLabel = "Flat";
    if (direction !== "flat") {
      if (Math.abs(first) < 0.5) {
        deltaLabel = `${change > 0 ? "+" : "−"}${format(Math.abs(change))}`;
      } else {
        const pct = (change / Math.abs(first)) * 100;
        const abs = Math.abs(pct);
        const pctStr = abs >= 100 ? abs.toFixed(0) : abs >= 10 ? abs.toFixed(1) : abs.toFixed(2);
        deltaLabel = `${change > 0 ? "+" : "−"}${pctStr}%`;
      }
    }

    const high = Math.max(...vals);
    const low = Math.min(...vals);
    const stats = {
      onePct: last / 100,
      high,
      low,
      count: snapshots.length,
    };

    if (snapshots.length === 1) {
      const y = H / 2;
      return {
        lineD: `M0,${y} L${W},${y}`,
        areaD: `M0,${y} L${W},${y} L${W},${H} L0,${H} Z`,
        color,
        deltaLabel,
        stats,
      };
    }

    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || Math.max(1, Math.abs(maxV));
    const points: Point[] = snapshots.map((s, i) => ({
      x: (i / (snapshots.length - 1)) * W,
      y: H - PAD - ((Number(s.total_chf) - minV) / range) * (H - PAD * 2),
    }));
    const lineD = smoothPath(points);
    const lastPt = points[points.length - 1];
    const firstPt = points[0];
    return {
      lineD,
      areaD: `${lineD} L${lastPt.x},${H} L${firstPt.x},${H} Z`,
      color,
      deltaLabel,
      stats,
    };
  }, [snapshots, format]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em]">
        <span className="text-[#76746E]">All-time</span>
        <span style={{ color }}>{deltaLabel}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[200px] w-full overflow-visible"
        style={{ color }}
        aria-hidden
      >
        <defs>
          <linearGradient id="nwChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={W} y1="40" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <line x1="0" x2={W} y1="100" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <line x1="0" x2={W} y1="160" y2="160" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <path d={areaD} fill="url(#nwChartGrad)" />
        <path
          d={lineD}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
        />
      </svg>

      {stats ? (
        <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-white/5 pt-3 sm:grid-cols-4">
          <Stat label="1% =" value={format(stats.onePct)} />
          <Stat label="All-time high" value={format(stats.high)} />
          <Stat label="All-time low" value={format(stats.low)} />
          <Stat label="Snapshots" value={String(stats.count)} />
        </div>
      ) : (
        <div className="mt-3 text-center text-[11px] italic text-[#76746E]">
          Add or edit an account to start tracking your net worth over time.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-1.5 py-1">
      <div className="font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
        {label}
      </div>
      <div className="truncate font-mono text-xs font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}
