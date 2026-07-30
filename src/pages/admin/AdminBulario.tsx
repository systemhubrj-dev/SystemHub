import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Pill, RefreshCw, ImagePlus, X } from "lucide-react";
import type { DrugReferenceData } from "@/components/bulario/DrugMonograph";

/* ─── form state ─────────────────────────────────────────── */
interface FormState {
  name: string; commercial_name: string; active_ingredient: string;
  drug_class: string; species: string; indications: string; dosage: string;
  contraindications: string; adverse_effects: string; interactions: string;
  withdrawal_period: string; source: string; notes: string;
  dose_min_mg_kg: string; dose_max_mg_kg: string; route: string;
  frequency: string; concentration_mg_ml: string; image_url: string;
}

const EMPTY: FormState = {
  name: "", commercial_name: "", active_ingredient: "", drug_class: "",
  species: "", indications: "", dosage: "", contraindications: "",
  adverse_effects: "", interactions: "", withdrawal_period: "", source: "",
  notes: "", dose_min_mg_kg: "", dose_max_mg_kg: "", route: "",
  frequency: "", concentration_mg_ml: "", image_url: "",
};

function drugToForm(d: DrugReferenceData): FormState {
  return {
    name: d.name,
    commercial_name: d.commercial_name ?? "",
    active_ingredient: d.active_ingredient,
    drug_class: d.drug_class ?? "",
    species: d.species ?? "",
    indications: d.indications ?? "",
    dosage: d.dosage ?? "",
    contraindications: d.contraindications ?? "",
    adverse_effects: d.adverse_effects ?? "",
    interactions: d.interactions ?? "",
    withdrawal_period: d.withdrawal_period ?? "",
    source: "",
    notes: "",
    dose_min_mg_kg: d.dose_min_mg_kg != null ? String(d.dose_min_mg_kg) : "",
    dose_max_mg_kg: d.dose_max_mg_kg != null ? String(d.dose_max_mg_kg) : "",
    route: d.route ?? "",
    frequency: d.frequency ?? "",
    concentration_mg_ml: d.concentration_mg_ml != null ? String(d.concentration_mg_ml) : "",
    image_url: d.image_url ?? "",
  };
}

