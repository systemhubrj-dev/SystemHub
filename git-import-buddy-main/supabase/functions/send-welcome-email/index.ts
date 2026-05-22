import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sends a welcome / subscription-activated email to the user.
 *
 * For now, this function logs the intent and best-effort tries the Lovable
 * Emails infrastructure (`send-transactional-email`). If the email
 * infrastructure isn't set up yet, it gracefully no-ops without failing
 * the caller (subscription activation should never break because of email).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // SECURITY: this endpoint is intended to be called only by other server-side
    // code (e.g., mp-webhook after a successful subscription activation). Require
    // either the service-role key or a valid user JWT to prevent unauthenticated
    // attackers from flooding arbitrary users' inboxes with welcome emails.
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const isServiceRole = bearer && bearer === serviceRoleKey;

    // SECURITY: only the service-role key can trigger welcome emails. This prevents
    // any authenticated user from sending welcome emails to arbitrary userIds.
    if (!isServiceRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId ?? "");
    const planId = String(body?.planId ?? "clinica");

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user email from auth + profile
    const { data: userRes } = await adminClient.auth.admin.getUserById(userId);
    const email = userRes?.user?.email ?? null;
    if (!email) {
      console.warn("send-welcome-email: no email for user", userId);
      return new Response(JSON.stringify({ ok: true, sent: false, reason: "no_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name, business_name")
      .eq("user_id", userId)
      .maybeSingle();

    const PLAN_NAMES: Record<string, string> = {
      essencial: "Essencial",
      profissional: "Profissional",
      clinica: "Clínica IA+",
    };
    const planName = PLAN_NAMES[planId] || planId;
    const userName = profile?.display_name || profile?.business_name || "Veterinário(a)";

    // Best-effort: try Lovable Emails transactional sender
    try {
      const { error: sendErr } = await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "subscription-welcome",
          recipientEmail: email,
          idempotencyKey: `subscription-welcome-${userId}-${planId}`,
          templateData: { name: userName, planName },
        },
      });
      if (sendErr) throw sendErr;
      console.log(`✉️  Welcome email queued for ${email} (${planName})`);
      return new Response(JSON.stringify({ ok: true, sent: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.warn("Lovable Emails not yet configured — welcome email skipped:", e);
      return new Response(
        JSON.stringify({ ok: true, sent: false, reason: "email_infra_not_ready" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("send-welcome-email error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
