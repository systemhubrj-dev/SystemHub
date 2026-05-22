import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { softDeleteRecord } from "@/lib/softDelete";
import {
  ArrowLeft, Plus, Trash2, Stethoscope, FlaskConical, Syringe, FileText,
  StickyNote, Weight, PawPrint, Calendar, User, AlertTriangle, Download,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInYears, differenceInMonths, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClinicalAIPanel from "@/components/clinical/ClinicalAIPanel";
import { generatePrescriptionPDF } from "@/lib/prescriptionPdf";
import ClinicalEntryForm from "@/components/clinical/ClinicalEntryForm";
import ClinicalEntryView from "@/components/clinical/ClinicalEntryView";
import PetAttachments from "@/components/pet/PetAttachments";
import PetPresale from "@/components/pet/PetPresale";
import PetTerms from "@/components/pet/PetTerms";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, ShoppingCart, FileSignature } from "lucide-react";

function formatAge(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const years = differenceInYears(new Date(), birth);
  const months = differenceInMonths(new Date(), birth) % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} ano${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} ${months > 1 ? "meses" : "mês"}`);
  return parts.join(" e ") || "Recém-nascido";
}

function Section({ title, icon: Icon, children, onAdd, addLabel }: {
  title: string; icon: any; children: React.ReactNode; onAdd?: () => void; addLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
          {onAdd && (
            <Button size="sm" variant="outline" onClick={onAdd}><Plus className="h-3 w-3 mr-1" />{addLabel ?? "Adicionar"}</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type DialogType = "exam" | "vaccine" | "prescription" | "note" | "weight" | null;

export default function PetProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const effectiveUserId = clinicId ?? user?.id ?? "";
  const navigate = useNavigate();

  const [pet, setPet] = useState<any>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerData, setOwnerData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [clinicalEntries, setClinicalEntries] = useState<any[]>([]);
  const [treatmentsByEntry, setTreatmentsByEntry] = useState<Record<string, any[]>>({});
  const [exams, setExams] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [showClinicalForm, setShowClinicalForm] = useState(false);
  const [petPhotoUrl, setPetPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pet?.photo_url) { setPetPhotoUrl(null); return; }
    if (pet.photo_url.startsWith("http")) { setPetPhotoUrl(pet.photo_url); return; }
    supabase.storage.from("pet-attachments").createSignedUrl(pet.photo_url, 3600).then(({ data }) => {
      setPetPhotoUrl(data?.signedUrl ?? null);
    });
  }, [pet?.photo_url]);

  // Form states
  const [examForm, setExamForm] = useState({ date: new Date().toISOString().slice(0, 16), exam_type: "", result: "", observations: "" });
  const [vaccineForm, setVaccineForm] = useState({ vaccine_name: "", application_date: new Date().toISOString().slice(0, 10), next_dose_date: "", batch: "", observations: "" });
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    date: new Date().toISOString().slice(0, 10), prescription: "", dosage: "", observations: "",
    route: "", form: "", prescription_type: "normal" as "normal" | "sipeagro", show_date: true, sipeagro_number: "",
    medications: [] as Array<{ name: string; quantity: string; unit: string; route: string; form: string; dosage: string }>,
  });
  const [noteForm, setNoteForm] = useState({ content: "" });
  const [weightForm, setWeightForm] = useState({ date: new Date().toISOString().slice(0, 10), weight: "" });

  const loadAll = async () => {
    if (!user || !id) return;
    const [petRes, ceRes, exRes, vaRes, prRes, noRes, weRes, profileRes, attRes] = await Promise.all([
      supabase.from("pets" as any).select("*").eq("id", id).eq("user_id", effectiveUserId).single(),
      supabase.from("clinical_entries" as any).select("*").eq("pet_id", id).eq("user_id", effectiveUserId).order("entry_date", { ascending: false }),
      supabase.from("pet_exams" as any).select("*").eq("pet_id", id).eq("user_id", effectiveUserId).order("date", { ascending: false }),
      supabase.from("pet_vaccines" as any).select("*").eq("pet_id", id).eq("user_id", effectiveUserId).order("application_date", { ascending: false }),
      supabase.from("prescriptions" as any).select("*").eq("pet_id", id).eq("user_id", effectiveUserId).order("date", { ascending: false }),
      supabase.from("pet_notes" as any).select("*").eq("pet_id", id).eq("user_id", effectiveUserId).order("created_at", { ascending: false }),
      supabase.from("pet_weights" as any).select("*").eq("pet_id", id).eq("user_id", effectiveUserId).order("date", { ascending: false }),
      supabase.from("profiles").select("*").eq("user_id", effectiveUserId).maybeSingle(),
      supabase.from("pet_attachments" as any).select("*").eq("pet_id", id).eq("user_id", effectiveUserId).order("created_at", { ascending: false }),
    ]);
    setProfile(profileRes.data);
    if (petRes.data) {
      const petData = petRes.data as any;
      setPet(petData);
      if (petData.client_id) {
        const { data: client } = await supabase.from("clients").select("*").eq("id", petData.client_id).single();
        setOwnerName(client ? `${client.name}${client.phone ? ` — ${client.phone}` : ""}` : "");
        setOwnerData(client);
      }
    }
    const entries = (ceRes.data as any[]) ?? [];
    setClinicalEntries(entries);

    // Load treatments for all entries
    if (entries.length > 0) {
      const entryIds = entries.map((e: any) => e.id);
      const { data: allTreatments } = await supabase
        .from("treatment_items" as any)
        .select("*")
        .in("clinical_entry_id", entryIds);
      const grouped: Record<string, any[]> = {};
      (allTreatments as any[] || []).forEach((t: any) => {
        if (!grouped[t.clinical_entry_id]) grouped[t.clinical_entry_id] = [];
        grouped[t.clinical_entry_id].push(t);
      });
      setTreatmentsByEntry(grouped);
    } else {
      setTreatmentsByEntry({});
    }

    setExams((exRes.data as any[]) ?? []);
    setVaccines((vaRes.data as any[]) ?? []);
    setPrescriptions((prRes.data as any[]) ?? []);
    setNotes((noRes.data as any[]) ?? []);
    setWeights((weRes.data as any[]) ?? []);
    setAttachments((attRes.data as any[]) ?? []);
  };

  useEffect(() => { loadAll(); }, [user, id]);

  const saveRecord = async (table: string, data: any) => {
    if (!user || !id) return;
    const { error } = await supabase.from(table as any).insert({ ...data, user_id: effectiveUserId, pet_id: id });
    if (error) { toast.error("Erro: " + error.message); return false; }
    toast.success("Registro adicionado!");
    return true;
  };

  const [deleteTarget, setDeleteTarget] = useState<{ table: string; id: string; label: string; data: Record<string, unknown> } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = async (table: string, recordId: string, label: string) => {
    // Buscar dados completos para backup
    const { data } = await supabase.from(table as never).select("*").eq("id", recordId).maybeSingle();
    setDeleteTarget({ table, id: recordId, label, data: (data ?? { id: recordId }) as Record<string, unknown> });
  };

  const confirmDeleteRecord = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    const { error } = await softDeleteRecord({
      table: deleteTarget.table,
      recordId: deleteTarget.id,
      recordData: deleteTarget.data,
      userId: effectiveUserId,
      reason: `Exclusão manual: ${deleteTarget.label}`,
    });
    setDeleting(false);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Movido para a lixeira (60 dias)."); setDeleteTarget(null); loadAll(); }
  };

  const handleSaveExam = async () => {
    if (!examForm.exam_type.trim()) { toast.error("Tipo de exame é obrigatório"); return; }
    if (await saveRecord("pet_exams", { date: examForm.date, exam_type: examForm.exam_type, result: examForm.result || null, observations: examForm.observations || null })) {
      setActiveDialog(null);
      setExamForm({ date: new Date().toISOString().slice(0, 16), exam_type: "", result: "", observations: "" });
      loadAll();
    }
  };

  const handleSaveVaccine = async () => {
    if (!vaccineForm.vaccine_name.trim()) { toast.error("Nome da vacina é obrigatório"); return; }
    if (await saveRecord("pet_vaccines", { vaccine_name: vaccineForm.vaccine_name, application_date: vaccineForm.application_date, next_dose_date: vaccineForm.next_dose_date || null, batch: vaccineForm.batch || null, observations: vaccineForm.observations || null })) {
      setActiveDialog(null);
      setVaccineForm({ vaccine_name: "", application_date: new Date().toISOString().slice(0, 10), next_dose_date: "", batch: "", observations: "" });
      loadAll();
    }
  };

  const defaultPrescriptionForm = {
    date: new Date().toISOString().slice(0, 10), prescription: "", dosage: "", observations: "",
    route: "", form: "", prescription_type: "normal" as "normal" | "sipeagro", show_date: true, sipeagro_number: "",
    medications: [] as Array<{ name: string; quantity: string; unit: string; route: string; form: string; dosage: string }>,
  };

  const handleSavePrescription = async () => {
    const hasMeds = prescriptionForm.medications.length > 0 && prescriptionForm.medications.some(m => m.name.trim());
    if (!hasMeds && !prescriptionForm.prescription.trim()) {
      toast.error("Adicione ao menos um medicamento");
      return;
    }
    if (prescriptionForm.prescription_type === "sipeagro" && !prescriptionForm.sipeagro_number.trim()) {
      toast.error("Número SIPEAGRO é obrigatório"); return;
    }
    const validMeds = prescriptionForm.medications.filter(m => m.name.trim());
    const fallbackText = validMeds.length > 0
      ? validMeds.map(m => `${m.name}${m.quantity ? ` — ${m.quantity}${m.unit ? " " + m.unit : ""}` : ""}`).join("\n")
      : prescriptionForm.prescription;

    const payload = {
      date: prescriptionForm.date,
      prescription: fallbackText,
      dosage: prescriptionForm.dosage || null,
      observations: prescriptionForm.observations || null,
      route: prescriptionForm.route || null,
      form: prescriptionForm.form || null,
      prescription_type: prescriptionForm.prescription_type,
      show_date: prescriptionForm.show_date,
      sipeagro_number: prescriptionForm.sipeagro_number || null,
      medications: validMeds,
    };

    if (editingPrescriptionId) {
      const { error } = await supabase.from("prescriptions" as any).update(payload).eq("id", editingPrescriptionId);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("Receita atualizada!");
    } else {
      if (!(await saveRecord("prescriptions", payload))) return;
    }
    setActiveDialog(null);
    setEditingPrescriptionId(null);
    setPrescriptionForm({ ...defaultPrescriptionForm });
    loadAll();
  };

  const handleEditPrescription = (p: any) => {
    setEditingPrescriptionId(p.id);
    setPrescriptionForm({
      date: p.date || new Date().toISOString().slice(0, 10),
      prescription: p.prescription || "",
      dosage: p.dosage || "",
      observations: p.observations || "",
      route: p.route || "",
      form: p.form || "",
      prescription_type: p.prescription_type || "normal",
      show_date: p.show_date ?? true,
      sipeagro_number: p.sipeagro_number || "",
      medications: Array.isArray(p.medications) ? p.medications : [],
    });
    setActiveDialog("prescription");
  };

  const addMedication = () => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: [...prev.medications, { name: "", quantity: "", unit: "comp.", route: "Oral", form: "Comprimido", dosage: "" }],
    }));
  };
  const updateMedication = (idx: number, patch: Partial<{ name: string; quantity: string; unit: string; route: string; form: string; dosage: string }>) => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.map((m, i) => i === idx ? { ...m, ...patch } : m),
    }));
  };
  const removeMedication = (idx: number) => {
    setPrescriptionForm(prev => ({ ...prev, medications: prev.medications.filter((_, i) => i !== idx) }));
  };

  const handleDownloadPrescription = (p: any) => {
    const age = pet?.birth_date ? formatAge(pet.birth_date) || "N/I" : "N/I";
    const lastWeight = weights.length > 0 ? String(weights[0].weight) : "";
    void generatePrescriptionPDF({
      vet_name: profile?.display_name || "Não informado",
      vet_crmv: profile?.crmv || "Não informado",
      business_name: profile?.business_name || "",
      business_address: profile?.business_address || "",
      business_phone: profile?.business_phone || "",
      business_cnpj: (profile as any)?.business_cnpj || "",
      logo_url: (profile as any)?.logo_url || null,
      pet_name: pet?.name || "",
      pet_species: pet?.species || "",
      pet_breed: pet?.breed || "",
      pet_sex: pet?.sex || "",
      pet_age: age,
      pet_weight: lastWeight,
      client_name: ownerData?.name || "",
      client_cpf: ownerData?.cpf || "",
      client_phone: ownerData?.phone || "",
      client_address: ownerData?.address || "",
      prescription: p.prescription || "",
      dosage: p.dosage || "",
      route: p.route || "",
      form: p.form || "",
      medications: Array.isArray(p.medications) ? p.medications : [],
      observations: p.observations || "",
      date: p.date ? format(new Date(p.date), "dd/MM/yyyy") : "",
      show_date: p.show_date ?? true,
      prescription_type: p.prescription_type || "normal",
      sipeagro_number: p.sipeagro_number || "",
    });
  };

  const handleSaveNote = async () => {
    if (!noteForm.content.trim()) { toast.error("Conteúdo é obrigatório"); return; }
    if (await saveRecord("pet_notes", { content: noteForm.content })) {
      setActiveDialog(null);
      setNoteForm({ content: "" });
      loadAll();
    }
  };

  const handleSaveWeight = async () => {
    if (!weightForm.weight) { toast.error("Peso é obrigatório"); return; }
    if (await saveRecord("pet_weights", { date: weightForm.date, weight: parseFloat(weightForm.weight) })) {
      setActiveDialog(null);
      setWeightForm({ date: new Date().toISOString().slice(0, 10), weight: "" });
      loadAll();
    }
  };

  const generateRxFromEntry = (entryId: string) => {
    const treatments = treatmentsByEntry[entryId] || [];
    if (treatments.length === 0) {
      toast.error("Nenhum medicamento no plano terapêutico");
      return;
    }
    const rxText = treatments.map((t: any) => {
      let line = t.medication_name;
      if (t.dose) line += ` ${t.dose} ${t.dose_unit}`;
      return line;
    }).join("\n");

    const dosageText = treatments.map((t: any) => {
      const parts = [];
      if (t.dose) parts.push(`${t.dose} ${t.dose_unit}`);
      if (t.route) parts.push(`via ${t.route}`);
      if (t.frequency) parts.push(`a cada ${t.frequency}`);
      if (t.duration_days) parts.push(`por ${t.duration_days} dias`);
      return `${t.medication_name}: ${parts.join(", ")}`;
    }).join("\n");

    setPrescriptionForm({
      ...defaultPrescriptionForm,
      prescription: rxText,
      dosage: dosageText,
      route: treatments[0]?.route || "",
    });
    setActiveDialog("prescription");
  };

  if (!pet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const fmtDate = (d: string | null) => d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";
  const fmtDateTime = (d: string | null) => d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/animais")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary" title="Ampliar foto">
              <Avatar className="h-14 w-14 cursor-pointer hover:opacity-80 transition-opacity">
                {petPhotoUrl ? <AvatarImage src={petPhotoUrl} alt={pet.name} /> : null}
                <AvatarFallback className="text-xl"><PawPrint className="h-7 w-7 text-muted-foreground" /></AvatarFallback>
              </Avatar>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-2 bg-background">
            <DialogHeader className="px-2 pt-1">
              <DialogTitle className="text-sm">{pet.name}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center bg-muted/30 rounded-md min-h-[300px] max-h-[80vh] overflow-hidden">
              {petPhotoUrl ? (
                <img src={petPhotoUrl} alt={pet.name} className="max-h-[80vh] max-w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                  <PawPrint className="h-16 w-16" />
                  <p className="text-sm">Nenhuma foto cadastrada</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {pet.name}
          </h1>
          {pet.species && <p className="text-muted-foreground text-sm">{[pet.species, pet.breed].filter(Boolean).join(" — ")}</p>}
        </div>
      </div>

      {/* Pet Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados do animal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Espécie:</span> <strong>{pet.species ?? "—"}</strong></div>
            <div><span className="text-muted-foreground">Raça:</span> <strong>{pet.breed ?? "—"}</strong></div>
            <div><span className="text-muted-foreground">Pelagem:</span> <strong>{pet.coat ?? "—"}</strong></div>
            <div><span className="text-muted-foreground">Cor:</span> <strong>{pet.color ?? "—"}</strong></div>
            <div><span className="text-muted-foreground">Sexo:</span> <strong>{pet.sex ?? "—"}</strong></div>
            <div><span className="text-muted-foreground">Nascimento:</span> <strong>{fmtDate(pet.birth_date)}{pet.birth_date ? ` (${formatAge(pet.birth_date)})` : ""}</strong></div>
            <div><span className="text-muted-foreground">Castrado:</span> <strong>{pet.neutered ? "Sim" : "Não"}</strong></div>
            <div><span className="text-muted-foreground">Microchip:</span> <strong>{pet.microchip ?? "—"}</strong></div>
          </div>
          {pet.restrictions && (
            <div className="mt-3 text-sm"><span className="text-muted-foreground">Restrições:</span> <strong>{pet.restrictions}</strong></div>
          )}
          {ownerName && (
            <>
              <Separator className="my-3" />
              <div className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Proprietário:</span> <strong>{ownerName}</strong></div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clinical AI Panel */}
      <ClinicalAIPanel
        petData={{
          species: pet.species || undefined,
          breed: pet.breed || undefined,
          age: pet.birth_date ? formatAge(pet.birth_date) || undefined : undefined,
          sex: pet.sex || undefined,
          neutered: pet.neutered ?? false,
          weight: weights.length > 0 ? weights[0].weight : undefined,
          restrictions: pet.restrictions || undefined,
        }}
        clinicalHistory={clinicalEntries.slice(0, 5).map((r: any) =>
          `${fmtDate(r.entry_date)}: ${r.diagnosis || ""} - ${r.chief_complaint || ""}`
        ).join("\n")}
      />

      {/* PRONTUÁRIO CLÍNICO - New Clinical Entries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Prontuário Clínico
            </CardTitle>
            {!showClinicalForm && (
              <Button size="sm" variant="default" onClick={() => setShowClinicalForm(true)}>
                <Plus className="h-3 w-3 mr-1" /> Novo Atendimento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showClinicalForm && (
            <div className="mb-4">
              <ClinicalEntryForm
                petId={id!}
                clientId={pet.client_id}
                onSaved={() => { setShowClinicalForm(false); loadAll(); }}
                onCancel={() => setShowClinicalForm(false)}
              />
            </div>
          )}
          {clinicalEntries.length === 0 && !showClinicalForm ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendimento registrado</p>
          ) : (
            <div className="space-y-2">
              {clinicalEntries.map((entry) => (
                <ClinicalEntryView
                  key={entry.id}
                  entry={entry}
                  treatments={treatmentsByEntry[entry.id] || []}
                  onGenerateRx={() => generateRxFromEntry(entry.id)}
                  onDelete={() => requestDelete("clinical_entries", entry.id, "este atendimento clínico")}
                  pet={pet}
                  owner={ownerData}
                  clinic={profile}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight History */}
        <Section title="Histórico de pesos" icon={Weight} onAdd={() => setActiveDialog("weight")} addLabel="Peso">
          {weights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum peso registrado</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Peso (kg)</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {weights.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">{fmtDate(w.date)}</TableCell>
                    <TableCell className="text-sm font-medium">{w.weight}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => requestDelete("pet_weights", w.id, `o registro de peso ${w.weight}kg`)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        {/* Vaccines */}
        <Section title="Vacinas" icon={Syringe} onAdd={() => setActiveDialog("vaccine")} addLabel="Vacina">
          {vaccines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma vacina cadastrada</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vacina</TableHead><TableHead className="hidden md:table-cell">Próx. Dose</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {vaccines.map((v) => {
                  const isOverdue = v.next_dose_date && isBefore(new Date(v.next_dose_date), new Date());
                  return (
                    <TableRow key={v.id} className={isOverdue ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                      <TableCell className="text-sm">{fmtDate(v.application_date)}</TableCell>
                      <TableCell className="text-sm font-medium flex items-center gap-1">
                        {v.vaccine_name}
                        {isOverdue && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                      </TableCell>
                      <TableCell className={`hidden md:table-cell text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                        {fmtDate(v.next_dose_date)}
                        {isOverdue && " (atrasada)"}
                      </TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => requestDelete("pet_vaccines", v.id, `a vacina "${v.vaccine_name}"`)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Section>

        {/* Exams */}
        <Section title="Exames" icon={FlaskConical} onAdd={() => setActiveDialog("exam")} addLabel="Exame">
          {exams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum exame cadastrado</p>
          ) : (
            <div className="space-y-3">
              {exams.map((e) => (
                <div key={e.id} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs"><Calendar className="h-3 w-3 mr-1" />{fmtDateTime(e.date)}</Badge>
                      <strong>{e.exam_type}</strong>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => requestDelete("pet_exams", e.id, `o exame "${e.exam_type}"`)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  {e.result && <div><span className="text-muted-foreground">Resultado:</span> {e.result}</div>}
                  {e.observations && <div><span className="text-muted-foreground">Obs:</span> {e.observations}</div>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Prescriptions */}
        <Section title="Receitas" icon={FileText} onAdd={() => setActiveDialog("prescription")} addLabel="Receita">
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma receita cadastrada</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Prescrição</TableHead><TableHead className="hidden md:table-cell">Posologia</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
              <TableBody>
                {prescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{fmtDate(p.date)}</TableCell>
                    <TableCell className="text-sm font-medium whitespace-pre-line">{p.prescription}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm whitespace-pre-line">{p.dosage ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => handleEditPrescription(p)}>
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Gerar PDF" onClick={() => handleDownloadPrescription(p)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => requestDelete("prescriptions", p.id, "esta receita")}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        {/* Notes */}
        <Section title="Notas e observações" icon={StickyNote} onAdd={() => setActiveDialog("note")} addLabel="Nota">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota cadastrada</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="border rounded-lg p-3 text-sm flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{fmtDateTime(n.created_at)}</p>
                    <p>{n.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => requestDelete("pet_notes", n.id, "esta anotação")}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Documentos e Anexos */}
      <Section title="Documentos e Anexos" icon={Paperclip}>
        <PetAttachments petId={id!} attachments={attachments} onRefresh={loadAll} />
      </Section>

      {/* Pré-vendas */}
      <Section title="Pré-vendas / Comanda" icon={ShoppingCart}>
        <PetPresale petId={id!} clientId={pet?.client_id || null} />
      </Section>

      {/* Termos veterinários */}
      <Section title="Termos e Documentos" icon={FileSignature}>
        <PetTerms pet={pet} owner={ownerData} profile={profile} />
      </Section>

      {/* Dialogs */}
      <Dialog open={activeDialog === "exam"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Adicionar exame</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Data/Hora</Label><Input type="datetime-local" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tipo de exame *</Label><Input value={examForm.exam_type} onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })} placeholder="Ex: Hemograma, Raio-X" /></div>
            <div className="space-y-2"><Label>Resultado</Label><Textarea value={examForm.result} onChange={(e) => setExamForm({ ...examForm, result: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={examForm.observations} onChange={(e) => setExamForm({ ...examForm, observations: e.target.value })} /></div>
            <Button onClick={handleSaveExam} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "vaccine"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Adicionar vacina</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Nome da vacina *</Label><Input value={vaccineForm.vaccine_name} onChange={(e) => setVaccineForm({ ...vaccineForm, vaccine_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data aplicação</Label><Input type="date" value={vaccineForm.application_date} onChange={(e) => setVaccineForm({ ...vaccineForm, application_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Próxima dose</Label><Input type="date" value={vaccineForm.next_dose_date} onChange={(e) => setVaccineForm({ ...vaccineForm, next_dose_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Lote</Label><Input value={vaccineForm.batch} onChange={(e) => setVaccineForm({ ...vaccineForm, batch: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={vaccineForm.observations} onChange={(e) => setVaccineForm({ ...vaccineForm, observations: e.target.value })} /></div>
            <Button onClick={handleSaveVaccine} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "prescription"} onOpenChange={(o) => {
        if (!o) {
          setActiveDialog(null);
          setEditingPrescriptionId(null);
          setPrescriptionForm({ ...defaultPrescriptionForm });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPrescriptionId ? "Editar receita" : "Adicionar receita"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de receita</Label>
                <Select value={prescriptionForm.prescription_type} onValueChange={(v: "normal" | "sipeagro") => setPrescriptionForm({ ...prescriptionForm, prescription_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Receita Normal</SelectItem>
                    <SelectItem value="sipeagro">Receita SIPEAGRO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={prescriptionForm.date} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, date: e.target.value })} /></div>
            </div>

            {prescriptionForm.prescription_type === "sipeagro" && (
              <div className="space-y-2">
                <Label>Número SIPEAGRO *</Label>
                <Input value={prescriptionForm.sipeagro_number} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, sipeagro_number: e.target.value })} placeholder="Ex: 12345" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox id="show_date" checked={prescriptionForm.show_date} onCheckedChange={(v) => setPrescriptionForm({ ...prescriptionForm, show_date: !!v })} />
              <Label htmlFor="show_date" className="text-sm font-normal">Exibir data no PDF</Label>
            </div>

            {/* Medications list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Medicamentos</Label>
                <Button type="button" size="sm" variant="outline" onClick={addMedication}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar medicamento
                </Button>
              </div>

              {prescriptionForm.medications.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
                  Nenhum medicamento adicionado. Clique em "Adicionar medicamento".
                </p>
              )}

              {prescriptionForm.medications.map((med, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Medicamento {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMedication(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input value={med.name} onChange={(e) => updateMedication(idx, { name: e.target.value })} placeholder="Ex: Amoxicilina 500mg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Via de administração</Label>
                      <Select value={med.route} onValueChange={(v) => updateMedication(idx, { route: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Oral">Oral</SelectItem>
                          <SelectItem value="Intravenosa">Intravenosa (IV)</SelectItem>
                          <SelectItem value="Intramuscular">Intramuscular (IM)</SelectItem>
                          <SelectItem value="Subcutânea">Subcutânea (SC)</SelectItem>
                          <SelectItem value="Tópica">Tópica</SelectItem>
                          <SelectItem value="Oftálmica">Oftálmica</SelectItem>
                          <SelectItem value="Otológica">Otológica</SelectItem>
                          <SelectItem value="Retal">Retal</SelectItem>
                          <SelectItem value="Inalatória">Inalatória</SelectItem>
                          <SelectItem value="Transdérmica">Transdérmica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Forma farmacêutica</Label>
                      <Select value={med.form} onValueChange={(v) => updateMedication(idx, { form: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Comprimido">Comprimido</SelectItem>
                          <SelectItem value="Cápsula">Cápsula</SelectItem>
                          <SelectItem value="Solução oral">Solução oral</SelectItem>
                          <SelectItem value="Suspensão oral">Suspensão oral</SelectItem>
                          <SelectItem value="Solução injetável">Solução injetável</SelectItem>
                          <SelectItem value="Pomada">Pomada</SelectItem>
                          <SelectItem value="Creme">Creme</SelectItem>
                          <SelectItem value="Gel">Gel</SelectItem>
                          <SelectItem value="Colírio">Colírio</SelectItem>
                          <SelectItem value="Spray">Spray</SelectItem>
                          <SelectItem value="Pó">Pó</SelectItem>
                          <SelectItem value="Xarope">Xarope</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input value={med.quantity} onChange={(e) => updateMedication(idx, { quantity: e.target.value })} placeholder="Ex: 30" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unidade</Label>
                      <Input value={med.unit} onChange={(e) => updateMedication(idx, { unit: e.target.value })} placeholder="comp., ml, frasco..." />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Posologia</Label>
                      <Textarea value={med.dosage} onChange={(e) => updateMedication(idx, { dosage: e.target.value })} placeholder="Ex: 1 comprimido a cada 12h por 7 dias" rows={2} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2"><Label>Observações gerais</Label><Textarea value={prescriptionForm.observations} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, observations: e.target.value })} /></div>
            <Button onClick={handleSavePrescription} className="w-full">{editingPrescriptionId ? "Atualizar receita" : "Salvar receita"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "note"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Adicionar nota</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Conteúdo *</Label><Textarea value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} rows={4} /></div>
            <Button onClick={handleSaveNote} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "weight"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Adicionar peso</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Peso (kg) *</Label><Input type="number" step="0.01" value={weightForm.weight} onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })} /></div>
            </div>
            <Button onClick={handleSaveWeight} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={confirmDeleteRecord}
        loading={deleting}
        itemLabel={deleteTarget?.label ?? "este registro"}
      />
    </div>
  );
}
