import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Brain, Stethoscope, AlertTriangle, Pill, Shield, Loader2, Copy, Check } from "lucide-react";
import { useAiGate } from "@/hooks/useAiGate";

interface PetData {
  species?: string;
  breed?: string;
  age?: string;
  sex?: string;
  neutered?: boolean;
  weight?: number;
  restrictions?: string;
}

interface ClinicalAIPanelProps {
  petData: PetData;
  clinicalHistory?: string;
}

export default function ClinicalAIPanel({ petData, clinicalHistory }: ClinicalAIPanelProps) {
  const { runWithGate } = useAiGate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [medications, setMedications] = useState("");
  const [copied, setCopied] = useState(false);

  const ACTION_LABELS: Record<string, string> = {
    diagnosis: "Diagnósticos sugeridos",
    interactions: "Interações medicamentosas",
    protocol: "Protocolo terapêutico",
    risk: "Perfil de risco do paciente",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success("Copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const callAI = async (action: string) => {
    if ((action === "diagnosis" || action === "protocol") && !symptoms.trim()) {
      toast.error("Descreva os sinais clínicos ou condição"); return;
    }
    if (action === "interactions" && !medications.trim()) {
      toast.error("Informe os medicamentos"); return;
    }
    setLoading(true);
    setActiveAction(action);
    setResult("");
    try {
      const out = await runWithGate(`clinical-ai:${action}`, async () => {
        const { data, error } = await supabase.functions.invoke("clinical-ai", {
          body: {
            action,
            petData,
            symptoms: symptoms.trim(),
            medications: medications.trim().split("\n").filter(Boolean),
            history: clinicalHistory,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      });
      if (out) setResult(out.result || "Sem resposta");
    } catch (e: any) {
      toast.error(e.message || "Erro ao consultar IA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          IA Clínica
          <Badge variant="outline" className="text-xs ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="diagnosis">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="diagnosis" className="text-xs"><Stethoscope className="h-3 w-3 mr-1" />Diagnóstico</TabsTrigger>
            <TabsTrigger value="interactions" className="text-xs"><Pill className="h-3 w-3 mr-1" />Interações</TabsTrigger>
            <TabsTrigger value="protocol" className="text-xs"><Shield className="h-3 w-3 mr-1" />Protocolo</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Risco</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnosis" className="space-y-3 mt-3">
            <Textarea placeholder="Descreva os sinais clínicos observados..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={3} />
            <Button onClick={() => callAI("diagnosis")} disabled={loading} className="w-full" size="sm">
              {loading && activeAction === "diagnosis" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Stethoscope className="h-4 w-4 mr-2" />}
              Sugerir Diagnósticos
            </Button>
          </TabsContent>

          <TabsContent value="interactions" className="space-y-3 mt-3">
            <Textarea placeholder="Liste os medicamentos (um por linha)..." value={medications} onChange={(e) => setMedications(e.target.value)} rows={3} />
            <Button onClick={() => callAI("interactions")} disabled={loading} className="w-full" size="sm">
              {loading && activeAction === "interactions" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pill className="h-4 w-4 mr-2" />}
              Verificar Interações
            </Button>
          </TabsContent>

          <TabsContent value="protocol" className="space-y-3 mt-3">
            <Textarea placeholder="Diagnóstico ou condição clínica..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={3} />
            <Button onClick={() => callAI("protocol")} disabled={loading} className="w-full" size="sm">
              {loading && activeAction === "protocol" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Sugerir Protocolo
            </Button>
          </TabsContent>

          <TabsContent value="risk" className="mt-3">
            <Button onClick={() => callAI("risk")} disabled={loading} className="w-full" size="sm">
              {loading && activeAction === "risk" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
              Avaliar Perfil de Risco
            </Button>
          </TabsContent>
        </Tabs>

        {result && (
          <div className="mt-4 space-y-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                  {ACTION_LABELS[activeAction] || "Resultado"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs"
                >
                  {copied ? (
                    <><Check className="h-3 w-3 mr-1" />Copiado</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" />Copiar</>
                  )}
                </Button>
              </div>
              <div
                className="
                  px-5 py-4 text-sm leading-relaxed text-foreground
                  prose prose-sm max-w-none dark:prose-invert
                  prose-headings:font-semibold prose-headings:text-foreground prose-headings:tracking-tight
                  prose-h1:text-base prose-h1:mt-0 prose-h1:mb-3 prose-h1:pb-2 prose-h1:border-b prose-h1:border-border
                  prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-2 prose-h2:text-primary
                  prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5 prose-h3:text-foreground
                  prose-p:my-2 prose-p:leading-relaxed
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-ol:pl-5
                  prose-li:my-0.5 prose-li:marker:text-primary
                  prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                  prose-table:my-3 prose-th:bg-muted prose-th:font-semibold prose-th:text-foreground
                  prose-hr:border-border prose-hr:my-4
                "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Sugestão de IA — o médico veterinário é o decisor final.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
