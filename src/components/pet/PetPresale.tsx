import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, Send, Search, Package, Wrench, X } from "lucide-react";

interface PresaleItem {
  id?: string;
  item_type: "product" | "service";
  inventory_item_id?: string;
  service_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

interface Presale {
  id: string;
  status: string;
  notes: string | null;
  total: number;
  created_at: string;
  items?: PresaleItem[];
}

interface PetPresaleProps {
  petId: string;
  clientId: string | null;
}

export default function PetPresale({ petId, clientId }: PetPresaleProps) {
  const { user } = useAuth();
  const [presales, setPresales] = useState<Presale[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cart, setCart] = useState<PresaleItem[]>([]);
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [addTab, setAddTab] = useState("product");

  const loadData = async () => {
    if (!user) return;
    const [presalesRes, prodRes, svcRes] = await Promise.all([
      supabase.from("pet_presales" as any).select("*").eq("pet_id", petId).eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("inventory_items").select("*").eq("user_id", user.id).order("name"),
      supabase.from("services" as any).select("*").eq("user_id", user.id).eq("active", true).order("name"),
    ]);
    const presaleData = (presalesRes.data as any[]) ?? [];

    // Load items for each presale
    if (presaleData.length > 0) {
      const ids = presaleData.map(p => p.id);
      const { data: items } = await supabase.from("pet_presale_items" as any).select("*").in("presale_id", ids);
      const itemsByPresale: Record<string, any[]> = {};
      ((items as any[]) ?? []).forEach(item => {
        if (!itemsByPresale[item.presale_id]) itemsByPresale[item.presale_id] = [];
        itemsByPresale[item.presale_id].push(item);
      });
      presaleData.forEach(p => { p.items = itemsByPresale[p.id] || []; });
    }

    setPresales(presaleData);
    setProducts((prodRes.data as any[]) ?? []);
    setServices((svcRes.data as any[]) ?? []);
  };

  useEffect(() => { loadData(); }, [user, petId]);

  const addToCart = (item: any, type: "product" | "service") => {
    const price = type === "product" ? (item.sell_price || 0) : (item.price || 0);
    const existing = cart.find(c =>
      type === "product" ? c.inventory_item_id === item.id : c.service_id === item.id
    );
    if (existing) {
      setCart(cart.map(c => c === existing
        ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unit_price }
        : c
      ));
    } else {
      setCart([...cart, {
        item_type: type,
        inventory_item_id: type === "product" ? item.id : undefined,
        service_id: type === "service" ? item.id : undefined,
        description: item.name,
        quantity: 1,
        unit_price: price,
        discount: 0,
        subtotal: price,
      }]);
    }
  };

  const removeFromCart = (idx: number) => setCart(cart.filter((_, i) => i !== idx));

  const updateCartItem = (idx: number, field: string, value: number) => {
    setCart(cart.map((c, i) => {
      if (i !== idx) return c;
      const updated = { ...c, [field]: value };
      updated.subtotal = updated.quantity * updated.unit_price - updated.discount;
      return updated;
    }));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.subtotal, 0);

  const handleSavePresale = async () => {
    if (!user || cart.length === 0) { toast.error("Adicione ao menos um item"); return; }

    const { data: presale, error } = await supabase.from("pet_presales" as any).insert({
      user_id: user.id,
      pet_id: petId,
      client_id: clientId || null,
      status: "pending",
      notes: notes || null,
      total: cartTotal,
    } as any).select("id").single();

    if (error) { toast.error("Erro: " + error.message); return; }

    const items = cart.map(c => ({
      user_id: user.id,
      presale_id: (presale as any).id,
      item_type: c.item_type,
      inventory_item_id: c.inventory_item_id || null,
      service_id: c.service_id || null,
      description: c.description,
      quantity: c.quantity,
      unit_price: c.unit_price,
      discount: c.discount,
      subtotal: c.subtotal,
    }));

    await supabase.from("pet_presale_items" as any).insert(items as any);

    toast.success("Pré-venda criada!");
    setDialogOpen(false);
    setCart([]);
    setNotes("");
    loadData();
  };

  const handleSendToCash = async (presaleId: string) => {
    await supabase.from("pet_presales" as any).update({ status: "sent_to_cash" } as any).eq("id", presaleId);
    toast.success("Enviado ao caixa!");
    loadData();
  };

