import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Package, Trash2, Edit, ArrowUpDown, DollarSign, TrendingUp, Layers } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  batch: string | null;
  expiry_date: string | null;
  supplier: string | null;
  supplier_id: string | null;
  cost_price: number | null;
  sell_price: number | null;
  location: string | null;
  active_ingredient: string | null;
  notes: string | null;
  administration_route: string | null;
  presentation: string | null;
  commission_type: string | null;
  commission_value: number | null;
  subcategory: string | null;
  sku: string | null;
  barcode: string | null;
  concentration: string | null;
  pharmaceutical_form: string | null;
  special_control: boolean | null;
  prescription_required: boolean | null;
  species: string | null;
  vaccine_type: string | null;
  manufacturer: string | null;
  storage_temperature: string | null;
  doses_per_vial: number | null;
  opened_at: string | null;
  material_type: string | null;
  sterilization_required: boolean | null;
  composition: string | null;
  indication: string | null;
  brand: string | null;
  weight_volume: string | null;
}

interface InventoryBatch {
  id: string;
  item_id: string;
  batch: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_cost: number | null;
  created_at: string;
}

const categories = [
  { value: "medication", label: "Medicamento" },
  { value: "vaccine", label: "Vacina" },
  { value: "material", label: "Material Hospitalar" },
  { value: "supplement", label: "Suplemento" },
  { value: "petshop", label: "Produtos petshop" },
  { value: "other", label: "Outro" },
];

const petshopSubcategories = ["Ração", "Higiene", "Brinquedo", "Acessórios", "Petiscos"];
const speciesOptions = ["Cão", "Gato", "Cão e gato", "Aves", "Roedores", "Equinos", "Outro"];
const locations = ["Farmácia", "Centro Cirúrgico", "Internação", "Consultório", "Depósito", "Estoque", "Geladeira"];

const administrationRoutes = ["Oral", "Subcutânea", "Intramuscular", "Intravenosa", "Tópica", "Oftálmica", "Otológica", "Retal", "Inalatória"];

const presentations = [
  { value: "unidade", label: "Unidade" },
  { value: "caixa", label: "Caixa" },
  { value: "frasco", label: "Frasco" },
  { value: "ampola", label: "Ampola" },
  { value: "tubo", label: "Tubo" },
  { value: "sache", label: "Sachê" },
  { value: "blister", label: "Blíster" },
  { value: "litro", label: "Litro" },
  { value: "kg", label: "Kg" },
];

const emptyForm = {
  name: "", category: "medication", unit: "un", quantity: "0", min_quantity: "5",
  batch: "", expiry_date: "", supplier: "", supplier_id: "", cost_price: "", sell_price: "",
  location: "Farmácia", active_ingredient: "", notes: "",
  administration_route: "", presentation: "unidade",
  commission_type: "none", commission_value: "",
  subcategory: "", sku: "", barcode: "", concentration: "", pharmaceutical_form: "",
  special_control: false, prescription_required: false, species: "", vaccine_type: "",
  manufacturer: "", storage_temperature: "", doses_per_vial: "", opened_at: "",
  material_type: "", sterilization_required: false, composition: "", indication: "",
  brand: "", weight_volume: "",
};

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const itemToForm = (item: InventoryItem) => ({
  ...emptyForm,
  name: item.name,
  category: item.category,
  unit: item.unit,
  quantity: String(item.quantity),
  min_quantity: String(item.min_quantity),
  batch: item.batch ?? "",
  expiry_date: item.expiry_date ?? "",
  supplier: item.supplier ?? "",
  supplier_id: item.supplier_id ?? "",
  cost_price: item.cost_price ? String(item.cost_price) : "",
  sell_price: item.sell_price ? String(item.sell_price) : "",
  location: item.location ?? "Farmácia",
  active_ingredient: item.active_ingredient ?? "",
  notes: item.notes ?? "",
  administration_route: item.administration_route ?? "",
  presentation: item.presentation ?? "unidade",
  commission_type: item.commission_type ?? "none",
  commission_value: item.commission_value ? String(item.commission_value) : "",
  subcategory: item.subcategory ?? "",
  sku: item.sku ?? "",
  barcode: item.barcode ?? "",
  concentration: item.concentration ?? "",
  pharmaceutical_form: item.pharmaceutical_form ?? "",
  special_control: !!item.special_control,
  prescription_required: !!item.prescription_required,
  species: item.species ?? "",
  vaccine_type: item.vaccine_type ?? "",
  manufacturer: item.manufacturer ?? "",
  storage_temperature: item.storage_temperature ?? "",
  doses_per_vial: item.doses_per_vial ? String(item.doses_per_vial) : "",
  opened_at: item.opened_at ?? "",
  material_type: item.material_type ?? "",
  sterilization_required: !!item.sterilization_required,
  composition: item.composition ?? "",
  indication: item.indication ?? "",
  brand: item.brand ?? "",
  weight_volume: item.weight_volume ?? "",
});

