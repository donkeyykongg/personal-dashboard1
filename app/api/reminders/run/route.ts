import { NextResponse, type NextRequest } from "next/server";
import { activeTodoDateKey } from "@/lib/assistant/datetime";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReminderDelivery, ScheduleEvent, TodoGoal } from "@/lib/supabase/types";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const secret = process.env.REMINDERS_RUN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = req.headers.get("x-reminders-secret");
  return bearer === secret || headerSecret === secret;
}

function localHour(now: Date) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(hour);
}

function fmtEventTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function alreadySent(
  supabase: ReturnType<typeof createAdminClient>,
  kind: string,
  targetId: string,
  reminderKey: string
) {
  const { data } = await supabase
    .from("reminder_deliveries")
    .select("id")
    .eq("kind", kind)
    .eq("target_id", targetId)
    .eq("reminder_key", reminderKey)
    .maybeSingle();
  return Boolean(data);
}

async function markSent(
  supabase: ReturnType<typeof createAdminClient>,
  kind: string,
  targetId: string,
  reminderKey: string
) {
  await supabase
    .from("reminder_deliveries")
    .insert({ kind, target_id: targetId, reminder_key: reminderKey });
}

async function runReminders(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.TELEGRAM_ALLOWED_CHAT_ID) {
    return NextResponse.json({ error: "TELEGRAM_ALLOWED_CHAT_ID is not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID.trim();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 16 * 60_000);
  const windowStart = new Date(now.getTime() + 10 * 60_000);

  let sent = 0;
  const skipped: string[] = [];

  const { data: events, error: eventsError } = await supabase
    .from("schedule_events")
    .select("*")
    .gte("start_at", windowStart.toISOString())
    .lte("start_at", windowEnd.toISOString())
    .neq("sync_status", "deleted")
    .order("start_at", { ascending: true });

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  for (const event of ((events ?? []) as ScheduleEvent[])) {
    const key = "15m";
    if (await alreadySent(supabase, "schedule_event", event.id, key)) {
      skipped.push(`event:${event.id}`);
      continue;
    }
    const location = event.location ? `\nLocation: ${event.location}` : "";
    await sendTelegramMessage(
      chatId,
      `Calendar reminder: ${event.title}\nStarts: ${fmtEventTime(event.start_at)}${location}`
    );
    await markSent(supabase, "schedule_event", event.id, key);
    sent += 1;
  }

  const todoDate = activeTodoDateKey(now);
  const digestKey = `todo-digest:${todoDate}`;
  const digestDue = localHour(now) >= 8;
  if (digestDue && !(await alreadySent(supabase, "todo_digest", todoDate, digestKey))) {
    const { data: todos, error: todoError } = await supabase
      .from("todo_goals")
      .select("*")
      .eq("date", todoDate)
      .eq("done", false)
      .order("sort_order", { ascending: true });

    if (todoError) {
      return NextResponse.json({ error: todoError.message }, { status: 500 });
    }

    const openTodos = ((todos ?? []) as TodoGoal[]).slice(0, 12);
    if (openTodos.length > 0) {
      const list = openTodos.map((todo, index) => `${index + 1}. ${todo.text}`).join("\n");
      await sendTelegramMessage(chatId, `Today's todo digest (${todoDate})\n${list}`);
      await markSent(supabase, "todo_digest", todoDate, digestKey);
      sent += 1;
    } else {
      await supabase.from("reminder_deliveries").insert({
        kind: "todo_digest",
        target_id: todoDate,
        reminder_key: digestKey,
      } satisfies Omit<ReminderDelivery, "id" | "sent_at">);
      skipped.push("todo-digest:empty");
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}

export async function POST(req: NextRequest) {
  return runReminders(req);
}

export async function GET(req: NextRequest) {
  return runReminders(req);
}
