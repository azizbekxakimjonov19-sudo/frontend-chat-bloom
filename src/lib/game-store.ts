/**
 * Supabase-backed game store. Preserves the same public API previously served by the
 * in-memory demo store so existing UI components keep working with minimal edits.
 *
 * State is populated from the Cloud DB and kept live via Supabase Realtime.
 * Actions call SECURITY DEFINER Postgres RPCs — all business logic runs in the DB.
 */
import { useRef, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Types (kept compatible with UI) ---------- */
export type JackpotId = string;

export type Participant = {
  userId: number;         // telegram_id (kept as number for UI compatibility)
  username: string;
  firstName: string;
  photo?: string;
  joinedAt: number;
  ticketId: string;       // ticket_code
};

export type TxType =
  | "deposit" | "withdraw" | "ticket" | "win" | "refund"
  | "admin_add" | "admin_sub";

export type Transaction = {
  id: string;
  userId: number;
  type: TxType;
  amount: number;
  note?: string;
  at: number;
};

export type AuditEntry = {
  id: string;
  at: number;
  actor: "admin" | "system" | "user";
  action: string;
  details?: string;
};

export type TicketStatus = "active" | "won" | "refunded" | "finished";

export type UserTicket = {
  jackpotId: JackpotId;
  ticketId: string;
  at: number;
  price: number;
  status: TicketStatus;
  wonAmount?: number;
  roundEndsAt: number;
};

export type UserRecord = {
  id: number;              // telegram_id
  authId: string;          // supabase auth user id (UUID)
  username: string;
  firstName: string;
  lastName?: string;
  photo?: string;
  balance: number;
  withdrawBalance: number;
  banned: boolean;
  isAdmin: boolean;
  joinedAt: number;
  tickets: UserTicket[];
  audit: AuditEntry[];
};

export type LastWinner = {
  userId: number;
  firstName: string;
  username: string;
  photo?: string;
  at: number;
  amount: number;
  ticketsBought: number;
};

export type JackpotState = {
  id: JackpotId;
  title: string;
  prize: number;
  ticketPrice: number;
  refundPercent: number;
  saleHours: number;
  waitHours: number;
  spinMinutes: number;
  winnerSlots: number;
  openedAt: number;
  endsAt: number;
  participants: Participant[];
  drawing: boolean;
  frozen: boolean;
  lastWinner?: LastWinner;
  winners: LastWinner[];
  isFree: boolean;
  loaded: boolean;
  active: boolean;
  sortOrder: number;
};

export type HistoryEntry = {
  id: string;
  jackpotId: JackpotId;
  winnerId: number;
  winnerName: string;
  winnerUsername: string;
  winnerPhoto?: string;
  amount: number;
  at: number;
};

export type WithdrawalEntry = {
  id: string;
  telegramId: number;
  firstName: string;
  username: string;
  photo?: string;
  amount: number;
  resolvedAt: number;
};

export type MyWithdrawRequest = {
  id: string;
  amount: number;
  method: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: number;
  resolvedAt?: number;
  paidAt?: number;
  queueNumber?: number;
};

export type RatingEntry = {
  telegramId: number;
  firstName: string;
  username: string;
  photo?: string;
  score: number;
};

export type Investment = {
  id: string;
  amount: number;
  days: number;
  percent: number;
  payout: number;
  status: "active" | "claimed";
  startedAt: number;
  endsAt: number;
  claimedAt?: number;
};

export type GameState = {
  ready: boolean;
  authError: string | null;
  currentUserId: number;
  users: Record<number, UserRecord>;
  jackpots: Record<string, JackpotState>;
  transactions: Transaction[];
  history: HistoryEntry[];
  recentWithdrawals: WithdrawalEntry[];
  totalWithdrawn: number;
  myWithdrawRequests: MyWithdrawRequest[];
  topBalances: RatingEntry[];
  topReferrers: RatingEntry[];
  earnEnabled: boolean;
  bonusEnabled: boolean;
  adStatus: { count: number; limit: number; amount: number; nextResetAt: number } | null;
  investments: Investment[];
};


export type BonusStatus = {
  enabled: boolean;
  status: "none" | "pending" | "claimed" | "expired";
  amount: number;
  expiresAt: number;
  nextSpinAt: number;
};

/* ---------- Safe defaults ---------- */
const emptyMe: UserRecord = {
  id: 0, authId: "", username: "", firstName: "Guest",
  balance: 0, withdrawBalance: 0, banned: false, isAdmin: false,
  joinedAt: Date.now(), tickets: [], audit: [],
};

function initialState(): GameState {
  return {
    ready: false, authError: null,
    currentUserId: 0, users: { 0: { ...emptyMe } },
    jackpots: {},
    transactions: [], history: [],
    recentWithdrawals: [], totalWithdrawn: 0,
    myWithdrawRequests: [],
    topBalances: [], topReferrers: [],
    earnEnabled: true, bonusEnabled: true, adStatus: null,
    investments: [],
  };
}

/* ---------- Store ---------- */
let state: GameState = initialState();
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function setState(u: (s: GameState) => GameState) { state = u(state); emit(); }
export function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function getState() { return state; }

export function useGame<T>(selector: (s: GameState) => T): T {
  const cache = useRef<{ state: GameState; value: T } | null>(null);
  const getSnap = () => {
    if (cache.current && cache.current.state === state) return cache.current.value;
    const value = selector(state);
    cache.current = { state, value };
    return value;
  };
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}

/* ---------- Formatting helpers ---------- */
export function formatMoney(n: number) {
  return (n ?? 0).toLocaleString("ru-RU").replace(/,/g, " ");
}
export function formatTime(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d} kun ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
export function saleEndsAt(j: JackpotState) { return j.openedAt + j.saleHours * 60000; }
export function isSaleOpen(j: JackpotState, now = Date.now()) { return now < saleEndsAt(j); }

/* ---------- Row → domain mappers ---------- */
function rowToProfile(r: any, isAdmin: boolean, authId: string): UserRecord {
  return {
    id: Number(r.telegram_id), authId,
    username: r.username ?? "", firstName: r.first_name ?? "User", lastName: r.last_name ?? undefined,
    photo: r.photo_url ?? undefined,
    balance: Number(r.balance ?? 0), withdrawBalance: Number(r.withdraw_balance ?? 0),
    banned: !!r.banned, isAdmin,
    joinedAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    tickets: [], audit: [],
  };
}

function rowToJackpot(r: any): JackpotState {
  return {
    id: String(r.id), title: r.title,
    prize: Number(r.prize), ticketPrice: Number(r.ticket_price),
    refundPercent: Number(r.refund_percent), saleHours: Number(r.sale_hours),
    waitHours: Number(r.wait_hours), spinMinutes: Number(r.spin_minutes),
    winnerSlots: Number(r.winner_slots ?? 1),
    isFree: !!r.is_free,
    winners: [],
    openedAt: new Date(r.opened_at).getTime(), endsAt: new Date(r.ends_at).getTime(),
    participants: [], drawing: !!r.drawing, frozen: !!r.frozen, loaded: true,
    active: r.active !== false,
    sortOrder: Number(r.sort_order ?? 0),
    lastWinner: r.last_winner_telegram_id ? {
      userId: Number(r.last_winner_telegram_id),
      firstName: r.last_winner_name ?? "",
      username: r.last_winner_username ?? "",
      photo: r.last_winner_photo ?? undefined,
      at: r.last_winner_at ? new Date(r.last_winner_at).getTime() : Date.now(),
      amount: Number(r.last_winner_amount ?? 0),
      ticketsBought: Number(r.last_winner_tickets ?? 0),
    } : undefined,
  };
}

function rowToParticipant(r: any): Participant {
  return {
    userId: Number(r.telegram_id), username: r.username ?? "", firstName: r.first_name ?? "",
    photo: r.photo_url ?? undefined,
    joinedAt: new Date(r.created_at).getTime(), ticketId: r.ticket_code,
  };
}

function rowToHistory(r: any): HistoryEntry {
  return {
    id: r.id, jackpotId: String(r.jackpot_id),
    winnerId: Number(r.winner_telegram_id), winnerName: r.winner_name,
    winnerUsername: r.winner_username ?? "",
    winnerPhoto: r.winner_photo ?? undefined,
    amount: Number(r.amount), at: new Date(r.drawn_at).getTime(),
  };
}

/* ---------- Data loaders ---------- */
async function loadJackpots() {
  const { data } = await (supabase as any).from("jackpots").select("*").order("sort_order");
  if (!data) return;
  setState((s) => {
    const jp: Record<string, JackpotState> = {};
    for (const r of data) {
      const j = rowToJackpot(r);
      j.participants = s.jackpots[j.id]?.participants ?? [];
      j.winners = s.jackpots[j.id]?.winners ?? [];
      jp[j.id] = j;
    }
    return { ...s, jackpots: jp };
  });
}

/** Winners of each jackpot's most recent completed round (all winner slots). */
async function loadWinners() {
  const { data } = await supabase
    .from("tickets")
    .select("jackpot_id, telegram_id, first_name, username, photo_url, won_amount, round_ends_at, created_at")
    .eq("status", "won")
    .order("created_at", { ascending: false })
    .limit(500);
  if (!data) return;
  setState((s) => {
    const jp: Record<string, JackpotState> = {};
    for (const [id, j] of Object.entries(s.jackpots)) jp[id] = { ...j, winners: [] };
    const seen = new Set<string>();
    for (const r of data as any[]) {
      const id = String(r.jackpot_id);
      const j = jp[id];
      if (!j) continue;
      // only winners of the round that is currently displayed
      if (new Date(r.round_ends_at).getTime() !== j.endsAt) continue;
      const key = id + ":" + r.telegram_id;
      if (seen.has(key)) continue;
      seen.add(key);
      j.winners.push({
        userId: Number(r.telegram_id),
        firstName: r.first_name ?? "",
        username: r.username ?? "",
        photo: r.photo_url ?? undefined,
        at: new Date(r.created_at).getTime(),
        amount: Number(r.won_amount ?? j.prize),
        ticketsBought: 0,
      });
    }
    return { ...s, jackpots: jp };
  });
}
export { loadWinners };

async function loadParticipants() {
  const { data } = await supabase
    .from("tickets")
    .select("id, jackpot_id, telegram_id, username, first_name, photo_url, ticket_code, created_at, status")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (!data) return;
  setState((s) => {
    const jp: Record<string, JackpotState> = {};
    for (const [id, j] of Object.entries(s.jackpots)) {
      jp[id] = { ...j, participants: [] };
    }
    for (const r of data) {
      const id = String(r.jackpot_id);
      if (!jp[id]) continue;
      jp[id].participants.push(rowToParticipant(r));
    }
    return { ...s, jackpots: jp };
  });
}

async function loadHistory() {
  const { data } = await supabase
    .from("history")
    .select("*")
    .order("drawn_at", { ascending: false })
    .limit(50);
  if (!data) return;
  setState((s) => ({ ...s, history: data.map(rowToHistory) }));
}

async function loadUsers() {
  // Load profiles (up to 200 for rating/admin) + role info for isAdmin flag on current user list.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("balance", { ascending: false })
    .limit(200);
  const { data: roles } = await supabase.from("user_roles").select("user_id, role");
  const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
  if (!profiles) return;
  setState((s) => {
    const users: Record<number, UserRecord> = {};
    for (const p of profiles) {
      const rec = rowToProfile(p, adminIds.has(p.id), p.id);
      users[rec.id] = rec;
    }
    // Preserve current user (even if not in top-200 profiles) and guest fallback
    const me = s.users[s.currentUserId];
    if (me) {
      if (users[me.id]) {
        users[me.id] = { ...users[me.id], tickets: me.tickets, audit: me.audit };
      } else {
        users[me.id] = me;
      }
    }
    if (!users[0] && s.users[0]) users[0] = s.users[0];
    return { ...s, users };
  });
}

async function loadMyDetails() {
  const { data: session } = await supabase.auth.getSession();
  const authId = session.session?.user.id;
  if (!authId) return;
  const [{ data: tickets }, { data: txs }, { data: audit }, { data: myProfile }] = await Promise.all([
    supabase.from("tickets").select("*").eq("user_id", authId).order("created_at", { ascending: false }).limit(200),
    supabase.from("transactions").select("*").eq("user_id", authId).order("created_at", { ascending: false }).limit(200),
    supabase.from("audit_log").select("*").eq("user_id", authId).order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("*").eq("id", authId).maybeSingle(),
  ]);
  setState((s) => {
    const meId = s.currentUserId;
    const me = s.users[meId];
    if (!me) return s;
    const uTickets: UserTicket[] = (tickets ?? []).map((t) => ({
      jackpotId: String(t.jackpot_id),
      ticketId: t.ticket_code,
      at: new Date(t.created_at).getTime(),
      price: Number(t.price),
      status: t.status as TicketStatus,
      wonAmount: t.won_amount ?? undefined,
      roundEndsAt: new Date(t.round_ends_at).getTime(),
    }));
    const uAudit: AuditEntry[] = (audit ?? []).map((a) => ({
      id: a.id, at: new Date(a.created_at).getTime(),
      actor: a.actor as any, action: a.action, details: a.details ?? undefined,
    }));
    const uTxs: Transaction[] = (txs ?? []).map((t) => ({
      id: t.id, userId: meId, type: t.type as TxType,
      amount: Number(t.amount), note: t.note ?? undefined,
      at: new Date(t.created_at).getTime(),
    }));
    const refreshed: UserRecord = myProfile
      ? {
          ...me,
          username: (myProfile as any).username ?? me.username,
          firstName: (myProfile as any).first_name ?? me.firstName,
          lastName: (myProfile as any).last_name ?? me.lastName,
          photo: (myProfile as any).photo_url ?? me.photo,
          balance: Number((myProfile as any).balance ?? 0),
          withdrawBalance: Number((myProfile as any).withdraw_balance ?? 0),
          banned: !!(myProfile as any).banned,
          tickets: uTickets, audit: uAudit,
        }
      : { ...me, tickets: uTickets, audit: uAudit };
    return {
      ...s,
      users: { ...s.users, [meId]: refreshed },
      transactions: uTxs,
    };
  });
}

/* ---------- Earn / ad status ---------- */
export async function loadEarnSettings() {
  const { data } = await (supabase as any).from("app_settings").select("key, value").eq("key", "earn_enabled").maybeSingle();
  const enabled = data ? (data.value === true || data.value === "true") : true;
  setState((s) => ({ ...s, earnEnabled: enabled }));
}
export async function loadAdStatus() {
  const { data } = await (supabase as any).rpc("get_ad_status");
  if (!data) return;
  setState((s) => ({
    ...s,
    earnEnabled: !!data.enabled,
    adStatus: {
      count: Number(data.count ?? 0),
      limit: Number(data.limit ?? 4),
      amount: Number(data.amount ?? 600),
      nextResetAt: data.next_reset_at ? new Date(data.next_reset_at).getTime() : 0,
    },
  }));
}
export async function claimAdReward(): Promise<{ ok: boolean; error?: string; count?: number; amount?: number }> {
  const { data, error } = await (supabase as any).rpc("claim_ad_reward");
  if (error) return { ok: false, error: error.message };
  await Promise.all([loadAdStatus(), loadMyDetails()]);
  return data as any;
}
export async function adminSetEarnEnabled(enabled: boolean) {
  const { data, error } = await (supabase as any).rpc("admin_set_earn_enabled", { _enabled: enabled });
  if (error) return { ok: false, error: error.message };
  await loadEarnSettings();
  return data as any;
}

/* ---------- Bonus ---------- */
export async function loadBonusSettings() {
  const { data } = await (supabase as any).from("app_settings").select("key, value").eq("key", "bonus_enabled").maybeSingle();
  const enabled = data ? (data.value === true || data.value === "true") : true;
  setState((s) => ({ ...s, bonusEnabled: enabled }));
}
export async function getBonusStatus(): Promise<BonusStatus | null> {
  const { data } = await (supabase as any).rpc("get_bonus_status");
  if (!data) return null;
  setState((s) => ({ ...s, bonusEnabled: !!data.enabled }));
  return {
    enabled: !!data.enabled,
    status: (data.status ?? "none") as BonusStatus["status"],
    amount: Number(data.amount ?? 0),
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : 0,
    nextSpinAt: data.next_spin_at ? new Date(data.next_spin_at).getTime() : 0,
  };
}
export async function spinBonus(): Promise<{ ok: boolean; error?: string; amount?: number; expires_at?: string }> {
  const { data, error } = await (supabase as any).rpc("spin_bonus");
  if (error) return { ok: false, error: error.message };
  return data as any;
}
export async function claimBonus(): Promise<{ ok: boolean; error?: string; amount?: number; need?: number }> {
  const { data, error } = await (supabase as any).rpc("claim_bonus");
  if (error) return { ok: false, error: error.message };
  if ((data as any)?.ok) await loadMyDetails();
  return data as any;
}
export async function adminSetBonusEnabled(enabled: boolean) {
  const { data, error } = await (supabase as any).rpc("admin_set_bonus_enabled", { _enabled: enabled });
  if (error) return { ok: false, error: error.message };
  await loadBonusSettings();
  return data as any;
}

/* ---------- Investments (omonat) ---------- */
export async function loadInvestments() {
  const { data } = await (supabase as any)
    .from("investments")
    .select("id, amount, days, percent, payout, status, started_at, ends_at, claimed_at")
    .order("created_at", { ascending: false });
  const list: Investment[] = (data ?? []).map((r: any) => ({
    id: r.id,
    amount: Number(r.amount),
    days: Number(r.days),
    percent: Number(r.percent),
    payout: Number(r.payout),
    status: r.status,
    startedAt: new Date(r.started_at).getTime(),
    endsAt: new Date(r.ends_at).getTime(),
    claimedAt: r.claimed_at ? new Date(r.claimed_at).getTime() : undefined,
  }));
  setState((s) => ({ ...s, investments: list }));
}
export async function createInvestment(amount: number, days: number): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await (supabase as any).rpc("create_investment", { _amount: amount, _days: days });
  if (error) return { ok: false, error: error.message };
  await Promise.all([loadInvestments(), loadMyDetails()]);
  return data as any;
}
export async function claimInvestment(id: string): Promise<{ ok: boolean; error?: string; payout?: number }> {
  const { data, error } = await (supabase as any).rpc("claim_investment", { _id: id });
  if (error) return { ok: false, error: error.message };
  await Promise.all([loadInvestments(), loadMyDetails()]);
  return data as any;
}

