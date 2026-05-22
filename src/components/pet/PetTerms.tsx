import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  ScrollText, FileSignature, Stethoscope, Scissors, BedDouble, FlaskConical,
  Syringe, HeartCrack, PackageOpen, GraduationCap, Ban, LogOut, Download,
  Plane, ShieldCheck, FileX2, FileSearch, ArrowRightLeft, CalendarCheck,
  ShieldPlus, MapPin,
} from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { generateVetTermPDF, TERM_LABELS, TermType } from "@/lib/vetTermsPdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  pet: any;
  owner: any;
  profile: any;
}

const TERM_ICONS: Record<TermType, any> = {
  terapeutico: Stethoscope,
  cirurgico: Scissors,
  internacao: BedDouble,
  exames: FlaskConical,
  anestesico: Syringe,
  eutanasia: HeartCrack,
  retirada_obito: PackageOpen,
  doacao_corpo: GraduationCap,
  recusa: Ban,
  retirada_sem_alta: LogOut,
  atestado_sanitario_internacional: Plane,
  atestado_sanitario: ShieldCheck,
  atestado_obito: FileX2,
  solicitacao_exames: FileSearch,
  encaminhamento: ArrowRightLeft,
  declaracao_comparecimento: CalendarCheck,
  certificado_vacinacao: ShieldPlus,
  atestado_transito: MapPin,
};

const CONSENT_ORDER: TermType[] = [
  "terapeutico", "cirurgico", "internacao", "exames", "anestesico",
  "eutanasia", "retirada_obito", "doacao_corpo", "recusa", "retirada_sem_alta",
];

const ATTEST_ORDER: TermType[] = [
  "atestado_sanitario", "atestado_sanitario_internacional", "atestado_transito",
  "atestado_obito", "certificado_vacinacao", "solicitacao_exames",
  "encaminhamento", "declaracao_comparecimento",
];

function calcAge(birth?: string | null) {
  if (!birth) return "";
  const b = new Date(birth);
  const y = differenceInYears(new Date(), b);
  const m = differenceInMonths(new Date(), b) % 12;
  const parts = [];
  if (y) parts.push(`${y} ano${y > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} ${m > 1 ? "meses" : "mês"}`);
  return parts.join(" e ") || "Recém-nascido";
}

