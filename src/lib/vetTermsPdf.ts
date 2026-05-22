import { PDFDocument, PDFImage, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export type TermType =
  // Termos de consentimento (10 originais — usam PDF templates)
  | "terapeutico"
  | "cirurgico"
  | "internacao"
  | "exames"
  | "anestesico"
  | "eutanasia"
  | "retirada_obito"
  | "doacao_corpo"
  | "recusa"
  | "retirada_sem_alta"
  // Atestados e certificados (8 — gerados do zero)
  | "atestado_sanitario_internacional"
  | "atestado_sanitario"
  | "atestado_obito"
  | "solicitacao_exames"
  | "encaminhamento"
  | "declaracao_comparecimento"
  | "certificado_vacinacao"
  | "atestado_transito";

export interface TermClinic {
  business_name?: string | null;
  business_address?: string | null;
  business_phone?: string | null;
  business_cnpj?: string | null;
  business_ie?: string | null;
  crmv?: string | null;
  display_name?: string | null;
  cpf?: string | null;
  logo_url?: string | null;
}

export interface TermPet {
  name: string;
  species?: string | null;
  breed?: string | null;
  sex?: string | null;
  coat?: string | null;
  color?: string | null;
  birth_date?: string | null;
  microchip?: string | null;
  age?: string | null;
}

export interface TermOwner {
  name?: string | null;
  cpf?: string | null;
  rg?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}

export interface TermFields {
  date: string;
  city: string;
  observations?: string;
  procedure?: string;
  exam?: string;
  cause?: string;
  recused?: string;
  destination?: string;
  institution?: string;
  diagnosis?: string;
  risks?: string;
  vaccine?: string;
  vaccineCommercial?: string;
  vaccineBatch?: string;
  vaccineManufacturer?: string;
  vaccineFabDate?: string;
  vaccineExpDate?: string;
  vaccineValidUntil?: string;
  vaccineApplicationDate?: string;
  deathLocation?: string;
  deathTime?: string;
  deathDate?: string;
  deathCause?: string;
  examRequest?: string;
  history?: string;
  clinicalSuspicion?: string;
  medications?: string;
  examsDone?: string;
  specialistArea?: string;
  attendanceFrom?: string;
  attendanceTo?: string;
  attendanceDate?: string;
  // Recusa: o "estou ciente da indicação de ___" do template
  indication?: string;
  // Antiparasitário (atestado sanitário internacional / trânsito)
  antiparasiticInternal?: string;
  antiparasiticInternalLab?: string;
  antiparasiticInternalDate?: string;
  antiparasiticExternal?: string;
  antiparasiticExternalLab?: string;
  antiparasiticExternalDate?: string;
  // Sanitário: declaração veterinário (telefone/cidade-UF/CRMV — usados se profile não tiver)
  sanitaryDeclaration?: string;
}

export const TERM_LABELS: Record<TermType, string> = {
  terapeutico: "Termo de Autorização para Procedimento Terapêutico",
  cirurgico: "Termo de Autorização para Procedimento Cirúrgico",
  internacao: "Termo de Autorização para Internação e Tratamento Clínico ou Cirúrgico",
  exames: "Termo de Autorização para Exames",
  anestesico: "Termo de Autorização para Procedimentos Anestésicos",
  eutanasia: "Termo de Consentimento para Realização de Eutanásia",
  retirada_obito: "Termo de Consentimento para Retirada de Corpo de Animal em Óbito",
  doacao_corpo: "Termo de Consentimento de Doação de Corpo para Ensino e Pesquisa",
  recusa: "Termo de Recusa a Exame ou Tratamento Indicado",
  retirada_sem_alta: "Termo de Retirada de Animal sem Alta Médica",
  atestado_sanitario_internacional: "Atestado Sanitário Internacional",
  atestado_sanitario: "Atestado Sanitário",
  atestado_obito: "Atestado de Óbito",
  solicitacao_exames: "Solicitação de Exames",
  encaminhamento: "Encaminhamento para Especialista",
  declaracao_comparecimento: "Declaração de Comparecimento",
  certificado_vacinacao: "Certificado de Vacinação",
  atestado_transito: "Atestado Sanitário p/ Trânsito de Cães e Gatos",
};

// ============================================================
// TEMPLATES (apenas os 10 termos de consentimento)
// ============================================================
const TEMPLATE_PATH: Partial<Record<TermType, string>> = {
  terapeutico: "/termos/terapeutico.pdf",
  cirurgico: "/termos/cirurgico.pdf",
  internacao: "/termos/internacao.pdf",
  exames: "/termos/exames.pdf",
  anestesico: "/termos/anestesico.pdf",
  eutanasia: "/termos/eutanasia.pdf",
  retirada_obito: "/termos/retirada_obito.pdf",
  doacao_corpo: "/termos/doacao_corpo.pdf",
  recusa: "/termos/recusa.pdf",
  retirada_sem_alta: "/termos/retirada_sem_alta.pdf",
};

const CONSENT_TYPES: TermType[] = [
  "terapeutico", "cirurgico", "internacao", "exames", "anestesico",
  "eutanasia", "retirada_obito", "doacao_corpo", "recusa", "retirada_sem_alta",
];

// ============================================================
// COORDENADAS PARA OS TERMOS COM TEMPLATE
// ============================================================
type FieldMap = {
  animalNome: number; animalEspecie: number; animalRaca: number;
  animalSexo: number; animalIdade: number; animalPelagem: number;
  tutorNome: number; tutorRG: number; tutorCPF: number;
  tutorEndereco: number; tutorTelefone: number; tutorEmail: number;
};

const STD_OFFSETS_A: FieldMap = {
  animalNome: 644.8, animalEspecie: 644.8, animalRaca: 620.9, animalSexo: 620.9,
  animalIdade: 597.0, animalPelagem: 597.0,
  tutorNome: 432.3, tutorRG: 408.4, tutorCPF: 408.4,
  tutorEndereco: 384.5, tutorTelefone: 360.6, tutorEmail: 360.6,
};

const OFFSETS_INTERNACAO: FieldMap = {
  animalNome: 597.3, animalEspecie: 597.3, animalRaca: 573.4, animalSexo: 573.4,
  animalIdade: 549.4, animalPelagem: 549.4,
  tutorNome: 384.7, tutorRG: 360.8, tutorCPF: 360.8,
  tutorEndereco: 336.9, tutorTelefone: 313.0, tutorEmail: 313.0,
};

const OFFSETS_ANESTESICO: FieldMap = {
  animalNome: 583.7, animalEspecie: 583.7, animalRaca: 559.8, animalSexo: 559.8,
  animalIdade: 535.9, animalPelagem: 535.9,
  tutorNome: 351.0, tutorRG: 327.1, tutorCPF: 327.1,
  tutorEndereco: 303.2, tutorTelefone: 279.3, tutorEmail: 279.3,
};

const OFFSETS_EUTANASIA: FieldMap = {
  animalNome: 609.3, animalEspecie: 609.3, animalRaca: 585.4, animalSexo: 585.4,
  animalIdade: 561.5, animalPelagem: 561.5,
  tutorNome: 396.8, tutorRG: 372.8, tutorCPF: 372.8,
  tutorEndereco: 348.9, tutorTelefone: 325.0, tutorEmail: 325.0,
};

const OFFSETS_RETIRADA_OBITO: FieldMap = {
  animalNome: 525.3, animalEspecie: 525.3, animalRaca: 501.4, animalSexo: 501.4,
  animalIdade: 477.5, animalPelagem: 477.5,
  tutorNome: 286.0, tutorRG: 262.1, tutorCPF: 262.1,
  tutorEndereco: 238.2, tutorTelefone: 214.3, tutorEmail: 214.3,
};

const OFFSETS_DOACAO_CORPO: FieldMap = {
  animalNome: 625.9, animalEspecie: 625.9, animalRaca: 602.0, animalSexo: 602.0,
  animalIdade: 578.1, animalPelagem: 578.1,
  tutorNome: 339.6, tutorRG: 315.7, tutorCPF: 315.7,
  tutorEndereco: 291.8, tutorTelefone: 267.9, tutorEmail: 267.9,
};

const OFFSETS_RECUSA: FieldMap = {
  animalNome: 631.4, animalEspecie: 631.4, animalRaca: 607.5, animalSexo: 607.5,
  animalIdade: 583.6, animalPelagem: 583.6,
  tutorNome: 258.0, tutorRG: 234.1, tutorCPF: 234.1,
  tutorEndereco: 210.2, tutorTelefone: 186.2, tutorEmail: 186.2,
};

const OFFSETS_RETIRADA_SEM_ALTA: FieldMap = {
  animalNome: 623.9, animalEspecie: 623.9, animalRaca: 600.0, animalSexo: 600.0,
  animalIdade: 576.1, animalPelagem: 576.1,
  tutorNome: 371.2, tutorRG: 347.2, tutorCPF: 347.2,
  tutorEndereco: 323.3, tutorTelefone: 299.4, tutorEmail: 299.4,
};

const FIELD_MAPS: Partial<Record<TermType, FieldMap>> = {
  terapeutico: STD_OFFSETS_A,
  cirurgico: STD_OFFSETS_A,
  exames: STD_OFFSETS_A,
  anestesico: OFFSETS_ANESTESICO,
  eutanasia: OFFSETS_EUTANASIA,
  retirada_obito: OFFSETS_RETIRADA_OBITO,
  doacao_corpo: OFFSETS_DOACAO_CORPO,
  recusa: OFFSETS_RECUSA,
  retirada_sem_alta: OFFSETS_RETIRADA_SEM_ALTA,
  internacao: OFFSETS_INTERNACAO,
};

const X_VAL = {
  nomeAnimal: 90, especie: 340, raca: 86, sexo: 323, idade: 90, pelagem: 347,
  nomeTutor: 90, rg: 73, cpf: 318, endereco: 111, telefone: 105, email: 328,
};

const Y_NUDGE = 0.5;

// ============================================================
// HELPERS
// ============================================================
function clip(text: string | undefined | null, max: number, font: PDFFont, size: number): string {
  if (!text) return "";
  const s = String(text);
  if (font.widthOfTextAtSize(s, size) <= max) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(s.slice(0, mid) + "…", size) <= max) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + "…";
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = String(text || "").split(/\n+/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

// ============================================================
// LOGO HELPERS
// ============================================================
async function embedClinicLogo(pdfDoc: PDFDocument, logoUrl?: string | null): Promise<PDFImage | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    const isJpeg = blob.type.includes("jpeg") || blob.type.includes("jpg");
    const isPng = blob.type.includes("png");
    if (isJpeg) return await pdfDoc.embedJpg(buf);
    if (isPng) return await pdfDoc.embedPng(buf);
    // SVG/outros → rasteriza via canvas
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(null);
      img.onerror = reject;
      img.src = dataUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 256;
    canvas.height = img.naturalHeight || 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pngDataUrl = canvas.toDataURL("image/png");
    const base64 = pngDataUrl.split(",")[1] || "";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return await pdfDoc.embedPng(bytes);
  } catch (e) {
    console.warn("embedClinicLogo failed:", e);
    return null;
  }
}

