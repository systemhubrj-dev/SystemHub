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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit, MessageCircle } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, endOfDay, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client { id: string; name: string; phone: string | null; }
interface Service { id: string; name: string; price: number; }
interface Appointment { id: string; date: string; duration_minutes: number; status: string; service: string | null; price: number | null; notes: string | null; client_id: string | null; clients: { name: string; phone: string | null } | null; }

export default function Agenda() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const effectiveUserId = clinicId ?? user?.id ?? "";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({ client_id: "", date: "", time: "09:00", duration_minutes: "30", service: "", price: "", notes: "", status: "scheduled" });

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const loadData = async () => {
    if (!effectiveUserId) return;
    const [a, c, s] = await Promise.all([
      supabase.from("appointments").select("*, clients(name, phone)").eq("user_id", effectiveUserId).gte("date", weekStart.toISOString()).lte("date", endOfDay(weekEnd).toISOString()).order("date"),
      supabase.from("clients").select("id, name, phone").eq("user_id", effectiveUserId).order("name"),
      supabase.from("services").select("id, name, price").eq("user_id", effectiveUserId).eq("active", true).order("name"),
    ]);
    setAppointments((a.data as Appointment[]) ?? []);
    setClients(c.data ?? []);
    setServices((s.data as Service[]) ?? []);
  };

  useEffect(() => { loadData(); }, [user, weekStart]);

  const resetForm = () => { setForm({ client_id: "", date: format(new Date(), "yyyy-MM-dd"), time: "09:00", duration_minutes: "30", service: "", price: "", notes: "", status: "scheduled" }); setEditId(null); };

  const handleSave = async () => {
    if (!user || !form.date || !form.time) { toast.error("Preencha data e hora"); return; }
    const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
    const record = {
      user_id: effectiveUserId,
      client_id: form.client_id || null,
      date: dateTime,
      duration_minutes: parseInt(form.duration_minutes) || 30,
      service: form.service || null,
      price: form.price ? parseFloat(form.price) : null,
      notes: form.notes || null,
      status: form.status,
    };

    // Detecta transição para "completed" para lançar receita
    const wasNotCompleted = !editId || appointments.find(a => a.id === editId)?.status !== "completed";
    const becomingCompleted = form.status === "completed" && wasNotCompleted && record.price && record.price > 0;

    const { data: saved, error } = editId
      ? await supabase.from("appointments").update(record).eq("id", editId).select().maybeSingle()
      : await supabase.from("appointments").insert(record).select().maybeSingle();

    if (error) { toast.error("Erro ao salvar: " + error.message); return; }

    // Se virou "concluído" com preço e ainda não tem receita lançada → cria
    if (becomingCompleted && saved) {
      const { data: existing } = await supabase
        .from("financial_records")
        .select("id")
        .eq("appointment_id", saved.id as any)
        .maybeSingle();
      if (!existing) {
        const ok = window.confirm(`Lançar R$ ${record.price!.toFixed(2)} como receita agora?`);
        if (ok) {
          await supabase.from("financial_records").insert({
            user_id: effectiveUserId,
            type: "income",
            amount: record.price,
            description: `Atendimento: ${record.service ?? "consulta"}`,
            category: "consulta",
            date: format(new Date(), "yyyy-MM-dd"),
            client_id: record.client_id,
            appointment_id: saved.id,
          } as any);
          toast.success("Receita lançada no financeiro!");
        }
      }
    }

    toast.success(editId ? "Atendimento atualizado!" : "Atendimento agendado!");
    setDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); loadData(); }
  };

  const openEdit = (a: Appointment) => {
    const d = new Date(a.date);
    setForm({ client_id: a.client_id ?? "", date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm"), duration_minutes: String(a.duration_minutes), service: a.service ?? "", price: a.price ? String(a.price) : "", notes: a.notes ?? "", status: a.status });
    setEditId(a.id);
    setDialogOpen(true);
  };

  const openWhatsApp = (a: Appointment) => {
    const clientName = a.clients?.name ?? "Cliente";
    const phone = a.clients?.phone?.replace(/\D/g, "");
    if (!phone) { toast.error("Cliente sem telefone cadastrado"); return; }
    const d = new Date(a.date);
    const dateStr = format(d, "dd/MM/yyyy");
    const timeStr = format(d, "HH:mm");
    const msg = encodeURIComponent(`Olá ${clientName}, confirmamos seu horário no dia ${dateStr} às ${timeStr}. Podemos confirmar?`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const handleServiceChange = (serviceName: string) => {
    setForm(prev => {
      const svc = services.find(s => s.name === serviceName);
      return { ...prev, service: serviceName, price: svc ? String(svc.price) : prev.price };
    });
  };

  const statusColors: Record<string, string> = { scheduled: "bg-blue-100 text-blue-700", confirmed: "bg-emerald-100 text-emerald-700", completed: "bg-gray-100 text-gray-700", cancelled: "bg-red-100 text-red-700" };
  const statusLabels: Record<string, string> = { scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo atendimento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Editar atendimento" : "Novo atendimento"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Hora</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={form.service} onValueChange={handleServiceChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => <SelectItem key={s.id} value={s.name}>{s.name} — R$ {Number(s.price).toFixed(2)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="font-medium text-sm">
          {format(weekStart, "dd MMM", { locale: ptBR })} – {format(weekEnd, "dd MMM yyyy", { locale: ptBR })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => {
          const dayAppts = appointments.filter((a) => isSameDay(new Date(a.date), day));
          const isToday = isSameDay(day, new Date());
          return (
            <Card key={day.toISOString()} className={isToday ? "border-primary" : ""}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE dd", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {dayAppts.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                {dayAppts.map((a) => (
                  <div key={a.id} className="p-2 rounded-md bg-muted/50 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{format(new Date(a.date), "HH:mm")}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors[a.status] ?? ""}`}>{statusLabels[a.status]}</span>
                    </div>
                    <p className="truncate">{a.clients?.name ?? "—"}</p>
                    {a.service && <p className="text-muted-foreground truncate">{a.service}</p>}
                    <div className="flex gap-1 pt-1 border-t border-border/50">
                      <button onClick={() => openWhatsApp(a)} className="p-1 rounded hover:bg-background hover:text-emerald-600 transition-colors" title="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></button>
                      <button onClick={() => openEdit(a)} className="p-1 rounded hover:bg-background hover:text-primary transition-colors" title="Editar"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1 rounded hover:bg-background hover:text-destructive transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}