import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  logoUrl: string | null;
  onChange: (url: string | null) => void;
}

const MAX_SIZE_MB = 2;

export function ClinicLogoUpload({ logoUrl, onChange }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  useEffect(() => setPreview(logoUrl), [logoUrl]);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/i.test(file.type)) {
      toast.error("Use uma imagem PNG, JPG, WEBP ou SVG.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Imagem muito grande (máx. ${MAX_SIZE_MB} MB).`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/logo.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("clinic-logos")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("clinic-logos").getPublicUrl(path);
      // bust cache so the new logo shows immediately
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setPreview(url);
      onChange(url);
      toast.success("Logo enviada com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha no upload: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!user || !preview) return;
    setUploading(true);
    try {
      // Tenta apagar todas variações conhecidas (png/jpg/webp/svg)
      const exts = ["png", "jpg", "jpeg", "webp", "svg"];
      await Promise.all(
        exts.map((e) => supabase.storage.from("clinic-logos").remove([`${user.id}/logo.${e}`])),
      );
      setPreview(null);
      onChange(null);
      toast.success("Logo removida.");
    } catch (e: any) {
      toast.error("Erro ao remover: " + (e?.message ?? "erro"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Logo da clínica</Label>
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 rounded-lg border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
          {preview ? (
            <img src={preview} alt="Logo da clínica" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>
        <div className="space-y-2 flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {preview ? "Trocar logo" : "Enviar logo"}
            </Button>
            {preview && (
              <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={handleRemove}>
                <X className="h-4 w-4 mr-2" /> Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            PNG/JPG/SVG quadrado, máx. {MAX_SIZE_MB} MB. Aparece no cabeçalho dos receituários, atestados e termos — e como marca d'água sutil.
          </p>
        </div>
      </div>
    </div>
  );
}
