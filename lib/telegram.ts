import type { NextRequest } from "next/server";

export type TelegramMessage = {
  message_id?: number;
  chat?: { id?: number | string };
  text?: string;
  caption?: string;
  voice?: {
    file_id: string;
    duration?: number;
    mime_type?: string;
  };
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

export type TelegramDestination = "task" | "note" | "voice" | "journal";

export type ParsedTelegramCapture =
  | {
      ok: true;
      chatId: string;
      destination: TelegramDestination;
      content: string;
      reply: string;
    }
  | {
      ok: false;
      chatId?: string;
      reply: string;
      status: number;
      handled?: boolean;
    };

const COMMAND_RE = /^\/([a-z]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i;
const FINANCE_COMMANDS = new Set(["expense", "income", "bizexpense", "bizincome", "cash"]);

export function verifyTelegramRequest(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;

  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  return headerSecret === expected;
}

export function isAllowedTelegramChat(chatId: string): boolean {
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowedChatId) return false;
  return chatId === allowedChatId.trim();
}

export function parseTelegramUpdate(update: TelegramUpdate): ParsedTelegramCapture {
  const message = update.message ?? update.edited_message;
  const chatId = message?.chat?.id == null ? "" : String(message.chat.id);
  if (!message || !chatId) {
    return { ok: false, status: 400, reply: "No Telegram message found in this update." };
  }

  const rawText = (message.text ?? message.caption ?? "").trim();

  if (/^\/help(?:@\w+)?$/i.test(rawText)) {
    return {
      ok: false,
      chatId,
      status: 200,
      handled: true,
      reply:
        "Send plain text to journal it. /todo Buy milk for a task, /note Idea for a note, /journal (or /reflect) Mood is great for an explicit journal entry. Finance commands are scaffolded: /expense, /income, /bizexpense, /bizincome, /cash.",
    };
  }

  if (!rawText && message.voice) {
    const duration = message.voice.duration ? `${message.voice.duration}s` : "unknown length";
    const content = `Voice message (${duration}) · Telegram file_id: ${message.voice.file_id}`;
    return {
      ok: true,
      chatId,
      destination: "voice",
      content,
      reply: "🎙️ Voice capture saved. Transcription is not configured yet.",
    };
  }

  if (!rawText) {
    return {
      ok: false,
      chatId,
      status: 200,
      handled: true,
      reply: "Send text, /todo text, or /note text.",
    };
  }

  const command = rawText.match(COMMAND_RE);
  if (command) {
    const kind = command[1].toLowerCase();
    const content = (command[2] ?? "").trim();
    if (FINANCE_COMMANDS.has(kind)) {
      return {
        ok: false,
        chatId,
        status: 200,
        handled: true,
        reply:
          kind === "cash"
            ? "📊 /cash is recognized but not connected yet."
            : `💸 /${kind} is recognized but finance insertion is not connected yet.`,
      };
    }

    const journalAliases = new Set(["journal", "reflect", "reflection"]);
    const knownKinds = new Set(["todo", "note", ...journalAliases]);
    if (!knownKinds.has(kind)) {
      return {
        ok: false,
        chatId,
        status: 200,
        handled: true,
        reply: `I do not know /${kind} yet. Use /todo, /note, /journal (or /reflect), or plain text.`,
      };
    }

    if (!content) {
      const example =
        kind === "todo"
          ? "Buy milk"
          : kind === "note"
            ? "Idea"
            : "Mood is great today";
      return {
        ok: false,
        chatId,
        status: 200,
        handled: true,
        reply: `Add text after /${kind}, like /${kind} ${example}.`,
      };
    }

    const destination: TelegramDestination =
      kind === "note" ? "note" : journalAliases.has(kind) ? "journal" : "task";
    const reply =
      destination === "journal"
        ? `📓 Logged to journal: ${content}`
        : `✅ Saved to inbox: ${content}`;
    return {
      ok: true,
      chatId,
      destination,
      content,
      reply,
    };
  }

  return {
    ok: true,
    chatId,
    destination: "journal",
    content: rawText,
    reply: `📓 Logged to journal: ${rawText}`,
  };
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}