/* ─── module-level field helpers (never inside another component) ── */
function FieldInput({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (val: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

function AreaInput({ label, value, onChange }: {
  label: string; value: string; onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="text-sm min-h-[72px] resize-none" />
    </div>
  );
}

/* ─── form dialog ────────────────────────────────────────── */
function DrugDialog({
  open, onClose, initial, editId, onSaved,
}: {
  open: boolean; onClose: () => void;
  initial: FormState; editId: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const submitting = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initial);
    setImageFile(null);
    setImagePreview(initial.image_url || "");
  }, [initial, open]);

  const set = (k: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [k]: val }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm((f) => ({ ...f, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (submitting.current) return;
    if (!form.name.trim() || !form.active_ingredient.trim()) {
      toast.error("Nome genérico e princípio ativo são obrigatórios.");
      return;
    }
    submitting.current = true;
    setSaving(true);

    let image_url: string | null = form.image_url || null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("drug-images")
        .upload(path, imageFile, { upsert: false });
      if (uploadError) {
        toast.error("Erro ao enviar imagem: " + uploadError.message);
        setSaving(false);
        submitting.current = false;
        return;
      }
      const { data: urlData } = supabase.storage.from("drug-images").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const payload = {
      name: form.name.trim(),
      commercial_name: form.commercial_name.trim() || null,
      active_ingredient: form.active_ingredient.trim(),
      drug_class: form.drug_class.trim() || null,
      species: form.species.trim() || null,
      indications: form.indications.trim() || null,
      dosage: form.dosage.trim() || null,
      contraindications: form.contraindications.trim() || null,
      adverse_effects: form.adverse_effects.trim() || null,
      interactions: form.interactions.trim() || null,
      withdrawal_period: form.withdrawal_period.trim() || null,
      route: form.route.trim() || null,
      frequency: form.frequency.trim() || null,
      dose_min_mg_kg: form.dose_min_mg_kg ? Number(form.dose_min_mg_kg) : null,
      dose_max_mg_kg: form.dose_max_mg_kg ? Number(form.dose_max_mg_kg) : null,
      concentration_mg_ml: form.concentration_mg_ml ? Number(form.concentration_mg_ml) : null,
      image_url,
    };

    const { error } = editId
      ? await supabase.from("drug_reference" as any).update(payload).eq("id", editId)
      : await supabase.from("drug_reference" as any).insert(payload);

    setSaving(false);
    submitting.current = false;

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(editId ? "Medicamento atualizado no bulário!" : "Medicamento adicionado ao bulário!");
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            {editId ? "Editar medicamento" : "Novo medicamento"} — Bulário oficial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Foto do medicamento */}
          <div className="space-y-2">
            <Label className="text-xs">Foto do medicamento</Label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-36 w-auto max-w-full rounded-lg border object-contain bg-muted/30"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Clique para adicionar foto</span>
                <span className="text-[10px] text-muted-foreground/60">JPG, PNG ou WebP · máx 5 MB</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                <ImagePlus className="w-3.5 h-3.5 mr-1" /> Trocar foto
              </Button>
            )}
          </div>

          {/* Identificação */}
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Nome genérico *" value={form.name} onChange={set("name")} />
            <FieldInput label="Nome comercial" value={form.commercial_name} onChange={set("commercial_name")} />
            <FieldInput label="Princípio ativo *" value={form.active_ingredient} onChange={set("active_ingredient")} />
            <FieldInput label="Classe farmacológica" value={form.drug_class} onChange={set("drug_class")} />
          </div>

          <AreaInput label="Espécies indicadas (ex: Cão, Gato, Bovino)" value={form.species} onChange={set("species")} />
          <AreaInput label="Indicações clínicas" value={form.indications} onChange={set("indications")} />
          <AreaInput label="Posologia / Dose" value={form.dosage} onChange={set("dosage")} />

          {/* Calculadora de dose */}
          <div className="grid grid-cols-4 gap-3">
            <FieldInput label="Dose mín (mg/kg)" value={form.dose_min_mg_kg} onChange={set("dose_min_mg_kg")} type="number" />
            <FieldInput label="Dose máx (mg/kg)" value={form.dose_max_mg_kg} onChange={set("dose_max_mg_kg")} type="number" />
            <FieldInput label="Concentração (mg/ml)" value={form.concentration_mg_ml} onChange={set("concentration_mg_ml")} type="number" />
            <FieldInput label="Via de adm." value={form.route} onChange={set("route")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Frequência (ex: SID, BID, TID)" value={form.frequency} onChange={set("frequency")} />
            <FieldInput label="Período de carência" value={form.withdrawal_period} onChange={set("withdrawal_period")} />
          </div>

          <AreaInput label="Contraindicações" value={form.contraindications} onChange={set("contraindications")} />
          <AreaInput label="Efeitos adversos" value={form.adverse_effects} onChange={set("adverse_effects")} />
          <AreaInput label="Interações medicamentosas" value={form.interactions} onChange={set("interactions")} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editId ? "Salvar alterações" : "Adicionar ao bulário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── main page ──────────────────────────────────────────── */
export default function AdminBulario() {
  const [drugs, setDrugs] = useState<DrugReferenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDrug, setEditDrug] = useState<DrugReferenceData | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("drug_reference" as any)
      .select("id,name,commercial_name,active_ingredient,drug_class,species,indications,dosage,contraindications,adverse_effects,interactions,withdrawal_period,dose_min_mg_kg,dose_max_mg_kg,route,frequency,concentration_mg_ml,image_url")
      .order("name");
    if (error) toast.error("Erro ao carregar: " + error.message);
    setDrugs((data as unknown as DrugReferenceData[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = drugs.filter((d) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return d.name.toLowerCase().includes(s) ||
      d.active_ingredient.toLowerCase().includes(s) ||
      (d.drug_class?.toLowerCase().includes(s)) ||
      (d.commercial_name?.toLowerCase().includes(s));
  });

  const openNew = () => { setEditDrug(null); setDialogOpen(true); };
  const openEdit = (d: DrugReferenceData) => { setEditDrug(d); setDialogOpen(true); };

  const handleDelete = async (d: DrugReferenceData) => {
    if (!confirm(`Remover "${d.name}" do bulário oficial? Esta ação não pode ser desfeita.`)) return;
    setDeleting(d.id);
    const { error } = await supabase.from("drug_reference" as any).delete().eq("id", d.id);
    setDeleting(null);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      toast.success(`"${d.name}" removido do bulário.`);
      setDrugs((prev) => prev.filter((x) => x.id !== d.id));
    }
  };

  const initialForm = editDrug ? drugToForm(editDrug) : { ...EMPTY };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" /> Bulário — Gerenciamento
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Medicamentos cadastrados aqui ficam disponíveis para <strong>todos os usuários</strong> da plataforma.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo medicamento
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar por nome, princípio ativo..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="outline">{drugs.length} medicamentos no bulário</Badge>
        {q && <span>{filtered.length} encontrado(s)</span>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground animate-pulse text-sm">Carregando bulário...</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome genérico</TableHead>
                <TableHead>Nome comercial</TableHead>
                <TableHead>Princípio ativo</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Espécies</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    {q ? "Nenhum medicamento encontrado." : "Nenhum medicamento cadastrado ainda."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/40">
                  <TableCell>
                    {d.image_url ? (
                      <img
                        src={d.image_url}
                        alt=""
                        className="w-10 h-10 rounded-md border object-contain bg-muted/30"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md border bg-muted/40 flex items-center justify-center">
                        <Pill className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.commercial_name ?? "—"}</TableCell>
                  <TableCell>{d.active_ingredient}</TableCell>
                  <TableCell>
                    {d.drug_class ? <Badge variant="secondary" className="text-xs">{d.drug_class}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                    {d.species ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(d)}
                        disabled={deleting === d.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DrugDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={initialForm}
        editId={editDrug?.id ?? null}
        onSaved={load}
      />
    </div>
  );
}
