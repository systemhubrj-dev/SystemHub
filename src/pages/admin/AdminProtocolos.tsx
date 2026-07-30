import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ClipboardList, RefreshCw, ImagePlus, X } from "lucide-react";

export interface Protocol {
  id: string;
  title: string;
  species: string | null;
  condition: string | null;
  description: string | null;
  steps: string | null;
  medications: string | null;
  notes: string | null;
  image_url: string | null;
}

interface FormState {
  title: string; species: string; condition: string;
  description: string; steps: string; medications: string; notes: string; image_url: string;
}

const EMPTY: FormState = {
  title: "", species: "", condition: "",
  description: "", steps: "", medications: "", notes: "", image_url: "",
};

function toForm(p: Protocol): FormState {
  return {
    title: p.title, species: p.species ?? "", condition: p.condition ?? "",
    description: p.description ?? "", steps: p.steps ?? "",
    medications: p.medications ?? "", notes: p.notes ?? "", image_url: p.image_url ?? "",
  };
}

const SPECIES_OPTIONS = ["Cão", "Gato", "Coelho", "Aves", "Bovino", "Equino", "Suíno", "Ovino", "Caprino", "Répteis", "Silvestres"];

/* ─── module-level helpers — never define components inside another component ── */
function FieldInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}

function SpeciesSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const toggle = (sp: string) => {
    const next = selected.includes(sp) ? selected.filter((s) => s !== sp) : [...selected, sp];
    onChange(next.join(", "));
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Espécies</Label>
      <div className="flex flex-wrap gap-1.5 p-2.5 rounded-md border bg-background min-h-[42px]">
        {SPECIES_OPTIONS.map((sp) => (
          <button
            key={sp} type="button" onClick={() => toggle(sp)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
              selected.includes(sp)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/60 text-muted-foreground border-transparent hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {sp}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-[11px] text-muted-foreground">Selecionado: {selected.join(", ")}</p>
      )}
    </div>
  );
}

function AreaInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-sm min-h-[80px] resize-none" />
    </div>
  );
}

/* ─── dialog ──────────────────────────────────────────────── */
function ProtoDialog({ open, onClose, initial, editId, onSaved }: {
  open: boolean; onClose: () => void;
  initial: FormState; editId: string | null; onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const submitting = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initial);
    setImageFile(null);
    setImagePreview(initial.image_url || "");
  }, [initial, open]);

  const set = (k: keyof FormState) => (val: string) => setForm((f) => ({ ...f, [k]: val }));

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
    if (!form.title.trim()) { toast.error("Título é obrigatório."); return; }
    submitting.current = true;
    setSaving(true);

    let image_url: string | null = form.image_url || null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `protocols/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("drug-images").upload(path, imageFile, { upsert: false });
      if (upErr) {
        toast.error("Erro ao enviar imagem: " + upErr.message);
        setSaving(false); submitting.current = false; return;
      }
      image_url = supabase.storage.from("drug-images").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      title: form.title.trim(),
      species: form.species.trim() || null,
      condition: form.condition.trim() || null,
      description: form.description.trim() || null,
      steps: form.steps.trim() || null,
      medications: form.medications.trim() || null,
      notes: form.notes.trim() || null,
      image_url,
      updated_at: new Date().toISOString(),
    };

    const { error } = editId
      ? await supabase.from("protocols" as any).update(payload).eq("id", editId)
      : await supabase.from("protocols" as any).insert(payload);

    setSaving(false); submitting.current = false;
    if (error) { toast.error("Erro: " + error.message); }
    else { toast.success(editId ? "Protocolo atualizado!" : "Protocolo cadastrado!"); onSaved(); onClose(); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            {editId ? "Editar protocolo" : "Novo protocolo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Foto */}
          <div className="space-y-2">
            <Label className="text-xs">Foto / imagem do protocolo</Label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-32 w-auto max-w-full rounded-lg border object-contain bg-muted/30"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <button type="button" onClick={removeImage}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Clique para adicionar foto</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
            {imagePreview && (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                <ImagePlus className="w-3.5 h-3.5 mr-1" /> Trocar foto
              </Button>
            )}
          </div>

          <FieldInput label="Título do protocolo *" value={form.title} onChange={set("title")} placeholder="Ex: Protocolo para Parvovirose Canina" />

          <SpeciesSelector value={form.species} onChange={set("species")} />

          <FieldInput label="Condição / indicação" value={form.condition} onChange={set("condition")} placeholder="Ex: Parvovirose, Erliquiose, Giardíase..." />

          <AreaInput label="Descrição geral" value={form.description} onChange={set("description")} placeholder="Visão geral do protocolo, objetivos e quando aplicar..." />
          <AreaInput label="Etapas do protocolo" value={form.steps} onChange={set("steps")} placeholder="1. Avaliação inicial...\n2. Fluidoterapia...\n3. Medicação..." />
          <AreaInput label="Medicamentos envolvidos" value={form.medications} onChange={set("medications")} placeholder="Ex: Amoxicilina 20 mg/kg BID, Metoclopramida 0,5 mg/kg TID..." />
          <AreaInput label="Observações / alertas" value={form.notes} onChange={set("notes")} placeholder="Contraindicações, pontos de atenção, referências..." />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editId ? "Salvar alterações" : "Cadastrar protocolo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── main page ──────────────────────────────────────────── */
export default function AdminProtocolos() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProto, setEditProto] = useState<Protocol | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("protocols" as any)
      .select("id,title,species,condition,description,steps,medications,notes,image_url")
      .order("title");
    if (error) toast.error("Erro: " + error.message);
    setProtocols((data as unknown as Protocol[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = protocols.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return p.title.toLowerCase().includes(s) ||
      (p.condition?.toLowerCase().includes(s)) ||
      (p.species?.toLowerCase().includes(s));
  });

  const openNew = () => { setEditProto(null); setDialogOpen(true); };
  const openEdit = (p: Protocol) => { setEditProto(p); setDialogOpen(true); };

  const handleDelete = async (p: Protocol) => {
    if (!confirm(`Remover "${p.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(p.id);
    const { error } = await supabase.from("protocols" as any).delete().eq("id", p.id);
    setDeleting(null);
    if (error) { toast.error("Erro: " + error.message); }
    else { toast.success(`"${p.title}" removido.`); setProtocols((prev) => prev.filter((x) => x.id !== p.id)); }
  };

  const initialForm = editProto ? toForm(editProto) : { ...EMPTY };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Protocolos — Gerenciamento
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Protocolos cadastrados aqui ficam disponíveis <strong>gratuitamente</strong> para todos os usuários.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo protocolo
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar por título, condição, espécie..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="outline">{protocols.length} protocolo(s)</Badge>
        {q && <span>{filtered.length} encontrado(s)</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground animate-pulse text-sm">Carregando protocolos...</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Espécies</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    {q ? "Nenhum protocolo encontrado." : "Nenhum protocolo cadastrado ainda."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-10 h-10 rounded-md border object-contain bg-muted/30"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-10 h-10 rounded-md border bg-muted/40 flex items-center justify-center">
                        <ClipboardList className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.condition ?? "—"}</TableCell>
                  <TableCell>
                    {p.species ? (
                      <div className="flex flex-wrap gap-1">
                        {p.species.split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p)} disabled={deleting === p.id}>
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

      <ProtoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={initialForm}
        editId={editProto?.id ?? null}
        onSaved={load}
      />
    </div>
  );
}