export default function PetTerms({ pet, owner, profile }: Props) {
  const { user } = useAuth();
  const [openType, setOpenType] = useState<TermType | null>(null);
  const [fields, setFields] = useState<any>({});

  const openDialog = (type: TermType) => {
    setOpenType(type);
    setFields({
      date: format(new Date(), "dd/MM/yyyy"),
      city: owner?.city || "",
      observations: "",
      procedure: "",
      exam: "",
      cause: "",
      recused: "",
      destination: "",
      institution: "",
      diagnosis: "",
      risks: "",
      vaccine: "",
      vaccineCommercial: "",
      vaccineBatch: "",
      vaccineManufacturer: "",
      vaccineFabDate: "",
      vaccineExpDate: "",
      vaccineValidUntil: "",
      vaccineApplicationDate: "",
      deathLocation: "",
      deathTime: "",
      deathDate: "",
      deathCause: "",
      examRequest: "",
      history: "",
      clinicalSuspicion: "",
      medications: "",
      examsDone: "",
      specialistArea: "",
      attendanceFrom: "",
      attendanceTo: "",
      attendanceDate: "",
      indication: "",
      antiparasiticInternal: "",
      antiparasiticInternalLab: "",
      antiparasiticInternalDate: "",
      antiparasiticExternal: "",
      antiparasiticExternalLab: "",
      antiparasiticExternalDate: "",
    });
  };

  const handleGenerate = async () => {
    if (!openType) return;
    if (!profile?.business_name) {
      toast.warning("Configure os dados da clínica em Configurações para um cabeçalho completo.");
    }
    try {
      const clinicSnap = {
        business_name: profile?.business_name,
        business_address: profile?.business_address,
        business_phone: profile?.business_phone,
        business_cnpj: profile?.business_cnpj,
        business_ie: profile?.business_ie,
        crmv: profile?.crmv,
        display_name: profile?.display_name,
        cpf: profile?.cpf,
        logo_url: (profile as any)?.logo_url,
      };
      const petSnap = {
        name: pet?.name,
        species: pet?.species,
        breed: pet?.breed,
        sex: pet?.sex,
        coat: pet?.coat,
        color: pet?.color,
        birth_date: pet?.birth_date,
        microchip: pet?.microchip,
        age: calcAge(pet?.birth_date),
      };
      const ownerSnap = {
        name: owner?.name,
        cpf: owner?.cpf,
        phone: owner?.phone,
        email: owner?.email,
        address: [owner?.street, owner?.number, owner?.complement, owner?.neighborhood, owner?.city, owner?.state]
          .filter(Boolean).join(", ") || owner?.address,
        city: owner?.city,
        state: owner?.state,
        cep: owner?.cep,
      };

      await generateVetTermPDF(openType, clinicSnap, petSnap, ownerSnap, fields);

      // Salvar histórico em vet_documents
      if (user?.id && pet?.id) {
        const { error: insertErr } = await supabase.from("vet_documents").insert({
          user_id: user.id,
          pet_id: pet.id,
          client_id: owner?.id ?? null,
          document_type: openType,
          data: {
            label: TERM_LABELS[openType],
            fields,
            petSnapshot: petSnap,
            ownerSnapshot: ownerSnap,
            clinicSnapshot: clinicSnap,
          } as any,
        });
        if (insertErr) console.warn("Falha ao salvar histórico de documento:", insertErr);
      }

      toast.success("Documento gerado com sucesso!");
      setOpenType(null);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message);
    }
  };

  const renderSpecificFields = () => {
    if (!openType) return null;
    switch (openType) {
      case "terapeutico":
      case "cirurgico":
        return (
          <>
            <div className="space-y-2">
              <Label>Procedimento *</Label>
              <Textarea value={fields.procedure} onChange={(e) => setFields({ ...fields, procedure: e.target.value })} placeholder="Descreva o procedimento" rows={2} />
            </div>
            {openType === "cirurgico" && (
              <div className="space-y-2">
                <Label>Riscos discutidos</Label>
                <Textarea value={fields.risks} onChange={(e) => setFields({ ...fields, risks: e.target.value })} rows={2} />
              </div>
            )}
          </>
        );
      case "internacao":
        return (
          <>
            <div className="space-y-2">
              <Label>Diagnóstico/suspeita</Label>
              <Input value={fields.diagnosis} onChange={(e) => setFields({ ...fields, diagnosis: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Procedimentos previstos</Label>
              <Textarea value={fields.procedure} onChange={(e) => setFields({ ...fields, procedure: e.target.value })} rows={2} />
            </div>
          </>
        );
      case "exames":
        return (
          <div className="space-y-2">
            <Label>Exame(s) *</Label>
            <Textarea value={fields.exam} onChange={(e) => setFields({ ...fields, exam: e.target.value })} placeholder="Ex: Hemograma, Raio-X tórax" rows={2} />
          </div>
        );
      case "anestesico":
        return (
          <>
            <div className="space-y-2">
              <Label>Procedimento associado</Label>
              <Input value={fields.procedure} onChange={(e) => setFields({ ...fields, procedure: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Riscos específicos</Label>
              <Textarea value={fields.risks} onChange={(e) => setFields({ ...fields, risks: e.target.value })} rows={2} />
            </div>
          </>
        );
      case "eutanasia":
        return (
          <>
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Input value={fields.diagnosis} onChange={(e) => setFields({ ...fields, diagnosis: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Motivo/justificativa *</Label>
              <Textarea value={fields.cause} onChange={(e) => setFields({ ...fields, cause: e.target.value })} rows={2} />
            </div>
          </>
        );
      case "retirada_obito":
        return (
          <>
            <div className="space-y-2">
              <Label>Causa mortis</Label>
              <Input value={fields.cause} onChange={(e) => setFields({ ...fields, cause: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Destino do corpo *</Label>
              <Input value={fields.destination} onChange={(e) => setFields({ ...fields, destination: e.target.value })} placeholder="Ex: sepultamento residencial, cremação particular" />
            </div>
          </>
        );
      case "doacao_corpo":
        return (
          <div className="space-y-2">
            <Label>Instituição beneficiada</Label>
            <Input value={fields.institution} onChange={(e) => setFields({ ...fields, institution: e.target.value })} placeholder="Ex: Universidade XYZ — Curso de Medicina Veterinária" />
          </div>
        );
      case "recusa":
        return (
          <>
            <div className="space-y-2">
              <Label>Procedimento/exame/tratamento indicado *</Label>
              <Input value={fields.indication} onChange={(e) => setFields({ ...fields, indication: e.target.value })} placeholder='Será impresso após "estou ciente da indicação de…"' />
            </div>
            <div className="space-y-2">
              <Label>Exame/tratamento recusado (opcional, vai na 2ª folha)</Label>
              <Textarea value={fields.recused} onChange={(e) => setFields({ ...fields, recused: e.target.value })} rows={2} />
            </div>
          </>
        );
      case "retirada_sem_alta":
        return null;

      // ============ Atestados e Certificados ============
      case "atestado_sanitario":
      case "atestado_sanitario_internacional":
        return null; // Apenas dados do animal/tutor — sem campos específicos

      case "atestado_transito":
        return (
          <>
            <div className="space-y-2">
              <Label>Vacina antirrábica (nome / fabricante)</Label>
              <Input value={fields.vaccine} onChange={(e) => setFields({ ...fields, vaccine: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Lote</Label>
                <Input value={fields.vaccineBatch} onChange={(e) => setFields({ ...fields, vaccineBatch: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data vacinação</Label>
                <Input value={fields.vaccineApplicationDate} onChange={(e) => setFields({ ...fields, vaccineApplicationDate: e.target.value })} placeholder="dd/mm/aaaa" />
              </div>
              <div className="space-y-2">
                <Label>Válida até</Label>
                <Input value={fields.vaccineValidUntil} onChange={(e) => setFields({ ...fields, vaccineValidUntil: e.target.value })} placeholder="dd/mm/aaaa" />
              </div>
            </div>
          </>
        );

      case "atestado_obito":
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Localidade do óbito</Label>
                <Input value={fields.deathLocation} onChange={(e) => setFields({ ...fields, deathLocation: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input value={fields.deathTime} onChange={(e) => setFields({ ...fields, deathTime: e.target.value })} placeholder="hh:mm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data do óbito</Label>
                <Input value={fields.deathDate} onChange={(e) => setFields({ ...fields, deathDate: e.target.value })} placeholder="dd/mm/aaaa" />
              </div>
              <div className="space-y-2">
                <Label>Causa mortis *</Label>
                <Input value={fields.deathCause} onChange={(e) => setFields({ ...fields, deathCause: e.target.value })} />
              </div>
            </div>
          </>
        );

      case "solicitacao_exames":
        return (
          <>
            <div className="space-y-2">
              <Label>Exame(s) solicitado(s) *</Label>
              <Textarea value={fields.examRequest} onChange={(e) => setFields({ ...fields, examRequest: e.target.value })} rows={2} placeholder="Ex: Hemograma completo, perfil renal, ultrassonografia abdominal" />
            </div>
            <div className="space-y-2">
              <Label>Breve histórico</Label>
              <Textarea value={fields.history} onChange={(e) => setFields({ ...fields, history: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Suspeita clínica</Label>
              <Textarea value={fields.clinicalSuspicion} onChange={(e) => setFields({ ...fields, clinicalSuspicion: e.target.value })} rows={2} />
            </div>
          </>
        );

      case "encaminhamento":
        return (
          <>
            <div className="space-y-2">
              <Label>Especialista / Especialidade *</Label>
              <Input value={fields.specialistArea} onChange={(e) => setFields({ ...fields, specialistArea: e.target.value })} placeholder="Ex: Cardiologia veterinária" />
            </div>
            <div className="space-y-2">
              <Label>Exames realizados</Label>
              <Textarea value={fields.examsDone} onChange={(e) => setFields({ ...fields, examsDone: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Medicações em uso</Label>
              <Textarea value={fields.medications} onChange={(e) => setFields({ ...fields, medications: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Suspeita clínica</Label>
              <Textarea value={fields.clinicalSuspicion} onChange={(e) => setFields({ ...fields, clinicalSuspicion: e.target.value })} rows={2} />
            </div>
          </>
        );

      case "declaracao_comparecimento":
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Data atendimento</Label>
              <Input value={fields.attendanceDate} onChange={(e) => setFields({ ...fields, attendanceDate: e.target.value })} placeholder="dd/mm/aaaa" />
            </div>
            <div className="space-y-2">
              <Label>Das</Label>
              <Input value={fields.attendanceFrom} onChange={(e) => setFields({ ...fields, attendanceFrom: e.target.value })} placeholder="hh:mm" />
            </div>
            <div className="space-y-2">
              <Label>Às</Label>
              <Input value={fields.attendanceTo} onChange={(e) => setFields({ ...fields, attendanceTo: e.target.value })} placeholder="hh:mm" />
            </div>
          </div>
        );

      case "certificado_vacinacao":
        return (
          <>
            <div className="space-y-2">
              <Label>Vacinação contra *</Label>
              <Input value={fields.vaccine} onChange={(e) => setFields({ ...fields, vaccine: e.target.value })} placeholder="Ex: Raiva, V10, V8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome comercial</Label>
                <Input value={fields.vaccineCommercial} onChange={(e) => setFields({ ...fields, vaccineCommercial: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fabricante</Label>
                <Input value={fields.vaccineManufacturer} onChange={(e) => setFields({ ...fields, vaccineManufacturer: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Nº partida/lote</Label>
                <Input value={fields.vaccineBatch} onChange={(e) => setFields({ ...fields, vaccineBatch: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data fabricação</Label>
                <Input value={fields.vaccineFabDate} onChange={(e) => setFields({ ...fields, vaccineFabDate: e.target.value })} placeholder="dd/mm/aaaa" />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input value={fields.vaccineExpDate} onChange={(e) => setFields({ ...fields, vaccineExpDate: e.target.value })} placeholder="dd/mm/aaaa" />
              </div>
            </div>
          </>
        );
    }
  };

  const renderCard = (type: TermType) => {
    const Icon = TERM_ICONS[type];
    return (
      <Card
        key={type}
        onClick={() => openDialog(type)}
        className="p-3 cursor-pointer hover:border-primary hover:shadow-sm transition-all flex items-start gap-2"
      >
        <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span className="text-sm leading-tight">{TERM_LABELS[type]}</span>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gere termos, atestados e certificados pré-preenchidos com os dados do animal, tutor e clínica.
      </p>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-2">
          <FileSignature className="h-3.5 w-3.5" />
          Termos de Consentimento
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CONSENT_ORDER.map(renderCard)}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-2">
          <ScrollText className="h-3.5 w-3.5" />
          Atestados e Certificados
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ATTEST_ORDER.map(renderCard)}
        </div>
      </div>

      <Dialog open={!!openType} onOpenChange={(o) => !o && setOpenType(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              {openType && TERM_LABELS[openType]}
            </DialogTitle>
            <DialogDescription>
              Os dados do animal e do tutor serão preenchidos automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input value={fields.date || ""} onChange={(e) => setFields({ ...fields, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cidade/Local</Label>
                <Input value={fields.city || ""} onChange={(e) => setFields({ ...fields, city: e.target.value })} placeholder="Cidade" />
              </div>
            </div>

            {renderSpecificFields()}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={fields.observations || ""} onChange={(e) => setFields({ ...fields, observations: e.target.value })} rows={2} />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <p><strong>Animal:</strong> {pet?.name} {pet?.species ? `· ${pet.species}` : ""} {pet?.breed ? `· ${pet.breed}` : ""}</p>
              <p><strong>Tutor:</strong> {owner?.name || "—"} {owner?.cpf ? `· CPF ${owner.cpf}` : ""}</p>
              <p><strong>Clínica:</strong> {profile?.business_name || "Configure em Configurações"} {profile?.crmv ? `· CRMV ${profile.crmv}` : ""}</p>
            </div>

            <Button onClick={handleGenerate} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
