import { useState, useEffect, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: ReactNode;
  itemLabel?: string;
  retentionDays?: number;
  loading?: boolean;
}

/**
 * Diálogo padrão para confirmar exclusão com checkbox de confirmação dupla.
 * Reutilizável em todo o app.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmar exclusão",
  description,
  itemLabel = "este item",
  retentionDays = 60,
  loading = false,
}: ConfirmDeleteDialogProps) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p>
                {description ?? (
                  <>
                    Você está prestes a excluir <strong>{itemLabel}</strong>. Esta ação não pode ser desfeita pela interface.
                  </>
                )}
              </p>
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                Por segurança, o registro fica armazenado em nossa <strong>lixeira segura</strong> por
                {" "}<strong>{retentionDays} dias</strong> antes de ser apagado em definitivo. Apenas você e a sua clínica
                poderão visualizar esse histórico.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <Checkbox
            id="confirm-delete-check"
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <Label
            htmlFor="confirm-delete-check"
            className="text-sm leading-snug cursor-pointer select-none"
          >
            Confirmo que desejo excluir este registro e entendo que ele será movido para a lixeira por {retentionDays} dias.
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!checked || loading}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
