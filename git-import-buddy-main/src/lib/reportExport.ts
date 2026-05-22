import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { loadLogoForPdf } from "./logoLoader";

export interface ReportSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface CompanyInfo {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

export async function fetchCompanyInfo(userId: string): Promise<CompanyInfo> {
  const { data } = await supabase
    .from("profiles")
    .select("business_name, business_cnpj, business_address, business_phone, logo_url, display_name")
    .eq("user_id", userId)
    .maybeSingle();
  const p: any = data ?? {};
  return {
    name: p.business_name || p.display_name || "SystemHub",
    cnpj: p.business_cnpj,
    address: p.business_address,
    phone: p.business_phone,
    logoUrl: p.logo_url,
  };
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadXLSX(opts: {
  filename: string;
  sections: ReportSection[];
  summary?: { label: string; value: string }[];
  title?: string;
  subtitle?: string;
  company?: CompanyInfo;
}) {
  const wb = XLSX.utils.book_new();

  // Resumo sheet
  const summaryAoA: any[][] = [];
  if (opts.company) {
    summaryAoA.push([opts.company.name]);
    if (opts.company.cnpj) summaryAoA.push([`CNPJ: ${opts.company.cnpj}`]);
    if (opts.company.address) summaryAoA.push([opts.company.address]);
    if (opts.company.phone) summaryAoA.push([`Tel: ${opts.company.phone}`]);
    summaryAoA.push([]);
  }
  if (opts.title) summaryAoA.push([opts.title]);
  if (opts.subtitle) summaryAoA.push([opts.subtitle]);
  summaryAoA.push([`Gerado em ${new Date().toLocaleString("pt-BR")}`]);
  summaryAoA.push([]);
  if (opts.summary?.length) {
    summaryAoA.push(opts.summary.map((s) => s.label));
    summaryAoA.push(opts.summary.map((s) => s.value));
  }
  const wsResumo = XLSX.utils.aoa_to_sheet(summaryAoA);
  wsResumo["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  opts.sections.forEach((sec, i) => {
    const aoa = [sec.headers, ...sec.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = sec.headers.map((h) => ({ wch: Math.max(12, Math.min(40, h.length + 6)) }));
    const safeName = sec.title.replace(/[\\/?*[\]:]/g, " ").slice(0, 28) || `Aba ${i + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  const fname = opts.filename.endsWith(".xlsx") ? opts.filename : `${opts.filename}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export async function downloadReportPDF(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  summary?: { label: string; value: string }[];
  sections: ReportSection[];
  company?: CompanyInfo;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 12;

  const company = opts.company;
  const logo = company?.logoUrl ? await loadLogoForPdf(company.logoUrl) : null;

  // Cabeçalho com logo + dados da empresa
  if (company || logo) {
    let textX = 14;
    if (logo) {
      const targetH = 18;
      const ratio = logo.width / logo.height;
      const targetW = Math.min(40, targetH * ratio);
      try {
        doc.addImage(logo.dataUrl, logo.format, 14, cursorY, targetW, targetH);
        textX = 14 + targetW + 6;
      } catch (e) {
        console.warn("addImage failed", e);
      }
    }
    if (company) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(22, 163, 134);
      doc.text(company.name, textX, cursorY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80);
      let ly = cursorY + 10;
      if (company.cnpj) { doc.text(`CNPJ: ${company.cnpj}`, textX, ly); ly += 4; }
      if (company.address) { doc.text(String(company.address), textX, ly); ly += 4; }
      if (company.phone) { doc.text(`Tel: ${company.phone}`, textX, ly); ly += 4; }
    }
    cursorY += 22;
    doc.setDrawColor(22, 163, 134);
    doc.setLineWidth(0.5);
    doc.line(14, cursorY, pageWidth - 14, cursorY);
    cursorY += 5;
  }

  doc.setTextColor(0);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(opts.title, pageWidth / 2, cursorY + 5, { align: "center" });
  cursorY += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  if (opts.subtitle) { doc.text(opts.subtitle, pageWidth / 2, cursorY + 4, { align: "center" }); cursorY += 5; }
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, cursorY + 4, { align: "center" });
  cursorY += 9;
  doc.setTextColor(0);

  if (opts.summary?.length) {
    autoTable(doc, {
      startY: cursorY,
      head: [opts.summary.map((s) => s.label)],
      body: [opts.summary.map((s) => s.value)],
      theme: "grid",
      headStyles: { fillColor: [22, 163, 134] },
      styles: { fontSize: 9, halign: "center" },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  opts.sections.forEach((sec) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(sec.title, 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 2,
      head: [sec.headers],
      body: sec.rows.length ? sec.rows : [["Sem dados"]],
      theme: "striped",
      headStyles: { fillColor: [22, 163, 134] },
      styles: { fontSize: 8 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 8;
  });

  // Rodapé com paginação
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `${company?.name ?? "SystemHub"} — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  doc.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
}
