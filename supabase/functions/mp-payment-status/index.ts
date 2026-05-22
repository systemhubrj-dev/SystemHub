import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_DAYS = 30;

/**
 * Returns the most recent payment attempt for the authenticated user
 * by querying Mercado Pago directly with their external_reference.
 *
 * IMPORTANT: When it detects an APPROVED PIX payment that has not yet
 * activated the subscription (the webhook may not have arrived), it
 * automatically activates the subscription server-side using the service
 * role key. This way the user doesn't need to wait for MP's webhook.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ latest: null, activated: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // external_reference format: "<userId>:<planId>" or "<userId>:<planId>:pix"
    const ref = `${userId}:`;
    const url = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc&limit=10`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("MP search error:", data);
      return new Response(JSON.stringify({ latest: null, activated: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allResults = (data?.results || []).filter((p: any) =>
      String(p.external_reference || "").startsWith(`${userId}:`)
    );

    const latest = allResults[0];
    const approvedPix = allResults.find(
      (p: any) =>
        p.status === "approved" &&
        (p.payment_type_id === "bank_transfer" || p.payment_method_id === "pix")
    );

    let activated = false;
    let activatedPlanId: string | null = null;

    // Auto-activate subscription if there's an approved PIX payment
    if (approvedPix) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Check current subscription state
      const { data: sub } = await adminClient
        .from("subscriptions")
        .select("id, status, provider_subscription_id, plan_id, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      const externalRef: string = approvedPix.external_reference || "";
      const parts = externalRef.split(":");
      const planId = parts[1] || sub?.plan_id || null;
      activatedPlanId = planId;

      const periodEndValid =
        sub?.current_period_end && new Date(sub.current_period_end).getTime() > Date.now();

      // GUARD: if subscription is already active and period not expired, do nothing.
      // This prevents the "activation loop" caused by manual DB activation where
      // provider_subscription_id wasn't synced with the actual MP payment.id.
      if (sub?.status === "active" && periodEndValid) {
        // Silently sync provider_subscription_id if missing/divergent — but DO NOT
        // mark as activated, so the client doesn't redirect/reload in a loop.
        if (String(sub?.provider_subscription_id || "") !== String(approvedPix.id)) {
          await adminClient
            .from("subscriptions")
            .update({
              provider_subscription_id: String(approvedPix.id),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
      } else if (planId) {
        const periodEnd = new Date(Date.now() + PLAN_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const { error: upErr } = await adminClient
          .from("subscriptions")
          .update({
            status: "active",
            plan_id: planId,
            payment_provider: "mercadopago",
            provider_subscription_id: String(approvedPix.id),
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (upErr) {
          console.error("Subscription auto-activate error:", upErr);
        } else {
          activated = true;
          console.log(`✅ Auto-activated subscription for user ${userId} via PIX ${approvedPix.id}`);

          // Fire welcome email (best-effort, don't block)
          try {
            await adminClient.functions.invoke("send-welcome-email", {
              body: { userId, planId },
            });
          } catch (e) {
            console.warn("Welcome email dispatch failed (non-fatal):", e);
          }
        }
      }
    }

    if (!latest) {
      return new Response(JSON.stringify({ latest: null, activated, planId: activatedPlanId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        activated,
        planId: activatedPlanId,
        latest: {
          id: latest.id,
          status: latest.status,
          status_detail: latest.status_detail,
          amount: latest.transaction_amount,
          payment_method_id: latest.payment_method_id,
          payment_type_id: latest.payment_type_id,
          date_created: latest.date_created,
          date_approved: latest.date_approved,
          external_reference: latest.external_reference,
          last_four_digits: latest?.card?.last_four_digits ?? null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mp-payment-status error:", err);
    return new Response(JSON.stringify({ latest: null, activated: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
