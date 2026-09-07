import { useEffect, useState } from "react";
import {
  ChevronLeft, Search, ShieldOff, ShieldCheck, Plus, Minus, User as UserIcon,
  Ticket, Trophy, Wallet, Activity, ArrowDownToLine, ArrowUpFromLine,
  Users, TrendingUp, AlertTriangle, ChevronRight, Ban, Settings, Copy, Check, X, Gift, Trash2,
} from "lucide-react";
import {
  useGame, adminSetBalance, adminSetWithdrawBalance, adminToggleBan, drawWinner, adminUpdateJackpot,
  adminResolveWithdraw, adminResolveDeposit,
  adminCreateJackpot, adminRenameJackpot, adminDeleteJackpot,
  adminSetEarnEnabled, loadEarnSettings,
  adminSetBonusEnabled, loadBonusSettings,
  adminListPromoCodes, adminCreatePromoCode, adminSetPromoActive, adminDeletePromoCode, type PromoCode,
  formatMoney, type UserRecord, type JackpotId,
} from "@/lib/game-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AdminView = "home" | "users" | "user" | "jackpots" | "transactions" | "stats" | "settings" | "withdrawals" | "deposits" | "promos";

export function AdminPanel({ back }: { back: () => void }) {
  const [view, setView] = useState<AdminView>("home");
  const [userId, setUserId] = useState<number | null>(null);

  const goUser = (id: number) => { setUserId(id); setView("user"); };

  return (
    <>
      <div className="sticky top-0 z-30 bg-primary text-primary-foreground px-4 h-14 flex items-center gap-2">
        <button
          onClick={() => (view === "home" ? back() : setView("home"))}
          className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full active:bg-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">
          {view === "home" && "Admin Panel"}
          {view === "users" && "Foydalanuvchilar"}
          {view === "user" && "Foydalanuvchi tafsiloti"}
          {view === "jackpots" && "Jackpot boshqaruvi"}
          {view === "transactions" && "Tranzaksiyalar"}
          {view === "stats" && "Statistika"}
          {view === "settings" && "Sozlamalar"}
          {view === "withdrawals" && "Pul yechish so'rovlari"}
          {view === "deposits" && "Pul kiritish so'rovlari"}
          {view === "promos" && "Promokodlar"}
        </h1>
      </div>

      {view === "home" && <AdminHome go={setView} />}
      {view === "users" && <UsersList onOpen={goUser} />}
      {view === "user" && userId && <UserDetail userId={userId} back={() => setView("users")} />}
      {view === "jackpots" && <JackpotsAdmin />}
      {view === "transactions" && <TransactionsAdmin onOpenUser={goUser} />}
      {view === "stats" && <StatsAdmin />}
      {view === "settings" && <SettingsAdmin />}
      {view === "withdrawals" && <WithdrawalsAdmin />}
      {view === "deposits" && <DepositsAdmin />}
      {view === "promos" && <PromosAdmin />}
    </>
  );
}

