import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Renderiza um PDF (Blob) como imagens em canvas usando pdf.js.
// Funciona dentro de iframes sandboxed (preview do Lovable, etc.) onde
// o visualizador de PDF nativo do Chrome é bloqueado.
export function PdfPreview({ blob }: { blob: Blob }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pdfDocument: { destroy: () => void } | null = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const pdfjs = await import("pdfjs-dist");
        // Worker via CDN — evita problemas de bundling com Vite
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await blob.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        if (cancelled) { pdf.destroy(); return; }
        pdfDocument = pdf;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const containerWidth = container.clientWidth - 32; // padding

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, containerWidth / baseViewport.width);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          const dpr = window.devicePixelRatio || 1;
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "shadow-md bg-white mb-4 mx-auto block";
          ctx.scale(dpr, dpr);

          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        console.error("[PdfPreview] erro:", e);
        if (!cancelled) {
          setError("Não foi possível renderizar o PDF. Tente baixar.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pdfDocument) {
        try { pdfDocument.destroy(); } catch { /* noop */ }
      }
    };
  }, [blob]);

  return (
    <div className="relative w-full h-full overflow-auto bg-muted p-4">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando PDF…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="min-h-full" />
    </div>
  );
}
