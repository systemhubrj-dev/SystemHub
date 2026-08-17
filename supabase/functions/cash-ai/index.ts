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

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY ausente" }, 500, req);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "chat");

    void logAiUsage(supabase, ownerId, `cash-ai:${action}`);

    if (action === "parse")    return await handleParse(supabase, userId, body, apiKey, req);
    if (action === "suggest")  return await handleSuggest(supabase, userId, body, apiKey, req);
    if (action === "summary")  return await handleSummary(supabase, userId, body, apiKey, req);
    if (action === "validate") return await handleValidate(supabase, userId, body, apiKey, req);
    return await handleChat(supabase, userId, body, apiKey, req);
  } catch (err) {
    console.error("cash-ai error:", err);
    return json({ error: err instanceof Error ? err.message : "Erro inesperado" }, 500);
  }
});

/** Bloqueia perguntas claramente fora do escopo da clínica veterinária */
function isVetRelated(text: string): boolean {
  const offTopic = [
    /receita (de comida|culin[aá]ria|bolo|p[aã]o|torta)/i,
    /futebol|basquete|v[oô]lei|placar|gol\b|campeonato\b/i,
    /pol[ií]tica|presidente|elei[çc][aã]o|partido pol[ií]/i,
    /li[çc][aã]o de casa|tarefa escolar/i,
    /previs[aã]o do tempo|temperatura (amanha|hoje|clima)/i,
    /s[eé]rie (de tv|netflix|amazon)|epis[oó]dio\b/i,
    /criptomoeda|bitcoin|ethereum|nft\b/i,
  ];
  return !offTopic.some(p => p.test(text));
}

function json(data: any, status = 200, request?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request ?? new Request("http://localhost")), "Content-Type": "application/json" },
  });
}

async function callAI(apiKey: string, messages: Msg[], tools?: any, forceTool?: string) {
  // Separate system message from user/assistant messages
  const systemMsg = messages.find(m => m.role === "system");
  const chatMessages = messages.filter(m => m.role !== "system");

  const body: any = {
    model: MODEL,
    max_tokens: 1024,
    messages: chatMessages,
  };
  if (systemMsg) body.system = systemMsg.content;

  if (tools) {
    // Convert OpenAI tool format to Anthropic format
    body.tools = tools.map((t: any) => ({
      name: t.function?.name ?? t.name,
      description: t.function?.description ?? t.description,
      input_schema: t.function?.parameters ?? t.input_schema,
    }));
    if (forceTool) body.tool_choice = { type: "tool", name: forceTool };
  }

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { error: "Limite de uso atingido. Tente em alguns segundos." };
  if (!res.ok) {
    const t = await res.text();
    console.error("AI error:", res.status, t);
    return { error: "Erro no provedor de IA" };
  }
  const data = await res.json();
  // Normalize response: extract text or tool_use from Anthropic content blocks
  const textBlock = data.content?.find((b: any) => b.type === "text");
  const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
  return {
    _raw: data,
    choices: [{
      message: {
        content: textBlock?.text ?? null,
        tool_calls: toolBlock ? [{
          id: toolBlock.id,
          function: { name: toolBlock.name, arguments: JSON.stringify(toolBlock.input) },
        }] : undefined,
      },
    }],
  };
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

async function handleParse(supabase: any, userId: string, body: any, apiKey: string, req: Request) {
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

  const ai = await callAI(apiKey, messages, tools, "build_cart");
  if ((ai as any).error) return json(ai, 200, req);
  const call = ai?.choices?.[0]?.message?.tool_calls?.[0];
  const args = call ? safeJSON(call.function?.arguments) : null;
  const items: ParsedItem[] = args?.items ?? [];
  return json({ items, message: args?.message ?? "Itens identificados" }, 200, req);
}

async function handleSuggest(supabase: any, userId: string, body: any, apiKey: string, req: Request) {
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
  if ((ai as any).error) return json(ai, 200, req);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "" }, 200, req);
}

async function handleSummary(supabase: any, userId: string, body: any, apiKey: string, req: Request) {
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
  if ((ai as any).error) return json(ai, 200, req);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "", stats: { total, ticket, byPayment, count: items.length } }, 200, req);
}

async function handleValidate(supabase: any, userId: string, body: any, apiKey: string, req: Request) {
  const cart = (body?.cart ?? []) as any[];
  if (!cart.length) return json({ message: "Carrinho vazio." }, 200, req);
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
  if ((ai as any).error) return json(ai, 200, req);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "", issues }, 200, req);
}

async function handleChat(supabase: any, userId: string, body: any, apiKey: string, req: Request) {
  const messages = (body?.messages ?? []) as Msg[];
  const lastUserText = messages.filter(m => m.role === "user").at(-1)?.content ?? "";
  if (!isVetRelated(lastUserText)) {
    return json({ message: "Só consigo ajudar com assuntos do caixa e da clínica veterinária. Como posso te ajudar?" }, 200, req);
  }
  const { products, services } = await loadCatalog(supabase, userId);
  const sys: Msg = {
    role: "system",
    content: `Você é a IA do Caixa (PDV) de uma clínica veterinária. Ajude o atendente: pode sugerir itens, validar vendas, ou orientar como usar comandos. Seja conciso (máx 5 linhas), em português. Não invente preços. Catálogo resumido (${products.length} produtos, ${services.length} serviços).`,
  };
  const ai = await callAI(apiKey, [sys, ...messages]);
  if ((ai as any).error) return json(ai, 200, req);
  return json({ message: ai?.choices?.[0]?.message?.content ?? "" }, 200, req);
}

function topByQty(items: any[]) {
  const map: Record<string, number> = {};
  items.forEach((i) => { map[i.description] = (map[i.description] || 0) + Number(i.quantity || 0); });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, q]) => `- ${n}: ${q}`).join("\n");
}

function safeJSON(s: any) { try { return JSON.parse(s); } catch { return null; } }
