"use client";

import { useEffect, useState } from "react";

type Row = { abbr: string; pct: number; detail: string };

function computeRows(now: Date): Row[] {
  const ms = now.getTime();

  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((now.getDay() + 6) % 7)); // Mon = 0
  const weekPct = ((ms - weekStart.getTime()) / (7 * 86_400_000)) * 100;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthPct =
    ((ms - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime())) * 100;

  const q = Math.floor(now.getMonth() / 3);
  const qStart = new Date(now.getFullYear(), q * 3, 1);
  const qEnd = new Date(now.getFullYear(), q * 3 + 3, 1);
  const qPct = ((ms - qStart.getTime()) / (qEnd.getTime() - qStart.getTime())) * 100;

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const yearPct =
    ((ms - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())) * 100;

  return [
    {
      abbr: "WK",
      pct: weekPct,
      detail: now.toLocaleDateString("en-US", { weekday: "short" }),
    },
    {
      abbr: "MO",
      pct: monthPct,
      detail: now.toLocaleDateString("en-US", { month: "short" }),
    },
    { abbr: `Q${q + 1}`, pct: qPct, detail: `${now.getFullYear()}` },
    { abbr: "YR", pct: yearPct, detail: `${now.getFullYear()}` },
  ];
}

const LABEL: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.58rem",
  color: "#e2e0db",
  fontWeight: 600,
  width: 20,
  flexShrink: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

const PCT: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.65rem",
  color: "#fafafa",
  fontWeight: 700,
  width: 30,
  textAlign: "right" as const,
  flexShrink: 0,
};

const DETAIL: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.58rem",
  color: "#fafafa",
  width: 28,
  flexShrink: 0,
};

export function MacroTimeGrid() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div
        style={{
          background: "#0d1424",
          borderRadius: 12,
          height: 90,
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 12,
          opacity: 0.5,
        }}
      />
    );
  }

  const rows = computeRows(now);

  return (
    <div
      style={{
        background: "#0d1424",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.55rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#fafafa",
          marginBottom: 10,
        }}
      >
        Macro · Time
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ abbr, pct, detail }) => (
          <div key={abbr} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={LABEL}>{abbr}</span>
            <div
              style={{
                flex: 1,
                height: 2,
                background: "rgba(255,255,255,0.07)",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, pct).toFixed(2)}%`,
                  background: "var(--rowan-accent, #6be3a4)",
                  borderRadius: 1,
                  transition: "width 1s ease",
                }}
              />
            </div>
            <span style={PCT}>{pct.toFixed(0)}%</span>
            <span style={DETAIL}>{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
