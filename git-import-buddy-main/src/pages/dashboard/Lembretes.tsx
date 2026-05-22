import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bell, Plus, Send, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const REMINDER_TYPES = [
  { value: "vaccine", label: "Vacina" },
  { value: "appointment", label: "Consulta" },
  { value: "return", label: "Retorno" },
  { value: "exam", label: "Exame" },
  { value: "medication", label: "Medicação" },
  { value: "custom", label: "Personalizado" },
];

const TEMPLATES: Record<string, string> = {
  vaccine: "Olá {nome_tutor}! Lembramos que {nome_animal} tem vacina agendada para {data}. Contamos com sua presença!",
  appointment: "Olá {nome_tutor}! {nome_animal} tem consulta marcada para {data}. Confirme sua presença.",
  return: "Olá {nome_tutor}! O retorno de {nome_animal} está agendado para {data}. Não esqueça!",
  exam: "Olá {nome_tutor}! {nome_animal} tem exame agendado para {data}. Lembre-se do jejum se necessário.",
  medication: "Olá {nome_tutor}! Hora de renovar a medicação de {nome_animal}. Entre em contato conosco.",
  custom: "",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
};

export default function Lembretes() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const effectiveUserId = clinicId ?? user?.id ?? "";
  const [reminders, setReminders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    pet_id: "", client_id: "", reminder_type: "vaccine", channel: "email",
    message: TEMPLATES.vaccine, scheduled_date: "", advance_days: "3",
  });

  const loadData = async () => {
    if (!effectiveUserId) return;
    const [remRes, logRes, petRes, cliRes] = await Promise.all([
      supabase.from("reminders" as any).select("*, pets(name), clients(name, email, phone)").eq("user_id", effectiveUserId).order("scheduled_date", { ascending: false }),
      supabase.from("reminder_logs" as any).select("*, reminders(reminder_type, scheduled_date, pets(name), clients(name))").eq("user_id", effectiveUserId).order("created_at", { ascending: false }).limit(100),
      supabase.from("pets").select("id, name, client_id").eq("user_id", effectiveUserId).order("name"),
      supabase.from("clients").select("id, name, email, phone").eq("user_id", effectiveUserId).order("name"),
    ]);
    setReminders((remRes.data as any[]) ?? []);
    setLogs((logRes.data as any[]) ?? []);
    setPets((petRes.data as any[]) ?? []);
    setClients((cliRes.data as any[]) ?? []);
  };

  useEffect(() => { loadData(); }, [user]);

  const handlePetChange = (petId: string) => {
    const pet = pets.find((p: any) => p.id === petId);
    setForm({ ...form, pet_id: petId, client_id: pet?.client_id || form.client_id });
  };

  const handleTypeChange = (type: string) => {
    setForm({ ...form, reminder_type: type, message: TEMPLATES[type] || "" });
  };

  const handleSave = async () => {
    if (!user || !form.scheduled_date || !form.message) {
      toast.error("Preencha a data e mensagem"); return;
    }
    const { error } = await supabase.from("reminders" as any).insert({
      user_id: effectiveUserId,
      pet_id: form.pet_id || null,
      client_id: form.client_id || null,
      reminder_type: form.reminder_type,
      channel: form.channel,
      message: form.message,
      scheduled_date: form.scheduled_date,
      advance_days: parseInt(form.advance_days) || 3,
      status: "pending",
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Lembrete criado!");
    setShowDialog(false);
    setForm({ pet_id: "", client_id: "", reminder_type: "vaccine", channel: "email", message: TEMPLATES.vaccine, scheduled_date: "", advance_days: "3" });
    loadData();
  };

  const handleSendNow = async (reminder: any) => {
    const clientEmail = reminder.clients?.email;
    if (!clientEmail) { toast.error("Cliente sem email cadastrado"); return; }
    // Log the send attempt
    await supabase.from("reminder_logs" as any).insert({
      reminder_id: reminder.id, user_id: effectiveUserId, channel: "email", status: "sent",
    });
    await supabase.from("reminders" as any).update({ status: "sent" }).eq("id", reminder.id);
    toast.success("Lembrete enviado para " + clientEmail);
    loadData();
  };

  const handleCancel = async (id: string) => {
    await supabase.from("reminders" as any).update({ status: "cancelled" }).eq("id", id);
    toast.success("Lembrete cancelado");
    loadData();
  };

  const filtered = reminders.filter((r: any) => {
    const q = search.toLowerCase();
    return !q || r.pets?.name?.toLowerCase().includes(q) || r.clients?.name?.toLowerCase().includes(q) || r.reminder_type.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" />Lembretes</h1>
          <p className="text-muted-foreground">Gerencie lembretes automáticos para tutores</p>
        </div>
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo Lembrete</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Pendentes", value: reminders.filter((r: any) => r.status === "pending").length, icon: Clock, color: "text-yellow-600" },
          { label: "Enviados", value: reminders.filter((r: any) => r.status === "sent").length, icon: CheckCircle, color: "text-green-600" },
          { label: "Falhas", value: reminders.filter((r: any) => r.status === "failed").length, icon: XCircle, color: "text-red-600" },
          { label: "Total", value: reminders.length, icon: Bell, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div>
                <s.icon className={`h-8 w-8 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="reminders">
        <TabsList><TabsTrigger value="reminders">Lembretes</TabsTrigger><TabsTrigger value="history">Histórico de Envios</TabsTrigger></TabsList>

        <TabsContent value="reminders" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por animal, tutor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead><TableHead>Animal</TableHead><TableHead>Tutor</TableHead>
                    <TableHead>Data</TableHead><TableHead>Antecedência</TableHead><TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead><TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum lembrete encontrado</TableCell></TableRow>
                  ) : filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline">{REMINDER_TYPES.find((t) => t.value === r.reminder_type)?.label || r.reminder_type}</Badge></TableCell>
                      <TableCell>{r.pets?.name || "—"}</TableCell>
                      <TableCell>{r.clients?.name || "—"}</TableCell>
                      <TableCell>{format(new Date(r.scheduled_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{r.advance_days} dias</TableCell>
                      <TableCell className="capitalize">{r.channel}</TableCell>
                      <TableCell><Badge className={statusColors[r.status] || ""}>{r.status === "pending" ? "Pendente" : r.status === "sent" ? "Enviado" : r.status === "failed" ? "Falhou" : "Cancelado"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleSendNow(r)}><Send className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleCancel(r.id)}><XCircle className="h-3 w-3" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-base">Histórico de Envios</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Animal</TableHead><TableHead>Tutor</TableHead><TableHead>Canal</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum envio registrado</TableCell></TableRow>
                  ) : logs.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>{format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>{REMINDER_TYPES.find((t) => t.value === l.reminders?.reminder_type)?.label || "—"}</TableCell>
                      <TableCell>{l.reminders?.pets?.name || "—"}</TableCell>
                      <TableCell>{l.reminders?.clients?.name || "—"}</TableCell>
                      <TableCell className="capitalize">{l.channel}</TableCell>
                      <TableCell><Badge className={l.status === "sent" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{l.status === "sent" ? "Enviado" : "Falhou"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Lembrete</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.reminder_type} onValueChange={handleTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REMINDER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp" disabled>WhatsApp (em breve)</SelectItem>
                    <SelectItem value="sms" disabled>SMS (em breve)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Animal</Label>
                <Select value={form.pet_id} onValueChange={handlePetChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{pets.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tutor</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data do evento *</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Antecedência (dias)</Label><Input type="number" value={form.advance_days} onChange={(e) => setForm({ ...form, advance_days: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Use {nome_tutor}, {nome_animal}, {data} como variáveis" />
              <p className="text-xs text-muted-foreground">Variáveis: {"{nome_tutor}"}, {"{nome_animal}"}, {"{data}"}, {"{tipo_atendimento}"}</p>
            </div>
            <Button onClick={handleSave} className="w-full">Criar Lembrete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
