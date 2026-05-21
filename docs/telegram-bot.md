# Telegram Bot Capture Setup

This app exposes a secure webhook at:

```txt
/api/webhook/telegram
```

The webhook saves captures into `inbox_items`:

- `/todo Buy milk` -> `destination = task`
- `/note Dashboard idea` -> `destination = note`
- `Any raw text` -> `destination = task`
- Voice message -> `destination = voice` with Telegram file metadata. Transcription is not configured yet.
- `/expense`, `/income`, `/bizexpense`, `/bizincome`, and `/cash` are recognized placeholders for future finance capture.

## Vercel Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```txt
TELEGRAM_BOT_TOKEN=123456:abc...
TELEGRAM_WEBHOOK_SECRET=a-long-random-secret
TELEGRAM_ALLOWED_CHAT_ID=123456789
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

`TELEGRAM_ALLOWED_CHAT_ID` is required. Only messages from that Telegram chat ID are accepted.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code.

## Register The Webhook

After deploying to Vercel, run:

```bash
export TELEGRAM_BOT_TOKEN="123456:abc..."
export TELEGRAM_WEBHOOK_SECRET="a-long-random-secret"
export VERCEL_APP_URL="https://your-app.vercel.app"
sh scripts/set-telegram-webhook.sh
```

Equivalent one-off curl:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$VERCEL_APP_URL/api/webhook/telegram\",
    \"secret_token\": \"$TELEGRAM_WEBHOOK_SECRET\"
  }"
```

## Find Your Chat ID

Send a message to your bot, then run:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
```

Look for:

```json
"chat": { "id": 123456789 }
```

Use that number as `TELEGRAM_ALLOWED_CHAT_ID`.

## Spoken-Friendly Usage

You can type or dictate these into Telegram:

```txt
/todo Review VA expenses tonight
/note Idea: add a chart for top recurring software costs
Follow up with the affiliate dashboard tomorrow
```

Raw text defaults to a to-do capture.
