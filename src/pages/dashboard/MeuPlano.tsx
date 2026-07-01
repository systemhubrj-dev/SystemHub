import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Clock, XCircle, CreditCard, QrCode, Zap, Brain, HeartPulse, Package, Users, BarChart3, Bell, Shield } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PixPaymentDialog } from "@/components/billing/PixPaymentDialog";

const VETPRO = {
  id: "vetpro" as const,
  name: "VetPro",
  price: 129.90,
  description: "Para clínicas e veterinários autônomos",
  features: [
    { icon: HeartPulse, label: "Prontuário, agenda e receita digital" },
    { icon: Brain, label: "IA ilimitada — anamnese, diagnóstico e bulário" },
    { icon: Brain, label: "Assistente veterinário por voz e texto" },
    { icon: Package, label: "Estoque com lotes, validade e promoções" },
    { icon: Users, label: "Equipe ilimitada com perfis e permissões" },
    { icon: BarChart3, label: "Financeiro completo e relatórios avançados" },
    { icon: Bell, label: "Lembretes via WhatsApp" },
    { icon: Shield, label: "Suporte prioritário e dados seguros" },
  ],
};

const REJECTION_REASONS: Record<string, string> = {
  cc_rejected_high_risk: "Recusado por suspeita de fraude (risco alto). Ligue no banco emissor para liberar a compra recorrente, ou tente outro cartão / PIX.",
  cc_rejected_insufficient_amount: "Cartão sem limite disponível. Tente outro cartão ou pague via PIX.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) incorreto. Verifique e tente novamente.",
  cc_rejected_bad_filled_date: "Data de validade incorreta. Verifique e tente novamente.",
  cc_rejected_bad_filled_other: "Dados do cartão incorretos. Revise e tente novamente.",
  cc_rejected_call_for_authorize: "Você precisa autorizar essa compra junto ao banco emissor antes de tentar de novo.",
  cc_rejected_card_disabled: "Cartão desabilitado. Ligue no banco para ativar.",
  cc_rejected_duplicated_payment: "Pagamento duplicado detectado. Aguarde alguns minutos.",
  cc_rejected_max_attempts: "Limite de tentativas atingido. Use outro cartão ou PIX.",
  cc_rejected_other_reason: "O banco emissor recusou a cobrança. Tente outro cartão ou PIX.",
};

interface LatestPayment {
  id: number;
  status: string;
  status_detail: string;
  amount: number;
  payment_method_id: string;
  payment_type_id: string;
  date_created: string;
  last_four_digits: string | null;
}

