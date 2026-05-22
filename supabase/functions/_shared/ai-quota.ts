// Shared helper to enforce AI quotas across edge functions.
// Reads the user's plan and current month's AI usage; blocks when limit reached.

const PLAN_LIMITS: Record<string, number | null> = {
  essencial: 0,        // sem IA
  profissional: null,  // ilimitado
  clinica: null,       // ilimitado
};

export interface QuotaResult {
  allowed: boolean;
  status?: number;
  message?: string;
  ownerId: string; // ID do dono da clínica (para multi-tenant)
}

/**
 * Verifica se o usuário pode usar IA. Retorna ownerId resolvido (dono da clínica
 * se for funcionário) e flag de permissão. Se estiver em trial, libera.
 */
export async function checkAiQuota(supabase: any, userId: string): Promise<QuotaResult> {
  // 1) Resolve owner (clinic) id — funcionários usam quota da clínica do dono
  const { data: ownerData } = await supabase.rpc("current_owner_id");
  const ownerId: string = ownerData ?? userId;

  // 2) Busca subscription do dono
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, trial_ends_at")
    .eq("user_id", ownerId)
    .maybeSingle();

  // Trial libera tudo
  const isTrialing = sub?.status === "trialing"
    && sub?.trial_ends_at
    && new Date(sub.trial_ends_at) > new Date();
  if (isTrialing) return { allowed: true, ownerId };

  const planId: string = sub?.plan_id ?? "essencial";
  const limit = PLAN_LIMITS[planId] ?? 0;

  // 3) Ilimitado
  if (limit === null) return { allowed: true, ownerId };

  // 4) Se limite for 0, bloqueia direto
  if (limit === 0) {
    return {
      allowed: false,
      status: 402,
      message: "Seu plano não inclui IA. Faça upgrade para Profissional para liberar.",
      ownerId,
    };
  }

  // 5) Conta uso do mês
  const { data: usage } = await supabase.rpc("ai_usage_current_month", { p_user_id: ownerId });
  const used = Number(usage ?? 0);
  if (used >= limit) {
    return {
      allowed: false,
      status: 402,
      message: `Limite mensal de IA atingido (${used}/${limit}). Faça upgrade ou aguarde o próximo mês.`,
      ownerId,
    };
  }

  return { allowed: true, ownerId };
}

/** Loga 1 uso na clínica do dono. Não-bloqueante. */
export async function logAiUsage(supabase: any, ownerId: string, feature: string): Promise<void> {
  try {
    await supabase.from("ai_usage_log").insert({ user_id: ownerId, feature });
  } catch (e) {
    console.error("logAiUsage error:", e);
  }
}
