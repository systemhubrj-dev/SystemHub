import jsPDF from "jspdf";
import { loadLogoForPdf } from "./logoLoader";

interface DocData {
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
  pet_microchip: string;
  client_name: string;
  client_cpf: string;
  client_phone: string;
  client_address: string;
  content: string;
  observations: string;
  date: string;
  logo_url?: string | null;
}

export interface VetDocPreview {
  blobUrl: string;
  blob: Blob;
  fileName: string;
}

export async function generateVetDocumentPDF(
  typeLabel: string,
  rawData: Partial<DocData> | null | undefined,
  docNumber: number,
  mode: "download" | "preview" = "download",
): Promise<VetDocPreview | void> {
  // Sanitiza tudo: garante que todo campo é string (jsPDF.text quebra com null/undefined/number)
  const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
  const data: DocData = {
    vet_name: s(rawData?.vet_name) || "Não informado",
    vet_crmv: s(rawData?.vet_crmv) || "Não informado",
    business_name: s(rawData?.business_name),
    business_address: s(rawData?.business_address),
    business_phone: s(rawData?.business_phone),
    business_cnpj: s(rawData?.business_cnpj),
    pet_name: s(rawData?.pet_name),
    pet_species: s(rawData?.pet_species),
    pet_breed: s(rawData?.pet_breed),
    pet_sex: s(rawData?.pet_sex),
    pet_age: s(rawData?.pet_age),
    pet_microchip: s(rawData?.pet_microchip),
    client_name: s(rawData?.client_name),
    client_cpf: s(rawData?.client_cpf),
    client_phone: s(rawData?.client_phone),
    client_address: s(rawData?.client_address),
    content: s(rawData?.content),
    observations: s(rawData?.observations),
    date: s(rawData?.date) || new Date().toLocaleDateString("pt-BR"),
  };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  const logo = await loadLogoForPdf((rawData as any)?.logo_url);
  const fitText = (text: string, maxWidth: number) => {
    let output = text || "";
    while (output && doc.getTextWidth(output) > maxWidth) output = output.slice(0, -1);
    return output.length < text.length ? `${output.slice(0, -1)}…` : output;
  };

  // Marca d'água (mais visível, ocupando boa parte da página)
  if (logo) {
    const wmW = 160;
    const wmH = wmW * (logo.height / Math.max(1, logo.width));
    const wx = (pageWidth - wmW) / 2;
    const wy = (pageHeight - wmH) / 2;
    const anyDoc = doc as any;
    if (anyDoc.GState && anyDoc.setGState) {
      anyDoc.setGState(new anyDoc.GState({ opacity: 0.13 }));
      doc.addImage(logo.dataUrl, logo.format, wx, wy, wmW, wmH);
      anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
    } else {
      doc.addImage(logo.dataUrl, logo.format, wx, wy, wmW, wmH);
    }
  }

  // Header — clinic identity (matches reference style)
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
  const subParts: string[] = [];
  if (data.business_address) subParts.push(data.business_address);
  if (data.business_phone) subParts.push(`Tel: ${data.business_phone}`);
  if (subParts.length) {
    doc.text(fitText(subParts.join("  ·  "), contentWidth), pageWidth / 2, y, { align: "center" });
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

  // Top divider (green)
  doc.setDrawColor(20, 130, 100);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  y += 6;

  // Document title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(typeLabel.toUpperCase(), pageWidth / 2, y + 5, { align: "center" });
  y += 14;

  // Document number and date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Documento nº ${docNumber}`, margin, y);
  doc.text(`Data: ${data.date}`, pageWidth - margin, y, { align: "right" });
  y += 8;

  // Divider
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Animal info section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO DO ANIMAL", margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const petLines = [
    `Nome: ${data.pet_name}`,
    `Espécie: ${data.pet_species || "N/I"}    Raça: ${data.pet_breed || "N/I"}`,
    `Sexo: ${data.pet_sex || "N/I"}    Idade: ${data.pet_age}`,
  ];
  if (data.pet_microchip) petLines.push(`Microchip: ${data.pet_microchip}`);

  petLines.forEach(line => {
    doc.text(line, margin, y);
    y += 5;
  });
  y += 4;

  // Client info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO DO TUTOR", margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${data.client_name || "N/I"}`, margin, y); y += 5;
  doc.text(`CPF: ${data.client_cpf || "N/I"}`, margin, y); y += 5;
  if (data.client_phone) { doc.text(`Telefone: ${data.client_phone}`, margin, y); y += 5; }
  if (data.client_address) { doc.text(`Endereço: ${data.client_address}`, margin, y); y += 5; }
  y += 4;

  // Divider
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Content
  if (data.content) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.content, contentWidth);
    lines.forEach((line: string) => {
      if (y > 250) { doc.addPage(); y = 25; }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;
  }

  // Observations
  if (data.observations) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Observações:", margin, y); y += 5;
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(data.observations, contentWidth);
    obsLines.forEach((line: string) => {
      if (y > 250) { doc.addPage(); y = 25; }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 6;
  }

  // Signature area
  const sigY = Math.max(y + 20, 230);
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
  doc.text(
    `Documento gerado eletronicamente — ${data.business_name || "System Hub"} — Nº ${docNumber}`,
    pageWidth / 2, 290, { align: "center" }
  );

  const safeName = (data.pet_name || "documento").replace(/\s/g, "_");
  const fileName = `documento_${docNumber}_${safeName}.pdf`;

  const blob = doc.output("blob");

  if (mode === "preview") {
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, blob, fileName };
  }

  triggerDownload(blob, fileName);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}
