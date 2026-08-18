import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Users2, Trash2, Edit, DollarSign, Percent, UserPlus, Mail, Shield, Copy, MessageCircle, RefreshCw, KeyRound } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatCPF } from "@/lib/cpf";
import { AppRole, DEFAULT_PERMISSIONS } from "@/hooks/useTeamRole";

interface TeamMember {
  user_id: string;
  role: AppRole;
  email?: string;
  name?: string;
  phone?: string | null;
  employee_id?: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Dono",
  vet: "Veterinário",
  receptionist: "Recepcionista",
  stockist: "Estoquista",
};

interface Employee {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  address: string | null;
  commission_percent: number;
  salary: number;
  active: boolean;
}

interface Commission {
  id: string;
  employee_id: string;
  amount: number;
  date: string;
  notes: string | null;
  appointment_id: string | null;
}

const defaultEmpForm = { name: "", role: "", phone: "", email: "", cpf: "", address: "", commission_percent: "10", salary: "0", active: true };
const defaultCommForm = { employee_id: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "" };

export default function Funcionarios() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState(defaultEmpForm);
  const [commForm, setCommForm] = useState(defaultCommForm);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "receptionist" as AppRole, password: "", phone: "" });
  const [inviting, setInviting] = useState(false);
  // (senha temporária nunca é persistida — só aparece uma vez no diálogo de credenciais)
  const [credentialsResult, setCredentialsResult] = useState<{ email: string; password: string; name: string; phone?: string; isNew: boolean } | null>(null);

  const loadData = async () => {
    if (!user) return;
    const start = format(startOfMonth(new Date(month + "-01")), "yyyy-MM-dd");
    const end = format(endOfMonth(new Date(month + "-01")), "yyyy-MM-dd");
    const [empRes, commRes, teamRes] = await Promise.all([
      supabase.from("employees").select("*").eq("user_id", user.id).order("name"),
      supabase.from("employee_commissions").select("*").eq("user_id", user.id).gte("date", start).lte("date", end).order("date", { ascending: false }),
      supabase.from("user_roles" as any).select("user_id, role").eq("owner_id", user.id),
    ]);
    setEmployees((empRes.data as Employee[]) ?? []);
    setCommissions((commRes.data as Commission[]) ?? []);
    // Cruza com employees pra pegar email/nome/senha temporária
    const teamRows = ((teamRes.data as any[]) ?? []).map((r) => {
      const emp = (empRes.data as any[])?.find((e) => e.auth_user_id === r.user_id);
      return {
        user_id: r.user_id,
        role: r.role,
        email: emp?.email,
        name: emp?.name,
        phone: emp?.phone ?? null,
        employee_id: emp?.id,
      };
    });
    setTeam(teamRows);
  };

  useEffect(() => { loadData(); }, [user, month]);

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error("Informe nome e e-mail do funcionário");
      return;
    }
    if (inviteForm.password && inviteForm.password.length < 6) {
      toast.error("A senha precisa ter no mínimo 6 caracteres");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-employee", {
        body: {
          email: inviteForm.email,
          name: inviteForm.name,
          role: inviteForm.role,
          password: inviteForm.password || undefined,
        },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);

      // Salva telefone no employee se foi informado
      if (inviteForm.phone && payload?.user_id) {
        await supabase.from("employees")
          .update({ phone: inviteForm.phone })
          .eq("auth_user_id", payload.user_id)
          .eq("user_id", user!.id);
      }

      setCredentialsResult({
        email: payload.email,
        password: payload.password,
        name: inviteForm.name,
        phone: inviteForm.phone || undefined,
        isNew: !!payload.created_new,
      });
      toast.success(payload.message || "Funcionário cadastrado!");
      setInviteOpen(false);
      setInviteForm({ email: "", name: "", role: "receptionist", password: "", phone: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar funcionário");
    } finally {
      setInviting(false);
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!member.email || !member.name) {
      toast.error("Funcionário sem e-mail cadastrado");
      return;
    }
    if (!confirm(`Gerar uma nova senha para ${member.name}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("invite-employee", {
        body: { email: member.email, name: member.name, role: member.role },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setCredentialsResult({
        email: payload.email,
        password: payload.password,
        name: member.name,
        phone: member.phone || undefined,
        isNew: false,
      });
      toast.success("Nova senha gerada!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao redefinir senha");
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const buildWhatsAppMessage = (info: { email: string; password: string; name: string }) => {
    return `Olá ${info.name}! 👋\n\nSeu acesso ao sistema da clínica foi liberado:\n\n🔑 Login: ${info.email}\n🔒 Senha: ${info.password}\n\nAcesse: ${window.location.origin}/login\n\n⚠️ Recomendo trocar a senha no primeiro acesso.`;
  };

  const openWhatsApp = (info: { email: string; password: string; name: string; phone?: string }) => {
    const msg = encodeURIComponent(buildWhatsAppMessage(info));
    const phone = (info.phone || "").replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/55${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

  const handleRevokeMember = async (userId: string) => {
    if (!user) return;
    if (!confirm("Remover acesso deste funcionário ao sistema?")) return;
    const { error } = await supabase.from("user_roles" as any).delete()
      .eq("owner_id", user.id).eq("user_id", userId);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Acesso revogado"); loadData(); }
  };

  const handleSaveEmployee = async () => {
    if (!user || !empForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const record: any = {
      user_id: user.id,
      name: empForm.name.trim(),
      role: empForm.role || null,
      phone: empForm.phone || null,
      email: empForm.email || null,
      cpf: empForm.cpf || null,
      address: empForm.address || null,
      commission_percent: parseFloat(empForm.commission_percent) || 0,
      salary: parseFloat(empForm.salary) || 0,
      active: empForm.active,
    };
    const { error } = editId
      ? await supabase.from("employees").update(record).eq("id", editId)
      : await supabase.from("employees").insert(record);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(editId ? "Atualizado!" : "Funcionário cadastrado!");
    setEmpDialogOpen(false);
    setEmpForm(defaultEmpForm);
    setEditId(null);
    loadData();
  };

  const openEditEmp = (e: Employee) => {
    setEmpForm({
      name: e.name, role: e.role ?? "", phone: e.phone ?? "", email: e.email ?? "",
      cpf: e.cpf ?? "", address: e.address ?? "",
      commission_percent: String(e.commission_percent), salary: String(e.salary), active: e.active,
    });
    setEditId(e.id);
    setEmpDialogOpen(true);
  };

  const handleDeleteEmp = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); loadData(); }
  };

  const handleSaveCommission = async () => {
    if (!user || !commForm.employee_id || !commForm.amount) { toast.error("Preencha funcionário e valor"); return; }
    const { error } = await supabase.from("employee_commissions").insert({
      user_id: user.id,
      employee_id: commForm.employee_id,
      amount: parseFloat(commForm.amount),
      date: commForm.date,
      notes: commForm.notes || null,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Comissão registrada!");
    setCommDialogOpen(false);
    setCommForm(defaultCommForm);
    loadData();
  };

  const handleDeleteComm = async (id: string) => {
    const { error } = await supabase.from("employee_commissions").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); loadData(); }
  };

  const empMap = new Map(employees.map(e => [e.id, e.name]));
  const totalComm = commissions.reduce((s, c) => s + Number(c.amount), 0);

  // Commission summary by employee
  const commByEmp = commissions.reduce((acc, c) => {
    acc[c.employee_id] = (acc[c.employee_id] || 0) + Number(c.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users2 className="h-6 w-6 text-primary" /> Funcionários
        </h1>
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Equipe & Acessos</TabsTrigger>
          <TabsTrigger value="employees">Cargos & Salários</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-muted-foreground max-w-xl">
              Cadastre o login do seu funcionário aqui. Você define o e-mail, gera ou cria uma senha, e envia direto pelo WhatsApp. Cada cargo já vem com permissões pré-definidas e o acesso fica vinculado à sua conta.
            </p>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="mr-2 h-4 w-4" />Cadastrar funcionário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo acesso de funcionário</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2">
                    <Label>Nome completo *</Label>
                    <Input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Maria Silva" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail (será o login) *</Label>
                    <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value.trim().toLowerCase() })} placeholder="maria@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp (com DDD, opcional)</Label>
                    <Input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} placeholder="11 91234-5678" />
                    <p className="text-xs text-muted-foreground">Se preencher, depois você envia o login direto pelo WhatsApp.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo / nível de acesso *</Label>
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as AppRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receptionist">Recepcionista (agenda, clientes, caixa)</SelectItem>
                        <SelectItem value="stockist">Estoquista (estoque, bulário, caixa)</SelectItem>
                        <SelectItem value="vet">Veterinário (tudo clínico, sem financeiro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Senha (opcional)</Label>
                    <Input value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="Deixe em branco para gerar automaticamente" />
                    <p className="text-xs text-muted-foreground"><KeyRound className="inline h-3 w-3 mr-1" />Mínimo 6 caracteres. Se vazio, o sistema cria uma senha forte e você copia para enviar.</p>
                  </div>
                  <Button onClick={handleInvite} disabled={inviting} className="w-full">
                    {inviting ? "Cadastrando..." : "Criar acesso"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Membros com acesso ao sistema</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Login (e-mail)</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum funcionário com acesso ainda. Clique em "Cadastrar funcionário" acima.</TableCell></TableRow>
                  ) : (
                    team.map((m) => {
                      return (
                        <TableRow key={m.user_id}>
                          <TableCell className="font-medium">{m.name ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="truncate max-w-[160px] sm:max-w-none">{m.email ?? "—"}</span>
                              {m.email && (
                                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyText(m.email!, "E-mail")}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Gerar nova senha" onClick={() => handleResetPassword(m)}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRevokeMember(m.user_id)}>
                                Revogar
                              </Button>
                            </div>
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

          {/* Dialog com credenciais geradas */}
          <Dialog open={!!credentialsResult} onOpenChange={(o) => !o && setCredentialsResult(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  {credentialsResult?.isNew ? "Acesso criado!" : "Nova senha gerada!"}
                </DialogTitle>
              </DialogHeader>
              {credentialsResult && (
                <div className="space-y-4">
                  <div className="bg-muted/40 rounded-lg p-4 space-y-3 border">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Login (e-mail)</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-sm font-mono break-all">{credentialsResult.email}</code>
                        <Button variant="outline" size="sm" onClick={() => copyText(credentialsResult.email, "E-mail")}>
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Senha</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-sm font-mono">{credentialsResult.password}</code>
                        <Button variant="outline" size="sm" onClick={() => copyText(credentialsResult.password, "Senha")}>
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
                    ⚠️ Esta é a única vez que você verá essa senha junto. Copie agora ou envie pelo WhatsApp. Você sempre pode gerar uma nova depois.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyText(`Login: ${credentialsResult.email}\nSenha: ${credentialsResult.password}\nAcesse: ${window.location.origin}/login`, "Credenciais")}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copiar tudo
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => openWhatsApp(credentialsResult)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" /> Enviar no WhatsApp
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>


        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={empDialogOpen} onOpenChange={o => { setEmpDialogOpen(o); if (!o) { setEmpForm(defaultEmpForm); setEditId(null); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Novo funcionário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} funcionário</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2"><Label>Nome *</Label><Input value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Cargo</Label><Input value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} placeholder="Ex: Auxiliar" /></div>
                    <div className="space-y-2"><Label>Telefone</Label><Input value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>CPF</Label><Input value={empForm.cpf} onChange={e => setEmpForm({ ...empForm, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Endereço</Label><Input value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} placeholder="Rua, número, bairro, cidade" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Comissão (%)</Label><Input type="number" step="0.5" value={empForm.commission_percent} onChange={e => setEmpForm({ ...empForm, commission_percent: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Salário (R$)</Label><Input type="number" step="0.01" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={empForm.active} onCheckedChange={v => setEmpForm({ ...empForm, active: v })} />
                    <Label>Ativo</Label>
                  </div>
                  <Button onClick={handleSaveEmployee} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="hidden md:table-cell">Comissão</TableHead>
                    <TableHead className="hidden md:table-cell">Salário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum funcionário cadastrado</TableCell></TableRow>
                  ) : (
                    employees.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell className="text-sm">{e.role ?? "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{e.commission_percent}%</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">R$ {Number(e.salary).toFixed(2)}</TableCell>
                        <TableCell>
                          {e.active ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditEmp(e)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteEmp(e.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-auto" />
            <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Registrar comissão</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova comissão</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Funcionário *</Label>
                    <Select value={commForm.employee_id} onValueChange={v => setCommForm({ ...commForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.active).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={commForm.amount} onChange={e => setCommForm({ ...commForm, amount: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Data</Label><Input type="date" value={commForm.date} onChange={e => setCommForm({ ...commForm, date: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Observações</Label><Textarea value={commForm.notes} onChange={e => setCommForm({ ...commForm, notes: e.target.value })} placeholder="Ex: Comissão sobre consulta" rows={2} /></div>
                  <Button onClick={handleSaveCommission} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-4 w-4" />Total comissões do mês</CardTitle></CardHeader>
              <CardContent><span className="text-xl font-bold">R$ {totalComm.toFixed(2)}</span></CardContent>
            </Card>
            {employees.filter(e => e.active).slice(0, 2).map(emp => (
              <Card key={emp.id}>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />{emp.name}</CardTitle></CardHeader>
                <CardContent><span className="text-xl font-bold">R$ {(commByEmp[emp.id] || 0).toFixed(2)}</span></CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma comissão registrada neste mês</TableCell></TableRow>
                  ) : (
                    commissions.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{format(new Date(c.date + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium text-sm">{empMap.get(c.employee_id) ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.notes ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium text-sm">R$ {Number(c.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteComm(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
