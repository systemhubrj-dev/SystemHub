import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, FileText, Download, Eye, Loader2 } from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_url: string; // armazena o PATH no bucket (não URL pública)
  description: string | null;
  category: string;
  created_at: string;
}

interface PetAttachmentsProps {
  petId: string;
  attachments: Attachment[];
  onRefresh: () => void;
}

const BUCKET = "pet-attachments";

const CATEGORIES = [
  { value: "document", label: "Documento" },
  { value: "radiograph", label: "Radiografia" },
  { value: "photo", label: "Foto" },
  { value: "lab_result", label: "Resultado de exame" },
  { value: "other", label: "Outro" },
];

/** Extrai o path dentro do bucket, mesmo se file_url já tiver sido salvo como URL antiga. */
function pathFromUrl(value: string): string {
  if (!value) return "";
  const marker = `/${BUCKET}/`;
  const idx = value.indexOf(marker);
  if (idx >= 0) return value.substring(idx + marker.length);
  // Já é um path puro (formato novo)
  return value.replace(/^\/+/, "");
}

export default function PetAttachments({ petId, attachments, onRefresh }: PetAttachmentsProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("document");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Preview
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"image" | "pdf" | "other">("other");
  const [previewName, setPreviewName] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Cache de signed URLs para thumbnails de imagem
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const imgs = attachments.filter(a => a.file_type?.startsWith("image/"));
      if (imgs.length === 0) return;
      const next: Record<string, string> = {};
      for (const a of imgs) {
        if (thumbUrls[a.id]) {
          next[a.id] = thumbUrls[a.id];
          continue;
        }
        const path = pathFromUrl(a.file_url);
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (cancelled) return;
        if (data?.signedUrl) next[a.id] = data.signedUrl;
      }
      if (!cancelled && Object.keys(next).length) setThumbUrls((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx. 10MB)");
        return;
      }
      setSelectedFile(file);
      setUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      const path = `${user.id}/${petId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, selectedFile, { contentType: selectedFile.type, upsert: false });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("pet_attachments" as any).insert({
        user_id: user.id,
        pet_id: petId,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        file_url: path, // grava só o PATH; vamos gerar signed URL sob demanda
        description: description || null,
        category,
      } as any);

      if (dbError) throw dbError;

      toast.success("Arquivo enviado com sucesso!");
      setUploadDialog(false);
      setSelectedFile(null);
      setDescription("");
      setCategory("document");
      if (fileRef.current) fileRef.current.value = "";
      onRefresh();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (att: Attachment) => {
    if (!user) return;
    const path = pathFromUrl(att.file_url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    const { error } = await supabase.from("pet_attachments" as any).delete().eq("id", att.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Arquivo excluído!"); onRefresh(); }
  };

  const openPreview = async (att: Attachment) => {
    setPreviewLoading(true);
    setPreviewDialog(true);
    setPreviewName(att.file_name);
    try {
      const path = pathFromUrl(att.file_url);
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw error || new Error("Falha ao gerar link");
      setPreviewUrl(data.signedUrl);
      const t = att.file_type || "";
      if (t.startsWith("image/")) setPreviewKind("image");
      else if (t === "application/pdf" || att.file_name.toLowerCase().endsWith(".pdf")) setPreviewKind("pdf");
      else setPreviewKind("other");
    } catch (e: any) {
      toast.error("Não foi possível abrir o arquivo: " + (e.message || "erro desconhecido"));
      setPreviewDialog(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadAttachment = async (att: Attachment) => {
    try {
      const path = pathFromUrl(att.file_url);
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, { download: att.file_name });
      if (error || !data?.signedUrl) throw error || new Error("Falha ao gerar link");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error("Erro ao baixar: " + e.message);
    }
  };

  const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  const isImage = (type: string | null) => !!type?.startsWith("image/");
  const isPdf = (type: string | null, name?: string) =>
    type === "application/pdf" || !!name?.toLowerCase().endsWith(".pdf");
  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
        />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3 mr-1" /> Enviar arquivo
        </Button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum arquivo enviado</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="border rounded-lg p-3 text-sm flex items-start gap-3">
              {isImage(att.file_type) && thumbUrls[att.id] ? (
                <button onClick={() => openPreview(att)} className="shrink-0">
                  <img src={thumbUrls[att.id]} alt={att.file_name} className="w-16 h-16 object-cover rounded border" />
                </button>
              ) : (
                <button
                  onClick={() => openPreview(att)}
                  className="w-16 h-16 flex items-center justify-center bg-muted rounded border shrink-0 hover:bg-muted/80"
                  title="Visualizar"
                >
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium text-xs truncate">{att.file_name}</p>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">{getCategoryLabel(att.category)}</Badge>
                  {att.file_size && <span className="text-[10px] text-muted-foreground">{formatSize(att.file_size)}</span>}
                </div>
                {att.description && <p className="text-[10px] text-muted-foreground">{att.description}</p>}
                <div className="flex gap-1">
                  {(isImage(att.file_type) || isPdf(att.file_type, att.file_name)) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openPreview(att)} title="Visualizar">
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadAttachment(att)} title="Baixar">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(att)} title="Excluir">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadDialog} onOpenChange={(o) => { if (!o) { setUploadDialog(false); setSelectedFile(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar arquivo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm"><strong>Arquivo:</strong> {selectedFile?.name}</p>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do arquivo..." />
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewDialog} onOpenChange={(o) => { if (!o) { setPreviewDialog(false); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base truncate">{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted">
            {previewLoading && (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!previewLoading && previewUrl && previewKind === "image" && (
              <div className="h-full overflow-auto p-4 flex items-center justify-center">
                <img src={previewUrl} alt={previewName} className="max-w-full max-h-full object-contain" />
              </div>
            )}
            {!previewLoading && previewUrl && previewKind === "pdf" && (
              <iframe src={previewUrl} title={previewName} className="w-full h-full bg-white" />
            )}
            {!previewLoading && previewUrl && previewKind === "other" && (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pré-visualização indisponível para este tipo de arquivo.</p>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="underline text-sm">Abrir em nova aba</a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
