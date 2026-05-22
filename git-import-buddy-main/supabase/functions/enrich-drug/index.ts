import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkAiQuota, logAiUsage } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeForIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quota = await checkAiQuota(supabase, user.id);
    if (!quota.allowed) {
      return new Response(JSON.stringify({ error: quota.message }), {
        status: quota.status ?? 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    void logAiUsage(supabase, quota.ownerId, "enrich-drug");

    const body = await req.json();
    const { name, active_ingredient, commercial_name, drug_class, species, indications, dosage, contraindications, adverse_effects, interactions, withdrawal_period } = body;

    if (!name && !active_ingredient) {
      return new Response(JSON.stringify({ error: "name or active_ingredient is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Search reference DB for context using sanitized input
    const searchTerm = sanitizeForIlike((name || active_ingredient || "").trim().toLowerCase());
    const { data: refDrugs } = await supabase
      .from("drug_reference")
      .select("*")
      .or(`name.ilike.%${searchTerm}%,active_ingredient.ilike.%${searchTerm}%,commercial_name.ilike.%${searchTerm}%`)
      .limit(3);

    const referenceContext = refDrugs && refDrugs.length > 0
      ? `\n\nDados de REFERÊNCIA do banco oficial:\n${refDrugs.map((r: any) =>
          `- ${r.name} (${r.commercial_name}): PA: ${r.active_ingredient}, Classe: ${r.drug_class}, Espécies: ${r.species}, Indicações: ${r.indications}, Posologia: ${r.dosage}, Contraindicações: ${r.contraindications}, Efeitos adversos: ${r.adverse_effects}, Interações: ${r.interactions}, Carência: ${r.withdrawal_period}`
        ).join("\n")}`
      : "";

    const prompt = `Você é um farmacologista veterinário especialista. O usuário está cadastrando um medicamento e preencheu parcialmente os dados. Complete TODOS os campos faltantes com informações corretas baseadas na farmacologia veterinária.

Dados fornecidos pelo usuário:
- Nome genérico: ${name || "NÃO INFORMADO"}
- Nome comercial: ${commercial_name || "NÃO INFORMADO"}
- Princípio ativo: ${active_ingredient || "NÃO INFORMADO"}
- Classe farmacológica: ${drug_class || "NÃO INFORMADO"}
- Espécies indicadas: ${species || "NÃO INFORMADO"}
- Indicações: ${indications || "NÃO INFORMADO"}
- Posologia: ${dosage || "NÃO INFORMADO"}
- Contraindicações: ${contraindications || "NÃO INFORMADO"}
- Efeitos adversos: ${adverse_effects || "NÃO INFORMADO"}
- Interações: ${interactions || "NÃO INFORMADO"}
- Período de carência: ${withdrawal_period || "NÃO INFORMADO"}
${referenceContext}

INSTRUÇÕES:
1. Se o nome genérico estiver incorreto ou for um nome comercial, CORRIJA para o nome genérico correto.
2. PREENCHA todos os campos marcados como "NÃO INFORMADO" com dados corretos.
3. Se dados existentes estiverem incorretos, CORRIJA-OS.
4. Use os dados de referência quando disponíveis.
5. Para posologia, inclua dosagem por espécie quando aplicável.
6. Retorne TODOS os campos, mesmo os que já estavam corretos.

Use a função enrich_drug_data para retornar os dados completos.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um farmacologista veterinário. Complete e corrija dados de medicamentos. Responda em português." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "enrich_drug_data",
              description: "Retorna dados completos e corrigidos do medicamento",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome genérico correto" },
                  commercial_name: { type: "string", description: "Nomes comerciais conhecidos" },
                  active_ingredient: { type: "string", description: "Princípio ativo correto" },
                  drug_class: { type: "string", description: "Classe farmacológica" },
                  species: { type: "string", description: "Espécies indicadas" },
                  indications: { type: "string", description: "Indicações clínicas" },
                  dosage: { type: "string", description: "Posologia detalhada por espécie" },
                  contraindications: { type: "string", description: "Contraindicações" },
                  adverse_effects: { type: "string", description: "Efeitos adversos" },
                  interactions: { type: "string", description: "Interações medicamentosas" },
                  withdrawal_period: { type: "string", description: "Período de carência" },
                  notes: { type: "string", description: "Explicação das correções/adições feitas" },
                },
                required: ["name", "active_ingredient", "notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "enrich_drug_data" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", aiResponse.status);
      const status = aiResponse.status;
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "AI credits exhausted" }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI enrichment failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let enrichedData: Record<string, string> = {};
    let enrichNotes = "";

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        enrichNotes = args.notes || "";
        enrichedData = {
          name: args.name || name || "",
          commercial_name: args.commercial_name || commercial_name || "",
          active_ingredient: args.active_ingredient || active_ingredient || "",
          drug_class: args.drug_class || drug_class || "",
          species: args.species || species || "",
          indications: args.indications || indications || "",
          dosage: args.dosage || dosage || "",
          contraindications: args.contraindications || contraindications || "",
          adverse_effects: args.adverse_effects || adverse_effects || "",
          interactions: args.interactions || interactions || "",
          withdrawal_period: args.withdrawal_period || withdrawal_period || "",
        };
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ enriched: enrichedData, notes: enrichNotes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("enrich-drug error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