export default function Estoque() {
  const { clinicId, loading: clinicLoading } = useCurrentClinicId();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [movementDialog, setMovementDialog] = useState<{ item: InventoryItem; type: "entry" | "exit" } | null>(null);
  const [movementQty, setMovementQty] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementUnitCost, setMovementUnitCost] = useState("");
  const [movementNewSellPrice, setMovementNewSellPrice] = useState("");
  const [movementBatch, setMovementBatch] = useState("");
  const [movementExpiryDate, setMovementExpiryDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [historyDialog, setHistoryDialog] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [batchDialog, setBatchDialog] = useState<InventoryItem | null>(null);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});

  const nameSuggestions = !editId && form.name.length >= 2
    ? items.filter((i) => i.name.toLowerCase().includes(form.name.toLowerCase())).slice(0, 8)
    : [];

  const selectExistingItem = (item: InventoryItem) => {
    setForm(itemToForm(item));
    setEditId(item.id);
    setShowNameSuggestions(false);
  };

  const loadData = async () => {
    if (!clinicId) return;
    const [{ data }, { data: sup }] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("user_id", clinicId).order("name"),
      supabase.from("suppliers" as any).select("id, name, trade_name").eq("user_id", clinicId).eq("active", true).order("name"),
    ]);
    setItems((data as InventoryItem[]) ?? []);
    setSuppliers((sup as any[]) ?? []);
  };

  const loadBatchCountsOnMount = async () => {
    if (!clinicId) return;
    const { data: batchData } = await supabase
      .from("inventory_batches")
      .select("item_id, quantity")
      .eq("user_id", clinicId);
    if (batchData) {
      const counts: Record<string, number> = {};
      batchData.forEach((b: any) => {
        counts[b.item_id] = (counts[b.item_id] || 0) + 1;
      });
      setBatchCounts(counts);
    }
  };

  useEffect(() => { loadData(); loadBatchCountsOnMount(); }, [clinicId]);

  const resetForm = () => { setForm(emptyForm); setEditId(null); };

  const handleSave = async () => {
    if (!clinicId || !form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const record: any = {
      user_id: clinicId,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      quantity: parseFloat(form.quantity) || 0,
      min_quantity: parseFloat(form.min_quantity) || 0,
      batch: form.batch || null,
      expiry_date: form.expiry_date || null,
      supplier: form.supplier || null,
      supplier_id: form.supplier_id || null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
      location: form.location || null,
      active_ingredient: form.active_ingredient || null,
      notes: form.notes || null,
      administration_route: form.administration_route || null,
      presentation: form.presentation || "unidade",
      commission_type: form.commission_type || "none",
      commission_value: form.commission_value ? parseFloat(form.commission_value) : 0,
      subcategory: form.category === "petshop" ? (form.subcategory || null) : null,
      sku: form.sku || null,
      barcode: form.barcode || null,
      concentration: form.category === "medication" ? (form.concentration || null) : null,
      pharmaceutical_form: form.category === "medication" ? (form.pharmaceutical_form || null) : null,
      special_control: form.category === "medication" ? form.special_control : false,
      prescription_required: form.category === "medication" ? form.prescription_required : false,
      species: ["vaccine", "supplement", "petshop"].includes(form.category) ? (form.species || null) : null,
      vaccine_type: form.category === "vaccine" ? (form.vaccine_type || null) : null,
      manufacturer: form.category === "vaccine" ? (form.manufacturer || null) : null,
      storage_temperature: form.category === "vaccine" ? (form.storage_temperature || null) : null,
      doses_per_vial: form.category === "vaccine" && form.doses_per_vial ? parseFloat(form.doses_per_vial) : null,
      opened_at: form.category === "vaccine" ? (form.opened_at || null) : null,
      material_type: form.category === "material" ? (form.material_type || null) : null,
      sterilization_required: form.category === "material" ? form.sterilization_required : false,
      composition: form.category === "supplement" ? (form.composition || null) : null,
      indication: form.category === "supplement" ? (form.indication || null) : null,
      brand: form.category === "petshop" ? (form.brand || null) : null,
      weight_volume: form.category === "petshop" ? (form.weight_volume || null) : null,
    };
    if (editId) {
      const { error } = await supabase.from("inventory_items").update(record).eq("id", editId);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("Item atualizado!");
    } else {
      const { data: inserted, error } = await supabase.from("inventory_items").insert(record).select().single();
      if (error || !inserted) { toast.error("Erro: " + (error?.message ?? "Falha ao inserir")); return; }
      // Create initial batch if batch or expiry_date provided
      if (record.batch || record.expiry_date) {
        await supabase.from("inventory_batches").insert({
          user_id: clinicId,
          item_id: inserted.id,
          batch: record.batch,
          expiry_date: record.expiry_date,
          quantity: record.quantity,
          unit_cost: record.cost_price,
        });
      }
      toast.success("Item cadastrado!");
    }
    setDialogOpen(false); resetForm(); loadData(); loadBatchCountsOnMount();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); loadData(); }
  };

  const openEdit = (item: InventoryItem) => {
    setForm(itemToForm(item));
    setEditId(item.id); setDialogOpen(true);
  };

  const handleMovement = async () => {
    if (!clinicId || !movementDialog || !movementQty) return;
    const qty = parseFloat(movementQty);
    if (qty <= 0) { toast.error("Quantidade inválida"); return; }

    const item = movementDialog.item;
    const isEntry = movementDialog.type === "entry";

    if (isEntry) {
      // --- ENTRY: create batch + update item ---
      const unitCost = parseFloat(movementUnitCost) || null;
      const newTotalQty = item.quantity + qty;

      let updatedFields: any = { quantity: newTotalQty };

      // Weighted average cost
      if (unitCost && unitCost > 0) {
        const currentCost = item.cost_price || 0;
        const currentQty = item.quantity;
        const newAvgCost = currentQty + qty > 0
          ? (currentQty * currentCost + qty * unitCost) / (currentQty + qty)
          : unitCost;
        updatedFields.cost_price = Math.round(newAvgCost * 100) / 100;
      }

      // Update sell price if provided
      const newSellPrice = parseFloat(movementNewSellPrice);
      if (!isNaN(newSellPrice) && newSellPrice > 0) {
        updatedFields.sell_price = newSellPrice;
      }

      const [movRes, updRes, batchRes] = await Promise.all([
        supabase.from("inventory_movements").insert({
          user_id: clinicId,
          item_id: item.id,
          type: "entry",
          quantity: qty,
          reason: movementReason || null,
          unit_cost: unitCost,
        }),
        supabase.from("inventory_items").update(updatedFields).eq("id", item.id),
        supabase.from("inventory_batches").insert({
          user_id: clinicId,
          item_id: item.id,
          batch: movementBatch || null,
          expiry_date: movementExpiryDate || null,
          quantity: qty,
          unit_cost: unitCost,
        }),
      ]);

      if (movRes.error || updRes.error || batchRes.error) {
        toast.error("Erro na movimentação");
        return;
      }

      // Update item's batch/expiry reference to nearest expiry with stock
      const { data: nearestBatch } = await supabase
        .from("inventory_batches")
        .select("batch, expiry_date")
        .eq("item_id", item.id)
        .eq("user_id", clinicId)
        .gt("quantity", 0 as any)
        .order("expiry_date", { ascending: true, nullsFirst: false })
        .limit(1);

      if (nearestBatch && nearestBatch.length > 0) {
        await supabase.from("inventory_items").update({
          batch: nearestBatch[0].batch,
          expiry_date: nearestBatch[0].expiry_date,
        }).eq("id", item.id);
      }

      toast.success("Entrada registrada com lote!");
    } else {
      // --- EXIT: FEFO logic ---
      // Load batches ordered by expiry (FEFO)
      const { data: itemBatches } = await supabase
        .from("inventory_batches")
        .select("*")
        .eq("item_id", item.id)
        .eq("user_id", clinicId)
        .gt("quantity", 0 as any)
        .order("expiry_date", { ascending: true, nullsFirst: false });

      let remaining = qty;
      const totalAvailable = (itemBatches || []).reduce((s, b) => s + b.quantity, 0);

      if (totalAvailable < qty) {
        toast.error(`Estoque insuficiente. Disponível nos lotes: ${totalAvailable}`);
        return;
      }

      // Consume batches in FEFO order
      for (const batch of (itemBatches || [])) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, batch.quantity);
        await supabase.from("inventory_batches").update({ quantity: batch.quantity - deduct }).eq("id", batch.id);
        remaining -= deduct;
      }

      const newQty = item.quantity - qty;
      await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", item.id);
      const movRes = await supabase.from("inventory_movements").insert({
        user_id: clinicId,
        item_id: item.id,
        type: "exit",
        quantity: qty,
        reason: movementReason || null,
      });

      if (movRes.error) {
        toast.error("Erro na movimentação");
        return;
      }

      // Update item's batch/expiry reference to nearest expiry with stock
      const { data: nearestBatch } = await supabase
        .from("inventory_batches")
        .select("batch, expiry_date")
        .eq("item_id", item.id)
        .eq("user_id", clinicId)
        .gt("quantity", 0 as any)
        .order("expiry_date", { ascending: true, nullsFirst: false })
        .limit(1);

      if (nearestBatch && nearestBatch.length > 0) {
        await supabase.from("inventory_items").update({
          batch: nearestBatch[0].batch,
          expiry_date: nearestBatch[0].expiry_date,
        }).eq("id", item.id);
      }

      toast.success("Saída registrada (FEFO)!");
    }

    setMovementDialog(null);
    setMovementQty("");
    setMovementReason("");
    setMovementUnitCost("");
    setMovementNewSellPrice("");
    setMovementBatch("");
    setMovementExpiryDate("");
    loadData();
    loadBatchCountsOnMount();
  };

  const loadMovements = async (itemId: string) => {
    if (!clinicId) return;
    const { data } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("item_id", itemId)
      .eq("user_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(50);
    setMovements(data ?? []);
  };

  const openHistory = (item: InventoryItem) => {
    setHistoryDialog(item);
    loadMovements(item.id);
  };

  const loadBatches = async (itemId: string) => {
    if (!clinicId) return;
    const { data } = await supabase
      .from("inventory_batches")
      .select("*")
      .eq("item_id", itemId)
      .eq("user_id", clinicId)
      .order("expiry_date", { ascending: true, nullsFirst: false });
    setBatches((data as InventoryBatch[]) ?? []);
  };

  // Also count batches including empty ones for display
  const loadBatchCounts = async () => {
    if (!clinicId) return;
    const { data: batchData } = await supabase
      .from("inventory_batches")
      .select("item_id, quantity")
      .eq("user_id", clinicId);
    if (batchData) {
      const counts: Record<string, number> = {};
      batchData.forEach((b: any) => {
        counts[b.item_id] = (counts[b.item_id] || 0) + 1;
      });
      setBatchCounts(counts);
    }
  };

  const openBatchDialog = (item: InventoryItem) => {
    setBatchDialog(item);
    loadBatches(item.id);
  };

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.active_ingredient?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === "all" || i.category === filterCategory;
    const matchLoc = filterLocation === "all" || i.location === filterLocation;
    return matchSearch && matchCat && matchLoc;
  });

  const lowStock = items.filter((i) => i.quantity <= i.min_quantity);
  const expiringSoon = items.filter((i) => {
    if (!i.expiry_date) return false;
    const days = differenceInDays(new Date(i.expiry_date), new Date());
    return days >= 0 && days <= 30;
  });
  const expired = items.filter((i) => {
    if (!i.expiry_date) return false;
    return differenceInDays(new Date(i.expiry_date), new Date()) < 0;
  });

  const totalStockValue = items.reduce((sum, i) => sum + (i.quantity * (i.cost_price || 0)), 0);
  const totalPotentialProfit = items.reduce((sum, i) => {
    const profit = ((i.sell_price || 0) - (i.cost_price || 0)) * i.quantity;
    return sum + (profit > 0 ? profit : 0);
  }, 0);

  const getMargin = (cost: number | null, sell: number | null) => {
    if (!cost || !sell || cost === 0) return null;
    return ((sell - cost) / cost * 100).toFixed(1);
  };

  const getCategoryLabel = (v: string) => categories.find((c) => c.value === v)?.label ?? v;

  const getExpiryBadge = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (days <= 30) return <Badge className="bg-amber-500 text-white">Vence em {days}d</Badge>;
    return null;
  };

  if (clinicLoading) {
    return <div className="min-h-[40vh] flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2 relative">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setShowNameSuggestions(true); }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  placeholder="Ex: Dipirona 500mg"
                />
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    <p className="px-3 py-1.5 text-xs text-muted-foreground border-b">Itens existentes — clique para editar</p>
                    {nameSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex justify-between items-center"
                        onMouseDown={() => selectExistingItem(item)}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.cost_price ? formatBRL(item.cost_price) : ""} | estoque: {item.quantity}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: v === "petshop" ? form.subcategory : "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="un, ml, mg..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantidade</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div className="space-y-2"><Label>Estoque mínimo</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Código interno (SKU)</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: MED-001" /></div>
                <div className="space-y-2"><Label>Código de barras</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Lote</Label><Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></div>
                <div className="space-y-2"><Label>Validade</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
              </div>
              {form.category === "medication" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Princípio ativo</Label><Input value={form.active_ingredient} onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Concentração</Label><Input value={form.concentration} onChange={(e) => setForm({ ...form, concentration: e.target.value })} placeholder="Ex: 500 mg" /></div>
                  <div className="space-y-2"><Label>Forma farmacêutica</Label><Input value={form.pharmaceutical_form} onChange={(e) => setForm({ ...form, pharmaceutical_form: e.target.value })} placeholder="Comprimido, solução..." /></div>
                  <div className="space-y-2"><Label>Apresentação</Label><Select value={form.presentation} onValueChange={(v) => setForm({ ...form, presentation: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{presentations.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Controle especial</Label><Select value={form.special_control ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, special_control: v === "yes" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">Não</SelectItem><SelectItem value="yes">Sim</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Necessita receita</Label><Select value={form.prescription_required ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, prescription_required: v === "yes" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">Não</SelectItem><SelectItem value="yes">Sim</SelectItem></SelectContent></Select></div>
                </div>
              )}
              {form.category === "vaccine" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Espécie</Label><Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{speciesOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Tipo de vacina</Label><Input value={form.vaccine_type} onChange={(e) => setForm({ ...form, vaccine_type: e.target.value })} placeholder="V8, V10, antirrábica" /></div>
                  <div className="space-y-2"><Label>Fabricante</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Temperatura de armazenamento</Label><Input value={form.storage_temperature} onChange={(e) => setForm({ ...form, storage_temperature: e.target.value })} placeholder="Ex: 2°C a 8°C" /></div>
                  <div className="space-y-2"><Label>Doses por frasco</Label><Input type="number" min="0" value={form.doses_per_vial} onChange={(e) => setForm({ ...form, doses_per_vial: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Data de abertura</Label><Input type="date" value={form.opened_at} onChange={(e) => setForm({ ...form, opened_at: e.target.value })} /></div>
                </div>
              )}
              {form.category === "material" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Tipo</Label><Select value={form.material_type} onValueChange={(v) => setForm({ ...form, material_type: v })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent><SelectItem value="Descartável">Descartável</SelectItem><SelectItem value="Reutilizável">Reutilizável</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Necessita esterilização</Label><Select value={form.sterilization_required ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, sterilization_required: v === "yes" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">Não</SelectItem><SelectItem value="yes">Sim</SelectItem></SelectContent></Select></div>
                </div>
              )}
              {form.category === "supplement" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Composição</Label><Input value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Indicação</Label><Input value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Espécie</Label><Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{speciesOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                </div>
              )}
              {form.category === "petshop" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Subcategoria</Label><Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{petshopSubcategories.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Espécie</Label><Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{speciesOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Peso/volume</Label><Input value={form.weight_volume} onChange={(e) => setForm({ ...form, weight_volume: e.target.value })} placeholder="Ex: 10 kg, 500 ml" /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Preço custo (R$)</Label><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Preço venda (R$)</Label><Input type="number" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  {suppliers.length > 0 ? (
                    <Select
                      value={form.supplier_id || "none"}
                      onValueChange={(v) => {
                        const s = suppliers.find((x) => x.id === v);
                        setForm({
                          ...form,
                          supplier_id: v === "none" ? "" : v,
                          supplier: s ? (s.trade_name || s.name) : "",
                        });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhum —</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.trade_name ? `${s.trade_name} (${s.name})` : s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      placeholder="Nenhum fornecedor cadastrado — digite o nome"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Comissão (na venda do produto)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.commission_type} onValueChange={(v) => setForm({ ...form, commission_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem comissão</SelectItem>
                        <SelectItem value="percent">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.commission_type !== "none" && (
                    <div className="space-y-2">
                      <Label>{form.commission_type === "percent" ? "Percentual (%)" : "Valor por unidade (R$)"}</Label>
                      <Input type="number" step="0.01" min="0" value={form.commission_value} onChange={(e) => setForm({ ...form, commission_value: e.target.value })} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Sobrepõe a comissão padrão do funcionário quando este produto é vendido no caixa.</p>
              </div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />Valor total do estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(totalStockValue)}</p>
            <p className="text-xs text-muted-foreground">{items.length} itens cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />Lucro potencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatBRL(totalPotentialProfit)}</p>
            <p className="text-xs text-muted-foreground">baseado em preço venda − custo médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(lowStock.length > 0 || expiringSoon.length > 0 || expired.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lowStock.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4" />Estoque baixo</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-amber-700">{lowStock.length}</p><p className="text-xs text-amber-600">itens abaixo do mínimo</p></CardContent>
            </Card>
          )}
          {expiringSoon.length > 0 && (
            <Card className="border-orange-300 bg-orange-50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-orange-700"><AlertTriangle className="h-4 w-4" />Vencimento próximo</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-orange-700">{expiringSoon.length}</p><p className="text-xs text-orange-600">vencem em até 30 dias</p></CardContent>
            </Card>
          )}
          {expired.length > 0 && (
            <Card className="border-destructive bg-red-50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Vencidos</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{expired.length}</p><p className="text-xs text-red-600">itens com validade expirada</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou princípio ativo..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Local" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os locais</SelectItem>
            {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-center">Lotes</TableHead>
                  <TableHead className="text-right">Custo Médio</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-center">Margem</TableHead>
                  <TableHead className="text-right">Valor Estoque</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8"><Package className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum item encontrado</TableCell></TableRow>
                )}
                {filtered.map((item) => {
                  const margin = getMargin(item.cost_price, item.sell_price);
                  const stockValue = item.quantity * (item.cost_price || 0);
                  const batchCount = batchCounts[item.id] || 0;
                  return (
                    <TableRow key={item.id} className={item.quantity <= item.min_quantity ? "bg-amber-50/50" : ""}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.active_ingredient && <p className="text-xs text-muted-foreground">{item.active_ingredient}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{getCategoryLabel(item.category)}</Badge></TableCell>
                      <TableCell className="text-center">
                        <span className={item.quantity <= item.min_quantity ? "text-amber-600 font-bold" : ""}>
                          {item.quantity} {item.unit}
                        </span>
                        {item.quantity <= item.min_quantity && <p className="text-[10px] text-amber-600">mín: {item.min_quantity}</p>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => openBatchDialog(item)}
                        >
                          <Layers className="h-3 w-3" />
                          {batchCount > 0 ? batchCount : "—"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.cost_price ? formatBRL(item.cost_price) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{item.sell_price ? formatBRL(item.sell_price) : "—"}</TableCell>
                      <TableCell className="text-center">
                        {margin ? (
                          <Badge variant="outline" className={parseFloat(margin) > 0 ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}>
                            {margin}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{stockValue > 0 ? formatBRL(stockValue) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.expiry_date ? format(new Date(item.expiry_date), "dd/MM/yyyy") : "—"}
                          {getExpiryBadge(item.expiry_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.location ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setMovementDialog({ item, type: "entry" })}>+</Button>
                          <Button size="sm" variant="outline" onClick={() => setMovementDialog({ item, type: "exit" })}>−</Button>
                          <Button size="icon" variant="ghost" onClick={() => openHistory(item)}><ArrowUpDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de movimentação */}
      <Dialog open={!!movementDialog} onOpenChange={(o) => { if (!o) { setMovementDialog(null); setMovementQty(""); setMovementReason(""); setMovementUnitCost(""); setMovementNewSellPrice(""); setMovementBatch(""); setMovementExpiryDate(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{movementDialog?.type === "entry" ? "Entrada de estoque" : "Saída de estoque"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>{movementDialog?.item.name}</strong> — Estoque atual: {movementDialog?.item.quantity} {movementDialog?.item.unit}
            </p>
            {movementDialog?.item.cost_price != null && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Custo médio: <strong>{formatBRL(movementDialog.item.cost_price)}</strong></span>
                {movementDialog.item.sell_price != null && (
                  <span>Venda: <strong>{formatBRL(movementDialog.item.sell_price)}</strong></span>
                )}
              </div>
            )}
            <div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="1" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} /></div>
            {movementDialog?.type === "entry" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nº do Lote</Label>
                    <Input value={movementBatch} onChange={(e) => setMovementBatch(e.target.value)} placeholder="Ex: ABC123" />
                  </div>
                  <div className="space-y-2">
                    <Label>Validade</Label>
                    <Input type="date" value={movementExpiryDate} onChange={(e) => setMovementExpiryDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Custo unitário desta compra (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={movementUnitCost} onChange={(e) => setMovementUnitCost(e.target.value)} placeholder="Ex: 8.50" />
                  <p className="text-xs text-muted-foreground">O custo médio será recalculado automaticamente</p>
                </div>
                <div className="space-y-2">
                  <Label>Novo preço de venda (R$) <span className="text-muted-foreground font-normal">— opcional</span></Label>
                  <Input type="number" step="0.01" min="0" value={movementNewSellPrice} onChange={(e) => setMovementNewSellPrice(e.target.value)} placeholder={movementDialog.item.sell_price ? `Atual: ${movementDialog.item.sell_price}` : "Ex: 12.00"} />
                  <p className="text-xs text-muted-foreground">Deixe vazio para manter o preço atual</p>
                </div>
              </>
            )}
            {movementDialog?.type === "exit" && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                ⚡ A saída será deduzida automaticamente do lote com <strong>validade mais próxima</strong> (FEFO).
              </p>
            )}
            <div className="space-y-2"><Label>Motivo</Label><Input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Ex: Compra, Uso em consulta..." /></div>
            <Button onClick={handleMovement} className="w-full">{movementDialog?.type === "entry" ? "Registrar entrada" : "Registrar saída"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de lotes */}
      <Dialog open={!!batchDialog} onOpenChange={(o) => { if (!o) setBatchDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Lotes — {batchDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Estoque total: <strong>{batchDialog?.quantity} {batchDialog?.unit}</strong>
            {batchDialog?.cost_price != null && <> | Custo médio: <strong>{formatBRL(batchDialog.cost_price)}</strong></>}
          </p>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lote cadastrado. Use "+" para registrar uma entrada com lote.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => {
                  const days = b.expiry_date ? differenceInDays(new Date(b.expiry_date), new Date()) : null;
                  const isExpired = days !== null && days < 0;
                  const isExpiring = days !== null && days >= 0 && days <= 30;
                  const isEmpty = b.quantity <= 0;
                  return (
                    <TableRow key={b.id} className={isExpired ? "bg-red-50" : isExpiring ? "bg-amber-50" : isEmpty ? "opacity-50" : ""}>
                      <TableCell className="font-medium text-sm">{b.batch || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {b.expiry_date ? format(new Date(b.expiry_date), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-center font-medium">{b.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{b.unit_cost ? formatBRL(b.unit_cost) : "—"}</TableCell>
                      <TableCell>
                        {isEmpty ? (
                          <Badge variant="outline" className="text-muted-foreground">Esgotado</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive">Vencido</Badge>
                        ) : isExpiring ? (
                          <Badge className="bg-amber-500 text-white">Vence em {days}d</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-300">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de histórico */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => { if (!o) setHistoryDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico — {historyDialog?.name}</DialogTitle>
          </DialogHeader>
          {historyDialog?.cost_price != null && (
            <p className="text-sm text-muted-foreground">Custo médio atual: <strong>{formatBRL(historyDialog.cost_price)}</strong></p>
          )}
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma movimentação registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={m.type === "entry" ? "default" : "destructive"}>
                        {m.type === "entry" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{m.quantity}</TableCell>
                    <TableCell className="text-right text-sm">{m.unit_cost ? formatBRL(m.unit_cost) : "—"}</TableCell>
                    <TableCell className="text-sm">{m.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
