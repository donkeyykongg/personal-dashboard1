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

export type ParsedTelegramCapture =
  | {
      ok: true;
      chatId: string;
      destination: "task" | "note" | "voice";
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
        "Send /todo Buy milk, /note Dashboard idea, or plain text to save a to-do. Finance commands are scaffolded: /expense, /income, /bizexpense, /bizincome, /cash.",
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

    if (kind !== "todo" && kind !== "note") {
      return {
        ok: false,
        chatId,
        status: 200,
        handled: true,
        reply: `I do not know /${kind} yet. Use /todo, /note, or plain text.`,
      };
    }

    if (!content) {
      return {
        ok: false,
        chatId,
        status: 200,
        handled: true,
        reply: `Add text after /${kind}, like /${kind} ${kind === "todo" ? "Buy milk" : "Idea"}.`,
      };
    }

    const destination = kind === "note" ? "note" : "task";
    return {
      ok: true,
      chatId,
      destination,
      content,
      reply: `✅ Saved to inbox: ${content}`,
    };
  }

  return {
    ok: true,
    chatId,
    destination: "task",
    content: rawText,
    reply: `✅ Saved to inbox: ${rawText}`,
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
