import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, MessageCircle, Copy, AlertCircle, Wallet, FileDown, FileSpreadsheet, FileText as FileTextIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import FinanceiroSummary from "@/components/dashboard/FinanceiroSummary";
import DelinquentList from "@/components/dashboard/DelinquentList";
import { downloadCSV, downloadXLSX, downloadReportPDF, fetchCompanyInfo } from "@/lib/reportExport";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PeriodFilter, PeriodRange } from "@/components/dashboard/PeriodFilter";

const EXPENSE_CATEGORIES = [
  { value: "aluguel", label: "Aluguel" },
  { value: "luz", label: "Luz / Energia" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet / Telefone" },
  { value: "funcionarios", label: "Funcionários / Salários" },
  { value: "insumos", label: "Insumos" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "limpeza", label: "Material de limpeza" },
  { value: "manutencao", label: "Manutenção" },
  { value: "impostos", label: "Impostos / Taxas" },
  { value: "marketing", label: "Marketing" },
  { value: "outros", label: "Outros" },
];

const INCOME_CATEGORIES = [
  { value: "consulta", label: "Consulta" },
  { value: "cirurgia", label: "Cirurgia" },
  { value: "exame", label: "Exames" },
  { value: "vacina", label: "Vacinação" },
  { value: "banho_tosa", label: "Banho / Tosa" },
  { value: "internacao", label: "Internação" },
  { value: "medicamento_venda", label: "Venda de medicamentos" },
  { value: "produto", label: "Venda de produtos" },
  { value: "outros", label: "Outros" },
];

interface FinancialRecord { id: string; type: string; amount: number; description: string | null; category: string | null; date: string; payment_method: string | null; client_id: string | null; }

export default function Financeiro() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const effectiveUserId = clinicId ?? user?.id ?? "";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const today = new Date();
  const [period, setPeriod] = useState<PeriodRange>({
    from: startOfMonth(today),
    to: endOfMonth(today),
    label: format(today, "MMMM 'de' yyyy", { locale: ptBR }),
  });
  const [form, setForm] = useState({ type: "income", amount: "", description: "", category: "", date: format(new Date(), "yyyy-MM-dd"), payment_method: "", client_id: "" });
  const [clients, setClients] = useState<any[]>([]);
  const [delinquents, setDelinquents] = useState<any[]>([]);

  const loadRecords = async () => {
    if (!effectiveUserId) return;
    const start = format(period.from, "yyyy-MM-dd");
    const end = format(period.to, "yyyy-MM-dd");
    const [recordsRes, clientsRes] = await Promise.all([
      supabase.from("financial_records").select("*").eq("user_id", effectiveUserId).gte("date", start).lte("date", end).order("date", { ascending: false }),
      supabase.from("clients").select("id, name, phone").eq("user_id", effectiveUserId).order("name"),
    ]);
    setRecords((recordsRes.data as FinancialRecord[]) ?? []);
    setClients(clientsRes.data ?? []);
  };

  const loadDelinquents = async () => {
    if (!effectiveUserId) return;
    const { data: completedAppts } = await supabase
      .from("appointments")
      .select("id, date, service, price, client_id, clients(name, phone)")
      .eq("user_id", effectiveUserId)
      .eq("status", "completed")
      .not("price", "is", null)
      .order("date", { ascending: false })
      .limit(200);

    const { data: paidRecords } = await supabase
      .from("financial_records")
      .select("appointment_id")
      .eq("user_id", effectiveUserId)
      .eq("type", "income")
      .not("appointment_id", "is", null);

    const paidIds = new Set((paidRecords ?? []).map((r) => r.appointment_id));
    const unpaid = (completedAppts ?? []).filter((a) => !paidIds.has(a.id));
    setDelinquents(unpaid);
  };

  useEffect(() => { loadRecords(); loadDelinquents(); }, [effectiveUserId, period.from, period.to]);

  const buildExportData = () => {
    const recordRows = records.map((r) => [
      format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy"),
      r.type === "income" ? "Receita" : "Despesa",
      getCategoryLabel(r.category ?? "outros", r.type),
      r.description ?? "—",
      r.payment_method ?? "—",
      Number(r.amount).toFixed(2),
    ]);
    const catRows = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => [
        getCategoryLabel(cat, "expense"),
        val.toFixed(2),
        expense > 0 ? `${((val / expense) * 100).toFixed(1)}%` : "0%",
      ]);
    return { recordRows, catRows };
  };

  const fileBase = () => `financeiro-${format(period.from, "yyyy-MM-dd")}_${format(period.to, "yyyy-MM-dd")}`;
  const periodSubtitle = () => `Período: ${format(period.from, "dd/MM/yyyy")} a ${format(period.to, "dd/MM/yyyy")}`;
  const summaryItems = () => [
    { label: "Receitas", value: `R$ ${income.toFixed(2)}` },
    { label: "Despesas", value: `R$ ${expense.toFixed(2)}` },
    { label: "Lucro", value: `R$ ${profit.toFixed(2)}` },
    { label: "Margem", value: income > 0 ? `${((profit / income) * 100).toFixed(1)}%` : "0%" },
  ];

  const handleExportCSV = () => {
    const { recordRows } = buildExportData();
    downloadCSV(`${fileBase()}.csv`, ["Data", "Tipo", "Categoria", "Descrição", "Pagamento", "Valor (R$)"], recordRows);
  };

  const handleExportXLSX = () => {
    const { recordRows, catRows } = buildExportData();
    downloadXLSX({
      filename: fileBase(),
      title: "Relatório Financeiro",
      subtitle: periodSubtitle(),
      summary: summaryItems(),
      sections: [
        { title: "Lançamentos", headers: ["Data", "Tipo", "Categoria", "Descrição", "Pagamento", "Valor (R$)"], rows: recordRows },
        { title: "Despesas por categoria", headers: ["Categoria", "Total (R$)", "% do total"], rows: catRows },
      ],
    });
  };

  const handleExportPDF = async () => {
    const { recordRows, catRows } = buildExportData();
    const company = await fetchCompanyInfo(effectiveUserId);
    await downloadReportPDF({
      filename: `${fileBase()}.pdf`,
      title: "Relatório Financeiro",
      subtitle: periodSubtitle(),
      summary: summaryItems(),
      company,
      sections: [
        { title: "Despesas por categoria", headers: ["Categoria", "Total (R$)", "% do total"], rows: catRows },
        { title: "Lançamentos do período", headers: ["Data", "Tipo", "Categoria", "Descrição", "Pagamento", "Valor"], rows: recordRows.map((r) => [...r.slice(0, 5), `R$ ${r[5]}`]) },
      ],
    });
  };

  const handleSave = async () => {
    if (!effectiveUserId || !form.amount || !form.date) { toast.error("Preencha valor e data"); return; }
    const { error } = await supabase.from("financial_records").insert({
      user_id: effectiveUserId, type: form.type, amount: parseFloat(form.amount), description: form.description || null, category: form.category || null, date: form.date, payment_method: form.payment_method || null, client_id: form.client_id || null,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Registro salvo!");
    setDialogOpen(false);
    setForm({ type: "income", amount: "", description: "", category: "", date: format(new Date(), "yyyy-MM-dd"), payment_method: "", client_id: "" });
    loadRecords();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("financial_records").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); loadRecords(); }
  };

  const income = records.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const expense = records.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
  const profit = income - expense;

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Group expenses by category for summary
  const expenseByCategory = records
    .filter((r) => r.type === "expense")
    .reduce((acc, r) => {
      const cat = r.category || "outros";
      acc[cat] = (acc[cat] || 0) + Number(r.amount);
      return acc;
    }, {} as Record<string, number>);

  const getCategoryLabel = (value: string, type: string) => {
    const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return list.find((c) => c.value === value)?.label ?? value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodFilter value={period} onChange={setPeriod} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><FileDown className="mr-2 h-4 w-4" />Baixar relatório</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportXLSX}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />Excel (XLSX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileTextIcon className="mr-2 h-4 w-4" />CSV simples
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" />PDF detalhado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo registro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo registro financeiro</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.type === "income" && (
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                      <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do registro" /></div>
                <div className="space-y-2">
                  <Label>Pagamento</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="credit">Cartão crédito</SelectItem>
                      <SelectItem value="debit">Cartão débito</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-emerald-600">R$ {income.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-red-600">R$ {expense.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Real</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              R$ {profit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {income > 0 ? ((profit / income) * 100).toFixed(1) : "0.0"}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="summary">Resumo por categoria</TabsTrigger>
          <TabsTrigger value="delinquent" className="gap-2">
            Inadimplência
            {delinquents.length > 0 && <Badge variant="destructive" className="text-xs ml-1">{delinquents.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro neste mês</TableCell></TableRow>
                  ) : (
                    records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{format(new Date(r.date + "T00:00:00"), "dd/MM")}</TableCell>
                        <TableCell className="text-sm">{r.description ?? "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(r.category ?? "outros", r.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${r.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                          {r.type === "income" ? "+" : "-"} R$ {Number(r.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <FinanceiroSummary
            expenseByCategory={expenseByCategory}
            totalExpense={expense}
            totalIncome={income}
            getCategoryLabel={(v: string) => getCategoryLabel(v, "expense")}
          />
        </TabsContent>

        <TabsContent value="delinquent">
          <DelinquentList delinquents={delinquents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
