import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Sparkles, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DrugFormData {
  name: string;
  commercial_name: string;
  active_ingredient: string;
  drug_class: string;
  indications: string;
  species: string;
  dosage: string;
  contraindications: string;
  adverse_effects: string;
  interactions: string;
  withdrawal_period: string;
  source: string;
  notes: string;
}

export const emptyForm: DrugFormData = {
  name: "", commercial_name: "", active_ingredient: "", drug_class: "",
  indications: "", species: "", dosage: "", contraindications: "",
  adverse_effects: "", interactions: "", withdrawal_period: "", source: "", notes: "",
};

interface DrugFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: DrugFormData;
  setForm: (form: DrugFormData) => void;
  editId: string | null;
  onSave: () => void;
}

interface AutocompleteMatch {
  name: string;
  commercial_name: string | null;
  active_ingredient: string;
  drug_class: string | null;
  species: string | null;
  indications: string | null;
  dosage: string | null;
  contraindications: string | null;
  adverse_effects: string | null;
  interactions: string | null;
  withdrawal_period: string | null;
  source: string;
}

type EnrichedField = keyof Omit<DrugFormData, "source" | "notes">;

const ENRICHABLE_FIELDS: { key: EnrichedField; label: string }[] = [
  { key: "name", label: "Nome genérico" },
  { key: "commercial_name", label: "Nome comercial" },
  { key: "active_ingredient", label: "Princípio ativo" },
  { key: "drug_class", label: "Classe farmacológica" },
  { key: "species", label: "Espécies" },
  { key: "indications", label: "Indicações" },
  { key: "dosage", label: "Posologia" },
  { key: "contraindications", label: "Contraindicações" },
  { key: "adverse_effects", label: "Efeitos adversos" },
  { key: "interactions", label: "Interações" },
  { key: "withdrawal_period", label: "Período de carência" },
];

