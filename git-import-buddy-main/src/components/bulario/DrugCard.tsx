import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Edit, Trash2, RefreshCw, CheckCircle, Clock, XCircle, Bot, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export interface Drug {
  id: string;
  name: string;
  commercial_name: string | null;
  active_ingredient: string;
  drug_class: string | null;
  indications: string | null;
  species: string | null;
  dosage: string | null;
  contraindications: string | null;
  adverse_effects: string | null;
  interactions: string | null;
  withdrawal_period: string | null;
  is_official: boolean;
  source: string | null;
  notes: string | null;
  user_id: string | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  validation_status: string;
  validation_notes: string | null;
}

interface DrugCardProps {
  drug: Drug;
  onEdit: (drug: Drug) => void;
  onDelete: (id: string) => void;
  onRevalidate: (id: string) => void;
  onReload: () => void;
  isValidating: boolean;
  currentUserId: string | null;
}

interface SuggestedData {
  name?: string;
  commercial_name?: string;
  active_ingredient?: string;
  drug_class?: string;
  species?: string;
  indications?: string;
  dosage?: string;
  contraindications?: string;
  adverse_effects?: string;
  interactions?: string;
  withdrawal_period?: string;
}

function parseValidationNotes(notes: string | null): { text: string; suggestedData: SuggestedData | null } {
  if (!notes) return { text: "", suggestedData: null };
  try {
    const parsed = JSON.parse(notes);
    if (parsed.notes && parsed.suggested_data) {
      return { text: parsed.notes, suggestedData: parsed.suggested_data };
    }
  } catch {
    // Not JSON, plain text
  }
  return { text: notes, suggestedData: null };
}

function ValidationBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="bg-destructive/10"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
    case "needs_review":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Sparkles className="h-3 w-3 mr-1" />IA sugeriu correções</Badge>;
    default:
      return <Badge variant="outline" className="text-amber-600 border-amber-400/50"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  }
}

