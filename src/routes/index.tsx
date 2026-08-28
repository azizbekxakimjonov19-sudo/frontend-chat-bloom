import logoAsset from "@/assets/lumowin-logo.png.asset.json";
import bannerWheel from "@/assets/banner-wheel.jpg";
import bannerCards from "@/assets/banner-cards.jpg";
import bannerReferral from "@/assets/banner-referral.jpg";
import bannerAds from "@/assets/banner-ads.jpg";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home, Gamepad2, HandCoins, Trophy, User, Plus, ChevronLeft, ChevronRight,
  ArrowDownToLine, ArrowUpFromLine, Shield, HelpCircle,
  BadgeCheck, Wallet, ShieldAlert, Crown, Send, CreditCard, Gift, Play, Sparkles,
} from "lucide-react";

import {
  useGame, initFromTelegram, formatMoney, formatTime, drawWinner,
  isSaleOpen, saleEndsAt, requestDeposit, requestWithdraw,
  claimAdReward, loadAdStatus, playMiniGame,
  createInvestment, claimInvestment, loadInvestments,
  getBonusStatus, spinBonus, claimBonus, type BonusStatus,
  getConversionStatus, requestConversion, type ConversionStatus,
  type JackpotId,
} from "@/lib/game-store";

import { JackpotDetailScreen } from "@/components/JackpotScreens";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/")({
  component: LumoWinApp,
});

type Screen =
  | "home" | "games" | "bonus" | "ads" | "payment" | "payouts" | "profile"
  | "deposit" | "withdraw" | "convert" | "history" | "rules" | "faq" | "referral"
  | "wheel" | "cards"
  | "admin";



const faqs = [
  "Jackpot qanday ishlaydi?",
  "Chipta sotib olgandan so'ng pulim qaytadimi?",
  "G'olib qanday aniqlanadi?",
  "Pulni qaysi balansdan yechib olsam bo'ladi?",
  "Minimal yechish summasi qancha?",
  "Referal dasturi qanday ishlaydi?",
  "Agar muammo bo'lsa, kimga murojaat qilaman?",
];

function useNow(ms = 1000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

/* ---------- App ---------- */
function LumoWinApp() {
  const [screen, setScreen] = useState<Screen>("home");

  const authError = useGame((s) => s.authError);
  const ready = useGame((s) => s.ready);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#ffffff");
      tg.setBackgroundColor?.("#ffffff");
    }
    // Always attempt auth — inside Telegram uses initData, in dev browser uses fallback.
    initFromTelegram(tg);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const ping = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      if (alive) await (supabase as any).rpc("touch_last_seen");
    };
    ping().catch(() => {});
    const id = setInterval(() => { ping().catch(() => {}); }, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, [ready]);

  const isTab = (["home", "games", "bonus", "payment", "payouts", "profile"] as Screen[]).includes(screen);

  if (!ready) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background relative pb-24">
        {authError && (
          <div className="mx-4 mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Auth: {authError}
          </div>
        )}
        {screen === "home" && <HomeScreen go={setScreen} />}
        {screen === "games" && <GamesScreen go={setScreen} />}
        {screen === "wheel" && <WheelGameScreen back={() => setScreen("games")} />}
        {screen === "cards" && <CardsGameScreen back={() => setScreen("games")} />}
        {screen === "bonus" && <BonusScreen />}
        {screen === "ads" && <AdsScreen back={() => setScreen("games")} />}
        {screen === "payment" && <PaymentScreen go={setScreen} />}
        {screen === "payouts" && <PayoutsScreen />}
        {screen === "profile" && <ProfileScreen go={setScreen} />}
        {screen === "deposit" && <DepositScreen back={() => setScreen("payment")} />}
        {screen === "withdraw" && <WithdrawScreen back={() => setScreen("payment")} />}
        {screen === "convert" && <ConvertScreen back={() => setScreen("payment")} />}
        {screen === "history" && <HistoryScreen back={() => setScreen("profile")} />}
        {screen === "rules" && <RulesScreen back={() => setScreen("profile")} />}
        {screen === "faq" && <FaqScreen back={() => setScreen("profile")} />}
        {screen === "referral" && <ReferralScreen back={() => setScreen("games")} />}
        {screen === "admin" && <AdminPanel back={() => setScreen("profile")} />}

        {isTab && <BottomNav current={screen} go={setScreen} />}

      </div>
    </div>
  );
}

/* ---------- Shared ---------- */
function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between">
      <div className="w-9">
        {onBack && (
          <button onClick={onBack} className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full active:bg-muted">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="w-9 flex justify-end">{right}</div>
    </div>
  );
}

function BottomNav({ current, go }: { current: Screen; go: (s: Screen) => void }) {
  const bonusEnabled = useGame((s) => s.bonusEnabled);
  const all: { key: Screen; label: string; icon: any }[] = [
    { key: "home", label: "Bosh sahifa", icon: Home },
    { key: "games", label: "O'yinlar", icon: Gamepad2 },
    { key: "bonus", label: "Bonus", icon: Sparkles },
    { key: "payment", label: "To'lov", icon: CreditCard },
    { key: "payouts", label: "To'langan", icon: HandCoins },
    { key: "profile", label: "Profil", icon: User },
  ];
  const items = all.filter((i) => i.key !== "bonus" || bonusEnabled);

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border pb-safe">
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const active = current === it.key;
          const Icon = it.icon;
          return (
            <button key={it.key} onClick={() => go(it.key)} className="flex flex-col items-center justify-center gap-0.5 px-0.5">
              <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-tab-inactive"}`} />
              <span className={`text-[9px] font-medium leading-tight text-center truncate w-full ${active ? "text-primary" : "text-tab-inactive"}`}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- BONUS ---------- */
const QUEUE_DEADLINE = Date.parse("2026-08-24T18:59:00Z");

function formatLong(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return d > 0 ? `${d} kun ${h} soat ${m} daq` : `${h} soat ${m} daq ${s} son`;
}

function BonusScreen() {
  const bonusEnabled = useGame((s) => s.bonusEnabled);
  const me = useGame((s) => s.users[s.currentUserId]);
  const [st, setSt] = useState<BonusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rolling, setRolling] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const now = useNow(1000);

  const refresh = async () => {
    const s = await getBonusStatus();
    setSt(s);
    setLoading(false);
  };
  useEffect(() => { refresh().catch(() => setLoading(false)); }, []);

  // auto-expire on client tick
  useEffect(() => {
    if (st?.status === "pending" && st.expiresAt && st.expiresAt <= now) refresh().catch(() => {});
  }, [now, st?.status, st?.expiresAt]);

  // cooldown finished -> allow new spin
  useEffect(() => {
    if (st && st.status !== "pending" && st.status !== "none" && st.nextSpinAt && st.nextSpinAt <= now) refresh().catch(() => {});
  }, [now, st?.status, st?.nextSpinAt]);

  const runSpin = async () => {
    if (spinning || busy) return;
    setMsg(null);
    setSpinning(true);
    const started = Date.now();
    const iv = setInterval(() => {
      setRolling(26000 + Math.floor(Math.random() * (150000 - 26000)));
    }, 60);
    const res = await spinBonus();
    const elapsed = Date.now() - started;
    await new Promise((r) => setTimeout(r, Math.max(0, 3200 - elapsed)));
    clearInterval(iv);
    setSpinning(false);
    if (!res?.ok) { setMsg(res?.error || "Xatolik"); await refresh(); return; }
    setRolling(Number(res.amount));
    await refresh();
  };

  const doClaim = async () => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const res = await claimBonus();
    setBusy(false);
    if (!res?.ok) setMsg(res?.error || "Xatolik");
    else setMsg(`Tabriklaymiz! ${formatMoney(Number(res.amount))} so'm bonus o'yin balansingizga qo'shildi.`);
    await refresh();
  };

  if (!bonusEnabled) {
    return (
      <>
        <TopBar title="Bonus" />
        <div className="p-4">
          <div className="card-soft rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Bu bo'lim vaqtincha o'chirilgan.
          </div>
        </div>
      </>
    );
  }

  const balance = me?.balance ?? 0;
  const amount = st?.amount ?? 0;
  const need = Math.max(0, amount - balance);
  const msLeft = st?.status === "pending" ? Math.max(0, (st.expiresAt || 0) - now) : 0;
  const nextMs = Math.max(0, (st?.nextSpinAt || 0) - now);
  const display = spinning ? rolling : (st?.status === "pending" || st?.status === "claimed" ? amount : rolling);

  return (
    <>
      <TopBar title="Bonus" />
      <div className="p-4 space-y-3">
        <div className="jackpot-card rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -left-10 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
          <div className="text-[11px] tracking-widest opacity-90">SIZNING BONUSINGIZ</div>
          <div
            className={`mt-2 text-4xl font-extrabold tabular-nums transition-transform ${spinning ? "animate-pulse scale-105" : "scale-100"}`}
          >
            {display > 0 ? formatMoney(display) : "0"} <span className="text-lg opacity-90">so'm</span>
          </div>
          <div className="text-[11px] opacity-90 mt-1">
            {spinning ? "Hisoblanmoqda…" : "26 000 – 150 000 so'm oralig'ida"}
          </div>
          {spinning && (
            <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-1/3 bg-white/70 animate-[slide_1s_linear_infinite]" style={{ animation: "bonusSlide 1.1s linear infinite" }} />
            </div>
          )}
        </div>

        {loading ? (
          <div className="card-soft rounded-2xl p-5 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>
        ) : st?.status === "none" ? (
          <>
            <div className="card-soft rounded-2xl p-4 text-[12px] text-muted-foreground leading-relaxed">
              <div className="text-sm font-semibold text-foreground mb-1">Qanday ishlaydi?</div>
              • Tugmani bosing — tizim sizga <b className="text-foreground">26 000 – 150 000 so'm</b> oralig'ida tasodifiy bonus hisoblaydi.<br />
              • Bonusni olish uchun o'yin balansingizda <b className="text-foreground">shu summaning o'zi</b> bo'lishi kerak.<br />
              • Bonus hisoblangandan so'ng <b className="text-foreground">5 soat</b> vaqt beriladi. Shu vaqt ichida olmasangiz, bonus yo'qoladi.<br />
              • Bonusni <b className="text-foreground">har 48 soatda 1 marta</b> hisoblash mumkin.
            </div>
            <button
              onClick={runSpin}
              disabled={spinning}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 shadow-button disabled:opacity-60"
            >
              <Sparkles className="w-5 h-5" />
              {spinning ? "Hisoblanmoqda…" : "Bonusimni hisoblash"}
            </button>
          </>
        ) : st?.status === "pending" ? (
          <>
            <div className="card-soft rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Bonus summasi</span>
                <b className="tabular-nums">{formatMoney(amount)} so'm</b>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">O'yin balansingiz</span>
                <b className="tabular-nums">{formatMoney(balance)} so'm</b>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Qolgan vaqt</span>
                <b className="tabular-nums text-primary">{formatTime(msLeft)}</b>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, amount > 0 ? (balance / amount) * 100 : 0)}%` }} />
              </div>
            </div>
            {need > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-[12px] leading-relaxed">
                Bonusni olish uchun o'yin balansingizda <b>{formatMoney(amount)} so'm</b> bo'lishi kerak.
                Hozir balansingizda <b>{formatMoney(balance)} so'm</b> bor — yana <b className="text-primary">{formatMoney(need)} so'm</b> to'ldirsangiz,
                bonus darhol hisobingizga qo'shiladi.
              </div>
            )}
            <button
              onClick={doClaim}
              disabled={busy || need > 0}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 shadow-button disabled:opacity-50"
            >
              <Gift className="w-5 h-5" />
              {need > 0 ? `Yana ${formatMoney(need)} so'm kerak` : "Bonusni olish"}
            </button>
          </>
        ) : st?.status === "claimed" ? (
          <div className="card-soft rounded-2xl p-6 text-center">
            <BadgeCheck className="w-10 h-10 text-success mx-auto" />
            <div className="mt-2 font-semibold">Bonus olingan</div>
            <div className="text-[12px] text-muted-foreground mt-1">
              {formatMoney(amount)} so'm o'yin balansingizga qo'shilgan.
            </div>
            <div className="mt-3 text-[12px]">
              Keyingi bonusgacha: <b className="tabular-nums text-primary">{formatLong(nextMs)}</b>
            </div>
          </div>
        ) : (
          <div className="card-soft rounded-2xl p-6 text-center">
            <ShieldAlert className="w-10 h-10 text-primary mx-auto" />
            <div className="mt-2 font-semibold">Bonus muddati tugagan</div>
            <div className="text-[12px] text-muted-foreground mt-1">
              {formatMoney(amount)} so'mlik bonusingiz 5 soat ichida olinmagani uchun bekor qilindi.
            </div>
            <div className="mt-3 text-[12px]">
              Keyingi bonusgacha: <b className="tabular-nums text-primary">{formatLong(nextMs)}</b>
            </div>
          </div>
        )}

        {msg && (
          <div className="rounded-xl border border-border bg-muted px-3 py-2 text-[12px] text-center">{msg}</div>
        )}
      </div>
    </>
  );
}

