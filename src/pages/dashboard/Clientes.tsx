import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Phone, Mail, Loader2, Lock, MessageCircle } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { softDeleteRecord } from "@/lib/softDelete";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { useNavigate } from "react-router-dom";

interface Client {
  id: string; name: string; email: string | null; phone: string | null; cpf: string | null;
  address: string | null; notes: string | null; birth_date: string | null; created_at: string;
  cep: string | null; street: string | null; number: string | null; neighborhood: string | null;
  city: string | null; state: string | null; complement: string | null;
}

const defaultForm = {
  name: "", email: "", phone: "", cpf: "", notes: "", birth_date: "",
  cep: "", street: "", number: "", neighborhood: "", city: "", state: "", complement: "",
};

export default function Clientes() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const navigate = useNavigate();
  const { canCreateClient, clientCount, config, refresh: refreshLimits } = usePlanLimits();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [loadingCep, setLoadingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadClients = async () => {
    if (!clinicId) return;
    const { data } = await supabase.from("clients").select("*").eq("user_id", clinicId).order("name");
    setClients((data as Client[]) ?? []);
  };

  useEffect(() => { loadClients(); }, [clinicId]);

  const resetForm = () => { setForm(defaultForm); setEditId(null); };

  const handleCepChange = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    setForm(prev => ({ ...prev, cep: cleaned }));
    if (cleaned.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch { /* ignore */ }
      setLoadingCep(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!user || !clinicId || !form.name.trim()) { toast.error("Nome é obrigatório"); return; }

    // Verificação de duplicidade (CPF, ou nome + telefone)
    const cpfDigits = form.cpf.replace(/\D/g, "");
    const phoneDigits = form.phone.replace(/\D/g, "");
    const nameNorm = form.name.trim().toLowerCase();
    const dupe = clients.find((c) => {
      if (editId && c.id === editId) return false;
      if (cpfDigits && c.cpf && c.cpf.replace(/\D/g, "") === cpfDigits) return true;
      const cPhone = (c.phone ?? "").replace(/\D/g, "");
      if (phoneDigits && cPhone && cPhone === phoneDigits && c.name.trim().toLowerCase() === nameNorm) return true;
      return false;
    });
    if (dupe) {
      toast.error(`Tutor já cadastrado: ${dupe.name}${dupe.cpf ? ` (CPF ${dupe.cpf})` : ""}`);
      return;
    }

    const address = [form.street, form.number, form.neighborhood, form.city, form.state].filter(Boolean).join(", ");
    const record: any = {
      user_id: clinicId,
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      cpf: form.cpf || null,
      address: address || null,
      notes: form.notes || null,
      birth_date: form.birth_date || null,
      cep: form.cep || null,
      street: form.street || null,
      number: form.number || null,
      neighborhood: form.neighborhood || null,
      city: form.city || null,
      state: form.state || null,
      complement: form.complement || null,
    };
    setIsSaving(true);
    try {
      const { error } = editId
        ? await supabase.from("clients").update(record).eq("id", editId)
        : await supabase.from("clients").insert(record);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success(editId ? "Cliente atualizado!" : "Cliente cadastrado!");
      setDialogOpen(false);
      resetForm();
      loadClients();
      refreshLimits();
    } finally {
      setIsSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    const { error } = await softDeleteRecord({
      table: "clients",
      recordId: deleteTarget.id,
      recordData: deleteTarget as unknown as Record<string, unknown>,
      userId: user.id,
      reason: "Exclusão manual de cliente",
    });
    setDeleting(false);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Cliente movido para a lixeira (60 dias)."); setDeleteTarget(null); loadClients(); }
  };

  const openEdit = (c: Client) => {
    setForm({
      name: c.name, email: c.email ?? "", phone: c.phone ?? "", cpf: c.cpf ?? "",
      notes: c.notes ?? "", birth_date: c.birth_date ?? "",
      cep: c.cep ?? "", street: c.street ?? "", number: c.number ?? "",
      neighborhood: c.neighborhood ?? "", city: c.city ?? "", state: c.state ?? "",
      complement: c.complement ?? "",
    });
    setEditId(c.id);
    setDialogOpen(true);
  };

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          {config.maxClients !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              {clientCount} de {config.maxClients} clientes
              {!canCreateClient && " — limite atingido"}
            </p>
          )}
        </div>
        {!canCreateClient ? (
          <Button variant="outline" onClick={() => navigate("/dashboard/meu-plano")} className="gap-2">
            <Lock className="h-4 w-4" />
            Limite atingido — Fazer upgrade
          </Button>
        ) : (
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
                <div className="space-y-2"><Label>Data de nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              </div>

              {/* Address section with CEP */}
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <Label className="text-sm font-semibold">Endereço</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">CEP</Label>
                    <div className="relative">
                      <Input value={form.cep} onChange={(e) => handleCepChange(e.target.value)} placeholder="00000000" maxLength={8} />
                      {loadingCep && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Rua</Label>
                    <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="Logradouro" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Número</Label>
                    <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="Nº" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bairro</Label>
                    <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Complemento</Label>
                    <Input value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} placeholder="Apto, bloco..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estado</Label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} />
                  </div>
                </div>
              </div>

              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="hidden lg:table-cell">CPF</TableHead>
                <TableHead className="w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1 text-sm">
                        {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.cpf ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Conversar no WhatsApp"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => {
                              const digits = c.phone!.replace(/\D/g, "");
                              const num = digits.startsWith("55") ? digits : `55${digits}`;
                              window.open(`https://wa.me/${num}`, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        itemLabel={deleteTarget ? `o cliente "${deleteTarget.name}"` : "este cliente"}
      />
    </div>
  );
}