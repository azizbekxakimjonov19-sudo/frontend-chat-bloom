import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Users, Clock, Trophy, Sparkles, ShieldAlert, Crown } from "lucide-react";
import {
  useGame, buyTicket, drawWinner, formatMoney, formatTime,
  isSaleOpen, saleEndsAt,
  type JackpotId, type Participant,
} from "@/lib/game-store";

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function Avatar({ name, size = 40, photo }: { name: string; size?: number; photo?: string }) {
  const initial = name.charAt(0).toUpperCase();
  if (photo) {
    return (
      <img src={photo} alt={name} className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full bg-primary-soft text-primary font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
}

export function JackpotDetailScreen({
  jackpotId, back,
}: { jackpotId: JackpotId; back: () => void }) {
  const j = useGame((s) => s.jackpots[jackpotId]);
  const me = useGame((s) => s.users[s.currentUserId]);
  const now = useNow(1000);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [buying, setBuying] = useState(false);

  const saleOpen = !j.frozen && isSaleOpen(j, now);
  const alreadyJoined = j.isFree && j.participants.some((p) => p.userId === me.id);
  const canBuy = j.isFree ? !alreadyJoined : me.balance >= j.ticketPrice;
  const saleLeft = Math.max(0, saleEndsAt(j) - now);
  const drawLeft = Math.max(0, j.endsAt - now);

  const handleBuy = async () => {
    if (buying) return;
    setBuying(true);
    try {
      const r = await buyTicket(jackpotId);
      setMsg({ ok: r.ok, text: r.ok ? "Chipta olindi!" : r.error || "Xatolik" });
      setTimeout(() => setMsg(null), 2500);
    } finally {
      setBuying(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 h-14 flex items-center gap-2">
        <button onClick={back} className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full active:bg-muted">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">{j.title}</h1>
      </div>

      <div className="p-4">
        {/* Hero */}
        <div className={`rounded-2xl p-5 relative overflow-hidden ${jackpotId === "weekly" ? "jackpot-card" : "bg-card border border-border"}`}>
          <div className={`text-[11px] font-semibold tracking-widest ${jackpotId === "weekly" ? "opacity-90" : "text-muted-foreground"}`}>
            YUTUQ FONDI
          </div>
          <div className={`text-4xl font-extrabold mt-1 ${jackpotId === "weekly" ? "" : "text-primary"}`}>
            {formatMoney(j.prize)} <span className="text-lg font-semibold opacity-90">so'm</span>
          </div>

          <div className={`mt-4 rounded-xl p-3 flex items-center gap-3 ${jackpotId === "weekly" ? "bg-white/15" : "bg-primary-soft"}`}>
            <Clock className={`w-5 h-5 ${jackpotId === "weekly" ? "" : "text-primary"}`} />
            <div className="flex-1">
              <div className={`text-[11px] ${jackpotId === "weekly" ? "opacity-90" : "text-muted-foreground"}`}>
                {j.frozen ? "Holat" : j.drawing ? "Holat" : saleOpen ? "Sotuv tugashiga" : "Qura tashlashgacha"}
              </div>
              <div className={`font-bold text-lg tabular-nums ${jackpotId === "weekly" ? "" : "text-primary"}`}>
                {j.frozen ? "G'olib aniqlandi 🏆" : j.drawing ? "Qura tashlanmoqda..." : saleOpen ? formatTime(saleLeft) : formatTime(drawLeft)}
              </div>
            </div>
          </div>

          <div className={`mt-3 flex justify-between text-[11px] ${jackpotId === "weekly" ? "opacity-90" : "text-muted-foreground"}`}>
            <span>Chipta: <b>{j.isFree ? "Bepul" : `${formatMoney(j.ticketPrice)} so'm`}</b></span>
            {j.isFree
              ? <span>Har kim <b>1 marta</b> qatnashadi</span>
              : <span>Yutmasangiz: <b>{j.refundPercent}%</b> qaytadi</span>}
          </div>
        </div>

        {/* Winners — crown */}
        {(j.winners?.length ? j.winners : j.lastWinner ? [j.lastWinner] : []).length > 0 && (
          <div className="mt-4 card-soft rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute right-3 top-3 text-2xl">👑</div>
            <div className="text-[10px] tracking-widest text-muted-foreground">
              G'OLIBLAR ({(j.winners?.length ? j.winners : [j.lastWinner]).length})
            </div>
            <div className="mt-2 divide-y divide-border">
              {(j.winners?.length ? j.winners : j.lastWinner ? [j.lastWinner] : []).map((w: any) => (
                <div key={w.userId} className="flex items-center gap-3 py-2">
                  <div className="relative shrink-0">
                    <Avatar name={w.firstName} size={40} photo={w.photo} />
                    <Crown className="absolute -top-2 -right-2 w-4 h-4 text-gold drop-shadow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{w.firstName}</div>
                    {w.username && <div className="text-[11px] text-muted-foreground truncate">@{w.username}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-primary">+{formatMoney(w.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">so'm</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buy CTA */}
        <div className="mt-4 card-soft rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-muted-foreground">Chipta narxi</div>
              <div className="text-xl font-bold text-primary">{j.isFree ? "Bepul" : `${formatMoney(j.ticketPrice)} so'm`}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">O'yin balansi</div>
              <div className="text-sm font-semibold">{formatMoney(me.balance)} so'm</div>
            </div>
          </div>
          <button
            onClick={handleBuy}
            disabled={buying || j.drawing || j.frozen || me.banned || !saleOpen || !canBuy}
            className="mt-3 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-button active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {j.frozen
              ? "G'olib aniqlangan"
              : !saleOpen
                ? "Sotuv yopiq"
                : j.isFree
                  ? (alreadyJoined ? "Siz allaqachon qatnashdingiz" : buying ? "Qo'shilmoqda..." : "Bepul ishtirok etish")
                  : me.balance < j.ticketPrice
                    ? "Balans yetarli emas"
                    : buying
                      ? "Olinmoqda..."
                      : "Chipta sotib olish"}
          </button>
          {msg && (
            <div className={`mt-2 text-center text-xs font-medium ${msg.ok ? "text-success" : "text-primary"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Ishtirokchilar ({j.participants.length})
            </div>
            <div className="text-[11px] text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
            </div>
          </div>
          {j.participants.length === 0 ? (
            <div className="card-soft rounded-2xl p-6 text-center text-sm text-muted-foreground">
              Hozircha ishtirokchi yo'q. Birinchi bo'ling!
            </div>
          ) : (
            <div className="card-soft rounded-2xl divide-y divide-border max-h-[480px] overflow-y-auto no-scrollbar">
              {[...j.participants].reverse().map((p, i) => (
                <div key={p.ticketId} className="flex items-center gap-3 p-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="w-6 text-center text-xs font-semibold text-muted-foreground">
                    {j.participants.length - i}
                  </div>
                  <Avatar name={p.firstName} size={36} photo={p.photo} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.firstName}</div>
                    <div className="text-[11px] text-muted-foreground truncate">@{p.username}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-primary">{p.ticketId}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {Math.max(0, Math.floor((now - p.joinedAt) / 60000))}m oldin
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {j.drawing && <DrawingOverlay jackpotId={jackpotId} />}
    </>
  );
}

/* ---------- Drawing Animation ---------- */
export function DrawingOverlay({ jackpotId }: { jackpotId: JackpotId }) {
  const j = useGame((s) => s.jackpots[jackpotId]);
  const SPIN_MS = 180000; // 3 minutes
  const startedAt = useRef<number>(Date.now());
  const [, force] = useState(0);
  const [current, setCurrent] = useState<Participant | null>(j.participants[0] ?? null);
  const [phase, setPhase] = useState<"spin" | "reveal">("spin");
  const participants = j.participants;

  // Cycle through participants for 3 minutes
  useEffect(() => {
    if (!participants.length) return;
    let i = Math.floor(Math.random() * participants.length);
    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= SPIN_MS) { setPhase("reveal"); return; }
      i = (i + 1) % participants.length;
      setCurrent(participants[i]);
      // Start fast, slow down near end
      const remaining = SPIN_MS - elapsed;
      let delay = 80;
      if (remaining < 30000) delay = 200;
      if (remaining < 10000) delay = 400;
      if (remaining < 3000) delay = 700;
      handle = setTimeout(tick, delay);
    };
    let handle: any = setTimeout(tick, 80);
    return () => clearTimeout(handle);
  }, [participants.length]);

  // Countdown re-render
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase === "reveal" && j.lastWinner) {
      setCurrent({
        userId: j.lastWinner.userId,
        firstName: j.lastWinner.firstName,
        username: j.lastWinner.username,
        photo: j.lastWinner.photo,
        joinedAt: Date.now(),
        ticketId: "",
      });
    }
  }, [phase, j.lastWinner]);

  const elapsed = Date.now() - startedAt.current;
  const remainingMs = Math.max(0, SPIN_MS - elapsed);
  const rm = Math.floor(remainingMs / 60000);
  const rs = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-primary to-primary-dark p-6 text-primary-foreground text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-6 left-6 w-6 h-6 opacity-40 animate-pulse" />
          <Sparkles className="absolute bottom-8 right-6 w-8 h-8 opacity-30 animate-pulse" />
          <Trophy className="absolute -right-6 -bottom-6 w-40 h-40 opacity-10" />
        </div>
        <div className="relative">
          <div className="text-[10px] tracking-widest opacity-90">{j.title.toUpperCase()}</div>
          <div className="text-xs tracking-widest opacity-90 mt-1">
            {phase === "spin" ? `QURA TASHLANMOQDA · ${rm}:${String(rs).padStart(2,"0")}` : "🏆 G'OLIB ANIQLANDI"}
          </div>
          <Trophy className="w-12 h-12 mx-auto mt-3 text-gold" />

          {/* Spinning avatar strip */}
          {phase === "spin" && participants.length > 0 && (
            <div className="mt-4 relative overflow-hidden h-20 rounded-2xl bg-white/10">
              <div
                className="flex items-center gap-3 absolute top-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{
                  animation: `nestSpinStrip ${Math.max(2, 12 - Math.floor(elapsed / 15000))}s linear infinite`,
                  left: 0,
                }}
              >
                {[...participants, ...participants, ...participants].map((p, i) => (
                  <div key={p.ticketId + i} className="flex flex-col items-center min-w-[60px]">
                    <Avatar name={p.firstName} size={44} photo={p.photo} />
                    <div className="text-[10px] opacity-90 mt-1 truncate max-w-[60px]">{p.firstName}</div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-14 border-2 border-gold rounded-xl pointer-events-none" />
            </div>
          )}

          <div className="mt-4 h-28 flex items-center justify-center">
            {phase === "reveal" && current ? (
              <div key={current.userId} className="animate-in zoom-in duration-500">
                <div className="relative inline-block">
                  <Avatar name={current.firstName} size={80} photo={current.photo} />
                  <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 text-gold drop-shadow" />
                </div>
                <div className="mt-2 font-extrabold text-xl">{current.firstName}</div>
                {current.username && <div className="text-xs opacity-90">@{current.username}</div>}
              </div>
            ) : current ? (
              <div className="opacity-90 text-sm">Ishtirokchilar: {participants.length}</div>
            ) : (
              <div className="text-sm opacity-80">Ishtirokchilar yo'q</div>
            )}
          </div>

          {phase === "reveal" && (
            <>
              <div className="text-2xl font-extrabold text-gold animate-in fade-in slide-in-from-bottom duration-500">
                +{formatMoney(j.prize)} so'm
              </div>
              <div className="mt-3 text-xs opacity-90 bg-white/10 rounded-xl p-3">
                🎉 <b>{j.title}</b> g'olibimiz shu!<br/>
                Qolgan ishtirokchilarga chipta narxining <b>{j.refundPercent}%</b> qaytariladi.
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes nestSpinStrip { from { transform: translate3d(0,-50%,0); } to { transform: translate3d(-33.333%,-50%,0); } }`}</style>
    </div>
  );
}

export function TestDrawButton({ jackpotId }: { jackpotId: JackpotId }) {
  const drawing = useGame((s) => s.jackpots[jackpotId].drawing);
  return (
    <button
      onClick={() => drawWinner(jackpotId)}
      disabled={drawing}
      className="mt-3 w-full h-11 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
    >
      <ShieldAlert className="w-4 h-4" /> Qura tashlashni sinash (animatsiya)
    </button>
  );
}