function drawLogoWatermark(page: PDFPage, logo: PDFImage | null) {
  if (!logo) return;
  const W = page.getWidth();
  const H = page.getHeight();
  const targetW = 420;
  const dims = logo.scale(targetW / logo.width);
  page.drawImage(logo, {
    x: (W - dims.width) / 2,
    y: (H - dims.height) / 2,
    width: dims.width,
    height: dims.height,
    opacity: 0.13,
  });
}

function drawLogoOnHeader(page: PDFPage, logo: PDFImage | null, x: number, topY: number, maxH = 36) {
  if (!logo) return 0;
  const dims = logo.scale(maxH / logo.height);
  page.drawImage(logo, {
    x,
    y: topY - dims.height,
    width: dims.width,
    height: dims.height,
  });
  return dims.width;
}
// ============================================================
function drawHeaderOnTemplate(page: PDFPage, font: PDFFont, fontBold: PDFFont, clinic: TermClinic) {
  const W = page.getWidth();
  const H = page.getHeight();

  // Mascara a área onde o template tem placeholders de cabeçalho
  page.drawRectangle({
    x: 40, y: H - 110, width: W - 80, height: 90, color: rgb(1, 1, 1),
  });

  const green = rgb(20 / 255, 130 / 255, 100 / 255);
  const subColor = rgb(0.33, 0.33, 0.33);
  const margin = 58;
  const maxW = W - margin * 2;

  const hasClinic = !!(clinic.business_name && clinic.business_name.trim());
  const title = hasClinic
    ? (clinic.business_name as string)
    : (clinic.display_name || "Médico(a) Veterinário(a)");

  const fit = (text: string, f: PDFFont, size: number) => {
    let out = text || "";
    while (out && f.widthOfTextAtSize(out, size) > maxW) out = out.slice(0, -1);
    return out.length < (text?.length || 0) ? `${out.slice(0, -1)}…` : out;
  };

  // 1ª linha: nome da clínica em verde, bold, centralizado
  const titleSize = 15;
  const safeTitle = fit(title, fontBold, titleSize);
  const titleW = fontBold.widthOfTextAtSize(safeTitle, titleSize);
  let curY = H - 42;
  page.drawText(safeTitle, {
    x: (W - titleW) / 2, y: curY, size: titleSize, font: fontBold, color: green,
  });

  // 2ª linha: endereço · Tel: telefone
  curY -= 13;
  const subParts: string[] = [];
  if (clinic.business_address) subParts.push(clinic.business_address);
  if (clinic.business_phone) subParts.push(`Tel: ${clinic.business_phone}`);
  if (subParts.length) {
    const sub = fit(subParts.join("  ·  "), font, 9);
    const w = font.widthOfTextAtSize(sub, 9);
    page.drawText(sub, { x: (W - w) / 2, y: curY, size: 9, font, color: subColor });
    curY -= 11;
  }

  // 3ª linha: CNPJ · CRMV · Resp. Téc.
  const ids: string[] = [];
  if (clinic.business_cnpj) ids.push(`CNPJ: ${clinic.business_cnpj}`);
  if (clinic.crmv) ids.push(`CRMV: ${clinic.crmv}`);
  if (clinic.display_name && hasClinic) ids.push(`Resp. Téc.: ${clinic.display_name}`);
  else if (clinic.cpf && !hasClinic) ids.push(`CPF: ${clinic.cpf}`);
  if (ids.length) {
    const idLine = fit(ids.join("  ·  "), font, 9);
    const w = font.widthOfTextAtSize(idLine, 9);
    page.drawText(idLine, { x: (W - w) / 2, y: curY, size: 9, font, color: subColor });
    curY -= 6;
  }

  // Linha divisória verde
  page.drawLine({
    start: { x: margin, y: curY - 2 },
    end: { x: W - margin, y: curY - 2 },
    thickness: 1.2, color: green,
  });
}

