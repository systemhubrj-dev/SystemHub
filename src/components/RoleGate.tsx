import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeamRole, AppRole } from "@/hooks/useTeamRole";

interface RoleGateProps {
  /** Cargos permitidos. Se omitido, basta passar `permission`. */
  roles?: AppRole[];
  /** Chave de permissão (ex: "financeiro"). Verifica em useTeamRole.permissions. */
  permission?: string;
  children: ReactNode;
  /** Para onde redirecionar se bloqueado. Default: tela de bloqueio. */
  redirectTo?: string;
}

const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Proprietário(a)",
  vet: "Veterinário(a)",
  receptionist: "Recepcionista",
  stockist: "Estoquista",
};

/**
 * Bloqueia rotas com base no cargo (role) ou permissão fina do usuário.
 * Owners sempre passam.
 */
export function RoleGate({ roles, permission, children, redirectTo }: RoleGateProps) {
  const { role, permissions, loading } = useTeamRole();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  // Owner sempre pode
  if (role === "owner") return <>{children}</>;

  const allowedByRole = !roles || roles.includes(role);
  const allowedByPerm = !permission || !!permissions[permission];

  if (allowedByRole && allowedByPerm) return <>{children}</>;

  if (redirectTo) return <Navigate to={redirectTo} replace />;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-destructive/30">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Seu perfil de acesso ({ROLE_LABEL[role] || role}) não tem permissão para visualizar esta área.
              Fale com o responsável da clínica para solicitar acesso.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard">Voltar para o início</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
