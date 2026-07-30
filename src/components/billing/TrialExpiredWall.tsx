import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, CreditCard, Zap, Check, Lock,
  Brain, Stethoscope, Package, CalendarCheck, Users,
} from "lucide-react";

const FEATURES = [
  "Agenda & prontuário completo",
  "Receituário digital em PDF",
  "Bulário veterinário com IA",
  "Caixa, financeiro e contas a pagar",
  "Estoque com lotes e validade",
  "IA veterinária — anamnese e diagnóstico",
  "Assistente virtual por voz e texto",
  "Internação completa (SOAP)",
  "Equipe ilimitada com perfis e acessos",
  "Lembretes automáticos via WhatsApp",
  "Relatórios gerenciais",
  "Clientes & pacientes ilimitados",
];

interface TrialExpiredWallProps {
  onSelectPlan: (method: "card" | "pix_native" | "pix") => void;
  loading?: boolean;
}

export function TrialExpiredWall({ onSelectPlan, loading }: TrialExpiredWallProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <Badge variant="destructive" className="text-xs">Período de teste encerrado</Badge>
          <h1 className="text-3xl font-bold mt-2">Seu teste gratuito expirou</h1>
          <p className="text-muted-foreground">
            Continue com o <strong>Plano VetPro</strong> e mantenha todos os seus dados e configurações.
          </p>
        </div>

        {/* Plan card */}
        <div className="border-2 border-primary rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-background shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Stethoscope className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">VetPro</span>
                <Badge className="bg-primary text-xs">Tudo incluso</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Para clínicas veterinárias que não param</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-extrabold tracking-tight">R$ 129,90</div>
              <div className="text-xs text-muted-foreground">por mês · sem fidelidade</div>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={() => onSelectPlan("card")}
              disabled={loading}
            >
              <CreditCard className="h-4 w-4" />
              Assinar com cartão
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1 gap-2"
              onClick={() => onSelectPlan("pix_native")}
              disabled={loading}
            >
              <Zap className="h-4 w-4" />
              PIX rápido (QR aqui)
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground"
            onClick={() => onSelectPlan("pix")}
            disabled={loading}
          >
            PIX no Mercado Pago
          </Button>
        </div>

        {/* Bulário free link */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Enquanto isso, você ainda pode usar o Bulário Veterinário gratuito.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard/bulario")}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Acessar Bulário gratuito
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Seus dados estão seguros. Assine e tudo estará exatamente onde você deixou.
        </p>
      </div>
    </div>
  );
}
