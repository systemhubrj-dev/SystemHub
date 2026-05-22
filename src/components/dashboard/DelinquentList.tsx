import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Copy, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  delinquents: any[];
}

const generateBillingMessage = (item: any) => {
  const clientName = item.clients?.name ?? "Cliente";
  const dateStr = format(new Date(item.date), "dd/MM/yyyy");
  const value = Number(item.price).toFixed(2);
  return `Olá ${clientName}, identificamos que o pagamento referente ao atendimento do dia ${dateStr} no valor de R$ ${value} ainda está pendente. Poderia nos informar sobre a situação? Agradecemos!`;
};

export default function DelinquentList({ delinquents }: Props) {
  const copyBillingMessage = (item: any) => {
    navigator.clipboard.writeText(generateBillingMessage(item));
    toast.success("Mensagem copiada!");
  };

  const sendWhatsAppBilling = (item: any) => {
    const phone = item.clients?.phone?.replace(/\D/g, "");
    if (!phone) { toast.error("Cliente sem telefone cadastrado"); return; }
    const msg = encodeURIComponent(generateBillingMessage(item));
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Pagamentos pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {delinquents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento pendente 🎉</p>
        ) : (
          <div className="space-y-3">
            {delinquents.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3">
                <div>
                  <p className="font-medium">{(item.clients as any)?.name ?? "Cliente não informado"}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.service ?? "Atendimento"} — {format(new Date(item.date), "dd/MM/yyyy")}
                  </p>
                  <p className="text-sm font-semibold text-red-600">R$ {Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyBillingMessage(item)}>
                    <Copy className="h-3 w-3 mr-1" />Copiar
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => sendWhatsAppBilling(item)}>
                    <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
