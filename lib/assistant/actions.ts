import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantDraft } from "@/lib/assistant/types";
import { displayDateTime } from "@/lib/assistant/datetime";

export function labelDraft(draft: AssistantDraft): string {
  if (draft.type === "create_todo") {
    return `Create todo: ${draft.text} (${draft.date})`;
  }
  if (draft.type === "create_schedule_event") {
    return `Create schedule event: ${draft.title}, ${displayDateTime(draft.start_at)}-${new Date(
      draft.end_at
    ).toLocaleTimeString("en-US", {
      timeZone: "America/Toronto",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  if (draft.type === "create_journal_entry") {
    return `Create journal entry: ${draft.content.slice(0, 80)}${
      draft.content.length > 80 ? "..." : ""
    }`;
  }
  return draft.content;
}

export function validateDraft(draft: AssistantDraft): string | null {
  if (draft.type === "create_todo") {
    if (!draft.text.trim()) return "Todo text is required.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return "Todo date must be YYYY-MM-DD.";
  }
  if (draft.type === "create_schedule_event") {
    if (!draft.title.trim()) return "Event title is required.";
    if (Number.isNaN(new Date(draft.start_at).getTime())) return "Event start is invalid.";
    if (Number.isNaN(new Date(draft.end_at).getTime())) return "Event end is invalid.";
    if (new Date(draft.end_at) <= new Date(draft.start_at)) {
      return "Event end must be after start.";
    }
  }
  if (draft.type === "create_journal_entry" && !draft.content.trim()) {
    return "Journal content is required.";
  }
  if (draft.type === "answer") return "Answers are not confirmable actions.";
  return null;
}

export async function saveConfirmedDraft(supabase: SupabaseClient, draft: AssistantDraft) {
  const validation = validateDraft(draft);
  if (validation) throw new Error(validation);

  if (draft.type === "create_todo") {
    const { data: latest } = await supabase
      .from("todo_goals")
      .select("sort_order")
      .eq("date", draft.date)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = typeof latest?.sort_order === "number" ? latest.sort_order + 1 : 0;
    const { data, error } = await supabase
      .from("todo_goals")
      .insert({ date: draft.date, text: draft.text.trim(), sort_order: sortOrder })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { table: "todo_goals", row: data };
  }

  if (draft.type === "create_schedule_event") {
    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        title: draft.title.trim(),
        start_at: draft.start_at,
        end_at: draft.end_at,
        location: draft.location?.trim() || null,
        body: draft.body?.trim() || null,
        sync_status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { table: "schedule_events", row: data };
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ content: draft.content.trim(), source: "app" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { table: "journal_entries", row: data };
}

