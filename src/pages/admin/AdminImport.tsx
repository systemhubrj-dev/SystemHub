import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, Sparkles } from "lucide-react";

type EntityKey = "clients" | "pets" | "inventory_items" | "services" | "suppliers" | "bills";

interface FieldDef { key: string; label: string; required?: boolean }

const ENTITIES: Record<EntityKey, { label: string; fields: FieldDef[] }> = {
  clients: {
    label: "Clientes (tutores)",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "phone", label: "Telefone" },
      { key: "email", label: "Email" },
      { key: "cpf", label: "CPF" },
      { key: "address", label: "Endereço" },
      { key: "city", label: "Cidade" },
      { key: "state", label: "Estado" },
      { key: "notes", label: "Observações" },
    ],
  },
  pets: {
    label: "Pets",
    fields: [
      { key: "name", label: "Nome do pet", required: true },
      { key: "species", label: "Espécie", required: true },
      { key: "breed", label: "Raça" },
      { key: "sex", label: "Sexo (macho/femea)" },
      { key: "color", label: "Cor" },
      { key: "birth_date", label: "Nascimento (YYYY-MM-DD)" },
      { key: "microchip", label: "Microchip" },
      { key: "client_name", label: "Nome do tutor (vincula automaticamente)" },
    ],
  },
  inventory_items: {
    label: "Estoque",
    fields: [
      { key: "name", label: "Produto", required: true },
      { key: "quantity", label: "Quantidade" },
      { key: "unit", label: "Unidade" },
      { key: "category", label: "Categoria" },
      { key: "cost_price", label: "Preço custo" },
      { key: "sell_price", label: "Preço venda" },
      { key: "batch", label: "Lote" },
      { key: "expiry_date", label: "Validade (YYYY-MM-DD)" },
      { key: "min_quantity", label: "Estoque mínimo" },
    ],
  },
  services: {
    label: "Serviços",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "price", label: "Preço" },
      { key: "duration_minutes", label: "Duração (min)" },
      { key: "category", label: "Categoria" },
    ],
  },
  suppliers: {
    label: "Fornecedores",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "cnpj", label: "CNPJ" },
      { key: "phone", label: "Telefone" },
      { key: "email", label: "Email" },
    ],
  },
  bills: {
    label: "Contas a pagar",
    fields: [
      { key: "description", label: "Descrição", required: true },
      { key: "amount", label: "Valor", required: true },
      { key: "due_date", label: "Vencimento (YYYY-MM-DD)", required: true },
      { key: "category", label: "Categoria" },
    ],
  },
};

interface Client { user_id: string; display_name: string | null; email: string | null }

export default function AdminImport() {
  const [clients, setClients] = useState<Client[]>([]);
  const [targetOwner, setTargetOwner] = useState<string>("");
  const [entity, setEntity] = useState<EntityKey>("clients");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number; errors: any[] } | null>(null);

  const suggestWithAI = async () => {
    if (!headers.length) return toast.error("Carregue uma planilha primeiro.");
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-suggest-mapping", {
        body: { headers, sample: rawRows.slice(0, 5), fields: ENTITIES[entity].fields, entity },
      });
      if (error) throw error;
      const m = (data as any)?.mapping ?? {};
      setMapping(m);
      const filled = Object.values(m).filter(Boolean).length;
      toast.success(`IA mapeou ${filled} campo(s). Revise e ajuste antes de importar.`);
    } catch (e: any) {
      toast.error("Falha na sugestão IA: " + (e?.message ?? "erro"));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => { void loadClients(); }, []);
  useEffect(() => { setMapping({}); }, [entity, headers.join("|")]);

  const loadClients = async () => {
    const { data } = await supabase.functions.invoke("admin-list-clients");
    setClients((data as any)?.clients ?? []);
  };

  const onFile = async (file: File) => {
    setResult(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
    if (!json.length) {
      toast.error("Planilha vazia.");
      return;
    }
    setRawRows(json);
    setHeaders(Object.keys(json[0]));
    toast.success(`${json.length} linha(s) detectadas.`);
  };

  const fields = ENTITIES[entity].fields;
  const preview = useMemo(() => rawRows.slice(0, 5).map((r) => {
    const out: Record<string, any> = {};
    for (const f of fields) {
      const src = mapping[f.key];
      out[f.key] = src ? r[src] : "";
    }
    return out;
  }), [rawRows, mapping, fields]);

  const submit = async () => {
    if (!targetOwner) return toast.error("Selecione o cliente alvo.");
    if (!rawRows.length) return toast.error("Carregue uma planilha.");
    const missing = fields.filter((f) => f.required && !mapping[f.key]);
    if (missing.length) return toast.error("Mapeie os campos obrigatórios: " + missing.map(m => m.label).join(", "));

    const rows = rawRows.map((r) => {
      const out: Record<string, any> = {};
      for (const f of fields) {
        const src = mapping[f.key];
        if (src) out[f.key] = r[src];
      }
      return out;
    });

    setSubmitting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-import-data", {
        body: { targetOwnerId: targetOwner, entity, rows },
      });
      if (error) throw error;
      setResult(data as any);
      toast.success(`Importados: ${(data as any).inserted}. Falhas: ${(data as any).failed}.`);
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? "falha ao importar"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Importar Excel para um cliente</h1>
        <p className="text-sm text-muted-foreground">
          Selecione o cliente alvo, o tipo de dado, faça upload da planilha e mapeie as colunas. Toda importação fica registrada na auditoria.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Cliente alvo e tipo</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Cliente da plataforma</Label>
            <Select value={targetOwner} onValueChange={setTargetOwner}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>
                    {(c.display_name ?? c.email ?? c.user_id.slice(0, 8))} {c.email ? `· ${c.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de dado</Label>
            <Select value={entity} onValueChange={(v) => setEntity(v as EntityKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ENTITIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Planilha (.xlsx, .csv)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{rawRows.length ? `${rawRows.length} linhas carregadas` : "Clique para selecionar arquivo"}</div>
              <div className="text-xs text-muted-foreground">Formatos: .xlsx, .xls, .csv</div>
            </div>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>3. Mapeamento de colunas</CardTitle>
            <Button size="sm" variant="secondary" onClick={suggestWithAI} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Mapear com IA
            </Button>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <Label className="text-xs">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                <Select value={mapping[f.key] ?? "__none__"} onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="— ignorar —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— ignorar —</SelectItem>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {preview.length > 0 && (
        <Card>
          <CardHeader><CardTitle>4. Pré-visualização (5 primeiras)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    {fields.map((f) => <TableCell key={f.key} className="text-xs">{String(row[f.key] ?? "")}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {rawRows.length > 0 && (
        <div className="flex justify-end">
          <Button size="lg" onClick={submit} disabled={submitting || !targetOwner}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Importar {rawRows.length} linha(s)
          </Button>
        </div>
      )}

      {result && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-primary" /> Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Inseridos: <strong>{result.inserted}</strong> · Falhas: <strong>{result.failed}</strong></p>
            {result.errors?.length > 0 && (
              <div className="mt-3 max-h-40 overflow-auto text-xs bg-muted p-3 rounded">
                {result.errors.slice(0, 20).map((e, i) => <div key={i}>Linha {e.row}: {e.error}</div>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
