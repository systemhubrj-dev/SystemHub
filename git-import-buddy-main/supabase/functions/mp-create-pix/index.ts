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

    const origin = req.headers.get("origin") ?? "https://github-my-darling.lovable.app";

    // Preferência de checkout com PIX habilitado (pagamento avulso de 30 dias)
    const preferencePayload = {
      items: [
        {
          title: plan.name,
          quantity: 1,
          unit_price: plan.price,
          currency_id: "BRL",
        },
      ],
      payer: { email: userEmail },
      external_reference: `${userId}:${planId}:pix`,
      back_urls: {
        success: `${origin}/dashboard/meu-plano?status=success`,
        failure: `${origin}/dashboard/meu-plano?status=failed`,
        pending: `${origin}/dashboard/meu-plano?status=pending`,
      },
      auto_return: "approved",
      payment_methods: {
        // Força apenas PIX como meio de pagamento
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" },
          { id: "atm" },
          { id: "prepaid_card" },
          { id: "digital_currency" },
        ],
        default_payment_method_id: "pix",
        installments: 1,
      },
      // Expira em 30 minutos para o PIX não ficar pendente eternamente
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: { user_id: userId, plan_id: planId, payment_type: "pix_oneoff" },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP preference error:", mpData);
      return new Response(
        JSON.stringify({ error: "Falha ao criar pagamento PIX", details: mpData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        preference_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mp-create-pix error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
