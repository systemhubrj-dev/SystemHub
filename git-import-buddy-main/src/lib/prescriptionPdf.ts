import jsPDF from "jspdf";
import { loadLogoForPdf } from "./logoLoader";

export interface MedicationItem {
  name: string;
  quantity: string;
  unit: string;
  route: string;
  form: string;
  dosage: string;
}

interface PrescriptionPdfData {
  vet_name: string;
  vet_crmv: string;
  business_name: string;
  business_address?: string;
  business_phone?: string;
  business_cnpj?: string;
  pet_name: string;
  pet_species: string;
  pet_breed: string;
  pet_sex: string;
  pet_age: string;
  pet_weight?: string;
  client_name: string;
  client_cpf: string;
  client_phone: string;
  client_address: string;
  // Legacy (kept for backwards compatibility)
  prescription: string;
  dosage: string;
  route: string;
  form: string;
  // New structured list
  medications?: MedicationItem[];
  observations: string;
  date: string;
  show_date: boolean;
  prescription_type: "normal" | "sipeagro";
  sipeagro_number: string;
  logo_url?: string | null;
}

export async function generatePrescriptionPDF(data: PrescriptionPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const logo = await loadLogoForPdf(data.logo_url);

  // Marca d'água (sutil, centralizada) — desenhada antes de tudo para ficar atrás
  const drawWatermark = () => {
    if (!logo) return;
    const wmW = 160;
    const ratio = logo.height / Math.max(1, logo.width);
    const wmH = wmW * ratio;
    const x = (pageWidth - wmW) / 2;
    const yy = (pageHeight - wmH) / 2;
    const anyDoc = doc as any;
    if (anyDoc.GState && anyDoc.setGState) {
      const gs = new anyDoc.GState({ opacity: 0.13 });
      anyDoc.setGState(gs);
      doc.addImage(logo.dataUrl, logo.format, x, yy, wmW, wmH);
      const reset = new anyDoc.GState({ opacity: 1 });
      anyDoc.setGState(reset);
    } else {
      doc.addImage(logo.dataUrl, logo.format, x, yy, wmW, wmH);
    }
  };
  drawWatermark();

  // ===== Clinic Header =====
  const fitText = (text: string, maxWidth: number) => {
    let output = text || "";
    while (output && doc.getTextWidth(output) > maxWidth) output = output.slice(0, -1);
    return output.length < text.length ? `${output.slice(0, -1)}…` : output;
  };

  if (data.business_name) {
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 130, 100);
    doc.text(fitText(data.business_name, contentWidth), pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  doc.setTextColor(80);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const headerLines: string[] = [];
  if (data.business_address) headerLines.push(data.business_address);
  if (data.business_phone) headerLines.push(`Tel: ${data.business_phone}`);
  if (headerLines.length) {
    doc.text(fitText(headerLines.join("  ·  "), contentWidth), pageWidth / 2, y, { align: "center" });
    y += 4.5;
  }
  const idParts: string[] = [];
  if (data.business_cnpj) idParts.push(`CNPJ: ${data.business_cnpj}`);
  if (data.vet_crmv && data.vet_crmv !== "Não informado") idParts.push(`CRMV: ${data.vet_crmv}`);
  if (data.business_name && data.vet_name && data.vet_name !== "Não informado") idParts.push(`Resp. Téc.: ${data.vet_name}`);
  if (idParts.length) {
    doc.text(fitText(idParts.join("  ·  "), contentWidth), pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  doc.setTextColor(0);

  // Top divider
  doc.setDrawColor(20, 130, 100);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  y += 7;

  // ===== Title =====
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  const title = data.prescription_type === "sipeagro" ? "RECEITUÁRIO SIPEAGRO" : "RECEITUÁRIO";
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 7;

  // Number and date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (data.prescription_type === "sipeagro" && data.sipeagro_number) {
    doc.text(`Nº SIPEAGRO: ${data.sipeagro_number}`, margin, y);
  }
  if (data.show_date) {
    doc.text(`Data: ${data.date}`, pageWidth - margin, y, { align: "right" });
  }
  y += 6;

  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== Animal info =====
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO DO ANIMAL", margin, y);
  y += 5;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${data.pet_name}`, margin, y); y += 4.5;
  doc.text(`Espécie: ${data.pet_species || "N/I"}    Raça: ${data.pet_breed || "N/I"}`, margin, y); y += 4.5;
  const sexAge = `Sexo: ${data.pet_sex || "N/I"}    Idade: ${data.pet_age}`;
  const weightStr = data.pet_weight ? `    Peso: ${data.pet_weight} kg` : "";
  doc.text(sexAge + weightStr, margin, y); y += 6;

  // Tutor info
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO DO TUTOR", margin, y);
  y += 5;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${data.client_name || "N/I"}`, margin, y); y += 4.5;
  doc.text(`CPF: ${data.client_cpf || "N/I"}`, margin, y); y += 4.5;
  if (data.client_phone) { doc.text(`Telefone: ${data.client_phone}`, margin, y); y += 4.5; }
  if (data.client_address) {
    const addrLines = doc.splitTextToSize(`Endereço: ${data.client_address}`, contentWidth);
    addrLines.forEach((l: string) => { doc.text(l, margin, y); y += 4.5; });
  }
  y += 3;

  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== Prescription =====
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PRESCRIÇÃO", margin, y);
  y += 6;

  const ensureSpace = (needed: number) => {
    if (y + needed > 255) { doc.addPage(); y = 25; }
  };

  const meds = data.medications && data.medications.length > 0 ? data.medications : null;

  if (meds) {
    meds.forEach((med, idx) => {
      ensureSpace(22);

      // Line 1: Route (italic, primary color, above name)
      if (med.route) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(20, 130, 100);
        doc.text(`Via ${med.route}`, margin, y);
        doc.setTextColor(0);
        y += 4;
      }

      // Line 2: Name (left, bold) ··· Form + qty (right)
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      const medNum = `${idx + 1}.`;
      doc.text(medNum, margin, y);
      doc.text(med.name || "—", margin + 6, y);

      const rightParts: string[] = [];
      if (med.form) rightParts.push(med.form);
      if (med.quantity) rightParts.push(`${med.quantity}${med.unit ? " " + med.unit : ""}`);
      if (rightParts.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text(rightParts.join(" — "), pageWidth - margin, y, { align: "right" });
      }
      y += 5;

      // Line 3: Dosage (indented)
      if (med.dosage) {
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        const dosLines = doc.splitTextToSize(med.dosage, contentWidth - 8);
        dosLines.forEach((line: string) => {
          ensureSpace(5);
          doc.text(line, margin + 6, y);
          y += 4.5;
        });
      }
      y += 3;
    });
  } else {
    // Legacy free-text fallback
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (data.prescription) {
      const lines = doc.splitTextToSize(data.prescription, contentWidth);
      lines.forEach((line: string) => {
        ensureSpace(5);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 3;
    }
    if (data.route || data.form) {
      doc.setFont("helvetica", "bold");
      if (data.route) {
        doc.text(`Via de administração: `, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.route, margin + doc.getTextWidth("Via de administração: "), y);
        y += 5;
      }
      if (data.form) {
        doc.setFont("helvetica", "bold");
        doc.text(`Forma farmacêutica: `, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.form, margin + doc.getTextWidth("Forma farmacêutica: "), y);
        y += 5;
      }
      y += 3;
    }
    if (data.dosage) {
      doc.setFont("helvetica", "bold");
      doc.text("POSOLOGIA", margin, y); y += 5;
      doc.setFont("helvetica", "normal");
      const dosLines = doc.splitTextToSize(data.dosage, contentWidth);
      dosLines.forEach((line: string) => {
        ensureSpace(5);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 3;
    }
  }

  // Observations
  if (data.observations) {
    ensureSpace(10);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "italic");
    doc.text("Observações:", margin, y); y += 5;
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(data.observations, contentWidth);
    obsLines.forEach((line: string) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.5;
    });
    y += 4;
  }

  // ===== Signature =====
  const sigY = Math.max(y + 22, 235);
  doc.line(pageWidth / 2 - 40, sigY, pageWidth / 2 + 40, sigY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.vet_name, pageWidth / 2, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`CRMV: ${data.vet_crmv}`, pageWidth / 2, sigY + 10, { align: "center" });
  doc.text("Médico(a) Veterinário(a)", pageWidth / 2, sigY + 15, { align: "center" });

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  const footerText = data.prescription_type === "sipeagro" && data.sipeagro_number
    ? `Receituário SIPEAGRO nº ${data.sipeagro_number} — ${data.business_name || "System Hub"}`
    : `${data.business_name || "System Hub"}`;
  doc.text(footerText, pageWidth / 2, 290, { align: "center" });

  const fileName = data.prescription_type === "sipeagro"
    ? `receita_sipeagro_${data.sipeagro_number || "sem_numero"}_${data.pet_name.replace(/\s/g, "_")}.pdf`
    : `receita_${data.pet_name.replace(/\s/g, "_")}.pdf`;

  doc.save(fileName);
}
