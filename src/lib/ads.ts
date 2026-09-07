/* Ikki reklama tarmog'i: Monetag va Onclicka.
   Navbat bilan chiqadi; biri ishlamasa ikkinchisi o'rnini to'ldiradi. */

const MONETAG_FN = "show_11642131";
const ONCLICKA_SPOT = 6146347;

type ShowFn = () => Promise<unknown>;

let onclickaShow: ShowFn | null = null;
let onclickaInit: Promise<ShowFn | null> | null = null;
let turn = 0;

function getMonetag(): ShowFn | null {
  const fn = (window as any)?.[MONETAG_FN];
  return typeof fn === "function" ? (fn as ShowFn) : null;
}

async function waitFor<T>(get: () => T | null, timeout: number): Promise<T | null> {
  const t0 = Date.now();
  for (;;) {
    const v = get();
    if (v) return v;
    if (Date.now() - t0 >= timeout) return null;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function ensureScript(src: string, attrs?: Record<string, string>) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  if (attrs) for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

function ensureSdks() {
  ensureScript("https://libtl.com/sdk.js", { "data-zone": "11642131", "data-sdk": MONETAG_FN });
  ensureScript("https://js.onclckvd.com/in-stream-ad-admanager/tma.js");
}

export async function initAds(): Promise<void> {
  if (typeof window === "undefined") return;
  ensureSdks();
  if (!onclickaInit) {
    onclickaInit = (async () => {
      const init = await waitFor(() => (window as any)?.initCdTma ?? null, 10000);
      if (typeof init !== "function") return null;
      try {
        const show = await init({ id: ONCLICKA_SPOT });
        onclickaShow = typeof show === "function" ? (show as ShowFn) : null;
      } catch (e) {
        console.warn("onclicka init failed", e);
        onclickaShow = null;
      }
      return onclickaShow;
    })();
  }
  await onclickaInit;
}

async function getOnclicka(timeout = 8000): Promise<ShowFn | null> {
  if (onclickaShow) return onclickaShow;
  await initAds();
  if (onclickaShow) return onclickaShow;
  const v = await waitFor(() => onclickaShow, timeout);
  if (!v) onclickaInit = null; // keyingi urinishda qayta init qilinsin
  return v;
}


async function runMonetag(timeout: number): Promise<boolean> {
  const fn = getMonetag() ?? (await waitFor(getMonetag, timeout));
  if (!fn) return false;
  try {
    await fn();
    return true;
  } catch (e) {
    console.warn("monetag show failed", e);
    return false;
  }
}

async function runOnclicka(timeout: number): Promise<boolean> {
  const show = await getOnclicka(timeout);
  if (!show) return false;
  try {
    await show();
    return true;
  } catch (e) {
    console.warn("onclicka show failed", e);
    return false;
  }
}

/**
 * Bitta reklama ko'rsatadi.
 * @param prefer qaysi tarmoq birinchi urinsin ("auto" — navbat bilan)
 * @returns reklama muvaffaqiyatli ko'rsatildimi
 */
export async function showAd(prefer: "auto" | "onclicka" | "monetag" = "auto"): Promise<boolean> {
  if (typeof window !== "undefined") ensureSdks();
  const first: "onclicka" | "monetag" =
    prefer === "auto" ? (turn++ % 2 === 0 ? "monetag" : "onclicka") : prefer;

  const primary = first === "monetag" ? runMonetag : runOnclicka;
  const secondary = first === "monetag" ? runOnclicka : runMonetag;

  if (await primary(8000)) return true;
  // Birinchisi chiqmasa — ikkinchisi o'rnini to'ldiradi
  if (await secondary(8000)) return true;
  // Sekin internetda oxirgi urinish
  return primary(5000);
}