async function resolveAuthId(userIdTg: number): Promise<string | null> {
  const local = state.users[userIdTg]?.authId;
  if (local) return local;
  // Try public profiles read (works if RLS permits it — profiles is public read here)
  const { data: p } = await (supabase as any).from("profiles").select("id").eq("telegram_id", userIdTg).maybeSingle();
  if (p?.id) return p.id;
  // Admin-only fallback
  const { data: uid } = await (supabase as any).rpc("admin_get_user_auth_id", { _telegram_id: userIdTg });
  return uid ?? null;
}

/* ---------- Bootstrap / auth ---------- */
let realtimeSetup = false;
function setupRealtime() {
  if (realtimeSetup) return;
  realtimeSetup = true;
  supabase
    .channel("public-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "jackpots" }, () => { loadJackpots().then(() => loadWinners()); })
    .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => { loadParticipants(); loadWinners(); loadMyDetails(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => { loadUsers(); loadTopBalances(); loadTopReferrers(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "history" }, () => loadHistory())
    .on("postgres_changes", { event: "*", schema: "public", table: "withdraw_requests" }, () => {
      loadRecentWithdrawals(); loadTotalWithdrawn(); loadMyWithdrawRequests();
    })
    .subscribe();
  // Polling fallback so UI stays fresh even if realtime lags.
  setInterval(() => {
    loadParticipants().catch(() => {});
    loadMyDetails().catch(() => {});
    loadMyWithdrawRequests().catch(() => {});
    loadJackpots().then(() => loadWinners()).catch(() => {});
  }, 5000);
  setInterval(() => {
    loadRecentWithdrawals().catch(() => {});
    loadTotalWithdrawn().catch(() => {});
    loadTopBalances().catch(() => {});
    loadTopReferrers().catch(() => {});
  }, 15000);
}

/** Telegram initData'ni har qanday klientdan olish (SDK bo'lmasa URL hash/query'dan). */
export function readTelegramInitData(tg?: any): string {
  const fromSdk: string | undefined = tg?.initData ?? (globalThis as any)?.Telegram?.WebApp?.initData;
  if (fromSdk && fromSdk.length > 0) return fromSdk;
  if (typeof window === "undefined") return "";
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const fromHash = new URLSearchParams(hash).get("tgWebAppData");
    if (fromHash) return fromHash;
    const fromQuery = new URLSearchParams(window.location.search).get("tgWebAppData");
    if (fromQuery) return fromQuery;
  } catch {
    /* ignore */
  }
  return "";
}

function safeLocal(key: string, value?: string): string | null {
  try {
    if (value !== undefined) { window.localStorage.setItem(key, value); return value; }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function initFromTelegram(tg: any) {
  try {
    // Public data — safe without auth
    loadJackpots().then(() => loadWinners()).catch(() => {});
    loadHistory().catch(() => {});
    loadRecentWithdrawals().catch(() => {});
    loadTotalWithdrawn().catch(() => {});
    loadTopBalances().catch(() => {});
    loadTopReferrers().catch(() => {});
    loadEarnSettings().catch(() => {});
    loadBonusSettings().catch(() => {});

    const initData = readTelegramInitData(tg);
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
      (typeof window !== "undefined" ? window.location.origin : "");

    let body: Record<string, unknown> = {};
    if (initData && initData.length > 0) {
      body = { initData };
    } else if (import.meta.env.DEV || (typeof window !== "undefined" && /lovable\.app$/.test(window.location.hostname))) {
      let devId = Number(safeLocal("dev_tg_id"));
      if (!devId) { devId = Math.floor(Math.random() * 1_000_000) + 900_000_000; safeLocal("dev_tg_id", String(devId)); }
      body = { devTelegramId: devId };
    } else {
      setState((s) => ({ ...s, authError: "Telegram initData yo'q. Botni qayta oching." }));
      return;
    }


    const res = await fetch(`${apiBase}/api/public/telegram/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const authJson = await res.json();
    if (!res.ok || !authJson.ok) {
      setState((s) => ({ ...s, authError: authJson.error ?? "Auth xatosi" }));
      return;
    }

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: authJson.token_hash,
      type: "email",
    });
    if (verifyErr) {
      setState((s) => ({ ...s, authError: verifyErr.message }));
      return;
    }

    const tid = Number(authJson.telegram_id);
    setState((s) => ({
      ...s,
      currentUserId: tid,
      users: { ...s.users, [tid]: s.users[tid] ?? { ...emptyMe, id: tid } },
    }));

    await Promise.all([loadJackpots(), loadUsers(), loadParticipants(), loadHistory(),
      loadRecentWithdrawals(), loadTotalWithdrawn(), loadTopBalances(), loadTopReferrers()]);
    await loadWinners().catch(() => {});
    await Promise.all([loadMyDetails(), loadMyWithdrawRequests(), loadAdStatus()]);
    await loadInvestments().catch(() => {});
    setupRealtime();
    setState((s) => ({ ...s, ready: true }));
  } catch (e) {
    setState((s) => ({ ...s, authError: (e as Error).message }));
  }
}


/* ---------- Actions ---------- */
export async function buyTicket(jackpotId: JackpotId): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("buy_ticket", { _jackpot_id: jackpotId });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; error?: string };
  return r;
}

export async function requestDeposit(amount: number, method: string, details = ""): Promise<{ ok: boolean; error?: string }> {
  if (!amount || amount <= 0) return { ok: false, error: "Miqdor noto'g'ri" };
  const { data, error } = await supabase.rpc("request_deposit", { _amount: amount, _method: method, _details: details });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export async function requestWithdraw(amount: number, method: string, details = ""): Promise<{ ok: boolean; error?: string }> {
  if (!amount || amount <= 0) return { ok: false, error: "Miqdor noto'g'ri" };
  const { data, error } = await supabase.rpc("request_withdraw", { _amount: amount, _method: method, _details: details });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export type ConversionStatus = { pending: boolean; amount?: number; executeAt?: number };
export async function getConversionStatus(): Promise<ConversionStatus> {
  const { data, error } = await (supabase as any).rpc("get_conversion_status");
  if (error || !data?.ok) return { pending: false };
  return {
    pending: !!data.pending,
    amount: data.amount ? Number(data.amount) : undefined,
    executeAt: data.execute_at ? new Date(data.execute_at).getTime() : undefined,
  };
}
export async function requestConversion(): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await (supabase as any).rpc("request_conversion");
  if (error) return { ok: false, error: error.message };
  await loadMyDetails();
  return data as any;
}



export function drawWinner(jackpotId: JackpotId, _onComplete?: (winner: Participant) => void) {
  // Fire-and-forget: server executes atomically and realtime pushes new state.
  supabase.rpc("draw_jackpot", { _id: jackpotId }).then(({ error }) => {
    if (error) console.error("draw_jackpot", error);
  });
}

export async function adminSetBalance(userIdTg: number, delta: number, note: string): Promise<{ ok: boolean; error?: string }> {
  const authId = await resolveAuthId(userIdTg);
  if (!authId) return { ok: false, error: "Foydalanuvchi topilmadi" };
  const { data, error } = await supabase.rpc("admin_adjust_balance", { _user_id: authId, _delta: delta, _note: note });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export async function adminSetWithdrawBalance(userIdTg: number, delta: number, note: string): Promise<{ ok: boolean; error?: string }> {
  const authId = await resolveAuthId(userIdTg);
  if (!authId) return { ok: false, error: "Foydalanuvchi topilmadi" };
  const { data, error } = await supabase.rpc("admin_adjust_withdraw_balance", { _user_id: authId, _delta: delta, _note: note });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export async function adminToggleBan(userIdTg: number): Promise<{ ok: boolean; error?: string }> {
  const authId = await resolveAuthId(userIdTg);
  if (!authId) return { ok: false, error: "Foydalanuvchi topilmadi" };
  const { data, error } = await supabase.rpc("admin_toggle_ban", { _user_id: authId });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export async function adminUpdateJackpot(id: JackpotId, patch: Partial<JackpotState> & { reset?: boolean }): Promise<{ ok: boolean; error?: string }> {
  const j = state.jackpots[id];
  if (!j) return { ok: false, error: "Jackpot topilmadi" };
  const { data, error } = await supabase.rpc("admin_update_jackpot", {
    _id: id,
    _prize: patch.prize ?? j.prize,
    _ticket_price: patch.ticketPrice ?? j.ticketPrice,
    _refund_percent: patch.refundPercent ?? j.refundPercent,
    _sale_hours: patch.saleHours ?? j.saleHours,
    _wait_hours: patch.waitHours ?? j.waitHours,
    _spin_minutes: patch.spinMinutes ?? j.spinMinutes,
    _winner_slots: patch.winnerSlots ?? j.winnerSlots ?? 1,
    _reset: patch.reset ?? false,
  } as any);
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export async function adminCreateJackpot(input: {
  id: string; title: string;
  prize?: number; ticketPrice?: number; refundPercent?: number;
  saleHours?: number; waitHours?: number; spinMinutes?: number; winnerSlots?: number;
  isFree?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await (supabase as any).rpc("admin_create_jackpot", {
    _id: input.id, _title: input.title,
    _prize: input.prize ?? 100000, _ticket_price: input.ticketPrice ?? 1000,
    _refund_percent: input.refundPercent ?? 10,
    _sale_hours: input.saleHours ?? 60, _wait_hours: input.waitHours ?? 60,
    _spin_minutes: input.spinMinutes ?? 15, _winner_slots: input.winnerSlots ?? 1,
    _is_free: input.isFree ?? false,
  });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export async function adminRenameJackpot(id: string, title: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await (supabase as any).rpc("admin_rename_jackpot", { _id: id, _title: title });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

export async function adminDeleteJackpot(id: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await (supabase as any).rpc("admin_delete_jackpot", { _id: id });
  if (error) return { ok: false, error: error.message };
  return data as any;
}

/* ---------- Public loaders: withdrawals & rating ---------- */
export async function loadRecentWithdrawals() {
  const { data } = await (supabase as any).rpc("get_recent_withdrawals", { _limit: 20 });
  const list: WithdrawalEntry[] = (data ?? []).map((r: any) => ({
    id: r.id, telegramId: Number(r.telegram_id), firstName: r.first_name ?? "",
    username: r.username ?? "", photo: r.photo_url ?? undefined,
    amount: Number(r.amount), resolvedAt: r.resolved_at ? new Date(r.resolved_at).getTime() : 0,
  }));
  setState((s) => ({ ...s, recentWithdrawals: list }));
}
export async function loadTotalWithdrawn() {
  const { data } = await (supabase as any).rpc("get_total_withdrawn");
  setState((s) => ({ ...s, totalWithdrawn: Number(data ?? 0) }));
}
export async function loadTopBalances() {
  const { data } = await (supabase as any).rpc("get_top_balances", { _limit: 20 });
  const list: RatingEntry[] = (data ?? []).map((r: any) => ({
    telegramId: Number(r.telegram_id), firstName: r.first_name ?? "",
    username: r.username ?? "", photo: r.photo_url ?? undefined,
    score: Number(r.total_balance),
  }));
  setState((s) => ({ ...s, topBalances: list }));
}
export async function loadTopReferrers() {
  const { data } = await (supabase as any).rpc("get_top_referrers", { _limit: 20 });
  const list: RatingEntry[] = (data ?? []).map((r: any) => ({
    telegramId: Number(r.telegram_id), firstName: r.first_name ?? "",
    username: r.username ?? "", photo: r.photo_url ?? undefined,
    score: Number(r.referral_count),
  }));
  setState((s) => ({ ...s, topReferrers: list }));
}
export async function loadMyWithdrawRequests() {
  const { data: session } = await supabase.auth.getSession();
  const authId = session.session?.user.id;
  if (!authId) return;
  const { data } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("user_id", authId)
    .order("created_at", { ascending: false })
    .limit(50);
  const list: MyWithdrawRequest[] = (data ?? []).map((r: any) => ({
    id: r.id, amount: Number(r.amount), method: r.method,
    status: r.status, adminNote: r.admin_note ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    resolvedAt: r.resolved_at ? new Date(r.resolved_at).getTime() : undefined,
    paidAt: r.paid_at ? new Date(r.paid_at).getTime() : undefined,
    queueNumber: r.queue_number ?? undefined,
  }));
  setState((s) => ({ ...s, myWithdrawRequests: list }));
}


export async function adminResolveDeposit(id: string, approve: boolean, note = "") {
  return supabase.rpc("admin_resolve_deposit", { _id: id, _approve: approve, _note: note });
}
export async function adminResolveWithdraw(id: string, approve: boolean, note = "") {
  return supabase.rpc("admin_resolve_withdraw", { _id: id, _approve: approve, _note: note });
}

export function searchUsers(query: string): UserRecord[] {
  const q = query.trim().toLowerCase();
  const all = Object.values(state.users);
  if (!q) return all.slice(0, 30);
  return all.filter(
    (u) =>
      String(u.id).includes(q) ||
      (u.username ?? "").toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q),
  );
}

/* ---------- Safe accessors for UI ---------- */
export function currentUser(s: GameState = state): UserRecord {
  return s.users[s.currentUserId] ?? emptyMe;
}

/* ---------- Mini games (wheel / cards) ---------- */
export type MiniGameResult = { ok: boolean; error?: string; percent?: number; amount?: number; price?: number; base?: number; need?: number };
export async function playMiniGame(game: "wheel" | "cards"): Promise<MiniGameResult> {
  const { data, error } = await (supabase as any).rpc("play_minigame", { _game: game });
  if (error) return { ok: false, error: error.message };
  const res = data as MiniGameResult;
  if (res?.ok) await loadMyDetails();
  return res;
}
