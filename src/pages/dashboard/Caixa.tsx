import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Trash2, Package, Wrench,
  Lock, Unlock, History, CreditCard, Receipt, Search, X, User, UserX, Undo2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CashAIPanel } from "@/components/cash/CashAIPanel";

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Cartão Crédito" },
  { value: "debito", label: "Cartão Débito" },
  { value: "boleto", label: "Boleto" },
];

interface CartItem {
  id: string;
  item_type: "product" | "service";
  inventory_item_id?: string;
  service_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  max_stock?: number;
}

export default function Caixa() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const effectiveUserId = clinicId ?? user?.id ?? "";
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [presales, setPresales] = useState<any[]>([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const [rightTab, setRightTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [discountRS, setDiscountRS] = useState("");
  const [discountPct, setDiscountPct] = useState("");

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<string>("");

  const loadData = async () => {
    if (!effectiveUserId) return;
    const [sessRes, prodRes, svcRes, cliRes, presalesRes] = await Promise.all([
      supabase.from("cash_sessions" as any).select("*").eq("user_id", effectiveUserId).order("opened_at", { ascending: false }),
      supabase.from("inventory_items").select("*").eq("user_id", effectiveUserId).order("name"),
      supabase.from("services").select("*").eq("user_id", effectiveUserId).eq("active", true).order("name"),
      supabase.from("clients").select("id, name, phone").eq("user_id", effectiveUserId).order("name"),
      supabase.from("pet_presales" as any).select("*, pets!pet_presales_pet_id_fkey(name, client_id, clients!pets_client_id_fkey(name))").eq("user_id", effectiveUserId).eq("status", "sent_to_cash").order("created_at", { ascending: false }),
    ]);
    const allSessions = (sessRes.data as any[]) ?? [];
    setSessions(allSessions);
    setActiveSession(allSessions.find((s) => s.status === "open") || null);
    setProducts((prodRes.data as any[]) ?? []);
    setServices((svcRes.data as any[]) ?? []);
    setClients((cliRes.data as any[]) ?? []);

    const presaleData = (presalesRes.data as any[]) ?? [];
    if (presaleData.length > 0) {
      const ids = presaleData.map(p => p.id);
      const { data: items } = await supabase.from("pet_presale_items" as any).select("*").in("presale_id", ids);
      const itemsByPresale: Record<string, any[]> = {};
      ((items as any[]) ?? []).forEach((item: any) => {
        if (!itemsByPresale[item.presale_id]) itemsByPresale[item.presale_id] = [];
        itemsByPresale[item.presale_id].push(item);
      });
      presaleData.forEach(p => { p.items = itemsByPresale[p.id] || []; });
    }
    setPresales(presaleData);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleOpenSession = async () => {
    if (!effectiveUserId) return;
    const { error } = await supabase.from("cash_sessions" as any).insert({
      user_id: effectiveUserId, opening_amount: parseFloat(openingAmount) || 0, status: "open",
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Caixa aberto!");
    setOpenDialog(false); setOpeningAmount(""); loadData();
  };

  const handleCloseSession = async () => {
    if (!user || !activeSession) return;
    const { error } = await supabase.from("cash_sessions" as any).update({
      status: "closed", closed_at: new Date().toISOString(),
      closing_amount: closingAmount ? parseFloat(closingAmount) : null,
      notes: closingNotes || null,
    } as any).eq("id", activeSession.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Caixa fechado!");
    setCloseDialog(false); setClosingAmount(""); setClosingNotes(""); setCart([]); loadData();
  };

  const addToCart = (item: any, type: "product" | "service") => {
    const existing = cart.find((c) =>
      type === "product" ? c.inventory_item_id === item.id : c.service_id === item.id
    );
    if (existing) {
      if (type === "product" && existing.quantity >= (item.quantity || 0)) {
        toast.error("Estoque insuficiente"); return;
      }
      setCart(cart.map((c) =>
        c.id === existing.id
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unit_price - c.discount }
          : c
      ));
    } else {
      const price = type === "product" ? (item.sell_price || 0) : (item.price || 0);
      setCart([...cart, {
        id: crypto.randomUUID(), item_type: type,
        inventory_item_id: type === "product" ? item.id : undefined,
        service_id: type === "service" ? item.id : undefined,
        description: item.name, quantity: 1, unit_price: price, discount: 0, subtotal: price,
        max_stock: type === "product" ? item.quantity : undefined,
      }]);
    }
  };

  const updateCartItem = (id: string, field: string, value: number) => {
    setCart(cart.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      updated.subtotal = updated.quantity * updated.unit_price - updated.discount;
      return updated;
    }));
  };

  const removeFromCart = (id: string) => setCart(cart.filter((c) => c.id !== id));

  const addItemsFromAI = (items: any[]) => {
    const newCart: CartItem[] = items.map((it) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const price = Number(it.unit_price) || 0;
      let max_stock: number | undefined;
      if (it.item_type === "product" && it.inventory_item_id) {
        const p = products.find((x) => x.id === it.inventory_item_id);
        if (p) max_stock = p.quantity;
      }
      return {
        id: crypto.randomUUID(),
        item_type: it.item_type,
        inventory_item_id: it.inventory_item_id || undefined,
        service_id: it.service_id || undefined,
        description: it.description,
        quantity: qty,
        unit_price: price,
        discount: 0,
        subtotal: qty * price,
        max_stock,
      };
    });
    setCart((prev) => [...prev, ...newCart]);
    toast.success(`${newCart.length} ${newCart.length === 1 ? "item adicionado" : "itens adicionados"} pela IA`);
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + c.subtotal, 0);
  const globalDiscountValue = parseFloat(discountRS) || 0;
  const globalDiscountPct = parseFloat(discountPct) || 0;
  const globalDiscount = globalDiscountValue + (cartSubtotal * globalDiscountPct / 100);
  const cartTotal = Math.max(0, cartSubtotal - globalDiscount);

  const handleCheckout = async () => {
    if (!effectiveUserId || !activeSession || cart.length === 0) return;

    // 1) Validação de estoque ANTES de qualquer insert (refetch para evitar race)
    const productIds = cart.filter(c => c.item_type === "product" && c.inventory_item_id).map(c => c.inventory_item_id!);
    if (productIds.length > 0) {
      const { data: fresh } = await supabase.from("inventory_items").select("id, name, quantity").in("id", productIds);
      const stockMap = new Map((fresh ?? []).map(p => [p.id, p]));
      for (const c of cart) {
        if (c.item_type === "product" && c.inventory_item_id) {
          const p = stockMap.get(c.inventory_item_id);
          if (!p || Number(p.quantity) < c.quantity) {
            toast.error(`Estoque insuficiente: ${c.description} (disponível: ${p?.quantity ?? 0})`);
            return;
          }
        }
      }
    }

    // 2) Validação de desconto
    if (globalDiscount > cartSubtotal) {
      toast.error("Desconto maior que o valor da venda. Revise os campos.");
      return;
    }

    // 3) Insere itens do caixa
    const items = cart.map((c) => ({
      user_id: effectiveUserId, session_id: activeSession.id,
      client_id: selectedClient?.id || null,
      item_type: c.item_type, inventory_item_id: c.inventory_item_id || null,
      service_id: c.service_id || null, description: c.description,
      quantity: c.quantity, unit_price: c.unit_price, discount: c.discount,
      subtotal: c.subtotal, payment_method: paymentMethod,
    }));
    const { error } = await supabase.from("cash_items" as any).insert(items as any);
    if (error) { toast.error("Erro: " + error.message); return; }

    // 4) Baixa estoque atomicamente
    for (const c of cart) {
      if (c.item_type === "product" && c.inventory_item_id) {
        const ok = await (supabase.rpc as any)("decrement_stock", {
          p_item_id: c.inventory_item_id,
          p_qty: c.quantity,
        });
        if (ok?.data) {
          await supabase.from("inventory_movements").insert({
            user_id: effectiveUserId, item_id: c.inventory_item_id, type: "exit",
            quantity: c.quantity, reason: "Venda no caixa", reference_type: "cash_session",
            reference_id: activeSession.id,
          });
        }
      }
    }

    // 5) Receita única, vinculada à sessão (permite estorno)
    await supabase.from("financial_records").insert({
      user_id: effectiveUserId, type: "income", amount: cartTotal,
      description: `Venda: ${cart.map((c) => c.description).join(", ")}`.slice(0, 250),
      category: "venda", payment_method: paymentMethod,
      client_id: selectedClient?.id || null,
      date: new Date().toISOString().slice(0, 10),
      cash_session_id: activeSession.id,
    } as any);

    toast.success(`Venda de R$ ${cartTotal.toFixed(2)} finalizada!`);
    setCart([]); setSelectedClient(null); setPaymentMethod("dinheiro");
    setDiscountRS(""); setDiscountPct(""); loadData();
  };

  const loadSessionHistory = async (sessionId: string) => {
    if (!effectiveUserId) return;
    const { data } = await supabase.from("cash_items" as any)
      .select("*").eq("session_id", sessionId).eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false });
    setHistoryItems((data as any[]) ?? []);
    setSelectedSessionHistory(sessionId);
  };

  const handleReverseSale = async (item: any) => {
    if (!effectiveUserId) return;
    if (!window.confirm(`Estornar "${item.description}" (R$ ${Number(item.subtotal).toFixed(2)})? Estoque será devolvido.`)) return;

    // 1) Devolve estoque (se for produto)
    if (item.item_type === "product" && item.inventory_item_id) {
      const ok = await (supabase.rpc as any)("increment_stock", {
        p_item_id: item.inventory_item_id,
        p_qty: Number(item.quantity),
      });
      if (ok?.data) {
        await supabase.from("inventory_movements").insert({
          user_id: effectiveUserId,
          item_id: item.inventory_item_id,
          type: "in",
          quantity: Number(item.quantity),
          reason: "Estorno de venda",
          reference_type: "cash_session",
          reference_id: item.session_id,
        });
      }
    }

    // 2) Ajusta o registro financeiro vinculado à sessão (decrementa amount)
    const { data: fin } = await supabase
      .from("financial_records")
      .select("id, amount")
      .eq("user_id", effectiveUserId)
      .eq("cash_session_id", item.session_id)
      .eq("type", "income")
      .order("created_at", { ascending: false });

    const remaining = Number(item.subtotal);
    if (fin && fin.length > 0) {
      // Tenta achar um registro com valor >= subtotal e ajusta o primeiro
      const target = fin.find((f: any) => Number(f.amount) >= remaining) ?? fin[0];
      const newAmount = Math.max(0, Number(target.amount) - remaining);
      if (newAmount === 0) {
        await supabase.from("financial_records").delete().eq("id", target.id);
      } else {
        await supabase.from("financial_records").update({ amount: newAmount }).eq("id", target.id);
      }
    }

    // 3) Remove o item do caixa
    await supabase.from("cash_items" as any).delete().eq("id", item.id);

    toast.success("Venda estornada!");
    loadSessionHistory(item.session_id);
    loadData();
  };

  const importPresale = async (presale: any) => {
    if (!presale.items || presale.items.length === 0) return;
    const newItems: CartItem[] = presale.items.map((item: any) => ({
      id: crypto.randomUUID(), item_type: item.item_type,
      inventory_item_id: item.inventory_item_id || undefined,
      service_id: item.service_id || undefined,
      description: item.description, quantity: item.quantity,
      unit_price: item.unit_price, discount: item.discount || 0, subtotal: item.subtotal,
    }));
    setCart(prev => [...prev, ...newItems]);
    if (presale.client_id) {
      const cl = clients.find(c => c.id === presale.client_id);
      if (cl) setSelectedClient(cl);
    }
    await supabase.from("pet_presales" as any).update({ status: "completed" } as any).eq("id", presale.id);
    toast.success("Pré-venda importada ao carrinho!");
    loadData();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.active_ingredient?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredServices = services.filter((s: any) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const fmtDate = (d: string) => format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const fmtMoney = (v: number) => `R$ ${v.toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" /> Caixa / PDV
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHistoryDialog(true)}>
            <History className="h-4 w-4 mr-1" /> Histórico
          </Button>
          {!activeSession ? (
            <Button onClick={() => setOpenDialog(true)}>
              <Unlock className="h-4 w-4 mr-1" /> Abrir Caixa
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setCloseDialog(true)}>
              <Lock className="h-4 w-4 mr-1" /> Fechar Caixa
            </Button>
          )}
        </div>
      </div>

      {activeSession && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-green-600">Caixa Aberto</Badge>
              <span className="text-sm text-muted-foreground">Aberto em {fmtDate(activeSession.opened_at)}</span>
            </div>
            <span className="text-sm font-medium">Troco inicial: {fmtMoney(activeSession.opening_amount || 0)}</span>
          </CardContent>
        </Card>
      )}

      {!activeSession ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum caixa aberto. Clique em "Abrir Caixa" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* AI Panel - left on desktop */}
          <div className="lg:col-span-3 order-last lg:order-first">
            <CashAIPanel
              cart={cart}
              selectedClientId={selectedClient?.id ?? null}
              activeSessionId={activeSession?.id ?? null}
              onAddItems={addItemsFromAI}
            />
          </div>

          {/* LEFT — Basket */}
          <div className="space-y-4 lg:col-span-5">
            {/* Client indicator */}
            <Card>
              <CardContent className="py-3 flex items-center justify-between">
                {selectedClient ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{selectedClient.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedClient(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserX className="h-4 w-4" />
                    <span className="text-sm">Venda para cliente não identificado</span>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setRightTab("clients")}>
                  Selecionar cliente
                </Button>
              </CardContent>
            </Card>

            {/* Product basket table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cesta de produtos:</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-16 text-center">Qtd</TableHead>
                      <TableHead className="w-24 text-right">Preço Unit.</TableHead>
                      <TableHead className="w-24 text-right">Sub-Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">Cesta vazia</TableCell>
                      </TableRow>
                    ) : cart.map((c, i) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{c.description}</TableCell>
                        <TableCell>
                          <Input
                            type="number" min="1" max={c.max_stock}
                            value={c.quantity}
                            onChange={(e) => updateCartItem(c.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                            className="h-7 w-14 text-xs text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmtMoney(c.unit_price)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmtMoney(c.subtotal)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(c.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Discount & Payment */}
            {cart.length > 0 && (
              <Card>
                <CardContent className="py-4 space-y-4">
                  {/* Discount row */}
                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="space-y-1">
                      <Label className="text-xs">Desconto em R$</Label>
                      <Input type="number" step="0.01" value={discountRS} onChange={(e) => setDiscountRS(e.target.value)} className="h-8 w-28" placeholder="0,00" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Desconto em %</Label>
                      <Input type="number" step="0.1" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-8 w-20" placeholder="0" />
                    </div>
                    <div className="ml-auto text-right">
                      <span className="text-2xl font-bold text-primary">{fmtMoney(cartTotal)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Forma de pagamento</Label>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <Input type="number" step="0.01" className="h-8 w-28" value={cartTotal.toFixed(2)} readOnly />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setCart([]); setSelectedClient(null); setDiscountRS(""); setDiscountPct(""); }}>
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button onClick={handleCheckout} className="bg-green-600 hover:bg-green-700">
                      <CreditCard className="h-4 w-4 mr-1" /> Finalizar Venda
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT — Tabs: Products, Services, Clients, Pre-sales */}
          <Card className="lg:col-span-4">
            <CardContent className="p-4">
              <Tabs value={rightTab} onValueChange={setRightTab}>
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="products"><Package className="h-3 w-3 mr-1" /> Produtos</TabsTrigger>
                  <TabsTrigger value="services"><Wrench className="h-3 w-3 mr-1" /> Serviços</TabsTrigger>
                  <TabsTrigger value="clients"><User className="h-3 w-3 mr-1" /> Clientes</TabsTrigger>
                  <TabsTrigger value="presales"><Receipt className="h-3 w-3 mr-1" /> Pré-vendas</TabsTrigger>
                </TabsList>

                {/* Products */}
                <TabsContent value="products" className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-8" placeholder="Filtrar produtos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center w-16">Est.</TableHead>
                          <TableHead className="text-right w-24">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum produto</TableCell></TableRow>
                        ) : filteredProducts.map((p) => (
                          <TableRow
                            key={p.id}
                            className={`cursor-pointer hover:bg-muted/50 ${p.quantity <= 0 ? "opacity-40" : ""}`}
                            onClick={() => p.quantity > 0 && addToCart(p, "product")}
                          >
                            <TableCell className="text-sm">
                              <div className="font-medium">{p.name}</div>
                              {p.active_ingredient && <div className="text-xs text-muted-foreground">{p.active_ingredient}</div>}
                            </TableCell>
                            <TableCell className="text-center text-sm">{p.quantity} {p.unit}</TableCell>
                            <TableCell className="text-right text-sm font-medium text-primary">
                              {p.sell_price ? fmtMoney(p.sell_price) : "S/P"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Services */}
                <TabsContent value="services" className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-8" placeholder="Filtrar serviços..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="text-right w-24">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices.length === 0 ? (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">Nenhum serviço</TableCell></TableRow>
                        ) : filteredServices.map((s: any) => (
                          <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => addToCart(s, "service")}>
                            <TableCell className="text-sm">
                              <div className="font-medium">{s.name}</div>
                              {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-primary">{fmtMoney(s.price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Clients */}
                <TabsContent value="clients" className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-8" placeholder="Filtrar clientes por nome..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right w-24">Telefone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.length === 0 ? (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">Nenhum cliente</TableCell></TableRow>
                        ) : filteredClients.map((c) => (
                          <TableRow
                            key={c.id}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedClient?.id === c.id ? "bg-primary/10" : ""}`}
                            onClick={() => { setSelectedClient(c); setRightTab("products"); toast.success(`Cliente ${c.name} selecionado`); }}
                          >
                            <TableCell className="text-sm font-medium">{c.name}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Pre-sales */}
                <TabsContent value="presales" className="mt-3 space-y-2">
                  {presales.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pré-venda pendente</p>
                  ) : presales.map((ps) => {
                    const petName = (ps as any).pets?.name || "Animal";
                    const ownerName = (ps as any).pets?.clients?.name || "—";
                    return (
                      <div key={ps.id} className="border rounded-lg p-3 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{petName} <span className="text-muted-foreground font-normal">— {ownerName}</span></div>
                            <div className="text-xs text-muted-foreground">{fmtMoney(ps.total)} · {ps.items?.length || 0} itens · {fmtDate(ps.created_at)}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => importPresale(ps)}>
                            <Plus className="h-3 w-3 mr-1" /> Importar
                          </Button>
                        </div>
                        {ps.items && ps.items.length > 0 && (
                          <div className="text-xs space-y-0.5 pl-2 border-l-2 border-muted">
                            {ps.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span>{item.quantity}x {item.description}</span>
                                <span className="font-medium">{fmtMoney(item.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Open dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Valor de abertura (troco)</Label>
              <Input type="number" step="0.01" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} placeholder="0.00" />
            </div>
            <Button onClick={handleOpenSession} className="w-full">Abrir Caixa</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close dialog */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Valor em caixa (conferência)</Label>
              <Input type="number" step="0.01" value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Observações do fechamento..." />
            </div>
            <Button variant="destructive" onClick={handleCloseSession} className="w-full">Confirmar Fechamento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de Caixas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum caixa registrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Abertura</TableHead><TableHead>Fechamento</TableHead>
                    <TableHead>Abertura R$</TableHead><TableHead>Fechamento R$</TableHead>
                    <TableHead>Status</TableHead><TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id} className={selectedSessionHistory === s.id ? "bg-muted/50" : ""}>
                      <TableCell className="text-sm">{fmtDate(s.opened_at)}</TableCell>
                      <TableCell className="text-sm">{s.closed_at ? fmtDate(s.closed_at) : "—"}</TableCell>
                      <TableCell className="text-sm">{fmtMoney(s.opening_amount || 0)}</TableCell>
                      <TableCell className="text-sm">{s.closing_amount != null ? fmtMoney(s.closing_amount) : "—"}</TableCell>
                      <TableCell><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status === "open" ? "Aberto" : "Fechado"}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => loadSessionHistory(s.id)}><History className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {historyItems.length > 0 && (
              <>
                <Separator />
                <h4 className="font-medium text-sm">Itens da sessão</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead><TableHead className="text-center">Qtd</TableHead>
                      <TableHead>Unitário</TableHead><TableHead>Subtotal</TableHead><TableHead>Pagamento</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyItems.map((item: any) => {
                      const sess = sessions.find((s) => s.id === item.session_id);
                      const canReverse = sess?.status === "open";
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-sm">{fmtMoney(item.unit_price)}</TableCell>
                          <TableCell className="text-sm font-medium">{fmtMoney(item.subtotal)}</TableCell>
                          <TableCell className="text-sm">{item.payment_method}</TableCell>
                          <TableCell>
                            {canReverse ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Estornar venda" onClick={() => handleReverseSale(item)}>
                                <Undo2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
