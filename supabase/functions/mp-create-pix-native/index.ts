import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, { name: string; price: number }> = {
  essencial: { name: "Plano Essencial (PIX - 30 dias)", price: 89.90 },
  profissional: { name: "Plano Profissional (PIX - 30 dias)", price: 139.90 },
  clinica: { name: "Plano Clínica IA+ (PIX - 30 dias)", price: 199.90 },
};

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
    const userEmail = claimsData.claims.email as string;

    const body = await req.json().catch(() => ({}));
    const planId = String(body?.planId ?? "");
    const plan = PLAN_PRICES[planId];

    if (!plan) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cria pagamento PIX direto (sem precisar de conta MP)
    const idempotencyKey = `${userId}-${planId}-${Date.now()}`;
    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const paymentPayload = {
      transaction_amount: plan.price,
      description: plan.name,
      payment_method_id: "pix",
      date_of_expiration: expirationDate,
      payer: {
        email: userEmail,
      },
      external_reference: `${userId}:${planId}:pix`,
      notification_url: "https://mtraazefhqlhyzwpdtyn.supabase.co/functions/v1/mp-webhook",
      metadata: { user_id: userId, plan_id: planId, payment_type: "pix_native" },
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP payment error:", mpData);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar PIX", details: mpData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
    const ticketUrl = mpData?.point_of_interaction?.transaction_data?.ticket_url ?? null;

    // Marca o plano escolhido na assinatura para o webhook conseguir ativar
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient
      .from("subscriptions")
      .update({
        plan_id: planId,
        payment_provider: "mercadopago",
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        payment_id: mpData.id,
        status: mpData.status,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: ticketUrl,
        amount: plan.price,
        expires_at: expirationDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mp-create-pix-native error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
