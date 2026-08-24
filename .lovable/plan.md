
# Reja: Real backend + Telegram bot integratsiyasi

## 1. Arxitektura (muhim tushuntirish)

Siz "index.html'ni o'zim hostimga qo'yaman, serverda qilma" dedingiz **va** "Lovable Cloud, admin panel, Telegram webhook" ham so'radingiz. Bu ikkisi birga faqat shunday ishlaydi:

```text
[Sizning hostingiz]                 [Lovable Cloud]
  index.html (Vite build)  ─────►   Supabase DB
  Telegram Mini App WebView         Auth (Telegram initData)
                                    Server Functions (deposit approve, draw, etc.)
                                    /api/public/telegram/webhook (bot uchun)
```

- Frontend Supabase JS client (publishable key) orqali to'g'ridan-to'g'ri DB'ga yozadi/o'qiydi — RLS himoya qiladi.
- Maxsus amallar (chipta sotib olish, admin tasdiqlash, draw) — server function'lar orqali, CORS yoqilgan.
- Telegram webhook — Lovable Cloud'da joylashadi, bot token secret sifatida saqlanadi.
- Sizga faqat `dist/` papkani beraman, uni istagan hostingizga qo'yasiz.

## 2. Nima o'chiriladi

- `src/lib/game-store.ts` — butun demo store (18 fake user, seed participants, fake winners, fake history, fake audit).
- Barcha `initialState()` demo ma'lumotlari.
- Client-side `drawWinner` `setTimeout` — bu server'ga ko'chiriladi.

## 3. Database schema (migration)

Jadvallar (barchasida RLS + GRANT):

