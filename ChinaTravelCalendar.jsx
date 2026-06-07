// ChinaTravelCalendar.jsx
// Self-contained React component — no dependencies beyond React.
// Drop into any CRA / Vite / Next project. (In Next.js App Router this is
// rendered by app/china/page.tsx, which carries the "use client" directive.)
//
// Renders with a mount gate: nothing is rendered until the component has
// mounted on the client, so the first client paint matches the (empty) server
// paint and there is no SSR/CSR hydration mismatch. State then loads from
// localStorage.

import React, { useState, useEffect, useRef } from 'react';

/* ───────────────────────── design tokens ───────────────────────── */

const C = {
  primary: '#FAFAFA',
  secondary: '#B8B6B0',
  tertiary: '#76746E',
  success: '#6BE3A4',
  warning: '#F2C063',
  danger: '#FF6B6B',
};

const KEY_TRIPS = 'china-travel-trips';
const KEY_TIPS = 'china-travel-tips';
const KEY_CHECK = 'china-travel-checklists';

const COLOR_PALETTE = [
  '#639922', '#378ADD', '#4CAF84', '#E24B4A', '#F2C063',
  '#D4537E', '#1D9E75', '#888780',
];

/* ───────────────────────── default trips ───────────────────────── */
// days: [{m, d}] with m = 9..12. itinerary: { "m-d": [ {id,time,title,place,note} ] }

const DEFAULT_TRIPS = [
  {
    id: 'suzhou-canals', name: 'Suzhou canals + Pingjiang Lu', color: '#639922',
    dates: 'Sep 6–7', days: [{ m: 9, d: 6 }, { m: 9, d: 7 }],
    desc: 'Your home-base city done properly. Pingjiang Road is the postcard canal lane — Ming/Qing whitewashed houses, stone bridges, willow-lined water. Pair it with the Humble Administrator’s Garden and the Suzhou Museum (I. M. Pei’s last building).',
    tip: 'Hit the gardens at opening (8am) before the tour buses; save Pingjiang Lu for the evening when the lanterns come on and the day-trippers have gone home.',
    tags: ['canals', 'gardens', 'UNESCO', 'walkable'], embeds: [], itinerary: {},
  },
  {
    id: 'shanghai-yuyuan', name: 'Shanghai — Yu Yuan + The Bund', color: '#378ADD',
    dates: 'Sep 13–14', days: [{ m: 9, d: 13 }, { m: 9, d: 14 }],
    desc: 'A weekend in the megacity. Yu Garden and the Old City bazaar in the morning, then the Bund waterfront for the colonial facades on one side and Pudong’s neon towers on the other. Add a wander down the former French Concession (Wukang Road).',
    tip: 'See the Bund at dusk — be on the promenade as the lights flip on around 6:30pm. Skip the overpriced Huangpu night cruise; just walk it.',
    tags: ['skyline', 'bund', 'foodie', 'classic'], embeds: [], itinerary: {},
  },
  {
    id: 'hangzhou-westlake', name: 'Hangzhou — West Lake + Longjing tea', color: '#4CAF84',
    dates: 'Sep 19–21', days: [{ m: 9, d: 19 }, { m: 9, d: 20 }, { m: 9, d: 21 }],
    desc: 'Three days around China’s most famous lake. Rent a bike for the Bai and Su causeways, catch Leifeng Pagoda at sunset, then climb into the Longjing tea terraces above the lake to drink the green tea at its source.',
    tip: 'Do West Lake at dawn to beat the crowds; head to Meijiawu tea village in the afternoon and buy “pre-Qingming” Longjing straight from a farmer’s house.',
    tags: ['lake', 'tea', 'cycling', 'scenic'], embeds: [], itinerary: {},
  },
  {
    id: 'nanjing-mingwalls', name: 'Nanjing — Ming walls + Confucius Temple', color: '#E24B4A',
    dates: 'Sep 26–28', days: [{ m: 9, d: 26 }, { m: 9, d: 27 }, { m: 9, d: 28 }],
    desc: 'A former imperial capital, heavy with history. Walk a stretch of the 600-year-old Ming city wall, visit the Sun Yat-sen Mausoleum on Purple Mountain, and the Confucius Temple (Fuzimiao) quarter along the Qinhuai River. The Massacre Memorial is sobering but essential.',
    tip: 'Climb the wall at Zhonghua Gate (Zhonghuamen) — the best-preserved fortress section — and tackle Purple Mountain early; it’s a big, hilly site.',
    tags: ['history', 'city wall', 'memorial', 'temples'], embeds: [], itinerary: {},
  },
  {
    id: 'goldenweek-chengdu', name: 'Golden Week: Chengdu + Chongqing', color: '#F2C063',
    dates: 'Oct 1–7',
    days: [{ m: 10, d: 1 }, { m: 10, d: 2 }, { m: 10, d: 3 }, { m: 10, d: 4 }, { m: 10, d: 5 }, { m: 10, d: 6 }, { m: 10, d: 7 }],
    desc: 'The big one — a full week over the National Day holiday. Chengdu for pandas, Sichuan hotpot and teahouse pace; then the bullet train to Chongqing for the vertical cyberpunk cityscape, Hongya Cave at night, and mountain-spice hotpot.',
    tip: 'Golden Week is peak domestic travel. Book trains and the panda base the minute tickets open (30 days out), and reach the Chengdu Research Base by 7:30am opening — the pandas nap by 10am.',
    tags: ['golden week', 'pandas', 'hotpot', 'bullet train'], embeds: [], itinerary: {},
  },
  {
    id: 'xian-terracotta', name: 'Xi’an — Terracotta Army + Lintong show', color: '#D4537E',
    dates: 'Oct 17–20', days: [{ m: 10, d: 17 }, { m: 10, d: 18 }, { m: 10, d: 19 }, { m: 10, d: 20 }],
    desc: 'Ancient eastern terminus of the Silk Road. The Terracotta Warriors out in Lintong, the intact Ming city wall (rent a bike on top), the Muslim Quarter food street, and the Big Wild Goose Pagoda. Catch the Tang Dynasty show near Huaqing Palace.',
    tip: 'At the Warriors, work the pits in reverse — Pit 3, then 2, save Pit 1 (the famous one) for last so it lands. Hire a real guide; unlabeled it’s just clay.',
    tags: ['silk road', 'warriors', 'history', 'street food'], embeds: [], itinerary: {},
  },
  {
    id: 'zhangjiajie-avatar', name: 'Zhangjiajie — Avatar mountains', color: '#1D9E75',
    dates: 'Oct 31–Nov 3', days: [{ m: 10, d: 31 }, { m: 11, d: 1 }, { m: 11, d: 2 }, { m: 11, d: 3 }],
    desc: 'The sandstone pillars that inspired Avatar’s floating mountains. Zhangjiajie National Forest Park, the Bailong glass elevator, Tianzi Mountain, and the white-knuckle cliff skywalk at Tianmen Mountain with its 99-bend road and cable car.',
    tip: 'Buy the multi-day park ticket and start early to beat fog and crowds; the Yuanjiajie “Hallelujah Mountain” viewpoint is clearest in the morning. Wear real shoes.',
    tags: ['mountains', 'hiking', 'avatar', 'dramatic'], embeds: [], itinerary: {},
  },
  {
    id: 'qingdao-brewery', name: 'Qingdao — Zhongshan Lu + brewery', color: '#378ADD',
    dates: 'Nov 7–9', days: [{ m: 11, d: 7 }, { m: 11, d: 8 }, { m: 11, d: 9 }],
    desc: 'Seaside city with a German-colonial old town and China’s most famous beer. Walk Zhongshan Road and the Badaguan villas, the wooden Zhanqiao Pier, and tour the original 1903 Tsingtao Brewery — fresh unfiltered beer sold by the bag.',
    tip: 'Buy draft Tsingtao in a plastic bag from a corner shop like a local, and eat at a “jiagong” stall where you pick the day’s catch and they cook it for you.',
    tags: ['seaside', 'beer', 'colonial', 'seafood'], embeds: [], itinerary: {},
  },
  {
    id: 'gansu-mogao', name: 'Gansu — Mogao Caves + Mingsha Mountain', color: '#888780',
    dates: 'Nov 14–18',
    days: [{ m: 11, d: 14 }, { m: 11, d: 15 }, { m: 11, d: 16 }, { m: 11, d: 17 }, { m: 11, d: 18 }],
    desc: 'Deep Silk Road. Dunhuang’s Mogao Grottoes — a thousand years of Buddhist cave murals and statues — plus the Singing Sand Dunes (Mingsha Shan) and the Crescent Lake oasis. A long way out west, and worth every hour.',
    tip: 'Mogao entry is timed and capped — reserve well ahead. The night dunes (camel + sunset over Crescent Lake) are magic. November is cold and clear; pack real layers.',
    tags: ['silk road', 'caves', 'desert', 'remote'], embeds: [], itinerary: {},
  },
  {
    id: 'guiyang-huangguoshu', name: 'Guiyang + Huangguoshu Falls', color: '#D4537E',
    dates: 'Nov 28–Dec 1', days: [{ m: 11, d: 28 }, { m: 11, d: 29 }, { m: 11, d: 30 }, { m: 12, d: 1 }],
    desc: 'Guizhou’s karst country. Use Guiyang as a base for Huangguoshu Waterfall — the largest in Asia, where you walk behind the curtain through Water Curtain Cave — plus the Tianxingqiao karst scenery and nearby Miao and Buyi villages.',
    tip: 'The combo ticket (Doupotang + main falls + Tianxingqiao) is a full day; go on a weekday and bring a poncho — the spray behind the falls will soak you.',
    tags: ['karst', 'waterfall', 'nature', 'guizhou'], embeds: [], itinerary: {},
  },
  {
    id: 'december-revisit', name: 'December — Shanghai revisit + Suzhou local', color: '#378ADD',
    dates: 'Dec 5, 6, 12, 13, 19, 20, 27, 28',
    days: [{ m: 12, d: 5 }, { m: 12, d: 6 }, { m: 12, d: 12 }, { m: 12, d: 13 }, { m: 12, d: 19 }, { m: 12, d: 20 }, { m: 12, d: 27 }, { m: 12, d: 28 }],
    desc: 'Easy winter weekends close to home. Alternate Shanghai revisits (museums, concession-era cafés, rooftop bars) with quiet local Suzhou days — gardens in winter light, Jinji Lake, and the silk and embroidery workshops without the autumn crowds.',
    tip: 'Winter is low season — gardens are nearly empty and cheap. Pick a clear cold day for the Shanghai skyline; haze is worst on warm, humid days.',
    tags: ['winter', 'local', 'low-key', 'revisit'], embeds: [], itinerary: {},
  },
];