  const handleCancel = async (presaleId: string) => {
    await supabase.from("pet_presales" as any).update({ status: "cancelled" } as any).eq("id", presaleId);
    toast.success("Pré-venda cancelada");
    loadData();
  };

  const handleDelete = async (presaleId: string) => {
    await supabase.from("pet_presale_items" as any).delete().eq("presale_id", presaleId);
    await supabase.from("pet_presales" as any).delete().eq("id", presaleId);
    toast.success("Pré-venda excluída!");
    loadData();
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredServices = services.filter((s: any) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const fmtMoney = (v: number) => `R$ ${v.toFixed(2)}`;
  const statusLabel = (s: string) => {
    if (s === "pending") return { label: "Pendente", variant: "outline" as const };
    if (s === "sent_to_cash") return { label: "Enviado ao caixa", variant: "default" as const };
    if (s === "cancelled") return { label: "Cancelada", variant: "secondary" as const };
    return { label: s, variant: "outline" as const };
  };

  return (
    <div className="space-y-3">
      <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
        <Plus className="h-3 w-3 mr-1" /> Nova pré-venda
      </Button>

      {presales.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pré-venda registrada</p>
      ) : (
        <div className="space-y-2">
          {presales.map((ps) => {
            const st = statusLabel(ps.status);
            return (
              <div key={ps.id} className="border rounded-lg p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="font-bold">{fmtMoney(ps.total)}</span>
                  </div>
                  <div className="flex gap-1">
                    {ps.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendToCash(ps.id)} title="Enviar ao caixa">
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCancel(ps.id)} title="Cancelar">
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(ps.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {ps.items && ps.items.length > 0 && (
                  <div className="text-xs space-y-0.5">
                    {ps.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.description}</span>
                        <span>{fmtMoney(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {ps.notes && <p className="text-xs text-muted-foreground">{ps.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog for creating presale */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Pré-venda</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Search and add */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar produto ou serviço..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <Tabs value={addTab} onValueChange={setAddTab}>
              <TabsList className="w-full">
                <TabsTrigger value="product" className="flex-1"><Package className="h-3 w-3 mr-1" /> Produtos</TabsTrigger>
                <TabsTrigger value="service" className="flex-1"><Wrench className="h-3 w-3 mr-1" /> Serviços</TabsTrigger>
              </TabsList>
              <TabsContent value="product">
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                  {filteredProducts.map(p => (
                    <button key={p.id} className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 text-left text-sm" onClick={() => addToCart(p, "product")}>
                      <span>{p.name}</span>
                      <span className="font-medium text-primary">{p.sell_price ? fmtMoney(p.sell_price) : "S/P"}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="service">
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                  {filteredServices.map((s: any) => (
                    <button key={s.id} className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 text-left text-sm" onClick={() => addToCart(s, "service")}>
                      <span>{s.name}</span>
                      <span className="font-medium text-primary">{fmtMoney(s.price)}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Itens ({cart.length})
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs w-16">Qtd</TableHead>
                      <TableHead className="text-xs w-24">Preço</TableHead>
                      <TableHead className="text-xs w-20">Subtotal</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{c.description}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={c.quantity === 0 ? "" : c.quantity}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") { updateCartItem(idx, "quantity", 0); return; }
                              const n = parseInt(raw);
                              if (Number.isFinite(n)) updateCartItem(idx, "quantity", Math.max(0, n));
                            }}
                            onBlur={(e) => {
                              const n = parseInt(e.target.value);
                              if (!Number.isFinite(n) || n < 1) updateCartItem(idx, "quantity", 1);
                            }}
                            className="h-7 text-xs w-14"
                          />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" value={c.unit_price} onChange={(e) => updateCartItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="h-7 text-xs w-20" />
                        </TableCell>
                        <TableCell className="text-xs font-medium">{fmtMoney(c.subtotal)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right font-bold text-sm">
                  Total: {fmtMoney(cartTotal)}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." />
            </div>

            <Button onClick={handleSavePresale} className="w-full" disabled={cart.length === 0}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Criar pré-venda ({fmtMoney(cartTotal)})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