- `profiles` — telegram_id (PK), username, first_name, last_name, photo_url, balance, withdraw_balance, banned, is_admin, referrer_id, referral_code, created_at
- `user_roles` — user_id, role (admin/user) — alohida jadval (privilege escalation'dan himoya)
- `jackpots` — id (weekly/3day), title, prize, ticket_price, refund_percent, sale_hours, wait_hours, spin_minutes, opened_at, ends_at, drawing
- `tickets` — id, jackpot_id, user_id, ticket_code, price, status (active/won/refunded), won_amount, round_ends_at, created_at
- `transactions` — id, user_id, type, amount, note, created_at
- `deposit_requests` — id, user_id, amount, method, payment_details, status (pending/approved/rejected), admin_note, created_at, resolved_at, resolved_by
- `withdraw_requests` — id, user_id, amount, method, payment_details, status, admin_note, created_at, resolved_at, resolved_by
- `history` — id, jackpot_id, winner_id, amount, participants_count, drawn_at
- `audit_log` — id, user_id, actor, action, details, created_at
- `referrals` — referrer_id, referee_id, created_at (bonuslar keyinroq)

RLS: userlar faqat o'zining ma'lumotlarini ko'radi; adminlar hammasi. Jackpots va history hammaga o'qish uchun ochiq.

Boshlang'ich ma'lumot: 2 ta jackpot row (weekly, 3day) — hozirgi konfiguratsiya bilan. Boshqa hech narsa yo'q.

## 4. Auth: Telegram initData

- Frontend `window.Telegram.WebApp.initData` (imzolangan string)'ni server fn'ga yuboradi.
- Server fn `TELEGRAM_BOT_TOKEN` bilan HMAC-SHA256 tekshiradi.
- Valid bo'lsa: profiles jadvaliga upsert qiladi (id = telegram_id, username, first_name, photo_url avtomatik), Supabase custom JWT yaratib qaytaradi.
- Frontend uni `supabase.auth.setSession()` orqali o'rnatadi.
- Birinchi user avtomatik admin bo'ladi (yoki siz Telegram ID'ingizni beraringiz — sizni admin qilib qo'yaman).

## 5. Server functions (barchasi RLS + auth bilan)

- `authTelegram(initData)` — auth + profile upsert
- `buyTicket(jackpotId)` — balans tekshiradi, transactionda chipta yaratadi + balansdan yechadi + participant qo'shadi
- `requestDeposit(amount, method, details)` — pending row
- `requestWithdraw(amount, method, details)` — withdraw_balance tekshiradi va bloklaydi
- `adminApproveDeposit(id)`, `adminRejectDeposit(id, note)` — admin only
- `adminApproveWithdraw(id)`, `adminRejectWithdraw(id, note)`
- `adminAdjustBalance(userId, delta, note)`
- `adminToggleBan(userId)`
- `adminUpdateJackpot(id, patch)`
- `adminForceDraw(jackpotId)` — vaqti kelganda yoki qo'lda; DB tranzaksiyada g'olibni tanlaydi, prize yozadi, refund qiladi, jackpot yangi round bilan qayta ochiladi.
- `getMyProfile()`, `getMyTickets()`, `getMyTransactions()`
- `getJackpotState(id)` — participants list bilan
- `getHistory()`, `getLeaderboard()` — reyting: top winnerlar

## 6. Telegram webhook

Route: `/api/public/telegram/webhook` (bypass auth, HMAC-SHA256 secret_token verify).

Bot komandalar:
- `/start` — Mini App link yuboradi, referal kodni saqlaydi (`/start ref_CODE`)
- `/balance`, `/tickets` — qisqa ma'lumot
- Boshqa xabarlarni oddiy javob bilan

## 7. Cron (avtomatik draw)

`pg_cron` har 1 daqiqada `/api/public/cron/draw` ni chaqiradi (secret token bilan). Route `ends_at < now()` jackpotlarni tekshiradi va `adminForceDraw` mantiqni ishga tushiradi.

## 8. Frontend rewrite

- `useGame` selector'lar → `useQuery` + Supabase realtime subscription (jackpot participants va balans live yangilanadi).
- `JackpotScreens.tsx` — participants va countdown DB'dan.
- `AdminPanel.tsx` — barcha bo'limlar real ma'lumot: userlar ro'yxati (search + pagination), deposit/withdraw so'rovlar (approve/reject tugmalari), jackpot sozlash formalari, tarix.
- Yangi sahifalar: `/profile`, `/tickets`, `/history`, `/leaderboard`, `/deposit`, `/withdraw`.
- SEO metadata `__root.tsx`'da to'g'rilanadi.

## 9. Sizdan kerak bo'ladigan narsalar (secret sifatida so'rayman)

- `TELEGRAM_BOT_TOKEN` — BotFather'dan
- (ixtiyoriy) Sizning Telegram user ID'ingiz — birinchi admin qilib qo'yish uchun. Bermasangiz, birinchi kirgan user admin bo'ladi.

Webhook URL'ni men yaratib beraman, siz BotFather'da `/setwebhook` qilasiz.

## 10. Yetkazish

- Kod tayyor bo'lgach: `bun run build` → `dist/` papka.
- Sizga aytaman qanday build qilib olishni; index.html + assets siz istagan hostingga chiqadi.
- Frontend `.env`'da `VITE_SUPABASE_URL` va `VITE_SUPABASE_PUBLISHABLE_KEY` bo'ladi — bu Lovable Cloud'ga ishora qiladi.

---

## Texnik xatarlar / cheklovlar

1. **CORS**: Server function'lar boshqa origin'dan chaqirilganda `Access-Control-Allow-Origin` kerak. Sizning hostingiz domenini bilishim kerak (yoki `*` qilaman, publishable key baribir himoyalangan).
2. **Realtime**: Supabase Realtime cross-origin ishlaydi, muammo yo'q.
3. **Telegram initData** faqat Telegram ichida ochilganda mavjud — brauzerda test qilish uchun dev mock qo'shaman.
4. **Payments qo'lda** — foydalanuvchi karta raqami/miqdorni yozib qoldiradi, admin qo'lda tasdiqlaydi. Avtomatik pul o'tkazish yo'q.
5. Bu **katta hajmdagi** o'zgarish — 20+ fayl yangi/o'zgargan bo'ladi. Bitta xabarda bajaraman, ammo build/typecheck xatolari chiqishi mumkin — ularni tuzataman.

Tasdiqlasangiz, boshlayman: Lovable Cloud'ni yoqaman → migration → server fns → frontend rewrite → Telegram token secret so'rayman → webhook URL beraman.