/* ───────────────────── default tips (bulleted + detail) ─────────── */

const DEFAULT_TIPS = [
  {
    id: 'tip-trains', icon: '🚄', title: 'Trains',
    bullets: [
      'Book on the 12306 app or Trip.com',
      'Passport is your ticket ID — always carry it',
      'Most trips are 1.5–6h from the Suzhou/Shanghai hub',
      'Book 2–4 weeks ahead; far earlier for Golden Week',
    ],
    detail: 'High-speed rail (G-trains) is the backbone — book on the 12306 app or Trip.com. Most of these trips are 1.5–6h by train from the Suzhou/Shanghai hub. Your passport is your ticket ID; carry it. Book 2–4 weeks ahead, and much sooner for Golden Week.',
  },
  {
    id: 'tip-schedule', icon: '🗺️', title: 'Schedule logic',
    bullets: [
      'Weekends → close cities (Suzhou, Shanghai, Hangzhou, Nanjing)',
      'Long breaks → far ones (Chengdu/Chongqing, Gansu)',
      'Trips fan outward from a Suzhou base',
      'Nearest-first in autumn, west/south as it cools',
    ],
    detail: 'Weekends for the close cities (Suzhou, Shanghai, Hangzhou, Nanjing); long breaks for the far ones (Chengdu/Chongqing on Golden Week, Gansu over five days). The trips fan outward from a Suzhou base — nearest-first in early autumn, west and south as it gets cold.',
  },
  {
    id: 'tip-budget', icon: '💰', title: 'Budget',
    bullets: [
      'Train ¥150–600 each way',
      'Mid-range hotel ¥250–500/night',
      'Food ¥100–150/day',
      'Pay with Alipay / WeChat everywhere',
    ],
    detail: 'Rough per trip: high-speed train ¥150–600 each way, mid-range hotel ¥250–500/night, food ¥100–150/day. The far western trips cost more in transport but less on the ground. Pay with Alipay or WeChat almost everywhere — link a foreign card first.',
  },
  {
    id: 'tip-apps', icon: '📱', title: 'Apps',
    bullets: [
      'Alipay + WeChat (payments)',
      'Amap / Baidu Maps (Google Maps fails here)',
      '12306 / Trip.com (trains)',
      'Dianping (the Chinese Yelp)',
      'VPN installed before you arrive',
    ],
    detail: 'Essentials: Alipay + WeChat (payments), Amap or Baidu Maps (Google Maps doesn’t work here), 12306 or Trip.com (trains), Dianping (the Chinese Yelp), and a VPN installed before you arrive if you need Google or Instagram.',
  },
  {
    id: 'tip-xinjiang', icon: '⚠️', title: 'Xinjiang caveat',
    bullets: [
      'Xinjiang (Kashgar, Urumqi) left off on purpose',
      'Permits, checkpoints, sensitivities',
      'Plan it as its own dedicated trip',
      'Gansu/Dunhuang = Silk Road without the hassle',
    ],
    detail: 'Far-western Xinjiang (Kashgar, Urumqi) is deliberately left off — permits, checkpoints, and sensitivities make it a separate, carefully planned trip. Gansu/Dunhuang is the western edge of this schedule and delivers the Silk Road and desert without that complexity.',
  },
  {
    id: 'tip-weather', icon: '🌤️', title: 'Weather',
    bullets: [
      'Sep–Oct = warm, dry, golden (the sweet spot)',
      'Nov cools fast — Gansu desert nights, damp Guizhou',
      'Pack layers + a rain shell for November',
      'Dec is mild but gray on the coast',
    ],
    detail: 'Sep–Oct is the sweet spot — warm, dry, golden. November cools fast, especially Gansu’s desert nights and Guizhou’s damp karst (pack layers + a rain shell). December is mild but gray on the coast; keep it to nearby low-season weekends.',
  },
];

/* ───────────────────── default month checklists ────────────────── */

const EMPTY_CHECK = { 9: [], 10: [], 11: [], 12: [] };

const DEFAULT_CHECKLISTS = {
  9: [
    { id: 'c9-1', text: 'Book Suzhou / Shanghai weekend trains', done: false },
    { id: 'c9-2', text: 'Reserve Hangzhou hotel near West Lake', done: false },
  ],
  10: [
    { id: 'c10-1', text: 'Book Golden Week trains the day they open', done: false },
    { id: 'c10-2', text: 'Reserve Chengdu panda base (30 days out)', done: false },
    { id: 'c10-3', text: 'Buy Xi’an Terracotta + Lintong show tickets', done: false },
    { id: 'c10-4', text: 'Get Zhangjiajie multi-day park pass', done: false },
  ],
  11: [
    { id: 'c11-1', text: 'Book Qingdao + Gansu transport', done: false },
    { id: 'c11-2', text: 'Reserve Mogao Caves timed entry', done: false },
    { id: 'c11-3', text: 'Pack layers for Gansu desert nights', done: false },
  ],
  12: [
    { id: 'c12-1', text: 'Pick a clear day for the Shanghai skyline', done: false },
    { id: 'c12-2', text: 'Book any winter Suzhou workshop visits', done: false },
  ],
};

/* ───────────────────────── helpers ─────────────────────────────── */

const MONTHS = [
  { name: 'September', m: 9, idx: 8 },
  { name: 'October', m: 10, idx: 9 },
  { name: 'November', m: 11, idx: 10 },
  { name: 'December', m: 12, idx: 11 },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_ABBR = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
};

const daysInMonth = (idx) => new Date(2025, idx + 1, 0).getDate();
const firstWeekdayMon = (idx) => (new Date(2025, idx, 1).getDay() + 6) % 7;
const isFriday = (idx, d) => new Date(2025, idx, d).getDay() === 5;
const isGoldenWeek = (m, d) => m === 10 && d >= 1 && d <= 7;
const tripForDay = (trips, m, d) =>
  trips.find((t) => (t.days || []).some((x) => x.m === m && x.d === d)) || null;

