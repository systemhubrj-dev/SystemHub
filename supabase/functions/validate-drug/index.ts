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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    void logAiUsage(supabase, quota.ownerId, "validate-drug");

    const { drug_id } = await req.json();
    if (!drug_id || typeof drug_id !== "string") {
      return new Response(JSON.stringify({ error: "drug_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(drug_id)) {
      return new Response(JSON.stringify({ error: "Invalid drug_id format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Use the authenticated user's client to fetch the drug (respects RLS)
    const { data: drug, error: fetchErr } = await supabase
      .from("drug_catalog")
      .select("*")
      .eq("id", drug_id)
      .single();

    if (fetchErr || !drug) {
      return new Response(JSON.stringify({ error: "Drug not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: only the owner of the drug entry (or a platform admin) may trigger
    // re-validation. Without this check, any authenticated user could use the
    // service-role update path below to corrupt official/community drugs.
    const adminCheck = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRow } = await adminCheck
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const isPlatformAdmin = !!isAdminRow;
    if (!isPlatformAdmin && drug.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden: você só pode validar medicamentos do seu próprio cadastro." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check reference database for this drug (sanitize for ilike)
    const sanitizedName = sanitizeForIlike(drug.name);
    const sanitizedIngredient = sanitizeForIlike(drug.active_ingredient);
    const { data: refDrugs } = await supabase
      .from("drug_reference")
      .select("*")
      .or(`name.ilike.%${sanitizedName}%,active_ingredient.ilike.%${sanitizedIngredient}%`)
      .limit(3);

    const referenceContext = refDrugs && refDrugs.length > 0
      ? `\n\nDados de REFERÊNCIA encontrados no banco de dados oficial:\n${refDrugs.map((r: any) => 
          `- ${r.name} (${r.commercial_name}): Princípio ativo: ${r.active_ingredient}, Classe: ${r.drug_class}, Espécies: ${r.species}, Indicações: ${r.indications}, Posologia: ${r.dosage}, Contraindicações: ${r.contraindications}, Efeitos adversos: ${r.adverse_effects}, Interações: ${r.interactions}, Carência: ${r.withdrawal_period}`
        ).join("\n")}`
      : "";

    const prompt = `Você é um farmacologista veterinário especialista. Valide e COMPLETE os seguintes dados de um medicamento veterinário.

Dados cadastrados pelo usuário:
- Nome genérico: ${drug.name}
- Nome comercial: ${drug.commercial_name || "NÃO INFORMADO"}
- Princípio ativo: ${drug.active_ingredient}
- Classe farmacológica: ${drug.drug_class || "NÃO INFORMADO"}
- Espécies indicadas: ${drug.species || "NÃO INFORMADO"}
- Indicações: ${drug.indications || "NÃO INFORMADO"}
- Posologia: ${drug.dosage || "NÃO INFORMADO"}
- Contraindicações: ${drug.contraindications || "NÃO INFORMADO"}
- Efeitos adversos: ${drug.adverse_effects || "NÃO INFORMADO"}
- Interações: ${drug.interactions || "NÃO INFORMADO"}
- Período de carência: ${drug.withdrawal_period || "NÃO INFORMADO"}
${referenceContext}

INSTRUÇÕES:
1. Compare com os dados de referência (se disponíveis) e com seu conhecimento.
2. Se houver campos NÃO INFORMADOS ou incorretos, PREENCHA-OS com dados corretos.
3. Se o princípio ativo estiver trocado com o nome comercial, CORRIJA.
4. Retorne status "needs_review" se você preencheu/corrigiu campos, com os dados sugeridos.
5. Retorne status "approved" se todos os dados estão corretos e completos.
6. Retorne status "rejected" APENAS se o medicamento não existe ou os dados são perigosos/impossíveis de corrigir.

Use a função validate_and_complete para retornar sua avaliação.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um farmacologista veterinário. Valide e complete entradas de medicamentos. Sempre preencha campos faltantes quando possível. Responda em português." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_and_complete",
              description: "Retorna validação e dados completos/corrigidos do medicamento",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["approved", "needs_review", "rejected"],
                  },
                  notes: { type: "string" },
                  suggested_data: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      commercial_name: { type: "string" },
                      active_ingredient: { type: "string" },
                      drug_class: { type: "string" },
                      species: { type: "string" },
                      indications: { type: "string" },
                      dosage: { type: "string" },
                      contraindications: { type: "string" },
                      adverse_effects: { type: "string" },
                      interactions: { type: "string" },
                      withdrawal_period: { type: "string" },
                    },
                    required: ["name", "commercial_name", "active_ingredient", "drug_class", "species", "indications", "dosage", "contraindications", "adverse_effects", "interactions", "withdrawal_period"],
                    additionalProperties: false,
                  },
                },
                required: ["status", "notes", "suggested_data"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "validate_and_complete" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", aiResponse.status);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI validation failed", validation_status: "pending" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let validationStatus = "pending";
    let validationNotes = "Validação automática indisponível no momento.";
    let suggestedData: Record<string, string> | null = null;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        validationStatus = args.status === "approved" ? "approved" : args.status === "needs_review" ? "needs_review" : "rejected";
        validationNotes = args.notes || "Sem observações.";
        suggestedData = args.suggested_data || null;
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr);
    }

    // Use service role client for updating drug_catalog (since the user may not own the record for approved drugs)
    const adminSupabase = createClient(supabaseUrl, serviceKey);

    if (validationStatus === "approved") {
      await adminSupabase
        .from("drug_catalog")
        .update({ validation_status: "approved", validation_notes: validationNotes })
        .eq("id", drug_id);
    } else if (validationStatus === "needs_review") {
      const reviewPayload = JSON.stringify({ notes: validationNotes, suggested_data: suggestedData });
      await adminSupabase
        .from("drug_catalog")
        .update({ validation_status: "needs_review", validation_notes: reviewPayload })
        .eq("id", drug_id);
    } else {
      await adminSupabase
        .from("drug_catalog")
        .update({ validation_status: "rejected", validation_notes: validationNotes })
        .eq("id", drug_id);
    }

    return new Response(
      JSON.stringify({ validation_status: validationStatus, validation_notes: validationNotes, suggested_data: suggestedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("validate-drug error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
