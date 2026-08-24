import { createFileRoute } from "@tanstack/react-router";
import { telegramWebhookSecret } from "@/lib/telegram-verify";

const CHANNEL = "@NestPlayUz";
const SUPPORT = "@NestPlay_Support";
const BOT = "NestPlayBot";

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

const RULES_PART_1 = `📜 <b>NestPlay — Rasmiy qoidalar va foydalanish shartlari</b>

🎯 <b>Yo'riqnoma</b>
O'ynashni boshlash uchun avvalo <b>Hisobni to'ldirish</b> bo'limiga kirib, to'lov usuli va summani tanlang (minimal 10 000 so'm). «To'lov qilish» tugmasini bosganingizdan so'ng tayyor xabar avtomatik ravishda administratorga yuboriladi. To'lov tasdiqlangach, mablag' <b>O'yin balansiga</b> tushadi.

So'ng o'ynamoqchi bo'lgan jackpotni tanlab «Chipta sotib olish» tugmasini bosing. Chipta narxi O'yin balansidan yechiladi. Belgilangan vaqt tugagach, tizim <b>avtomatik qura tashlaydi</b> va g'olib(lar)ni aniqlaydi. G'olib bo'lsangiz, yutuq summasi <b>Yechish balansiga</b> o'tkaziladi.

Pul yechish uchun Yechish balansida kamida 10 000 so'm bo'lishi kerak. «Pul yechish» bo'limiga kirib, karta raqami va summani kiriting. Holat: <b>Kutilmoqda · To'lanmoqda · To'landi · Rad etildi</b>.

🏆 <b>Umumiy qoidalar</b>
• Har foydalanuvchi Telegram ID orqali aniqlanadi.
• Har foydalanuvchi uchun alohida balans va o'yinlar tarixi yuritiladi.
• Platformada <b>Haftalik</b> va <b>Kunlik</b> Jackpot o'yinlari mavjud.
• Chipta narxi, yutuq fondi, o'yin muddati va g'oliblar soni admin tomonidan belgilanadi.

💰 <b>Balans turlari</b>
• 🎮 <b>O'yin balansi</b> — To'ldirishlar shu yerga tushadi, chiptalar faqat shundan xarid qilinadi.
• 💳 <b>Yechish balansi</b> — Jackpot yutuqlari va bonuslar shu yerga tushadi. Pul yechish faqat shu balansdan.`;

const RULES_PART_2 = `🎟 <b>Chipta va o'yin tartibi</b>
• Chipta faqat O'yin balansi orqali xarid qilinadi.
• Har chipta noyob tartib raqamiga ega bo'ladi.
• Chipta savdosi admin belgilagan muddat davomida ochiq.
• Vaqti tugagach tizim <b>avtomatik tasodifiy qura</b> tashlaydi.
• Taymer server vaqti asosida ishlaydi.

🏅 <b>G'oliblarni aniqlash</b>
• G'oliblar soni admin tomonidan belgilanadi.
• Har g'olib to'liq yutuq summasini Yechish balansiga oladi.
• G'oliblar tasodifiy algoritm orqali aniqlanadi.

🔄 <b>Mablag'ni qaytarish</b>
• Yutmaganlarga chipta narxining <b>110%</b>i Yechish balansiga qaytariladi.
• Siz har qanday holatda g'alaba qozonasiz — pulingizga 10% qo'shib beriladi.

💵 <b>To'lovlar</b>
• Minimal to'ldirish/yechish: <b>10 000 so'm</b>.
• Pul yechish 48 soat ichida (dam olish kunlarisiz) ko'rib chiqiladi va to'lash kafolatlanadi.
• Ayrim holatlarda (texnik ishlar, bank nosozliklari, katta hajmdagi so'rovlar) to'lovlar kechikishi mumkin.
• To'lov <b>48 soatdan ham kechikishi</b> mumkin — bu qoidabuzarlik emas.
• Daromadimiz reklamadan tushadi. Reklama to'lovi kechikkanda, sizga to'lov ham <b>keyingi reklama to'lovi kelguncha</b> kechikishi mumkin. Bunday holatda navbat raqami va taxminiy muddat ilovada ko'rsatiladi.

👥 <b>Referal</b>
• Har foydalanuvchi shaxsiy referal havolasiga ega.
• Do'st sizning havolangiz orqali ro'yxatdan o'tib kanalga obuna bo'lsa, sizga <b>+500 so'm</b>.
• Soxta akkauntlar aniqlansa, referallar bekor qilinadi.

🔒 <b>Xavfsizlik</b>
• Har amal serverda himoyalangan holda saqlanadi.
• Hisob faqat Telegram ID orqali sizga tegishli.
• Shubhali faoliyat cheklovga sabab bo'ladi.

🚫 <b>Taqiqlangan</b>: ko'p akkaunt, soxta chek, boshqa hisobga kirish, tizimga zarar yetkazish.
• Administratorga qo'pol muomala yoki haqorat uchun hisob bloklanadi.
• Jackpot o'yinida xatolik aniqlansa, yutuq bekor qilinadi va admin ogohlantirishsiz summani ayirishi mumkin.
• Bloklangan taqdirda kiritgan pulingizni qaytarish uchun <b>24 soat ichida</b> adminga yozishingiz shart, aks holda mablag' qaytarilmaydi.

🆘 Aloqa: ${SUPPORT}`;

