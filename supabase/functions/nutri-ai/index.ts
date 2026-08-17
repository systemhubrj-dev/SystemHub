import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { checkAiQuota, logAiUsage } from "../_shared/ai-quota.ts";

import { corsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Você é uma assistente nutricional do SystemHub Nutri.
Gera planos alimentares personalizados em JSON estrito, em português brasileiro.
Use 5-6 refeições (café, lanche manhã, almoço, lanche tarde, jantar, ceia) com horários sugeridos.
Calcule kcal e macros (proteína, carboidrato, gordura) por item.
Respeite restrições, alergias e objetivo. NUNCA inclua disclaimers no JSON.

Responda SEMPRE com JSON válido no formato:
{
  "title": "string",
  "total_kcal": number,
  "total_protein_g": number,
  "total_carb_g": number,
  "total_fat_g": number,
  "notes": "string curta",
  "items": [
    { "meal_name": "Café da manhã", "meal_time": "07:00", "food": "Aveia em flocos", "quantity": "40g", "kcal": 150, "protein_g": 5, "carb_g": 27, "fat_g": 3 }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const quota = await checkAiQuota(supabase, userId);
    if (!quota.allowed) {
      return new Response(JSON.stringify({ error: quota.message }), { status: quota.status ?? 402, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }

    const { mode = "meal_plan", patient = {}, extra = "" } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    void logAiUsage(supabase, quota.ownerId, "nutri-ai");

    const userPrompt = mode === "meal_plan"
      ? `Gere um plano alimentar para o paciente:
Nome: ${patient.name ?? "—"}
Sexo: ${patient.sex ?? "—"} | Nascimento: ${patient.birth_date ?? "—"}
Peso: ${patient.weight_kg ?? "—"} kg | Altura: ${patient.height_cm ?? "—"} cm | %BF: ${patient.body_fat ?? "—"}
Objetivo: ${patient.goal ?? "saúde"}
Restrições alimentares: ${patient.restrictions ?? "nenhuma"}
Alergias: ${patient.allergies ?? "nenhuma"}
Condições médicas: ${patient.conditions ?? "nenhuma"}
Instruções extras: ${extra || "—"}

Retorne APENAS o JSON do plano alimentar, sem explicações adicionais.`
      : `Resuma a evolução do paciente em até 5 linhas: ${JSON.stringify(patient)}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido." }), { status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error:", aiRes.status, text);
      throw new Error("Falha na IA");
    }
    const aiData = await aiRes.json();
    const content = aiData.content?.[0]?.text ?? "{}";
    let plan: any = {};
    try { plan = JSON.parse(content); } catch { plan = { title: "Plano alimentar", items: [], notes: content }; }
    return new Response(JSON.stringify({ plan }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
  }
});
