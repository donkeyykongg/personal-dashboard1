"use client";

// Renders the self-contained ChinaTravelCalendar component (root .jsx).
// This wrapper is a Client Component because the calendar uses useState /
// useEffect / localStorage; importing the .jsx here pulls it into the client
// bundle without modifying the portable component file.

import ChinaTravelCalendar from "@/ChinaTravelCalendar";

export default function ChinaTravelPage() {
  return <ChinaTravelCalendar />;
}