/* ---------- HOME ---------- */
function AdminHome({ go }: { go: (v: AdminView) => void }) {
  const users = useGame((s) => s.users);
  const jackpots = useGame((s) => s.jackpots);
  const txs = useGame((s) => s.transactions);
  const userCount = Object.keys(users).length;
  const banned = Object.values(users).filter((u) => u.banned).length;
  const totalBalance = Object.values(users).reduce((a, u) => a + u.balance, 0);
  const totalTickets = Object.values(jackpots).reduce((a, j) => a + j.participants.length, 0);

  const cards: { key: AdminView; label: string; icon: any; badge?: string }[] = [
    { key: "users", label: "Foydalanuvchilar", icon: Users, badge: `${userCount}` },
    { key: "withdrawals", label: "Pul yechish so'rovlari", icon: ArrowUpFromLine },
    { key: "deposits", label: "Pul kiritish so'rovlari", icon: ArrowDownToLine },
    { key: "jackpots", label: "Jackpotlar", icon: Trophy, badge: `${totalTickets} chipta` },
    { key: "promos", label: "Promokodlar", icon: Gift },
    { key: "transactions", label: "Tranzaksiyalar", icon: Wallet, badge: `${txs.length}` },
    { key: "stats", label: "Statistika", icon: TrendingUp },
    { key: "settings", label: "Sozlamalar", icon: Settings },
  ];

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Foydalanuvchilar" value={userCount.toString()} sub={`${banned} bloklangan`} icon={Users} />
        <StatCard label="Umumiy balans" value={formatMoney(totalBalance)} sub="so'm" icon={Wallet} />
        <StatCard label="Faol chiptalar" value={totalTickets.toString()} sub="ikkala jackpot" icon={Ticket} />
        <StatCard label="Tranzaksiyalar" value={txs.length.toString()} sub="jami" icon={Activity} />
      </div>

      <div className="mt-4 space-y-2">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => go(c.key)}
            className="card-soft rounded-2xl w-full p-4 flex items-center gap-3 active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <c.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-sm">{c.label}</div>
              {c.badge && <div className="text-xs text-muted-foreground mt-0.5">{c.badge}</div>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }: any) {
  return (
    <div className="card-soft rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="font-bold text-lg mt-1 truncate">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

/* ---------- USERS LIST ---------- */
function UsersList({ onOpen }: { onOpen: (id: number) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; telegram_id: number; username: string | null; first_name: string | null; balance: number; withdraw_balance: number; banned: boolean; photo_url: string | null; isAdmin?: boolean }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const term = q.trim();
      let query = (supabase as any).from("profiles").select("id, telegram_id, username, first_name, balance, withdraw_balance, banned, photo_url");
      if (term) {
        const digits = term.replace(/\D/g, "");
        const or: string[] = [];
        if (digits) or.push(`telegram_id.eq.${digits}`);
        const like = term.replace(/[,()]/g, "");
        or.push(`username.ilike.%${like}%`);
        or.push(`first_name.ilike.%${like}%`);
        query = query.or(or.join(","));
      }
      const { data } = await query.order("balance", { ascending: false }).limit(term ? 100 : 500);
      if (cancelled) return;
      const ids = (data ?? []).map((r: any) => r.id);
      let adminSet = new Set<string>();
      if (ids.length) {
        const { data: roles } = await (supabase as any).from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids);
        adminSet = new Set((roles ?? []).map((r: any) => r.user_id));
      }
      setResults((data ?? []).map((r: any) => ({ ...r, telegram_id: Number(r.telegram_id), isAdmin: adminSet.has(r.id) })));
      setLoading(false);
    };
    const t = setTimeout(run, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="p-4">
      <div className="card-soft rounded-xl h-12 flex items-center px-3 gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ID, username yoki ism bo'yicha qidirish"
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      <div className="mt-3 card-soft rounded-2xl divide-y divide-border overflow-hidden">
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => onOpen(u.telegram_id)}
            className="w-full flex items-center gap-3 p-3 active:bg-muted text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary-soft text-primary font-semibold flex items-center justify-center overflow-hidden">
              {u.photo_url ? <img src={u.photo_url} alt="" className="w-full h-full object-cover" /> : (u.first_name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate flex items-center gap-1.5">
                {u.first_name || `ID ${u.telegram_id}`}
                {u.banned && <Ban className="w-3.5 h-3.5 text-primary" />}
                {u.isAdmin && <span className="text-[10px] bg-primary-soft text-primary px-1.5 py-0.5 rounded">admin</span>}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {u.username ? `@${u.username} · ` : ""}ID {u.telegram_id}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{formatMoney(Number(u.balance))}</div>
              <div className="text-[10px] text-muted-foreground">so'm</div>
            </div>
          </button>
        ))}
        {results.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">{loading ? "Yuklanmoqda…" : "Topilmadi"}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- USER DETAIL ---------- */
function UserDetail({ userId, back }: { userId: number; back: () => void }) {
  const uStore = useGame((s) => s.users[userId]) as UserRecord | undefined;
  const [uFetched, setUFetched] = useState<UserRecord | undefined>(undefined);
  const u = uStore ?? uFetched;
  const jackpots = useGame((s) => s.jackpots);
  const [amount, setAmount] = useState("50000");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<"balance" | "withdraw">("balance");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"info" | "audit" | "tx" | "tickets">("info");
  const [phone, setPhone] = useState<string>("");
  const [detTickets, setDetTickets] = useState<any[]>([]);
  const [detTxs, setDetTxs] = useState<any[]>([]);
  const [detAudit, setDetAudit] = useState<any[]>([]);
  const [loadingDet, setLoadingDet] = useState(false);

  useEffect(() => {
    if (uStore) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await (supabase as any).from("profiles").select("*").eq("telegram_id", userId).maybeSingle();
      if (cancelled || !p) return;
      const { data: r } = await (supabase as any).from("user_roles").select("role").eq("user_id", p.id).eq("role", "admin").maybeSingle();
      setUFetched({
        id: Number(p.telegram_id), authId: p.id,
        username: p.username ?? "", firstName: p.first_name ?? "User", lastName: p.last_name ?? undefined,
        photo: p.photo_url ?? undefined,
        balance: Number(p.balance ?? 0), withdrawBalance: Number(p.withdraw_balance ?? 0),
        banned: !!p.banned, isAdmin: !!r,
        joinedAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        tickets: [], audit: [],
      });
    })();
    return () => { cancelled = true; };
  }, [userId, uStore]);

  useEffect(() => {
    if (!u?.authId || !u?.id) return;
    let cancelled = false;
    setLoadingDet(true);
    (async () => {
      const [tk, tx, ad, bu] = await Promise.all([
        supabase.from("tickets").select("*").eq("user_id", u.authId).order("created_at", { ascending: false }).limit(300),
        supabase.from("transactions").select("*").eq("user_id", u.authId).order("created_at", { ascending: false }).limit(300),
        supabase.from("audit_log").select("*").eq("user_id", u.authId).order("created_at", { ascending: false }).limit(200),
        supabase.from("bot_users").select("phone").eq("telegram_id", u.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setDetTickets(tk.data ?? []);
      setDetTxs(tx.data ?? []);
      setDetAudit(ad.data ?? []);
      setPhone((bu.data as any)?.phone ?? "");
      setLoadingDet(false);
    })();
    return () => { cancelled = true; };
  }, [u?.authId, u?.id]);

  if (!u) return <div className="p-6 text-center text-sm">Topilmadi</div>;

  const apply = async (sign: 1 | -1) => {
    const n = parseInt(amount.replace(/\D/g, ""), 10);
    if (!n) { toast.error("Miqdorni kiriting"); return; }
    setBusy(true);
    const finalNote = note || (sign > 0 ? "Admin qo'shdi" : "Admin ayirdi");
    const fn = target === "balance" ? adminSetBalance : adminSetWithdrawBalance;
    const res = await fn(userId, sign * n, finalNote);
    setBusy(false);
    if (!res?.ok) toast.error(res?.error || "Xatolik");
    else { toast.success(sign > 0 ? "Qo'shildi" : "Ayirildi"); setNote(""); }
  };

  const toggleBan = async () => {
    setBusy(true);
    const res = await adminToggleBan(userId);
    setBusy(false);
    if (!res?.ok) toast.error(res?.error || "Xatolik");
    else toast.success(u.banned ? "Blokdan chiqarildi" : "Bloklandi");
  };

  return (
    <div className="p-4">
      <button onClick={back} className="text-xs text-primary font-medium mb-2">← Ro'yxatga qaytish</button>

      <div className="card-soft rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary-soft text-primary font-bold text-xl flex items-center justify-center overflow-hidden">
            {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover" /> : u.firstName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate flex items-center gap-1.5">
              {u.firstName} {u.lastName}
              {u.banned && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">BAN</span>}
            </div>
            <div className="text-xs text-muted-foreground">@{u.username}</div>
            <div className="text-[11px] text-muted-foreground">ID: {u.id}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <MiniStat label="O'yin balansi" value={formatMoney(u.balance)} />
          <MiniStat label="Yechish balansi" value={formatMoney(u.withdrawBalance)} />
          <MiniStat label="Chipta" value={detTickets.length.toString()} />
        </div>

        <button
          onClick={toggleBan}
          disabled={busy}
          className={`mt-3 w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${
            u.banned
              ? "bg-success text-white"
              : "bg-primary text-primary-foreground shadow-button"
          }`}
        >
          {u.banned ? <><ShieldCheck className="w-4 h-4" /> Blokdan chiqarish</> : <><ShieldOff className="w-4 h-4" /> Bloklash</>}
        </button>
      </div>

      {/* Balance actions */}
      <div className="card-soft rounded-2xl p-4 mt-3">
        <div className="font-semibold text-sm mb-3">Balansni boshqarish</div>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setTarget("balance")}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold ${target === "balance" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            O'yin balansi
          </button>
          <button
            onClick={() => setTarget("withdraw")}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold ${target === "withdraw" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Yechish balansi
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Miqdor"
            className="flex-1 card-soft rounded-xl px-3 h-11 text-sm bg-muted border-0"
          />
          <button onClick={() => apply(1)} disabled={busy} className="h-11 px-4 rounded-xl bg-success text-white font-semibold flex items-center gap-1 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
          <button onClick={() => apply(-1)} disabled={busy} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-1 disabled:opacity-50">
            <Minus className="w-4 h-4" /> Ayirish
          </button>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Izoh (majburiy emas)"
          className="mt-2 w-full card-soft rounded-xl px-3 h-10 text-sm bg-muted border-0"
        />
      </div>


      {/* Tabs */}
      <div className="flex gap-2 mt-4">
        {[
          { k: "info", l: "Info" },
          { k: "audit", l: "Audit" },
          { k: "tx", l: "Tranzaksiya" },
          { k: "tickets", l: "Chipta" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`flex-1 h-10 rounded-xl text-xs font-semibold ${tab === t.k ? "bg-primary text-primary-foreground shadow-button" : "bg-muted text-muted-foreground"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="card-soft rounded-2xl mt-3 p-4 space-y-2 text-sm">
          <Row label="Ro'yxatdan o'tgan" value={new Date(u.joinedAt).toLocaleString("ru-RU")} />
          <Row label="Telefon" value={phone || "—"} />
          <Row label="Telegram ID" value={String(u.id)} />
          <Row label="Username" value={u.username ? `@${u.username}` : "—"} />
          <Row label="Ism" value={`${u.firstName} ${u.lastName ?? ""}`.trim()} />
          <Row label="Status" value={u.banned ? "Bloklangan" : "Faol"} />
          <Row label="Rol" value={u.isAdmin ? "Admin" : "Foydalanuvchi"} />
          <Row label="O'yin balansi" value={`${formatMoney(u.balance)} so'm`} />
          <Row label="Yechish balansi" value={`${formatMoney(u.withdrawBalance)} so'm`} />
          <Row label="Jami chiptalar" value={detTickets.length.toString()} />
          <Row label="Tranzaksiyalar" value={detTxs.length.toString()} />
        </div>
      )}

      {tab === "audit" && (
        <div className="card-soft rounded-2xl mt-3 divide-y divide-border">
          {loadingDet ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : detAudit.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Yozuv yo'q</div>
          ) : detAudit.map((a: any) => (
            <div key={a.id} className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="font-medium text-sm">{a.action}</div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  a.actor === "admin" ? "bg-primary text-primary-foreground" :
                  a.actor === "system" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
                }`}>{a.actor}</span>
              </div>
              {a.details && <div className="text-xs text-muted-foreground mt-0.5">{a.details}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("ru-RU")}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "tx" && (
        <div className="card-soft rounded-2xl mt-3 divide-y divide-border">
          {loadingDet ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : detTxs.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Tranzaksiya yo'q</div>
          ) : detTxs.map((t: any) => (
            <div key={t.id} className="p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${Number(t.amount) > 0 ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>
                {Number(t.amount) > 0 ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{txTypeLabel(t.type)}</div>
                <div className="text-[11px] text-muted-foreground truncate">{t.note}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("ru-RU")}</div>
              </div>
              <div className={`text-sm font-bold ${Number(t.amount) > 0 ? "text-success" : "text-primary"}`}>
                {Number(t.amount) > 0 ? "+" : ""}{formatMoney(Number(t.amount))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tickets" && (
        <div className="card-soft rounded-2xl mt-3 divide-y divide-border">
          {loadingDet ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : detTickets.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Chipta yo'q</div>
          ) : detTickets.map((t: any) => {
            const jTitle = jackpots[String(t.jackpot_id)]?.title ?? String(t.jackpot_id);
            const statusLabel: Record<string,string> = { active: "Faol", won: "Yutdi", refunded: "Qaytarildi", finished: "Tugagan" };
            const won = Number(t.won_amount ?? 0);
            return (
              <div key={t.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t.ticket_code} <span className="text-[10px] font-normal text-muted-foreground">· {statusLabel[t.status] ?? t.status}</span></div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {jTitle} · {new Date(t.created_at).toLocaleString("ru-RU")}
                  </div>
                  {won > 0 && (
                    <div className="text-[11px] text-success font-semibold mt-0.5">+{formatMoney(won)} so'm</div>
                  )}
                </div>
                <div className="text-sm font-bold text-primary">−{formatMoney(Number(t.price))}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold text-sm mt-0.5 truncate">{value}</div>
    </div>
  );
}

function txTypeLabel(t: string) {
  return ({
    deposit: "Pul kiritish", withdraw: "Pul yechish", ticket: "Chipta",
    win: "Yutuq", admin_add: "Admin qo'shdi", admin_sub: "Admin ayirdi", refund: "Qaytarish",
  } as any)[t] || t;
}

/* ---------- JACKPOTS ADMIN ---------- */
function JackpotsAdmin() {
  const jackpots = useGame((s) => s.jackpots);
  const [showAdd, setShowAdd] = useState(false);
  const list = Object.values(jackpots).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={() => setShowAdd((v) => !v)}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" /> {showAdd ? "Yopish" : "Yangi jackpot qo'shish"}
      </button>
      {showAdd && <NewJackpotForm onDone={() => setShowAdd(false)} />}
      {list.length === 0 && (
        <div className="card-soft rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Hozircha jackpot yo'q — yangi qo'shing
        </div>
      )}
      {list.map((j) => {
        const id = j.id;
        return (
          <div key={id} className={`card-soft rounded-2xl p-4 ${!j.active ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  <RenameButton id={id} title={j.title} />
                  {j.isFree && <span className="text-[10px] bg-success text-white px-1.5 py-0.5 rounded">BEPUL</span>}
                  {!j.active && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">O'CHIRILGAN</span>}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">ID: {id}</div>
                <div className="text-2xl font-extrabold text-primary mt-1">{formatMoney(j.prize)} so'm</div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {j.drawing && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded">DRAWING</span>}
                {j.active && <DeleteJackpotButton id={id} title={j.title} />}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <MiniStat label="Ishtirokchi" value={`${j.participants.length}`} />
              <MiniStat label="Chipta narxi" value={formatMoney(j.ticketPrice)} />
              <MiniStat label="Yig'ilgan" value={formatMoney(j.participants.length * j.ticketPrice)} />
            </div>

            <JackpotConfigEditor jackpotId={id} />
            <div className="mt-2 text-[10px] text-center text-muted-foreground">
              🤖 O'yin vaqti tugashi bilan tizim g'olibni avtomatik aniqlaydi. Qo'lda tugma yo'q.
            </div>
            {j.winners.length > 0 ? (
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div className="font-medium text-foreground">G'oliblar ({j.winners.length}):</div>
                {j.winners.map((w) => (
                  <div key={w.userId}>
                    {w.firstName} (ID {w.userId}) · {formatMoney(w.amount)} so'm
                  </div>
                ))}
              </div>
            ) : j.lastWinner ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Oxirgi g'olib: <span className="font-medium text-foreground">{j.lastWinner.firstName}</span> · {formatMoney(j.lastWinner.amount)} so'm · {new Date(j.lastWinner.at).toLocaleString("ru-RU")}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RenameButton({ id, title }: { id: string; title: string }) {
  const onClick = async () => {
    const next = window.prompt("Yangi nom:", title);
    if (!next || next === title) return;
    const r = await adminRenameJackpot(id, next.trim());
    if (!r.ok) toast.error(r.error || "Xatolik");
    else toast.success("Nom o'zgartirildi");
  };
  return (
    <button onClick={onClick} className="text-left underline decoration-dotted underline-offset-2">
      {title}
    </button>
  );
}

function DeleteJackpotButton({ id, title }: { id: string; title: string }) {
  const onClick = async () => {
    if (!window.confirm(`"${title}" o'chirilsinmi? Faol chiptalar egalariga qaytariladi.`)) return;
    const r = await adminDeleteJackpot(id);
    if (!r.ok) toast.error(r.error || "Xatolik");
    else toast.success("O'chirildi");
  };
  return (
    <button onClick={onClick} className="text-[10px] bg-destructive/10 text-destructive px-2 py-1 rounded flex items-center gap-1">
      <X className="w-3 h-3" /> O'chirish
    </button>
  );
}

function NewJackpotForm({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("100000");
  const [price, setPrice] = useState("1000");
  const [refund, setRefund] = useState("10");
  const [sale, setSale] = useState("60");
  const [wait, setWait] = useState("60");
  const [slots, setSlots] = useState("1");
  const [isFree, setIsFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!id.trim() || !title.trim()) { toast.error("ID va nom kiriting"); return; }
    setBusy(true);
    const r = await adminCreateJackpot({
      id: id.trim(), title: title.trim(),
      prize: parseInt(prize) || 0,
      ticketPrice: isFree ? 0 : (parseInt(price) || 0),
      refundPercent: isFree ? 0 : (parseInt(refund) || 0),
      saleHours: parseInt(sale) || 0, waitHours: parseInt(wait) || 0,
      winnerSlots: Math.max(1, parseInt(slots) || 1),
      isFree,
    });
    setBusy(false);
    if (!r.ok) toast.error(r.error || "Xatolik");
    else { toast.success("Yaratildi"); onDone(); }
  };
  return (
    <div className="card-soft rounded-2xl p-4 space-y-2">
      <div className="text-sm font-semibold">Yangi jackpot</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setIsFree(false)}
          className={`h-9 rounded-lg text-xs font-semibold ${!isFree ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Pullik jackpot
        </button>
        <button onClick={() => setIsFree(true)}
          className={`h-9 rounded-lg text-xs font-semibold ${isFree ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
          Bepul jackpot
        </button>
      </div>
      {isFree && (
        <div className="text-[10px] text-muted-foreground">
          Bepul jackpot: chipta narxi 0 so'm, balans talab qilinmaydi, har bir foydalanuvchi turda faqat 1 marta qatnashadi.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <LabeledInput label="ID (masalan: daily)" value={id} onChange={setId} />
        <LabeledInput label="Nom" value={title} onChange={setTitle} />
        <LabeledInput label="Mukofot (so'm)" value={prize} onChange={setPrize} />
        {!isFree && <LabeledInput label="Chipta narxi" value={price} onChange={setPrice} />}
        {!isFree && <LabeledInput label="Qaytarish %" value={refund} onChange={setRefund} />}
        <LabeledInput label="G'oliblar soni" value={slots} onChange={setSlots} />
        <LabeledInput label="Sotuv (daqiqa)" value={sale} onChange={setSale} />
        <LabeledInput label="Kutish (daqiqa)" value={wait} onChange={setWait} />
      </div>
      <button onClick={submit} disabled={busy}
        className="w-full h-10 rounded-xl bg-success text-white text-sm font-semibold disabled:opacity-50">
        Yaratish
      </button>
    </div>
  );
}

function JackpotConfigEditor({ jackpotId }: { jackpotId: JackpotId }) {
  const j = useGame((s) => s.jackpots[jackpotId]);
  const [prize, setPrize] = useState(String(j.prize));
  const [price, setPrice] = useState(String(j.ticketPrice));
  const [sale, setSale] = useState(String(j.saleHours));
  const [wait, setWait] = useState(String(j.waitHours));
  const [spin, setSpin] = useState(String(j.spinMinutes));
  const [refund, setRefund] = useState(String(j.refundPercent));
  const [slots, setSlots] = useState(String(j.winnerSlots ?? 1));
  const [busy, setBusy] = useState(false);

  const payload = () => ({
    prize: parseInt(prize) || 0,
    ticketPrice: j.isFree ? 0 : (parseInt(price) || 0),
    saleHours: parseInt(sale) || 0,
    waitHours: parseInt(wait) || 0,
    spinMinutes: parseInt(spin) || 0,
    refundPercent: j.isFree ? 0 : (parseInt(refund) || 0),
    winnerSlots: Math.max(1, parseInt(slots) || 1),
  });

  const save = async (reset: boolean) => {
    if (reset && !window.confirm("Yangi tur boshlansinmi? Faol chiptalar egalariga qaytariladi.")) return;
    setBusy(true);
    const res = await adminUpdateJackpot(jackpotId, { ...payload(), reset });
    setBusy(false);
    if (!res?.ok) toast.error(res?.error || "Saqlash xatosi");
    else toast.success(reset ? "Yangi tur boshlandi" : "Sozlamalar saqlandi");
  };

  return (
    <div className="mt-3 rounded-xl bg-muted p-3 space-y-2">
      <div className="text-[11px] font-semibold text-muted-foreground">Sozlash</div>
      <div className="grid grid-cols-2 gap-2">
        <LabeledInput label="Mukofot / g'olib (so'm)" value={prize} onChange={setPrize} />
        {!j.isFree && <LabeledInput label="Chipta narxi" value={price} onChange={setPrice} />}
        <LabeledInput label="Chipta sotuv (daqiqa)" value={sale} onChange={setSale} />
        <LabeledInput label="O'yin kutish (daqiqa)" value={wait} onChange={setWait} />
        <LabeledInput label="Spin (daqiqa)" value={spin} onChange={setSpin} />
        {!j.isFree && <LabeledInput label="Qaytarish (%)" value={refund} onChange={setRefund} />}
        <LabeledInput label="G'oliblar soni" value={slots} onChange={setSlots} />
      </div>
      <div className="text-[10px] text-muted-foreground">
        Har bir g'olib «Mukofot» summasini oladi. Jami to'lov: {formatMoney((parseInt(prize)||0) * (parseInt(slots)||1))} so'm
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => save(false)} disabled={busy}
          className="h-9 rounded-lg bg-success text-white text-xs font-semibold disabled:opacity-50">
          Saqlash
        </button>
        <button onClick={() => save(true)} disabled={busy}
          className="h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
          Yangi tur boshlash
        </button>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-lg bg-card border border-border px-2 text-xs" />
    </label>
  );
}


/* ---------- TRANSACTIONS ---------- */
function TransactionsAdmin({ onOpenUser }: { onOpenUser: (id: number) => void }) {
  const txs = useGame((s) => s.transactions);
  const users = useGame((s) => s.users);
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? txs : txs.filter((t) => t.type === filter);

  return (
    <div className="p-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {["all", "ticket", "win", "admin_add", "admin_sub", "deposit", "withdraw"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 px-3 rounded-full text-xs font-semibold whitespace-nowrap ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {f === "all" ? "Barchasi" : txTypeLabel(f)}
          </button>
        ))}
      </div>

      <div className="mt-3 card-soft rounded-2xl divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">Bo'sh</div>
        )}
        {filtered.map((t) => {
          const u = users[t.userId];
          return (
            <button
              key={t.id}
              onClick={() => onOpenUser(t.userId)}
              className="w-full p-3 flex items-center gap-3 text-left active:bg-muted"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.amount > 0 ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>
                {t.amount > 0 ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{txTypeLabel(t.type)}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {u?.firstName || t.userId} · @{u?.username} · {new Date(t.at).toLocaleString("ru-RU")}
                </div>
              </div>
              <div className={`text-sm font-bold shrink-0 ${t.amount > 0 ? "text-success" : "text-primary"}`}>
                {t.amount > 0 ? "+" : ""}{formatMoney(t.amount)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- STATS ---------- */
function StatsAdmin() {
  const users = useGame((s) => s.users);
  const jackpots = useGame((s) => s.jackpots);
  const txs = useGame((s) => s.transactions);
  const history = useGame((s) => s.history);

  const totalPaid = history.reduce((a, h) => a + h.amount, 0);
  const totalRevenue = txs.filter((t) => t.type === "ticket").reduce((a, t) => a + Math.abs(t.amount), 0);
  const active = Object.values(users).filter((u) => !u.banned).length;
  const banned = Object.values(users).length - active;

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Faol foydalanuvchilar" value={active.toString()} sub={`${banned} bloklangan`} icon={Users} />
        <StatCard label="Jami yutuq to'landi" value={formatMoney(totalPaid)} sub="so'm" icon={Trophy} />
        <StatCard label="Chipta daromadi" value={formatMoney(totalRevenue)} sub="so'm" icon={Ticket} />
        <StatCard label="Faol jackpot" value="2" sub="Haftalik + 3 kunlik" icon={TrendingUp} />
      </div>

      <div className="card-soft rounded-2xl p-4">
        <div className="font-semibold text-sm mb-2">Jackpot ishtirokchilari</div>
        {Object.values(jackpots).sort((a,b) => a.sortOrder - b.sortOrder).map((j) => (
          <div key={j.id} className="mt-3 flex justify-between text-xs">
            <span>{j.title}</span>
            <span className="font-semibold">{j.participants.length} ishtirokchi · {formatMoney(j.participants.length * j.ticketPrice)} so'm</span>
          </div>
        ))}
      </div>

      <div className="card-soft rounded-2xl p-4">
        <div className="font-semibold text-sm mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-primary" /> Ogohlantirishlar
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• {banned} ta foydalanuvchi bloklangan</li>
          <li>• {txs.filter((t) => t.type === "withdraw").length} ta yechish so'rovi</li>
          <li>• Server ulanmagan — barcha ma'lumot demo</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- SETTINGS ---------- */
function SettingsAdmin() {
  const earnEnabled = useGame((s) => s.earnEnabled);
  const bonusEnabled = useGame((s) => s.bonusEnabled);
  const [busy, setBusy] = useState(false);
  const [busyBonus, setBusyBonus] = useState(false);
  useEffect(() => { loadEarnSettings().catch(() => {}); loadBonusSettings().catch(() => {}); }, []);
  const toggleBonus = async () => {
    setBusyBonus(true);
    const res = await adminSetBonusEnabled(!bonusEnabled);
    setBusyBonus(false);
    if (!res?.ok) toast.error(res?.error || "Xatolik");
    else toast.success(!bonusEnabled ? "Bonus bo'limi yoqildi" : "Bonus bo'limi o'chirildi");
  };
  const toggle = async () => {
    setBusy(true);
    const res = await adminSetEarnEnabled(!earnEnabled);
    setBusy(false);
    if (!res?.ok) toast.error(res?.error || "Xatolik");
    else toast.success(!earnEnabled ? "Pul ishlash bo'limi yoqildi" : "Pul ishlash bo'limi o'chirildi");
  };
  return (
    <div className="p-4 space-y-3">
      <div className="card-soft rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Pul ishlash bo'limi</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              O'chirilsa foydalanuvchilar bu bo'limni umuman ko'rmaydi (reklama ko'rish orqali pul ishlash).
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={busy}
            className={`w-12 h-7 rounded-full relative transition-colors ${earnEnabled ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${earnEnabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Holat: <b className={earnEnabled ? "text-success" : "text-primary"}>{earnEnabled ? "Yoqilgan" : "O'chirilgan"}</b>
        </div>
      </div>

      <div className="card-soft rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Bonus bo'limi</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              O'chirilsa foydalanuvchilar Bonus bo'limini umuman ko'rmaydi (bir martalik 26 000 – 150 000 so'm bonus).
            </div>
          </div>
          <button
            onClick={toggleBonus}
            disabled={busyBonus}
            className={`w-12 h-7 rounded-full relative transition-colors ${bonusEnabled ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${bonusEnabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Holat: <b className={bonusEnabled ? "text-success" : "text-primary"}>{bonusEnabled ? "Yoqilgan" : "O'chirilgan"}</b>
        </div>
      </div>

      <X2Setting />
    </div>
  );
}

function X2Setting() {
  const [promo, setPromo] = useState<{ enabled: boolean; endsAt: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    getX2Promo().then(setPromo).catch(() => setPromo({ enabled: false, endsAt: 0 }));
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const enabled = !!promo?.enabled && (promo?.endsAt ?? 0) > Date.now();
  const left = () => {
    const ms = Math.max(0, (promo?.endsAt ?? 0) - Date.now());
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  const toggle = async () => {
    setBusy(true);
    const res = await adminSetX2Promo(!enabled);
    setBusy(false);
    if (!res?.ok) { toast.error(res?.error || "Xatolik"); return; }
    const p = await getX2Promo().catch(() => null);
    if (p) setPromo(p);
    toast.success(!enabled ? "2x bonus banneri yoqildi (24 soat)" : "2x bonus banneri o'chirildi");
  };
  return (
    <div className="card-soft rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">2x bonus banneri</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Har yoqilganda aksiya muddati 24 soatdan qayta boshlanadi. Bonusni qo'lda qo'shasiz.
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          className={`w-12 h-7 rounded-full relative transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">
        Holat: <b className={enabled ? "text-success" : "text-primary"}>{enabled ? "Yoqilgan" : "O'chirilgan"}</b>
        {enabled && <> · Aksiya muddati: <b className="text-success tabular-nums">{left()}</b></>}
      </div>
    </div>

  );
}

/* ---------- WITHDRAWALS ADMIN ---------- */
type WithdrawRow = {
  id: string; user_id: string; telegram_id: number; first_name: string; username: string | null; photo_url: string | null;
  amount: number; method: string; payment_details: string | null; status: string; admin_note: string | null;
  created_at: string; resolved_at: string | null; paid_at: string | null;
  queue_number: number | null;
};

function WithdrawalsAdmin() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).rpc("admin_list_withdraw_requests", { _status: tab, _limit: 1000 });
    setRows((data as WithdrawRow[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tab]);
  useEffect(() => {
    const ch = supabase
      .channel("admin-withdraws")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdraw_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Nusxa olindi"); } catch { toast.error("Nusxa olib bo'lmadi"); }
  };

  const resolve = async (id: string, approve: boolean) => {
    let note = "";
    if (!approve) {
      note = window.prompt("Rad etish sababi (foydalanuvchiga ko'rinadi, majburiy):") ?? "";
      if (!note.trim()) { toast.error("Sabab yozing"); return; }
    }
    const { data, error } = await adminResolveWithdraw(id, approve, note);
    if (error || (data as any)?.ok === false) {
      toast.error(error?.message || (data as any)?.error || "Xatolik");
    } else {
      toast.success(approve ? "Tasdiqlandi" : "Rad etildi");
      load();
    }
  };

  const markPaid = async (id: string) => {
    if (!window.confirm("Kartaga pul o'tkazildimi? To'landi deb belgilaymi?")) return;
    const { data, error } = await (supabase as any).rpc("admin_mark_withdraw_paid", { _id: id });
    if (error || (data as any)?.ok === false) toast.error(error?.message || (data as any)?.error || "Xatolik");
    else { toast.success("To'landi belgilandi"); load(); }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        {(["pending","approved","rejected"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-10 rounded-xl text-xs font-semibold ${tab===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>
            {t==="pending"?"Kutilmoqda":t==="approved"?"Tasdiqlangan":"Rad etilgan"}
          </button>
        ))}
      </div>
      {loading && <div className="text-center text-xs text-muted-foreground py-4">Yuklanmoqda…</div>}
      {!loading && rows.length === 0 && (
        <div className="card-soft rounded-2xl p-6 text-center text-sm text-muted-foreground">So'rov yo'q</div>
      )}
      <div className="space-y-2">
        {rows.map((r) => {
          const card = (r.payment_details || "").replace(/\D/g, "");
          const formatted = card.replace(/(.{4})/g, "$1 ").trim();
          return (
            <div key={r.id} className="card-soft rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-soft text-primary font-semibold flex items-center justify-center overflow-hidden">
                  {r.photo_url ? <img src={r.photo_url} alt="" className="w-full h-full object-cover" /> : (r.first_name?.[0] || "U")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.first_name} {r.username ? <span className="text-muted-foreground">@{r.username}</span> : null}</div>
                  <div className="text-[10px] text-muted-foreground">ID {r.telegram_id} · {new Date(r.created_at).toLocaleString("ru-RU")}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{formatMoney(r.amount)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{r.method}</div>
                  {r.queue_number != null && !r.paid_at && (
                    <div className="text-[10px] font-semibold text-blue-600">Navbat #{r.queue_number}</div>
                  )}
                </div>
              </div>
              <div className="mt-2 rounded-xl bg-muted p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground">Karta raqami</div>
                  <div className="font-mono text-sm tracking-widest truncate">{formatted || "—"}</div>
                </div>
                {card && (
                  <button onClick={() => copy(card)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" /> Nusxa
                  </button>
                )}
              </div>
              {r.admin_note && <div className="mt-2 text-[11px] text-muted-foreground">📝 {r.admin_note}</div>}
              {r.status === "pending" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => resolve(r.id, true)}
                    className="h-10 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" /> Tasdiqlash
                  </button>
                  <button onClick={() => resolve(r.id, false)}
                    className="h-10 rounded-xl bg-destructive text-white text-xs font-semibold flex items-center justify-center gap-1">
                    <X className="w-4 h-4" /> Rad etish
                  </button>
                </div>
              )}
              {r.status === "approved" && !r.paid_at && (
                <>
                  <div className="mt-2 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Admin o'tkazyapti · {r.resolved_at ? new Date(r.resolved_at).toLocaleString("ru-RU") : ""}
                  </div>
                  <button onClick={() => markPaid(r.id)}
                    className="mt-2 w-full h-10 rounded-xl bg-success text-white text-xs font-semibold flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" /> To'landi (kartaga o'tkazildi)
                  </button>
                </>
              )}
              {r.status === "approved" && r.paid_at && (
                <div className="mt-2 text-[11px] font-semibold text-success">
                  ✅ To'landi · {new Date(r.paid_at).toLocaleString("ru-RU")}
                </div>
              )}
              {r.status === "rejected" && (
                <div className="mt-2 text-[11px] font-semibold text-destructive">
                  ❌ Rad etilgan {r.resolved_at ? `· ${new Date(r.resolved_at).toLocaleString("ru-RU")}` : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- DEPOSITS ADMIN ---------- */
type DepositRow = {
  id: string; user_id: string; telegram_id: number; first_name: string; username: string | null;
  amount: number; method: string; payment_details: string | null; status: string; admin_note: string | null;
  created_at: string; resolved_at: string | null;
};
function DepositsAdmin() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<DepositRow[]>([]);
  async function load() {
    const { data } = await (supabase as any).rpc("admin_list_deposit_requests", { _status: tab, _limit: 1000 });
    setRows((data as DepositRow[]) || []);
  }
  useEffect(() => { load(); }, [tab]);
  useEffect(() => {
    const ch = supabase
      .channel("admin-deposits")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  const resolve = async (id: string, approve: boolean) => {
    let note = "";
    if (!approve) {
      note = window.prompt("Rad etish sababi (foydalanuvchiga ko'rinadi, majburiy):") ?? "";
      if (!note.trim()) { toast.error("Sabab yozing"); return; }
    }
    const { data, error } = await adminResolveDeposit(id, approve, note);
    if (error || (data as any)?.ok === false) toast.error(error?.message || (data as any)?.error || "Xatolik");
    else { toast.success(approve ? "Tasdiqlandi" : "Rad etildi"); load(); }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        {(["pending","approved","rejected"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-10 rounded-xl text-xs font-semibold ${tab===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>
            {t==="pending"?"Kutilmoqda":t==="approved"?"Tasdiqlangan":"Rad etilgan"}
          </button>
        ))}
      </div>
      {rows.length === 0 && <div className="card-soft rounded-2xl p-6 text-center text-sm text-muted-foreground">So'rov yo'q</div>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="card-soft rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{r.first_name} {r.username ? <span className="text-muted-foreground">@{r.username}</span> : null}</div>
                <div className="text-[10px] text-muted-foreground">ID {r.telegram_id} · {new Date(r.created_at).toLocaleString("ru-RU")}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-success">+{formatMoney(r.amount)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{r.method}</div>
              </div>
            </div>
            {r.status === "pending" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => resolve(r.id, true)} className="h-10 rounded-xl bg-success text-white text-xs font-semibold flex items-center justify-center gap-1">
                  <Check className="w-4 h-4" /> Tasdiqlash
                </button>
                <button onClick={() => resolve(r.id, false)} className="h-10 rounded-xl bg-destructive text-white text-xs font-semibold flex items-center justify-center gap-1">
                  <X className="w-4 h-4" /> Rad etish
                </button>
              </div>
            ) : (
              <div className={`mt-2 text-[11px] font-semibold ${r.status==="approved"?"text-success":"text-destructive"}`}>
                {r.status==="approved"?"✅ Tasdiqlangan":"❌ Rad etilgan"}
                {r.admin_note ? ` · ${r.admin_note}` : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- PROMO CODES ---------- */
function PromosAdmin() {
  const [rows, setRows] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [reward, setReward] = useState("1000");
  const [maxUses, setMaxUses] = useState("100");
  const [hours, setHours] = useState("72");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setRows(await adminListPromoCodes());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const c = code.trim().toUpperCase();
    if (!c || busy) return;
    setBusy(true);
    const res = await adminCreatePromoCode(c, Number(reward) || 0, Number(maxUses) || 1, Number(hours) || 0);
    setBusy(false);
    if (res?.ok) {
      toast.success("Promokod yaratildi");
      setCode("");
      load();
    } else {
      toast.error(res?.error || "Xatolik");
    }
  };

  const genRandom = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "LUMO";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setCode(out);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="card-soft rounded-2xl p-4 space-y-3">
        <div className="text-sm font-semibold">Yangi promokod</div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KOD"
            className="flex-1 h-11 rounded-xl bg-muted px-3 text-sm font-bold tracking-wider outline-none"
          />
          <button onClick={genRandom} className="h-11 px-3 rounded-xl bg-muted text-xs font-semibold">Random</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <LabeledInput label="Mukofot" value={reward} onChange={setReward} />
          <LabeledInput label="Limit" value={maxUses} onChange={setMaxUses} />
          <LabeledInput label="Soat (0=cheksiz)" value={hours} onChange={setHours} />
        </div>
        <button
          onClick={create}
          disabled={busy || !code.trim()}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          Yaratish
        </button>
      </div>

      {loading && <div className="text-center text-xs text-muted-foreground py-6">Yuklanmoqda...</div>}
      {!loading && rows.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-6">Promokodlar yo'q</div>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const expired = r.expiresAt != null && r.expiresAt < Date.now();
          return (
            <div key={r.id} className="card-soft rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm tracking-wider">{r.code}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {formatMoney(r.reward)} so'm · {r.usedCount}/{r.maxUses} ishlatilgan
                    {r.expiresAt != null && ` · ${expired ? "muddati tugagan" : new Date(r.expiresAt).toLocaleString("uz-UZ")}`}
                  </div>
                </div>
                <button
                  onClick={async () => { await adminSetPromoActive(r.id, !r.active); load(); }}
                  className={`h-9 px-3 rounded-xl text-xs font-semibold ${r.active && !expired ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                >
                  {r.active ? "Faol" : "O'chiq"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`${r.code} o'chirilsinmi?`)) return;
                    await adminDeletePromoCode(r.id);
                    load();
                  }}
                  className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
