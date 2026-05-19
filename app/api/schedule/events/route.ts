import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_events")
    .insert({
      title: body.title,
      start_at: body.start_at,
      end_at: body.end_at,
      location: body.location ?? null,
      body: body.body ?? null,
      sync_status: "pending",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const id = body.id;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_events")
    .update({
      title: body.title,
      start_at: body.start_at,
      end_at: body.end_at,
      location: body.location ?? null,
      body: body.body ?? null,
      sync_status: "pending",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const supabase = createClient();
  // Mark as deleted; sync route will tombstone in Outlook + remove row.
  const { data: existing } = await supabase
    .from("schedule_events")
    .select("outlook_event_id")
    .eq("id", id)
    .maybeSingle();
  if (existing?.outlook_event_id) {
    await supabase
      .from("schedule_events")
      .update({ sync_status: "deleted" })
      .eq("id", id);
  } else {
    await supabase.from("schedule_events").delete().eq("id", id);
  }
  return NextResponse.json({ ok: true });
}
