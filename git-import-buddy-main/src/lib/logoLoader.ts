/**
 * Carrega a logo da clínica do Storage e converte para data URL,
 * pronta para ser embutida em PDFs (jspdf / pdf-lib).
 *
 * Retorna null se não houver logo, ou em caso de falha — os geradores
 * de PDF devem cair de volta para o layout sem logo.
 */
export interface LoadedLogo {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
  bytes: Uint8Array;
}

export async function loadLogoForPdf(logoUrl: string | null | undefined): Promise<LoadedLogo | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const isJpeg = blob.type.includes("jpeg") || blob.type.includes("jpg");
    const isPng = blob.type.includes("png");
    // SVG e outros: rasteriza via canvas
    if (!isJpeg && !isPng) {
      const rasterized = await rasterizeToPng(blob);
      return rasterized;
    }

    // Lê dimensões via Image
    const dataUrl = await blobToDataUrl(blob);
    const dims = await getImageDimensions(dataUrl);
    return {
      dataUrl,
      format: isPng ? "PNG" : "JPEG",
      width: dims.width,
      height: dims.height,
      bytes,
    };
  } catch (e) {
    console.warn("loadLogoForPdf failed:", e);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

async function rasterizeToPng(blob: Blob): Promise<LoadedLogo | null> {
  try {
    const url = URL.createObjectURL(blob);
    const dims = await getImageDimensions(url);
    const canvas = document.createElement("canvas");
    canvas.width = dims.width || 256;
    canvas.height = dims.height || 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const img = new Image();
    img.src = url;
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = rej;
    });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1] || "";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return { dataUrl, format: "PNG", width: canvas.width, height: canvas.height, bytes };
  } catch {
    return null;
  }
}
