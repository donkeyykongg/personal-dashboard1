"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// Swap this out for a Supabase fetch later — mirrors the
// `initial*` prop pattern used elsewhere on the dashboard.
// Each entry needs { goal, score } where score is 0–100.
const DEFAULT_GOALS = [
  { goal: "Wealth", score: 28, target: "$10k/mo" },
  { goal: "Mandarin", score: 42, target: "HSK milestones" },
  { goal: "Food Page", score: 18, target: "10k followers" },
  { goal: "Fitness", score: 55, target: "Placeholder" },
  { goal: "Projects", score: 64, target: "Placeholder" },
  { goal: "Career", score: 48, target: "Placeholder" },
];

const ACCENT = "#34D399";

export default function GoalsRadar({ data = DEFAULT_GOALS, title = "Snapshot" }) {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(15, 18, 22, 0.92)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        backdropFilter: "blur(24px) saturate(1.2)",
        WebkitBackdropFilter: "blur(24px) saturate(1.2)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 18,
          fontSize: 12,
          fontWeight: 500,
          color: "#76746E",
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </div>

      <div style={{ width: "100%", height: 340, paddingTop: 18 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="78%">
            <PolarGrid
              gridType="polygon"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
            />
            <PolarAngleAxis
              dataKey="goal"
              tick={{
                fill: "#B8B6B0",
                fontSize: 12,
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
              }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tickCount={6}
              tick={{
                fill: "#4B4F55",
                fontSize: 10,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              }}
              axisLine={false}
              stroke="rgba(255,255,255,0.05)"
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke={ACCENT}
              strokeWidth={2}
              fill={ACCENT}
              fillOpacity={0.22}
              dot={{
                r: 4,
                fill: ACCENT,
                stroke: ACCENT,
                strokeWidth: 1,
              }}
              isAnimationActive={true}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
