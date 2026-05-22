import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { softDeleteRecord } from "@/lib/softDelete";
import { Plus, Search, Trash2, Edit, Eye, Apple } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Patient {
  id: string;
  name: string;
  birth_date: string | null;
  sex: string | null;
  goal: string | null;
  client_id: string | null;
  client_name?: string;
}

interface Client { id: string; name: string; }

const defaultForm = {
  name: "", birth_date: "", sex: "", goal: "",
  dietary_restrictions: "", allergies: "", medical_conditions: "",
  notes: "", client_id: "",
};

export default function Pacientes() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const ownerId = clinicId ?? user?.id ?? "";
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    if (!ownerId) return;
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("patients" as any).select("*").eq("user_id", ownerId).order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").eq("user_id", ownerId).order("name"),
    ]);
    const cMap = new Map((c ?? []).map((x: any) => [x.id, x.name]));
    setPatients(((p ?? []) as any[]).map((x) => ({ ...x, client_name: x.client_id ? cMap.get(x.client_id) : undefined })));
    setClients((c ?? []) as any);
  };

  useEffect(() => { void load(); }, [ownerId]);

  const save = async () => {
    if (!user || !ownerId) return;
    if (!form.name.trim()) { toast.error("Informe o nome do paciente"); return; }
    const payload = {
      ...form,
      user_id: ownerId,
      birth_date: form.birth_date || null,
      sex: form.sex || null,
      goal: form.goal || null,
      client_id: form.client_id || null,
    };
    const { error } = editId
      ? await supabase.from("patients" as any).update(payload).eq("id", editId)
      : await supabase.from("patients" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Paciente atualizado" : "Paciente cadastrado");
    setOpen(false); setEditId(null); setForm(defaultForm);
    void load();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async (p: Patient) => {
    if (!ownerId) return;
    const { error } = await softDeleteRecord({
      table: "patients", recordId: p.id, recordData: p as any, userId: ownerId, reason: "Excluído pelo usuário",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Paciente movido para a lixeira");
    setDeleteId(null);
    void load();
  };

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.client_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Apple className="h-6 w-6 text-primary" /> Pacientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro nutricional e plano alimentar</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo paciente</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} paciente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nome*</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Data de nascimento</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Sexo</Label>
                  <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Objetivo</Label>
                <Select value={form.goal} onValueChange={(v) => setForm({ ...form, goal: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="saude">Saúde geral</SelectItem>
                    <SelectItem value="performance">Performance esportiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Vincular a cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Restrições alimentares</Label>
                <Textarea value={form.dietary_restrictions} onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })} /></div>
              <div className="space-y-1"><Label>Alergias</Label>
                <Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
              <div className="space-y-1"><Label>Condições médicas</Label>
                <Textarea value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} /></div>
              <div className="space-y-1"><Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Vinculado a</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum paciente cadastrado</TableCell></TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="capitalize">{p.goal ?? "—"}</TableCell>
                  <TableCell>{p.client_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditId(p.id);
                      setForm({
                        name: p.name, birth_date: p.birth_date ?? "", sex: p.sex ?? "",
                        goal: p.goal ?? "", dietary_restrictions: (p as any).dietary_restrictions ?? "",
                        allergies: (p as any).allergies ?? "", medical_conditions: (p as any).medical_conditions ?? "",
                        notes: (p as any).notes ?? "", client_id: p.client_id ?? "",
                      });
                      setOpen(true);
                    }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        onConfirm={() => {
          const p = patients.find((x) => x.id === deleteId);
          if (p) return remove(p);
        }}
        itemLabel={patients.find((x) => x.id === deleteId)?.name ?? "este paciente"}
      />
    </div>
  );
}
