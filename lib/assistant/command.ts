import { getAnthropic } from "@/lib/anthropic";
import {
  addMinutesIso,
  todayKey,
  tomorrowKey,
  zonedLocalToIso,
} from "@/lib/assistant/datetime";
import type {
  AssistantCommandResult,
  AssistantDraft,
  CreateScheduleEventDraft,
  CreateTodoDraft,
} from "@/lib/assistant/types";

const ASSISTANT_MODEL = "claude-haiku-4-5-20251001";

type ContextBundle = Record<string, unknown>;

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function pickFirstJsonObject(text: string) {
  const stripped = stripCodeFence(text);
  if (stripped.startsWith("{")) return stripped;
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) return stripped.slice(start, end + 1);
  return stripped;
}

function normalizeDraft(raw: unknown): AssistantDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = value.type;

  if (type === "create_todo") {
    const text = String(value.text ?? "").trim();
    const date = String(value.date ?? "").trim();
    if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return { type, text, date };
  }

  if (type === "create_schedule_event") {
    const title = String(value.title ?? "").trim();
    const start_at = String(value.start_at ?? "").trim();
    const end_at = String(value.end_at ?? "").trim();
    if (
      !title ||
      Number.isNaN(new Date(start_at).getTime()) ||
      Number.isNaN(new Date(end_at).getTime())
    ) {
      return null;
    }
    return {
      type,
      title,
      start_at,
      end_at,
      location: value.location == null ? null : String(value.location),
      body: value.body == null ? null : String(value.body),
    };
  }

  if (type === "create_journal_entry") {
    const content = String(value.content ?? "").trim();
    if (!content) return null;
    return { type, content };
  }

  if (type === "answer") {
    const content = String(value.content ?? "").trim();
    if (!content) return null;
    return { type, content };
  }

  return null;
}

function normalizeResult(raw: unknown): AssistantCommandResult | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const reply = String(value.reply ?? "").trim();
  const rawDrafts = Array.isArray(value.drafts) ? value.drafts : [];
  const drafts = rawDrafts
    .map(normalizeDraft)
    .filter((draft): draft is AssistantDraft => draft !== null);
  if (!reply && drafts.length === 0) return null;
  return {
    reply:
      reply ||
      (drafts.length > 0
        ? "I drafted this. Confirm it before I save anything."
        : "I could not turn that into a safe action yet."),
    drafts,
    source: "ai",
  };
}

function parseDateFromText(text: string) {
  const lower = text.toLowerCase();
  if (/\btomorrow\b/.test(lower)) return tomorrowKey();
  if (/\btoday\b/.test(lower)) return todayKey();
  const iso = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  return "";
}

function parseTimeFromText(text: string) {
  const lower = text.toLowerCase();
  const match = lower.match(/\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function cleanTaskText(text: string) {
  return text
    .replace(/^(please\s+)?(add|create|make|note down|remember|todo|task)\s+/i, "")
    .replace(/\b(for|on)?\s*(today|tomorrow)\b/gi, "")
    .replace(/\b(?:at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, "")
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function fallbackCommand(input: string): AssistantCommandResult {
  const lower = input.toLowerCase().trim();
  const date = parseDateFromText(input);
  const time = parseTimeFromText(input);

  if (
    /\b(what should i do|what should i work on|what next|next)\b/.test(lower) ||
    lower.endsWith("?")
  ) {
    return {
      reply:
        "I can help prioritize from your dashboard context once the AI key is available. For now: start with any due schedule item, then finish one queued todo, then pick the smallest remaining task that reduces friction for tomorrow.",
      drafts: [],
      source: "fallback",
    };
  }

  if (/\b(journal|reflect|log)\b/.test(lower) && !time) {
    const content = input
      .replace(/^(please\s+)?(journal|reflect|log)\s+/i, "")
      .trim();
    if (content) {
      return {
        reply: "I drafted a journal entry. Confirm it before I save anything.",
        drafts: [{ type: "create_journal_entry", content }],
        source: "fallback",
      };
    }
  }

  if (date && time) {
    const title = cleanTaskText(input) || input.trim();
    const start_at = zonedLocalToIso(date, time);
    const draft: CreateScheduleEventDraft = {
      type: "create_schedule_event",
      title,
      start_at,
      end_at: addMinutesIso(start_at, 60),
      location: null,
      body: null,
    };
    return {
      reply: "I drafted a schedule event. Confirm it before I save anything.",
      drafts: [draft],
      source: "fallback",
    };
  }

  if (date || /\b(add|todo|task|remember|note down)\b/.test(lower)) {
    const draft: CreateTodoDraft = {
      type: "create_todo",
      text: cleanTaskText(input) || input.trim(),
      date: date || todayKey(),
    };
    return {
      reply: "I drafted a todo. Confirm it before I save anything.",
      drafts: [draft],
      source: "fallback",
    };
  }

  return {
    reply:
      "I can draft a todo, schedule event, or journal entry from this. Add a date or time if it belongs on your calendar.",
    drafts: [],
    source: "fallback",
  };
}

export async function runAssistantCommand(
  input: string,
  context: ContextBundle
): Promise<AssistantCommandResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { reply: "Say what you want to capture or ask.", drafts: [], source: "fallback" };
  }

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      system: `You are the executive assistant inside a personal dashboard.

Return ONLY valid JSON with this shape:
{
  "reply": "short user-facing response",
  "drafts": [ ... ]
}

Allowed draft objects:
{ "type": "create_todo", "text": string, "date": "YYYY-MM-DD" }
{ "type": "create_schedule_event", "title": string, "start_at": ISO string, "end_at": ISO string, "location": string|null, "body": string|null }
{ "type": "create_journal_entry", "content": string }
{ "type": "answer", "content": string }

Rules:
- Never claim anything has been saved. The UI requires confirmation before saving.
- If the user asks for advice, return no create drafts; put the advice in reply.
- If the user wants to capture something with a date but no exact time, prefer create_todo.
- If the user gives a date and exact time, prefer create_schedule_event.
- If date/time is ambiguous, ask a clarifying question in reply and return no drafts.
- Use America/Toronto. Current context JSON includes now_iso, active_todo_date, and tomorrow_date.
- Keep replies concise and specific.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            user_input: trimmed,
            context,
          }),
        },
      ],
    });

    const text =
      response.content.find((block) => block.type === "text")?.text ?? "";
    const parsed = JSON.parse(pickFirstJsonObject(text));
    const normalized = normalizeResult(parsed);
    if (normalized) return normalized;
  } catch (error) {
    console.error("Assistant AI fallback:", error);
  }

  return fallbackCommand(trimmed);
}

