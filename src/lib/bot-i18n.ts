export type Lang = "uz" | "ru" | "en" | "tr" | "fr" | "de";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "uz", label: "🇺🇿 O'zbekcha" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "en", label: "🇬🇧 English" },
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "de", label: "🇩🇪 Deutsch" },
];

type Dict = {
  askPhone: string;
  phoneBtn: string;
  askChannel: (channel: string) => string;
  channelBtn: string;
  confirmBtn: string;
  notSubscribed: string;
  subscribed: string;
  welcome: (name: string) => string;
  openBtn: string;
  channelMenuBtn: string;
  supportBtn: string;
  langBtn: string;
  langTitle: string;
  backBtn: string;
  langChanged: string;
  soon: string;
  startFirst: string;
  blocked: (support: string) => string;
  bannedAlert: string;
};

const uz: Dict = {
  askPhone:
    "📱 <b>Ro'yxatdan o'tish</b>\n\nXush kelibsiz! 👋\nDavom etish uchun telefon raqamingizni yuboring.\n\n🔒 Ma'lumotlaringiz xavfsiz saqlanadi.\n👇 <i>Quyidagi tugmani bosing.</i>",
  phoneBtn: "📱 Telefon raqamni yuborish",
  askChannel: (c) =>
    `📢 <b>Rasmiy kanalga obuna bo'ling</b>\n\n✨ Botdan foydalanish uchun kanalimizga a'zo bo'lishingiz shart.\n\n👉 ${c}\n\n📌 Yangiliklar, aksiyalar va g'oliblar shu yerda!\n\nObuna bo'lgach 👇 <b>«Tasdiqlash»</b> tugmasini bosing.`,
  channelBtn: "📢 Kanalga o'tish",
  confirmBtn: "✅ Tasdiqlash",
  notSubscribed: "❌ Siz hali kanalga obuna bo'lmadingiz!",
  subscribed: "✅ Obuna tasdiqlandi! 🎉",
  welcome: (n) =>
    `🎡 <b>Xush kelibsiz, ${n}!</b> 🎉\n\n✨ <b>LumoWin</b> — omad g'ildiragi va kartalar dunyosi.\n🎯 G'ildirakni aylantiring · 🃏 Kartalarni oching · 💰 Yutuqni qo'lga kiriting!\n\n🔥 Har kuni yangi omad, yangi g'oliblar.\n👇 Boshlash uchun tugmani bosing:`,
  openBtn: "🎡 Ochish",
  channelMenuBtn: "📢 Kanal",
  supportBtn: "🆘 Aloqa",
  langBtn: "🌐 Tilni o'zgartirish",
  langTitle: "🌐 <b>Tilni tanlang</b>\n\nQuyidagi tillardan birini tanlang 👇",
  backBtn: "⬅️ Orqaga",
  langChanged: "✅ Til o'zgartirildi",
  soon: "Tez orada 🔧",
  startFirst: "👋 Iltimos /start buyrug'ini yuboring.",
  blocked: (s) =>
    `🚫 <b>Hisobingiz bloklandi</b>\n\nQoidalarni buzganingiz uchun botdan foydalanish huquqingiz bekor qilindi.\n\n💵 Savollar uchun: ${s}`,
  bannedAlert: "🚫 Siz bloklangansiz",
};

const ru: Dict = {
  askPhone:
    "📱 <b>Регистрация</b>\n\nДобро пожаловать! 👋\nЧтобы продолжить, отправьте свой номер телефона.\n\n🔒 Ваши данные в безопасности.\n👇 <i>Нажмите кнопку ниже.</i>",
  phoneBtn: "📱 Отправить номер телефона",
  askChannel: (c) =>
    `📢 <b>Подпишитесь на официальный канал</b>\n\n✨ Для использования бота необходима подписка.\n\n👉 ${c}\n\n📌 Новости, акции и победители — здесь!\n\nПосле подписки нажмите 👇 <b>«Подтвердить»</b>.`,
  channelBtn: "📢 Перейти в канал",
  confirmBtn: "✅ Подтвердить",
  notSubscribed: "❌ Вы ещё не подписались на канал!",
  subscribed: "✅ Подписка подтверждена! 🎉",
  welcome: (n) =>
    `🎡 <b>Добро пожаловать, ${n}!</b> 🎉\n\n✨ <b>LumoWin</b> — мир колеса удачи и карт.\n🎯 Крутите колесо · 🃏 Открывайте карты · 💰 Забирайте выигрыш!\n\n🔥 Каждый день новая удача и новые победители.\n👇 Нажмите кнопку, чтобы начать:`,
  openBtn: "🎡 Открыть",
  channelMenuBtn: "📢 Канал",
  supportBtn: "🆘 Поддержка",
  langBtn: "🌐 Сменить язык",
  langTitle: "🌐 <b>Выберите язык</b>\n\nВыберите один из языков ниже 👇",
  backBtn: "⬅️ Назад",
  langChanged: "✅ Язык изменён",
  soon: "Скоро 🔧",
  startFirst: "👋 Пожалуйста, отправьте команду /start.",
  blocked: (s) =>
    `🚫 <b>Ваш аккаунт заблокирован</b>\n\nДоступ к боту отозван за нарушение правил.\n\n💵 Вопросы: ${s}`,
  bannedAlert: "🚫 Вы заблокированы",
};

