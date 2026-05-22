import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Lightbulb, BarChart3, ShieldCheck, Loader2, Bot, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAiGate } from "@/hooks/useAiGate";

interface Msg { role: "user" | "assistant"; content: string }

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

interface Props {
  cart: any[];
  selectedClientId?: string | null;
  activeSessionId?: string | null;
  onAddItems: (items: ParsedItem[]) => void;
}

export function CashAIPanel({ cart, selectedClientId, activeSessionId, onAddItems }: Props) {
  const { runWithGate, ensureCanUse } = useAiGate();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou a IA do Caixa. Eu posso:\n• Adicionar itens por linguagem natural — ex: \"vacina V10 + consulta\"\n• Sugerir itens com base no histórico\n• Resumir o dia\n• Validar a venda atual\n\nO que vamos fazer?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const addAssistant = (content: string) => setMessages((m) => [...m, { role: "assistant", content }]);
  const addUser = (content: string) => setMessages((m) => [...m, { role: "user", content }]);

  const callAI = async (action: string, payload: any) => {
    const out = await runWithGate(`cash-ai:${action}`, async () => {
      const { data, error } = await supabase.functions.invoke("cash-ai", { body: { action, ...payload } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    });
    if (!out) throw new Error("IA bloqueada pelo plano");
    return out;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    addUser(text);
    setInput("");
    setBusy(true);
    try {
      // Heuristic: if text looks like an order command (contains qty/items), try parse first
      const looksLikeOrder = /\d|vacina|consulta|banho|tosa|cirurgia|exame|medicamento|comprimido|caixa|frasco|antipulgas|vermífugo|ração/i.test(text);
      if (looksLikeOrder) {
        const data = await callAI("parse", { text });
        const items: ParsedItem[] = data?.items ?? [];
        if (items.length > 0) {
          onAddItems(items);
          const matched = items.filter((i) => i.matched).length;
          addAssistant(`✅ Adicionei ${items.length} ${items.length === 1 ? "item" : "itens"} ao carrinho (${matched} vinculados ao catálogo).\n${items.map((i) => `• ${i.quantity}x ${i.description}${i.matched ? "" : " ⚠️"}`).join("\n")}`);
          return;
        }
      }
      const data = await callAI("chat", { messages: [...messages, { role: "user", content: text }] });
      addAssistant(data?.message ?? "(sem resposta)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      addAssistant(`❌ ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const quickAction = async (kind: "suggest" | "summary" | "validate") => {
    if (busy) return;
    const labels: Record<string, string> = { suggest: "💡 Sugerir itens", summary: "📊 Resumo do dia", validate: "🛡️ Validar venda" };
    addUser(labels[kind]);
    setBusy(true);
    try {
      let data: any;
      if (kind === "suggest") data = await callAI("suggest", { clientId: selectedClientId });
      else if (kind === "summary") data = await callAI("summary", { sessionId: activeSessionId });
      else data = await callAI("validate", { cart });
      addAssistant(data?.message ?? "(sem resposta)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      addAssistant(`❌ ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] sticky top-4 border-primary/20 bg-gradient-to-b from-primary/5 to-background">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          IA do Caixa
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.role === "user" ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div className={`text-sm rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm rounded-lg px-3 py-2 bg-muted flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-2 grid grid-cols-3 gap-1">
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => quickAction("suggest")} disabled={busy}>
            <Lightbulb className="h-3 w-3 mr-1" /> Sugerir
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => quickAction("summary")} disabled={busy}>
            <BarChart3 className="h-3 w-3 mr-1" /> Resumo
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => quickAction("validate")} disabled={busy || cart.length === 0}>
            <ShieldCheck className="h-3 w-3 mr-1" /> Validar
          </Button>
        </div>

        <div className="border-t p-2 flex gap-2">
          <Input
            placeholder='Ex: "1 vacina V10 + consulta para o Rex"'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={busy}
            className="text-sm"
          />
          <Button size="icon" onClick={handleSend} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
