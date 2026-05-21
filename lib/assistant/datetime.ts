import { dateKeyInZone } from "@/lib/dates";

const TIME_ZONE = "America/Toronto";

function offsetMinutesFor(date: Date, timeZone = TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  });
  const timeZonePart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  if (!timeZonePart || timeZonePart === "GMT") return 0;
  const match = timeZonePart.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

export function zonedLocalToIso(
  date: string,
  time: string,
  timeZone = TIME_ZONE
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute || 0));
  const offsetMinutes = offsetMinutesFor(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000).toISOString();
}

export function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function todayKey(): string {
  return dateKeyInZone(new Date(), TIME_ZONE);
}

export function tomorrowKey(): string {
  const now = new Date();
  const localToday = todayKey();
  const [year, month, day] = localToday.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12));
  return dateKeyInZone(next, TIME_ZONE);
}

export function displayDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function activeTodoDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const localNoonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  if (hour < 6) localNoonUtc.setUTCDate(localNoonUtc.getUTCDate() - 1);
  return dateKeyInZone(localNoonUtc, TIME_ZONE);
}

