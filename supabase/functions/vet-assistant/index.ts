import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { checkAiQuota, logAiUsage } from "../_shared/ai-quota.ts";

import { corsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Você é a assistente virtual do VetCare, um sistema de gestão veterinária.
Você atende veterinários por VOZ e TEXTO. Responda SEMPRE em português brasileiro de forma natural, curta e amigável (1-2 frases).

CAPACIDADES (use as tools disponíveis):
- Cadastrar produtos no estoque (entrada de compras)
- Cadastrar pets (faça perguntas se faltar info: nome, espécie, raça, sexo, idade, dono)
- Cadastrar clientes (peça nome e telefone no mínimo)
- Lançar vendas no caixa (precisa ter caixa aberto)
- Marcar consultas na agenda
- Consultar dados (estoque, vendas do dia, próximas consultas, vacinas)

REGRAS:
1. Se faltar informação obrigatória, PERGUNTE de forma natural antes de chamar a tool. Ex: "Qual a raça do Thor?"
2. Sempre que o cliente mencionar um pet, tente vinculá-lo ao dono pelo nome (use search_clients).
3. Quando concluir uma ação, confirme rapidamente o que foi feito. Ex: "Pronto! Thor cadastrado."
4. Se o usuário pedir algo que você não consegue fazer, explique.
5. Para vendas: se não houver caixa aberto, avise o usuário.
6. Use a data de hoje quando relevante: ${new Date().toISOString().slice(0, 10)}.

NUNCA invente dados. Se não souber, pergunte ou consulte.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_inventory",
      description: "Adiciona um produto ao estoque (compra/entrada). Se o item já existir, soma à quantidade. Use para frases como 'comprei 50 caixas de simparic'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do produto" },
          quantity: { type: "number", description: "Quantidade comprada" },
          unit: { type: "string", description: "Unidade (un, cx, ml, mg, kg)", default: "un" },
          cost_price: { type: "number", description: "Preço de custo unitário em R$" },
          sell_price: { type: "number", description: "Preço de venda unitário em R$" },
          category: { type: "string", enum: ["medication", "food", "accessory", "hygiene", "other"], default: "medication" },
          batch: { type: "string", description: "Lote (opcional)" },
          expiry_date: { type: "string", description: "Validade no formato YYYY-MM-DD (opcional)" },
        },
        required: ["name", "quantity"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Cadastra um novo cliente (tutor). Sempre pergunte o telefone se não foi dito.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          cpf: { type: "string" },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Busca clientes por nome (use antes de cadastrar pet, para vincular ao dono existente).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_pet",
      description: "Cadastra um pet. Antes de chamar, certifique-se de ter: nome, espécie, raça, sexo. Use search_clients se mencionou tutor.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          species: { type: "string", description: "Cão, Gato, Ave, etc." },
          breed: { type: "string" },
          sex: { type: "string", enum: ["macho", "femea"] },
          birth_date: { type: "string", description: "YYYY-MM-DD (opcional)" },
          color: { type: "string" },
          neutered: { type: "boolean" },
          microchip: { type: "string" },
          client_id: { type: "string", description: "ID do tutor (use search_clients antes)" },
        },
        required: ["name", "species"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_inventory",
      description: "Busca produtos no estoque por nome.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_sale_to_cash",
      description: "Adiciona um item à venda no caixa atual (precisa caixa aberto). Para produtos passe inventory_item_id.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number", default: 1 },
          unit_price: { type: "number" },
          inventory_item_id: { type: "string", description: "ID do produto se for do estoque" },
          client_id: { type: "string" },
          payment_method: { type: "string", enum: ["dinheiro", "pix", "credito", "debito"], default: "dinheiro" },
        },
        required: ["description", "unit_price"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Marca uma consulta na agenda.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "ISO datetime: YYYY-MM-DDTHH:MM:SS" },
          service: { type: "string" },
          duration_minutes: { type: "number", default: 30 },
          client_id: { type: "string" },
          notes: { type: "string" },
        },
        required: ["date", "service"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_summary",
      description: "Retorna resumo de dados: vendas do dia, estoque baixo, próximas consultas, etc.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["today_sales", "low_stock", "today_appointments", "open_cash"] },
        },
        required: ["type"],
        additionalProperties: false,
      },
    },
  },
];

