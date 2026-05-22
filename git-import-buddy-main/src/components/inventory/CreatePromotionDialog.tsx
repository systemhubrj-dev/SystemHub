import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tag, Percent, Copy, Share2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface CreatePromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  batchId?: string;
  currentPrice: number;
  suggestedDiscount: number;
  expiryDate?: string;
  onCreated?: () => void;
}

export function CreatePromotionDialog({
  open, onOpenChange, itemId, itemName, batchId,
  currentPrice, suggestedDiscount, expiryDate, onCreated,
}: CreatePromotionDialogProps) {
  const { user } = useAuth();
  const [discount, setDiscount] = useState(suggestedDiscount);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [saving, setSaving] = useState(false);

  const promoPrice = Math.round(currentPrice * (1 - discount / 100) * 100) / 100;

  useEffect(() => {
    if (open) {
      setDiscount(suggestedDiscount);
      // End date = expiry date or 30 days from now
      const end = expiryDate ? expiryDate : format(addDays(new Date(), 30), "yyyy-MM-dd");
      setEndDate(end);
      // Auto-generate coupon code
      const code = `PROMO${itemName.replace(/\s+/g, "").substring(0, 6).toUpperCase()}${Math.floor(Math.random() * 100)}`;
      setCouponCode(code);
      setNotes("");
    }
  }, [open, suggestedDiscount, expiryDate, itemName]);

  const handleSave = async () => {
    if (!user || !endDate) return;
    setSaving(true);
    const { error } = await supabase.from("promotions").insert({
      user_id: user.id,
      item_id: itemId,
      batch_id: batchId || null,
      discount_percent: discount,
      original_price: currentPrice,
      promo_price: promoPrice,
      coupon_code: couponCode || null,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: endDate,
      status: "active",
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar promoção: " + error.message);
      return;
    }
    toast.success("Promoção criada com sucesso!");
    onOpenChange(false);
    onCreated?.();
  };

  const shareText = `🎉 PROMOÇÃO! ${itemName} com ${discount}% de desconto!\nDe R$ ${currentPrice.toFixed(2)} por R$ ${promoPrice.toFixed(2)}\n${couponCode ? `Cupom: ${couponCode}` : ""}\nVálido até ${endDate ? format(new Date(endDate + "T12:00:00"), "dd/MM/yyyy") : ""}`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    toast.success("Texto da promoção copiado!");
  };

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-600" />
            Criar Promoção
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <p className="font-medium">{itemName}</p>
            <p className="text-sm text-muted-foreground">
              Preço atual: <strong>R$ {currentPrice.toFixed(2)}</strong>
              {expiryDate && <> | Validade: <strong>{format(new Date(expiryDate + "T12:00:00"), "dd/MM/yyyy")}</strong></>}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" /> Desconto (%)
              </Label>
              <Input
                type="number"
                min="1"
                max="99"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço promocional</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                <span className="text-lg font-bold text-emerald-600">R$ {promoPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Economia para o cliente:</span>
              <Badge className="bg-emerald-600 text-white text-sm">
                R$ {(currentPrice - promoPrice).toFixed(2)} ({discount}% off)
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Código do cupom</Label>
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Ex: PROMO30" />
          </div>

          <div className="space-y-2">
            <Label>Válido até</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Promoção para itens próximos ao vencimento" rows={2} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Criar Promoção"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyShare}>
              <Copy className="h-3 w-3 mr-1" /> Copiar texto
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-emerald-600" onClick={handleWhatsAppShare}>
              <Share2 className="h-3 w-3 mr-1" /> WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
