import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown, ChevronRight, MessageCircle, ClipboardList,
  Activity, Stethoscope, Search, Pill, TrendingUp,
  StickyNote, Plus, Trash2, Save, X,
} from "lucide-react";
import { ANAMNESIS_SYSTEMS, type AnamnesisSystem } from "@/lib/anamnesisSystems";

const COMPLAINT_TAGS = [
  "Vômito", "Diarreia", "Apatia", "Falta de apetite", "Dor",
  "Retorno", "Vacinação", "Check-up", "Tosse", "Espirro",
  "Claudicação", "Prurido", "Secreção ocular", "Secreção nasal",
  "Convulsão", "Febre", "Emagrecimento", "Inchaço",
];

interface TreatmentItem {
  medication_name: string;
  dose: string;
  dose_unit: string;
  route: string;
  frequency: string;
  duration_days: string;
  notes: string;
}

const emptyTreatment: TreatmentItem = {
  medication_name: "", dose: "", dose_unit: "mg",
  route: "Oral", frequency: "", duration_days: "", notes: "",
};

interface PhysicalExam {
  general_condition: string;
  hydration: string;
  mucous_membranes: string;
  lymph_nodes: string;
  pain_on_palpation: string;
  physical_exam_notes: string;
}

interface ClinicalEntryFormProps {
  petId: string;
  clientId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

function SectionToggle({ title, icon: Icon, open, onToggle, children, color }: {
  title: string; icon: any; open: boolean; onToggle: () => void; children: React.ReactNode; color?: string;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Icon className={`h-4 w-4 ${color || "text-primary"}`} />
          <span className="font-medium text-sm">{title}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function RadioRow({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Badge
            key={opt}
            variant={value === opt ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onChange(value === opt ? "" : opt)}
          >
            {opt}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function ClinicalEntryForm({ petId, clientId, onSaved, onCancel }: ClinicalEntryFormProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Section open states
  const [openSections, setOpenSections] = useState({
    complaint: true, anamnesis: true, vitals: true,
    exam: false, diagnosis: false, treatment: false,
    prognosis: false, notes: false,
  });
  const toggle = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Form data
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 16));
  const [vetName, setVetName] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [complaintTags, setComplaintTags] = useState<string[]>([]);

  // Systems-based anamnesis
  const [anamnesisSystems, setAnamnesisSystems] = useState<AnamnesisSystem[]>(
    JSON.parse(JSON.stringify(ANAMNESIS_SYSTEMS))
  );
  const [anamnesisNotes, setAnamnesisNotes] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [openSystemIndex, setOpenSystemIndex] = useState<number | null>(null);

  const toggleSymptom = (sysIdx: number, symIdx: number) => {
    setAnamnesisSystems(prev => {
      const updated = [...prev];
      updated[sysIdx] = { ...updated[sysIdx], symptoms: [...updated[sysIdx].symptoms] };
      updated[sysIdx].symptoms[symIdx] = {
        ...updated[sysIdx].symptoms[symIdx],
        checked: !updated[sysIdx].symptoms[symIdx].checked,
      };
      return updated;
    });
  };

  const setSymptomDate = (sysIdx: number, symIdx: number, date: string) => {
    setAnamnesisSystems(prev => {
      const updated = [...prev];
      updated[sysIdx] = { ...updated[sysIdx], symptoms: [...updated[sysIdx].symptoms] };
      updated[sysIdx].symptoms[symIdx] = {
        ...updated[sysIdx].symptoms[symIdx],
        startDate: date,
      };
      return updated;
    });
  };

  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [crt, setCrt] = useState("");

  const [physicalExam, setPhysicalExam] = useState<PhysicalExam>({
    general_condition: "", hydration: "", mucous_membranes: "",
    lymph_nodes: "", pain_on_palpation: "", physical_exam_notes: "",
  });

  const [diagnosis, setDiagnosis] = useState("");
  const [diffDiagnosis, setDiffDiagnosis] = useState("");
  const [prognosis, setPrognosis] = useState("");
  const [prognosisNotes, setPrognosisNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);

  const toggleTag = (tag: string) => {
    setComplaintTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addTreatment = () => setTreatments((prev) => [...prev, { ...emptyTreatment }]);
  const removeTreatment = (i: number) => setTreatments((prev) => prev.filter((_, idx) => idx !== i));
  const updateTreatment = (i: number, field: keyof TreatmentItem, value: string) => {
    setTreatments((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: entry, error } = await supabase
        .from("clinical_entries" as any)
        .insert({
          user_id: user.id,
          pet_id: petId,
          client_id: clientId || null,
          entry_date: entryDate,
          vet_name: vetName || null,
          chief_complaint: chiefComplaint || null,
          complaint_tags: complaintTags,
          anamnesis: {
            systems: anamnesisSystems,
            notes: anamnesisNotes,
            medical_history: medicalHistory,
            current_medications: currentMedications,
          } as any,
          weight: weight ? parseFloat(weight) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
          capillary_refill_time: crt || null,
          physical_exam: physicalExam as any,
          diagnosis: diagnosis || null,
          differential_diagnosis: diffDiagnosis || null,
          prognosis: prognosis || null,
          prognosis_notes: prognosisNotes || null,
          general_notes: generalNotes || null,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Save treatment items
      if (treatments.length > 0 && entry) {
        const items = treatments
          .filter((t) => t.medication_name.trim())
          .map((t) => ({
            user_id: user.id,
            clinical_entry_id: (entry as any).id,
            medication_name: t.medication_name,
            dose: t.dose ? parseFloat(t.dose) : null,
            dose_unit: t.dose_unit || "mg",
            route: t.route || "Oral",
            frequency: t.frequency || null,
            duration_days: t.duration_days ? parseInt(t.duration_days) : null,
            notes: t.notes || null,
          }));
        if (items.length > 0) {
          const { error: tError } = await supabase
            .from("treatment_items" as any)
            .insert(items as any);
          if (tError) console.error("Error saving treatments:", tError);
        }
      }

      // Also save weight to pet_weights if provided
      if (weight) {
        await supabase.from("pet_weights" as any).insert({
          user_id: user.id,
          pet_id: petId,
          date: new Date(entryDate).toISOString().slice(0, 10),
          weight: parseFloat(weight),
        } as any);
      }

      toast.success("Atendimento registrado com sucesso!");
      onSaved();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Novo Atendimento Clínico
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="space-y-1">
            <Label className="text-xs">Data/Hora</Label>
            <Input type="datetime-local" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Veterinário responsável</Label>
            <Input value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Dr(a)..." className="h-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* 1. Queixa Principal */}
        <SectionToggle title="Queixa Principal / Motivo" icon={MessageCircle} open={openSections.complaint} onToggle={() => toggle("complaint")}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {COMPLAINT_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={complaintTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <Textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Descreva a queixa principal..."
              rows={2}
            />
          </div>
        </SectionToggle>

        <Separator />

        {/* 2. Anamnese por Sistemas */}
        <SectionToggle title="Anamnese" icon={ClipboardList} open={openSections.anamnesis} onToggle={() => toggle("anamnesis")}>
          <div className="space-y-2">
            {anamnesisSystems.map((system, sysIdx) => {
              const checkedCount = system.symptoms.filter(s => s.checked).length;
              return (
                <Collapsible
                  key={system.key}
                  open={openSystemIndex === sysIdx}
                  onOpenChange={() => setOpenSystemIndex(openSystemIndex === sysIdx ? null : sysIdx)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left border-l-2 border-primary/20 hover:border-primary/50">
                      <span className="text-sm font-medium">{system.label}</span>
                      {checkedCount > 0 && (
                        <Badge variant="default" className="text-[10px] h-5">{checkedCount}</Badge>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {system.symptoms.map((sym, symIdx) => (
                        <div key={sym.key} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${system.key}-${sym.key}`}
                              checked={sym.checked}
                              onCheckedChange={() => toggleSymptom(sysIdx, symIdx)}
                            />
                            <Label htmlFor={`${system.key}-${sym.key}`} className="text-xs font-normal cursor-pointer">
                              {sym.label}
                            </Label>
                          </div>
                          {sym.checked && (
                            <div className="ml-6">
                              <Label className="text-[10px] text-muted-foreground">Data de início</Label>
                              <Input
                                type="date"
                                value={sym.startDate || ""}
                                onChange={(e) => setSymptomDate(sysIdx, symIdx, e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            <Separator className="my-2" />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Histórico médico relevante</Label>
              <Textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} rows={2} placeholder="Doenças prévias, cirurgias..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Medicações em uso</Label>
              <Textarea value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} rows={2} placeholder="Medicamentos atuais..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Observações adicionais</Label>
              <div className="flex items-center gap-2 mb-1">
                <Checkbox id="nda-anamnesis" checked={anamnesisNotes === "Nada digno de nota"} onCheckedChange={(c) => setAnamnesisNotes(c ? "Nada digno de nota" : "")} />
                <Label htmlFor="nda-anamnesis" className="text-xs cursor-pointer">NDA</Label>
              </div>
              <Textarea value={anamnesisNotes} onChange={(e) => setAnamnesisNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </SectionToggle>

        <Separator />

        {/* 3. Parâmetros Vitais */}
        <SectionToggle title="Parâmetros Vitais" icon={Activity} open={openSections.vitals} onToggle={() => toggle("vitals")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
              <Input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Temperatura (°C)</Label>
              <Input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">FC (bpm)</Label>
              <Input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">FR (mpm)</Label>
              <Input type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">TPC</Label>
              <Input value={crt} onChange={(e) => setCrt(e.target.value)} placeholder="Ex: < 2s" className="h-9" />
            </div>
          </div>
        </SectionToggle>

        <Separator />

        {/* 4. Exame Físico */}
        <SectionToggle title="Exame Físico" icon={Search} open={openSections.exam} onToggle={() => toggle("exam")}>
          <div className="space-y-3">
            <RadioRow label="Estado geral" value={physicalExam.general_condition} options={["Bom", "Regular", "Ruim"]} onChange={(v) => setPhysicalExam({ ...physicalExam, general_condition: v })} />
            <RadioRow label="Hidratação" value={physicalExam.hydration} options={["Normal", "Desidratado"]} onChange={(v) => setPhysicalExam({ ...physicalExam, hydration: v })} />
            <RadioRow label="Mucosas" value={physicalExam.mucous_membranes} options={["Normais", "Pálidas", "Ictéricas", "Cianóticas"]} onChange={(v) => setPhysicalExam({ ...physicalExam, mucous_membranes: v })} />
            <RadioRow label="Linfonodos" value={physicalExam.lymph_nodes} options={["Normais", "Aumentados"]} onChange={(v) => setPhysicalExam({ ...physicalExam, lymph_nodes: v })} />
            <RadioRow label="Dor à palpação" value={physicalExam.pain_on_palpation} options={["Sim", "Não"]} onChange={(v) => setPhysicalExam({ ...physicalExam, pain_on_palpation: v })} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Alterações específicas / Observações</Label>
              <div className="flex items-center gap-2 mb-1">
                <Checkbox id="nda-exam" checked={physicalExam.physical_exam_notes === "Nada digno de nota"} onCheckedChange={(c) => setPhysicalExam({ ...physicalExam, physical_exam_notes: c ? "Nada digno de nota" : "" })} />
                <Label htmlFor="nda-exam" className="text-xs cursor-pointer">NDA</Label>
              </div>
              <Textarea value={physicalExam.physical_exam_notes} onChange={(e) => setPhysicalExam({ ...physicalExam, physical_exam_notes: e.target.value })} rows={3} placeholder="Descreva achados do exame físico..." />
            </div>
          </div>
        </SectionToggle>

        <Separator />

        {/* 5. Diagnóstico */}
        <SectionToggle title="Diagnóstico" icon={Stethoscope} open={openSections.diagnosis} onToggle={() => toggle("diagnosis")} color="text-emerald-600">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Diagnóstico principal</Label>
              <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} placeholder="Diagnóstico..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Diagnósticos diferenciais</Label>
              <Textarea value={diffDiagnosis} onChange={(e) => setDiffDiagnosis(e.target.value)} rows={2} placeholder="Diagnósticos diferenciais..." />
            </div>
          </div>
        </SectionToggle>

        <Separator />

        {/* 6. Plano Terapêutico */}
        <SectionToggle title={`Plano Terapêutico (${treatments.length})`} icon={Pill} open={openSections.treatment} onToggle={() => toggle("treatment")} color="text-blue-600">
          <div className="space-y-3">
            {treatments.map((t, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Medicamento {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeTreatment(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={t.medication_name}
                  onChange={(e) => updateTreatment(i, "medication_name", e.target.value)}
                  placeholder="Nome do medicamento"
                  className="h-8 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" step="0.01" value={t.dose} onChange={(e) => updateTreatment(i, "dose", e.target.value)} placeholder="Dose" className="h-8 text-sm" />
                  <Select value={t.dose_unit} onValueChange={(v) => updateTreatment(i, "dose_unit", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="comprimido">comprimido</SelectItem>
                      <SelectItem value="gotas">gotas</SelectItem>
                      <SelectItem value="UI">UI</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={t.route} onValueChange={(v) => updateTreatment(i, "route", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oral">Oral</SelectItem>
                      <SelectItem value="Subcutânea">SC</SelectItem>
                      <SelectItem value="Intramuscular">IM</SelectItem>
                      <SelectItem value="Intravenosa">IV</SelectItem>
                      <SelectItem value="Tópica">Tópica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={t.frequency} onChange={(e) => updateTreatment(i, "frequency", e.target.value)} placeholder="Frequência (ex: 12/12h)" className="h-8 text-sm" />
                  <Input type="number" value={t.duration_days} onChange={(e) => updateTreatment(i, "duration_days", e.target.value)} placeholder="Dias" className="h-8 text-sm" />
                </div>
                <Input value={t.notes} onChange={(e) => updateTreatment(i, "notes", e.target.value)} placeholder="Observações..." className="h-8 text-sm" />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addTreatment} className="w-full">
              <Plus className="h-3 w-3 mr-1" /> Adicionar medicamento
            </Button>
          </div>
        </SectionToggle>

        <Separator />

        {/* 7. Prognóstico */}
        <SectionToggle title="Prognóstico" icon={TrendingUp} open={openSections.prognosis} onToggle={() => toggle("prognosis")}>
          <div className="space-y-3">
            <RadioRow label="Prognóstico" value={prognosis} options={["Favorável", "Reservado", "Grave"]} onChange={setPrognosis} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Complementar</Label>
              <div className="flex items-center gap-2 mb-1">
                <Checkbox id="nda-prognosis" checked={prognosisNotes === "Nada digno de nota"} onCheckedChange={(c) => setPrognosisNotes(c ? "Nada digno de nota" : "")} />
                <Label htmlFor="nda-prognosis" className="text-xs cursor-pointer">NDA</Label>
              </div>
              <Textarea value={prognosisNotes} onChange={(e) => setPrognosisNotes(e.target.value)} rows={2} placeholder="Observações sobre o prognóstico..." />
            </div>
          </div>
        </SectionToggle>

        <Separator />

        {/* 8. Observações Gerais */}
        <SectionToggle title="Observações Gerais" icon={StickyNote} open={openSections.notes} onToggle={() => toggle("notes")}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Checkbox id="nda-general" checked={generalNotes === "Nada digno de nota"} onCheckedChange={(c) => setGeneralNotes(c ? "Nada digno de nota" : "")} />
              <Label htmlFor="nda-general" className="text-xs cursor-pointer">NDA</Label>
            </div>
            <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={3} placeholder="Notas adicionais..." />
          </div>
        </SectionToggle>

        <Separator />

        {/* Save */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Salvando..." : "Salvar Atendimento"}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