function drawStdFields(page: PDFPage, font: PDFFont, type: TermType, pet: TermPet, owner: TermOwner) {
  const map = FIELD_MAPS[type];
  if (!map) return;
  const size = 10;
  const draw = (text: string | undefined | null, x: number, y: number, maxW: number) => {
    if (!text) return;
    const t = clip(String(text), maxW, font, size);
    page.drawText(t, { x, y: y + Y_NUDGE, size, font, color: rgb(0, 0, 0) });
  };
  draw(pet.name,              X_VAL.nomeAnimal, map.animalNome,    188);
  draw(pet.species,           X_VAL.especie,    map.animalEspecie, 200);
  draw(pet.breed,             X_VAL.raca,       map.animalRaca,    192);
  draw(pet.sex,               X_VAL.sexo,       map.animalSexo,    220);
  draw(pet.age,               X_VAL.idade,      map.animalIdade,   188);
  draw(pet.coat || pet.color, X_VAL.pelagem,    map.animalPelagem, 195);
  draw(owner.name,            X_VAL.nomeTutor,  map.tutorNome,     455);
  draw(owner.rg,              X_VAL.rg,         map.tutorRG,       205);
  draw(owner.cpf,             X_VAL.cpf,        map.tutorCPF,      225);
  draw(owner.address,         X_VAL.endereco,   map.tutorEndereco, 432);
  draw(owner.phone,           X_VAL.telefone,   map.tutorTelefone, 173);
  draw(owner.email,           X_VAL.email,      map.tutorEmail,    215);
}

