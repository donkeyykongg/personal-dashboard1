import { getAnthropic } from "@/lib/anthropic";
import type { JournalEntry, JournalSummaryPeriod } from "@/lib/supabase/types";

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-6";

export function modelForPeriod(period: JournalSummaryPeriod): string {
  return period === "month" ? SONNET : HAIKU;
}

function formatEntries(entries: JournalEntry[]): string {
  return entries
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => {
      const time = new Date(e.created_at).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const tag = e.source === "telegram" ? "[TG]" : "[APP]";
      return `${tag} ${time}\n${e.content.trim()}`;
    })
    .join("\n\n---\n\n");
}

const PROMPT_BY_PERIOD: Record<JournalSummaryPeriod, string> = {
  day: `You are a focused, honest journaling assistant. Summarize the user's day in 3-5 short bullet points.
Then add a "Patterns" line (max 2 sentences) flagging any recurring themes (sleep, mood, blockers, wins).
Finish with one concrete suggestion if anything stands out. Be terse — no fluff, no headers besides "Patterns:" and "Suggestion:".`,
  week: `You are a focused, honest journaling assistant. Summarize the user's week in 4-6 short bullets organized by theme (work, health, mood, relationships, ideas as relevant).
Then add a "Patterns" line (2-3 sentences) calling out recurring themes across the week.
Finish with one concrete suggestion. Keep it terse.`,
  month: `You are a thoughtful journaling assistant writing a monthly rollup as a short narrative (3-5 paragraphs).
Tell the story of the month: what dominated, how mood and energy trended, what shifted, what got repeated. Quote a phrase or two from the entries when it sharpens the picture.
End with a "Patterns" paragraph naming 2-3 recurring themes and one concrete suggestion for the next month.
Use plain prose. No bullets unless absolutely necessary. No headers besides "Patterns:".`,
};

export async function summarizeJournal(
  period: JournalSummaryPeriod,
  entries: JournalEntry[]
): Promise<{ summary: string; model: string }> {
  if (entries.length === 0) {
    return {
      summary: "No entries yet for this period.",
      model: modelForPeriod(period),
    };
  }

  const client = getAnthropic();
  const model = modelForPeriod(period);
  const systemPrompt = PROMPT_BY_PERIOD[period];

  const response = await client.messages.create({
    model,
    max_tokens: period === "month" ? 1200 : 600,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Journal entries (${entries.length}):\n\n${formatEntries(entries)}`,
      },
    ],
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  return { summary: text || "(empty response)", model };
}
