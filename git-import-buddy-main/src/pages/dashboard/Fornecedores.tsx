import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Search, Truck, Edit, Trash2, Globe, Mail, Phone, User } from "lucide-react";

interface Supplier {
  id: string;
  legal_type: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  ie: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  website: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  notes: string | null;
  active: boolean;
}

const empty = {
  legal_type: "pj",
  name: "", trade_name: "", document: "", ie: "",
  email: "", phone: "", phone2: "", website: "",
  cep: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
  seller_name: "", seller_phone: "", seller_email: "",
  notes: "", active: true,
};

export default function Fornecedores() {
  const { user } = useAuth();
  const [items, setItems] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("suppliers" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setItems((data as any[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const resetForm = () => { setForm(empty); setEditId(null); };

  const save = async () => {
    if (!user || !form.name.trim()) {
      toast.error("Nome / Razão social é obrigatório"); return;
    }
    const record: any = {
      user_id: user.id,
      legal_type: form.legal_type,
      name: form.name.trim(),
      trade_name: form.trade_name || null,
      document: form.document || null,
      ie: form.ie || null,
      email: form.email || null,
      phone: form.phone || null,
      phone2: form.phone2 || null,
      website: form.website || null,
      cep: form.cep || null,
      street: form.street || null,
      number: form.number || null,
      complement: form.complement || null,
      neighborhood: form.neighborhood || null,
      city: form.city || null,
      state: form.state || null,
      seller_name: form.seller_name || null,
      seller_phone: form.seller_phone || null,
      seller_email: form.seller_email || null,
      notes: form.notes || null,
      active: form.active,
    };
    const { error } = editId
      ? await supabase.from("suppliers" as any).update(record).eq("id", editId)
      : await supabase.from("suppliers" as any).insert(record);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(editId ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
    setOpen(false); resetForm(); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("suppliers" as any).delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); load(); }
  };

  const openEdit = (s: Supplier) => {
    setForm({
      legal_type: s.legal_type,
      name: s.name, trade_name: s.trade_name ?? "",
      document: s.document ?? "", ie: s.ie ?? "",
      email: s.email ?? "", phone: s.phone ?? "", phone2: s.phone2 ?? "",
      website: s.website ?? "",
      cep: s.cep ?? "", street: s.street ?? "", number: s.number ?? "",
      complement: s.complement ?? "", neighborhood: s.neighborhood ?? "",
      city: s.city ?? "", state: s.state ?? "",
      seller_name: s.seller_name ?? "", seller_phone: s.seller_phone ?? "",
      seller_email: s.seller_email ?? "",
      notes: s.notes ?? "", active: s.active,
    });
    setEditId(s.id); setOpen(true);
  };

  const filtered = items.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.trade_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s.document ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isPJ = form.legal_type === "pj";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" /> Fornecedores
        </h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo fornecedor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.legal_type} onValueChange={(v) => setForm({ ...form, legal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pj">Pessoa jurídica</SelectItem>
                      <SelectItem value="pf">Pessoa física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Ativo</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>{isPJ ? "Razão social *" : "Nome completo *"}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                {isPJ && (
                  <div className="space-y-2">
                    <Label>Nome fantasia</Label>
                    <Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isPJ ? "CNPJ" : "CPF"}</Label>
                  <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
                </div>
                {isPJ && (
                  <div className="space-y-2">
                    <Label>Inscrição estadual</Label>
                    <Input value={form.ie} onChange={(e) => setForm({ ...form, ie: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Contatos</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone principal</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone secundário</Label>
                    <Input value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Endereço</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Rua</Label>
                    <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Complemento</Label>
                    <Input value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
                  </div>
                </div>
              </div>

              {isPJ && (
                <div className="border rounded-lg p-3 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Vendedor / contato comercial</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label>Nome</Label>
                      <Input value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.seller_phone} onChange={(e) => setForm({ ...form, seller_phone: e.target.value })} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={form.seller_email} onChange={(e) => setForm({ ...form, seller_email: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <Button onClick={save} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum fornecedor cadastrado
                  </TableCell>
                </TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    {s.trade_name && <div className="text-xs text-muted-foreground">{s.trade_name}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.legal_type === "pj" ? "PJ" : "PF"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{s.document || "—"}</TableCell>
                  <TableCell className="text-xs space-y-1">
                    {s.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</div>}
                    {s.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</div>}
                    {s.website && <div className="flex items-center gap-1"><Globe className="h-3 w-3" />{s.website}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.seller_name ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1"><User className="h-3 w-3" />{s.seller_name}</div>
                        {s.seller_phone && <div className="text-muted-foreground">{s.seller_phone}</div>}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
