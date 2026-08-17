import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, startOfYear, endOfYear, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, FileSpreadsheet, FileText as FileTextIcon } from "lucide-react";
import { downloadCSV, downloadXLSX, downloadReportPDF, fetchCompanyInfo } from "@/lib/reportExport";
import { PeriodFilter, PeriodRange } from "@/components/dashboard/PeriodFilter";

const COLORS = ["hsl(168, 72%, 36%)", "hsl(210, 70%, 50%)", "hsl(35, 70%, 50%)", "hsl(340, 70%, 50%)", "hsl(270, 60%, 55%)"];

export default function Relatorios() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const effectiveUserId = clinicId ?? user?.id ?? "";
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [clientData, setClientData] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [clientPaymentRows, setClientPaymentRows] = useState<{ client: string; method: string; amount: number; date: string }[]>([]);
  const [stats, setStats] = useState({ totalAppointments: 0, completedAppointments: 0, avgTicket: 0, monthlyProfit: 0, annualProfit: 0, monthlyAvg: 0, periodIncome: 0, periodExpense: 0 });
  const today = new Date();
  const [period, setPeriod] = useState<PeriodRange>({
    from: startOfMonth(subMonths(today, 5)),
    to: endOfMonth(today),
    label: "Últimos 6 meses",
  });

  useEffect(() => {
    if (!effectiveUserId) return;
    const now = new Date();
    const months = eachMonthOfInterval({ start: startOfMonth(period.from), end: endOfMonth(period.to) });
    const startStr = format(period.from, "yyyy-MM-dd");
    const endStr = format(period.to, "yyyy-MM-dd");

    const load = async () => {
      const [finRes, apptRes, clientsRes] = await Promise.all([
        supabase.from("financial_records").select("*").eq("user_id", effectiveUserId).gte("date", startStr).lte("date", endStr),
        supabase.from("appointments").select("*").eq("user_id", effectiveUserId).gte("date", period.from.toISOString()).lte("date", period.to.toISOString()),
        supabase.from("clients").select("id, name, created_at").eq("user_id", effectiveUserId),
      ]);

      const records = finRes.data ?? [];
      const appointments = apptRes.data ?? [];
      const clients = clientsRes.data ?? [];

      const monthly = months.map((m) => {
        const mStr = format(m, "yyyy-MM");
        const mRecords = records.filter((r: any) => r.date.startsWith(mStr));
        const inc = mRecords.filter((r: any) => r.type === "income").reduce((s: number, r: any) => s + Number(r.amount), 0);
        const exp = mRecords.filter((r: any) => r.type === "expense").reduce((s: number, r: any) => s + Number(r.amount), 0);
        return { name: format(m, "MMM/yy", { locale: ptBR }), receita: inc, despesa: exp, lucro: inc - exp };
      });
      setMonthlyData(monthly);

      const services: Record<string, number> = {};
      appointments.forEach((a: any) => {
        const svc = (a.service || "Outros").trim();
        services[svc] = (services[svc] || 0) + 1;
      });
      setServiceData(Object.entries(services).map(([name, value]) => ({ name, value })));

      const clientNames: Record<string, string> = {};
      clients.forEach((c: any) => { clientNames[c.id] = c.name; });

      const paymentMethodLabels: Record<string, string> = {
        credit: "Crédito", debit: "Débito", pix: "Pix", cash: "Dinheiro",
        credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro",
      };
      const paymentMethods: Record<string, number> = {};
      const paymentRows: { client: string; method: string; amount: number; date: string }[] = [];
      records
        .filter((r: any) => r.type === "income")
        .forEach((r: any) => {
          const rawMethod = (r.payment_method || "").trim();
          const label = paymentMethodLabels[rawMethod.toLowerCase()] || rawMethod || "Não informado";
          paymentMethods[label] = (paymentMethods[label] || 0) + 1;
          paymentRows.push({
            client: (r.client_id && clientNames[r.client_id]) || "—",
            method: label,
            amount: Number(r.amount),
            date: r.date,
          });
        });
      setPaymentMethodData(Object.entries(paymentMethods).map(([name, value]) => ({ name, value })));
      setClientPaymentRows(paymentRows.sort((a, b) => b.date.localeCompare(a.date)));

      const clientMonthly = months.map((m) => {
        const mStr = format(m, "yyyy-MM");
        const count = clients.filter((c: any) => c.created_at.startsWith(mStr)).length;
        return { name: format(m, "MMM/yy", { locale: ptBR }), cadastros: count };
      });
      setClientData(clientMonthly);

      const total = appointments.length;
      const completed = appointments.filter((a: any) => a.status === "completed").length;
      const incomeAppts = appointments.filter((a: any) => a.price).map((a: any) => Number(a.price));
      const avg = incomeAppts.length > 0 ? incomeAppts.reduce((a: number, b: number) => a + b, 0) / incomeAppts.length : 0;

      const periodIncome = records.filter((r: any) => r.type === "income").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const periodExpense = records.filter((r: any) => r.type === "expense").reduce((s: number, r: any) => s + Number(r.amount), 0);

      const yearStr = format(now, "yyyy");
      const { data: yearRecs } = await supabase.from("financial_records").select("date,type,amount").eq("user_id", effectiveUserId).gte("date", `${yearStr}-01-01`).lte("date", `${yearStr}-12-31`);
      const yr = yearRecs ?? [];
      const annualIncome = yr.filter((r: any) => r.type === "income").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const annualExpense = yr.filter((r: any) => r.type === "expense").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const monthsWithActivity = new Set(yr.map((r: any) => r.date.slice(0, 7))).size;
      const divisor = Math.max(1, monthsWithActivity);

      setStats({
        totalAppointments: total,
        completedAppointments: completed,
        avgTicket: avg,
        monthlyProfit: periodIncome - periodExpense,
        annualProfit: annualIncome - annualExpense,
        monthlyAvg: (annualIncome - annualExpense) / divisor,
        periodIncome,
        periodExpense,
      });
    };
    load();

    const channel = supabase
      .channel(`relatorios-rt-${effectiveUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${effectiveUserId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_records", filter: `user_id=eq.${effectiveUserId}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [effectiveUserId, period.from, period.to]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodFilter value={period} onChange={setPeriod} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><FileDown className="mr-2 h-4 w-4" />Baixar relatório</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const monthRows = monthlyData.map((m) => [m.name, m.receita.toFixed(2), m.despesa.toFixed(2), m.lucro.toFixed(2)]);
                const svcRows = serviceData.map((s: any) => [s.name, String(s.value)]);
                const cliRows = clientData.map((c: any) => [c.name, String(c.cadastros)]);
                const pmRows = paymentMethodData.map((p: any) => [p.name, String(p.value)]);
                const pmClientRows = clientPaymentRows.map((r) => [r.client, r.method, r.amount.toFixed(2), format(new Date(r.date), "dd/MM/yyyy")]);
                downloadXLSX({
                  filename: `relatorio-${format(period.from, "yyyy-MM-dd")}_${format(period.to, "yyyy-MM-dd")}`,
                  title: "Relatório Geral",
                  subtitle: `Período: ${format(period.from, "dd/MM/yyyy")} a ${format(period.to, "dd/MM/yyyy")}`,
                  summary: [
                    { label: "Atendimentos", value: String(stats.totalAppointments) },
                    { label: "Concluídos", value: String(stats.completedAppointments) },
                    { label: "Ticket médio", value: `R$ ${stats.avgTicket.toFixed(2)}` },
                    { label: "Receitas", value: `R$ ${stats.periodIncome.toFixed(2)}` },
                    { label: "Despesas", value: `R$ ${stats.periodExpense.toFixed(2)}` },
                    { label: "Lucro do período", value: `R$ ${stats.monthlyProfit.toFixed(2)}` },
                  ],
                  sections: [
                    { title: "Receita x Despesa", headers: ["Mês", "Receita (R$)", "Despesa (R$)", "Lucro (R$)"], rows: monthRows },
                    { title: "Servicos", headers: ["Serviço", "Quantidade"], rows: svcRows },
                    { title: "Clientes por mês", headers: ["Mês", "Novos clientes"], rows: cliRows },
                    { title: "Formas de pagamento", headers: ["Forma de pagamento", "Quantidade"], rows: pmRows },
                    { title: "Pagamentos por cliente", headers: ["Cliente", "Forma de pagamento", "Valor (R$)", "Data"], rows: pmClientRows },
                  ],
                });
              }}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />Excel (XLSX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const rows = monthlyData.map((m) => [m.name, m.receita.toFixed(2), m.despesa.toFixed(2), m.lucro.toFixed(2)]);
                downloadCSV(`relatorio-${format(period.from, "yyyy-MM-dd")}_${format(period.to, "yyyy-MM-dd")}.csv`,
                  ["Mês", "Receita (R$)", "Despesa (R$)", "Lucro (R$)"], rows);
              }}>
                <FileTextIcon className="mr-2 h-4 w-4" />CSV simples
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                const monthRows = monthlyData.map((m) => [m.name, `R$ ${m.receita.toFixed(2)}`, `R$ ${m.despesa.toFixed(2)}`, `R$ ${m.lucro.toFixed(2)}`]);
                const svcRows = serviceData.map((s: any) => [s.name, String(s.value)]);
                const cliRows = clientData.map((c: any) => [c.name, String(c.cadastros)]);
                const pmRows = paymentMethodData.map((p: any) => [p.name, String(p.value)]);
                const pmClientRows = clientPaymentRows.map((r) => [r.client, r.method, `R$ ${r.amount.toFixed(2)}`, format(new Date(r.date), "dd/MM/yyyy")]);
                const company = await fetchCompanyInfo(effectiveUserId);
                await downloadReportPDF({
                  filename: `relatorio-${format(period.from, "yyyy-MM-dd")}_${format(period.to, "yyyy-MM-dd")}.pdf`,
                  title: "Relatório Geral",
                  subtitle: `Período: ${format(period.from, "dd/MM/yyyy")} a ${format(period.to, "dd/MM/yyyy")}`,
                  company,
                  summary: [
                    { label: "Atendimentos", value: String(stats.totalAppointments) },
                    { label: "Concluídos", value: String(stats.completedAppointments) },
                    { label: "Ticket médio", value: `R$ ${stats.avgTicket.toFixed(2)}` },
                    { label: "Receitas", value: `R$ ${stats.periodIncome.toFixed(2)}` },
                    { label: "Despesas", value: `R$ ${stats.periodExpense.toFixed(2)}` },
                    { label: "Lucro", value: `R$ ${stats.monthlyProfit.toFixed(2)}` },
                  ],
                  sections: [
                    { title: "Receitas x Despesas por mês", headers: ["Mês", "Receita", "Despesa", "Lucro"], rows: monthRows },
                    { title: "Serviços mais realizados", headers: ["Serviço", "Quantidade"], rows: svcRows },
                    { title: "Cadastros de clientes por mês", headers: ["Mês", "Novos clientes"], rows: cliRows },
                    { title: "Formas de pagamento", headers: ["Forma de pagamento", "Quantidade"], rows: pmRows },
                    { title: "Pagamentos por cliente", headers: ["Cliente", "Forma de pagamento", "Valor", "Data"], rows: pmClientRows },
                  ],
                });
              }}>
                <FileDown className="mr-2 h-4 w-4" />PDF detalhado (com logo)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total atendimentos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalAppointments}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Concluídos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{stats.completedAppointments}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {stats.avgTicket.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Lucro mensal</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${stats.monthlyProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {stats.monthlyProfit.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Lucro anual</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${stats.annualProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {stats.annualProfit.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Média mensal</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {stats.monthlyAvg.toFixed(2)}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Receitas x Despesas (período selecionado)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Bar dataKey="receita" fill="hsl(168, 72%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Serviços mais realizados</CardTitle></CardHeader>
          <CardContent>
            {serviceData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={serviceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Lucro mensal (período selecionado)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Bar dataKey="lucro" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Cadastros de clientes por mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={clientData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="cadastros" stroke="hsl(168, 72%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Formas de pagamento</CardTitle></CardHeader>
          <CardContent>
            {paymentMethodData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Pagamentos por cliente</CardTitle></CardHeader>
        <CardContent>
          {clientPaymentRows.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Sem dados ainda</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma de pagamento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientPaymentRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.client}</TableCell>
                    <TableCell>{r.method}</TableCell>
                    <TableCell>R$ {r.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(r.date), "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}