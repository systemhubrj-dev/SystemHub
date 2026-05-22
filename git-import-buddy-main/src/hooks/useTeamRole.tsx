import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

export type AppRole = "owner" | "vet" | "receptionist" | "stockist";

export interface TeamRoleInfo {
  role: AppRole;
  ownerId: string;
  permissions: Record<string, boolean>;
  loading: boolean;
}

/** Permissões padrão por cargo. Cada chave corresponde a uma área do sistema. */
export const DEFAULT_PERMISSIONS: Record<AppRole, Record<string, boolean>> = {
  owner: {
    agenda: true, clientes: true, animais: true, estoque: true, fornecedores: true, servicos: true,
    caixa: true, bulario: true, documentos: true, internacao: true, lembretes: true,
    financeiro: true, contas: true, funcionarios: true, relatorios: true,
    lixeira: true, configuracoes: true,
  },
  vet: {
    agenda: true, clientes: true, animais: true, estoque: true, fornecedores: false, servicos: true,
    caixa: true, bulario: true, documentos: true, internacao: true, lembretes: true,
    financeiro: false, contas: false, funcionarios: false, relatorios: false,
    lixeira: false, configuracoes: false,
  },
  receptionist: {
    agenda: true, clientes: true, animais: true, estoque: false, fornecedores: false, servicos: false,
    caixa: true, bulario: false, documentos: false, internacao: false, lembretes: true,
    financeiro: false, contas: false, funcionarios: false, relatorios: false,
    lixeira: false, configuracoes: false,
  },
  stockist: {
    agenda: false, clientes: false, animais: false, estoque: true, fornecedores: true, servicos: false,
    caixa: true, bulario: true, documentos: false, internacao: false, lembretes: false,
    financeiro: false, contas: false, funcionarios: false, relatorios: false,
    lixeira: false, configuracoes: false,
  },
};

/**
 * Retorna o cargo do usuário logado dentro da clínica em que ele opera
 * (própria, se for owner; ou a do dono que o convidou).
 */
export function useTeamRole(): TeamRoleInfo {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, actingAs, loading: adminLoading } = usePlatformAdmin();
  const [role, setRole] = useState<AppRole>("owner");
  const [ownerId, setOwnerId] = useState<string>("");
  const [perms, setPerms] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS.owner);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    // Platform admin impersonating a clinic — full owner powers
    if (isAdmin && actingAs) {
      setRole("owner");
      setOwnerId(actingAs);
      setPerms(DEFAULT_PERMISSIONS.owner);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const { data: memberRow } = await supabase
        .from("user_roles" as any)
        .select("role, owner_id")
        .eq("user_id", user.id)
        .neq("role", "owner")
        .maybeSingle();

      if (cancelled) return;

      const effectiveRole: AppRole = (memberRow as any)?.role ?? "owner";
      const effectiveOwner: string = (memberRow as any)?.owner_id ?? user.id;

      const { data: permRow } = await supabase
        .from("user_role_permissions" as any)
        .select("permissions")
        .eq("user_id", user.id)
        .eq("owner_id", effectiveOwner)
        .maybeSingle();

      if (cancelled) return;

      const customPerms = (permRow as any)?.permissions ?? null;
      setRole(effectiveRole);
      setOwnerId(effectiveOwner);
      setPerms({
        ...DEFAULT_PERMISSIONS[effectiveRole],
        ...(customPerms ?? {}),
      });
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [user, authLoading, isAdmin, actingAs, adminLoading]);

  return { role, ownerId, permissions: perms, loading };
}
