import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_DAYS = 30;

function isPixPayment(payment: any) {
  return payment?.payment_type_id === "bank_transfer" || payment?.payment_method_id === "pix";
}

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.paymentId ?? "");

    if (!paymentId) {
      return new Response(JSON.stringify({ error: "paymentId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "MP não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao consultar pagamento", details: mpData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let activated = false;
    let planId: string | null = null;

    const externalReference = String(mpData?.external_reference || "");
    const [refUserId, refPlanId] = externalReference.split(":");

    if (mpData?.status === "approved" && isPixPayment(mpData) && refUserId === userId) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: subscription } = await adminClient
        .from("subscriptions")
        .select("status, plan_id, provider_subscription_id")
        .eq("user_id", userId)
        .maybeSingle();

      planId = refPlanId || subscription?.plan_id || null;
      const alreadyActivated =
        subscription?.status === "active" &&
        String(subscription?.provider_subscription_id || "") === String(mpData.id);

      if (!alreadyActivated && planId) {
        const periodEnd = new Date(Date.now() + PLAN_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await adminClient
          .from("subscriptions")
          .update({
            status: "active",
            plan_id: planId,
            payment_provider: "mercadopago",
            provider_subscription_id: String(mpData.id),
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (!updateError) {
          activated = true;
          try {
            await adminClient.functions.invoke("send-welcome-email", {
              body: { userId, planId },
            });
          } catch (emailError) {
            console.warn("Welcome email dispatch failed (non-fatal):", emailError);
          }
        } else {
          console.error("mp-check-payment activation error:", updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: mpData.status,
        status_detail: mpData.status_detail,
        activated,
        planId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mp-check-payment error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
