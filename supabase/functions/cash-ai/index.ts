// Cash AI: assistant for the PDV (Caixa)
// Capabilities:
//  - parse: turn natural language into cart items (matched against the user's products/services)
//  - suggest: recommend items based on history (overall or for a client)
//  - summary: end-of-day insights for the active/last session
//  - validate: detect inconsistencies in the current cart (atypical discount, missing data, stock)
//  - chat: free conversation that can call the tools above

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { checkAiQuota, logAiUsage } from "../_shared/ai-quota.ts";

import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type Msg = { role: "system" | "user" | "assistant"; content: string };

interface ParsedItem {
  description: string;
  quantity: number;
  unit_price: number;
  item_type: "product" | "service";
  inventory_item_id?: string | null;
  service_id?: string | null;
  matched: boolean;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    // Quota / plan gate
    const quota = await checkAiQuota(supabase, userId);
    if (!quota.allowed) return json({ error: quota.message }, quota.status ?? 402);
    const ownerId = quota.ownerId;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "chat");

    void logAiUsage(supabase, ownerId, `cash-ai:${action}`);

    if (action === "parse")    return await handleParse(supabase, userId, body, apiKey);
    if (action === "suggest")  return await handleSuggest(supabase, userId, body, apiKey);
    if (action === "summary")  return await handleSummary(supabase, userId, body, apiKey);
    if (action === "validate") return await handleValidate(supabase, userId, body, apiKey);
    return await handleChat(supabase, userId, body, apiKey);
  } catch (err) {
    console.error("cash-ai error:", err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

async function callAI(apiKey: string, messages: Msg[], tools?: any, tool_choice?: any) {
  const res = await fetch(LOVABLE_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, ...(tools ? { tools, tool_choice } : {}) }),
  });
  if (res.status === 429) return { error: "Limite de uso atingido. Tente em alguns segundos." };
  if (res.status === 402) return { error: "Créditos esgotados. Adicione créditos ao workspace." };
  if (!res.ok) {
    const t = await res.text();
    console.error("AI error:", res.status, t);
    return { error: "Erro no provedor de IA" };
  }
  return await res.json();
}

async function loadCatalog(supabase: any, userId: string) {
  const [prodRes, svcRes] = await Promise.all([
    supabase.from("inventory_items").select("id, name, sell_price, quantity, unit, active_ingredient").eq("user_id", userId),
    supabase.from("services").select("id, name, price").eq("user_id", userId).eq("active", true),
  ]);
  return {
    products: (prodRes.data ?? []) as any[],
    services: (svcRes.data ?? []) as any[],
  };
}

async function handleParse(supabase: any, userId: string, body: any, apiKey: string) {
  const text: string = String(body?.text ?? "").trim();
  if (!text) return json({ items: [], message: "Texto vazio" });

  const { products, services } = await loadCatalog(supabase, userId);
  const catalogPrompt = [
    "PRODUTOS DO ESTOQUE (id | nome | preço | estoque):",
    ...products.slice(0, 200).map((p) => `${p.id} | ${p.name}${p.active_ingredient ? ` (${p.active_ingredient})` : ""} | R$${p.sell_price ?? 0} | ${p.quantity ?? 0} ${p.unit ?? ""}`),
    "",
    "SERVIÇOS (id | nome | preço):",
    ...services.slice(0, 200).map((s) => `${s.id} | ${s.name} | R$${s.price ?? 0}`),
  ].join("\n");

  const tools = [{
    type: "function",
    function: {
      name: "build_cart",
      description: "Monta uma lista de itens para adicionar ao carrinho do caixa, vinculando ao catálogo quando possível.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" },
                item_type: { type: "string", enum: ["product", "service"] },
                inventory_item_id: { type: "string", description: "ID do produto se identificado no catálogo, senão omitir" },
                service_id: { type: "string", description: "ID do serviço se identificado no catálogo, senão omitir" },
                matched: { type: "boolean", description: "true se foi vinculado a um item real do catálogo" },
                reason: { type: "string", description: "Se não vinculado, explique por quê" },
              },
              required: ["description", "quantity", "unit_price", "item_type", "matched"],
            },
          },
          message: { type: "string", description: "Mensagem curta amigável para o usuário sobre o que foi montado." },
        },
        required: ["items", "message"],
      },
    },
  }];

  const messages: Msg[] = [
    {
      role: "system",
      content: `Você é a IA do Caixa de uma clínica veterinária. Converta linguagem natural em itens de venda. Use SEMPRE o catálogo abaixo. Quando o usuário citar algo similar a um produto/serviço, vincule (matched=true) e use o ID e o preço REAL do catálogo. Se não houver correspondência, ainda assim crie o item (matched=false) com preço estimado e explique em "reason". Quantidade padrão = 1 quando não informada.\n\n${catalogPrompt}`,
    },
    { role: "user", content: text },
  ];

  const ai = await callAI(apiKey, messages, tools, { type: "function", function: { name: "build_cart" } });
  if ((ai as any).error) return json(ai, 200);
  const call = ai?.choices?.[0]?.message?.tool_calls?.[0];
  const args = call ? safeJSON(call.function?.arguments) : null;
  const items: ParsedItem[] = args?.items ?? [];
  return json({ items, message: args?.message ?? "Itens identificados" });
}

