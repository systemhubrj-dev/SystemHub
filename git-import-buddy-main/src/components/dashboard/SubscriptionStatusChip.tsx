import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard, Sparkles } from "lucide-react";

/**
 * Chip permanente no header — sempre visível, não pode ser dispensado.
 * Mostra status do trial ou proximidade da renovação.
 */
export function SubscriptionStatusChip() {
  const navigate = useNavigate();
  const { subscription, loading, isActive, isTrialing, isTrialExpired, daysLeft } = useSubscription();

  if (loading || !subscription) return null;

  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
  const daysUntilRenewal = periodEnd
    ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Trial expirado
  if (isTrialExpired) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => navigate("/dashboard/meu-plano")}
        className="gap-1.5 h-8"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Teste expirado — Assinar</span>
        <span className="sm:hidden">Assinar</span>
      </Button>
    );
  }

  // Em trial
  if (isTrialing) {
    const urgent = daysLeft <= 2;
    const Icon = urgent ? AlertTriangle : Sparkles;
    return (
      <Button
        size="sm"
        variant={urgent ? "destructive" : "outline"}
        onClick={() => navigate("/dashboard/meu-plano")}
        className={`gap-1.5 h-8 ${!urgent ? "border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10" : ""}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {daysLeft === 0
            ? "Teste termina hoje"
            : daysLeft === 1
              ? "Teste: 1 dia"
              : `Teste: ${daysLeft} dias`}
        </span>
        <span className="sm:hidden">{daysLeft}d</span>
      </Button>
    );
  }

  // Assinante ativo perto de renovar
  if (isActive && daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal >= 0) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate("/dashboard/meu-plano")}
        className="gap-1.5 h-8 border-primary/40 text-primary hover:bg-primary/10"
      >
        <Clock className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {daysUntilRenewal === 0
            ? "Vence hoje"
            : daysUntilRenewal === 1
              ? "Vence amanhã"
              : `Vence em ${daysUntilRenewal}d`}
        </span>
        <span className="sm:hidden">{daysUntilRenewal}d</span>
      </Button>
    );
  }

  // Assinatura inativa
  if (subscription.status === "expired" || subscription.status === "cancelled") {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => navigate("/dashboard/meu-plano")}
        className="gap-1.5 h-8"
      >
        <CreditCard className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reativar plano</span>
        <span className="sm:hidden">Reativar</span>
      </Button>
    );
  }

  return null;
}
