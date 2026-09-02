import { createFileRoute } from "@tanstack/react-router";
import { json, preflight } from "@/lib/cors";
import { verifyTelegramInitData } from "@/lib/telegram-verify";

async function getAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function referralCodeFor(tid: number): string {
  return "R" + tid.toString(36).toUpperCase().padStart(4, "0");
}

export const Route = createFileRoute("/api/public/telegram/auth")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { initData?: string; devTelegramId?: number };
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (!botToken) return json({ error: "Bot token missing" }, { status: 500 });

          let tgUser: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };

          if (body.initData) {
            const v = await verifyTelegramInitData(body.initData, botToken);
            if (!v.ok) return json({ error: v.error }, { status: 401 });
            tgUser = v.user;
          } else if (body.devTelegramId) {
            // Guest / browser fallback (used outside Telegram Mini App)
            tgUser = {
              id: Number(body.devTelegramId),
              first_name: "Guest" + body.devTelegramId,
              username: "guest" + body.devTelegramId,
            };
          } else {
            return json({ error: "initData required" }, { status: 400 });
          }

          const admin = await getAdmin();
          const email = `tg-${tgUser.id}@internal.local`;

          // Upsert profile / create auth user
          let userId: string | null = null;
          const { data: existing } = await admin
            .from("profiles")
            .select("id, first_name, username, photo_url")
            .eq("telegram_id", tgUser.id)
            .maybeSingle();

          if (existing) {
            userId = existing.id;
            // Refresh identity fields from Telegram
            await admin
              .from("profiles")
              .update({
                first_name: tgUser.first_name,
                last_name: tgUser.last_name ?? null,
                username: tgUser.username ?? null,
                photo_url: tgUser.photo_url ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          } else {
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: { telegram_id: tgUser.id, username: tgUser.username },
            });
            if (createErr || !created?.user) {
              // Auth user already exists (e.g. profile row was removed). Resolve its id
              // reliably via generateLink, which returns the user for an existing email.
              const { data: existingLink } = await admin.auth.admin.generateLink({
                type: "magiclink",
                email,
              });
              let found = existingLink?.user?.id ?? null;
              if (!found) {
                // Fallback: paginate through auth users.
                for (let page = 1; page <= 20 && !found; page += 1) {
                  const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
                  const match = list?.users?.find((u) => u.email === email);
                  if (match) found = match.id;
                  if (!list?.users?.length || list.users.length < 1000) break;
                }
              }
              if (!found) {
                return json({ error: "createUser failed: " + (createErr?.message ?? "") }, { status: 500 });
              }
              userId = found;
            } else {
              userId = created.user.id;
            }
            await admin.from("profiles").upsert({
              id: userId,
              telegram_id: tgUser.id,
              first_name: tgUser.first_name,
              last_name: tgUser.last_name ?? null,
              username: tgUser.username ?? null,
              photo_url: tgUser.photo_url ?? null,
              referral_code: referralCodeFor(tgUser.id),
            }, { onConflict: "id" });
            await admin.from("audit_log").insert({
              user_id: userId,
              actor: "system",
              action: "Ro'yxatdan o'tdi",
              details: `Telegram ID ${tgUser.id}`,
            });
          }

          // Admin role is granted ONLY to the configured owner Telegram ID.
          // No first-user / fallback promotion — that previously granted admin
          // to random users when the role lookup failed.
          const adminEnv = process.env.TELEGRAM_ADMIN_TELEGRAM_ID;
          if (adminEnv && Number(adminEnv) === tgUser.id) {
            await admin.from("user_roles").upsert(
              { user_id: userId, role: "admin" },
              { onConflict: "user_id,role" },
            );
          }

          // Issue a magiclink for the client to verifyOtp with
          const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email,
          });
          if (linkErr || !link) {
            return json({ error: "link failed: " + (linkErr?.message ?? "") }, { status: 500 });
          }

          return json({
            ok: true,
            email,
            token_hash: link.properties.hashed_token,
            telegram_id: tgUser.id,
          });
        } catch (e) {
          return json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