/** Para o termo de recusa: preenche o campo "Informo que estou ciente da indicação de _____" */
function drawRecusaIndication(page: PDFPage, font: PDFFont, fields: TermFields) {
  const text = fields.indication || fields.recused || "";
  if (!text) return;
  const size = 10;
  // Linha que segue "Informo que estou ciente da indicação de" (parte superior do template)
  const x = 245;
  const y = 692;
  const maxW = 280;
  const t = clip(String(text), maxW, font, size);
  page.drawText(t, { x, y, size, font, color: rgb(0, 0, 0) });
}

/**
 * Mapeia o campo "principal" de cada termo de consentimento para um label legível
 * que será impresso na 2ª folha (Informações Complementares). Não escrevemos mais
 * sobre o template — evitando colisão com o texto pré-impresso.
 */
function getMainFieldEntry(type: TermType, fields: TermFields): { label: string; value: string } | null {
  const v = (s?: string) => (s && s.trim() ? s.trim() : "");
  switch (type) {
    case "exames":          return v(fields.exam)        ? { label: "Exame(s) autorizado(s):",       value: v(fields.exam) } : null;
    case "anestesico":      return v(fields.procedure)   ? { label: "Procedimento associado:",       value: v(fields.procedure) } : null;
    case "terapeutico":     return v(fields.procedure)   ? { label: "Procedimento terapêutico:",     value: v(fields.procedure) } : null;
    case "cirurgico":       return v(fields.procedure)   ? { label: "Procedimento cirúrgico:",       value: v(fields.procedure) } : null;
    case "internacao":      return v(fields.procedure)   ? { label: "Procedimentos previstos:",      value: v(fields.procedure) } : null;
    case "eutanasia":       return v(fields.cause)       ? { label: "Justificativa:",                value: v(fields.cause) } : null;
    case "retirada_obito":  return v(fields.destination) ? { label: "Destino do corpo:",             value: v(fields.destination) } : null;
    case "doacao_corpo":    return v(fields.institution) ? { label: "Instituição beneficiária:",     value: v(fields.institution) } : null;
    case "recusa":          return v(fields.recused)     ? { label: "Tratamento/exame recusado:",    value: v(fields.recused) } : null;
    default: return null;
  }
}

