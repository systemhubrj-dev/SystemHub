import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export type PlanId = "essencial" | "profissional" | "clinica";

export type FeatureKey =
  | "internacao"
  | "funcionarios"
  | "relatorios_avancados"
  | "lembretes_whatsapp"
  | "ia_avancada"
  | "assistente_ia"
  | "multi_unidade"
  | "marca_branca";

interface PlanConfig {
  maxClients: number | null; // null = unlimited
  maxAiPerMonth: number | null; // null = unlimited (0 = nenhuma IA)
  maxTeamMembers: number; // 1 = só o dono
  features: Record<FeatureKey, boolean>;
}

const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  essencial: {
    maxClients: 200,
    maxAiPerMonth: 0, // SEM IA no Essencial
    maxTeamMembers: 1,
    features: {
      internacao: false,
      funcionarios: false,
      relatorios_avancados: false,
      lembretes_whatsapp: false,
      ia_avancada: false,
      assistente_ia: false,
      multi_unidade: false,
      marca_branca: false,
    },
  },
  profissional: {
    maxClients: null,
    maxAiPerMonth: null,
    maxTeamMembers: 3,
    features: {
      internacao: true,
      funcionarios: true,
      relatorios_avancados: true,
      lembretes_whatsapp: true,
      ia_avancada: true,
      assistente_ia: true,
      multi_unidade: false,
      marca_branca: false,
    },
  },
  clinica: {
    maxClients: null,
    maxAiPerMonth: null,
    maxTeamMembers: 999,
    features: {
      internacao: true,
      funcionarios: true,
      relatorios_avancados: true,
      lembretes_whatsapp: true,
      ia_avancada: true,
      assistente_ia: true,
      multi_unidade: true,
      marca_branca: true,
    },
  },
};

/**
 * Centraliza limites e gating do plano atual do usuário.
 * Usa subscription.plan_id; se não houver, assume "essencial" (mais restritivo).
 */
export function usePlanLimits() {
  const { user } = useAuth();
  const { subscription, isActive, isTrialing } = useSubscription();
  const [clientCount, setClientCount] = useState<number>(0);
  const [aiUsageCount, setAiUsageCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Plano efetivo: durante o trial, libera tudo (Profissional). Após, usa plan_id real.
  const effectivePlan: PlanId = isTrialing
    ? "profissional"
    : ((subscription?.plan_id as PlanId) || "essencial");

  const config = PLAN_CONFIGS[effectivePlan] ?? PLAN_CONFIGS.essencial;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const [clientsRes, aiRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("ai_usage_log" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      if (cancelled) return;
      setClientCount(clientsRes.count ?? 0);
      setAiUsageCount(aiRes.count ?? 0);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, subscription?.plan_id]);

  const canCreateClient =
    config.maxClients === null || clientCount < config.maxClients;

  const canUseAi =
    config.maxAiPerMonth === null || aiUsageCount < config.maxAiPerMonth;

  const hasFeature = (feature: FeatureKey): boolean => {
    return !!config.features[feature];
  };

  const refresh = async () => {
    if (!user) return;
    const [clientsRes, aiRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("ai_usage_log" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);
    setClientCount(clientsRes.count ?? 0);
    setAiUsageCount(aiRes.count ?? 0);
  };

  /** Loga 1 uso de IA. Retorna false se já estourou limite. */
  const logAiUsage = async (feature: string): Promise<boolean> => {
    if (!user) return false;
    if (!canUseAi) return false;
    const { error } = await supabase
      .from("ai_usage_log" as any)
      .insert({ user_id: user.id, feature });
    if (!error) {
      setAiUsageCount((c) => c + 1);
      return true;
    }
    return false;
  };

  return {
    plan: effectivePlan,
    config,
    loading,
    clientCount,
    aiUsageCount,
    canCreateClient,
    canUseAi,
    hasFeature,
    refresh,
    logAiUsage,
    isActive,
    isTrialing,
  };
}
