function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Active "today" key with a 6am rollover so late-night work counts toward the previous day.
export function getActiveDateString(now: Date = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return dateToKey(d);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

// YYYY-MM-DD in the given IANA timezone. Matches the generated `date` column
// on journal_entries which uses America/Toronto.
export function dateKeyInZone(
  now: Date = new Date(),
  timeZone: string = "America/Toronto"
): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}
