import { getAnthropic } from "@/lib/anthropic";
import type { BrainPage } from "@/lib/supabase/types";

const HAIKU = "claude-haiku-4-5-20251001";

export async function generatePageBriefing(
  page: BrainPage,
  children: BrainPage[]
): Promise<{ summary: string; model: string }> {
  const client = getAnthropic();
  const model = HAIKU;

  const childSummary = children.length
    ? children
        .map((c) => {
          const note = c.content_md.trim().slice(0, 240);
          return `- ${c.title}${note ? `: ${note}` : ""}`;
        })
        .join("\n")
    : "(no sub-pages yet)";

  const response = await client.messages.create({
    model,
    max_tokens: 500,
    system: `You write tight status snapshots for a Notion-style "brain" page. Treat the page as one area of the user's life or business. Produce:
- A 2-3 sentence status snapshot.
- An "Open threads:" list (max 4 bullets) of what looks unresolved.
- A "Next move:" line with one concrete suggestion.
Be terse. Use plain text. No filler.`,
    messages: [
      {
        role: "user",
        content: `Page: ${page.title}
Notes: ${page.content_md.trim() || "(no notes)"}

Sub-pages (${children.length}):
${childSummary}`,
      },
    ],
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  return { summary: text || "(empty response)", model };
}
