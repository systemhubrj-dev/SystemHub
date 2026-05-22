import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Stethoscope, MessageCircle, ClipboardList,
  Activity, Search, Pill, TrendingUp, StickyNote,
  ChevronDown, ChevronRight, FileText, User, Printer,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface ClinicalEntryViewProps {
  entry: any;
  treatments: any[];
  onGenerateRx?: () => void;
  onDelete?: () => void;
  pet?: any;
  owner?: any;
  clinic?: any;
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

export default function ClinicalEntryView({ entry, treatments, onGenerateRx, onDelete, pet, owner, clinic }: ClinicalEntryViewProps) {
  const [expanded, setExpanded] = useState(false);
  const anamnesis = entry.anamnesis || {};
  const physicalExam = entry.physical_exam || {};
  const fmtDate = (d: string) => format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const hasTreatments = treatments && treatments.length > 0;

  // Parse systems-based anamnesis
  const systems = anamnesis.systems as any[] | undefined;
  const checkedSystems = systems?.filter((sys: any) =>
    sys.symptoms?.some((s: any) => s.checked)
  ) ?? [];

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c] as string));

    const systemsHtml = checkedSystems.map((sys: any) => {
      const checked = sys.symptoms.filter((s: any) => s.checked);
      return `<div class="row"><strong>${esc(sys.label)}:</strong> ${checked.map((s: any) => `${esc(s.label)}${s.startDate ? ` (desde ${esc(s.startDate)})` : ""}`).join(", ")}</div>`;
    }).join("");

    const treatmentsHtml = hasTreatments ? treatments.map((t: any) =>
      `<div class="row">• <strong>${esc(t.medication_name)}</strong>${t.dose ? ` — ${esc(t.dose)} ${esc(t.dose_unit)}` : ""}${t.route ? ` via ${esc(t.route)}` : ""}${t.frequency ? ` a cada ${esc(t.frequency)}` : ""}${t.duration_days ? ` por ${esc(t.duration_days)} dias` : ""}${t.notes ? ` <span class="muted">(${esc(t.notes)})</span>` : ""}</div>`
    ).join("") : "";

    const ageFromBirth = (b?: string) => {
      if (!b) return "";
      const bd = new Date(b); if (isNaN(bd.getTime())) return "";
      const now = new Date();
      let years = now.getFullYear() - bd.getFullYear();
      let months = now.getMonth() - bd.getMonth();
      if (now.getDate() < bd.getDate()) months--;
      if (months < 0) { years--; months += 12; }
      if (years <= 0) return `${Math.max(0, months)} ${months === 1 ? "mês" : "meses"}`;
      return `${years} ano${years > 1 ? "s" : ""}${months ? ` e ${months} ${months === 1 ? "mês" : "meses"}` : ""}`;
    };
    const petAge = pet?.birth_date ? ageFromBirth(pet.birth_date) : "";
    const clinicName = clinic?.business_name || "";
    const clinicAddr = clinic?.business_address || "";
    const clinicPhone = clinic?.business_phone || "";
    const vetName = clinic?.display_name || entry.vet_name || "";
    const vetCrmv = clinic?.crmv || "";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Prontuário — ${esc(fmtDate(entry.entry_date))}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.45; padding: 28px 32px; }
  .clinic-header { text-align: center; margin-bottom: 4px; }
  .clinic-name { font-size: 18px; font-weight: 700; color: rgb(20, 130, 100); margin: 0; }
  .clinic-sub { font-size: 9.5px; color: #555; margin: 3px 0 0; }
  .green-divider { border: 0; border-top: 1.5px solid rgb(20, 130, 100); margin: 8px 0 12px; }
  h1 { font-size: 18px; margin: 4px 0 4px; color: #111827; text-align: center; letter-spacing: 0.5px; }
  .meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #555; margin-bottom: 6px; }
  .meta-row strong { color: #111827; }
  .id-block { border: 1px solid #d1d5db; border-radius: 4px; padding: 8px 10px; margin: 6px 0 12px; background: #fafafa; }
  .id-title { font-size: 9px; font-weight: 700; color: rgb(20, 130, 100); letter-spacing: 0.6px; margin: 0 0 4px; }
  .id-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px 14px; font-size: 11.5px; }
  .id-row .full { grid-column: 1 / -1; }
  .id-row .label { color: #6b7280; font-size: 9.5px; }
  .id-row .val { font-weight: 500; color: #111827; }
  hr.thin { border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0 6px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: rgb(20, 130, 100); margin: 14px 0 5px; padding-bottom: 2px; border-bottom: 1px solid #e5e7eb; font-weight: 700; }
  p { margin: 4px 0; }
  .row { margin: 3px 0; }
  .muted { color: #6b7280; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; margin-top: 4px; }
  .vitals { display: flex; flex-wrap: wrap; gap: 12px 22px; padding: 8px 10px; background: #f9fafb; border-radius: 6px; }
  .vitals span { font-size: 12px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
  .tag { display: inline-block; background: #e6f4ee; color: rgb(20, 100, 80); padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 500; }
  .tx { background: #f9fafb; border-left: 3px solid rgb(20, 130, 100); padding: 6px 10px; margin: 4px 0; border-radius: 0 4px 4px 0; }
  .sig { margin-top: 60px; text-align: center; font-size: 11px; }
  .sig .line { width: 60%; margin: 0 auto 4px; border-top: 1px solid #111827; }
  .sig .name { font-weight: 700; }
  .sig .crmv { color: #555; font-size: 10px; }
  @page { size: A4; margin: 14mm; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } .tx, .vitals, .id-block { break-inside: avoid; } .sig { break-inside: avoid; } }
</style>
</head>
<body>
  ${clinicName ? `<div class="clinic-header"><h2 class="clinic-name">${esc(clinicName)}</h2>${(clinicAddr || clinicPhone) ? `<p class="clinic-sub">${esc([clinicAddr, clinicPhone ? `Tel: ${clinicPhone}` : ""].filter(Boolean).join("  ·  "))}</p>` : ""}${vetCrmv ? `<p class="clinic-sub">CRMV: ${esc(vetCrmv)}${vetName ? ` — Resp. Téc.: ${esc(vetName)}` : ""}</p>` : ""}</div>` : ""}
  <hr class="green-divider" />
  <h1>PRONTUÁRIO CLÍNICO</h1>
  <div class="meta-row">
    <span><strong>Data:</strong> ${esc(fmtDate(entry.entry_date))}</span>
    ${entry.vet_name ? `<span><strong>Veterinário(a):</strong> ${esc(entry.vet_name)}</span>` : ""}
  </div>

  ${pet ? `<div class="id-block">
    <p class="id-title">IDENTIFICAÇÃO DO ANIMAL</p>
    <div class="id-row">
      <div><span class="label">Nome:</span> <span class="val">${esc(pet.name || "—")}</span></div>
      <div><span class="label">Espécie:</span> <span class="val">${esc(pet.species || "—")}</span></div>
      <div><span class="label">Raça:</span> <span class="val">${esc(pet.breed || "—")}</span></div>
      <div><span class="label">Sexo:</span> <span class="val">${esc(pet.sex || "—")}</span></div>
      <div><span class="label">Idade:</span> <span class="val">${esc(petAge || "—")}</span></div>
      <div><span class="label">Pelagem/Cor:</span> <span class="val">${esc(pet.coat || pet.color || "—")}</span></div>
      ${pet.microchip ? `<div class="full"><span class="label">Microchip:</span> <span class="val">${esc(pet.microchip)}</span></div>` : ""}
    </div>
  </div>` : ""}

  ${owner ? `<div class="id-block">
    <p class="id-title">IDENTIFICAÇÃO DO TUTOR</p>
    <div class="id-row">
      <div class="full"><span class="label">Nome:</span> <span class="val">${esc(owner.name || "—")}</span></div>
      <div><span class="label">CPF:</span> <span class="val">${esc(owner.cpf || "—")}</span></div>
      <div><span class="label">Telefone:</span> <span class="val">${esc(owner.phone || "—")}</span></div>
      ${owner.address ? `<div class="full"><span class="label">Endereço:</span> <span class="val">${esc(owner.address)}</span></div>` : ""}
    </div>
  </div>` : ""}

  ${entry.complaint_tags?.length ? `<div class="tags">${entry.complaint_tags.map((t: string) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
  ${entry.chief_complaint ? `<h2>Queixa Principal</h2><p>${esc(entry.chief_complaint)}</p>` : ""}
  ${(systemsHtml || anamnesis.medical_history || anamnesis.current_medications || anamnesis.notes) ? `<h2>Anamnese</h2>${systemsHtml}${anamnesis.medical_history ? `<div class="row"><strong>Histórico:</strong> ${esc(anamnesis.medical_history)}</div>` : ""}${anamnesis.current_medications ? `<div class="row"><strong>Medicações:</strong> ${esc(anamnesis.current_medications)}</div>` : ""}${anamnesis.notes ? `<div class="row"><strong>Obs:</strong> ${esc(anamnesis.notes)}</div>` : ""}` : ""}
  ${(entry.weight || entry.temperature || entry.heart_rate || entry.respiratory_rate || entry.capillary_refill_time) ? `<h2>Parâmetros Vitais</h2><div class="vitals">${entry.weight ? `<span><strong>Peso:</strong> ${esc(entry.weight)} kg</span>` : ""}${entry.temperature ? `<span><strong>Temp:</strong> ${esc(entry.temperature)} °C</span>` : ""}${entry.heart_rate ? `<span><strong>FC:</strong> ${esc(entry.heart_rate)} bpm</span>` : ""}${entry.respiratory_rate ? `<span><strong>FR:</strong> ${esc(entry.respiratory_rate)} mpm</span>` : ""}${entry.capillary_refill_time ? `<span><strong>TPC:</strong> ${esc(entry.capillary_refill_time)}</span>` : ""}</div>` : ""}
  ${Object.values(physicalExam).some(Boolean) ? `<h2>Exame Físico</h2><div class="grid">${physicalExam.general_condition ? `<div><strong>Estado geral:</strong> ${esc(physicalExam.general_condition)}</div>` : ""}${physicalExam.hydration ? `<div><strong>Hidratação:</strong> ${esc(physicalExam.hydration)}</div>` : ""}${physicalExam.mucous_membranes ? `<div><strong>Mucosas:</strong> ${esc(physicalExam.mucous_membranes)}</div>` : ""}${physicalExam.lymph_nodes ? `<div><strong>Linfonodos:</strong> ${esc(physicalExam.lymph_nodes)}</div>` : ""}${physicalExam.pain_on_palpation ? `<div><strong>Dor à palpação:</strong> ${esc(physicalExam.pain_on_palpation)}</div>` : ""}</div>${physicalExam.physical_exam_notes ? `<p>${esc(physicalExam.physical_exam_notes)}</p>` : ""}` : ""}
  ${(entry.diagnosis || entry.differential_diagnosis) ? `<h2>Diagnóstico</h2>${entry.diagnosis ? `<p><strong>Principal:</strong> ${esc(entry.diagnosis)}</p>` : ""}${entry.differential_diagnosis ? `<p><strong>Diferenciais:</strong> ${esc(entry.differential_diagnosis)}</p>` : ""}` : ""}
  ${treatmentsHtml ? `<h2>Plano Terapêutico</h2>${treatmentsHtml}` : ""}
  ${entry.prognosis ? `<h2>Prognóstico</h2><p>${esc(entry.prognosis)}${entry.prognosis_notes ? ` — ${esc(entry.prognosis_notes)}` : ""}</p>` : ""}
  ${entry.general_notes ? `<h2>Observações Gerais</h2><p>${esc(entry.general_notes)}</p>` : ""}

  ${vetName ? `<div class="sig"><div class="line"></div><div class="name">${esc(vetName)}</div>${vetCrmv ? `<div class="crmv">CRMV: ${esc(vetCrmv)}</div>` : ""}</div>` : ""}
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const triggerPrint = () => {
      try { printWindow.focus(); printWindow.print(); } catch (_) { /* noop */ }
    };
    if (printWindow.document.readyState === "complete") {
      setTimeout(triggerPrint, 250);
    } else {
      printWindow.addEventListener("load", () => setTimeout(triggerPrint, 250));
    }
  };

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardContent className="py-3 px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <button
            className="flex items-center gap-2 text-left flex-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Badge variant="outline" className="text-xs shrink-0">
              <Calendar className="h-3 w-3 mr-1" />
              {fmtDate(entry.entry_date)}
            </Badge>
            {entry.vet_name && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />{entry.vet_name}
              </span>
            )}
          </button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handlePrint} title="Imprimir prontuário">
              <Printer className="h-3 w-3 mr-1" /> Imprimir
            </Button>
            {onDelete && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={onDelete}>
                Excluir
              </Button>
            )}
          </div>
        </div>

        {/* Summary (always visible) */}
        <div className="mt-2 space-y-1">
          {entry.complaint_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.complaint_tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          )}
          {entry.diagnosis && (
            <div className="text-sm">
              <span className="text-muted-foreground font-medium">Diagnóstico: </span>
              <span className="font-medium">{entry.diagnosis}</span>
            </div>
          )}
          {entry.prognosis && (
            <Badge variant={entry.prognosis === "Favorável" ? "default" : entry.prognosis === "Grave" ? "destructive" : "secondary"} className="text-[10px]">
              {entry.prognosis}
            </Badge>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-3 text-sm">
            {entry.chief_complaint && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <MessageCircle className="h-3 w-3" /> Queixa Principal
                  </div>
                  <p>{entry.chief_complaint}</p>
                </div>
              </>
            )}

            {/* Anamnese - Systems based */}
            {(checkedSystems.length > 0 || anamnesis.medical_history || anamnesis.current_medications || anamnesis.notes) && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <ClipboardList className="h-3 w-3" /> Anamnese
                  </div>
                  {checkedSystems.map((sys: any) => {
                    const checked = sys.symptoms.filter((s: any) => s.checked);
                    return (
                      <div key={sys.key} className="mb-1">
                        <span className="text-xs font-medium">{sys.label}: </span>
                        <span className="text-xs">
                          {checked.map((s: any) => `${s.label}${s.startDate ? ` (desde ${s.startDate})` : ""}`).join(", ")}
                        </span>
                      </div>
                    );
                  })}
                  <InfoBlock label="Histórico" value={anamnesis.medical_history} />
                  <InfoBlock label="Medicações" value={anamnesis.current_medications} />
                  <InfoBlock label="Obs" value={anamnesis.notes} />
                </div>
              </>
            )}

            {/* Vitals */}
            {(entry.weight || entry.temperature || entry.heart_rate || entry.respiratory_rate) && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Activity className="h-3 w-3" /> Parâmetros Vitais
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {entry.weight && <span>Peso: <strong>{entry.weight} kg</strong></span>}
                    {entry.temperature && <span>Temp: <strong>{entry.temperature} °C</strong></span>}
                    {entry.heart_rate && <span>FC: <strong>{entry.heart_rate} bpm</strong></span>}
                    {entry.respiratory_rate && <span>FR: <strong>{entry.respiratory_rate} mpm</strong></span>}
                    {entry.capillary_refill_time && <span>TPC: <strong>{entry.capillary_refill_time}</strong></span>}
                  </div>
                </div>
              </>
            )}

            {/* Physical Exam */}
            {Object.values(physicalExam).some(Boolean) && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Search className="h-3 w-3" /> Exame Físico
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <InfoBlock label="Estado geral" value={physicalExam.general_condition} />
                    <InfoBlock label="Hidratação" value={physicalExam.hydration} />
                    <InfoBlock label="Mucosas" value={physicalExam.mucous_membranes} />
                    <InfoBlock label="Linfonodos" value={physicalExam.lymph_nodes} />
                    <InfoBlock label="Dor à palpação" value={physicalExam.pain_on_palpation} />
                  </div>
                  <InfoBlock label="Observações" value={physicalExam.physical_exam_notes} />
                </div>
              </>
            )}

            {/* Diagnosis */}
            {(entry.diagnosis || entry.differential_diagnosis) && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Stethoscope className="h-3 w-3" /> Diagnóstico
                  </div>
                  <InfoBlock label="Principal" value={entry.diagnosis} />
                  <InfoBlock label="Diferenciais" value={entry.differential_diagnosis} />
                </div>
              </>
            )}

            {/* Treatment */}
            {hasTreatments && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Pill className="h-3 w-3" /> Plano Terapêutico
                  </div>
                  <div className="space-y-2">
                    {treatments.map((t: any) => (
                      <div key={t.id} className="bg-muted/50 rounded p-2 text-xs">
                        <strong>{t.medication_name}</strong>
                        {t.dose && <span> — {t.dose} {t.dose_unit}</span>}
                        {t.route && <span> via {t.route}</span>}
                        {t.frequency && <span> a cada {t.frequency}</span>}
                        {t.duration_days && <span> por {t.duration_days} dias</span>}
                        {t.notes && <p className="text-muted-foreground mt-0.5">{t.notes}</p>}
                      </div>
                    ))}
                  </div>
                  {onGenerateRx && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={onGenerateRx}>
                      <FileText className="h-3 w-3 mr-1" /> Gerar Receita
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Prognosis */}
            {entry.prognosis_notes && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <TrendingUp className="h-3 w-3" /> Prognóstico
                  </div>
                  <p>{entry.prognosis_notes}</p>
                </div>
              </>
            )}

            {/* General notes */}
            {entry.general_notes && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <StickyNote className="h-3 w-3" /> Observações
                  </div>
                  <p>{entry.general_notes}</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}