import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { toast } from "sonner";
import { Search, RotateCcw, Trash2, Eye, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeletedRecord {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  record_data: Record<string, unknown>;
  reason: string | null;
  deleted_at: string;
  purge_at: string;
  business_name: string | null;
  deleted_by_name: string | null;
  deleted_by_email: string | null;
}

const TABLE_LABELS: Record<string, string> = {
  clients: "Cliente",
  pets: "Animal",
  clinical_entries: "Prontuário",
  prescriptions: "Prescrição",
  vet_documents: "Documento veterinário",
  pet_attachments: "Anexo de pet",
  pet_exams: "Exame",
  pet_vaccines: "Vacina",
  appointments: "Agendamento",
  hospitalizations: "Internação",
  inventory_items: "Item de estoque",
  services: "Serviço",
  employees: "Funcionário",
  bills: "Conta a pagar",
  financial_records: "Lançamento financeiro",
  reminders: "Lembrete",
};

function recordTitle(table: string, data: Record<string, unknown>): string {
  return (
    (data.name as string) ||
    (data.description as string) ||
    (data.medication_name as string) ||
    (data.vaccine_name as string) ||
    (data.exam_type as string) ||
    (data.reason as string) ||
    (data.document_type as string) ||
    (data.file_name as string) ||
    (data.title as string) ||
    `Registro #${(data.id as string)?.slice(0, 8) ?? ""}`
  );
}

export default function Lixeira() {
  const { user } = useAuth();
  const [items, setItems] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<DeletedRecord | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<DeletedRecord | null>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("deleted_records")
      .select("*")
      .order("deleted_at", { ascending: false });
    if (error) toast.error("Erro ao carregar lixeira: " + error.message);
    setItems((data as DeletedRecord[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const tablesPresent = useMemo(() => {
    const set = new Set(items.map((i) => i.table_name));
    return Array.from(set).sort();
  }, [items]);

  const filtered = items.filter((r) => {
    if (tableFilter !== "all" && r.table_name !== tableFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      recordTitle(r.table_name, r.record_data).toLowerCase().includes(q) ||
      (TABLE_LABELS[r.table_name] ?? r.table_name).toLowerCase().includes(q) ||
      (r.deleted_by_name ?? "").toLowerCase().includes(q) ||
      (r.deleted_by_email ?? "").toLowerCase().includes(q)
    );
  });

  const handleRestore = async (r: DeletedRecord) => {
    if (!user) return;
    setWorking(true);
    // Limpa campos que possam conflitar / não pertencem ao schema
    const payload = { ...r.record_data } as Record<string, unknown>;
    // garante que o id original seja restaurado
    payload.id = r.record_id;
    payload.user_id = user.id;

    const { error: insertError } = await supabase
      .from(r.table_name as never)
      .insert(payload as never);

    if (insertError) {
      setWorking(false);
      toast.error("Não foi possível restaurar: " + insertError.message);
      return;
    }

    // Remove da lixeira após restaurar
    const { error: delError } = await supabase
      .from("deleted_records")
      .delete()
      .eq("id", r.id);

    setWorking(false);
    if (delError) {
      toast.warning("Restaurado, mas falhou ao remover da lixeira: " + delError.message);
    } else {
      toast.success("Registro restaurado com sucesso!");
    }
    load();
  };

  const confirmPurge = async () => {
    if (!purgeTarget) return;
    setWorking(true);
    const { error } = await supabase
      .from("deleted_records")
      .delete()
      .eq("id", purgeTarget.id);
    setWorking(false);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Registro apagado em definitivo.");
      setPurgeTarget(null);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6" /> Lixeira
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Itens excluídos ficam aqui por <strong>60 dias</strong> antes de serem apagados em definitivo.
            Você pode restaurar ou apagar agora.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {items.length} {items.length === 1 ? "registro" : "registros"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, tipo ou quem excluiu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {tablesPresent.map((t) => (
              <SelectItem key={t} value={t}>
                {TABLE_LABELS[t] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Identificação</TableHead>
                <TableHead className="hidden md:table-cell">Excluído por</TableHead>
                <TableHead className="hidden lg:table-cell">Quando</TableHead>
                <TableHead className="hidden md:table-cell">Apaga em</TableHead>
                <TableHead className="w-[160px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A lixeira está vazia.</TableCell></TableRow>
              ) : (
                filtered.map((r) => {
                  const purgeIn = formatDistanceToNow(new Date(r.purge_at), { locale: ptBR, addSuffix: true });
                  const deletedAgo = formatDistanceToNow(new Date(r.deleted_at), { locale: ptBR, addSuffix: true });
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="outline">{TABLE_LABELS[r.table_name] ?? r.table_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {recordTitle(r.table_name, r.record_data)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        <div>{r.deleted_by_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.deleted_by_email ?? ""}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground" title={format(new Date(r.deleted_at), "dd/MM/yyyy HH:mm")}>
                        {deletedAgo}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground" title={format(new Date(r.purge_at), "dd/MM/yyyy HH:mm")}>
                        {purgeIn}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Visualizar dados" onClick={() => setViewing(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Restaurar" disabled={working} onClick={() => handleRestore(r)}>
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Apagar em definitivo" className="text-destructive hover:text-destructive" onClick={() => setPurgeTarget(r)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              {viewing && (TABLE_LABELS[viewing.table_name] ?? viewing.table_name)} —{" "}
              {viewing && recordTitle(viewing.table_name, viewing.record_data)}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Excluído por:</span> {viewing.deleted_by_name ?? "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewing.deleted_by_email ?? "—"}</div>
                <div><span className="text-muted-foreground">Clínica:</span> {viewing.business_name ?? "—"}</div>
                <div><span className="text-muted-foreground">Data:</span> {format(new Date(viewing.deleted_at), "dd/MM/yyyy HH:mm")}</div>
                <div><span className="text-muted-foreground">Motivo:</span> {viewing.reason ?? "—"}</div>
                <div><span className="text-muted-foreground">Apaga em:</span> {format(new Date(viewing.purge_at), "dd/MM/yyyy")}</div>
              </div>

              <div className="border rounded-md bg-muted/20 p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Detalhes do registro
                </div>
                <FriendlyRecord table={viewing.table_name} data={viewing.record_data} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!purgeTarget}
        onOpenChange={(o) => !o && setPurgeTarget(null)}
        onConfirm={confirmPurge}
        loading={working}
        title="Apagar em definitivo"
        description={
          <>
            Você está prestes a <strong>apagar permanentemente</strong> este registro da lixeira.
            Esta ação <strong>não pode ser desfeita</strong> e o item não poderá mais ser restaurado.
          </>
        }
        retentionDays={0}
      />
    </div>
  );
}

// pequeno helper local para evitar import extra
function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

// ============================================================
// Renderização legível dos campos do registro restaurável
// ============================================================
const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  display_name: "Nome",
  client_name: "Tutor",
  pet_name: "Animal",
  species: "Espécie",
  breed: "Raça",
  sex: "Sexo",
  color: "Cor",
  coat: "Pelagem",
  birth_date: "Nascimento",
  death_date: "Óbito",
  microchip: "Microchip",
  neutered: "Castrado",
  cpf: "CPF",
  phone: "Telefone",
  email: "Email",
  address: "Endereço",
  street: "Rua",
  number: "Número",
  complement: "Complemento",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "Estado",
  cep: "CEP",
  notes: "Observações",
  description: "Descrição",
  category: "Categoria",
  amount: "Valor",
  price: "Preço",
  cost_price: "Custo",
  sell_price: "Preço de venda",
  quantity: "Quantidade",
  unit: "Unidade",
  batch: "Lote",
  expiry_date: "Validade",
  supplier: "Fornecedor",
  date: "Data",
  due_date: "Vencimento",
  paid_date: "Pago em",
  status: "Situação",
  service: "Serviço",
  duration_minutes: "Duração (min)",
  document_type: "Tipo de documento",
  document_number: "Número",
  diagnosis: "Diagnóstico",
  treatment: "Tratamento",
  observations: "Observações",
  vet_name: "Veterinário",
  reason: "Motivo",
  prescription: "Prescrição",
  vaccine_name: "Vacina",
  application_date: "Aplicação",
  next_dose_date: "Próxima dose",
  exam_type: "Tipo de exame",
  result: "Resultado",
  weight: "Peso",
  file_name: "Arquivo",
  active: "Ativo",
  role: "Cargo",
  salary: "Salário",
  commission_percent: "Comissão (%)",
};

const HIDDEN_KEYS = new Set([
  "id", "user_id", "created_at", "updated_at", "client_id", "pet_id",
  "appointment_id", "service_id", "inventory_item_id", "drug_catalog_id",
  "session_id", "hospitalization_id", "presale_id", "exam_id", "item_id",
  "batch_id", "source_id", "source_type", "reference_id", "reference_type",
  "photo_url", "file_url", "file_type", "file_size",
]);

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    if (key.includes("price") || key.includes("amount") || key === "salary") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return String(value);
  }
  if (typeof value === "string") {
    // ISO date detection
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return value.length > 10
            ? format(d, "dd/MM/yyyy HH:mm")
            : format(d, "dd/MM/yyyy");
        }
      } catch { /* fallthrough */ }
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof value === "object") {
    // Renderiza objetos pequenos como "k: v · k: v"
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .slice(0, 6);
    if (entries.length === 0) return "—";
    return entries.map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${formatValue(k, v)}`).join(" · ");
  }
  return String(value);
}

function FriendlyRecord({ table: _table, data }: { table: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data)
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== undefined && v !== "")
    .sort(([a], [b]) => {
      // Nome/título primeiro
      const priority = ["name", "display_name", "client_name", "pet_name", "description", "document_type"];
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai !== -1 && bi === -1) return -1;
      if (bi !== -1 && ai === -1) return 1;
      if (ai !== -1 && bi !== -1) return ai - bi;
      return a.localeCompare(b);
    });

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Sem detalhes adicionais.</p>;
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <dt className="text-xs font-medium text-muted-foreground">
            {FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
          </dt>
          <dd className="break-words">{formatValue(key, value)}</dd>
        </div>
      ))}
    </dl>
  );
}
