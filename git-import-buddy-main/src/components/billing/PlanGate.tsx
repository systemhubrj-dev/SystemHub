import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Sparkles, Crown } from "lucide-react";
import { usePlanLimits, FeatureKey } from "@/hooks/usePlanLimits";

interface PlanGateProps {
  feature: FeatureKey;
  /** Conteúdo renderizado quando o plano libera o recurso. */
  children: ReactNode;
  /** Conteúdo de paywall customizado. Se omitido, usa default. */
  fallback?: ReactNode;
  /** Título do recurso bloqueado (p/ paywall default). */
  title?: string;
  /** Descrição (p/ paywall default). */
  description?: string;
}

const FEATURE_LABELS: Record<FeatureKey, { title: string; description: string }> = {
  internacao: {
    title: "Internação disponível no plano Profissional",
    description: "Gerencie pacientes internados, evolução SOAP, medicações e enfermagem.",
  },
  funcionarios: {
    title: "Equipe & Acessos disponível no plano Profissional",
    description: "Convide recepcionistas, estoquistas e veterinários com login próprio e permissões personalizadas.",
  },
  assistente_ia: {
    title: "Assistente IA disponível no plano Profissional",
    description: "Tenha um assistente veterinário 24h por voz e texto para tirar dúvidas, sugerir condutas e calcular doses.",
  },
  relatorios_avancados: {
    title: "Relatórios avançados disponíveis no plano Profissional",
    description: "Gráficos, comparativos mensais e exportação em CSV/PDF.",
  },
  lembretes_whatsapp: {
    title: "Lembretes por WhatsApp disponíveis no plano Profissional",
    description: "Envie lembretes automáticos de vacina, consulta e retorno via WhatsApp.",
  },
  ia_avancada: {
    title: "IA avançada disponível no plano Profissional",
    description: "Diagnóstico diferencial, análise de exames e bulário com IA ilimitada.",
  },
  multi_unidade: {
    title: "Multi-unidades disponível no plano Clínica IA+",
    description: "Gerencie várias unidades em uma única conta.",
  },
  marca_branca: {
    title: "Marca branca disponível no plano Clínica IA+",
    description: "Personalize totalmente a identidade visual do sistema.",
  },
};

export function PlanGate({ feature, children, fallback, title, description }: PlanGateProps) {
  const navigate = useNavigate();
  const { hasFeature, loading } = usePlanLimits();

  if (loading) return <>{children}</>;
  if (hasFeature(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const labels = FEATURE_LABELS[feature];
  const finalTitle = title ?? labels.title;
  const finalDesc = description ?? labels.description;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background shadow-xl">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{finalTitle}</h2>
            <p className="mt-2 text-muted-foreground">{finalDesc}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              size="lg"
              onClick={() => navigate("/dashboard/meu-plano")}
              className="gap-2"
            >
              <Crown className="w-4 h-4" />
              Ver planos
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            <Sparkles className="inline w-3 h-3 mr-1" />
            Faça upgrade a partir de R$ 15/mês.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