function appendExtraInfoPage(
  pdfDoc: PDFDocument, font: PDFFont, fontBold: PDFFont,
  type: TermType, fields: TermFields,
) {
  if (!CONSENT_TYPES.includes(type)) return;

  const mainEntry = getMainFieldEntry(type, fields);
  const hasObservations = !!(fields.observations && fields.observations.trim());
  const hasRisks = !!(fields.risks && fields.risks.trim());
  // Diagnóstico só aparece em internacao/eutanasia; nos demais não há esse campo no form.
  const hasDiag =
    !!(fields.diagnosis && fields.diagnosis.trim()) &&
    (type === "internacao" || type === "eutanasia");

  // 2ª folha SÓ quando há informação relevante a ser exibida.
  if (!mainEntry && !hasObservations && !hasRisks && !hasDiag) return;

  const page = pdfDoc.addPage([595.28, 841.89]);
  const W = page.getWidth();
  const H = page.getHeight();
  const margin = 56;
  let y = H - margin;

  page.drawText("Informações Complementares", { x: margin, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
  y -= 26;

  const writeBlock = (label: string, content: string) => {
    if (!content) return;
    page.drawText(label, { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
    const wrapped = wrapText(content, font, 11, W - margin * 2);
    for (const line of wrapped) {
      if (y < margin + 80) break;
      page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= 14;
    }
    y -= 8;
  };

  if (mainEntry) writeBlock(mainEntry.label, mainEntry.value);
  if (hasDiag) writeBlock("Diagnóstico / Suspeita clínica:", fields.diagnosis!);
  if (hasRisks) writeBlock("Riscos discutidos:", fields.risks!);
  if (hasObservations) writeBlock("Observações:", fields.observations!);

  if (y < margin + 90) y = margin + 90;
  y -= 10;
  page.drawText(`${fields.city || "_______________"}, ${fields.date}.`, {
    x: margin, y, size: 11, font, color: rgb(0, 0, 0),
  });
  y -= 60;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 220, y }, thickness: 0.6, color: rgb(0, 0, 0) });
  page.drawText("Assinatura do(a) Tutor(a)", { x: margin, y: y - 12, size: 9, font, color: rgb(0, 0, 0) });
  const vetX = W - margin - 220;
  page.drawLine({ start: { x: vetX, y }, end: { x: vetX + 220, y }, thickness: 0.6, color: rgb(0, 0, 0) });
  page.drawText("Assinatura e Carimbo do(a) Médico(a) Veterinário(a)", {
    x: vetX, y: y - 12, size: 9, font, color: rgb(0, 0, 0),
  });
}

// ============================================================
// GERAÇÃO DO ZERO — Atestados e Certificados (8 documentos)
// Layout padronizado: cabeçalho clínica → título → tabela de
// identificação → corpo específico → cidade/data → assinatura.
// ============================================================
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;

interface DrawCtx {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
}

function newPage(pdfDoc: PDFDocument, font: PDFFont, fontBold: PDFFont): DrawCtx {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  return { page, font, fontBold, y: PAGE_H - MARGIN };
}

function drawClinicHeaderScratch(ctx: DrawCtx, clinic: TermClinic, logo: PDFImage | null = null) {
  const { page, font, fontBold } = ctx;
  const W = PAGE_W;
  const startY = PAGE_H - MARGIN;
  const greenR = 20 / 255, greenG = 130 / 255, greenB = 100 / 255;
  const greenColor = rgb(greenR, greenG, greenB);

  const hasClinic = !!(clinic.business_name && clinic.business_name.trim());
  const title = hasClinic ? (clinic.business_name || "") : (clinic.display_name || "Médico(a) Veterinário(a)");
  const titleSize = 16;
  const safeTitle = clip(title, W - MARGIN * 2, fontBold, titleSize);
  const titleW = fontBold.widthOfTextAtSize(safeTitle, titleSize);
  page.drawText(safeTitle, {
    x: (W - titleW) / 2, y: startY, size: titleSize, font: fontBold, color: greenColor,
  });

  let curY = startY - 14;
  const subParts: string[] = [];
  if (clinic.business_address) subParts.push(clinic.business_address);
  if (clinic.business_phone) subParts.push(`Tel: ${clinic.business_phone}`);
  const sub = subParts.join("  ·  ");
  if (sub) {
    const safeSub = clip(sub, W - MARGIN * 2, font, 9);
    const w = font.widthOfTextAtSize(safeSub, 9);
    page.drawText(safeSub, { x: (W - w) / 2, y: curY, size: 9, font, color: rgb(0.33, 0.33, 0.33) });
    curY -= 12;
  }

  const ids: string[] = [];
  if (clinic.business_cnpj) ids.push(`CNPJ: ${clinic.business_cnpj}`);
  if (clinic.crmv) ids.push(`CRMV: ${clinic.crmv}`);
  if (clinic.display_name && hasClinic) ids.push(`Resp. Téc.: ${clinic.display_name}`);
  const idLine = ids.join("  ·  ");
  if (idLine) {
    const safeId = clip(idLine, W - MARGIN * 2, font, 9);
    const w = font.widthOfTextAtSize(safeId, 9);
    page.drawText(safeId, { x: (W - w) / 2, y: curY, size: 9, font, color: rgb(0.33, 0.33, 0.33) });
    curY -= 12;
  }

  // Linha divisória verde (estilo receituário)
  const divY = curY - 4;
  page.drawLine({
    start: { x: MARGIN, y: divY },
    end: { x: W - MARGIN, y: divY },
    thickness: 1.2, color: greenColor,
  });

  ctx.y = divY - 22;
}

function drawTitle(ctx: DrawCtx, title: string) {
  const w = ctx.fontBold.widthOfTextAtSize(title, 14);
  ctx.page.drawText(title, {
    x: (PAGE_W - w) / 2, y: ctx.y, size: 14, font: ctx.fontBold, color: rgb(0, 0, 0),
  });
  ctx.y -= 26;
}

/** Tabela de identificação do animal e tutor (com bordas), padrão para todos os atestados. */
function drawIdentificationTable(ctx: DrawCtx, pet: TermPet, owner: TermOwner) {
  const { page, font, fontBold } = ctx;
  const x0 = MARGIN;
  const x1 = PAGE_W - MARGIN;
  const w = x1 - x0;
  const headerH = 18;
  const rowH = 32; // mais alto para acomodar label + valor sem sobreposição
  const startY = ctx.y;
  const dataRows = 5; // espécie, sexo, microchip, tutor, endereço
  const tableH = headerH + rowH * dataRows;

  // Borda externa
  page.drawRectangle({
    x: x0, y: startY - tableH, width: w, height: tableH,
    borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 0.6,
  });

  // Faixa do título
  page.drawRectangle({
    x: x0, y: startY - headerH, width: w, height: headerH, color: rgb(0.93, 0.93, 0.93),
  });
  page.drawText("IDENTIFICAÇÃO", {
    x: x0 + 8, y: startY - headerH + 6, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });

  // Linhas horizontais separando as data rows
  for (let i = 1; i <= dataRows; i++) {
    const y = startY - headerH - i * rowH;
    if (i < dataRows) {
      page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 0.4, color: rgb(0.75, 0.75, 0.75) });
    }
  }

  // Helper: desenha uma célula com label em cima e valor embaixo, com padding
  const cell = (label: string, value: string | null | undefined, x: number, rowTop: number, cellW: number) => {
    page.drawText(label, {
      x: x + 6, y: rowTop - 11, size: 7.5, font, color: rgb(0.45, 0.45, 0.45),
    });
    page.drawText(clip(value || "—", cellW - 12, font, 10), {
      x: x + 6, y: rowTop - 24, size: 10, font, color: rgb(0, 0, 0),
    });
  };

  // Helper: linha vertical entre colunas (apenas dentro da row)
  const vline = (x: number, rowTop: number) => {
    page.drawLine({
      start: { x, y: rowTop }, end: { x, y: rowTop - rowH },
      thickness: 0.4, color: rgb(0.75, 0.75, 0.75),
    });
  };

  // Row 1: Animal | Espécie | Raça
  let rowTop = startY - headerH;
  vline(x0 + w / 3, rowTop);
  vline(x0 + 2 * w / 3, rowTop);
  cell("Animal", pet.name, x0, rowTop, w / 3);
  cell("Espécie", pet.species, x0 + w / 3, rowTop, w / 3);
  cell("Raça", pet.breed, x0 + 2 * w / 3, rowTop, w / 3);

  // Row 2: Sexo | Idade | Pelagem/Cor
  rowTop = startY - headerH - rowH;
  vline(x0 + w / 3, rowTop);
  vline(x0 + 2 * w / 3, rowTop);
  cell("Sexo", pet.sex, x0, rowTop, w / 3);
  cell("Idade", pet.age, x0 + w / 3, rowTop, w / 3);
  cell("Pelagem/Cor", pet.coat || pet.color, x0 + 2 * w / 3, rowTop, w / 3);

  // Row 3: Microchip (linha cheia)
  rowTop = startY - headerH - 2 * rowH;
  cell("Microchip / Identificação", pet.microchip, x0, rowTop, w);

  // Row 4: Tutor | CPF
  rowTop = startY - headerH - 3 * rowH;
  vline(x0 + w * 0.6, rowTop);
  cell("Tutor(a)", owner.name, x0, rowTop, w * 0.6);
  cell("CPF", owner.cpf, x0 + w * 0.6, rowTop, w * 0.4);

  // Row 5: Endereço | Telefone
  rowTop = startY - headerH - 4 * rowH;
  vline(x0 + w * 0.7, rowTop);
  cell("Endereço", owner.address, x0, rowTop, w * 0.7);
  cell("Telefone", owner.phone, x0 + w * 0.7, rowTop, w * 0.3);

  ctx.y = startY - tableH - 20;
}