const en: Dict = {
  askPhone:
    "📱 <b>Registration</b>\n\nWelcome! 👋\nTo continue, please share your phone number.\n\n🔒 Your data stays safe.\n👇 <i>Tap the button below.</i>",
  phoneBtn: "📱 Share phone number",
  askChannel: (c) =>
    `📢 <b>Join our official channel</b>\n\n✨ A subscription is required to use the bot.\n\n👉 ${c}\n\n📌 News, promos and winners are posted there!\n\nOnce subscribed, tap 👇 <b>“Verify”</b>.`,
  channelBtn: "📢 Open channel",
  confirmBtn: "✅ Verify",
  notSubscribed: "❌ You are not subscribed yet!",
  subscribed: "✅ Subscription verified! 🎉",
  welcome: (n) =>
    `🎡 <b>Welcome, ${n}!</b> 🎉\n\n✨ <b>LumoWin</b> — the world of the lucky wheel and cards.\n🎯 Spin the wheel · 🃏 Flip the cards · 💰 Claim your win!\n\n🔥 New luck and new winners every day.\n👇 Tap a button to start:`,
  openBtn: "🎡 Open",
  channelMenuBtn: "📢 Channel",
  supportBtn: "🆘 Support",
  langBtn: "🌐 Change language",
  langTitle: "🌐 <b>Choose your language</b>\n\nPick one of the languages below 👇",
  backBtn: "⬅️ Back",
  langChanged: "✅ Language updated",
  soon: "Coming soon 🔧",
  startFirst: "👋 Please send the /start command.",
  blocked: (s) => `🚫 <b>Your account is blocked</b>\n\nAccess was revoked for breaking the rules.\n\n💵 Questions: ${s}`,
  bannedAlert: "🚫 You are blocked",
};

const tr: Dict = {
  askPhone:
    "📱 <b>Kayıt</b>\n\nHoş geldiniz! 👋\nDevam etmek için telefon numaranızı gönderin.\n\n🔒 Verileriniz güvende.\n👇 <i>Aşağıdaki düğmeye dokunun.</i>",
  phoneBtn: "📱 Telefon numarasını gönder",
  askChannel: (c) =>
    `📢 <b>Resmî kanala katılın</b>\n\n✨ Botu kullanmak için abonelik gerekir.\n\n👉 ${c}\n\n📌 Haberler, kampanyalar ve kazananlar orada!\n\nAbone olduktan sonra 👇 <b>“Doğrula”</b> düğmesine basın.`,
  channelBtn: "📢 Kanala git",
  confirmBtn: "✅ Doğrula",
  notSubscribed: "❌ Henüz abone olmadınız!",
  subscribed: "✅ Abonelik doğrulandı! 🎉",
  welcome: (n) =>
    `🎡 <b>Hoş geldiniz, ${n}!</b> 🎉\n\n✨ <b>LumoWin</b> — şans çarkı ve kartlar dünyası.\n🎯 Çarkı çevirin · 🃏 Kartları açın · 💰 Kazancınızı alın!\n\n🔥 Her gün yeni şans, yeni kazananlar.\n👇 Başlamak için bir düğmeye dokunun:`,
  openBtn: "🎡 Aç",
  channelMenuBtn: "📢 Kanal",
  supportBtn: "🆘 Destek",
  langBtn: "🌐 Dili değiştir",
  langTitle: "🌐 <b>Dil seçin</b>\n\nAşağıdaki dillerden birini seçin 👇",
  backBtn: "⬅️ Geri",
  langChanged: "✅ Dil değiştirildi",
  soon: "Yakında 🔧",
  startFirst: "👋 Lütfen /start komutunu gönderin.",
  blocked: (s) => `🚫 <b>Hesabınız engellendi</b>\n\nKuralları ihlal ettiğiniz için erişim iptal edildi.\n\n💵 Sorular: ${s}`,
  bannedAlert: "🚫 Engellendiniz",
};

