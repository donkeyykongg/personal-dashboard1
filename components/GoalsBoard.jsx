"use client";

import { useEffect, useState } from "react";
import GoalsRadar from "./GoalsRadar";

const STORE_KEY = "goals:board:v1";

// Seed shown on first visit. Same shape as Supabase rows you might
// fetch later — just hand the array straight to GoalsRadar.
const SEED = [
  { id: "wealth",   goal: "Wealth",    score: 28, target: "$10k/mo",        endDate: "", achieved: false },
  { id: "mandarin", goal: "Mandarin",  score: 42, target: "HSK milestones", endDate: "", achieved: false },
  { id: "food",     goal: "Food Page", score: 18, target: "10k followers",  endDate: "", achieved: false },
  { id: "fitness",  goal: "Fitness",   score: 55, target: "Placeholder",    endDate: "", achieved: false },
  { id: "projects", goal: "Projects",  score: 64, target: "Placeholder",    endDate: "", achieved: false },
  { id: "career",   goal: "Career",    score: 48, target: "Placeholder",    endDate: "", achieved: false },
];

function load() {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : SEED;
  } catch {
    return SEED;
  }
}

export default function GoalsBoard() {
  const [goals, setGoals] = useState(SEED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setGoals(load());
    setHydrated(true);
  }, []);

  function persist(next) {
    setGoals(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    }
  }

  function update(id, patch) {
    persist(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 20,
        alignItems: "start",
      }}
      className="goals-board"
    >
      <style>{`
        @media (max-width: 880px) {
          .goals-board { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        style={{
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
            fontSize: 12,
            fontWeight: 500,
            color: "#76746E",
            letterSpacing: "0.02em",
            marginBottom: 14,
          }}
        >
          My goals
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {goals.map((g) => (
            <li
              key={g.id}
              style={{
                background: g.achieved ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${g.achieved ? "rgba(52,211,153,0.30)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                opacity: g.achieved ? 0.85 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="text"
                  value={g.goal}
                  onChange={(e) => update(g.id, { goal: e.target.value })}
                  placeholder="Goal"
                  style={inputStyle(true)}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#76746E", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={g.achieved}
                    onChange={(e) => update(g.id, { achieved: e.target.checked })}
                    style={{ accentColor: "#34D399" }}
                  />
                  Achieved
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <Field label="Current">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={g.score}
                      onChange={(e) => update(g.id, { score: clamp(Number(e.target.value)) })}
                      style={inputStyle()}
                    />
                    <span style={{ fontSize: 11, color: "#76746E" }}>%</span>
                  </div>
                </Field>
                <Field label="Target">
                  <input
                    type="text"
                    value={g.target}
                    onChange={(e) => update(g.id, { target: e.target.value })}
                    placeholder="e.g. $10k/mo"
                    style={inputStyle()}
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="date"
                    value={g.endDate}
                    onChange={(e) => update(g.id, { endDate: e.target.value })}
                    style={inputStyle()}
                  />
                </Field>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ position: "sticky", top: 80 }}>
        <GoalsRadar data={hydrated ? goals : SEED} />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: "#76746E" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function clamp(n) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function inputStyle(bold = false) {
  return {
    width: "100%",
    padding: "8px 10px",
    background: "rgba(0,0,0,0.30)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#FAFAFA",
    fontFamily: "inherit",
    fontSize: bold ? 14 : 12,
    fontWeight: bold ? 600 : 400,
    outline: "none",
  };
}
