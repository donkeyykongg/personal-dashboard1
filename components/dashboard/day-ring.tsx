"use client";

import { useEffect, useState } from "react";
import styles from "./day-ring.module.css";

const WAKE_HOUR = 8;
const SLEEP_HOUR = 24;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PALETTE: { stop: number; rgb: [number, number, number] }[] = [
  { stop: 0,    rgb: [255, 216, 158] },
  { stop: 12.5, rgb: [255, 205, 121] },
  { stop: 25,   rgb: [255, 227, 143] },
  { stop: 37.5, rgb: [255, 183, 106] },
  { stop: 50,   rgb: [255, 149,  89] },
  { stop: 62.5, rgb: [243, 111,  79] },
  { stop: 75,   rgb: [226,  93, 122] },
  { stop: 87.5, rgb: [123,  91, 176] },
  { stop: 100,  rgb: [ 47,  58, 102] },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function paletteColor(percent: number): string {
  const p = Math.max(0, Math.min(100, percent));
  for (let i = 0; i < PALETTE.length - 1; i++) {
    const a = PALETTE[i];
    const b = PALETTE[i + 1];
    if (p >= a.stop && p <= b.stop) {
      const t = (p - a.stop) / (b.stop - a.stop);
      const r = Math.round(lerp(a.rgb[0], b.rgb[0], t));
      const g = Math.round(lerp(a.rgb[1], b.rgb[1], t));
      const bl = Math.round(lerp(a.rgb[2], b.rgb[2], t));
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  return `rgb(${PALETTE[PALETTE.length - 1].rgb.join(",")})`;
}

function formatClock(d: Date): string {
  const h24 = d.getHours();
  const mins = d.getMinutes();
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${period}`;
}

function formatHM(totalHours: number): string {
  const h = Math.floor(totalHours);
  const m = Math.floor((totalHours - h) * 60);
  return `${h}h ${m}m`;
}

type RingState = {
  percent: number;
  stroke: string;
  phase: string;
  status: string;
  remaining: string;
  percentLabel: string;
  clock: string;
};

function computeState(): RingState {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const clock = formatClock(now);

  if (hours < WAKE_HOUR) {
    return {
      percent: 0,
      stroke: "#4D4B47",
      phase: "SLEEPING",
      status: "😴 Still sleeping",
      remaining: `${formatHM(WAKE_HOUR - hours)} until wake-up`,
      percentLabel: "—",
      clock,
    };
  }

  if (hours >= SLEEP_HOUR) {
    return {
      percent: 100,
      stroke: "#E25D7A",
      phase: "PAST BEDTIME",
      status: "⚠️ Past bedtime",
      remaining: "Sleep!",
      percentLabel: "100%",
      clock,
    };
  }

  const span = SLEEP_HOUR - WAKE_HOUR;
  const percent = ((hours - WAKE_HOUR) / span) * 100;
  const stroke = paletteColor(percent);
  let phase = "MORNING";
  let status = "☀️ Morning — fresh start";
  if (percent >= 90) {
    phase = "BEDTIME";
    status = "🌙 Bedtime soon";
  } else if (percent >= 75) {
    phase = "EVENING";
    status = "⏳ Evening — wrap up";
  } else if (percent >= 50) {
    phase = "AFTERNOON";
    status = "🔥 Afternoon — push it";
  } else if (percent >= 25) {
    phase = "MIDDAY";
    status = "⚡ Midday — keep moving";
  }

  return {
    percent,
    stroke,
    phase,
    status,
    remaining: `${formatHM(SLEEP_HOUR - hours)} awake time left`,
    percentLabel: `${Math.round(percent)}%`,
    clock,
  };
}

export function DayRing() {
  const [state, setState] = useState<RingState | null>(null);

  useEffect(() => {
    const update = () => setState(computeState());
    update();
    const interval = window.setInterval(update, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const dashOffset = state
    ? CIRCUMFERENCE * (1 - state.percent / 100)
    : CIRCUMFERENCE;

  return (
    <div className={styles.wrap}>
      <div className={styles.ringBox}>
        <svg viewBox="0 0 120 120" className={styles.ringSvg}>
          <defs>
            <filter id="dh-ring-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r={RADIUS} className={styles.track} />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            className={styles.fill}
            stroke={state?.stroke ?? "#4D4B47"}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            filter="url(#dh-ring-glow)"
          />
        </svg>
        <div className={styles.overlay}>
          <div className={styles.percent}>{state?.percentLabel ?? "—"}</div>
          <div className={styles.phase}>{state?.phase ?? "…"}</div>
          <div className={styles.clock}>{state?.clock ?? ""}</div>
        </div>
      </div>
      <div className={styles.col}>
        <div className={styles.status}>{state?.status ?? ""}</div>
        <div className={styles.remaining}>{state?.remaining ?? ""}</div>
        <div className={styles.range}>8:00 AM – 12:00 AM</div>
      </div>
    </div>
  );
}

export default DayRing;
