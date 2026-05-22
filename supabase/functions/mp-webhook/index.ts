import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id",
};

// Map MP preapproval status -> our subscription status
function mapStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "authorized":
      return "active";
    case "paused":
      return "paused";
    case "cancelled":
      return "expired";
    case "pending":
      return "trialing";
    default:
      return "trialing";
  }
}

const PLAN_DAYS = 30;

function isPixPayment(payment: any) {
  return payment?.payment_type_id === "bank_transfer" || payment?.payment_method_id === "pix";
}

type SubscriptionRow = {
  status: string | null;
  provider_subscription_id: string | null;
};

async function activatePixSubscription(adminClient: SupabaseClient<any>, payment: any) {
  const externalRef: string = payment?.external_reference || "";
  const parts = externalRef.split(":");
  const userId = parts[0] || "";
  const planId = parts[1] || null;

  if (!userId || !planId || payment?.status !== "approved" || !isPixPayment(payment)) {
    return;
  }

  const { data: currentSub } = await adminClient
    .from("subscriptions")
    .select("status, provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle<SubscriptionRow>();

  const alreadyActivated =
    currentSub?.status === "active" &&
    String(currentSub?.provider_subscription_id || "") === String(payment.id);

  if (alreadyActivated) return;

  const periodEnd = new Date(Date.now() + PLAN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: updateError } = await adminClient
    .from("subscriptions")
    .update({
      status: "active",
      plan_id: planId,
      payment_provider: "mercadopago",
      provider_subscription_id: String(payment.id),
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("payment activation error:", updateError);
    return;
  }

  try {
    await adminClient.functions.invoke("send-welcome-email", {
      body: { userId, planId },
    });
  } catch (emailError) {
    console.warn("Welcome email dispatch failed (non-fatal):", emailError);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "MP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MP sends notifications via query string (?type=...&data.id=...) or JSON body
    const url = new URL(req.url);
    const queryType = url.searchParams.get("type") || url.searchParams.get("topic");
    const queryId = url.searchParams.get("data.id") || url.searchParams.get("id");

    let bodyJson: any = {};
    try {
      bodyJson = await req.json();
    } catch {
      // ignore
    }

    const type: string = queryType || bodyJson?.type || bodyJson?.topic || "";
    const resourceId: string = queryId || bodyJson?.data?.id || bodyJson?.id || "";

    // SECURITY: validate Mercado Pago x-signature to prevent webhook replay/forgery
    // (e.g., re-activating an expired subscription by replaying an old payment
    // notification). See MP webhook security docs.
    const webhookSecret = Deno.env.get("MP_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("mp-webhook: MP_WEBHOOK_SECRET not configured — refusing request");
      return new Response(JSON.stringify({ error: "webhook not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    {
      const xSignature = req.headers.get("x-signature") || "";
      const xRequestId = req.headers.get("x-request-id") || "";
      const parts = Object.fromEntries(
        xSignature.split(",").map((p) => {
          const [k, v] = p.split("=");
          return [k?.trim(), v?.trim()];
        }),
      );
      const ts = parts.ts;
      const v1 = parts.v1;
      const dataId = (resourceId || "").toString().toLowerCase();
      if (!ts || !v1 || !dataId) {
        console.warn("mp-webhook: missing signature components");
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
      const computed = Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (computed !== v1) {
        console.warn("mp-webhook: signature mismatch");
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    console.log("MP webhook received:", { type, resourceId });

    if (!type || !resourceId) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (type === "subscription_preapproval" || type === "preapproval") {
      const res = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const preapproval = await res.json();
      if (!res.ok) {
        console.error("Failed to fetch preapproval:", preapproval);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const externalRef: string = preapproval.external_reference || "";
      const [userId, planId] = externalRef.split(":");
      const newStatus = mapStatus(preapproval.status);

      if (userId) {
        const { error: upErr } = await adminClient
          .from("subscriptions")
          .update({
            status: newStatus,
            plan_id: planId || null,
            payment_provider: "mercadopago",
            provider_subscription_id: preapproval.id,
            provider_customer_id: preapproval.payer_id ? String(preapproval.payer_id) : null,
            current_period_end: preapproval.next_payment_date ?? null,
          })
          .eq("user_id", userId);

        if (upErr) console.error("subscription update error:", upErr);
      }
    }

    if (type === "payment") {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payment = await res.json();
      if (!res.ok) {
        console.error("Failed to fetch payment:", payment);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Payment received:", {
        id: payment.id,
        status: payment.status,
        payment_type_id: payment.payment_type_id,
        payment_method_id: payment.payment_method_id,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
      });

      await activatePixSubscription(adminClient, payment);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mp-webhook error:", err);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