async function mainMenu(botToken: string, admin: any, chatId: number, tgId: number, name: string) {
  const appUrl = "https://telegram-mini-charm.lovable.app";
  await sendClean(
    botToken,
    admin,
    chatId,
    tgId,
    `🎰 <b>Xush kelibsiz, ${name}!</b> 🎉\n\n` +
      `✨ <b>NestPlay</b> — Telegramdagi eng qiziqarli jackpot o'yini.\n` +
      `💎 Chipta oling · 🏆 Jackpotda ishtirok eting · 💰 Yutib oling!\n\n` +
      `🎯 Har hafta yuzlab foydalanuvchi pul yutmoqda.\n` +
      `👇 Boshlash uchun quyidagi tugmalardan foydalaning:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 Ochish", web_app: { url: appUrl } }],
          [
            { text: "📢 Kanal", url: `https://t.me/${CHANNEL.replace(/^@/, "")}` },
            { text: "🆘 Aloqa", url: `https://t.me/${SUPPORT.replace(/^@/, "")}` },
          ],
          [{ text: "📜 Qoidalar", callback_data: "rules" }],
        ],
      },
    },
  );
}

async function askPhone(botToken: string, admin: any, chatId: number, tgId: number) {
  await sendClean(
    botToken,
    admin,
    chatId,
    tgId,
    `📱 <b>Ro'yxatdan o'tish</b>\n\n` +
      `Xush kelibsiz! 👋\n` +
      `Davom etish uchun telefon raqamingizni yuboring.\n\n` +
      `🔒 Ma'lumotlar xavfsiz saqlanadi.\n` +
      `👇 <i>«Telefon raqamni yuborish» tugmasini bosing.</i>`,
    {
      reply_markup: {
        keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
  );
}

async function askChannel(botToken: string, admin: any, chatId: number, tgId: number) {
  // Remove reply keyboard silently (this message is auto-cleaned next round)
  const rm = await sendMessage(botToken, chatId, "✅", { reply_markup: { remove_keyboard: true } });
  const rmId = rm?.result?.message_id;
  if (rmId) await deleteMsg(botToken, chatId, rmId);
  await sendClean(
    botToken,
    admin,
    chatId,
    tgId,
    `📢 <b>Rasmiy kanalga obuna bo'ling</b>\n\n` +
      `✨ Botdan foydalanish uchun kanalimizga a'zo bo'lishingiz shart.\n\n` +
      `👉 ${CHANNEL}\n\n` +
      `📌 Yangiliklar, aksiyalar va g'oliblar shu yerda!\n\n` +
      `Obuna bo'lgach 👇 «✅ Tasdiqlash» tugmasini bosing.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Kanalga o'tish", url: `https://t.me/${CHANNEL.replace(/^@/, "")}` }],
          [{ text: "✅ Tasdiqlash", callback_data: "verify_channel" }],
        ],
      },
    },
  );
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

const BLOCKED_TEXT =
  "🚫 <b>Hisobingiz umrbod bloklandi</b>\n\n" +
  "Siz qoidalarni qator ravishda buzganingiz uchun botdan foydalanish huquqingiz butunlay bekor qilindi.\n\n" +
  "💵 Kiritgan pulingizni olishni istasangiz adminga yozing: " + SUPPORT + "\n" +
  "⏳ 24 soat ichida yozmasangiz, qoidalarga muvofiq pulingiz qaytarilmaydi.";