export default function MeuPlano() {
  const { subscription, isActive, isTrialing, isTrialExpired, daysLeft, planId, trialEndsAt } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<"card" | "pix" | "pix_native" | null>(null);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [pixPlanName, setPixPlanName] = useState(VETPRO.name);
  const [latestPayment, setLatestPayment] = useState<LatestPayment | null>(null);
  const [paymentDismissed, setPaymentDismissed] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentStatus = searchParams.get("status");
  const collectionStatus = searchParams.get("collection_status");
  const isPaymentFailed = paymentStatus === "failed" || collectionStatus === "rejected";
  const isPaymentPending = paymentStatus === "pending" || collectionStatus === "pending" || collectionStatus === "in_process";

  useEffect(() => {
    if (isPaymentFailed) {
      toast.error("Pagamento recusado pela operadora do cartão");
    } else if (paymentStatus === "success" || collectionStatus === "approved") {
      toast.success("Pagamento aprovado! Seu plano será ativado em instantes.");
    }
  }, [isPaymentFailed, paymentStatus, collectionStatus]);

  // Busca ativa apenas para usuários SEM plano ativo (evita loop de "refresh").
  useEffect(() => {
    if (isActive) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const { data } = await supabase.functions.invoke("mp-payment-status");
        if (cancelled) return;
        if (data?.latest) setLatestPayment(data.latest);
        if (data?.activated) {
          toast.success("Pagamento confirmado! Redirecionando...");
          setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
          return;
        }
      } catch {
        /* silencioso */
      }
      if (!cancelled) timer = setTimeout(tick, 8000);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isActive, navigate]);

  const showRejectedBanner =
    !isActive &&
    !paymentDismissed &&
    latestPayment &&
    latestPayment.status === "rejected";

  const handleSelectPlan = async (selectedPlanId: string, method: "card" | "pix" | "pix_native") => {
    setLoadingPlan(selectedPlanId);
    setLoadingMethod(method);
    try {
      if (method === "pix_native") {
        const { data, error } = await supabase.functions.invoke("mp-create-pix-native", {
          body: { planId: selectedPlanId },
        });
        if (error) throw error;
        if (!data?.qr_code) throw new Error("QR Code não retornado");
        setPixData(data);
        setPixPlanName(VETPRO.name);
        setPixDialogOpen(true);
        toast.success("PIX gerado! Escaneie o QR Code.");
        setLoadingPlan(null);
        setLoadingMethod(null);
        return;
      }
      const fnName = method === "pix" ? "mp-create-pix" : "mp-create-subscription";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { planId: selectedPlanId },
      });
      if (error) throw error;
      const url = data?.init_point || data?.sandbox_init_point;
      if (!url) throw new Error("Link de pagamento não retornado");
      toast.success(method === "pix" ? "Redirecionando para pagamento PIX..." : "Redirecionando para o Mercado Pago...");
      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar pagamento");
      setLoadingPlan(null);
      setLoadingMethod(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Plano VetPro</h1>
        <p className="text-muted-foreground mt-2">
          Tudo incluído · Cobrança mensal · Cancele quando quiser
        </p>
      </div>

      {showRejectedBanner && (
        <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4 space-y-3 max-w-3xl mx-auto">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-destructive">
                Sua última tentativa de pagamento foi recusada
                {latestPayment?.last_four_digits ? ` (cartão final ${latestPayment.last_four_digits})` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {REJECTION_REASONS[latestPayment!.status_detail] ||
                  "O banco emissor recusou a cobrança. Tente outro cartão ou use PIX abaixo."}
              </p>
              <p className="text-xs text-muted-foreground">
                Tentativa em {format(new Date(latestPayment!.date_created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} ·
                Código: <code>{latestPayment!.status_detail}</code>
              </p>
              <Button variant="outline" size="sm" onClick={() => setPaymentDismissed(true)}>Entendi</Button>
            </div>
          </div>
        </div>
      )}

      {isPaymentFailed && (
        <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4 space-y-3 max-w-3xl mx-auto">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-destructive">Pagamento recusado</p>
              <p className="text-sm text-muted-foreground">
                Tente outro cartão, ligue para o seu banco para liberar cobranças recorrentes, ou pague via PIX abaixo.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchParams({})}>Entendi</Button>
            </div>
          </div>
        </div>
      )}

      {isPaymentPending && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center max-w-3xl mx-auto">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ⏳ Seu pagamento está em análise. Assim que aprovado, seu plano será ativado automaticamente.
          </p>
        </div>
      )}

      {isTrialExpired && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center space-y-2 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="h-5 w-5" />
            Seu período de teste expirou
          </div>
          <p className="text-sm text-muted-foreground">
            Escolha um plano abaixo para continuar usando o sistema. Seus dados estão seguros.
          </p>
        </div>
      )}

      {isTrialing && !isTrialExpired && (
        <div className={`rounded-lg p-4 text-center border max-w-3xl mx-auto ${daysLeft <= 2 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"}`}>
          <div className="flex items-center justify-center gap-2 font-medium">
            <Clock className="h-4 w-4" />
            {daysLeft <= 2 ? "⚠️ " : ""}
            Período de teste: <strong>{daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}</strong>
          </div>
          {trialEndsAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Expira em {format(trialEndsAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      )}

      {isActive && planId && (() => {
        const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
        return (
          <div className="max-w-3xl mx-auto space-y-4">
            <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <Badge className="bg-emerald-500">✅ Plano ativo</Badge>
                    <CardTitle className="text-2xl mt-2">{VETPRO.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{VETPRO.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold tracking-tight">
                      R$ {VETPRO.price.toFixed(2).replace(".", ",")}
                    </div>
                    <div className="text-xs text-muted-foreground">por mês</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {periodEnd && (
                  <p className="text-muted-foreground">
                    Próxima renovação em <strong className="text-foreground">{format(periodEnd, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>
                  </p>
                )}
                <p className="text-muted-foreground">Cobrança mensal · Cancele quando quiser, sem fidelidade.</p>
              </CardContent>
              <CardFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setShowChangePlan((v) => !v)}>
                  {showChangePlan ? "Ocultar planos" : "Trocar de plano"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => window.open("mailto:systemhubrj@gmail.com?subject=Cancelamento%20de%20assinatura", "_blank")}
                >
                  Cancelar assinatura
                </Button>
              </CardFooter>
            </Card>
            <p className="text-xs text-center text-muted-foreground">
              Precisa de ajuda? Fale com o suporte:{" "}
              <a href="mailto:systemhubrj@gmail.com" className="text-primary font-medium hover:underline">
                systemhubrj@gmail.com
              </a>
            </p>
          </div>
        );
      })()}

      {!isActive && !isTrialing && !isTrialExpired && !subscription && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center max-w-3xl mx-auto">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            ⚠️ Você ainda não possui um plano ativo. Escolha um para desbloquear todas as funcionalidades.
          </p>
        </div>
      )}

      {(!isActive || showChangePlan) && (
      <div className="max-w-md mx-auto">
        <Card className="relative flex flex-col border-2 border-primary shadow-2xl shadow-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 text-xs font-bold shadow-md whitespace-nowrap">
            Plano completo · Tudo incluso
          </Badge>

          <CardHeader className="text-center pb-3 pt-8">
            <div className="mx-auto mb-3 w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <Brain className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">{VETPRO.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{VETPRO.description}</p>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-extrabold tracking-tight">R$ {VETPRO.price.toFixed(2).replace(".", ",")}</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {VETPRO.features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium flex-1">{label}</span>
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
            ))}
          </CardContent>

          <CardFooter className="flex-col gap-2 pt-4">
            <Button
              className="w-full"
              size="lg"
              disabled={loadingPlan === VETPRO.id}
              onClick={() => handleSelectPlan(VETPRO.id, "card")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {loadingPlan === VETPRO.id && loadingMethod === "card" ? "Redirecionando..." : "Assinar com cartão"}
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              disabled={loadingPlan === VETPRO.id}
              onClick={() => handleSelectPlan(VETPRO.id, "pix_native")}
            >
              <Zap className="h-4 w-4 mr-2" />
              {loadingPlan === VETPRO.id && loadingMethod === "pix_native" ? "Gerando PIX..." : "PIX rápido (QR aqui)"}
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              size="sm"
              disabled={loadingPlan === VETPRO.id}
              onClick={() => handleSelectPlan(VETPRO.id, "pix")}
            >
              <QrCode className="h-3.5 w-3.5 mr-2" />
              {loadingPlan === VETPRO.id && loadingMethod === "pix" ? "Abrindo..." : "PIX no Mercado Pago"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      )}

      <div className="text-center text-xs text-muted-foreground max-w-2xl mx-auto pt-4">
        <p>💡 Todos os planos dão 1 mês de acesso a cada pagamento confirmado. Cancele quando quiser, sem fidelidade.</p>
      </div>

      <PixPaymentDialog
        open={pixDialogOpen}
        onOpenChange={setPixDialogOpen}
        pixData={pixData}
        planName={pixPlanName}
        onApproved={() => {
          toast.success("Pagamento confirmado! Redirecionando...");
          setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
        }}
      />
    </div>
  );
}
