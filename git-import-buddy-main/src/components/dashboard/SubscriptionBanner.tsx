import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard, Sparkles, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DISMISS_KEY = "subscription_banner_dismissed_at";

export function SubscriptionBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription, loading, isActive, isTrialing, isTrialExpired, daysLeft, trialEndsAt } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismiss every day so o usuário continua sendo lembrado
  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return;
    const dismissedAt = new Date(stored);
    const isSameDay =
      dismissedAt.getFullYear() === new Date().getFullYear() &&
      dismissedAt.getMonth() === new Date().getMonth() &&
      dismissedAt.getDate() === new Date().getDate();
    setDismissed(isSameDay);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setDismissed(true);
  };

  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const daysUntilRenewal = periodEnd
    ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const banner = useMemo(() => {
    if (loading || !subscription) return null;

    // Trial expirado — bloqueante, não pode ser dispensado
    if (isTrialExpired) {
      return {
        tone: "destructive" as const,
        icon: AlertTriangle,
        title: "Seu período de teste expirou",
        message: "Para continuar usando a plataforma, escolha um plano agora.",
        cta: "Assinar agora",
        canDismiss: false,
      };
    }

    // Em trial — sempre visível, NUNCA pode ser dispensado
    if (isTrialing && trialEndsAt) {
      const urgent = daysLeft <= 2;
      return {
        tone: urgent ? ("destructive" as const) : ("warning" as const),
        icon: urgent ? AlertTriangle : Sparkles,
        title:
          daysLeft === 0
            ? "Seu teste grátis termina hoje!"
            : daysLeft === 1
              ? "Falta 1 dia para o fim do seu teste grátis"
              : `Você está no período de teste — ${daysLeft} dias restantes`,
        message: `Aproveite todos os recursos até ${format(trialEndsAt, "dd 'de' MMMM", { locale: ptBR })}. Assine agora e garanta a continuidade do seu trabalho.`,
        cta: "Tornar-se assinante",
        canDismiss: false,
      };
    }

    // Assinante ativo — lembrar próximo da renovação
    if (isActive && daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal >= 0) {
      return {
        tone: "info" as const,
        icon: Clock,
        title:
          daysUntilRenewal === 0
            ? "Sua mensalidade vence hoje"
            : daysUntilRenewal === 1
              ? "Sua mensalidade vence amanhã"
              : `Sua mensalidade vence em ${daysUntilRenewal} dias`,
        message: periodEnd
          ? `Renovação prevista para ${format(periodEnd, "dd 'de' MMMM", { locale: ptBR })}. Garanta que seu pagamento esteja em dia.`
          : "Garanta que seu pagamento esteja em dia para não interromper o serviço.",
        cta: "Ver meu plano",
        canDismiss: true,
      };
    }

    // Assinatura expirada/cancelada
    if (subscription.status === "expired" || subscription.status === "cancelled") {
      return {
        tone: "destructive" as const,
        icon: AlertTriangle,
        title: "Sua assinatura está inativa",
        message: "Reative seu plano para continuar usando todos os recursos da plataforma.",
        cta: "Reativar plano",
        canDismiss: false,
      };
    }

    return null;
  }, [loading, subscription, isTrialing, isTrialExpired, isActive, daysLeft, trialEndsAt, daysUntilRenewal, periodEnd]);

  // Não mostra na própria página de plano
  if (location.pathname.startsWith("/dashboard/meu-plano")) return null;
  if (!banner) return null;
  if (banner.canDismiss && dismissed) return null;

  const toneClasses = {
    destructive: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
    warning: "bg-amber-500/10 border-amber-500/30 text-foreground",
    info: "bg-primary/10 border-primary/30 text-foreground",
  };

  const iconClasses = {
    destructive: "text-destructive",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-primary",
  };

  const Icon = banner.icon;

  return (
    <div className={`border-b ${toneClasses[banner.tone]}`}>
      <div className="flex items-start gap-3 px-4 py-3 md:px-6">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconClasses[banner.tone]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{banner.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{banner.message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={banner.tone === "destructive" ? "destructive" : "default"}
            onClick={() => navigate("/dashboard/meu-plano")}
            className="gap-1.5"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{banner.cta}</span>
            <span className="sm:hidden">Assinar</span>
          </Button>
          {banner.canDismiss && (
            <Button size="icon" variant="ghost" onClick={handleDismiss} aria-label="Dispensar">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