const shortName = (t) => (t.name.split('—')[0] || t.name).trim();
const uid = () => 'id-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const dayKey = (m, d) => m + '-' + d;

function hexToRgba(hex, a) {
  let h = (hex || '#000000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function toEmbedUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return 'https://www.youtube.com/embed/' + u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return url;
      const v = u.searchParams.get('v');
      if (v) return 'https://www.youtube.com/embed/' + v;
    }
    return url;
  } catch {
    return url;
  }
}

// Build a human label like "Oct 31–Nov 3" or "Dec 5, 6, 12–13" from days[].
function daysToLabel(days) {
  const sorted = (days || [])
    .filter((x) => x && Number.isFinite(x.m) && Number.isFinite(x.d))
    .sort((a, b) => a.m - b.m || a.d - b.d);
  if (!sorted.length) return '';
  const isNext = (a, b) =>
    new Date(2025, b.m - 1, b.d) - new Date(2025, a.m - 1, a.d) === 86400000;
  const runs = [];
  let run = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (isNext(sorted[i - 1], sorted[i])) run.push(sorted[i]);
    else { runs.push(run); run = [sorted[i]]; }
  }
  runs.push(run);
  return runs
    .map((r) => {
      const s = r[0], e = r[r.length - 1];
      if (r.length === 1) return `${MONTH_ABBR[s.m]} ${s.d}`;
      if (s.m === e.m) return `${MONTH_ABBR[s.m]} ${s.d}–${e.d}`;
      return `${MONTH_ABBR[s.m]} ${s.d}–${MONTH_ABBR[e.m]} ${e.d}`;
    })
    .join(', ');
}

// Repair / auto-fill an imported trip object.
function repairTrip(t, usedIds) {
  const trip = { ...t };
  trip.days = Array.isArray(trip.days)
    ? trip.days.filter((x) => x && Number.isFinite(x.m) && Number.isFinite(x.d)).map((x) => ({ m: x.m, d: x.d }))
    : [];
  if (!trip.id || usedIds.has(trip.id)) trip.id = uid();
  usedIds.add(trip.id);
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trip.color || '')) {
    trip.color = COLOR_PALETTE[usedIds.size % COLOR_PALETTE.length];
  }
  if (!trip.dates || !String(trip.dates).trim()) trip.dates = daysToLabel(trip.days);
  if (typeof trip.name !== 'string') trip.name = '';
  if (typeof trip.desc !== 'string') trip.desc = '';
  if (typeof trip.tip !== 'string') trip.tip = '';
  trip.tags = Array.isArray(trip.tags) ? trip.tags : [];
  trip.embeds = Array.isArray(trip.embeds) ? trip.embeds : [];
  trip.itinerary = (trip.itinerary && typeof trip.itinerary === 'object' && !Array.isArray(trip.itinerary)) ? trip.itinerary : {};
  return trip;
}

/* ───────────────────────── styles ──────────────────────────────── */

