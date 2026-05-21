#!/usr/bin/env sh
set -eu

: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN first}"
: "${TELEGRAM_WEBHOOK_SECRET:?Set TELEGRAM_WEBHOOK_SECRET first}"
: "${VERCEL_APP_URL:?Set VERCEL_APP_URL first, e.g. https://your-app.vercel.app}"

curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${VERCEL_APP_URL}/api/webhook/telegram\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\"
  }"

printf "\n"
