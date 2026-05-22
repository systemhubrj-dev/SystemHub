import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Search, Wrench, Edit, Trash2 } from "lucide-react";

const SERVICE_CATEGORIES = [
  { value: "consulta", label: "Consulta" },
  { value: "cirurgia", label: "Cirurgia" },
  { value: "exame", label: "Exame" },
  { value: "vacina", label: "Vacinação" },
  { value: "banho_tosa", label: "Banho e Tosa" },
  { value: "internacao", label: "Internação" },
  { value: "outro", label: "Outro" },
];

const emptyForm = {
  name: "", description: "", category: "consulta", price: "", cost_price: "",
  active: true,
  commission_type: "none", commission_value: "",
};

export default function Servicos() {
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    if (!user) return;
    const { data } = await supabase.from("services").select("*").eq("user_id", user.id).order("name");
    setServices((data as any[]) ?? []);
  };

  useEffect(() => { loadData(); }, [user]);

  const resetForm = () => { setForm(emptyForm); setEditId(null); };

  const handleSave = async () => {
    if (!user || !form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const record: any = {
      user_id: user.id,
      name: form.name.trim(),
      description: form.description || null,
      category: form.category,
      price: parseFloat(form.price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      active: form.active,
      commission_type: form.commission_type || "none",
      commission_value: form.commission_value ? parseFloat(form.commission_value) : 0,
    };
    const { error } = editId
      ? await supabase.from("services").update(record).eq("id", editId)
      : await supabase.from("services").insert(record);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(editId ? "Serviço atualizado!" : "Serviço cadastrado!");
    setDialogOpen(false); resetForm(); loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); loadData(); }
  };

  const openEdit = (s: any) => {
    setForm({
      name: s.name, description: s.description ?? "", category: s.category,
      price: String(s.price), cost_price: String(s.cost_price ?? 0),
      active: s.active,
      commission_type: s.commission_type ?? "none",
      commission_value: s.commission_value ? String(s.commission_value) : "",
    });
    setEditId(s.id); setDialogOpen(true);
  };

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const getCatLabel = (v: string) => SERVICE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

  const calcProfit = (price: number, cost: number) => {
    if (!cost || cost === 0) return null;
    return ((price - cost) / cost * 100).toFixed(0);
  };

  const fmtCommission = (s: any) => {
    if (!s.commission_type || s.commission_type === "none" || !s.commission_value) return "—";
    return s.commission_type === "percent"
      ? `${Number(s.commission_value)}%`
      : `R$ ${Number(s.commission_value).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" /> Serviços e Procedimentos
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo serviço</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Consulta clínica" /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SERVICE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Preço venda (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Custo (R$)</Label>
                  <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="Para cálculo de lucro" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Ativo</Label>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Comissão (na venda do serviço)</p>
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
                <p className="text-xs text-muted-foreground">Sobrepõe a comissão padrão do funcionário quando este serviço é vendido no caixa.</p>
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>



      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar serviço..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum serviço cadastrado</TableCell></TableRow>
              ) : filtered.map((s) => {
                const profit = calcProfit(Number(s.price), Number(s.cost_price));
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div><span className="font-medium">{s.name}</span>{s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{getCatLabel(s.category)}</Badge></TableCell>
                    <TableCell className="text-sm">R$ {Number(s.cost_price || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-medium">R$ {Number(s.price).toFixed(2)}</TableCell>
                    <TableCell>
                      {profit ? (
                        <Badge variant={Number(profit) > 0 ? "default" : "destructive"}>{profit}%</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{fmtCommission(s)}</TableCell>
                    <TableCell>
                      <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
