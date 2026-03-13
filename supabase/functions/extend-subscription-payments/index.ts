/**
 * extend-subscription-payments
 *
 * Supabase Edge Function — scheduled monthly roller.
 * Calls extend_active_subscription_payments() in the database, which finds
 * every active subscription whose next payment is due and inserts the row.
 *
 * Schedule: 02:00 UTC on the 1st of every month (set in Supabase Dashboard)
 * Cron expression: 0 2 1 * *
 *
 * Uses the SERVICE_ROLE key so it can call the DB function which is
 * restricted to service_role only.
 *
 * No external dependencies. Safe to invoke multiple times — the underlying
 * DB function is fully idempotent (ON CONFLICT DO NOTHING).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req: Request): Promise<Response> => {
  const startedAt = new Date().toISOString();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Call the rolling generator — returns one row per payment created
    const { data, error } = await supabase.rpc(
      "extend_active_subscription_payments"
    );

    if (error) {
      console.error("[extend-subscription-payments] DB error:", error.message);
      return new Response(
        JSON.stringify({ ok: false, error: error.message, startedAt }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const created = Array.isArray(data) ? data : [];

    console.log(
      `[extend-subscription-payments] ${startedAt} — ${created.length} payment row(s) created`
    );
    if (created.length > 0) {
      console.log(JSON.stringify(created, null, 2));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        startedAt,
        rowsCreated: created.length,
        rows: created,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[extend-subscription-payments] Unexpected error:", message);
    return new Response(
      JSON.stringify({ ok: false, error: message, startedAt }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