const STYLES = `
.ctc { --mono: ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:${C.primary}; max-width:1100px; margin:0 auto; }
.ctc *, .ctc *::before, .ctc *::after { box-sizing:border-box; }

.ctc-eyebrow { font-size:10.5px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;
  color:${C.tertiary}; display:flex; align-items:center; gap:12px; }
.ctc-eyebrow::before { content:''; width:18px; height:1px; background:${C.tertiary}; opacity:0.6; flex:none; }
.ctc-eyebrow::after { content:''; flex:1; height:1px; background:linear-gradient(90deg, rgba(255,255,255,0.08), transparent); }

.ctc-card { background:rgba(255,255,255,0.04); border-radius:16px; padding:18px 22px;
  -webkit-backdrop-filter:blur(24px) saturate(1.2); backdrop-filter:blur(24px) saturate(1.2);
  box-shadow:0 12px 40px rgba(0,0,0,0.45); }

.ctc-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); color:${C.primary};
  border-radius:999px; padding:8px 16px; font-size:12.5px; font-weight:600; font-family:inherit;
  cursor:pointer; transition:background .15s, border-color .15s; white-space:nowrap; }
.ctc-btn:hover { background:rgba(255,255,255,0.09); border-color:rgba(255,255,255,0.18); }
.ctc-btn-primary { background:linear-gradient(180deg,#FFFFFF 0%,#E8E5DD 100%); color:#0A0A0B;
  border:none; border-radius:999px; padding:8px 18px; font-size:12.5px; font-weight:700; font-family:inherit;
  cursor:pointer; box-shadow:0 1px 0 rgba(255,255,255,0.4) inset, 0 6px 18px rgba(0,0,0,0.35);
  transition:transform .15s, filter .15s; white-space:nowrap; }
.ctc-btn-primary:hover { transform:translateY(-1px); filter:brightness(1.04); }
.ctc-link-danger { background:none; border:none; color:${C.danger}; font-family:inherit; font-size:12px;
  cursor:pointer; opacity:0.8; padding:8px 6px; }
.ctc-link-danger:hover { opacity:1; text-decoration:underline; }

.ctc-toolbar { display:flex; align-items:center; justify-content:flex-end; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
.ctc-msg { font-size:11px; font-family:var(--mono); margin-right:auto; }
.ctc-msg.ok { color:${C.success}; }
.ctc-msg.err { color:${C.danger}; }
.ctc-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
.ctc-tab { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:${C.tertiary};
  border-radius:999px; padding:8px 16px; font-size:12.5px; font-weight:600; font-family:inherit; cursor:pointer;
  transition:background .15s, color .15s, border-color .15s; }
.ctc-tab:hover { color:${C.secondary}; background:rgba(255,255,255,0.07); }
.ctc-tab.active { background:rgba(255,255,255,0.12); color:${C.primary}; border-color:rgba(255,255,255,0.18); }

.ctc-section-head { display:flex; align-items:center; gap:14px; margin-bottom:16px; }

/* month switcher */
.ctc-monthswitch { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
.ctc-mchip { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:${C.tertiary};
  border-radius:999px; padding:7px 15px; font-size:12px; font-weight:600; font-family:inherit; cursor:pointer;
  transition:background .15s, color .15s, border-color .15s; }
.ctc-mchip:hover { color:${C.secondary}; background:rgba(255,255,255,0.07); }
.ctc-mchip.on { background:rgba(255,255,255,0.12); color:${C.primary}; border-color:rgba(255,255,255,0.18); }

.ctc-legend { display:flex; flex-wrap:wrap; gap:10px 16px; margin-bottom:18px; }
.ctc-legend-item { display:flex; align-items:center; gap:7px; font-size:11px; font-family:var(--mono); color:${C.tertiary}; }
.ctc-legend-sq { width:10px; height:10px; border-radius:3px; flex:none; }
.ctc-legend-dot { width:8px; height:8px; border-radius:999px; flex:none; }

.ctc-months { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.ctc-single { max-width:860px; }
.ctc-dow { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin:0 0 4px; }
.ctc-dow-cell { font-size:10px; font-family:var(--mono); color:${C.tertiary}; text-align:center; padding:2px 0; }
.ctc-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
.ctc-grid.lg { gap:6px; }
.ctc-cell { border-radius:8px; border:0.5px solid rgba(255,255,255,0.06); min-height:68px; padding:6px;
  background:rgba(255,255,255,0.02); position:relative; display:flex; flex-direction:column; gap:3px;
  transition:background .15s; overflow:hidden; }
.ctc-grid.lg .ctc-cell { min-height:96px; padding:8px; }
.ctc-cell.empty { border:none; background:none; min-height:0; }
.ctc-cell.has-trip { cursor:pointer; }
.ctc-cell:not(.empty):hover { background:rgba(255,255,255,0.05); }
.ctc-cell.sel { outline:1px solid rgba(255,255,255,0.28); }
.ctc-cell-num { font-size:11px; font-family:var(--mono); font-weight:500; color:${C.secondary}; }
.ctc-grid.lg .ctc-cell-num { font-size:13px; }
.ctc-cell-fri { font-size:9px; font-family:var(--mono); color:${C.success}; letter-spacing:0.08em; }
.ctc-cell-trip { font-size:9px; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ctc-grid.lg .ctc-cell-trip { font-size:10px; white-space:normal; }

/* checklist */
.ctc-checklist { margin-top:18px; }
.ctc-check-head { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.ctc-check-count { font-size:11px; font-family:var(--mono); color:${C.tertiary}; }
.ctc-check-row { display:flex; align-items:center; gap:10px; padding:7px 0; }
.ctc-check-row.done .ctc-check-text { color:${C.tertiary}; text-decoration:line-through; }
.ctc-check-box { width:20px; height:20px; border-radius:6px; border:1.5px solid rgba(255,255,255,0.18);
  background:rgba(255,255,255,0.04); color:#0A0A0B; font-size:12px; cursor:pointer; flex:none;
  display:flex; align-items:center; justify-content:center; }
.ctc-check-box.on { background:${C.success}; border-color:${C.success}; box-shadow:0 0 10px rgba(107,227,164,0.4); }
.ctc-check-text { flex:1; font-size:13.5px; color:${C.primary}; }
.ctc-check-add { display:flex; gap:8px; margin-top:12px; }
.ctc-check-add .ctc-input { flex:1; }

/* detail panel */
.ctc-detail-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.ctc-detail-title { font-size:18px; font-weight:700; color:${C.primary}; }
.ctc-detail-dates { font-size:11px; font-family:var(--mono); color:${C.tertiary}; margin-top:3px; }
.ctc-detail-desc { font-size:14px; color:${C.secondary}; line-height:1.7; margin:14px 0 0; }
.ctc-tip { display:flex; gap:8px; background:rgba(255,255,255,0.04); border-radius:12px; padding:10px 12px;
  font-size:13px; color:${C.secondary}; line-height:1.5; margin-top:14px; }
.ctc-tip-icon { flex:none; }
.ctc-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:14px; }
.ctc-tag { font-size:11px; font-family:var(--mono); color:${C.tertiary}; background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.10); border-radius:999px; padding:3px 9px; }
.ctc-empty { font-size:12px; color:${C.tertiary}; font-style:italic; padding:8px 0; }

/* itinerary */
.ctc-daychips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.ctc-daychip { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); color:${C.secondary};
  border-radius:999px; padding:6px 12px; font-size:12px; font-family:var(--mono); cursor:pointer;
  display:inline-flex; align-items:center; gap:6px; }
.ctc-daychip:hover { background:rgba(255,255,255,0.08); }
.ctc-daychip.on { background:rgba(255,255,255,0.12); color:${C.primary}; border-color:rgba(255,255,255,0.2); }
.ctc-daychip-n { background:rgba(255,255,255,0.14); border-radius:999px; font-size:10px; padding:0 6px; }
.ctc-agenda { margin-bottom:4px; }
.ctc-ag-row { display:flex; gap:12px; align-items:flex-start; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
.ctc-ag-time { font-family:var(--mono); font-size:12.5px; font-weight:600; color:${C.warning}; min-width:52px; padding-top:1px; }
.ctc-ag-body { flex:1; min-width:0; }
.ctc-ag-title { font-size:13.5px; color:${C.primary}; }
.ctc-ag-place { font-size:12px; color:${C.secondary}; margin-top:2px; }
.ctc-ag-note { font-size:12px; color:${C.tertiary}; margin-top:3px; white-space:pre-wrap; line-height:1.5; }
.ctc-ag-del { background:none; border:none; color:${C.tertiary}; font-size:18px; line-height:1; cursor:pointer; padding:0 4px; flex:none; }
.ctc-ag-del:hover { color:${C.danger}; }
.ctc-ag-edit { display:flex; flex-direction:column; gap:8px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
.ctc-ag-edit .ctc-input, .ctc-ag-edit .ctc-textarea { width:100%; }
.ctc-ag-actions { display:flex; gap:8px; justify-content:flex-end; }
.ctc-ag-add { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }

/* embeds */
.ctc-embed-link { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.10); border-radius:999px; padding:7px 13px; font-size:12.5px;
  color:${C.primary}; text-decoration:none; margin:0 8px 8px 0; transition:background .15s; }
.ctc-embed-link:hover { background:rgba(255,255,255,0.09); }
.ctc-ext { color:${C.tertiary}; font-size:11px; }
.ctc-embed-block { margin-bottom:12px; }
.ctc-embed-vlabel { font-size:12px; color:${C.tertiary}; font-family:var(--mono); margin-bottom:6px; }
.ctc-embed-video { position:relative; width:100%; padding-top:56.25%; border-radius:8px; overflow:hidden; }
.ctc-embed-video iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.ctc-embed-note { background:rgba(255,255,255,0.03); border-left:2px solid rgba(255,255,255,0.12);
  border-radius:0 8px 8px 0; padding:10px 14px; margin-bottom:12px; }
.ctc-embed-nlabel { font-size:11px; font-family:var(--mono); color:${C.tertiary}; text-transform:uppercase;
  letter-spacing:0.1em; margin-bottom:4px; }
.ctc-embed-ntext { font-size:13px; color:${C.secondary}; line-height:1.6; white-space:pre-wrap; }
.ctc-embed-form { display:flex; flex-wrap:wrap; gap:8px; align-items:flex-start; margin-top:14px;
  padding-top:14px; border-top:1px solid rgba(255,255,255,0.08); }
.ctc-embed-form .ctc-input { flex:1; min-width:140px; }
.ctc-embed-form .ctc-textarea { flex:1 0 100%; }

/* inputs */
.ctc-input, .ctc-select, .ctc-textarea { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10);
  color:${C.primary}; border-radius:10px; padding:9px 12px; font-size:13px; font-family:inherit; outline:none;
  transition:border-color .15s; }
.ctc-input::placeholder, .ctc-textarea::placeholder { color:${C.tertiary}; }
.ctc-input:focus, .ctc-select:focus, .ctc-textarea:focus { border-color:rgba(255,255,255,0.35); }
.ctc-textarea { resize:vertical; line-height:1.5; }
.ctc-select { cursor:pointer; }
.ctc-input.full, .ctc-textarea.full { width:100%; }

/* all trips */
.ctc-trip-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px; }
.ctc-trip-card { position:relative; cursor:pointer; transition:background .15s, transform .15s; }
.ctc-trip-card:hover { background:rgba(255,255,255,0.06); transform:translateY(-2px); }
.ctc-trip-card-name { font-size:14px; font-weight:600; color:${C.primary}; padding-right:26px; }
.ctc-trip-card-dates { font-size:11px; font-family:var(--mono); color:${C.tertiary}; margin-top:4px; }
.ctc-trip-card-desc { font-size:12px; color:${C.secondary}; line-height:1.55; margin-top:8px;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.ctc-badge { display:inline-block; font-size:10px; font-family:var(--mono); color:${C.tertiary};
  background:rgba(255,255,255,0.05); border-radius:999px; padding:2px 8px; margin-top:10px; }
.ctc-edit-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); color:${C.tertiary};
  border-radius:8px; width:28px; height:28px; font-size:14px; cursor:pointer; flex:none;
  transition:background .15s, color .15s; }
.ctc-edit-btn:hover { background:rgba(255,255,255,0.1); color:${C.primary}; }
.ctc-edit-abs { position:absolute; top:14px; right:14px; }

/* tips */
.ctc-tips-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start; }
.ctc-tip-card { cursor:pointer; }
.ctc-tip-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ctc-tip-head-r { display:flex; align-items:center; gap:8px; flex:none; }
.ctc-tip-card-title { display:flex; align-items:center; gap:9px; font-size:14px; font-weight:600; color:${C.primary}; }
.ctc-chev { color:${C.tertiary}; font-size:12px; }
.ctc-bullets { margin:12px 0 0; padding-left:18px; }
.ctc-bullets li { font-size:13px; color:${C.secondary}; line-height:1.5; margin-bottom:5px; }
.ctc-tip-detail { font-size:13px; color:${C.secondary}; line-height:1.65; margin-top:12px;
  padding-top:12px; border-top:1px solid rgba(255,255,255,0.08); }

/* modal */
.ctc-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); -webkit-backdrop-filter:blur(8px);
  backdrop-filter:blur(8px); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px;
  overflow:auto; z-index:1000; }
.ctc-modal { width:100%; max-width:560px; }
.ctc-modal-title { font-size:16px; font-weight:700; color:${C.primary}; margin-bottom:16px; }
.ctc-field { margin-bottom:14px; }
.ctc-label { font-size:10.5px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;
  color:${C.tertiary}; margin-bottom:6px; }
.ctc-color-row { display:flex; gap:10px; align-items:center; }
.ctc-color { width:42px; height:34px; padding:0; border:1px solid rgba(255,255,255,0.10); border-radius:8px;
  background:transparent; cursor:pointer; }
.ctc-modal-actions { display:flex; align-items:center; gap:10px; margin-top:20px; }
.ctc-delete-link { background:none; border:none; color:${C.danger}; font-family:inherit; font-size:12.5px;
  cursor:pointer; opacity:0.85; padding:8px 2px; }
.ctc-delete-link:hover { opacity:1; text-decoration:underline; }

/* day picker */
.ctc-daypicker { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.ctc-dp-mlabel { font-size:10px; font-family:var(--mono); color:${C.tertiary}; text-transform:uppercase;
  letter-spacing:0.1em; margin-bottom:5px; }
.ctc-dp-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
.ctc-dp-cell { aspect-ratio:1/1; min-height:22px; border-radius:5px; border:1px solid rgba(255,255,255,0.08);
  background:rgba(255,255,255,0.03); color:${C.secondary}; font-size:10px; font-family:var(--mono);
  cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; transition:background .12s; }
.ctc-dp-cell:hover { background:rgba(255,255,255,0.08); }
.ctc-dp-cell.empty { border:none; background:none; cursor:default; }
.ctc-dp-cell.on { font-weight:700; }

@media (max-width:768px) {
  .ctc-months { grid-template-columns:1fr; }
  .ctc-tips-grid { grid-template-columns:1fr; }
  .ctc-daypicker { grid-template-columns:1fr; }
  .ctc-single { max-width:none; }
  .ctc-overlay { padding:0; }
  .ctc-modal { max-width:none; min-height:100vh; border-radius:0; }
}
@media (max-width:480px) {
  .ctc-cell { min-height:56px; }
  .ctc-grid.lg .ctc-cell { min-height:64px; }
  .ctc-cell-num { font-size:10px; }
  .ctc-detail-title { font-size:16px; }
  .ctc-trip-card-name { font-size:13px; }
}
`;