const fr: Dict = {
  askPhone:
    "📱 <b>Inscription</b>\n\nBienvenue ! 👋\nPour continuer, partagez votre numéro de téléphone.\n\n🔒 Vos données restent protégées.\n👇 <i>Appuyez sur le bouton ci-dessous.</i>",
  phoneBtn: "📱 Envoyer mon numéro",
  askChannel: (c) =>
    `📢 <b>Rejoignez le canal officiel</b>\n\n✨ L'abonnement est requis pour utiliser le bot.\n\n👉 ${c}\n\n📌 Actus, promos et gagnants y sont publiés !\n\nUne fois abonné, appuyez sur 👇 <b>« Vérifier »</b>.`,
  channelBtn: "📢 Ouvrir le canal",
  confirmBtn: "✅ Vérifier",
  notSubscribed: "❌ Vous n'êtes pas encore abonné !",
  subscribed: "✅ Abonnement vérifié ! 🎉",
  welcome: (n) =>
    `🎡 <b>Bienvenue, ${n} !</b> 🎉\n\n✨ <b>LumoWin</b> — l'univers de la roue de la chance et des cartes.\n🎯 Tournez la roue · 🃏 Retournez les cartes · 💰 Empochez vos gains !\n\n🔥 Chaque jour, une nouvelle chance.\n👇 Appuyez pour commencer :`,
  openBtn: "🎡 Ouvrir",
  channelMenuBtn: "📢 Canal",
  supportBtn: "🆘 Support",
  langBtn: "🌐 Changer de langue",
  langTitle: "🌐 <b>Choisissez votre langue</b>\n\nSélectionnez une langue ci-dessous 👇",
  backBtn: "⬅️ Retour",
  langChanged: "✅ Langue modifiée",
  soon: "Bientôt 🔧",
  startFirst: "👋 Veuillez envoyer la commande /start.",
  blocked: (s) => `🚫 <b>Votre compte est bloqué</b>\n\nAccès révoqué pour non-respect des règles.\n\n💵 Questions : ${s}`,
  bannedAlert: "🚫 Vous êtes bloqué",
};

const de: Dict = {
  askPhone:
    "📱 <b>Registrierung</b>\n\nWillkommen! 👋\nBitte sende deine Telefonnummer, um fortzufahren.\n\n🔒 Deine Daten bleiben sicher.\n👇 <i>Tippe auf den Button unten.</i>",
  phoneBtn: "📱 Telefonnummer senden",
  askChannel: (c) =>
    `📢 <b>Tritt dem offiziellen Kanal bei</b>\n\n✨ Für die Nutzung des Bots ist ein Abo nötig.\n\n👉 ${c}\n\n📌 News, Aktionen und Gewinner findest du dort!\n\nDanach 👇 <b>„Bestätigen“</b> tippen.`,
  channelBtn: "📢 Kanal öffnen",
  confirmBtn: "✅ Bestätigen",
  notSubscribed: "❌ Du hast den Kanal noch nicht abonniert!",
  subscribed: "✅ Abo bestätigt! 🎉",
  welcome: (n) =>
    `🎡 <b>Willkommen, ${n}!</b> 🎉\n\n✨ <b>LumoWin</b> — die Welt des Glücksrads und der Karten.\n🎯 Dreh das Rad · 🃏 Deck die Karten auf · 💰 Sichere dir den Gewinn!\n\n🔥 Jeden Tag neues Glück, neue Gewinner.\n👇 Tippe zum Starten:`,
  openBtn: "🎡 Öffnen",
  channelMenuBtn: "📢 Kanal",
  supportBtn: "🆘 Support",
  langBtn: "🌐 Sprache ändern",
  langTitle: "🌐 <b>Sprache wählen</b>\n\nWähle unten eine Sprache 👇",
  backBtn: "⬅️ Zurück",
  langChanged: "✅ Sprache geändert",
  soon: "Bald 🔧",
  startFirst: "👋 Bitte sende den Befehl /start.",
  blocked: (s) => `🚫 <b>Dein Konto ist gesperrt</b>\n\nZugang wegen Regelverstoß entzogen.\n\n💵 Fragen: ${s}`,
  bannedAlert: "🚫 Du bist gesperrt",
};

const DICTS: Record<Lang, Dict> = { uz, ru, en, tr, fr, de };

export function t(lang: string | null | undefined): Dict {
  return DICTS[(lang ?? "uz") as Lang] ?? uz;
}
