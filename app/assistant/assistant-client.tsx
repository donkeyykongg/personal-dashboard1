"use client";

import { useMemo, useState } from "react";
import { Bot, CalendarClock, Check, Loader2, Send, Sparkles, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantDraft } from "@/lib/assistant/types";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  drafts?: AssistantDraft[];
  source?: "ai" | "fallback";
};

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function draftTitle(draft: AssistantDraft) {
  if (draft.type === "create_todo") return "Todo";
  if (draft.type === "create_schedule_event") return "Schedule";
  if (draft.type === "create_journal_entry") return "Journal";
  return "Answer";
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeDraft(draft: AssistantDraft) {
  if (draft.type === "create_todo") {
    return `${draft.text} · ${formatDate(draft.date)}`;
  }
  if (draft.type === "create_schedule_event") {
    const end = new Date(draft.end_at).toLocaleTimeString("en-US", {
      timeZone: "America/Toronto",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${draft.title} · ${formatDateTime(draft.start_at)}-${end}`;
  }
  if (draft.type === "create_journal_entry") {
    return draft.content;
  }
  return draft.content;
}

const examples = [
  "Add buy milk for tomorrow",
  "Note down coffee chat with Alex tomorrow at 3pm",
  "Journal I felt focused after my morning workout",
  "What should I do next today?",
];

export function AssistantClient() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: randomId(),
      role: "assistant",
      text:
        "Tell me what to capture or ask what to do next. I will draft actions first and only save after you confirm.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !busy;

  const pendingDraftCount = useMemo(
    () =>
      messages.reduce(
        (count, message) => count + (message.drafts?.filter((d) => d.type !== "answer").length ?? 0),
        0
      ),
    [messages]
  );

  async function submit(text = input) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMessage: Message = { id: randomId(), role: "user", text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/assistant/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages((current) => [
        ...current,
        {
          id: randomId(),
          role: "assistant",
          text: data.reply,
          drafts: data.drafts,
          source: data.source,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: randomId(),
          role: "system",
          text: error instanceof Error ? error.message : "Assistant request failed.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDraft(messageId: string, index: number, draft: AssistantDraft) {
    const key = `${messageId}:${index}`;
    setSavingKey(key);
    try {
      const res = await fetch("/api/assistant/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== messageId) return message;
          return {
            ...message,
            drafts: message.drafts?.filter((_, draftIndex) => draftIndex !== index),
          };
        })
      );
      setMessages((current) => [
        ...current,
        { id: randomId(), role: "system", text: data.message ?? "Saved." },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: randomId(),
          role: "system",
          text: error instanceof Error ? error.message : "Could not save draft.",
        },
      ]);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rowan-eyebrow">Assistant // Command desk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Executive Assistant
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B8B6B0]">
            Capture todos, schedule events, journal notes, and ask for next-step advice from
            your dashboard context.
          </p>
        </div>
        <Badge variant="outline" className="border-white/10 text-[#B8B6B0]">
          {pendingDraftCount} pending draft{pendingDraftCount === 1 ? "" : "s"}
        </Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="border-white/10 bg-white/[0.035] text-white">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-[#6BE3A4]" />
              Command thread
            </CardTitle>
            {busy && <Loader2 className="h-4 w-4 animate-spin text-[#B8B6B0]" />}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="min-h-[420px] space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[82%] rounded-xl bg-white text-[#0A0A0B] px-4 py-3 text-sm"
                      : message.role === "system"
                        ? "rounded-xl border border-[#6BE3A4]/20 bg-[#6BE3A4]/10 px-4 py-3 text-sm text-[#BDF5D5]"
                        : "max-w-[88%] rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#FAFAFA]"
                  }
                >
                  <div className="whitespace-pre-wrap leading-6">{message.text}</div>
                  {message.source === "fallback" && (
                    <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#F2C063]">
                      Fallback parser
                    </div>
                  )}
                  {message.drafts?.length ? (
                    <div className="mt-3 space-y-2">
                      {message.drafts.map((draft, index) => {
                        if (draft.type === "answer") return null;
                        const key = `${message.id}:${index}`;
                        return (
                          <div
                            key={key}
                            className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {draftTitle(draft)}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingKey === key}
                                onClick={() => confirmDraft(message.id, index, draft)}
                                className="h-8 gap-1.5"
                              >
                                {savingKey === key ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Confirm
                              </Button>
                            </div>
                            <p className="text-sm leading-5 text-white">{describeDraft(draft)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="Ask what to do next, or say what you want to capture..."
                className="min-h-24 border-white/10 bg-transparent text-white placeholder:text-[#76746E]"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#76746E]">Use Cmd/Ctrl + Enter to send</span>
                <Button type="submit" disabled={!canSend} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-[#F2C063]" />
                Try this
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void submit(example)}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-sm text-[#B8B6B0] transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {example}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader>
              <CardTitle className="text-base">Safety rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-[#B8B6B0]">
              <p>Creation commands are drafts first. Nothing is saved until you press Confirm.</p>
              <p>Advice answers use dashboard context: todos, schedule, habits, journal, finance alerts, inbox, and focus sessions.</p>
              <p>Timed reminders go through Telegram once the reminder runner is scheduled.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

