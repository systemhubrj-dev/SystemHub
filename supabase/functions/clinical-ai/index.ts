import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiQuota, logAiUsage } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validação real do JWT contra o Supabase Auth — evita consumo indevido
    // de créditos de IA por tokens forjados/expirados.
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Faça login para usar a IA Clínica." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase env vars ausentes");
      return new Response(JSON.stringify({ error: "Serviço indisponível" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida. Faça login novamente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quota check
    const quota = await checkAiQuota(supabaseAuth, user.id);
    if (!quota.allowed) {
      return new Response(JSON.stringify({ error: quota.message }), {
        status: quota.status ?? 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, petData, symptoms, medications, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY ausente");
      return new Response(JSON.stringify({ error: "Serviço de IA não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validActions = ["diagnosis", "interactions", "protocol", "risk"];
    if (!action || !validActions.includes(action)) {
      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = `Você é um assistente de inteligência artificial veterinária. Suas respostas são SUGESTÕES para auxiliar o médico veterinário, que é sempre o decisor final.
Responda sempre em português brasileiro. Seja objetivo e clínico. Use formatação markdown.
IMPORTANTE: Sempre inclua no final "⚠️ Esta é uma sugestão de IA. O médico veterinário é o decisor final."`;

    let userPrompt = "";

    switch (action) {
      case "diagnosis":
        systemPrompt += "\nVocê deve sugerir diagnósticos diferenciais com base nos sinais clínicos apresentados.";
        userPrompt = `Dados do paciente:
- Espécie: ${petData?.species || "Não informada"}
- Raça: ${petData?.breed || "Não informada"}
- Idade: ${petData?.age || "Não informada"}
- Sexo: ${petData?.sex || "Não informado"}
- Castrado: ${petData?.neutered ? "Sim" : "Não"}
- Peso atual: ${petData?.weight ? petData.weight + " kg" : "Não informado"}

Sinais clínicos / Queixa: ${symptoms}

${history ? `Histórico clínico relevante:\n${history}` : ""}

Por favor, sugira:
1. Diagnósticos diferenciais (do mais provável ao menos provável)
2. Exames complementares recomendados
3. Possíveis fatores de risco a considerar`;
        break;

      case "interactions":
        systemPrompt += "\nVocê deve analisar interações medicamentosas entre os fármacos listados.";
        userPrompt = `Paciente:
- Espécie: ${petData?.species || "Não informada"}
- Peso: ${petData?.weight ? petData.weight + " kg" : "Não informado"}
- Idade: ${petData?.age || "Não informada"}

Medicamentos em uso ou a prescrever:
${medications?.map((m: string, i: number) => `${i + 1}. ${m}`).join("\n") || "Nenhum informado"}

Analise:
1. Interações medicamentosas conhecidas (graves, moderadas, leves)
2. Contraindicações para a espécie
3. Ajustes de dose recomendados
4. Alertas especiais (gestação, neonatos, nefropatas, hepatopatas)`;
        break;

      case "protocol":
        systemPrompt += "\nVocê deve sugerir protocolos terapêuticos baseados em evidências.";
        userPrompt = `Paciente:
- Espécie: ${petData?.species || "Não informada"}
- Raça: ${petData?.breed || "Não informada"}
- Peso: ${petData?.weight ? petData.weight + " kg" : "Não informado"}
- Idade: ${petData?.age || "Não informada"}

Diagnóstico / Condição: ${symptoms}

Sugira:
1. Protocolo terapêutico completo (medicamentos, doses, via, frequência, duração)
2. Cuidados de suporte
3. Monitoramento recomendado
4. Prognóstico geral
5. Alternativas terapêuticas`;
        break;

      case "risk":
        systemPrompt += "\nVocê deve avaliar o perfil de risco do paciente.";
        userPrompt = `Avalie o perfil de risco deste paciente:
- Espécie: ${petData?.species || "Não informada"}
- Raça: ${petData?.breed || "Não informada"}
- Idade: ${petData?.age || "Não informada"}
- Sexo: ${petData?.sex || "Não informado"}
- Castrado: ${petData?.neutered ? "Sim" : "Não"}
- Peso: ${petData?.weight ? petData.weight + " kg" : "Não informado"}
- Restrições: ${petData?.restrictions || "Nenhuma"}

${history ? `Histórico:\n${history}` : ""}

Identifique:
1. Fatores de risco (geriátrico, braquicefálico, predisposição racial, etc.)
2. Predisposições por raça
3. Cuidados especiais necessários
4. Exames preventivos recomendados
5. Alertas para procedimentos anestésicos`;
        break;
    }

    console.log(`[clinical-ai] action=${action} species=${petData?.species}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro na IA: " + (errText || response.statusText) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Sem resposta";

    void logAiUsage(supabaseAuth, quota.ownerId, `clinical-ai:${action}`);

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("clinical-ai error:", msg);
    return new Response(JSON.stringify({ error: "Erro interno: " + msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