function drawParagraph(ctx: DrawCtx, text: string, opts: { size?: number; bold?: boolean; gap?: number; indent?: number } = {}) {
  const size = opts.size ?? 11;
  const bold = opts.bold ?? false;
  const gap = opts.gap ?? 4;
  const indent = opts.indent ?? 0;
  const f = bold ? ctx.fontBold : ctx.font;
  const lines = wrapText(text, f, size, PAGE_W - MARGIN * 2 - indent);
  for (const line of lines) {
    if (ctx.y < MARGIN + 80) return;
    ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y, size, font: f, color: rgb(0, 0, 0) });
    ctx.y -= size + 3;
  }
  ctx.y -= gap;
}

function drawLabeledBlock(ctx: DrawCtx, label: string, value?: string) {
  if (!value || !value.trim()) return;
  if (ctx.y < MARGIN + 100) return;
  ctx.page.drawText(label, { x: MARGIN, y: ctx.y, size: 10, font: ctx.fontBold, color: rgb(0.15, 0.15, 0.15) });
  ctx.y -= 14;
  drawParagraph(ctx, value, { size: 11, gap: 8 });
}

function drawSignature(ctx: DrawCtx, clinic: TermClinic, fields: TermFields) {
  // Garantir espaço mínimo (cidade/data + assinatura)
  if (ctx.y < MARGIN + 110) {
    // Não tem espaço — desenha rente ao final
    ctx.y = MARGIN + 110;
  }
  const localDate = `${fields.city || "_______________"}, ${fields.date || ""}.`;
  ctx.page.drawText(localDate, { x: MARGIN, y: ctx.y, size: 11, font: ctx.font, color: rgb(0, 0, 0) });
  ctx.y -= 70;

  const sigW = 260;
  const sigX = (PAGE_W - sigW) / 2;
  ctx.page.drawLine({
    start: { x: sigX, y: ctx.y }, end: { x: sigX + sigW, y: ctx.y },
    thickness: 0.6, color: rgb(0, 0, 0),
  });
  const vetName = clinic.display_name || "Médico(a) Veterinário(a)";
  const vw = ctx.font.widthOfTextAtSize(vetName, 10);
  ctx.page.drawText(vetName, { x: (PAGE_W - vw) / 2, y: ctx.y - 12, size: 10, font: ctx.fontBold, color: rgb(0, 0, 0) });
  if (clinic.crmv) {
    const c = `CRMV: ${clinic.crmv}`;
    const cw = ctx.font.widthOfTextAtSize(c, 9);
    ctx.page.drawText(c, { x: (PAGE_W - cw) / 2, y: ctx.y - 24, size: 9, font: ctx.font, color: rgb(0.25, 0.25, 0.25) });
  }
}

