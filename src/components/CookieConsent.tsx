import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "system-hub:cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // Em modo anônimo restrito o localStorage pode lançar; mostramos mesmo assim
      setVisible(true);
    }
  }, []);

  const persist = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignora — usuário em modo super-restrito
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies e privacidade"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-border bg-card/95 backdrop-blur shadow-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-shrink-0 hidden sm:flex h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Cookie className="h-4 w-4 text-primary sm:hidden" />
              Sua privacidade é importante
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Usamos cookies essenciais para o funcionamento da plataforma e cookies analíticos para
              entender como você usa o System Hub. Você pode aceitar todos ou continuar apenas com os
              essenciais. Saiba mais na nossa{" "}
              <Link to="/" className="underline underline-offset-2 hover:text-primary">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
          <button
            onClick={() => persist("rejected")}
            aria-label="Fechar aviso"
            className="absolute sm:static top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => persist("rejected")}
            className="w-full sm:w-auto"
          >
            Apenas essenciais
          </Button>
          <Button
            size="sm"
            onClick={() => persist("accepted")}
            className="w-full sm:w-auto"
          >
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
