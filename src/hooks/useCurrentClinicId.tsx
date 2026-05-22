import { useTeamRole } from "@/hooks/useTeamRole";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

/**
 * Retorna o `user_id` que serve como "dono" dos dados da clínica em que o usuário opera.
 * - Owner: o próprio id.
 * - Team member: o id do owner da clínica.
 * - Platform admin atuando como X: o id de X.
 */
export function useCurrentClinicId(): { clinicId: string | null; loading: boolean; isTeamMember: boolean } {
  const { user, loading: authLoading } = useAuth();
  const { ownerId, role, loading: roleLoading } = useTeamRole();
  const { isAdmin, actingAs } = usePlatformAdmin();

  const loading = authLoading || roleLoading;
  if (loading || !user) return { clinicId: null, loading, isTeamMember: false };

  if (isAdmin && actingAs) {
    return { clinicId: actingAs, loading: false, isTeamMember: false };
  }

  const isTeamMember = role !== "owner";
  const clinicId = isTeamMember ? ownerId : user.id;
  return { clinicId, loading: false, isTeamMember };
}