export default function DrugForm({ open, onOpenChange, form, setForm, editId, onSave }: DrugFormProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<Partial<DrugFormData> | null>(null);
  const [enrichNotes, setEnrichNotes] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset enrichment when form opens/closes
  useEffect(() => {
    if (!open) {
      setEnrichedData(null);
      setEnrichNotes("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [open]);

  const searchDrugs = async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("drug-autocomplete", {
        body: { query },
      });
      if (!error && data?.matches) {
        setSuggestions(data.matches);
        setShowSuggestions(data.matches.length > 0);
      }
    } catch (e) {
      console.error("Autocomplete error:", e);
    } finally {
      setSearching(false);
    }
  };

  const handleNameChange = (value: string) => {
    setForm({ ...form, name: value });
    setEnrichedData(null); // clear previous enrichment
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchDrugs(value), 400);
  };

  const applySuggestion = (match: AutocompleteMatch) => {
    setForm({
      ...form,
      name: match.name || form.name,
      commercial_name: match.commercial_name || form.commercial_name,
      active_ingredient: match.active_ingredient || form.active_ingredient,
      drug_class: match.drug_class || form.drug_class,
      species: match.species || form.species,
      indications: match.indications || form.indications,
      dosage: match.dosage || form.dosage,
      contraindications: match.contraindications || form.contraindications,
      adverse_effects: match.adverse_effects || form.adverse_effects,
      interactions: match.interactions || form.interactions,
      withdrawal_period: match.withdrawal_period || form.withdrawal_period,
    });
    setShowSuggestions(false);
    setSuggestions([]);
    setEnrichedData(null);
  };

  const handleEnrichWithAI = async () => {
    if (!form.name.trim() && !form.active_ingredient.trim()) {
      toast.error("Preencha ao menos o nome ou princípio ativo antes de usar a IA");
      return;
    }

    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-drug", {
        body: {
          name: form.name,
          commercial_name: form.commercial_name,
          active_ingredient: form.active_ingredient,
          drug_class: form.drug_class,
          species: form.species,
          indications: form.indications,
          dosage: form.dosage,
          contraindications: form.contraindications,
          adverse_effects: form.adverse_effects,
          interactions: form.interactions,
          withdrawal_period: form.withdrawal_period,
        },
      });

      if (error) {
        console.error("Enrich error:", error);
        toast.error("Erro ao consultar a IA");
        return;
      }

      if (data?.enriched) {
        setEnrichedData(data.enriched);
        setEnrichNotes(data.notes || "");
        toast.success("🤖 IA preencheu os campos! Revise antes de salvar.");
      }
    } catch (e) {
      console.error("Enrich invoke error:", e);
      toast.error("Erro ao consultar a IA");
    } finally {
      setEnriching(false);
    }
  };

  const acceptAllSuggestions = () => {
    if (!enrichedData) return;
    setForm({
      ...form,
      ...Object.fromEntries(
        ENRICHABLE_FIELDS
          .filter(({ key }) => enrichedData[key])
          .map(({ key }) => [key, enrichedData[key]!])
      ),
    });
    setEnrichedData(null);
    setEnrichNotes("");
    toast.success("Sugestões da IA aplicadas!");
  };

  const acceptField = (key: EnrichedField) => {
    if (!enrichedData || !enrichedData[key]) return;
    setForm({ ...form, [key]: enrichedData[key] });
    const updated = { ...enrichedData };
    delete updated[key];
    if (Object.keys(updated).filter(k => k !== "source" && k !== "notes").length === 0) {
      setEnrichedData(null);
      setEnrichNotes("");
    } else {
      setEnrichedData(updated);
    }
  };

  const dismissEnrichment = () => {
    setEnrichedData(null);
    setEnrichNotes("");
  };

  // Get fields that differ from current form
  const changedFields = enrichedData
    ? ENRICHABLE_FIELDS.filter(({ key }) => {
        const suggested = enrichedData[key];
        return suggested && suggested.trim() !== "" && suggested !== form[key];
      })
    : [];

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Cadastrar medicamento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editId ? "Editar medicamento" : "Novo medicamento"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name field with autocomplete */}
          <div className="space-y-2 relative" ref={containerRef}>
            <Label>Nome genérico *</Label>
            <div className="relative">
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Ex: Dipirona — digite para buscar na base"
              />
              {searching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              {!searching && form.name.length >= 2 && <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b">
                  Selecione para preencher automaticamente
                </div>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors border-b last:border-0"
                    onClick={() => applySuggestion(s)}
                  >
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.commercial_name && <span>{s.commercial_name} · </span>}
                      {s.active_ingredient}
                      {s.source === "reference" && <span className="ml-2 text-primary font-medium">📚 Base oficial</span>}
                      {s.source === "community" && <span className="ml-2 text-green-600 font-medium">✅ Comunidade</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2"><Label>Nome comercial</Label><Input value={form.commercial_name} onChange={(e) => setForm({ ...form, commercial_name: e.target.value })} placeholder="Ex: Novalgina Vet" /></div>
          <div className="space-y-2"><Label>Princípio ativo *</Label><Input value={form.active_ingredient} onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })} /></div>

          {/* AI Enrich button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleEnrichWithAI}
            disabled={enriching || (!form.name.trim() && !form.active_ingredient.trim())}
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
          >
            {enriching ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />IA analisando...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Preencher campos com IA</>
            )}
          </Button>

          {/* AI suggestions panel */}
          {enrichedData && changedFields.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  A IA sugeriu preenchimentos. Revise e aceite:
                </p>
                <Button size="sm" variant="ghost" onClick={dismissEnrichment} className="h-6 w-6 p-0 text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {enrichNotes && (
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">{enrichNotes}</p>
              )}
              <div className="space-y-2">
                {changedFields.map(({ key, label }) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acceptField(key)}
                      className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0 mt-0.5"
                      title="Aceitar"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <div className="min-w-0">
                      <strong className="text-blue-700 dark:text-blue-300">{label}:</strong>{" "}
                      {form[key] && form[key] !== enrichedData[key] ? (
                        <>
                          <span className="line-through text-muted-foreground">{form[key]}</span>
                          <span className="ml-1">→</span>{" "}
                        </>
                      ) : null}
                      <span className="font-medium">{enrichedData[key]}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={acceptAllSuggestions} className="w-full text-xs bg-emerald-600 hover:bg-emerald-700">
                <Check className="mr-1 h-3 w-3" />Aceitar todas as sugestões
              </Button>
            </div>
          )}

          <div className="space-y-2"><Label>Classe farmacológica</Label><Input value={form.drug_class} onChange={(e) => setForm({ ...form, drug_class: e.target.value })} placeholder="Ex: AINE, Antibiótico..." /></div>
          <div className="space-y-2"><Label>Espécies indicadas</Label><Input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="Ex: Cães, Gatos, Equinos" /></div>
          <div className="space-y-2"><Label>Indicações</Label><Textarea value={form.indications} onChange={(e) => setForm({ ...form, indications: e.target.value })} placeholder="Usos clínicos do medicamento" /></div>
          <div className="space-y-2"><Label>Posologia</Label><Textarea value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="Dose por espécie e peso" /></div>
          <div className="space-y-2"><Label>Contraindicações</Label><Textarea value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} /></div>
          <div className="space-y-2"><Label>Efeitos adversos</Label><Textarea value={form.adverse_effects} onChange={(e) => setForm({ ...form, adverse_effects: e.target.value })} /></div>
          <div className="space-y-2"><Label>Interações medicamentosas</Label><Textarea value={form.interactions} onChange={(e) => setForm({ ...form, interactions: e.target.value })} /></div>
          <div className="space-y-2"><Label>Período de carência</Label><Input value={form.withdrawal_period} onChange={(e) => setForm({ ...form, withdrawal_period: e.target.value })} /></div>
          <div className="space-y-2"><Label>Fonte/Referência</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ex: Bula oficial, protocolo próprio" /></div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button onClick={onSave} className="w-full">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