/* ---------- ADS (reklama ko'rib pul ishlash) ---------- */
function AdsScreen({ back }: { back: () => void }) {
  const status = useGame((s) => s.adStatus);
  const earnEnabled = useGame((s) => s.earnEnabled);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => { loadAdStatus().catch(() => {}); }, []);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const count = status?.count ?? 0;
  const limit = status?.limit ?? 2;
  const reward = status?.amount ?? 250;
  const done = count >= limit;
  const msLeft = status?.nextResetAt ? Math.max(0, status.nextResetAt - Date.now()) : 0;

  const waitForSdk = async (timeout = 6000): Promise<((...a: any[]) => Promise<void>) | null> => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const fn = (window as any).show_11642131;
      if (typeof fn === "function") return fn;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  };

  const watch = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      const showFn = await waitForSdk();
      if (!showFn) {
        alert("Reklama tarmog'i javob bermayapti. Internetni tekshirib qayta urinib ko'ring.");
        setBusy(false);
        return;
      }
      await showFn();
      const res = await claimAdReward();
      if (!res?.ok) alert(res?.error || "Xatolik");
    } catch (e: any) {
      console.warn("Ad error", e);
      alert("Reklama to'liq ko'rilmadi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  };

  if (!earnEnabled) {
    return (
      <>
        <TopBar title="Reklama ko'rib pul ishlash" onBack={back} />
        <div className="p-4">
          <div className="card-soft rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Bu bo'lim vaqtincha o'chirilgan.
          </div>
        </div>
      </>
    );
  }

  const totalReward = reward * limit;

  return (
    <>
      <TopBar title="Reklama ko'rib pul ishlash" onBack={back} />
      <div className="p-4 space-y-3">
        <>

        <div className="jackpot-card rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="text-[11px] tracking-widest opacity-90">REKLAMA KO'RISH</div>
          <div className="text-3xl font-extrabold mt-1">+{formatMoney(totalReward)} <span className="text-base opacity-90">so'm / 24 soat</span></div>
          <div className="text-[11px] opacity-90 mt-1">Har 24 soatda {limit} ta reklama · har biri +{formatMoney(reward)} so'm</div>
        </div>

        <div className="card-soft rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted-foreground">PROGRESS (24 SOAT)</div>
            <div className="text-sm font-bold tabular-nums">{count}/{limit}</div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${(count / limit) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Topilgan: <b className="text-success">{formatMoney(count * reward)} so'm</b></span>
            <span>Qoldi: {limit - count}</span>
          </div>
        </div>

        {!done ? (
          <button
            onClick={watch}
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 shadow-button disabled:opacity-60"
          >
            <Play className="w-5 h-5" />
            {busy ? "Reklama yuklanmoqda…" : `Reklamani ko'rish (+${formatMoney(reward)} so'm)`}
          </button>
        ) : (
          <div className="card-soft rounded-2xl p-4 text-center">
            <Gift className="w-8 h-8 text-success mx-auto" />
            <div className="font-semibold text-sm mt-2">Bugungi limit tugadi 🎉</div>
            <div className="text-[12px] text-muted-foreground mt-1">
              Keyingi reklamalar ochiladi:
            </div>
            <div className="mt-2 text-2xl font-extrabold tabular-nums text-primary">
              {formatTime(msLeft)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Oxirgi reklamadan 24 soat o'tgach ochiladi
            </div>
          </div>
        )}

        <div className="card-soft rounded-2xl p-3 text-[11px] text-muted-foreground leading-relaxed">
          • Har 24 soatda <b>{limit} ta</b> reklama ko'rish mumkin<br />
          • Har biri uchun <b>{formatMoney(reward)} so'm</b> o'yin balansiga tushadi (jami <b>{formatMoney(totalReward)} so'm</b>)<br />
          • Limit oxirgi reklamadan <b>24 soat</b> o'tgach yangilanadi
        </div>
        </>
      </div>
    </>
  );
}

/* ---------- INVEST (omonat) ---------- */
const INVEST_TIERS = [
  { days: 1, percent: 7 },
  { days: 2, percent: 9 },
  { days: 3, percent: 12 },
  { days: 4, percent: 15 },
];
function InvestPanel() {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const investments = useGame((s) => s.investments);
  const [days, setDays] = useState(1);
  const [amount, setAmount] = useState(30000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { loadInvestments().catch(() => {}); }, []);
  useEffect(() => { const id = setInterval(() => loadInvestments().catch(() => {}), 15000); return () => clearInterval(id); }, []);
  const now = useNow(1000);
  const tier = INVEST_TIERS.find((t) => t.days === days)!;
  const payout = amount + Math.floor(amount * tier.percent / 100);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const r = await createInvestment(amount, days);
    setMsg({ ok: !!r.ok, text: r.ok ? `Omonat yaratildi (${days} kun, ${tier.percent}%)` : (r.error || "Xatolik") });
    setBusy(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const claim = async (id: string) => {
    setBusy(true);
    // 1 ad view before claim (best-effort)
    try {
      const fn = (window as any).show_11642131;
      if (typeof fn === "function") await fn().catch(() => {});
    } catch {}
    const r = await claimInvestment(id);
    setMsg({ ok: !!r.ok, text: r.ok ? `+${formatMoney(r.payout ?? 0)} so'm yechish balansiga qo'shildi` : (r.error || "Xatolik") });
    setBusy(false);
    setTimeout(() => setMsg(null), 3500);
  };

  return (
    <div className="space-y-3">
      <div className="jackpot-card rounded-2xl p-4 text-center relative overflow-hidden">
        <div className="text-[11px] tracking-widest opacity-90">PUL KO'PAYTIRISH</div>
        <div className="text-2xl font-extrabold mt-1">7% – 15% <span className="text-sm opacity-90">foyda</span></div>
        <div className="text-[11px] opacity-90 mt-1">1–4 kunga omonat qo'ying, muddat tugagach foyda bilan yechib oling</div>
      </div>

      <div className="card-soft rounded-2xl p-4 space-y-3">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">MUDDAT</div>
          <div className="grid grid-cols-4 gap-2">
            {INVEST_TIERS.map((t) => (
              <button key={t.days} onClick={() => setDays(t.days)}
                className={`h-14 rounded-xl border text-center ${days === t.days ? "border-primary bg-primary-soft" : "border-border"}`}>
                <div className="text-sm font-bold">{t.days} kun</div>
                <div className={`text-[11px] ${days === t.days ? "text-primary font-semibold" : "text-muted-foreground"}`}>+{t.percent}%</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-muted-foreground">MIQDOR (so'm)</span>
            <span className="text-muted-foreground">Balans: <b>{formatMoney(me.balance)}</b></span>
          </div>
          <input type="number" min={30000} max={400000} step={1000}
            value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full h-11 rounded-xl border border-border px-3 text-sm bg-background" />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[30000, 100000, 200000, 400000].map((v) => (
              <button key={v} onClick={() => setAmount(v)}
                className="h-8 rounded-lg text-[11px] font-semibold bg-muted text-foreground">{formatMoney(v)}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-primary-soft p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Siz qo'yasiz:</span>
            <b>{formatMoney(amount)} so'm</b>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-muted-foreground">Foyda ({tier.percent}%):</span>
            <b className="text-success">+{formatMoney(payout - amount)} so'm</b>
          </div>
          <div className="flex justify-between mt-1 pt-2 border-t border-border">
            <span className="text-muted-foreground">{days} kun keyin olasiz:</span>
            <b className="text-primary">{formatMoney(payout)} so'm</b>
          </div>
        </div>

        <button onClick={submit} disabled={busy || amount < 30000 || amount > 400000 || amount > me.balance}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
          {busy ? "Yaratilmoqda…" : "Omonatga qo'yish"}
        </button>
        {msg && <div className={`text-center text-xs font-medium ${msg.ok ? "text-success" : "text-primary"}`}>{msg.text}</div>}

        <div className="text-[11px] text-muted-foreground leading-relaxed pt-1">
          • Minimal <b>30 000</b>, maksimal <b>400 000</b> so'm<br />
          • Muddat: 1 kun +7%, 2 kun +9%, 3 kun +12%, 4 kun +15%<br />
          • Pul faqat <b>o'yin balansidan</b> yechiladi<br />
          • Muddat tugagach 1 ta reklama ko'rasiz va foyda bilan <b>yechish balansiga</b> tushadi
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">MENING OMONATLARIM</div>
        {investments.length === 0 ? (
          <div className="card-soft rounded-2xl p-4 text-center text-xs text-muted-foreground">Hozircha omonatlar yo'q</div>
        ) : (
          <div className="space-y-2">
            {investments.map((inv) => {
              const left = Math.max(0, inv.endsAt - now);
              const ready = left <= 0 && inv.status === "active";
              return (
                <div key={inv.id} className="card-soft rounded-2xl p-3">
                  <div className="flex justify-between text-sm">
                    <div><b>{formatMoney(inv.amount)}</b> → <b className="text-primary">{formatMoney(inv.payout)}</b> so'm</div>
                    <div className="text-xs text-muted-foreground">{inv.days} kun · {inv.percent}%</div>
                  </div>
                  {inv.status === "claimed" ? (
                    <div className="mt-2 text-[11px] text-success">✅ Yechildi</div>
                  ) : ready ? (
                    <button onClick={() => claim(inv.id)} disabled={busy}
                      className="mt-2 w-full h-10 rounded-lg bg-success text-primary-foreground text-sm font-semibold disabled:opacity-50">
                      Reklama ko'rib olish (+{formatMoney(inv.payout)} so'm)
                    </button>
                  ) : (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Qolgan vaqt: <b className="tabular-nums text-foreground">{formatTime(left)}</b>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, size = 40, photo }: { name: string; size?: number; photo?: string }) {
  if (photo) {
    return <img src={photo} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="rounded-full bg-primary-soft text-primary font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
}

function BrandHeader({ onDeposit }: { onDeposit: () => void }) {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoAsset.url} alt="LumoWin" className="w-10 h-10 rounded-xl object-contain" />
          <span className="font-extrabold tracking-tight text-lg">LumoWin</span>
        </div>
        <button
          onClick={onDeposit}
          className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-button"
        >
          <Plus className="w-4 h-4" /> To'ldirish
        </button>
      </div>

      {/* Compact dual balance */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="card-soft rounded-2xl p-3">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <div className="text-[10px] text-muted-foreground tracking-wider">O'YIN BALANSI</div>
          </div>
          <div className="text-lg font-extrabold mt-0.5 truncate">{formatMoney(me.balance)}</div>
          <div className="text-[10px] text-muted-foreground">so'm · chipta olish</div>
        </div>
        <div className="card-soft rounded-2xl p-3 border-2 border-success/25">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-success" />
            <div className="text-[10px] text-muted-foreground tracking-wider">YECHISH BALANSI</div>
          </div>
          <div className="text-lg font-extrabold mt-0.5 text-success truncate">{formatMoney(me.withdrawBalance)}</div>
          <div className="text-[10px] text-muted-foreground">so'm · yechib olish</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- HOME ---------- */
function HomeScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <>
      <BrandHeader onDeposit={() => go("deposit")} />

      <div className="mx-4 mt-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold">Mashhur o'yinlar</h2>
        <button onClick={() => go("games")} className="text-[11px] font-semibold text-primary">Barchasi ›</button>
      </div>
      <div className="mx-4 mt-2 grid grid-cols-2 gap-3">

        {[
          { key: "wheel" as Screen, img: bannerWheel, title: "Omad g'ildiragi", tag: "10–50%" },
          { key: "cards" as Screen, img: bannerCards, title: "Karta ochish", tag: "15–50%" },
        ].map((g) => (
          <button key={g.key} onClick={() => go(g.key)} className="card-soft rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform">
            <img src={g.img} alt={g.title} loading="lazy" width={1152} height={576} className="w-full h-24 object-cover" />
            <div className="p-2.5">
              <div className="text-xs font-bold truncate">{g.title}</div>
              <div className="text-[10px] font-semibold text-primary mt-0.5">{g.tag}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => go("referral")}
        className="mx-4 mt-3 w-[calc(100%-2rem)] card-soft rounded-2xl overflow-hidden flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <img src={bannerReferral} alt="Referal" loading="lazy" width={1152} height={576} className="w-24 h-20 object-cover" />
        <div className="flex-1 min-w-0 py-2 pr-3">
          <div className="text-sm font-bold">Do'st taklif qiling</div>
          <div className="text-[11px] text-muted-foreground">Har bir tasdiqlangan do'st uchun <b className="text-success">+450 so'm</b></div>
        </div>
      </button>

      <button
        onClick={() => go("ads")}
        className="mx-4 mt-3 w-[calc(100%-2rem)] card-soft rounded-2xl overflow-hidden flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <img src={bannerAds} alt="Reklama" loading="lazy" width={1152} height={576} className="w-24 h-20 object-cover" />
        <div className="flex-1 min-w-0 py-2 pr-3">
          <div className="text-sm font-bold">Reklama ko'rib pul ishlash</div>
          <div className="text-[11px] text-muted-foreground">Har 24 soatda 3 ta reklama · <b className="text-success">750 so'm</b></div>
        </div>

      </button>

      <div className="h-6" />

    </>
  );
}

function JackpotHomeCard({
  variant, title, j, now, onOpen,
}: {
  variant: "weekly" | "3day";
  title: string;
  j: any;
  now: number;
  onOpen: () => void;
}) {
  const isWeekly = variant === "weekly";
  const saleEnd = j.openedAt + j.saleHours * 60000;
  const saleOpen = j.loaded && !j.frozen && now < saleEnd;
  const saleLeft = Math.max(0, saleEnd - now);
  const gameLeft = Math.max(0, j.endsAt - now);

  return (
    <div className={`mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden ${isWeekly ? "jackpot-card" : "card-soft"}`}>
      {isWeekly && (
        <>
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute right-5 top-4 text-2xl">🏆</div>
        </>
      )}
      <div className={`text-[11px] font-semibold tracking-widest ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>{title}</div>
      <div className={`text-3xl font-extrabold mt-1 ${isWeekly ? "" : "text-primary"}`}>
        {formatMoney(j.prize)} <span className="text-base font-semibold opacity-90">so'm</span>
      </div>
      {j.isFree && (
        <div className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${isWeekly ? "bg-white/20" : "bg-success-soft text-success"}`}>
          BEPUL · 1 kishi 1 marta
        </div>
      )}
      {j.winnerSlots > 1 && (
        <div className={`mt-0.5 text-[11px] ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>
          {j.winnerSlots} ta g'olibga · jami {formatMoney(j.prize * j.winnerSlots)} so'm
        </div>
      )}

      {j.frozen && (j.winners?.length > 0 || j.lastWinner) ? (
        <>
          <div className={`mt-3 flex items-center justify-between text-[11px] ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>
            <span>G'oliblar: <b>{j.winners?.length || 1}</b></span>
            <span>Chipta: <b>{j.isFree ? "Bepul" : formatMoney(j.ticketPrice)}</b></span>
            {!j.isFree && <span>Qaytarish: <b>{j.refundPercent}%</b></span>}
          </div>
          <InlineWinners j={j} isWeekly={isWeekly} onOpen={onOpen} />
          {!j.isFree && (
            <div className={`mt-2 text-center text-[11px] ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>
              Qolganlar chipta narxining <b>{j.refundPercent}%</b> Yechish balansiga qaytarib oldi. 🎉 Barchaga omad!
            </div>
          )}
        </>
      ) : (
        <>
          {/* Two separate timers */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className={`rounded-xl p-2 ${isWeekly ? "bg-white/15" : "bg-primary-soft"}`}>
              <div className={`text-[10px] ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>Chipta olish vaqti</div>
              <div className={`text-sm font-bold tabular-nums ${isWeekly ? "" : "text-primary"}`}>
                {!j.loaded ? "…" : saleOpen ? formatTime(saleLeft) : "Yopiq"}
              </div>
            </div>
            <div className={`rounded-xl p-2 ${isWeekly ? "bg-white/15" : "bg-primary-soft"}`}>
              <div className={`text-[10px] ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>O'yin vaqti</div>
              <div className={`text-sm font-bold tabular-nums ${isWeekly ? "" : "text-primary"}`}>
                {!j.loaded ? "…" : formatTime(gameLeft)}
              </div>
            </div>
          </div>

          <div className={`mt-3 flex items-center justify-between text-[11px] ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>
            <span>Ishtirokchilar: <b>{j.participants.length}</b></span>
            <span>Chipta: <b>{j.isFree ? "Bepul" : formatMoney(j.ticketPrice)}</b></span>
            {!j.isFree && <span>Qaytarish: <b>{j.refundPercent}%</b></span>}
          </div>

          {j.drawing ? (
            <InlineDrawing j={j} isWeekly={isWeekly} />
          ) : (
            <button
              onClick={onOpen}
              disabled={!saleOpen}
              className={`mt-3 w-full h-11 rounded-xl font-semibold active:scale-[0.98] transition-transform disabled:opacity-60 ${
                isWeekly ? "bg-white text-primary" : "bg-primary text-primary-foreground shadow-button"
              }`}
            >
              {saleOpen ? "Ishtirok etish" : (j.loaded ? "Sotuv yopiq" : "Yuklanmoqda…")}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function InlineDrawing({ j, isWeekly }: { j: any; isWeekly: boolean }) {
  const parts = j.participants as any[];
  return (
    <div className={`mt-3 rounded-xl p-3 ${isWeekly ? "bg-white/15" : "bg-primary-soft"}`}>
      <div className={`text-[10px] tracking-widest text-center mb-2 ${isWeekly ? "opacity-90" : "text-primary"}`}>
        🎲 QURA TASHLANMOQDA…
      </div>
      {parts.length > 0 ? (
        <div className="relative overflow-hidden h-14 rounded-lg">
          <div
            className="flex items-center gap-3 absolute top-1/2 -translate-y-1/2 whitespace-nowrap"
            style={{ animation: "nestSpinStrip 6s linear infinite", left: 0 }}
          >
            {[...parts, ...parts, ...parts].map((p, i) => (
              <div key={p.ticketId + i} className="flex flex-col items-center min-w-[40px]">
                <Avatar name={p.firstName} size={28} photo={p.photo} />
              </div>
            ))}
          </div>
          <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 border-2 rounded-lg pointer-events-none ${isWeekly ? "border-white" : "border-primary"}`} />
        </div>
      ) : (
        <div className={`text-center text-xs ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>Ishtirokchi yo'q</div>
      )}
      <style>{`@keyframes nestSpinStrip { from { transform: translate3d(0,-50%,0); } to { transform: translate3d(-33.333%,-50%,0); } }`}</style>
    </div>
  );
}

function InlineWinners({ j, isWeekly, onOpen }: { j: any; isWeekly: boolean; onOpen: () => void }) {
  const list: any[] = (j.winners?.length ? j.winners : j.lastWinner ? [j.lastWinner] : []);
  if (list.length === 0) return null;
  const multi = list.length > 1;
  return (
    <button
      onClick={onOpen}
      className={`mt-3 w-full rounded-xl p-2.5 text-left active:scale-[0.99] transition-transform ${isWeekly ? "bg-white/15" : "bg-success-soft"}`}
    >
      <div className={`text-[9px] tracking-widest mb-1.5 ${isWeekly ? "opacity-90" : "text-muted-foreground"}`}>
        🏆 {multi ? `${list.length} TA G'OLIB` : "G'OLIB"} · har biri {formatMoney(list[0].amount)} so'm
      </div>
      <div className={multi ? "grid grid-cols-2 gap-x-2 gap-y-1.5" : ""}>
        {list.map((w) => (
          <div key={w.userId} className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <Avatar name={w.firstName} size={multi ? 28 : 40} photo={w.photo} />
              <Crown className={`absolute -top-1.5 left-1/2 -translate-x-1/2 ${multi ? "w-3 h-3" : "w-4 h-4"} text-gold drop-shadow`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-bold ${multi ? "text-[11px]" : "text-sm"} truncate ${isWeekly ? "" : "text-foreground"}`}>{w.firstName}</div>
              <div className={`${multi ? "text-[10px]" : "text-xs"} font-extrabold ${isWeekly ? "opacity-90" : "text-success"}`}>
                +{formatMoney(w.amount)} so'm
              </div>
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}

/* ---------- PAYOUTS (To'langan) ---------- */
function PayoutsScreen() {
  const recentWithdrawals = useGame((s) => s.recentWithdrawals);
  const totalWithdrawn = useGame((s) => s.totalWithdrawn);

  return (
    <>
      <TopBar title="To'langan" />
      <div className="p-4">
        <div className="rounded-2xl p-4 jackpot-card">
          <div className="text-[11px] tracking-widest opacity-90">JAMI TO'LANGAN</div>
          <div className="text-3xl font-extrabold mt-1">
            {formatMoney(totalWithdrawn)} <span className="text-base font-semibold opacity-90">so'm</span>
          </div>
          <div className="text-[11px] opacity-90 mt-1">Foydalanuvchilarga muvaffaqiyatli yechib berilgan mablag'</div>
        </div>

        <div className="font-semibold text-sm mt-4 mb-2">Oxirgi pul yechib olganlar</div>
        <div className="card-soft rounded-2xl divide-y divide-border">
          {recentWithdrawals.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">Hozircha yechib olishlar yo'q</div>
          )}
          {recentWithdrawals.map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-3">
              <Avatar name={w.firstName} size={36} photo={w.photo} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{w.firstName}</div>
                <div className="text-[11px] text-muted-foreground truncate">ID {w.telegramId}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm text-success">+{formatMoney(w.amount)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(w.resolvedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- GAMES ---------- */
const WHEEL_PRICE = 30000;
const CARDS_PRICE = 20000;
const WHEEL_SEGMENTS = [10, 12, 15, 18, 20, 25, 28, 30, 35, 40, 45, 50];
const CARD_VALUES = [15, 18, 20, 25, 30, 35, 40, 45, 50];
const WHEEL_COLORS = [
  "#0e7490", "#f59e0b", "#0f766e", "#e11d48", "#0891b2", "#7c3aed",
  "#155e75", "#d97706", "#14b8a6", "#be123c", "#06b6d4", "#6d28d9",
];

function GamesScreen({ go }: { go: (s: Screen) => void }) {
  const games = [
    { key: "wheel" as Screen, img: bannerWheel, title: "Omad g'ildiragi", sub: "10% dan 50% gacha yutuq", price: `${formatMoney(WHEEL_PRICE)} so'm` },
    { key: "cards" as Screen, img: bannerCards, title: "Karta ochish", sub: "9 ta kartadan 1 tasini oching · 15–50%", price: `${formatMoney(CARDS_PRICE)} so'm` },
    { key: "referral" as Screen, img: bannerReferral, title: "Referal orqali ishlash", sub: "Har bir do'st uchun 450 so'm", price: "Bepul" },
    { key: "earn" as Screen, img: bannerAds, title: "Reklama ko'rib pul ishlash", sub: "Har 24 soatda 2 ta reklama · 250 so'm", price: "Bepul" },
  ];
  return (
    <>
      <TopBar title="O'yinlar" />
      <div className="p-4 space-y-3">
        {games.map((g) => (
          <button
            key={g.key}
            onClick={() => go(g.key)}
            className="w-full card-soft rounded-2xl overflow-hidden text-left active:scale-[0.99] transition-transform"
          >
            <img src={g.img} alt={g.title} loading="lazy" width={1152} height={576} className="w-full h-32 object-cover" />
            <div className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{g.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">{g.sub}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">Narxi</div>
                <div className="text-xs font-extrabold text-primary">{g.price}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function WinModal({ percent, amount, onClose }: { percent: number; amount: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-xs rounded-3xl bg-card p-6 text-center shadow-jackpot">
        <div className="text-5xl">🎉</div>
        <div className="mt-2 text-4xl font-extrabold text-primary">{percent}%</div>
        <div className="mt-2 text-sm font-semibold">Sizga {percent}% tushdi!</div>
        <div className="mt-1 text-lg font-extrabold text-success">+{formatMoney(amount)} so'm</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Tikilgan pul va yutuq foizi bilan yechish balansingizga o'tkazildi
        </div>
        <button onClick={onClose} className="mt-5 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-button">
          Yopish
        </button>
      </div>
    </div>
  );
}

function WheelFace() {
  const n = WHEEL_SEGMENTS.length;
  const seg = 360 / n;
  const R = 100;
  const polar = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [110 + r * Math.cos(a), 110 + r * Math.sin(a)];
  };
  return (
    <svg viewBox="0 0 220 220" className="w-full h-full">
      <defs>
        <radialGradient id="hubG" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="glossG" cx="35%" cy="25%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </radialGradient>
      </defs>
      {WHEEL_SEGMENTS.map((v, i) => {
        const a0 = i * seg;
        const a1 = (i + 1) * seg;
        const [x0, y0] = polar(a0, R);
        const [x1, y1] = polar(a1, R);
        const [tx, ty] = polar(a0 + seg / 2, R - 26);
        return (
          <g key={i}>
            <path d={`M110 110 L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`} fill={WHEEL_COLORS[i]} stroke="rgba(255,255,255,.35)" strokeWidth="1" />
            <text
              x={tx}
              y={ty}
              fill="#fff"
              fontSize="15"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${a0 + seg / 2} ${tx} ${ty})`}
              style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.35)", strokeWidth: 2 }}
            >
              {v}%
            </text>
            <circle {...(() => { const [dx, dy] = polar(a0, R - 6); return { cx: dx, cy: dy }; })()} r="2.6" fill="#fde68a" opacity="0.9" />
          </g>
        );
      })}
      <circle cx="110" cy="110" r={R} fill="url(#glossG)" />
      <circle cx="110" cy="110" r="30" fill="url(#hubG)" stroke="#fef3c7" strokeWidth="2" />
      <circle cx="102" cy="102" r="9" fill="rgba(255,255,255,.55)" />
    </svg>
  );
}

function WheelGameScreen({ back }: { back: () => void }) {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [win, setWin] = useState<{ percent: number; amount: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const seg = 360 / WHEEL_SEGMENTS.length;

  const spin = async () => {
    if (spinning) return;
    setErr(null);
    if (me.balance < WHEEL_PRICE) { setErr("O'yin balansingiz yetarli emas"); return; }
    setSpinning(true);
    const res = await playMiniGame("wheel");
    if (!res.ok) {
      setSpinning(false);
      setErr(res.error === "insufficient" ? "O'yin balansingiz yetarli emas" : res.error === "banned" ? "Hisobingiz bloklangan" : "Xatolik yuz berdi");
      return;
    }
    const idx = Math.max(0, WHEEL_SEGMENTS.indexOf(res.percent ?? WHEEL_SEGMENTS[0]));
    const target = 360 * 6 - (idx * seg + seg / 2);
    setAngle((a) => a + (target - (a % 360)) + 360 * 6);
    timer.current = setTimeout(() => {
      setSpinning(false);
      setWin({ percent: res.percent ?? 0, amount: res.amount ?? 0 });
    }, 5200);
  };

  return (
    <>
      <TopBar title="Omad g'ildiragi" onBack={back} />
      <div className="p-4 space-y-4">
        <div className="relative mx-auto w-[290px] h-[310px] flex items-start justify-center">
          <div
            className="absolute top-0 z-20"
            style={{
              width: 0, height: 0,
              borderLeft: "13px solid transparent",
              borderRight: "13px solid transparent",
              borderTop: "26px solid #fbbf24",
              filter: "drop-shadow(0 3px 3px rgba(0,0,0,.45))",
            }}
          />
          <div
            className="absolute top-5 w-[286px] h-[286px] rounded-full"
            style={{
              background: "conic-gradient(from 0deg,#fde68a,#b45309,#fbbf24,#92400e,#fde68a)",
              boxShadow: "0 22px 34px -14px rgba(0,0,0,.6), inset 0 -6px 14px rgba(0,0,0,.3)",
            }}
          />
          <div
            className="absolute top-[36px] w-[254px] h-[254px] rounded-full overflow-hidden"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: spinning ? "transform 5s cubic-bezier(0.12, 0.85, 0.1, 1)" : "none",
              filter: "drop-shadow(0 0 12px rgba(0,0,0,.35))",
            }}
          >
            <WheelFace />
          </div>
        </div>

        {err && <div className="rounded-xl bg-destructive/10 border border-destructive/40 px-3 py-2 text-xs text-destructive text-center">{err}</div>}

        <button
          onClick={spin}
          disabled={spinning}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold shadow-button disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {spinning ? "Aylanmoqda…" : `Aylantirish · ${formatMoney(WHEEL_PRICE)} so'm`}
        </button>

        <div className="card-soft rounded-2xl p-3 text-[11px] text-muted-foreground space-y-1">
          <div>• Har bir aylantirish <b className="text-foreground">{formatMoney(WHEEL_PRICE)} so'm</b> — o'yin balansidan yechiladi.</div>
          <div>• Foiz <b className="text-foreground">10% – 50%</b> oralig'ida bo'ladi.</div>
          <div>• <b className="text-success">Tikilgan pul + foiz</b> yechish balansiga o'tadi (misol: 30 000 → 10% = 33 000).</div>
        </div>
      </div>
      {win && <WinModal percent={win.percent} amount={win.amount} onClose={() => setWin(null)} />}
    </>
  );
}

function CardsGameScreen({ back }: { back: () => void }) {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const [revealed, setRevealed] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [win, setWin] = useState<{ percent: number; amount: number } | null>(null);

  const reset = () => { setRevealed({}); setPicked(null); setWin(null); setErr(null); };

  const pick = async (i: number) => {
    if (busy || picked !== null) return;
    setErr(null);
    if (me.balance < CARDS_PRICE) { setErr("O'yin balansingiz yetarli emas"); return; }
    setBusy(true);
    setPicked(i);
    const res = await playMiniGame("cards");
    if (!res.ok) {
      setBusy(false); setPicked(null);
      setErr(res.error === "insufficient" ? "O'yin balansingiz yetarli emas" : res.error === "banned" ? "Hisobingiz bloklangan" : "Xatolik yuz berdi");
      return;
    }
    const pct = res.percent ?? CARD_VALUES[0];
    const rest = CARD_VALUES.filter((v) => v !== pct).sort(() => Math.random() - 0.5);
    const map: Record<number, number> = {};
    let k = 0;
    for (let j = 0; j < 9; j++) map[j] = j === i ? pct : (rest[k++] ?? CARD_VALUES[0]);
    setTimeout(() => {
      setRevealed(map);
      setBusy(false);
      setTimeout(() => setWin({ percent: pct, amount: res.amount ?? 0 }), 900);
    }, 500);
  };

  return (
    <>
      <TopBar title="Karta ochish" onBack={back} />
      <div className="p-4 space-y-3">
        <div className="text-center text-sm font-semibold">
          {picked === null ? "9 ta kartadan bittasini tanlang" : "Kartangiz ochildi!"}
        </div>

        <div className="grid grid-cols-3 gap-2 mx-auto w-[250px]">
          {Array.from({ length: 9 }).map((_, i) => {
            const isOpen = revealed[i] !== undefined;
            const isPicked = picked === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className="relative aspect-[3/4] rounded-xl"
                style={{ perspective: "600px" }}
              >
                <div
                  className="absolute inset-0 rounded-xl transition-transform duration-500"
                  style={{ transformStyle: "preserve-3d", transform: isPicked || isOpen ? "rotateY(180deg)" : "none" }}
                >
                  <div
                    className="absolute inset-0 rounded-xl flex items-center justify-center text-lg"
                    style={{
                      backfaceVisibility: "hidden",
                      background: "linear-gradient(145deg, var(--primary), var(--primary-dark))",
                      boxShadow: "0 6px 14px -8px rgba(0,0,0,.55)",
                      border: "2px solid #fbbf24",
                    }}
                  >
                    🂠
                  </div>
                  <div
                    className={`absolute inset-0 rounded-xl flex items-center justify-center ${isPicked ? "ring-[3px] ring-[#fbbf24]" : ""}`}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      background: isPicked ? "linear-gradient(145deg,#fbbf24,#d97706)" : "var(--muted)",
                      color: isPicked ? "#3b2405" : "var(--muted-foreground)",
                      boxShadow: "0 6px 14px -8px rgba(0,0,0,.5)",
                    }}
                  >
                    <span className="text-base font-extrabold">{revealed[i] ?? "…"}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {err && <div className="rounded-xl bg-destructive/10 border border-destructive/40 px-3 py-2 text-xs text-destructive text-center">{err}</div>}

        {picked !== null && !busy ? (
          <button onClick={reset} className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-extrabold shadow-button active:scale-[0.98] transition-transform text-sm">
            Yana o'ynash · {formatMoney(CARDS_PRICE)} so'm
          </button>
        ) : (
          <div className="w-full h-11 rounded-2xl bg-muted text-muted-foreground font-semibold flex items-center justify-center text-xs">
            1 ta o'yin narxi · {formatMoney(CARDS_PRICE)} so'm
          </div>
        )}

        <div className="card-soft rounded-2xl p-3 text-[11px] text-muted-foreground space-y-1">
          <div>• Faqat <b className="text-foreground">1 ta</b> karta tanlanadi.</div>
          <div>• Foiz <b className="text-foreground">15% – 50%</b> oralig'ida.</div>
          <div>• <b className="text-success">Tikilgan pul + foiz</b> yechish balansiga o'tadi (misol: 20 000 → 20% = 24 000).</div>
        </div>
      </div>
      {win && <WinModal percent={win.percent} amount={win.amount} onClose={() => setWin(null)} />}
    </>
  );
}


/* ---------- PAYMENT ---------- */
function PaymentScreen({ go }: { go: (s: Screen) => void }) {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const myReqs = useGame((s) => s.myWithdrawRequests);
  const now = useNow(60000);
  return (
    <>
      <TopBar title="To'lov" />
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="card-soft rounded-2xl p-3">
            <div className="text-[10px] text-muted-foreground tracking-wider">O'YIN BALANSI</div>
            <div className="text-lg font-extrabold mt-0.5">{formatMoney(me.balance)}</div>
            <div className="text-[10px] text-muted-foreground">so'm</div>
          </div>
          <div className="card-soft rounded-2xl p-3 border-2 border-success/25">
            <div className="text-[10px] text-muted-foreground tracking-wider">YECHISH BALANSI</div>
            <div className="text-lg font-extrabold mt-0.5 text-success">{formatMoney(me.withdrawBalance)}</div>
            <div className="text-[10px] text-muted-foreground">so'm</div>
          </div>
        </div>

        <button onClick={() => go("deposit")} className="w-full card-soft rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99]">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">Pul kiritish</div>
            <div className="text-xs text-muted-foreground">O'yin balansini to'ldirish</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button onClick={() => go("withdraw")} className="w-full card-soft rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99]">
          <div className="w-12 h-12 rounded-xl bg-success text-white flex items-center justify-center">
            <ArrowUpFromLine className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">Pul yechish</div>
            <div className="text-xs text-muted-foreground">Yutuq balansidan yechib olish</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* So'rovlarim */}
        <div className="mt-2">
          <div className="font-semibold text-sm mb-2">So'rovlarim</div>
          <div className="card-soft rounded-2xl divide-y divide-border">
            {myReqs.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">Hozircha so'rov yo'q</div>
            )}
            {myReqs.map((r) => {
              const isPending = r.status === "pending";
              const isApproved = r.status === "approved" && !r.paidAt;
              const isPaid = r.status === "approved" && !!r.paidAt;
              // 48h countdown from createdAt
              const deadline = r.createdAt + 48 * 3600000;
              const leftMs = Math.max(0, deadline - now);
              const h = Math.floor(leftMs / 3600000);
              const m = Math.floor((leftMs % 3600000) / 60000);
              // Eski (navbatdagi) so'rovlar uchun — 24-avgustgacha
              const queued = !!r.queueNumber && !isPaid && r.status !== "rejected";
              const qLeft = Math.max(0, QUEUE_DEADLINE - now);
              const qd = Math.floor(qLeft / 86400000);
              const qh = Math.floor((qLeft % 86400000) / 3600000);
              const qm = Math.floor((qLeft % 3600000) / 60000);

              let color = "text-yellow-600 bg-yellow-100";
              let label = "Kutilmoqda";
              if (r.status === "approved") { color = isPaid ? "text-success bg-success-soft" : "text-blue-600 bg-blue-100"; label = isPaid ? "To'landi" : "Tasdiqlandi · to'lov jarayonida"; }
              if (r.status === "rejected") { color = "text-destructive bg-destructive/10"; label = "Rad etildi"; }

              return (
                <div key={r.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-base font-bold ${r.status === "rejected" ? "text-destructive" : r.status === "pending" ? "text-yellow-600" : isPaid ? "text-success" : "text-blue-600"}`}>
                        {formatMoney(r.amount)} so'm
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("ru-RU")} · {r.method.toUpperCase()}
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${color} flex items-center gap-1`}>
                      {isApproved && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />}
                      {label}
                    </span>
                  </div>
                  {isPending && !queued && (
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      To'lov muddati: <b className="text-foreground tabular-nums">{h}s {m}d</b> qoldi
                    </div>
                  )}
                  {queued && (
                    <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-[11px] leading-relaxed">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Navbat raqamingiz</span>
                        <b className="text-primary tabular-nums text-sm">#{r.queueNumber}</b>
                      </div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-muted-foreground">Taxminiy to'lov muddati</span>
                        <b className="text-foreground tabular-nums">24-avgust ({qd} kun {qh} soat {qm} daq)</b>
                      </div>
                      Reklama xizmatidan to'lov kechikayotgani sababli to'lovlaringiz ham kechikmoqda.
                      Biz reklama bilan birinchi marta ishlaganimiz uchun birinchi to'lov 1 oyda amalga oshirilar ekan.
                      Shu sababli to'lovlar kechikmoqda. To'lovingiz navbat bo'yicha, ko'rsatilgan muddat ichida albatta amalga oshiriladi. Sabringiz uchun rahmat!
                    </div>
                  )}
                  {r.status === "rejected" && r.adminNote && (
                    <div className="mt-1.5 text-[11px] text-destructive">Sabab: {r.adminNote}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-soft rounded-2xl p-3 text-[11px] text-muted-foreground">
          Chiptalar faqat <b className="text-foreground">O'yin balansi</b> orqali olinadi.
          Yutuq va qaytarish esa mos ravishda <b className="text-success">Yechish balansi</b> va o'yin balansiga tushadi.
        </div>
      </div>
    </>
  );
}


/* ---------- PROFILE ---------- */
function ProfileScreen({ go }: { go: (s: Screen) => void }) {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const items: { key: Screen; label: string; icon: any }[] = [
    { key: "history", label: "Tranzaksiyalar", icon: Wallet },
    { key: "rules", label: "Qoidalar", icon: Shield },

  ];
  return (
    <>
      <TopBar title="Profil" />
      <div className="p-4">
        <div className="card-soft rounded-2xl p-4 flex items-center gap-3">
          <Avatar name={me.firstName} size={56} photo={me.photo} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <div className="font-bold">{me.firstName}</div>
              <BadgeCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground">{me.username ? `@${me.username} · ` : ""}ID: {me.id}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="card-soft rounded-2xl p-3">
            <div className="text-[10px] text-muted-foreground tracking-wider">O'YIN BALANSI</div>
            <div className="text-lg font-extrabold mt-0.5">{formatMoney(me.balance)} <span className="text-xs font-medium text-muted-foreground">so'm</span></div>
          </div>
          <div className="card-soft rounded-2xl p-3 border-2 border-success/25">
            <div className="text-[10px] text-muted-foreground tracking-wider">YECHISH BALANSI</div>
            <div className="text-lg font-extrabold mt-0.5 text-success">{formatMoney(me.withdrawBalance)} <span className="text-xs font-medium text-muted-foreground">so'm</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Jami o'yinlar", value: `${me.tickets.length}` },
            { label: "Yutuqlar", value: `${me.tickets.filter(t=>t.status==="won").length}` },
            { label: "Status", value: me.banned ? "Bloklangan" : "Faol" },
          ].map((s, i) => (
            <div key={i} className="card-soft rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className="font-bold text-sm mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        {me.isAdmin && (
          <button
            onClick={() => go("admin")}
            className="mt-3 w-full card-soft rounded-2xl p-4 flex items-center gap-3 border-2 border-primary/30"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-sm">Admin panel</div>
              <div className="text-xs text-muted-foreground">Foydalanuvchilar, jackpot va statistika</div>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        )}

        <div className="card-soft rounded-2xl mt-3 divide-y divide-border overflow-hidden">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <button key={i} onClick={() => go(it.key)} className="w-full flex items-center gap-3 p-3.5 active:bg-muted">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 text-left text-sm font-medium">{it.label}</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
          <button
            onClick={() => {
              const url = `https://t.me/${SUPPORT_USERNAME}`;
              const tg = (window as any)?.Telegram?.WebApp;
              if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank");
            }}
            className="w-full flex items-center gap-3 p-3.5 active:bg-muted"
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 text-left text-sm font-medium">Yordam va qo'llab-quvvatlash (@LumoWinUz)</div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Deposit / Withdraw ---------- */
const MIN_AMOUNT = 10000;
const MIN_WITHDRAW = 15000;
const SUPPORT_USERNAME = "LumoWinUz";

function DepositScreen({ back }: { back: () => void }) {
  const [amount, setAmount] = useState("100 000");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const submit = async () => {
    const n = parseInt(amount.replace(/\D/g, ""), 10);
    if (!n || n < MIN_AMOUNT) {
      setMsg({ ok: false, text: `Minimal to'ldirish: ${formatMoney(MIN_AMOUNT)} so'm` });
      setTimeout(() => setMsg(null), 3000); return;
    }
    const r = await requestDeposit(n, "card");
    if (!r.ok) { setMsg({ ok: false, text: r.error || "Xatolik" }); setTimeout(() => setMsg(null), 2500); return; }
    const text =
`LumoWin hisob to'ldirish so'rovi
Ism: ${me.firstName}${me.username ? " (@" + me.username + ")" : ""}
Telegram ID: ${me.id}
Summa: ${formatMoney(n)} so'm
Karta: Uzcard / Humo
Iltimos, to'lovni tekshirib tasdiqlang.`;

    try { await navigator.clipboard?.writeText(text); } catch {}
    const url = `https://t.me/${SUPPORT_USERNAME}?text=${encodeURIComponent(text)}`;
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank");
    setMsg({ ok: true, text: "So'rov yuborildi. Adminga xabar yuboring." });
    setTimeout(() => setMsg(null), 3500);
  };
  return (
    <>
      <TopBar title="Pul kiritish" onBack={back} />
      <div className="p-4">
        <div className="card-soft rounded-2xl p-4">
          <div className="text-[11px] text-muted-foreground">O'yin balansi</div>
          <div className="text-2xl font-bold mt-1">{formatMoney(me.balance)} so'm</div>
        </div>
        <div className="mt-4 card-soft rounded-2xl p-3 text-[11px] text-muted-foreground">
          To'lovlar faqat <b className="text-foreground">Uzcard</b> va <b className="text-foreground">Humo</b> kartalari orqali qabul qilinadi.
        </div>

        <div className="mt-4 font-semibold">Miqdor</div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {["50 000", "100 000", "200 000", "500 000"].map((v) => (
            <button key={v} onClick={() => setAmount(v)}
              className={`h-11 rounded-xl text-sm font-semibold ${amount === v ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{v}</button>
          ))}
        </div>
        <div className="card-soft rounded-xl mt-2 flex items-center px-4 h-12">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 bg-transparent outline-none text-base" />
          <span className="text-muted-foreground text-sm">so'm</span>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Minimal: <b>{formatMoney(MIN_AMOUNT)} so'm</b>. Tugmani bosgach adminga yo'naltirasiz.
        </div>
        <button onClick={submit} className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-button">To'ldirish</button>
        {msg && <div className={`mt-2 text-center text-xs font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</div>}
      </div>
    </>
  );
}

function isWeekendTashkent(now: number) {
  // UTC+5
  const d = new Date(now + 5 * 3600000);
  const day = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
  return day === 6 || day === 0;
}

function WithdrawScreen({ back }: { back: () => void }) {
  const [amount, setAmount] = useState("100 000");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const [sending, setSending] = useState(false);
  const now = useNow(30000);
  const weekend = isWeekendTashkent(now);
  const submit = async () => {
    if (sending) return;
    if (weekend) { setMsg({ ok: false, text: "Shanba va yakshanba kunlari pul yechish vaqtincha to'xtatilgan" }); setTimeout(() => setMsg(null), 3000); return; }
    const n = parseInt(amount.replace(/\D/g, ""), 10);
    if (!n || n < MIN_WITHDRAW) { setMsg({ ok: false, text: `Minimal yechish: ${formatMoney(MIN_WITHDRAW)} so'm` }); setTimeout(() => setMsg(null), 3000); return; }
    if (n > me.withdrawBalance) { setMsg({ ok: false, text: "Yechish balansi yetarli emas" }); setTimeout(() => setMsg(null), 3000); return; }
    const cardDigits = details.replace(/\D/g, "");
    if (cardDigits.length !== 16) { setMsg({ ok: false, text: "Karta raqami 16 xonali bo'lishi kerak" }); setTimeout(() => setMsg(null), 3000); return; }
    setSending(true);
    try {
      const r = await requestWithdraw(n, "card", cardDigits);
      setMsg({ ok: r.ok, text: r.ok ? `${formatMoney(n)} so'm so'rovi yuborildi` : (r.error || "Xatolik") });
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <TopBar title="Pul yechish" onBack={back} />
      <div className="p-4">
        <div className="card-soft rounded-2xl p-4 border-2 border-success/25">
          <div className="text-[11px] text-muted-foreground">Yechish balansi</div>
          <div className="text-2xl font-bold mt-1 text-success">{formatMoney(me.withdrawBalance)} so'm</div>
        </div>
        {weekend && (
          <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
            Shanba 00:01 dan yakshanba 23:59 gacha (Toshkent vaqti) pul yechish ishlamaydi. Dushanba kuni qayta urinib ko'ring.
          </div>
        )}
        <div className="mt-4 font-semibold">Karta raqami (Uzcard / Humo)</div>
        <input
          value={details}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
            const grouped = digits.replace(/(.{4})/g, "$1 ").trim();
            setDetails(grouped);
          }}
          inputMode="numeric"
          maxLength={19}
          placeholder="8600 0000 0000 0000"
          className="mt-2 w-full card-soft rounded-xl px-4 h-12 outline-none tracking-widest"
        />
        <div className="text-[11px] text-muted-foreground mt-1">To'lovlar faqat Uzcard va Humo kartalariga amalga oshiriladi</div>
        <div className="mt-4 font-semibold">Miqdor</div>
        <div className="card-soft rounded-xl mt-2 flex items-center px-4 h-12">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 bg-transparent outline-none text-base" />
          <span className="text-muted-foreground text-sm">so'm</span>
        </div>
        <ul className="mt-3 text-xs text-muted-foreground space-y-1">
          <li>› Minimal yechish: <b>{formatMoney(MIN_WITHDRAW)} so'm</b></li>
          <li>› 24 soat ichida amalga oshiriladi</li>
          <li>› Shanba va yakshanba kunlari yechish yopiq</li>
        </ul>
        <button onClick={submit} disabled={sending || weekend}
          className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-button disabled:opacity-50">
          {weekend ? "Dam olish kunlari yopiq" : sending ? "Yuborilmoqda..." : "Yechishni so'rash"}
        </button>
        {msg && <div className={`mt-2 text-center text-xs font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</div>}
      </div>
    </>
  );
}

/* ---------- Convert ---------- */
function ConvertScreen({ back }: { back: () => void }) {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const [status, setStatus] = useState<ConversionStatus>({ pending: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const now = useNow(1000);

  useEffect(() => { getConversionStatus().then(setStatus); }, []);

  const submit = async () => {
    if (sending) return;
    setSending(true);
    try {
      const r = await requestConversion();
      if (r.ok) {
        setMsg({ ok: true, text: "Konvertatsiya boshlandi. 24 soatdan so'ng o'yin balansiga tushadi." });
        setStatus(await getConversionStatus());
      } else {
        setMsg({ ok: false, text: r.error || "Xatolik" });
      }
      setTimeout(() => setMsg(null), 3500);
    } finally { setSending(false); }
  };

  const leftMs = status.executeAt ? Math.max(0, status.executeAt - now) : 0;
  const h = Math.floor(leftMs / 3600000);
  const m = Math.floor((leftMs % 3600000) / 60000);
  const s = Math.floor((leftMs % 60000) / 1000);

  return (
    <>
      <TopBar title="Konvertatsiya" onBack={back} />
      <div className="p-4 space-y-3">
        <div className="card-soft rounded-2xl p-4 border-2 border-success/25">
          <div className="text-[11px] text-muted-foreground">Yechish balansi</div>
          <div className="text-2xl font-bold mt-1 text-success">{formatMoney(me.withdrawBalance)} so'm</div>
        </div>

        {status.pending ? (
          <div className="card-soft rounded-2xl p-5 text-center">
            <div className="text-xs text-muted-foreground">O'tkazilmoqda</div>
            <div className="text-2xl font-extrabold mt-1">{formatMoney(status.amount || 0)} so'm</div>
            <div className="mt-3 text-[11px] text-muted-foreground">O'yin balansiga tushishiga qoldi</div>
            <div className="text-3xl font-extrabold tabular-nums mt-1 text-primary">
              {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </div>
          </div>
        ) : (
          <>
            <div className="card-soft rounded-2xl p-3 text-[11px] text-muted-foreground leading-relaxed">
              Yechish balansidagi butun mablag'ni o'yin balansiga o'tkazishingiz mumkin.
              Tasdiqlagandan so'ng <b className="text-foreground">24 soat</b> hisoblanadi, vaqt tugagach pul avtomatik o'yin balansiga tushadi.
            </div>
            <button onClick={submit} disabled={sending || me.withdrawBalance <= 0}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-button disabled:opacity-50">
              {sending ? "Yuborilmoqda..." : "Tasdiqlab o'tkazish"}
            </button>
          </>
        )}
        {msg && <div className={`text-center text-xs font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</div>}
      </div>
    </>
  );
}


/* ---------- History (transactions) ---------- */
function HistoryScreen({ back }: { back: () => void }) {
  const txs = useGame((s) => s.transactions.filter((t) => t.userId === s.currentUserId));
  return (
    <>
      <TopBar title="Tranzaksiyalar" onBack={back} />
      <div className="p-4">
        <div className="card-soft rounded-2xl divide-y divide-border">
          {txs.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Hozircha tranzaksiya yo'q</div>
          )}
          {txs.map((t) => (
            <div key={t.id} className="p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.amount > 0 ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>
                {t.amount > 0 ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.note || t.type}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(t.at).toLocaleString("ru-RU")}</div>
              </div>
              <div className={`text-sm font-bold ${t.amount > 0 ? "text-success" : "text-primary"}`}>
                {t.amount > 0 ? "+" : ""}{formatMoney(t.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function RulesScreen({ back }: { back: () => void }) {
  const sections: { title: string; items: string[] }[] = [
    { title: "🎯 Yo'riqnoma", items: [
      "O'ynashni boshlash uchun Hisobni to'ldirish bo'limiga kirib, to'lov usuli va summani tanlang (minimal 10 000 so'm).",
      "«To'lov qilish» tugmasini bosganingizdan so'ng tayyor xabar avtomatik ravishda administratorga yuboriladi. Tasdiqlangach, mablag' O'yin balansiga tushadi.",
      "So'ng jackpotni tanlab «Chipta sotib olish» tugmasini bosing. Chipta narxi O'yin balansidan yechiladi va siz avtomatik ishtirokchi bo'lasiz.",
      "Belgilangan vaqt tugagach, tizim avtomatik qura tashlaydi va g'olib(lar)ni aniqlaydi. G'olib bo'lsangiz yutuq summasi Yechish balansiga o'tkaziladi.",
      "Pul yechish uchun Yechish balansida kamida 10 000 so'm bo'lishi kerak. «Pul yechish» bo'limiga kirib, karta raqamingiz va summani kiriting.",
      "To'lov holatini ilova orqali Kutilmoqda, To'lanmoqda, To'landi yoki Rad etildi ko'rinishida kuzatishingiz mumkin.",
    ]},
    { title: "🏆 Umumiy qoidalar", items: [
      "LumoWin — Telegram Mini App. Har bir foydalanuvchi Telegram ID orqali avtomatik aniqlanadi.",
      "Har bir foydalanuvchi uchun alohida hisob, balans va o'yinlar tarixi yuritiladi.",
      "Platformada Haftalik va Kunlik Jackpot o'yinlari mavjud.",
      "Har bir jackpot uchun chipta narxi, yutuq jamg'armasi, o'yin muddati va g'oliblar soni administrator tomonidan belgilanadi.",
      "Administrator zarurat tug'ilganda o'yin parametrlarini oldindan e'lon qilgan holda o'zgartirish huquqiga ega.",
    ]},
    { title: "💰 Balans turlari", items: [
      "🎮 O'yin balansi — Hisobni to'ldirish orqali mablag' shu balansga tushadi. Chiptalar faqat O'yin balansidan xarid qilinadi.",
      "💳 Yechish balansi — Jackpot yutuqlari va bonuslar faqat ushbu balansga tushadi.",
      "Pul yechish faqat Yechish balansidan amalga oshiriladi. O'yin balansidagi mablag'ni bevosita yechib olish mumkin emas.",
    ]},
    { title: "🎟 Chipta va o'yin tartibi", items: [
      "Chipta faqat O'yin balansi orqali xarid qilinadi.",
      "Har bir xarid qilingan chipta noyob tartib raqamiga ega bo'ladi.",
      "Chipta savdosi administrator belgilagan muddat davomida ochiq bo'ladi. Vaqti tugagach avtomatik yopiladi.",
      "O'yin yakunlangach tizim avtomatik ravishda tasodifiy qura tashlaydi va g'olib(lar)ni aniqlaydi.",
      "Taymer server vaqti asosida ishlaydi. Ilovani yopish yoki qayta ochish taymerni o'zgartirmaydi.",
    ]},
    { title: "🏅 G'oliblarni aniqlash", items: [
      "G'oliblar soni administrator tomonidan belgilanadi.",
      "Har bir g'olib belgilangan to'liq yutuq summasini qo'lga kiritadi.",
      "Yutuq avtomatik ravishda Yechish balansiga o'tkaziladi.",
      "G'oliblar tasodifiy algoritm orqali aniqlanadi va barcha ishtirokchilar uchun yutish imkoniyati yaratiladi.",
    ]},
    { title: "🔄 Mablag'ni qaytarish", items: [
      "Yutmagan ishtirokchilarga chipta narxining ma'lum qismi (odatda 110%) Yechish balansiga qaytariladi.",
      "Qaytariladigan foiz administrator tomonidan oldindan belgilanishi mumkin.",
      "Siz har qanday holatda g'alaba qozonasiz — kiritgan pulingizga 10% qo'shib beriladi.",
    ]},
    { title: "💵 Hisobni to'ldirish va pul yechish", items: [
      "Minimal hisobni to'ldirish — 10 000 so'm.",
      "Minimal pul yechish — 10 000 so'm.",
      "Hisobni to'ldirishda foydalanuvchi to'lov usuli va summani tanlaydi.",
      "Tayyor so'rov avtomatik ravishda @" + SUPPORT_USERNAME + " administratoriga yuboriladi.",
      "Pul yechish so'rovlari 25 soat ichida (dam olish kunlarisiz) ko'rib chiqiladi va to'lab berish kafolatlanadi.",
      "Ayrim hollarda to'lov 25 soatdan ham kechikishi mumkin — bu qoidabuzarlik hisoblanmaydi.",
      "Platforma daromadi reklama xizmatlaridan tushadi. Reklama to'lovlari kechikkan hollarda foydalanuvchilarga to'lovlar ham keyingi reklama to'lovi kelguncha kechikishi mumkin.",
      "Kechikish yuz berganda foydalanuvchiga navbat raqami va taxminiy to'lov muddati ko'rsatiladi; to'lov shu muddat ichida navbat bo'yicha amalga oshiriladi.",
      "Ayrim holatlarda (texnik ishlar, bank yoki to'lov tizimidagi nosozliklar, katta hajmdagi so'rovlar) to'lovlar kechikishi mumkin.",
      "To'lov holatlari: 🟡 Kutilmoqda · 🔵 To'lanmoqda · 🟢 To'landi · 🔴 Rad etildi (sababi ko'rsatiladi).",
    ]},
    { title: "👥 Referal tizimi", items: [
      "Har bir foydalanuvchi shaxsiy referal havolasiga ega.",
      "Do'stlaringiz sizning havolangiz orqali ro'yxatdan o'tsa, referal sifatida hisoblanadi.",
      "Referallar soni ilovaning Referallar bo'limida avtomatik ko'rsatiladi.",
      "Soxta akkauntlar yoki qoidabuzarlik orqali referal yig'ish aniqlansa, referallar bekor qilinishi mumkin.",
    ]},
    { title: "🔒 Xavfsizlik", items: [
      "Har bir amal serverda saqlanadi (chipta xaridi, to'lov, pul yechish, bonuslar va admin harakatlari).",
      "Yozuvlar tizimda himoyalangan bo'lib, o'zgartirib yoki o'chirib bo'lmaydi.",
      "Hisob faqat Telegram ID orqali egasiga tegishli bo'ladi.",
      "Boshqa shaxslarga akkauntingizdan foydalanishga ruxsat bermang.",
      "Shubhali faoliyat aniqlansa, administrator hisobni vaqtinchalik tekshiruv uchun cheklashi mumkin.",
    ]},
    { title: "🚫 Taqiqlangan holatlar", items: [
      "Bir foydalanuvchi tomonidan bir nechta akkaunt ochish.",
      "Tizimdagi xatolardan noqonuniy foydalanishga urinish.",
      "Soxta to'lov cheklari yuborish.",
      "Boshqa foydalanuvchilarning hisobiga ruxsatsiz kirishga urinish.",
      "Platforma faoliyatiga zarar yetkazuvchi harakatlar.",
      "Administratorga qo'pol muomala qilish, haqorat yoki bosim o'tkazishga urinish — bloklanishga sabab bo'ladi.",
      "Jackpot o'yinida xatolik yoki qoidabuzarlik aniqlansa, yutuq bekor qilinadi va administrator hech qanday ogohlantirishsiz summani hisobdan ayirishi mumkin.",
      "Botdan bloklangan taqdirda, kiritgan mablag'ingizni qaytarish uchun 24 soat ichida administratorga yozishingiz shart. Aks holda qoidalarga muvofiq mablag' qaytarilmaydi.",
      "Bunday holatlarda administrator ogohlantirishsiz hisobni cheklash yoki bloklash huquqiga ega.",
    ]},
  ];
  return (
    <>
      <TopBar title="Qoidalar" onBack={back} />
      <div className="p-4 space-y-4">
        <div className="w-full flex justify-center"><div className="text-5xl">🏆</div></div>
        {sections.map((sec, si) => (
          <div key={si} className="card-soft rounded-2xl p-4">
            <div className="font-semibold text-sm text-primary mb-2">{sec.title}</div>
            <ol className="space-y-2 text-sm">
              {sec.items.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-semibold">{i + 1}.</span>
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </>
  );
}


function FaqScreen({ back }: { back: () => void }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <TopBar title="Yordam va qo'llab-quvvatlash" onBack={back} />
      <div className="p-4 space-y-2">
        {faqs.map((q, i) => (
          <button key={i} onClick={() => setOpen(open === i ? null : i)}
            className="card-soft rounded-xl w-full p-4 flex items-center justify-between text-left">
            <span className="text-sm font-medium pr-3">{q}</span>
            <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open === i ? "rotate-90" : ""}`} />
          </button>
        ))}
        <div className="jackpot-card rounded-2xl p-4 mt-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Biz bilan bog'lanish</div>
            <div className="text-xs opacity-90">@LumoWin</div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </>
  );
}

function ReferralScreen({ back }: { back: () => void }) {
  const me = useGame((s) => s.users[s.currentUserId] ?? s.users[0]);
  const link = useMemo(() => `https://t.me/LumoWinBot?start=${me.id}`, [me.id]);
  const [stats, setStats] = useState<{ invited: number; verified: number; earned: number }>({ invited: 0, verified: 0, earned: 0 });
  useEffect(() => {
    let alive = true;
    async function load() {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase as any).rpc("get_my_referral_stats");
      if (alive && data) setStats({ invited: Number(data.invited || 0), verified: Number(data.verified || 0), earned: Number(data.earned || 0) });
    }
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [me.id]);
  return (
    <>
      <TopBar title="Referal dasturi" onBack={back} />
      <div className="p-4 space-y-3">
        <div className="jackpot-card rounded-2xl p-5">
          <div className="text-xs opacity-90 tracking-wider">DO'STLARINGIZNI TAKLIF QILING</div>
          <div className="text-3xl font-extrabold mt-1">+450 so'm</div>
          <div className="text-xs opacity-90 mt-1">har bir kanalga obuna bo'lgan do'st uchun</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="card-soft rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground tracking-wider">CHAQIRILDI</div>
            <div className="text-xl font-extrabold mt-1">{stats.invited}</div>
          </div>
          <div className="card-soft rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground tracking-wider">TASDIQLADI</div>
            <div className="text-xl font-extrabold mt-1 text-success">{stats.verified}</div>
          </div>
          <div className="card-soft rounded-2xl p-3 text-center">
            <div className="text-[10px] text-muted-foreground tracking-wider">ISHLADI</div>
            <div className="text-xl font-extrabold mt-1 text-primary">{formatMoney(stats.earned)}</div>
          </div>
        </div>
        <div className="card-soft rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Sizning referal havolangiz</div>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={link} className="flex-1 bg-muted rounded-lg px-3 h-10 text-xs" />
            <button
              onClick={() => navigator.clipboard?.writeText(link)}
              className="h-10 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Nusxa
            </button>
          </div>
        </div>
        <div className="card-soft rounded-2xl p-4">
          <div className="font-semibold text-sm mb-2">Qanday ishlaydi?</div>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
            <li>Havolangizni do'stlaringizga yuboring.</li>
            <li>Ular botga /start yuboradi va telefon raqamini yuboradi.</li>
            <li>Rasmiy kanalga obuna bo'lib tasdiqlashadi.</li>
            <li>Faqat shundan keyin sizga <b>+450 so'm</b> qo'shiladi.</li>
          </ol>
        </div>
      </div>
    </>
  );
}
