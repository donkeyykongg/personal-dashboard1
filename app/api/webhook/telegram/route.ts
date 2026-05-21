import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isAllowedTelegramChat,
  parseTelegramUpdate,
  sendTelegramMessage,
  verifyTelegramRequest,
  type TelegramUpdate,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

async function safeReply(chatId: string | undefined, text: string) {
  if (!chatId) return;
  try {
    await sendTelegramMessage(chatId, text);
  } catch (error) {
    console.error(error);
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Telegram webhook secret is not configured" }, { status: 500 });
  }

  if (!process.env.TELEGRAM_ALLOWED_CHAT_ID) {
    return NextResponse.json({ error: "Telegram allowed chat ID is not configured" }, { status: 500 });
  }

  if (!verifyTelegramRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseTelegramUpdate(update);
  if (parsed.chatId && !isAllowedTelegramChat(parsed.chatId)) {
    return NextResponse.json({ error: "Chat is not allowed" }, { status: 403 });
  }

  if (!parsed.ok) {
    await safeReply(parsed.chatId, parsed.reply);
    return NextResponse.json({ ok: parsed.status < 400, message: parsed.reply }, { status: parsed.status });
  }

  try {
    const supabase = createAdminClient();
    if (parsed.destination === "journal") {
      const { error } = await supabase.from("journal_entries").insert({
        content: parsed.content,
        source: "telegram",
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("inbox_items").insert({
        content: parsed.content,
        destination: parsed.destination,
      });
      if (error) throw new Error(error.message);
    }

    await safeReply(parsed.chatId, parsed.reply);
    return NextResponse.json({
      ok: true,
      destination: parsed.destination,
      content: parsed.content,
    });
  } catch (error) {
    console.error(error);
    await safeReply(parsed.chatId, "Could not save that capture. Check the dashboard logs.");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
