import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ClipboardList, Stethoscope, FileText, Pill, AlertTriangle,
} from "lucide-react";
import type { Protocol } from "@/pages/admin/AdminProtocolos";

function Section({ icon: Icon, title, content, variant }: {
  icon: React.ElementType;
  title: string;
  content: string | null;
  variant?: "warning";
}) {
  if (!content) return null;
  const isWarning = variant === "warning";
  return (
    <div className={`rounded-xl border p-4 ${isWarning ? "bg-amber-50 dark:bg-amber-950/20 border-transparent" : "bg-muted/40 border-border/60"}`}>
      <div className={`text-sm font-bold mb-3 flex items-center gap-2 ${isWarning ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
        <span className={`flex items-center justify-center w-7 h-7 rounded-lg border ${isWarning ? "bg-amber-50 dark:bg-amber-950/20" : "bg-background"}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isWarning ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
        {content}
      </p>
    </div>
  );
}

export default function ProtocoloDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("protocols" as any)
      .select("id,title,species,condition,description,steps,medications,notes,image_url")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setProtocol((data as unknown as Protocol) ?? null);
        setLoading(false);
      });
  }, [id]);

  const species = protocol?.species
    ? protocol.species.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse text-sm">
        Carregando protocolo...
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ClipboardList className="w-12 h-12 opacity-20" />
        <p className="text-sm">Protocolo não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
        <ChevronLeft className="h-4 w-4 mr-1" /> Voltar aos protocolos
      </Button>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {protocol.image_url && (
            <div className="w-full overflow-hidden rounded-lg bg-muted/30 flex items-center justify-center" style={{ maxHeight: 200 }}>
              <img
                src={protocol.image_url}
                alt={protocol.title}
                className="max-h-48 w-auto object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight">{protocol.title}</h1>
              {protocol.condition && (
                <p className="text-sm text-primary font-medium mt-1 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" /> {protocol.condition}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {species.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <Section icon={ClipboardList} title="Descrição" content={protocol.description} />
            <Section icon={FileText} title="Etapas do Protocolo" content={protocol.steps} />
            <Section icon={Pill} title="Medicamentos" content={protocol.medications} />
            <Section icon={AlertTriangle} title="Observações" content={protocol.notes} variant="warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