/* ───────────────────────── subcomponents ───────────────────────── */

function Legend({ trips }) {
  return (
    <div className="ctc-legend">
      {trips.map((t) => (
        <span className="ctc-legend-item" key={t.id}>
          <span className="ctc-legend-sq" style={{ background: t.color }} />
          {shortName(t)}
        </span>
      ))}
      <span className="ctc-legend-item">
        <span className="ctc-legend-dot" style={{ background: C.success }} />Friday off
      </span>
      <span className="ctc-legend-item">
        <span className="ctc-legend-dot" style={{ background: C.warning }} />Golden Week
      </span>
    </div>
  );
}

function MonthGrid({ month, trips, selectedTrip, selectedDay, onPick, large }) {
  const total = daysInMonth(month.idx);
  const offset = firstWeekdayMon(month.idx);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<div key={'b' + i} className="ctc-cell empty" />);
  for (let d = 1; d <= total; d++) {
    const trip = tripForDay(trips, month.m, d);
    const fri = isFriday(month.idx, d);
    const gw = isGoldenWeek(month.m, d);
    const style = {};
    if (trip) {
      style.background = hexToRgba(trip.color, 0.12);
      style.borderColor = hexToRgba(trip.color, 0.3);
    }
    if (gw) style.boxShadow = 'inset 3px 0 0 0 rgba(242,192,99,0.6)';
    else if (!trip && fri) style.boxShadow = 'inset 3px 0 0 0 rgba(107,227,164,0.4)';
    const isSel = trip && selectedTrip === trip.id &&
      selectedDay && selectedDay.m === month.m && selectedDay.d === d;
    const cls = 'ctc-cell' + (trip ? ' has-trip' : '') + (isSel ? ' sel' : '');
    cells.push(
      <div
        key={d}
        className={cls}
        style={style}
        title={trip ? trip.name : ''}
        onClick={trip ? () => onPick(trip.id, { m: month.m, d }) : undefined}
      >
        <span className="ctc-cell-num">{d}</span>
        {trip && <span className="ctc-cell-trip" style={{ color: trip.color }}>{shortName(trip)}</span>}
        {!trip && fri && !gw && <span className="ctc-cell-fri">FRI</span>}
      </div>
    );
  }
  return (
    <div className="ctc-month">
      <div className="ctc-eyebrow" style={{ marginBottom: 10 }}>{month.name} 2025</div>
      <div className="ctc-dow">{WEEKDAYS.map((w) => <div key={w} className="ctc-dow-cell">{w}</div>)}</div>
      <div className={'ctc-grid' + (large ? ' lg' : '')}>{cells}</div>
    </div>
  );
}