export default function DrugCard({ drug, onEdit, onDelete, onRevalidate, onReload, isValidating, currentUserId }: DrugCardProps) {
  const [applying, setApplying] = useState(false);
  const isOwner = currentUserId && drug.user_id === currentUserId;
  const canEdit = isOwner && !drug.is_official && drug.validation_status !== "approved";
  const canDelete = isOwner && !drug.is_official;

  const { text: notesText, suggestedData } = parseValidationNotes(drug.validation_notes);

  const handleApplySuggestions = async () => {
    if (!suggestedData) return;
    setApplying(true);
    try {
      const { error } = await supabase
        .from("drug_catalog")
        .update({
          name: suggestedData.name || drug.name,
          commercial_name: suggestedData.commercial_name || drug.commercial_name,
          active_ingredient: suggestedData.active_ingredient || drug.active_ingredient,
          drug_class: suggestedData.drug_class || drug.drug_class,
          species: suggestedData.species || drug.species,
          indications: suggestedData.indications || drug.indications,
          dosage: suggestedData.dosage || drug.dosage,
          contraindications: suggestedData.contraindications || drug.contraindications,
          adverse_effects: suggestedData.adverse_effects || drug.adverse_effects,
          interactions: suggestedData.interactions || drug.interactions,
          withdrawal_period: suggestedData.withdrawal_period || drug.withdrawal_period,
          validation_status: "approved",
          validation_notes: "Dados completados pela IA e confirmados pelo usuário.",
        })
        .eq("id", drug.id);

      if (error) {
        toast.error("Erro ao aplicar sugestões: " + error.message);
      } else {
        toast.success("✅ Sugestões da IA aplicadas! Medicamento aprovado.");
        onReload();
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao aplicar sugestões");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className={
      drug.validation_status === "rejected" ? "border-destructive/30" :
      drug.validation_status === "needs_review" ? "border-blue-400/30" :
      drug.validation_status === "pending" ? "border-amber-400/30" : ""
    }>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {drug.name}
              {drug.is_official
                ? <Badge className="bg-primary/10 text-primary">Oficial</Badge>
                : <ValidationBadge status={drug.validation_status} />
              }
            </CardTitle>
            {drug.commercial_name && <p className="text-sm text-muted-foreground">{drug.commercial_name}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Princípio ativo:</strong> {drug.active_ingredient}
              {drug.drug_class && <> · <strong>Classe:</strong> {drug.drug_class}</>}
              {drug.species && <> · <strong>Espécies:</strong> {drug.species}</>}
            </p>
          </div>
          <div className="flex gap-1">
            {isOwner && drug.validation_status !== "approved" && !drug.is_official && (
              <Button size="icon" variant="ghost" onClick={() => onRevalidate(drug.id)} disabled={isValidating} title="Revalidar">
                <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`} />
              </Button>
            )}
            {canEdit && (
              <Button size="icon" variant="ghost" onClick={() => onEdit(drug)}><Edit className="h-4 w-4" /></Button>
            )}
            {canDelete && (
              <Button size="icon" variant="ghost" onClick={() => onDelete(drug.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {notesText && !drug.is_official && (
          <div className={`text-xs p-2 rounded-md mb-2 flex gap-2 items-start ${
            drug.validation_status === "rejected" ? "bg-destructive/5 text-destructive" :
            drug.validation_status === "approved" ? "bg-emerald-500/5 text-emerald-700" :
            drug.validation_status === "needs_review" ? "bg-blue-500/5 text-blue-700" :
            "bg-amber-500/5 text-amber-700"
          }`}>
            <Bot className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{notesText}</span>
          </div>
        )}

        {/* Show suggested data and apply button for needs_review */}
        {drug.validation_status === "needs_review" && suggestedData && isOwner && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-2 space-y-2">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              A IA preencheu campos faltantes. Revise e confirme:
            </p>
            <div className="grid gap-1 text-xs">
              {suggestedData.name && suggestedData.name !== drug.name && (
                <div><strong>Nome:</strong> <span className="text-blue-600">{drug.name}</span> → <span className="font-medium">{suggestedData.name}</span></div>
              )}
              {suggestedData.commercial_name && suggestedData.commercial_name !== (drug.commercial_name || "") && (
                <div><strong>Nome comercial:</strong> <span className="font-medium">{suggestedData.commercial_name}</span></div>
              )}
              {suggestedData.active_ingredient && suggestedData.active_ingredient !== drug.active_ingredient && (
                <div><strong>Princípio ativo:</strong> <span className="text-blue-600">{drug.active_ingredient}</span> → <span className="font-medium">{suggestedData.active_ingredient}</span></div>
              )}
              {suggestedData.drug_class && !drug.drug_class && (
                <div><strong>Classe:</strong> <span className="font-medium">{suggestedData.drug_class}</span></div>
              )}
              {suggestedData.species && !drug.species && (
                <div><strong>Espécies:</strong> <span className="font-medium">{suggestedData.species}</span></div>
              )}
              {suggestedData.indications && !drug.indications && (
                <div><strong>Indicações:</strong> <span className="font-medium">{suggestedData.indications}</span></div>
              )}
              {suggestedData.dosage && !drug.dosage && (
                <div><strong>Posologia:</strong> <span className="font-medium">{suggestedData.dosage}</span></div>
              )}
              {suggestedData.contraindications && !drug.contraindications && (
                <div><strong>Contraindicações:</strong> <span className="font-medium">{suggestedData.contraindications}</span></div>
              )}
              {suggestedData.adverse_effects && !drug.adverse_effects && (
                <div><strong>Efeitos adversos:</strong> <span className="font-medium">{suggestedData.adverse_effects}</span></div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleApplySuggestions} disabled={applying} className="text-xs">
                {applying ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Aplicando...</> : <>✅ Aceitar sugestões da IA</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(drug)} className="text-xs">
                ✏️ Editar manualmente
              </Button>
            </div>
          </div>
        )}

        <Accordion type="single" collapsible>
          <AccordionItem value="details" className="border-0">
            <AccordionTrigger className="text-xs py-2">Ver detalhes</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 text-sm">
                {drug.indications && <div><strong>Indicações:</strong> {drug.indications}</div>}
                {drug.dosage && <div><strong>Posologia:</strong> {drug.dosage}</div>}
                {drug.contraindications && <div><strong>Contraindicações:</strong> {drug.contraindications}</div>}
                {drug.adverse_effects && <div><strong>Efeitos adversos:</strong> {drug.adverse_effects}</div>}
                {drug.interactions && <div className="text-destructive"><strong>⚠ Interações:</strong> {drug.interactions}</div>}
                {drug.withdrawal_period && <div><strong>Período de carência:</strong> {drug.withdrawal_period}</div>}
                {drug.source && <div className="text-xs text-muted-foreground"><strong>Fonte:</strong> {drug.source}</div>}
                {drug.notes && <div className="text-xs text-muted-foreground"><strong>Observações:</strong> {drug.notes}</div>}
                {(drug.created_by_name || drug.updated_by_name) && (
                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    {drug.created_by_name && <span>Cadastrado por: {drug.created_by_name}</span>}
                    {drug.updated_by_name && <span> · Última edição: {drug.updated_by_name}</span>}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