async function isBanned(admin: any, tgId: number): Promise<boolean> {
  const { data } = await admin
    .from("profiles")
    .select("banned")
    .eq("telegram_id", tgId)
    .maybeSingle();
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
            if (await isBanned(admin, userId)) {
              await tg(botToken, "answerCallbackQuery", {
                callback_query_id: cb.id,
                text: "🚫 Siz bloklangansiz",
                show_alert: true,
              });
              return Response.json({ ok: true });
            }

            if (data === "verify_channel") {
              const ok = await isSubscribed(botToken, userId);
              if (!ok) {
                await tg(botToken, "answerCallbackQuery", {
                  callback_query_id: cb.id,
                  text: "❌ Siz hali kanalga obuna bo'lmadingiz!",
                  show_alert: true,
                });
                return Response.json({ ok: true });
              }
              await admin.rpc("bot_mark_channel_verified", { _telegram_id: userId });
              await tg(botToken, "answerCallbackQuery", {
                callback_query_id: cb.id,
                text: "✅ Obuna tasdiqlandi! 🎉",
              });
              await mainMenu(botToken, admin, chatId, userId, cb.from?.first_name ?? "Do'st");
              return Response.json({ ok: true });
            }
            if (data === "rules") {
              await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
              await sendClean(botToken, admin, chatId, userId, RULES_PART_1);
              await sendClean(botToken, admin, chatId, userId, RULES_PART_2, {
                reply_markup: {
                  inline_keyboard: [[{ text: "⬅️ Bosh menyu", callback_data: "menu" }]],
                },
              });
              return Response.json({ ok: true });
            }
            if (data === "menu") {
              await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
              await mainMenu(botToken, admin, chatId, userId, cb.from?.first_name ?? "Do'st");
              return Response.json({ ok: true });
            }
            await tg(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
            return Response.json({ ok: true });
          }

          const msg = update?.message ?? update?.edited_message;
          const chatId: number | undefined = msg?.chat?.id;
          const text: string = msg?.text ?? "";
          const fromId: number | undefined = msg?.from?.id;
          const firstName: string = msg?.from?.first_name ?? "Do'st";
          const lastName: string | undefined = msg?.from?.last_name;
          const username: string | undefined = msg?.from?.username;
          const incomingMsgId: number | undefined = msg?.message_id;

          if (!chatId || !fromId) return Response.json({ ok: true, ignored: true });
          const admin = await getAdmin();
          if (await isBanned(admin, fromId)) {
            await sendMessage(botToken, chatId, BLOCKED_TEXT);
            return Response.json({ ok: true, blocked: true });
          }

          if (msg?.contact?.phone_number) {
            const phone = msg.contact.phone_number as string;
            await admin.rpc("bot_set_phone", { _telegram_id: fromId, _phone: phone });
            await askChannel(botToken, admin, chatId, fromId);
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
              .select("phone, channel_verified")
              .eq("telegram_id", fromId)
              .maybeSingle();

            if (!bu?.phone) {
              await askPhone(botToken, admin, chatId, fromId);
            } else if (!bu.channel_verified) {
              await askChannel(botToken, admin, chatId, fromId);
            } else {
              await mainMenu(botToken, admin, chatId, fromId, firstName);
            }
            return Response.json({ ok: true });
          }

          if (text === "/qoidalar" || text.toLowerCase().startsWith("/rules")) {
            await sendClean(botToken, admin, chatId, fromId, RULES_PART_1);
            await sendClean(botToken, admin, chatId, fromId, RULES_PART_2, {
              reply_markup: {
                inline_keyboard: [[{ text: "⬅️ Bosh menyu", callback_data: "menu" }]],
              },
            });
            return Response.json({ ok: true });
          }

          const { data: bu } = await admin
            .from("bot_users")
            .select("phone, channel_verified")
            .eq("telegram_id", fromId)
            .maybeSingle();
          if (!bu) {
            await sendClean(botToken, admin, chatId, fromId, "👋 Iltimos /start buyrug'ini yuboring.");
          } else if (!bu.phone) {
            await askPhone(botToken, admin, chatId, fromId);
          } else if (!bu.channel_verified) {
            await askChannel(botToken, admin, chatId, fromId);
          } else {
            await mainMenu(botToken, admin, chatId, fromId, firstName);
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