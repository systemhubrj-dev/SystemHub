import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PixData {
  payment_id: number | string;
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  amount: number;
  expires_at: string;
}

interface PixPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pixData: PixData | null;
  planName: string;
  onApproved?: () => void;
}

export function PixPaymentDialog({ open, onOpenChange, pixData, planName, onApproved }: PixPaymentDialogProps) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Countdown
  useEffect(() => {
    if (!open || !pixData) return;
    const update = () => {
      const ms = new Date(pixData.expires_at).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [open, pixData]);

  // Polling do status
  useEffect(() => {
    if (!open || !pixData || status === "approved") return;
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mp-check-payment", {
          body: { paymentId: pixData.payment_id },
        });
        if (error) return;
        if (data?.status) {
          setStatus(data.status);
          if (data.status === "approved") {
            toast.success("Pagamento confirmado! Plano ativado.");
            onApproved?.();
          }
        }
      } catch {
        // silencia erros de polling
      }
    };
    const id = setInterval(checkStatus, 4000);
    checkStatus();
    return () => clearInterval(id);
  }, [open, pixData, status, onApproved]);

  const handleCopy = async () => {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const expired = secondsLeft <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento PIX — {planName}</DialogTitle>
          <DialogDescription>
            Pague R$ {pixData?.amount.toFixed(2).replace(".", ",")} pelo app do seu banco (Nubank, Itaú, Bradesco, Caixa, etc.).
          </DialogDescription>
        </DialogHeader>

        {!pixData ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : status === "approved" ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <p className="font-semibold text-lg">Pagamento aprovado!</p>
            <p className="text-sm text-muted-foreground">Seu plano foi ativado.</p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code */}
            {pixData.qr_code_base64 && (
              <div className="bg-white p-4 rounded-lg border flex justify-center">
                <img
                  src={`data:image/png;base64,${pixData.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56"
                />
              </div>
            )}

            {/* Instruções */}
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escolha pagar com PIX → Ler QR Code (ou Copia e Cola)</li>
              <li>Confirme o valor e finalize</li>
            </ol>

            {/* Copia e cola */}
            {pixData.qr_code && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">PIX Copia e Cola</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={pixData.qr_code}
                    className="flex-1 text-xs px-3 py-2 rounded-md border bg-muted font-mono truncate"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Status / countdown */}
            <div className="flex items-center justify-between text-xs bg-muted rounded-md p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Aguardando pagamento...</span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5" />
                {expired ? (
                  <span className="text-destructive">Expirado</span>
                ) : (
                  <span>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
                )}
              </div>
            </div>

            {pixData.ticket_url && (
              <a
                href={pixData.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline block text-center"
              >
                Abrir comprovante no Mercado Pago →
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
