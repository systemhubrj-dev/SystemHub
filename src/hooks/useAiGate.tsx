import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";

/**
 * Gate único para qualquer chamada de IA no cliente.
 * - Bloqueia se o plano não permite (mostra toast + redireciona ao plano).
 * - Loga o uso após sucesso.
 *
 * Uso:
 *   const { runWithGate } = useAiGate();
 *   await runWithGate("clinical-ai:diagnosis", async () => {
 *     return await supabase.functions.invoke("clinical-ai", { body: ... });
 *   });
 */
export function useAiGate() {
  const navigate = useNavigate();
  const { canUseAi, hasFeature, logAiUsage } = usePlanLimits();

  const ensureCanUse = (): boolean => {
    if (!hasFeature("assistente_ia") && !hasFeature("ia_avancada")) {
      toast.error("Seu plano não inclui IA. Faça upgrade para liberar.", {
        action: { label: "Ver planos", onClick: () => navigate("/dashboard/plano") },
      });
      return false;
    }
    if (!canUseAi) {
      toast.error("Limite mensal de IA atingido.", {
        action: { label: "Ver planos", onClick: () => navigate("/dashboard/plano") },
      });
      return false;
    }
    return true;
  };

  const runWithGate = async <T,>(feature: string, fn: () => Promise<T>): Promise<T | null> => {
    if (!ensureCanUse()) return null;
    const result = await fn();
    void logAiUsage(feature);
    return result;
  };

  return { runWithGate, ensureCanUse };
}
