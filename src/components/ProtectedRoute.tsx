import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isBlocked, loading: subLoading, error: subscriptionError, subscription } = useSubscription();
  const location = useLocation();

  // Spinner sticky: só mostra no PRIMEIRO carregamento (sem subscription ainda).
  // Revalidações em background (polling de 15s) não devem desmontar a árvore.
  if (authLoading || (subLoading && !subscription)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (subscriptionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert className="max-w-xl border-border bg-card text-card-foreground">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível validar o acesso agora</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              A tela foi protegida para não ficar em branco. Tente recarregar; se o plano tiver expirado,
              você poderá seguir para a tela de plano e regularizar o acesso.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
              <Button variant="outline" onClick={() => window.location.assign("/dashboard/plano")}>
                Ir para meu plano
              </Button>
              <Button variant="ghost" onClick={() => void signOut()}>
                Sair
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Allow access only to plan page when blocked (trial expired or no subscription)
  const allowedPaths = ["/dashboard/plano", "/dashboard/meu-plano"];
  const isAllowedPath = allowedPaths.some(p => location.pathname.startsWith(p));

  if (isBlocked && !isAllowedPath) {
    return <Navigate to="/dashboard/meu-plano" replace />;
  }

  return <>{children}</>;
}