async function executeTool(name: string, args: any, supabase: any, userId: string) {
  switch (name) {
    case "add_inventory": {
      // Tenta achar item existente pelo nome
      const { data: existing } = await supabase
        .from("inventory_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .ilike("name", args.name)
        .maybeSingle();

      if (existing) {
        const newQty = Number(existing.quantity) + Number(args.quantity);
        const { error } = await supabase
          .from("inventory_items")
          .update({ quantity: newQty, ...(args.cost_price && { cost_price: args.cost_price }), ...(args.sell_price && { sell_price: args.sell_price }) })
          .eq("id", existing.id);
        if (error) return { error: error.message };
        await supabase.from("inventory_movements").insert({
          user_id: userId,
          item_id: existing.id,
          type: "in",
          quantity: args.quantity,
          unit_cost: args.cost_price,
          reason: "Entrada via assistente IA",
        });
        return { success: true, message: `Estoque atualizado: +${args.quantity} ${args.name} (total: ${newQty})` };
      }

      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          user_id: userId,
          name: args.name,
          quantity: args.quantity,
          unit: args.unit || "un",
          category: args.category || "medication",
          cost_price: args.cost_price,
          sell_price: args.sell_price,
          batch: args.batch,
          expiry_date: args.expiry_date,
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("inventory_movements").insert({
        user_id: userId,
        item_id: data.id,
        type: "in",
        quantity: args.quantity,
        unit_cost: args.cost_price,
        reason: "Cadastro via assistente IA",
      });
      return { success: true, message: `Produto "${args.name}" cadastrado com ${args.quantity} unidades.` };
    }

    case "create_client": {
      const { data, error } = await supabase
        .from("clients")
        .insert({ user_id: userId, ...args })
        .select()
        .single();
      if (error) return { error: error.message };
      return { success: true, client_id: data.id, message: `Cliente ${args.name} cadastrado.` };
    }

    case "search_clients": {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone")
        .eq("user_id", userId)
        .ilike("name", `%${args.query}%`)
        .limit(5);
      if (error) return { error: error.message };
      return { results: data || [] };
    }

    case "create_pet": {
      const payload: any = { user_id: userId, ...args };
      const { data, error } = await supabase.from("pets").insert(payload).select().single();
      if (error) return { error: error.message };
      return { success: true, pet_id: data.id, message: `Pet ${args.name} (${args.species}${args.breed ? `, ${args.breed}` : ""}) cadastrado.` };
    }

    case "search_inventory": {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, unit, sell_price")
        .eq("user_id", userId)
        .ilike("name", `%${args.query}%`)
        .limit(5);
      if (error) return { error: error.message };
      return { results: data || [] };
    }

    case "add_sale_to_cash": {
      const { data: session } = await supabase
        .from("cash_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .maybeSingle();
      if (!session) return { error: "Não há caixa aberto. Abra o caixa primeiro na tela de Caixa." };
      const subtotal = Number(args.unit_price) * Number(args.quantity || 1);
      const { error } = await supabase.from("cash_items").insert({
        user_id: userId,
        session_id: session.id,
        description: args.description,
        quantity: args.quantity || 1,
        unit_price: args.unit_price,
        subtotal,
        item_type: args.inventory_item_id ? "product" : "service",
        inventory_item_id: args.inventory_item_id,
        client_id: args.client_id,
        payment_method: args.payment_method || "dinheiro",
      });
      if (error) return { error: error.message };
      // baixa estoque se for produto
      if (args.inventory_item_id) {
        const { data: item } = await supabase
          .from("inventory_items")
          .select("quantity")
          .eq("id", args.inventory_item_id)
          .single();
        if (item) {
          await supabase
            .from("inventory_items")
            .update({ quantity: Math.max(0, Number(item.quantity) - Number(args.quantity || 1)) })
            .eq("id", args.inventory_item_id);
          await supabase.from("inventory_movements").insert({
            user_id: userId,
            item_id: args.inventory_item_id,
            type: "out",
            quantity: args.quantity || 1,
            reason: "Venda via assistente IA",
          });
        }
      }
      return { success: true, message: `Venda lançada: ${args.description} - R$ ${subtotal.toFixed(2)}` };
    }

    case "create_appointment": {
      const { error } = await supabase.from("appointments").insert({
        user_id: userId,
        date: args.date,
        service: args.service,
        duration_minutes: args.duration_minutes || 30,
        client_id: args.client_id,
        notes: args.notes,
      });
      if (error) return { error: error.message };
      return { success: true, message: `Consulta marcada para ${new Date(args.date).toLocaleString("pt-BR")}` };
    }

    case "get_summary": {
      const today = new Date().toISOString().slice(0, 10);
      switch (args.type) {
        case "today_sales": {
          const { data } = await supabase
            .from("cash_items")
            .select("subtotal")
            .eq("user_id", userId)
            .gte("created_at", `${today}T00:00:00`);
          const total = (data || []).reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
          return { total_sales: total, count: data?.length || 0 };
        }
        case "low_stock": {
          const { data } = await supabase
            .from("inventory_items")
            .select("name, quantity, min_quantity")
            .eq("user_id", userId);
          const low = (data || []).filter((i: any) => Number(i.quantity) <= Number(i.min_quantity));
          return { items: low.slice(0, 10) };
        }
        case "today_appointments": {
          const { data } = await supabase
            .from("appointments")
            .select("date, service")
            .eq("user_id", userId)
            .gte("date", `${today}T00:00:00`)
            .lte("date", `${today}T23:59:59`)
            .order("date");
          return { appointments: data || [] };
        }
        case "open_cash": {
          const { data } = await supabase
            .from("cash_sessions")
            .select("id, opened_at, opening_amount")
            .eq("user_id", userId)
            .eq("status", "open")
            .maybeSingle();
          return { open: !!data, session: data };
        }
      }
      return { error: "Tipo de resumo desconhecido" };
    }
  }
  return { error: `Tool ${name} desconhecida` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

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

    // Quota / plan gate
    const quota = await checkAiQuota(supabase, userId);
    if (!quota.allowed) {
      return new Response(JSON.stringify({ error: quota.message }), {
        status: quota.status ?? 402,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const ownerId = quota.ownerId;

    const { messages = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Loga 1 uso de IA na clínica do dono
    void logAiUsage(supabase, ownerId, "vet-assistant");

    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Loop de tool-calling (até 5 iterações)
    for (let iter = 0; iter < 5; iter++) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversation,
          tools: TOOLS,
        }),
      });

      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde um momento." }), {
          status: 429,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na sua workspace." }), {
          status: 402,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (!aiRes.ok) {
        const text = await aiRes.text();
        console.error("AI error:", aiRes.status, text);
        throw new Error("Falha na IA");
      }

      const aiData = await aiRes.json();
      const choice = aiData.choices?.[0];
      const msg = choice?.message;

      if (!msg) throw new Error("Resposta vazia da IA");

      conversation.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // Resposta final
        return new Response(
          JSON.stringify({ reply: msg.content || "", actions: [] }),
          { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      // Executa cada tool
      const actionsExecuted: any[] = [];
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
        const result = await executeTool(fnName, args, supabase, ownerId);
        actionsExecuted.push({ tool: fnName, args, result });
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(
      JSON.stringify({ reply: "Operação muito complexa. Tente dividir em passos menores.", actions: [] }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("vet-assistant error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
