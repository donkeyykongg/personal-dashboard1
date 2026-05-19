import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGraphClient, type GraphEvent } from "@/lib/outlook/graph";
import type { ScheduleEvent } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function toIso(dt: { dateTime: string; timeZone?: string }) {
  // Graph returns local time strings + zone. Convert to ISO UTC.
  const tz = dt.timeZone || "UTC";
  if (tz === "UTC" || /Z$/.test(dt.dateTime)) {
    return new Date(dt.dateTime + (dt.dateTime.endsWith("Z") ? "" : "Z")).toISOString();
  }
  // Fallback: best-effort parse as local time.
  return new Date(dt.dateTime).toISOString();
}

export async function POST() {
  const supabase = createClient();
  const client = await getGraphClient(supabase);
  if (!client) {
    return NextResponse.json({ error: "Outlook not connected" }, { status: 401 });
  }

  let pulled = 0;
  let pushed = 0;
  let removed = 0;

  // 1. Pull from Outlook
  try {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    end.setMonth(end.getMonth() + 6);

    const res = await client
      .api("/me/calendarView")
      .query({
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
      })
      .header("Prefer", 'outlook.timezone="UTC"')
      .top(250)
      .select("id,subject,body,start,end,location,lastModifiedDateTime")
      .get();

    const events: GraphEvent[] = res.value ?? [];
    for (const ev of events) {
      const payload = {
        title: ev.subject || "(no title)",
        start_at: toIso(ev.start),
        end_at: toIso(ev.end),
        location: ev.location?.displayName ?? null,
        body: ev.body?.content ?? null,
        outlook_event_id: ev.id,
        sync_status: "synced" as const,
      };
      await supabase
        .from("schedule_events")
        .upsert(payload, { onConflict: "outlook_event_id" });
      pulled += 1;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "pull failed" },
      { status: 500 }
    );
  }

  // 2. Push pending local changes
  const { data: pending } = await supabase
    .from("schedule_events")
    .select("*")
    .in("sync_status", ["local", "pending", "deleted"]);

  for (const row of (pending ?? []) as ScheduleEvent[]) {
    try {
      if (row.sync_status === "deleted") {
        if (row.outlook_event_id) {
          await client.api(`/me/events/${row.outlook_event_id}`).delete();
        }
        await supabase.from("schedule_events").delete().eq("id", row.id);
        removed += 1;
        continue;
      }

      const body = {
        subject: row.title,
        body: { contentType: "Text", content: row.body ?? "" },
        start: { dateTime: new Date(row.start_at).toISOString(), timeZone: "UTC" },
        end: { dateTime: new Date(row.end_at).toISOString(), timeZone: "UTC" },
        location: row.location ? { displayName: row.location } : undefined,
      };

      if (row.outlook_event_id) {
        await client.api(`/me/events/${row.outlook_event_id}`).update(body);
      } else {
        const created = await client.api("/me/events").post(body);
        await supabase
          .from("schedule_events")
          .update({ outlook_event_id: created.id, sync_status: "synced" })
          .eq("id", row.id);
      }
      await supabase
        .from("schedule_events")
        .update({ sync_status: "synced" })
        .eq("id", row.id);
      pushed += 1;
    } catch (e) {
      await supabase
        .from("schedule_events")
        .update({ sync_status: "error" })
        .eq("id", row.id);
      void e;
    }
  }

  return NextResponse.json({ pulled, pushed, removed });
}
