import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { getVertical, type VerticalConfig, type VerticalId } from "@/verticals";

/** Lê a vertical da conta (do dono da clínica em que o usuário opera). */
export function useVertical(): { vertical: VerticalConfig; loading: boolean; verticalId: VerticalId } {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const [verticalId, setVerticalId] = useState<VerticalId>("vet");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ownerId = clinicId ?? user?.id;
    if (!ownerId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from("profiles").select("vertical").eq("user_id", ownerId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setVerticalId(((data as any)?.vertical ?? "vet") as VerticalId);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id, clinicId]);

  return { vertical: getVertical(verticalId), loading, verticalId };
}