// ============================================================
// CORPOS ESPECÍFICOS DE CADA ATESTADO
// ============================================================
function buildAttestation(
  pdfDoc: PDFDocument, font: PDFFont, fontBold: PDFFont,
  type: TermType, clinic: TermClinic, pet: TermPet, owner: TermOwner, fields: TermFields,
  logo: PDFImage | null = null,
) {
  const ctx = newPage(pdfDoc, font, fontBold);
  drawLogoWatermark(ctx.page, logo);
  drawClinicHeaderScratch(ctx, clinic, logo);
  drawTitle(ctx, TERM_LABELS[type].toUpperCase());
  drawIdentificationTable(ctx, pet, owner);

  switch (type) {
    case "atestado_sanitario": {
      drawParagraph(ctx,
        `Atesto, para os devidos fins, que o animal acima identificado encontra-se clinicamente saudável, ` +
        `apresentando bom estado geral, sem sinais clínicos sugestivos de enfermidades infectocontagiosas ` +
        `no momento do exame clínico realizado nesta data.`,
      );
      drawLabeledBlock(ctx, "Observações:", fields.observations);
      break;
    }

    case "atestado_sanitario_internacional":
    case "atestado_transito": {
      const isIntl = type === "atestado_sanitario_internacional";
      drawParagraph(ctx,
        isIntl
          ? `Atesto, para fins de TRÂNSITO INTERNACIONAL, que o animal acima identificado foi submetido a exame clínico nesta data, encontrando-se em bom estado geral de saúde, sem sinais clínicos de doenças infectocontagiosas e apto a viajar.`
          : `Atesto, para fins de TRÂNSITO INTERESTADUAL/MUNICIPAL, que o animal acima identificado foi submetido a exame clínico nesta data, encontrando-se hígido, sem sinais clínicos de doenças infectocontagiosas, e apto ao transporte.`,
      );
      drawLabeledBlock(ctx, "Vacinação Antirrábica:", fields.vaccine);
      if (fields.vaccineBatch || fields.vaccineApplicationDate || fields.vaccineValidUntil || fields.vaccineManufacturer) {
        const parts = [
          fields.vaccineManufacturer ? `Fabricante: ${fields.vaccineManufacturer}` : "",
          fields.vaccineBatch ? `Lote: ${fields.vaccineBatch}` : "",
          fields.vaccineApplicationDate ? `Aplicação: ${fields.vaccineApplicationDate}` : "",
          fields.vaccineValidUntil ? `Válida até: ${fields.vaccineValidUntil}` : "",
        ].filter(Boolean).join(" · ");
        drawParagraph(ctx, parts, { size: 10 });
      }

      // Tratamento Antiparasitário
      const hasAnti =
        fields.antiparasiticInternal || fields.antiparasiticInternalLab || fields.antiparasiticInternalDate ||
        fields.antiparasiticExternal || fields.antiparasiticExternalLab || fields.antiparasiticExternalDate;
      if (hasAnti) {
        ctx.page.drawText("Tratamento Antiparasitário:", { x: MARGIN, y: ctx.y, size: 10, font: ctx.fontBold, color: rgb(0.15, 0.15, 0.15) });
        ctx.y -= 14;
        if (fields.antiparasiticInternal || fields.antiparasiticInternalLab || fields.antiparasiticInternalDate) {
          const interno = [
            `Interno: ${fields.antiparasiticInternal || "—"}`,
            fields.antiparasiticInternalLab ? `Lab: ${fields.antiparasiticInternalLab}` : "",
            fields.antiparasiticInternalDate ? `Data: ${fields.antiparasiticInternalDate}` : "",
          ].filter(Boolean).join(" · ");
          drawParagraph(ctx, interno, { size: 10, gap: 2 });
        }
        if (fields.antiparasiticExternal || fields.antiparasiticExternalLab || fields.antiparasiticExternalDate) {
          const externo = [
            `Externo: ${fields.antiparasiticExternal || "—"}`,
            fields.antiparasiticExternalLab ? `Lab: ${fields.antiparasiticExternalLab}` : "",
            fields.antiparasiticExternalDate ? `Data: ${fields.antiparasiticExternalDate}` : "",
          ].filter(Boolean).join(" · ");
          drawParagraph(ctx, externo, { size: 10, gap: 6 });
        }
      }

      drawLabeledBlock(ctx, "Observações:", fields.observations);
      break;
    }

    case "atestado_obito": {
      drawParagraph(ctx,
        `Atesto, para os devidos fins, o ÓBITO do animal acima identificado, ocorrido nas seguintes condições:`,
      );
      const linha = [
        fields.deathDate ? `Data: ${fields.deathDate}` : "",
        fields.deathTime ? `Hora: ${fields.deathTime}` : "",
        fields.deathLocation ? `Local: ${fields.deathLocation}` : "",
      ].filter(Boolean).join("    ·    ");
      if (linha) drawParagraph(ctx, linha, { size: 10 });
      drawLabeledBlock(ctx, "Causa mortis:", fields.deathCause);
      drawLabeledBlock(ctx, "Observações:", fields.observations);
      break;
    }

    case "solicitacao_exames": {
      drawParagraph(ctx, `Solicito a realização do(s) exame(s) abaixo discriminado(s) para o paciente acima identificado:`);
      drawLabeledBlock(ctx, "Exame(s) solicitado(s):", fields.examRequest);
      drawLabeledBlock(ctx, "Histórico clínico:", fields.history);
      drawLabeledBlock(ctx, "Suspeita clínica:", fields.clinicalSuspicion);
      drawLabeledBlock(ctx, "Observações:", fields.observations);
      break;
    }

    case "encaminhamento": {
      const intro = fields.specialistArea
        ? `Encaminho o paciente acima identificado ao(à) profissional/serviço de ${fields.specialistArea} para avaliação especializada.`
        : `Encaminho o paciente acima identificado para avaliação especializada.`;
      drawParagraph(ctx, intro);
      drawLabeledBlock(ctx, "Suspeita clínica:", fields.clinicalSuspicion);
      drawLabeledBlock(ctx, "Exames realizados:", fields.examsDone);
      drawLabeledBlock(ctx, "Medicações em uso:", fields.medications);
      drawLabeledBlock(ctx, "Observações:", fields.observations);
      break;
    }

    case "declaracao_comparecimento": {
      const dia = fields.attendanceDate || fields.date || "____/____/______";
      const de = fields.attendanceFrom || "__:__";
      const ate = fields.attendanceTo || "__:__";
      const tutor = owner.name || "________________";
      drawParagraph(ctx,
        `Declaro, para os devidos fins, que o(a) Sr.(a) ${tutor} compareceu a este estabelecimento ` +
        `veterinário no dia ${dia}, no período das ${de} às ${ate} horas, acompanhando o animal acima identificado ` +
        `para atendimento veterinário.`,
      );
      drawLabeledBlock(ctx, "Observações:", fields.observations);
      break;
    }

    case "certificado_vacinacao": {
      drawParagraph(ctx,
        `Certifico, para os devidos fins, que o animal acima identificado foi VACINADO conforme dados abaixo:`,
      );
      // Mini tabela de vacina
      const x0 = MARGIN;
      const x1 = PAGE_W - MARGIN;
      const w = x1 - x0;
      const rowH = 16;
      const rows: Array<[string, string | undefined]> = [
        ["Vacina", fields.vaccine],
        ["Nome comercial", fields.vaccineCommercial],
        ["Fabricante", fields.vaccineManufacturer],
        ["Lote / Partida", fields.vaccineBatch],
        ["Data fabricação", fields.vaccineFabDate],
        ["Validade", fields.vaccineExpDate],
        ["Data aplicação", fields.vaccineApplicationDate || fields.date],
      ];
      const tableH = rowH * rows.length;
      ctx.page.drawRectangle({
        x: x0, y: ctx.y - tableH, width: w, height: tableH,
        borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 0.6,
      });
      ctx.page.drawLine({
        start: { x: x0 + 130, y: ctx.y - tableH },
        end: { x: x0 + 130, y: ctx.y },
        thickness: 0.6, color: rgb(0.2, 0.2, 0.2),
      });
      rows.forEach(([label, value], i) => {
        const ry = ctx.y - rowH * i;
        if (i > 0) {
          ctx.page.drawLine({
            start: { x: x0, y: ry }, end: { x: x1, y: ry },
            thickness: 0.3, color: rgb(0.7, 0.7, 0.7),
          });
        }
        ctx.page.drawText(label, { x: x0 + 6, y: ry - 11, size: 9, font: ctx.fontBold, color: rgb(0.2, 0.2, 0.2) });
        ctx.page.drawText(clip(value || "—", w - 142, ctx.font, 10), {
          x: x0 + 138, y: ry - 11, size: 10, font: ctx.font, color: rgb(0, 0, 0),
        });
      });
      ctx.y -= tableH + 14;
      drawLabeledBlock(ctx, "Observações:", fields.observations);
      break;
    }
  }

  drawSignature(ctx, clinic, fields);
}

