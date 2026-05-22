import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, Clock, AlertTriangle, Syringe, Package, TrendingDown, Tag, ArrowRight, Megaphone, Trash2 } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isBefore, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { CreatePromotionDialog } from "@/components/inventory/CreatePromotionDialog";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

interface ExpiringBatch {
  id: string;
  item_id: string;
  batch: string | null;
  expiry_date: string;
  quantity: number;
  unit_cost: number | null;
  item_name: string;
  sell_price: number | null;
  days_until_expiry: number;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
}

interface Promotion {
  id: string;
  item_id: string;
  discount_percent: number;
  original_price: number;
  promo_price: number;
  coupon_code: string | null;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  item_name?: string;
}

export default function DashboardHome() {
  const { clinicId, loading: clinicLoading } = useCurrentClinicId();
  const navigate = useNavigate();
  const { isTrialing, isTrialExpired, daysLeft } = useSubscription();
  const [stats, setStats] = useState({ todayAppointments: 0, totalClients: 0, monthIncome: 0, receivable: 0, pendingAppointments: 0 });
  const [todayList, setTodayList] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [overdueVaccines, setOverdueVaccines] = useState<any[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoDialog, setPromoDialog] = useState<{
    open: boolean;
    itemId: string;
    itemName: string;
    batchId?: string;
    currentPrice: number;
    suggestedDiscount: number;
    expiryDate?: string;
  } | null>(null);

  const loadPromotions = async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .eq("user_id", clinicId)
      .eq("status", "active")
      .gte("end_date", format(new Date(), "yyyy-MM-dd"))
      .order("end_date", { ascending: true });

    if (data && data.length > 0) {
      const itemIds = [...new Set(data.map((p: any) => p.item_id))];
      const { data: itemsData } = await supabase
        .from("inventory_items")
        .select("id, name")
        .in("id", itemIds);
      const itemMap = new Map((itemsData || []).map((i: any) => [i.id, i.name]));

      setPromotions(data.map((p: any) => ({
        ...p,
        item_name: itemMap.get(p.item_id) ?? "Produto",
      })));
    } else {
      setPromotions([]);
    }
  };

  useEffect(() => {
    if (!clinicId) return;
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    const loadStats = async () => {
      const [apptToday, clients, income, pending, todayAppts, records, vaccinesRes, completedAppts, billsPending] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("user_id", clinicId).gte("date", startOfDay(now).toISOString()).lte("date", endOfDay(now).toISOString()),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", clinicId),
        supabase.from("financial_records").select("amount").eq("user_id", clinicId).eq("type", "income").gte("date", format(startOfMonth(now), "yyyy-MM-dd")).lte("date", format(endOfMonth(now), "yyyy-MM-dd")),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("user_id", clinicId).eq("status", "scheduled"),
        supabase.from("appointments").select("*, clients(name)").eq("user_id", clinicId).gte("date", startOfDay(now).toISOString()).lte("date", endOfDay(now).toISOString()).order("date", { ascending: true }).limit(10),
        supabase.from("financial_records").select("*").eq("user_id", clinicId).gte("date", format(startOfMonth(sixMonthsAgo), "yyyy-MM-dd")).lte("date", format(endOfMonth(now), "yyyy-MM-dd")),
        supabase.from("pet_vaccines").select("*, pets!pet_vaccines_pet_id_fkey(name)").eq("user_id", clinicId).not("next_dose_date", "is", null),
        // A receber: consultas concluídas com preço, ainda sem lançamento financeiro vinculado
        supabase.from("appointments").select("id, price").eq("user_id", clinicId).eq("status", "completed").not("price", "is", null),
        // A receber: contas (bills) que estamos a receber? não — bills são despesas. Pulamos.
        supabase.from("bills").select("id").eq("user_id", clinicId).limit(1),
      ]);

      const totalIncome = income.data?.reduce((sum, r) => sum + Number(r.amount), 0) ?? 0;

      // Calcula a receber: appointments concluídos sem registro em financial_records
      const apptIds = (completedAppts.data ?? []).map((a: any) => a.id);
      let receivable = 0;
      if (apptIds.length > 0) {
        const { data: linked } = await supabase
          .from("financial_records")
          .select("appointment_id")
          .eq("user_id", clinicId)
          .in("appointment_id", apptIds);
        const linkedSet = new Set((linked ?? []).map((l: any) => l.appointment_id));
        receivable = (completedAppts.data ?? [])
          .filter((a: any) => !linkedSet.has(a.id))
          .reduce((s: number, a: any) => s + Number(a.price ?? 0), 0);
      }

      setStats({
        todayAppointments: apptToday.count ?? 0,
        totalClients: clients.count ?? 0,
        monthIncome: totalIncome,
        receivable,
        pendingAppointments: pending.count ?? 0,
      });
      setTodayList(todayAppts.data ?? []);

      const monthly = months.map((m) => {
        const mStr = format(m, "yyyy-MM");
        const mRecords = records.data?.filter((r) => r.date.startsWith(mStr)) ?? [];
        const inc = mRecords.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
        const exp = mRecords.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
        return { name: format(m, "MMM", { locale: ptBR }), Receita: inc, Despesa: exp };
      });
      setChartData(monthly);

      const today = new Date();
      const overdue = ((vaccinesRes.data as any[]) ?? []).filter((v) =>
        v.next_dose_date && isBefore(new Date(v.next_dose_date), today)
      ).slice(0, 5);
      setOverdueVaccines(overdue);
    };

    const loadInventoryAlerts = async () => {
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const { data: batchData } = await supabase
        .from("inventory_batches")
        .select("id, item_id, batch, expiry_date, quantity, unit_cost")
        .eq("user_id", clinicId)
        .gt("quantity", 0 as any)
        .not("expiry_date", "is", null)
        .lte("expiry_date", format(sixtyDaysFromNow, "yyyy-MM-dd"))
        .order("expiry_date", { ascending: true });

      if (batchData && batchData.length > 0) {
        const itemIds = [...new Set(batchData.map(b => b.item_id))];
        const { data: itemsData } = await supabase
          .from("inventory_items")
          .select("id, name, sell_price")
          .in("id", itemIds);

        const itemMap = new Map((itemsData || []).map(i => [i.id, i]));
        const today = new Date();

        const enriched: ExpiringBatch[] = batchData.map(b => ({
          ...b,
          expiry_date: b.expiry_date!,
          item_name: itemMap.get(b.item_id)?.name ?? "Produto",
          sell_price: itemMap.get(b.item_id)?.sell_price ?? null,
          days_until_expiry: differenceInDays(new Date(b.expiry_date!), today),
        })).slice(0, 12);

        setExpiringBatches(enriched);
      }

      const { data: lowStock } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, min_quantity")
        .eq("user_id", clinicId)
        .order("quantity", { ascending: true })
        .limit(100);

      if (lowStock) {
        const filtered = lowStock.filter(i => i.quantity <= i.min_quantity).slice(0, 5);
        setLowStockItems(filtered);
      }
    };

    loadStats();
    loadInventoryAlerts();
    loadPromotions();
  }, [clinicId]);

  const statCards = [
    { title: "Atendimentos hoje", value: stats.todayAppointments, icon: Calendar, color: "text-primary" },
    { title: "Total de clientes", value: stats.totalClients, icon: Users, color: "text-blue-500" },
    { title: "Receita realizada (mês)", value: `R$ ${stats.monthIncome.toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
    { title: "A receber", value: `R$ ${stats.receivable.toFixed(2)}`, icon: Clock, color: "text-amber-500" },
    { title: "Agendamentos pendentes", value: stats.pendingAppointments, icon: Clock, color: "text-amber-500" },
  ];

  const getExpiryBadge = (days: number) => {
    if (days <= 0) return <Badge variant="destructive" className="text-xs">Vencido</Badge>;
    if (days <= 15) return <Badge variant="destructive" className="text-xs">{days}d restantes</Badge>;
    if (days <= 30) return <Badge className="text-xs bg-amber-500 hover:bg-amber-600">{days}d restantes</Badge>;
    return <Badge variant="secondary" className="text-xs">{days}d restantes</Badge>;
  };

  const getSuggestedDiscountValue = (days: number) => {
    if (days <= 0) return 75;
    if (days <= 7) return 55;
    if (days <= 15) return 35;
    if (days <= 30) return 20;
    return 10;
  };

  const getSuggestedDiscountLabel = (days: number) => {
    if (days <= 0) return "70-80%";
    if (days <= 7) return "50-60%";
    if (days <= 15) return "30-40%";
    if (days <= 30) return "15-25%";
    return "10-15%";
  };

  const handleCreatePromo = (batch: ExpiringBatch) => {
    setPromoDialog({
      open: true,
      itemId: batch.item_id,
      itemName: batch.item_name,
      batchId: batch.id,
      currentPrice: batch.sell_price || 0,
      suggestedDiscount: getSuggestedDiscountValue(batch.days_until_expiry),
      expiryDate: batch.expiry_date,
    });
  };

  const handleDeletePromo = async (promoId: string) => {
    const { error } = await supabase.from("promotions").update({ status: "cancelled" }).eq("id", promoId);
    if (error) toast.error("Erro ao cancelar promoção");
    else { toast.success("Promoção cancelada"); loadPromotions(); }
  };

  if (clinicLoading) {
    return <div className="min-h-[40vh] flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialing && !isTrialExpired && daysLeft <= 5 && (
        <div className={`rounded-lg p-3 text-center border ${daysLeft <= 2 ? "bg-destructive/10 border-destructive/30" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"}`}>
          <p className="text-sm font-medium">
            {daysLeft <= 2 ? "⚠️" : "⏰"} Seu período de teste termina em <strong>{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</strong>.{" "}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate("/dashboard/plano")}>
              Escolher um plano →
            </Button>
          </p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expiring Stock Alert */}
      {expiringBatches.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Package className="h-4 w-4" />
                Lotes com validade próxima — Oportunidade de promoção
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-amber-700 dark:text-amber-400" onClick={() => navigate("/dashboard/estoque")}>
                Ver estoque <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
              💡 Crie promoções para estes itens antes que percam a validade. Vender com desconto é melhor que perder o produto!
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringBatches.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-background/80 text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.item_name}</p>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5 flex-wrap">
                      <span>Lote: {b.batch || "S/N"}</span>
                      <span>•</span>
                      <span>Val: {format(new Date(b.expiry_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                      <span>•</span>
                      <span>Qtd: {b.quantity}</span>
                      {b.sell_price != null && (
                        <>
                          <span>•</span>
                          <span>R$ {Number(b.sell_price).toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getExpiryBadge(b.days_until_expiry)}
                    <div className="hidden sm:flex items-center gap-1 text-xs">
                      <Tag className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        {getSuggestedDiscountLabel(b.days_until_expiry)}
                      </span>
                    </div>
                    {b.sell_price != null && b.sell_price > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleCreatePromo(b)}
                      >
                        <Megaphone className="h-3 w-3 mr-1" />
                        Promover
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Promotions */}
      {promotions.length > 0 && (
        <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Megaphone className="h-4 w-4" />
              Promoções ativas ({promotions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {promotions.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-background/80 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.item_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="line-through">R$ {Number(p.original_price).toFixed(2)}</span>
                      <span className="text-emerald-600 font-bold">R$ {Number(p.promo_price).toFixed(2)}</span>
                      <Badge variant="secondary" className="text-xs">-{p.discount_percent}%</Badge>
                      {p.coupon_code && (
                        <Badge variant="outline" className="text-xs font-mono">{p.coupon_code}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      até {format(new Date(p.end_date + "T12:00:00"), "dd/MM")}
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeletePromo(p.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-300 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                <TrendingDown className="h-4 w-4" />
                Estoque baixo — Reposição necessária
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-red-700 dark:text-red-400" onClick={() => navigate("/dashboard/estoque")}>
                Ver estoque <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-background/80 text-sm">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.quantity} / {item.min_quantity} mín.</span>
                    <Badge variant="destructive" className="text-xs">Baixo</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receita × Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="Receita" fill="hsl(168, 72%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesa" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendimentos de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {todayList.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum atendimento agendado para hoje.</p>
            ) : (
              <div className="space-y-3">
                {todayList.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{a.clients?.name ?? "Cliente não informado"}</p>
                      <p className="text-sm text-muted-foreground">{a.service ?? "Serviço não especificado"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{format(new Date(a.date), "HH:mm")}</p>
                      <p className="text-sm text-muted-foreground">{a.duration_minutes} min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Vaccines Alert */}
      {overdueVaccines.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Vacinas com retorno atrasado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueVaccines.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded bg-background/80 text-sm cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/dashboard/animais/${v.pet_id}`)}>
                  <div className="flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">{(v as any).pets?.name ?? "Pet"}</span>
                    <span className="text-muted-foreground">— {v.vaccine_name}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Vencida {format(new Date(v.next_dose_date), "dd/MM/yyyy")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Promotion Dialog */}
      {promoDialog && (
        <CreatePromotionDialog
          open={promoDialog.open}
          onOpenChange={(o) => setPromoDialog(o ? promoDialog : null)}
          itemId={promoDialog.itemId}
          itemName={promoDialog.itemName}
          batchId={promoDialog.batchId}
          currentPrice={promoDialog.currentPrice}
          suggestedDiscount={promoDialog.suggestedDiscount}
          expiryDate={promoDialog.expiryDate}
          onCreated={loadPromotions}
        />
      )}
    </div>
  );
}
