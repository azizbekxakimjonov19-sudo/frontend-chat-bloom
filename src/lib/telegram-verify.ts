export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

/**
 * Verify Telegram Mini App initData signature.
 * Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(key: string | ArrayBuffer, value: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyBytes = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return globalThis.crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
}

function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): Promise<{ ok: false; error: string } | { ok: true; user: TelegramUser; authDate: number }> {
  if (!initData) return { ok: false, error: "empty initData" };
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "hash missing" };

  const dataCheck: string[] = [];
  params.forEach((v, k) => {
    if (k !== "hash") dataCheck.push(`${k}=${v}`);
  });
  dataCheck.sort();
  const dataCheckString = dataCheck.join("\n");

  const secretKey = await hmacSha256("WebAppData", botToken);
  const computed = bytesToHex(await hmacSha256(secretKey, dataCheckString));
  if (!constantTimeEqual(computed, hash)) return { ok: false, error: "bad hash" };

  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    return { ok: false, error: "expired" };
  }
  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, error: "user missing" };
  try {
    const user = JSON.parse(userRaw) as TelegramUser;
    return { ok: true, user, authDate };
  } catch {
    return { ok: false, error: "user parse" };
  }
}

export async function telegramWebhookSecret(botToken: string): Promise<string> {
  return bytesToBase64Url(await hmacSha256("TelegramWebhook", botToken));
}
