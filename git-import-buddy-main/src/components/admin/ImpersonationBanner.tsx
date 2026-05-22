import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X } from "lucide-react";

export function ImpersonationBanner() {
  const { isAdmin, actingAs, actingAsName, setActingAs } = usePlatformAdmin();
  if (!isAdmin || !actingAs) return null;
  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Modo suporte — atuando como <strong>{actingAsName ?? actingAs.slice(0, 8)}</strong>. Toda ação fica registrada na auditoria.
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7"
        onClick={() => { setActingAs(null); window.location.href = "/admin"; }}
      >
        <X className="w-3 h-3 mr-1" /> Sair
      </Button>
    </div>
  );
}
