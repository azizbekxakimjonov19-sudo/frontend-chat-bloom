import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/draw")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Callable by pg_cron via apikey header (anon key) — bypasses public middleware auth.
        // We additionally require the service role key to invoke the DB fn via admin client.
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await admin.rpc("cron_auto_draw");
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, data });
      },
    },
  },
});