// ============================================================
// ENTRYPOINT
// ============================================================
export async function generateVetTermPDF(
  type: TermType,
  clinic: TermClinic,
  pet: TermPet,
  owner: TermOwner,
  fields: TermFields,
  options: { autoDownload?: boolean } = {},
): Promise<Blob> {
  const autoDownload = options.autoDownload !== false;
  let pdfDoc: PDFDocument;
  let font: PDFFont;
  let fontBold: PDFFont;

  if (CONSENT_TYPES.includes(type)) {
    // Termos de consentimento — usa template PDF
    const url = TEMPLATE_PATH[type];
    if (!url) throw new Error(`Template não encontrado para ${type}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao carregar modelo do termo (${url})`);
    const templateBytes = await res.arrayBuffer();
    pdfDoc = await PDFDocument.load(templateBytes);
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedClinicLogo(pdfDoc, clinic.logo_url);
    const page = pdfDoc.getPage(0);
    drawLogoWatermark(page, logo);
    drawHeaderOnTemplate(page, font, fontBold, clinic);
    if (FIELD_MAPS[type]) drawStdFields(page, font, type, pet, owner);
    if (type === "recusa") drawRecusaIndication(page, font, fields);
    appendExtraInfoPage(pdfDoc, font, fontBold, type, fields);
  } else {
    // Atestados/certificados — gerados do zero, layout padronizado
    pdfDoc = await PDFDocument.create();
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedClinicLogo(pdfDoc, clinic.logo_url);
    buildAttestation(pdfDoc, font, fontBold, type, clinic, pet, owner, fields, logo);
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  if (autoDownload) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${type}_${(pet.name || "animal").replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  }
  return blob;
}