function Checklist({ month, items, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState('');
  const monthName = (MONTHS.find((x) => x.m === month) || {}).name || '';
  const submit = () => { if (!text.trim()) return; onAdd(text.trim()); setText(''); };
  const done = items.filter((i) => i.done).length;
  return (
    <div className="ctc-card ctc-checklist">
      <div className="ctc-check-head">
        <div className="ctc-eyebrow" style={{ flex: 1 }}>{monthName} — to do</div>
        <span className="ctc-check-count">{done}/{items.length}</span>
      </div>
      {items.length === 0 && <div className="ctc-empty">No tasks for {monthName} yet — add one below.</div>}
      {items.map((it) => (
        <div className={'ctc-check-row' + (it.done ? ' done' : '')} key={it.id}>
          <button className={'ctc-check-box' + (it.done ? ' on' : '')} onClick={() => onToggle(it.id)} aria-label="toggle">{it.done ? '✓' : ''}</button>
          <span className="ctc-check-text">{it.text}</span>
          <button className="ctc-ag-del" title="Delete" onClick={() => onDelete(it.id)}>×</button>
        </div>
      ))}
      <div className="ctc-check-add">
        <input className="ctc-input" placeholder={'Add a task for ' + monthName + '…'} value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="ctc-btn-primary" onClick={submit}>Add</button>
      </div>
    </div>
  );
}

function EmbedView({ embed }) {
  if (embed.type === 'link') {
    return (
      <a className="ctc-embed-link" href={embed.url} target="_blank" rel="noopener noreferrer">
        {embed.label || embed.url} <span className="ctc-ext">↗</span>
      </a>
    );
  }
  if (embed.type === 'video') {
    return (
      <div className="ctc-embed-block">
        {embed.label && <div className="ctc-embed-vlabel">{embed.label}</div>}
        <div className="ctc-embed-video">
          <iframe src={toEmbedUrl(embed.url)} title={embed.label || 'video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      </div>
    );
  }
  return (
    <div className="ctc-embed-note">
      <div className="ctc-embed-nlabel">{embed.type === 'plan' ? '📋 ' : '📝 '}{embed.label}</div>
      <div className="ctc-embed-ntext">{embed.content}</div>
    </div>
  );
}

function AddEmbedForm({ onAdd }) {
  const [type, setType] = useState('link');
  const [label, setLabel] = useState('');
  const [val, setVal] = useState('');
  const isText = type === 'note' || type === 'plan';
  const submit = () => {
    if (!label.trim() && !val.trim()) return;
    const embed = { type, label: label.trim() };
    if (isText) embed.content = val; else embed.url = val.trim();
    onAdd(embed); setLabel(''); setVal('');
  };
  return (
    <div className="ctc-embed-form">
      <select className="ctc-select" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="link">Link</option><option value="video">Video</option>
        <option value="note">Note</option><option value="plan">Plan</option>
      </select>
      <input className="ctc-input" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
      {isText
        ? <textarea className="ctc-textarea" rows={2} placeholder={type === 'plan' ? 'Plan details…' : 'Note…'} value={val} onChange={(e) => setVal(e.target.value)} />
        : <input className="ctc-input" placeholder={type === 'video' ? 'YouTube URL' : 'https://…'} value={val} onChange={(e) => setVal(e.target.value)} />}
      <button className="ctc-btn-primary" onClick={submit}>Add</button>
    </div>
  );
}

function AgendaRow({ item, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(item);
  if (editing) {
    return (
      <div className="ctc-ag-edit">
        <input type="time" className="ctc-input" value={f.time || ''} onChange={(e) => setF({ ...f, time: e.target.value })} />
        <input className="ctc-input" placeholder="What" value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className="ctc-input" placeholder="Where (optional)" value={f.place || ''} onChange={(e) => setF({ ...f, place: e.target.value })} />
        <textarea className="ctc-textarea" rows={2} placeholder="Notes (optional)" value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} />
        <div className="ctc-ag-actions">
          <button className="ctc-btn" onClick={() => { setF(item); setEditing(false); }}>Cancel</button>
          <button className="ctc-btn-primary" onClick={() => { onUpdate({ time: f.time, title: f.title, place: f.place, note: f.note }); setEditing(false); }}>Save</button>
        </div>
      </div>
    );
  }
  return (
    <div className="ctc-ag-row">
      <span className="ctc-ag-time">{item.time || '—'}</span>
      <div className="ctc-ag-body">
        <div className="ctc-ag-title">{item.title || '(untitled)'}</div>
        {item.place && <div className="ctc-ag-place">📍 {item.place}</div>}
        {item.note && <div className="ctc-ag-note">{item.note}</div>}
      </div>
      <button className="ctc-edit-btn" title="Edit" onClick={() => { setF(item); setEditing(true); }}>✎</button>
      <button className="ctc-ag-del" title="Delete" onClick={onDelete}>×</button>
    </div>
  );
}

function AddAgenda({ onAdd }) {
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const submit = () => { if (!title.trim() && !time) return; onAdd({ time, title: title.trim() }); setTime(''); setTitle(''); };
  return (
    <div className="ctc-ag-add">
      <input type="time" className="ctc-input" style={{ width: 120 }} value={time} onChange={(e) => setTime(e.target.value)} />
      <input className="ctc-input" style={{ flex: 1, minWidth: 160 }} placeholder="Add a time block — e.g. Lunch on Pingjiang Lu"
        value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      <button className="ctc-btn-primary" onClick={submit}>Add</button>
    </div>
  );
}

function ItinerarySection({ trip, selectedDay, onSelectDay, onAdd, onUpdate, onDelete }) {
  const days = [...(trip.days || [])].sort((a, b) => a.m - b.m || a.d - b.d);
  if (!days.length) return null;
  const active = (selectedDay && days.some((x) => x.m === selectedDay.m && x.d === selectedDay.d)) ? selectedDay : days[0];
  const key = dayKey(active.m, active.d);
  const items = [...((trip.itinerary && trip.itinerary[key]) || [])].sort((a, b) => (a.time || '~').localeCompare(b.time || '~'));
  return (
    <div>
      <div className="ctc-eyebrow" style={{ margin: '20px 0 12px' }}>Itinerary</div>
      <div className="ctc-daychips">
        {days.map((d) => {
          const k = dayKey(d.m, d.d);
          const on = active.m === d.m && active.d === d.d;
          const n = ((trip.itinerary && trip.itinerary[k]) || []).length;
          return (
            <button key={k} className={'ctc-daychip' + (on ? ' on' : '')} onClick={() => onSelectDay(d)}>
              {MONTH_ABBR[d.m]} {d.d}{n > 0 && <span className="ctc-daychip-n">{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="ctc-agenda">
        {items.length === 0 && <div className="ctc-empty">No plan for {MONTH_ABBR[active.m]} {active.d} yet — add a time block below.</div>}
        {items.map((it) => (
          <AgendaRow key={it.id} item={it} onUpdate={(p) => onUpdate(key, it.id, p)} onDelete={() => onDelete(key, it.id)} />
        ))}
      </div>
      <AddAgenda onAdd={(it) => onAdd(key, it)} />
    </div>
  );
}

function DetailPanel({ trip, selectedDay, onSelectDay, onEdit, onAddEmbed, onAddAgenda, onUpdateAgenda, onDeleteAgenda }) {
  return (
    <div className="ctc-card" style={{ borderLeft: '3px solid ' + trip.color, marginTop: 18 }}>
      <div className="ctc-detail-head">
        <div>
          <div className="ctc-detail-title">{trip.name}</div>
          <div className="ctc-detail-dates">{trip.dates} · {(trip.days || []).length} day{(trip.days || []).length !== 1 ? 's' : ''}</div>
        </div>
        <button className="ctc-edit-btn" title="Edit trip" onClick={() => onEdit(trip.id)}>✎</button>
      </div>
      {trip.desc && <p className="ctc-detail-desc">{trip.desc}</p>}
      {trip.tip && <div className="ctc-tip"><span className="ctc-tip-icon">💡</span><span>{trip.tip}</span></div>}
      {trip.tags && trip.tags.length > 0 && (
        <div className="ctc-tags">{trip.tags.map((t, i) => <span key={i} className="ctc-tag">{t}</span>)}</div>
      )}

      <ItinerarySection
        trip={trip} selectedDay={selectedDay} onSelectDay={onSelectDay}
        onAdd={onAddAgenda} onUpdate={onUpdateAgenda} onDelete={onDeleteAgenda}
      />

      <div className="ctc-eyebrow" style={{ margin: '20px 0 12px' }}>Embeds</div>
      {(!trip.embeds || trip.embeds.length === 0) && (
        <div className="ctc-empty">No embeds yet — add a link, video, note, or plan below.</div>
      )}
      {(trip.embeds || []).map((em, i) => <EmbedView key={i} embed={em} />)}
      <AddEmbedForm onAdd={onAddEmbed} />
    </div>
  );
}

function TripCard({ trip, onOpen, onEdit }) {
  return (
    <div className="ctc-card ctc-trip-card" style={{ borderLeft: '3px solid ' + trip.color }} onClick={() => onOpen(trip.id)}>
      <button className="ctc-edit-btn ctc-edit-abs" title="Edit trip" onClick={(e) => { e.stopPropagation(); onEdit(trip.id); }}>✎</button>
      <div className="ctc-trip-card-name">{trip.name}</div>
      <div className="ctc-trip-card-dates">{trip.dates}</div>
      {trip.desc && <div className="ctc-trip-card-desc">{trip.desc}</div>}
      {trip.tags && trip.tags.length > 0 && (
        <div className="ctc-tags" style={{ marginTop: 10 }}>{trip.tags.slice(0, 4).map((t, i) => <span key={i} className="ctc-tag">{t}</span>)}</div>
      )}
      {trip.embeds && trip.embeds.length > 0 && (
        <div className="ctc-badge">{trip.embeds.length} embed{trip.embeds.length !== 1 ? 's' : ''}</div>
      )}
    </div>
  );
}

function TipCard({ tip, expanded, onToggle, onEdit }) {
  return (
    <div className="ctc-card ctc-tip-card" onClick={onToggle}>
      <div className="ctc-tip-head">
        <div className="ctc-tip-card-title"><span>{tip.icon}</span>{tip.title}</div>
        <div className="ctc-tip-head-r">
          <button className="ctc-edit-btn" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(tip.id); }}>✎</button>
          <span className="ctc-chev">{expanded ? '▴' : '▾'}</span>
        </div>
      </div>
      {tip.bullets && tip.bullets.length > 0 && (
        <ul className="ctc-bullets">{tip.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
      )}
      {expanded && tip.detail && <div className="ctc-tip-detail">{tip.detail}</div>}
    </div>
  );
}

function DayPicker({ days, color, onToggle }) {
  const has = (m, d) => days.some((x) => x.m === m && x.d === d);
  return (
    <div className="ctc-daypicker">
      {MONTHS.map((mn) => {
        const total = daysInMonth(mn.idx);
        const offset = firstWeekdayMon(mn.idx);
        const cells = [];
        for (let i = 0; i < offset; i++) cells.push(<div key={'b' + i} className="ctc-dp-cell empty" />);
        for (let d = 1; d <= total; d++) {
          const on = has(mn.m, d);
          cells.push(
            <button key={d} type="button" className={'ctc-dp-cell' + (on ? ' on' : '')}
              style={on ? { background: color, borderColor: color, color: '#0A0A0B' } : undefined}
              onClick={() => onToggle(mn.m, d)}>{d}</button>
          );
        }
        return (
          <div className="ctc-dp-month" key={mn.m}>
            <div className="ctc-dp-mlabel">{mn.name.slice(0, 3)} 2025</div>
            <div className="ctc-dp-grid">{cells}</div>
          </div>
        );
      })}
    </div>
  );
}

function EditModal({ draft, isNew, onField, onToggleDay, onSave, onCancel, onDelete }) {
  return (
    <div className="ctc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="ctc-card ctc-modal">
        <div className="ctc-modal-title">{isNew ? 'Add new trip' : 'Edit trip'}</div>
        <div className="ctc-field">
          <div className="ctc-label">Name</div>
          <input className="ctc-input full" value={draft.name} placeholder="Destination — highlights" onChange={(e) => onField('name', e.target.value)} />
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Color</div>
          <div className="ctc-color-row">
            <input type="color" className="ctc-color" value={draft.color} onChange={(e) => onField('color', e.target.value)} />
            <input className="ctc-input" style={{ width: 130 }} value={draft.color} onChange={(e) => onField('color', e.target.value)} />
          </div>
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Dates (label)</div>
          <div className="ctc-color-row">
            <input className="ctc-input" style={{ flex: 1 }} value={draft.dates} placeholder="Sep 13–14" onChange={(e) => onField('dates', e.target.value)} />
            <button type="button" className="ctc-btn" title="Generate label from selected days" onClick={() => onField('dates', daysToLabel(draft.days))}>↻ from days</button>
          </div>
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Days — click to toggle</div>
          <DayPicker days={draft.days} color={draft.color} onToggle={onToggleDay} />
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Description</div>
          <textarea className="ctc-textarea full" rows={5} value={draft.desc} onChange={(e) => onField('desc', e.target.value)} />
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Insider tip</div>
          <textarea className="ctc-textarea full" rows={3} value={draft.tip} onChange={(e) => onField('tip', e.target.value)} />
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Tags (comma-separated)</div>
          <input className="ctc-input full" value={draft._tagsText} placeholder="history, food, scenic" onChange={(e) => onField('_tagsText', e.target.value)} />
        </div>
        <div className="ctc-modal-actions">
          {!isNew && <button className="ctc-delete-link" onClick={onDelete}>Delete trip</button>}
          <div style={{ flex: 1 }} />
          <button className="ctc-btn" onClick={onCancel}>Cancel</button>
          <button className="ctc-btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function TipEditModal({ draft, isNew, onField, onSave, onCancel, onDelete }) {
  return (
    <div className="ctc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="ctc-card ctc-modal">
        <div className="ctc-modal-title">{isNew ? 'Add tip card' : 'Edit tip card'}</div>
        <div className="ctc-field">
          <div className="ctc-label">Icon (emoji)</div>
          <input className="ctc-input" style={{ width: 90 }} value={draft.icon} onChange={(e) => onField('icon', e.target.value)} />
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Title</div>
          <input className="ctc-input full" value={draft.title} placeholder="e.g. Budget" onChange={(e) => onField('title', e.target.value)} />
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Bullets (one per line)</div>
          <textarea className="ctc-textarea full" rows={5} value={draft._bulletsText} placeholder={'Train ¥150–600 each way\nFood ¥100–150/day'} onChange={(e) => onField('_bulletsText', e.target.value)} />
        </div>
        <div className="ctc-field">
          <div className="ctc-label">Detail (shown when expanded)</div>
          <textarea className="ctc-textarea full" rows={4} value={draft.detail} onChange={(e) => onField('detail', e.target.value)} />
        </div>
        <div className="ctc-modal-actions">
          {!isNew && <button className="ctc-delete-link" onClick={onDelete}>Delete card</button>}
          <div style={{ flex: 1 }} />
          <button className="ctc-btn" onClick={onCancel}>Cancel</button>
          <button className="ctc-btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── main component ──────────────────────── */

export default function ChinaTravelCalendar() {
  const [mounted, setMounted] = useState(false);
  const [trips, setTrips] = useState(DEFAULT_TRIPS);
  const [tips, setTips] = useState(DEFAULT_TIPS);
  const [checklists, setChecklists] = useState(DEFAULT_CHECKLISTS);

  const [activeTab, setActiveTab] = useState('calendar');
  const [calMonth, setCalMonth] = useState(9);
  const [calAll, setCalAll] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null); // id | 'new' | null
  const [draft, setDraft] = useState(null);
  const [editingTip, setEditingTip] = useState(null);   // id | 'new' | null
  const [tipDraft, setTipDraft] = useState(null);
  const [expandedTip, setExpandedTip] = useState(null);
  const [msg, setMsg] = useState(null);

  const fileRef = useRef(null);
  const msgTimer = useRef(null);

  // Mount gate + load. First client render returns the same empty shell as the
  // server, so there is no hydration mismatch; real data loads after mount.
  useEffect(() => {
    try { const r = localStorage.getItem(KEY_TRIPS); if (r) { const p = JSON.parse(r); if (Array.isArray(p)) setTrips(p); } } catch { /* ignore */ }
    try { const r = localStorage.getItem(KEY_TIPS); if (r) { const p = JSON.parse(r); if (Array.isArray(p)) setTips(p); } } catch { /* ignore */ }
    try { const r = localStorage.getItem(KEY_CHECK); if (r) { const p = JSON.parse(r); if (p && typeof p === 'object' && !Array.isArray(p)) setChecklists({ ...EMPTY_CHECK, ...p }); } } catch { /* ignore */ }
    setMounted(true);
  }, []);

  useEffect(() => { if (mounted) try { localStorage.setItem(KEY_TRIPS, JSON.stringify(trips)); } catch { /* ignore */ } }, [trips, mounted]);
  useEffect(() => { if (mounted) try { localStorage.setItem(KEY_TIPS, JSON.stringify(tips)); } catch { /* ignore */ } }, [tips, mounted]);
  useEffect(() => { if (mounted) try { localStorage.setItem(KEY_CHECK, JSON.stringify(checklists)); } catch { /* ignore */ } }, [checklists, mounted]);

  const flash = (text, kind) => {
    setMsg({ text, kind });
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 3000);
  };

  const isNew = editingTrip === 'new';
  const isNewTip = editingTip === 'new';
  const detailTrip = trips.find((t) => t.id === selectedTrip) || null;

  /* ----- navigation ----- */
  const pickDay = (id, day) => { setSelectedTrip(id); setSelectedDay(day); };
  const openTrip = (id) => {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    const first = [...(t.days || [])].sort((a, b) => a.m - b.m || a.d - b.d)[0] || null;
    setSelectedTrip(id); setSelectedDay(first);
    if (first) { setCalMonth(first.m); setCalAll(false); }
    setActiveTab('calendar');
  };

  /* ----- trip / embed / itinerary mutations ----- */
  const patchTrip = (id, fn) => setTrips((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  const handleAddEmbed = (embed) => { if (selectedTrip) patchTrip(selectedTrip, (t) => ({ ...t, embeds: [...(t.embeds || []), embed] })); };
  const addAgenda = (id, key, item) => patchTrip(id, (t) => {
    const it = { ...(t.itinerary || {}) };
    it[key] = [...(it[key] || []), { id: uid(), time: item.time || '', title: item.title || '', place: item.place || '', note: item.note || '' }];
    return { ...t, itinerary: it };
  });
  const updateAgenda = (id, key, itemId, patch) => patchTrip(id, (t) => {
    const it = { ...(t.itinerary || {}) };
    it[key] = (it[key] || []).map((x) => (x.id === itemId ? { ...x, ...patch } : x));
    return { ...t, itinerary: it };
  });
  const deleteAgenda = (id, key, itemId) => patchTrip(id, (t) => {
    const it = { ...(t.itinerary || {}) };
    it[key] = (it[key] || []).filter((x) => x.id !== itemId);
    return { ...t, itinerary: it };
  });

  /* ----- trip edit modal ----- */
  const openEdit = (id) => {
    const t = trips.find((x) => x.id === id);
    if (!t) return;
    setDraft({ ...t, days: [...(t.days || [])], tags: [...(t.tags || [])], embeds: [...(t.embeds || [])], itinerary: { ...(t.itinerary || {}) }, _tagsText: (t.tags || []).join(', ') });
    setEditingTrip(id);
  };
  const openNew = () => {
    setDraft({ id: uid(), name: '', color: '#378ADD', dates: '', days: [], desc: '', tip: '', tags: [], embeds: [], itinerary: {}, _tagsText: '' });
    setEditingTrip('new');
  };
  const onField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const onToggleDay = (m, d) => setDraft((dd) => {
    const exists = dd.days.some((x) => x.m === m && x.d === d);
    const days = exists ? dd.days.filter((x) => !(x.m === m && x.d === d)) : [...dd.days, { m, d }].sort((a, b) => a.m - b.m || a.d - b.d);
    return { ...dd, days };
  });
  const closeModal = () => { setEditingTrip(null); setDraft(null); };
  const saveDraft = () => {
    const tags = (draft._tagsText || '').split(',').map((s) => s.trim()).filter(Boolean);
    const { _tagsText, ...rest } = draft;
    const trip = { ...rest, tags };
    if (isNew) setTrips((ts) => [...ts, trip]); else setTrips((ts) => ts.map((x) => (x.id === trip.id ? trip : x)));
    closeModal();
  };
  const deleteDraft = () => {
    if (!window.confirm('Delete this trip? This can’t be undone.')) return;
    const id = draft.id;
    setTrips((ts) => ts.filter((x) => x.id !== id));
    if (selectedTrip === id) setSelectedTrip(null);
    closeModal();
  };

  /* ----- tip edit modal ----- */
  const openEditTip = (id) => {
    const t = tips.find((x) => x.id === id);
    if (!t) return;
    setTipDraft({ ...t, bullets: [...(t.bullets || [])], _bulletsText: (t.bullets || []).join('\n') });
    setEditingTip(id);
  };
  const openNewTip = () => { setTipDraft({ id: uid(), icon: '📌', title: '', bullets: [], detail: '', _bulletsText: '' }); setEditingTip('new'); };
  const onTipField = (k, v) => setTipDraft((d) => ({ ...d, [k]: v }));
  const closeTipModal = () => { setEditingTip(null); setTipDraft(null); };
  const saveTip = () => {
    const bullets = (tipDraft._bulletsText || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const { _bulletsText, ...rest } = tipDraft;
    const tip = { ...rest, bullets };
    if (isNewTip) setTips((ts) => [...ts, tip]); else setTips((ts) => ts.map((x) => (x.id === tip.id ? tip : x)));
    closeTipModal();
  };
  const deleteTip = () => {
    if (!window.confirm('Delete this tip card?')) return;
    const id = tipDraft.id;
    setTips((ts) => ts.filter((x) => x.id !== id));
    closeTipModal();
  };

  /* ----- checklist mutations ----- */
  const addTask = (m, text) => setChecklists((c) => ({ ...c, [m]: [...(c[m] || []), { id: uid(), text, done: false }] }));
  const toggleTask = (m, id) => setChecklists((c) => ({ ...c, [m]: (c[m] || []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  const deleteTask = (m, id) => setChecklists((c) => ({ ...c, [m]: (c[m] || []).filter((t) => t.id !== id) }));

  /* ----- export / import / reset ----- */
  const exportJSON = () => {
    const payload = { version: 2, trips, tips, checklists };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'china-travel-schedule.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        let rawTrips, nextTips = null, nextChecks = null;
        if (Array.isArray(data)) {
          rawTrips = data;
        } else if (data && Array.isArray(data.trips)) {
          rawTrips = data.trips;
          if (Array.isArray(data.tips)) nextTips = data.tips;
          if (data.checklists && typeof data.checklists === 'object' && !Array.isArray(data.checklists)) nextChecks = data.checklists;
        } else {
          throw new Error('format');
        }
        if (!rawTrips.every((t) => t && typeof t === 'object')) throw new Error('items');
        const used = new Set();
        const repaired = rawTrips.map((t) => repairTrip(t, used));
        setTrips(repaired);
        if (nextTips) setTips(nextTips);
        if (nextChecks) setChecklists({ ...EMPTY_CHECK, ...nextChecks });
        setSelectedTrip(null);
        flash('Imported ' + repaired.length + ' trips.', 'ok');
      } catch {
        flash('Import failed — invalid file.', 'err');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  const resetDefaults = () => {
    if (!window.confirm('Reset to the default schedule, tips, and checklists? This erases your changes.')) return;
    setTrips(DEFAULT_TRIPS); setTips(DEFAULT_TIPS); setChecklists(DEFAULT_CHECKLISTS);
    try { localStorage.removeItem(KEY_TRIPS); localStorage.removeItem(KEY_TIPS); localStorage.removeItem(KEY_CHECK); } catch { /* ignore */ }
    setSelectedTrip(null);
    flash('Reset to defaults.', 'ok');
  };

  // Hydration-safe shell until mounted on the client.
  if (!mounted) return <div className="ctc"><style>{STYLES}</style></div>;

  const TABS = [['calendar', 'Calendar'], ['trips', 'All trips'], ['tips', 'Tips & logistics']];
  const singleMonth = MONTHS.find((x) => x.m === calMonth) || MONTHS[0];

  return (
    <div className="ctc">
      <style>{STYLES}</style>

      <div className="ctc-toolbar">
        {msg && <span className={'ctc-msg ' + msg.kind}>{msg.text}</span>}
        <button className="ctc-btn" onClick={exportJSON}>Export JSON</button>
        <button className="ctc-btn-primary" onClick={() => fileRef.current && fileRef.current.click()}>Import JSON</button>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={importJSON} style={{ display: 'none' }} />
        <button className="ctc-link-danger" onClick={resetDefaults}>Reset to defaults</button>
      </div>

      <div className="ctc-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={'ctc-tab' + (activeTab === id ? ' active' : '')} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'calendar' && (
        <div>
          <div className="ctc-monthswitch">
            {MONTHS.map((mn) => (
              <button key={mn.m} className={'ctc-mchip' + (!calAll && calMonth === mn.m ? ' on' : '')}
                onClick={() => { setCalMonth(mn.m); setCalAll(false); }}>{mn.name.slice(0, 3)}</button>
            ))}
            <button className={'ctc-mchip' + (calAll ? ' on' : '')} onClick={() => setCalAll(true)}>All</button>
          </div>

          <Legend trips={trips} />

          {calAll ? (
            <div className="ctc-months">
              {MONTHS.map((mn) => (
                <MonthGrid key={mn.m} month={mn} trips={trips} selectedTrip={selectedTrip} selectedDay={selectedDay} onPick={pickDay} />
              ))}
            </div>
          ) : (
            <div className="ctc-single">
              <MonthGrid month={singleMonth} trips={trips} selectedTrip={selectedTrip} selectedDay={selectedDay} onPick={pickDay} large />
              <Checklist month={calMonth} items={checklists[calMonth] || []}
                onAdd={(text) => addTask(calMonth, text)} onToggle={(id) => toggleTask(calMonth, id)} onDelete={(id) => deleteTask(calMonth, id)} />
            </div>
          )}

          {detailTrip && (
            <DetailPanel
              trip={detailTrip} selectedDay={selectedDay} onSelectDay={setSelectedDay}
              onEdit={openEdit} onAddEmbed={handleAddEmbed}
              onAddAgenda={(k, i) => addAgenda(detailTrip.id, k, i)}
              onUpdateAgenda={(k, id, p) => updateAgenda(detailTrip.id, k, id, p)}
              onDeleteAgenda={(k, id) => deleteAgenda(detailTrip.id, k, id)}
            />
          )}
        </div>
      )}

      {activeTab === 'trips' && (
        <div>
          <div className="ctc-section-head">
            <div className="ctc-eyebrow" style={{ flex: 1 }}>All trips</div>
            <button className="ctc-btn-primary" onClick={openNew}>+ Add new trip</button>
          </div>
          <div className="ctc-trip-grid">
            {trips.map((t) => <TripCard key={t.id} trip={t} onOpen={openTrip} onEdit={openEdit} />)}
          </div>
        </div>
      )}

      {activeTab === 'tips' && (
        <div>
          <div className="ctc-section-head">
            <div className="ctc-eyebrow" style={{ flex: 1 }}>Tips & logistics</div>
            <button className="ctc-btn-primary" onClick={openNewTip}>+ Add card</button>
          </div>
          <div className="ctc-tips-grid">
            {tips.map((tp) => (
              <TipCard key={tp.id} tip={tp} expanded={expandedTip === tp.id}
                onToggle={() => setExpandedTip((e) => (e === tp.id ? null : tp.id))} onEdit={openEditTip} />
            ))}
          </div>
        </div>
      )}

      {editingTrip && draft && (
        <EditModal draft={draft} isNew={isNew} onField={onField} onToggleDay={onToggleDay} onSave={saveDraft} onCancel={closeModal} onDelete={deleteDraft} />
      )}
      {editingTip && tipDraft && (
        <TipEditModal draft={tipDraft} isNew={isNewTip} onField={onTipField} onSave={saveTip} onCancel={closeTipModal} onDelete={deleteTip} />
      )}
    </div>
  );
}
