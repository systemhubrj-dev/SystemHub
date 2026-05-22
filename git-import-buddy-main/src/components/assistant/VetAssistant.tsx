import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX, Loader2, Bot, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVoice } from "@/hooks/useVoice";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY_PREFIX = "vet-assistant-history:";

function storageKeyFor(userId: string | null | undefined) {
  return userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;
}

export function VetAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canUseAi, aiUsageCount, config, logAiUsage, hasFeature, loading: planLoading } = usePlanLimits();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();

  // Plano Essencial: não renderiza o assistente.
  const assistantAllowed = planLoading || hasFeature("assistente_ia");

  // Carrega/limpa histórico quando o usuário muda (login/logout)
  useEffect(() => {
    // Sempre que troca de usuário (ou desloga), limpa estado da UI e voz
    voice.stopSpeaking?.();
    setOpen(false);

    // Limpa históricos antigos (chaves órfãs de outros usuários)
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEY_PREFIX)) {
          if (!user || k !== storageKeyFor(user.id)) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch { /* storage indisponível */ }

    if (!user) {
      setMessages([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKeyFor(user.id)!);
      setMessages(raw ? JSON.parse(raw) : []);
    } catch {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Persiste histórico (últimas 30 msgs) — apenas se autenticado
  useEffect(() => {
    if (!user) return;
    const key = storageKeyFor(user.id);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages, user]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Quando para de ouvir e tem transcrição, envia automaticamente
  useEffect(() => {
    if (!voice.isListening && voice.transcript && voice.transcript.trim().length > 2) {
      send(voice.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isListening]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!canUseAi) {
      toast.error(`Limite de IA atingido (${config.maxAiPerMonth}/mês). Faça upgrade para uso ilimitado.`);
      navigate("/dashboard/meu-plano");
      return;
    }

    const userMsg: Msg = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("vet-assistant", {
        body: { messages: newHistory },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply || "Entendi.";
      const assistantMsg: Msg = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistantMsg]);

      // Log de uso (apenas quando bem-sucedido)
      void logAiUsage("vet-assistant");

      if (voiceMode) voice.speak(reply);
    } catch (err: any) {
      const msg = err?.message || "Erro ao processar";
      toast.error(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMic = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.stopSpeaking();
      voice.startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const clearHistory = () => {
    setMessages([]);
    const key = storageKeyFor(user?.id);
    if (key) {
      try { localStorage.removeItem(key); } catch {}
    }
    voice.stopSpeaking();
  };

  if (!user || !assistantAllowed) return null;

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
          "flex items-center justify-center hover:scale-110 transition-transform",
          "ring-4 ring-primary/20"
        )}
        aria-label="Abrir assistente IA"
      >
        <Sparkles className="h-6 w-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 text-[10px] flex items-center justify-center font-bold">
            {messages.filter((m) => m.role === "user").length}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-base">Assistente VetCare</SheetTitle>
                  <SheetDescription className="text-xs">
                    {voice.isListening ? "🎤 Ouvindo..." : voice.isSpeaking ? "🔊 Falando..." : "Pergunte ou peça por voz"}
                  </SheetDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVoiceMode((v) => !v)}
                title={voiceMode ? "Desativar voz" : "Ativar voz"}
              >
                {voiceMode ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4" ref={scrollRef as any}>
            <div className="py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Olá! Sou seu assistente.</p>
                  <p className="text-xs text-muted-foreground px-4">
                    Experimente: <em>"Comprei 50 caixas de Simparic 20mg por R$ 80 cada"</em> ou <em>"Cadastra um Golden chamado Thor, macho, dono João Silva"</em>
                  </p>
                  <div className="grid gap-2 px-2 pt-2 text-left">
                    {[
                      "Quanto vendi hoje?",
                      "Quais produtos estão com estoque baixo?",
                      "Quais consultas tenho hoje?",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-xs text-left px-3 py-2 rounded-md border hover:bg-muted transition-colors"
                      >
                        💬 {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                      m.role === "user" ? "bg-muted" : "bg-gradient-to-br from-primary to-primary/70"
                    )}
                  >
                    {m.role === "user" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap break-words",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              )}

              {voice.isListening && voice.transcript && (
                <div className="flex gap-2 flex-row-reverse opacity-60">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                    <Mic className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                  <div className="rounded-2xl rounded-tr-sm px-3 py-2 text-sm bg-primary/30 italic">
                    {voice.transcript}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3 space-y-2">
            <form onSubmit={handleSubmit} className="flex gap-2">
              {voice.supported && (
                <Button
                  type="button"
                  size="icon"
                  variant={voice.isListening ? "destructive" : "outline"}
                  onClick={handleMic}
                  disabled={loading}
                  className={cn(voice.isListening && "animate-pulse")}
                >
                  {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={voice.isListening ? "Ouvindo..." : "Digite ou fale..."}
                disabled={loading || voice.isListening}
                className="flex-1 px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || loading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[11px] text-muted-foreground hover:text-foreground w-full text-center"
              >
                Limpar conversa
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
