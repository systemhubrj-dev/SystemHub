import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  trial_ends_at: string;
  current_period_end: string | null;
  payment_provider: string | null;
  provider_subscription_id: string | null;
}

/**
 * Resolve qual user_id deve ter sua subscription consultada.
 * - Se o usuário logado é OWNER: ele mesmo.
 * - Se ele tem vínculo em user_roles (vet/receptionist/stockist): o owner_id correspondente.
 */
async function resolveSubscriptionUserId(authUserId: string): Promise<string> {
  const { data, error } = await supabase
    .from("user_roles" as any)
    .select("owner_id, role")
    .eq("user_id", authUserId)
    .neq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[useSubscription] resolve role error:", error.message);
    return authUserId;
  }
  return (data as any)?.owner_id ?? authUserId;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!authLoading && user) {
      void supabase
        .from("platform_admins" as any)
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => { if (isMounted) setIsPlatformAdmin(!!data); });
    } else {
      setIsPlatformAdmin(false);
    }

    if (authLoading) {
      setLoading(true);
      return () => { isMounted = false; };
    }

    if (!user) {
      setSubscription(null);
      setError(null);
      setLoading(false);
      setIsTeamMember(false);
      return;
    }

    let resolvedOwnerId = user.id;

    const fetchSubscription = async (options?: { background?: boolean }) => {
      if (!options?.background) setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", resolvedOwnerId)
        .maybeSingle();

      if (!isMounted) return null;

      if (fetchError) {
        console.error("[useSubscription] fetch error:", fetchError);
        setSubscription(null);
        setError(fetchError.message);
        setLoading(false);
        return null;
      }

      setSubscription(data);
      setLoading(false);
      return data;
    };

    let intervalId: number | null = null;
    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const syncMercadoPagoStatus = async () => {
      const current = await fetchSubscription({ background: true });
      if (!isMounted || !current) return;
      if (current.status === "active") { stopPolling(); return; }

      const shouldCheck =
        current.status === "trialing" &&
        current.payment_provider === "mercadopago" &&
        !!current.plan_id &&
        !isTeamMember; // funcionários não disparam sync de pagamento do dono

      if (!shouldCheck) return;

      try {
        const { data } = await supabase.functions.invoke("mp-payment-status");
        if (!isMounted) return;
        if (data?.activated) {
          await fetchSubscription({ background: true });
          stopPolling();
        }
      } catch (syncError) {
        console.warn("[useSubscription] mp sync error:", syncError);
      }
    };

    // 1) descobre se é team member, depois carrega subscription do owner
    void (async () => {
      const ownerId = await resolveSubscriptionUserId(user.id);
      if (!isMounted) return;
      resolvedOwnerId = ownerId;
      const teamMember = ownerId !== user.id;
      setIsTeamMember(teamMember);

      const current = await fetchSubscription();
      if (!isMounted || !current) return;

      // Funcionário não roda polling — segue o status do dono
      if (teamMember) return;

      if (current.status === "active") return;
      void syncMercadoPagoStatus();

      const handleVisibility = () => {
        if (document.visibilityState === "visible") void syncMercadoPagoStatus();
      };
      document.addEventListener("visibilitychange", handleVisibility);

      intervalId = window.setInterval(() => { void syncMercadoPagoStatus(); }, 15000);

      (window as any).__vetSubVisibilityCleanup = () => {
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    })();

    return () => {
      isMounted = false;
      stopPolling();
      if ((window as any).__vetSubVisibilityCleanup) {
        (window as any).__vetSubVisibilityCleanup();
        delete (window as any).__vetSubVisibilityCleanup;
      }
    };
  }, [user, authLoading]);

  const isActive = isPlatformAdmin || isTeamMember || subscription?.status === "active";
  const isTrialing = !isPlatformAdmin && !isTeamMember && subscription?.status === "trialing";
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const isTrialExpired = !isPlatformAdmin && !isTeamMember && isTrialing && trialEndsAt && trialEndsAt < new Date();
  const isBlocked = !isPlatformAdmin && !isTeamMember && (!subscription || isTrialExpired || subscription.status === "expired");

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    subscription,
    loading,
    error,
    isActive,
    isTrialing,
    isTrialExpired,
    isBlocked,
    daysLeft,
    isTeamMember,
    isPlatformAdmin,
    trialEndsAt,
    planId: subscription?.plan_id ?? null,
  };
}
