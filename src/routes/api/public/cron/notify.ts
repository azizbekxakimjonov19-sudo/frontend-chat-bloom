import { createFileRoute } from "@tanstack/react-router";

// Sends queued bot_notifications via Telegram. Called by cron (or on demand).
// Auth: apikey header must equal SUPABASE_PUBLISHABLE_KEY.
export const Route = createFileRoute("/api/public/cron/notify")({
  server: {
    handlers: {
      POST: async ({ request }) => await handle(request),
      GET: async ({ request }) => await handle(request),
    },
  },
});

async function handle(request: Request) {
  const apiKey = request.headers.get("apikey") ?? new URL(request.url).searchParams.get("apikey");
  if (!process.env.SUPABASE_PUBLISHABLE_KEY || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return Response.json({ ok: false, error: "no bot token" }, { status: 500 });

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: pending } = await admin
    .from("bot_notifications")
    .select("id, telegram_id, text, attempts")
    .is("sent_at", null)
    .lt("attempts", 5)
    .order("id", { ascending: true })
    .limit(50);

  let sent = 0;
  let failed = 0;
  for (const n of pending ?? []) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: n.telegram_id, text: n.text, parse_mode: "HTML" }),
      });
      const body = await r.json().catch(() => ({}));
      if (body?.ok) {
        await admin
          .from("bot_notifications")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", n.id);
        sent++;
      } else {
        await admin
          .from("bot_notifications")
          .update({ attempts: (n.attempts ?? 0) + 1, last_error: JSON.stringify(body).slice(0, 500) })
          .eq("id", n.id);
        failed++;
      }
    } catch (e) {
      await admin
        .from("bot_notifications")
        .update({ attempts: (n.attempts ?? 0) + 1, last_error: (e as Error).message.slice(0, 500) })
        .eq("id", n.id);
      failed++;
    }
  }
  return Response.json({ ok: true, sent, failed, pending: pending?.length ?? 0 });
}