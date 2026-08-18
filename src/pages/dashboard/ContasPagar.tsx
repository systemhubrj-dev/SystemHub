import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Receipt, Trash2, Check, AlertTriangle, Clock, Lock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

const CATEGORIES = [
  { value: "luz", label: "Luz / Energia" },
  { value: "agua", label: "Água" },
  { value: "aluguel", label: "Aluguel" },
  { value: "internet", label: "Internet / Telefone" },
  { value: "boleto", label: "Boleto" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "imposto", label: "Imposto / Taxa" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outro", label: "Outro" },
];

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  category: string;
  status: string;
  recurrence: string;
  notes: string | null;
}

const defaultForm = {
  description: "",
  amount: "",
  due_date: format(new Date(), "yyyy-MM-dd"),
  category: "outro",
  recurrence: "none",
  notes: "",
};

export default function ContasPagar() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const { permissions } = useTeamRole();
  const canManage = !!permissions?.contas;
  const effectiveOwnerId = clinicId ?? user?.id ?? "";
  const [bills, setBills] = useState<Bill[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");

  const loadBills = async () => {
    if (!effectiveOwnerId) return;
    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", effectiveOwnerId)
      .order("due_date", { ascending: true });
    setBills((data as Bill[]) ?? []);
  };

  useEffect(() => { loadBills(); }, [effectiveOwnerId]);

  const handleSave = async () => {
    if (!canManage) { toast.error("Você não tem permissão para gerenciar contas."); return; }
    if (!effectiveOwnerId || !form.description.trim() || !form.amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const { error } = await supabase.from("bills").insert({
      user_id: effectiveOwnerId,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      category: form.category,
      recurrence: form.recurrence,
      notes: form.notes || null,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Conta cadastrada!");
    setDialogOpen(false);
    setForm(defaultForm);
    loadBills();
  };

  const markAsPaid = async (id: string) => {
    if (!canManage) { toast.error("Sem permissão."); return; }
    if (!effectiveOwnerId) return;
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const { error } = await supabase
      .from("bills")
      .update({ status: "paid", paid_date: today })
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }

    await supabase.from("financial_records").insert({
      user_id: effectiveOwnerId,
      type: "expense",
      amount: Number(bill.amount),
      description: `Pagamento: ${bill.description}`,
      category: bill.category,
      date: today,
      bill_id: bill.id,
    } as any);

    toast.success("Marcado como pago e lançado nas despesas!");
    loadBills();
  };

  const handleDelete = async (id: string) => {
    if (!canManage) { toast.error("Sem permissão."); return; }
    await supabase.from("financial_records").delete().eq("bill_id", id as any);
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); loadBills(); }
  };

  const getStatus = (b: Bill) => {
    if (b.status === "paid") return "paid";
    if (isPast(new Date(b.due_date + "T23:59:59")) && !isToday(new Date(b.due_date + "T00:00:00"))) return "overdue";
    return "pending";
  };

  const filtered = bills.filter((b) => {
    if (filter === "all") return true;
    return getStatus(b) === filter;
  });

  const totalPending = bills.filter(b => getStatus(b) !== "paid").reduce((s, b) => s + Number(b.amount), 0);
  const totalOverdue = bills.filter(b => getStatus(b) === "overdue").reduce((s, b) => s + Number(b.amount), 0);

  const getCatLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" /> Contas a Pagar
        </h1>
        {canManage ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova conta a pagar</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Conta de luz março" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento *</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recorrência</Label>
                    <Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Única</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Detalhes opcionais..." rows={2} />
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Somente leitura</Badge>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendente</CardTitle></CardHeader>
          <CardContent><span className="text-xl font-bold text-amber-600">R$ {totalPending.toFixed(2)}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vencido</CardTitle></CardHeader>
          <CardContent><span className="text-xl font-bold text-red-600">R$ {totalOverdue.toFixed(2)}</span></CardContent>
        </Card>
        <Card className="hidden sm:block">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de contas</CardTitle></CardHeader>
          <CardContent><span className="text-xl font-bold">{bills.length}</span></CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "overdue", "paid"] as const).map(f => (
          <Badge
            key={f}
            variant={filter === f ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todas" : f === "pending" ? "Pendentes" : f === "overdue" ? "Vencidas" : "Pagas"}
          </Badge>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada</TableCell></TableRow>
              ) : (
                filtered.map(b => {
                  const status = getStatus(b);
                  return (
                    <TableRow key={b.id} className={status === "overdue" ? "bg-red-50 dark:bg-red-950/10" : ""}>
                      <TableCell className="font-medium text-sm">{b.description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{getCatLabel(b.category)}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(b.due_date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right font-medium text-sm">R$ {Number(b.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {status === "paid" && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><Check className="h-3 w-3 mr-1" />Pago</Badge>}
                        {status === "pending" && <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>}
                        {status === "overdue" && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Vencida</Badge>}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <div className="flex gap-1">
                            {status !== "paid" && (
                              <Button variant="ghost" size="icon" onClick={() => markAsPaid(b.id)} title="Marcar como pago" className="text-emerald-600 hover:text-emerald-700">
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
