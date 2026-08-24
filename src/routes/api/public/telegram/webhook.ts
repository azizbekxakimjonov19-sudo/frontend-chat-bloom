import { createFileRoute } from "@tanstack/react-router";
import { telegramWebhookSecret } from "@/lib/telegram-verify";
import { LANGS, t, type Lang } from "@/lib/bot-i18n";

const CHANNEL = "@LumoWin";
const SUPPORT = "@LumoWin";
const APP_URL = "https://frontend-chat-bloom.lovable.app";

async function tg(botToken: string, method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

async function sendMessage(botToken: string, chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return tg(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

async function deleteMsg(botToken: string, chatId: number, messageId: number) {
  return tg(botToken, "deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => ({}));
}

async function sendClean(
  botToken: string,
  admin: any,
  chatId: number,
  tgId: number,
  text: string,
  extra: Record<string, unknown> = {},
) {
  const { data: bu } = await admin
    .from("bot_users")
    .select("last_bot_message_id")
    .eq("telegram_id", tgId)
    .maybeSingle();
  if (bu?.last_bot_message_id) {
    await deleteMsg(botToken, chatId, Number(bu.last_bot_message_id));
  }
  const r = await sendMessage(botToken, chatId, text, extra);
  const mid = r?.result?.message_id;
  if (mid) {
    await admin
      .from("bot_users")
      .update({ last_bot_message_id: mid, updated_at: new Date().toISOString() })
      .eq("telegram_id", tgId);
  }
  return r;
}

function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function getAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getLang(admin: any, tgId: number): Promise<Lang> {
  const { data } = await admin.from("bot_users").select("lang").eq("telegram_id", tgId).maybeSingle();
  return (data?.lang ?? "uz") as Lang;
}

async function mainMenu(botToken: string, admin: any, chatId: number, tgId: number, name: string, lang?: Lang) {
  const L = t(lang ?? (await getLang(admin, tgId)));
  await sendClean(botToken, admin, chatId, tgId, L.welcome(name), {
    reply_markup: {
      inline_keyboard: [
        [{ text: L.openBtn, web_app: { url: APP_URL } }],
        [
          { text: L.channelMenuBtn, url: `https://t.me/${CHANNEL.replace(/^@/, "")}` },
          { text: L.supportBtn, callback_data: "noop" },
        ],
        [{ text: L.langBtn, callback_data: "lang" }],
      ],
    },
  });
}

async function langMenu(botToken: string, admin: any, chatId: number, tgId: number, lang: Lang) {
  const L = t(lang);
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < LANGS.length; i += 2) {
    rows.push(
      LANGS.slice(i, i + 2).map((l) => ({ text: l.label, callback_data: `setlang:${l.code}` })),
    );
  }
  rows.push([{ text: L.backBtn, callback_data: "menu" }]);
  await sendClean(botToken, admin, chatId, tgId, L.langTitle, { reply_markup: { inline_keyboard: rows } });
}

async function askPhone(botToken: string, admin: any, chatId: number, tgId: number, lang: Lang) {
  const L = t(lang);
  await sendClean(botToken, admin, chatId, tgId, L.askPhone, {
    reply_markup: {
      keyboard: [[{ text: L.phoneBtn, request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

async function askChannel(botToken: string, admin: any, chatId: number, tgId: number, lang: Lang) {
  const L = t(lang);
  const rm = await sendMessage(botToken, chatId, "✅", { reply_markup: { remove_keyboard: true } });
  const rmId = rm?.result?.message_id;
  if (rmId) await deleteMsg(botToken, chatId, rmId);
  await sendClean(botToken, admin, chatId, tgId, L.askChannel(CHANNEL), {
    reply_markup: {
      inline_keyboard: [
        [{ text: L.channelBtn, url: `https://t.me/${CHANNEL.replace(/^@/, "")}` }],
        [{ text: L.confirmBtn, callback_data: "verify_channel" }],
      ],
    },
  });
}

async function isSubscribed(botToken: string, userId: number): Promise<boolean> {
  try {
    const res = await tg(botToken, "getChatMember", { chat_id: CHANNEL, user_id: userId });
    const status = res?.result?.status as string | undefined;
    return status === "creator" || status === "administrator" || status === "member";
  } catch {
    return false;
  }
}

async function isBanned(admin: any, tgId: number): Promise<boolean> {
  const { data } = await admin.from("profiles").select("banned").eq("telegram_id", tgId).maybeSingle();
  return !!data?.banned;
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return new Response("no token", { status: 500 });

        const expected = await telegramWebhookSecret(botToken);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

        const update = await request.json().catch(() => null);
        try {
          if (update?.callback_query) {
            const cb = update.callback_query;
            const chatId: number | undefined = cb.message?.chat?.id;
            const userId: number | undefined = cb.from?.id;
            const data: string = cb.data ?? "";
            if (!chatId || !userId) {
              await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
              return Response.json({ ok: true });
            }
            const admin = await getAdmin();
            const lang = await getLang(admin, userId);
            const L = t(lang);
            if (await isBanned(admin, userId)) {
              await tg(botToken, "answerCallbackQuery", {
                callback_query_id: cb.id,
                text: L.bannedAlert,
                show_alert: true,
              });
              return Response.json({ ok: true });
            }

            if (data === "verify_channel") {
              const ok = await isSubscribed(botToken, userId);
              if (!ok) {
                await tg(botToken, "answerCallbackQuery", {
                  callback_query_id: cb.id,
                  text: L.notSubscribed,
                  show_alert: true,
                });
                return Response.json({ ok: true });
              }
              await admin.rpc("bot_mark_channel_verified", { _telegram_id: userId });
              await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id, text: L.subscribed });
              await mainMenu(botToken, admin, chatId, userId, cb.from?.first_name ?? "friend", lang);
              return Response.json({ ok: true });
            }
            if (data === "lang") {
              await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
              await langMenu(botToken, admin, chatId, userId, lang);
              return Response.json({ ok: true });
            }
            if (data.startsWith("setlang:")) {
              const next = data.split(":")[1] as Lang;
              const valid = LANGS.some((l) => l.code === next);
              const chosen: Lang = valid ? next : "uz";
              await admin
                .from("bot_users")
                .update({ lang: chosen, updated_at: new Date().toISOString() })
                .eq("telegram_id", userId);
              await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id, text: t(chosen).langChanged });
              await mainMenu(botToken, admin, chatId, userId, cb.from?.first_name ?? "friend", chosen);
              return Response.json({ ok: true });
            }
            if (data === "menu") {
              await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
              await mainMenu(botToken, admin, chatId, userId, cb.from?.first_name ?? "friend", lang);
              return Response.json({ ok: true });
            }
            await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
            return Response.json({ ok: true });
          }

          const msg = update?.message ?? update?.edited_message;
          const chatId: number | undefined = msg?.chat?.id;
          const text: string = msg?.text ?? "";
          const fromId: number | undefined = msg?.from?.id;
          const firstName: string = msg?.from?.first_name ?? "friend";
          const lastName: string | undefined = msg?.from?.last_name;
          const username: string | undefined = msg?.from?.username;

          if (!chatId || !fromId) return Response.json({ ok: true, ignored: true });
          const admin = await getAdmin();
          if (await isBanned(admin, fromId)) {
            const L = t(await getLang(admin, fromId));
            await sendMessage(botToken, chatId, L.blocked(SUPPORT));
            return Response.json({ ok: true, blocked: true });
          }

          if (msg?.contact?.phone_number) {
            const phone = msg.contact.phone_number as string;
            await admin.rpc("bot_set_phone", { _telegram_id: fromId, _phone: phone });
            await askChannel(botToken, admin, chatId, fromId, await getLang(admin, fromId));
            return Response.json({ ok: true });
          }

          if (text.startsWith("/start")) {
            const parts = text.split(/\s+/);
            const raw = parts[1]?.trim() ?? "";
            const refMatch = raw.replace(/^ref[_-]?/i, "");
            const referrer = /^\d+$/.test(refMatch) ? Number(refMatch) : null;
            await admin.rpc("bot_upsert_user", {
              _telegram_id: fromId,
              _chat_id: chatId,
              _username: username ?? null,
              _first_name: firstName,
              _last_name: lastName ?? null,
              _referrer: referrer,
            });
            const { data: bu } = await admin
              .from("bot_users")
              .select("phone, channel_verified, lang")
              .eq("telegram_id", fromId)
              .maybeSingle();
            const lang = (bu?.lang ?? "uz") as Lang;

            if (!bu?.phone) {
              await askPhone(botToken, admin, chatId, fromId, lang);
            } else if (!bu.channel_verified) {
              await askChannel(botToken, admin, chatId, fromId, lang);
            } else {
              await mainMenu(botToken, admin, chatId, fromId, firstName, lang);
            }
            return Response.json({ ok: true });
          }

          const { data: bu } = await admin
            .from("bot_users")
            .select("phone, channel_verified, lang")
            .eq("telegram_id", fromId)
            .maybeSingle();
          const lang = (bu?.lang ?? "uz") as Lang;
          if (!bu) {
            await sendClean(botToken, admin, chatId, fromId, t(lang).startFirst);
          } else if (!bu.phone) {
            await askPhone(botToken, admin, chatId, fromId, lang);
          } else if (!bu.channel_verified) {
            await askChannel(botToken, admin, chatId, fromId, lang);
          } else {
            await mainMenu(botToken, admin, chatId, fromId, firstName, lang);
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.error("webhook err", e);
          return Response.json({ ok: true, error: (e as Error).message });
        }
      },
    },
  },
});
