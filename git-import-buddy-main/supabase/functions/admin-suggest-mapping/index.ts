import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only platform admins
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: adm } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adm) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { headers, sample, fields, entity } = await req.json();
    if (!Array.isArray(headers) || !Array.isArray(fields)) {
      return new Response(JSON.stringify({ error: "Bad payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sys = `Você é um assistente que mapeia colunas de planilhas Excel para campos de um sistema veterinário. Receba a lista de colunas da planilha (com amostras) e a lista de campos alvo. Retorne, via tool call, o mapeamento mais provável (campo -> nome exato da coluna), ou string vazia quando não houver correspondência clara. Considere sinônimos em português e inglês (ex: "tutor", "cliente", "owner" -> name; "celular" -> phone; "data nasc" -> birth_date).`;

    const userMsg = `Entidade: ${entity}\n\nColunas da planilha:\n${headers.map((h: string) => {
      const sampleVals = (sample ?? []).slice(0, 3).map((r: any) => r?.[h]).filter((v: any) => v !== undefined && v !== "");
      return `- "${h}" (exemplos: ${JSON.stringify(sampleVals)})`;
    }).join("\n")}\n\nCampos alvo:\n${fields.map((f: any) => `- ${f.key} (${f.label})${f.required ? " [OBRIGATÓRIO]" : ""}`).join("\n")}`;

    const properties: any = {};
    for (const f of fields) properties[f.key] = { type: "string", description: `Nome exato da coluna da planilha que corresponde a ${f.label}, ou "" se nenhum.` };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
        tools: [{
          type: "function",
          function: {
            name: "set_mapping",
            description: "Define o mapeamento de campos -> coluna",
            parameters: { type: "object", properties, required: fields.map((f: any) => f.key), additionalProperties: false },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_mapping" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI: ${aiRes.status} ${t.slice(0, 300)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await aiRes.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(args || "{}"); } catch { mapping = {}; }

    // Sanitize: keep only valid header names
    const headerSet = new Set(headers);
    for (const k of Object.keys(mapping)) {
      if (!headerSet.has(mapping[k])) mapping[k] = "";
    }

    return new Response(JSON.stringify({ mapping }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