async function handleSuggest(supabase: any, userId: string, body: any, apiKey: string) {
  const clientId: string | null = body?.clientId ?? null;
  // pull last 50 cash_items overall, plus client-specific if provided
  const baseQuery = supabase.from("cash_items").select("description, quantity, unit_price, client_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(80);
  const { data: history } = await baseQuery;
  const items = (history ?? []) as any[];
  const forClient = clientId ? items.filter((i) => i.client_id === clientId) : [];
  const others = items.filter((i) => !clientId || i.client_id !== clientId).slice(0, 50);

  const prompt = `Histórico recente (todos clientes):\n${others.map((i) => `- ${i.description} x${i.quantity}`).join("\n")}\n\n${
    clientId ? `Histórico DESTE cliente:\n${forClient.map((i) => `- ${i.description} x${i.quantity}`).join("\n") || "(sem histórico)"}` : ""
  }`;

  const messages: Msg[] = [
    { role: "system", content: "Sugira de 3 a 5 itens (produtos/serviços) que provavelmente serão úteis nesta venda, baseando-se no histórico. Seja curto e direto, em português, com bullets. Sem preços." },
    { role: "user", content: prompt },
  ];
  const ai = await callAI(apiKey, messages);
  if ((ai as any).error) return json(ai, 200);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "" });
}

async function handleSummary(supabase: any, userId: string, body: any, apiKey: string) {
  const sessionId: string | null = body?.sessionId ?? null;
  let q = supabase.from("cash_items").select("description, quantity, unit_price, subtotal, payment_method, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500);
  if (sessionId) q = q.eq("session_id", sessionId);
  const { data } = await q;
  const items = (data ?? []) as any[];
  const total = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);
  const ticket = items.length ? total / items.length : 0;
  const byPayment: Record<string, number> = {};
  items.forEach((i) => { byPayment[i.payment_method || "—"] = (byPayment[i.payment_method || "—"] || 0) + Number(i.subtotal || 0); });

  const prompt = `Resumo do caixa: ${items.length} itens, total R$${total.toFixed(2)}, ticket médio R$${ticket.toFixed(2)}.\nPor pagamento: ${JSON.stringify(byPayment)}.\nTop itens (qtd):\n${topByQty(items)}`;

  const messages: Msg[] = [
    { role: "system", content: "Você é um analista de PDV veterinário. Gere um resumo curto (máx 6 linhas) com insights práticos e 1 sugestão de melhoria. Português, tom amigável, use emojis com moderação." },
    { role: "user", content: prompt },
  ];
  const ai = await callAI(apiKey, messages);
  if ((ai as any).error) return json(ai, 200);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "", stats: { total, ticket, byPayment, count: items.length } });
}

async function handleValidate(supabase: any, userId: string, body: any, apiKey: string) {
  const cart = (body?.cart ?? []) as any[];
  if (!cart.length) return json({ message: "Carrinho vazio." });
  const subtotal = cart.reduce((s, c) => s + Number(c.subtotal || 0), 0);
  const totalDiscount = cart.reduce((s, c) => s + Number(c.discount || 0), 0);
  const pct = subtotal ? (totalDiscount / subtotal) * 100 : 0;
  const issues: string[] = [];
  if (pct > 30) issues.push(`Desconto alto (${pct.toFixed(1)}%) — confirme se foi autorizado.`);
  cart.forEach((c) => {
    if (c.item_type === "product" && c.max_stock != null && c.quantity > c.max_stock) {
      issues.push(`"${c.description}" excede o estoque (${c.quantity} > ${c.max_stock}).`);
    }
    if (!c.unit_price || c.unit_price <= 0) issues.push(`"${c.description}" sem preço definido.`);
  });

  const messages: Msg[] = [
    { role: "system", content: "Analise o carrinho e responda em até 4 linhas em português. Se não houver problemas, parabenize e confirme. Se houver, liste claramente." },
    { role: "user", content: `Itens:\n${cart.map((c) => `- ${c.quantity}x ${c.description} @ R$${c.unit_price} (sub R$${c.subtotal})`).join("\n")}\n\nProblemas detectados automaticamente:\n${issues.length ? issues.join("\n") : "(nenhum)"}` },
  ];
  const ai = await callAI(apiKey, messages);
  if ((ai as any).error) return json(ai, 200);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "", issues });
}

async function handleChat(supabase: any, userId: string, body: any, apiKey: string) {
  const messages = (body?.messages ?? []) as Msg[];
  const { products, services } = await loadCatalog(supabase, userId);
  const sys: Msg = {
    role: "system",
    content: `Você é a IA do Caixa (PDV) de uma clínica veterinária. Ajude o atendente: pode sugerir itens, validar vendas, ou orientar como usar comandos. Seja conciso (máx 5 linhas), em português. Não invente preços. Catálogo resumido (${products.length} produtos, ${services.length} serviços).`,
  };
  const ai = await callAI(apiKey, [sys, ...messages]);
  if ((ai as any).error) return json(ai, 200);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "" });
}

function topByQty(items: any[]) {
  const map: Record<string, number> = {};
  items.forEach((i) => { map[i.description] = (map[i.description] || 0) + Number(i.quantity || 0); });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, q]) => `- ${n}: ${q}`).join("\n");
}

function safeJSON(s: any) { try { return JSON.parse(s); } catch { return null; } }
