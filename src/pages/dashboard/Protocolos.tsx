import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Search, Stethoscope, ArrowRight } from "lucide-react";
import type { Protocol } from "@/pages/admin/AdminProtocolos";

function ProtocolCard({ p, detailBase }: { p: Protocol; detailBase: string }) {
  const species = p.species
    ? p.species.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const summary = p.description
    ? p.description.length > 140
      ? p.description.slice(0, 137) + "..."
      : p.description
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3 flex-1">
        {p.image_url && (
          <img
            src={p.image_url}
            alt={p.title}
            className="w-full max-h-36 object-contain rounded-lg bg-muted/30 mb-3"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-base leading-snug">{p.title}</CardTitle>
          <div className="flex flex-wrap gap-1 shrink-0">
            {species.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        </div>
        {p.condition && (
          <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
            <Stethoscope className="w-3 h-3" /> {p.condition}
          </p>
        )}
        {summary && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">{summary}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Link to={`${detailBase}/${p.id}`}>
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            Ver protocolo <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Protocolos() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("todas");
  const location = useLocation();

  const detailBase = location.pathname.startsWith("/dashboard")
    ? "/dashboard/protocolos"
    : "/protocolos";

  useEffect(() => {
    supabase
      .from("protocols" as any)
      .select("id,title,species,condition,description,steps,medications,notes,image_url")
      .order("title")
      .then(({ data }) => {
        setProtocols((data as unknown as Protocol[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  const allSpecies = Array.from(
    new Set(
      protocols.flatMap((p) =>
        (p.species ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      )
    )
  ).sort();

  const filtered = protocols.filter((p) => {
    const search = q.toLowerCase();
    const matchesQ =
      !q.trim() ||
      p.title.toLowerCase().includes(search) ||
      (p.condition?.toLowerCase().includes(search)) ||
      (p.species?.toLowerCase().includes(search)) ||
      (p.description?.toLowerCase().includes(search));
    const matchesSpecies =
      filterSpecies === "todas" ||
      (p.species?.toLowerCase().includes(filterSpecies.toLowerCase()));
    return matchesQ && matchesSpecies;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold leading-tight">Protocolos Clínicos</h2>
          <p className="text-xs text-muted-foreground">Acesso gratuito · Curado pela equipe SystemHub</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">{protocols.length} protocolo(s)</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar protocolos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {allSpecies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterSpecies("todas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterSpecies === "todas"
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-muted text-muted-foreground"
              }`}
            >
              Todas
            </button>
            {allSpecies.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSpecies(filterSpecies === s ? "todas" : s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterSpecies === s
                    ? "bg-primary text-primary-foreground"
                    : "border hover:bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground animate-pulse text-sm">
          Carregando protocolos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <ClipboardList className="w-10 h-10 opacity-20" />
          <p className="text-sm">{q ? "Nenhum protocolo encontrado." : "Nenhum protocolo disponível ainda."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProtocolCard key={p.id} p={p} detailBase={detailBase} />
          ))}
        </div>
      )}
    </div>
  );
}
