import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado pelo AppErrorBoundary", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Alert className="max-w-xl border-border bg-card text-card-foreground">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Algo inesperado aconteceu</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>A aplicação foi protegida para não exibir uma tela branca. Você pode recarregar e continuar.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recarregar página
                </Button>
                <Button variant="outline" onClick={() => window.location.assign("/")}>
                  Voltar ao início
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}