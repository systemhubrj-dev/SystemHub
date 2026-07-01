import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { corsHeaders } from "../_shared/cors.ts";

interface CartItem {
  title: string;
  quantity: number;
  unit_price: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const body = await req.json().catch(() => ({}));
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : [];
    const externalRef = String(body?.externalReference ?? `${userId}:${Date.now()}`);

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Carrinho vazio" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Sanitize items
    const sanitized = items
      .map((it) => ({
        title: String(it.title ?? "Item").slice(0, 250),
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
        unit_price: Math.max(0, Number(it.unit_price) || 0),
        currency_id: "BRL",
      }))
      .filter((it) => it.unit_price > 0);

    if (sanitized.length === 0) {
      return new Response(JSON.stringify({ error: "Itens inválidos" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") ?? "https://github-my-darling.lovable.app";

    const preferencePayload = {
      items: sanitized,
      payer: { email: userEmail },
      external_reference: externalRef,
      back_urls: {
        success: `${origin}/dashboard?payment=success`,
        failure: `${origin}/dashboard?payment=failure`,
        pending: `${origin}/dashboard?payment=pending`,
      },
      auto_return: "approved",
      metadata: { user_id: userId },
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
        JSON.stringify({ error: "Falha ao criar pagamento", details: mpData }),
        { status: 502, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        preference_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mp-create-payment error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
