import { createFileRoute } from "@tanstack/react-router";
import { telegramWebhookSecret } from "@/lib/telegram-verify";

export const Route = createFileRoute("/api/public/telegram/setup")({
  server: {
    handlers: {
      GET: async () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          return Response.json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });
        }
        // Telegram must call the stable public dev host so webhook fixes become
        // available immediately without depending on the separately published UI.
        const url = "https://project--be56b12e-c37a-4004-a04b-d0cea4ef9de3-dev.lovable.app/api/public/telegram/webhook";
        const secret = await telegramWebhookSecret(token);
        const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            secret_token: secret,
            allowed_updates: ["message", "edited_message", "callback_query"],
            drop_pending_updates: false,
          }),
        });
        const body = await r.json().catch(() => ({}));
        const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((x) => x.json()).catch(() => ({}));
        // Persistent bot menu button → opens Mini App
        const menu = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menu_button: {
              type: "web_app",
              text: "🎮 Ochish",
              web_app: { url: "https://telegram-mini-charm.lovable.app" },
            },
          }),
        }).then((x) => x.json()).catch(() => ({}));
        return Response.json({ ok: true, url, setWebhook: body, webhookInfo: info, menuButton: menu });
      },
    },
  },
});