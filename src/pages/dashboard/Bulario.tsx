import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Search, Pill, FlaskConical,
  Calculator, ChevronRight, Star, Plus, UserPlus
} from "lucide-react";
import DrugMonograph, { type DrugReferenceData } from "@/components/bulario/DrugMonograph";
import DrugForm, { emptyForm, type DrugFormData } from "@/components/bulario/DrugForm";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Bulario() {
  const { user } = useAuth();
  const [drugs, setDrugs] = useState<DrugReferenceData[]>([]);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [selectedDrug, setSelectedDrug] = useState<DrugReferenceData | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [drugFormOpen, setDrugFormOpen] = useState(false);
  const [drugForm, setDrugForm] = useState<DrugFormData>({ ...emptyForm });

  useEffect(() => {
    supabase
      .from("drug_reference")
      .select("*")
      .order("name")
      .then(({ data }) => setDrugs((data as DrugReferenceData[] | null) ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("drug_favorites")
      .select("drug_reference_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setFavoriteIds(new Set(data.map((f: any) => f.drug_reference_id)));
      });
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, drugId: string) => {
    e.stopPropagation();
    if (!user) return;

    if (favoriteIds.has(drugId)) {
      const { error } = await supabase
        .from("drug_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("drug_reference_id", drugId);
      if (!error) {
        setFavoriteIds((prev) => { const n = new Set(prev); n.delete(drugId); return n; });
        toast.success("Removido dos favoritos");
      }
    } else {
      const { error } = await supabase
        .from("drug_favorites")
        .insert({ user_id: user.id, drug_reference_id: drugId });
      if (!error) {
        setFavoriteIds((prev) => new Set(prev).add(drugId));
        toast.success("Adicionado aos favoritos");
      }
    }
  };

  const classList = useMemo(() => {
    const set = new Set<string>();
    drugs.forEach((d) => { if (d.drug_class) set.add(d.drug_class); });
    return Array.from(set).sort();
  }, [drugs]);

  const speciesList = useMemo(() => {
    const set = new Set<string>();
    drugs.forEach((d) => {
      if (d.species) d.species.split(",").forEach((s) => { const t = s.trim(); if (t) set.add(t); });
    });
    return Array.from(set).sort();
  }, [drugs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drugs.filter((d) => {
      if (showFavorites && !favoriteIds.has(d.id)) return false;
      const matchText = !q ||
        d.name.toLowerCase().includes(q) ||
        d.active_ingredient.toLowerCase().includes(q) ||
        (d.commercial_name?.toLowerCase().includes(q)) ||
        (d.indications?.toLowerCase().includes(q)) ||
        (d.drug_class?.toLowerCase().includes(q));
      const matchClass = filterClass === "all" || d.drug_class === filterClass;
      const matchSpecies = filterSpecies === "all" || (d.species?.toLowerCase().includes(filterSpecies.toLowerCase()));
      return matchText && matchClass && matchSpecies;
    });
  }, [drugs, search, filterClass, filterSpecies, showFavorites, favoriteIds]);

  const handleSaveDrug = async () => {
    if (!user) {
      toast.error("Crie uma conta para cadastrar medicamentos");
      return;
    }
    const name = drugForm.name.trim();
    const active = drugForm.active_ingredient.trim();

    // ── Campo obrigatórios ────────────────────────────────────
    if (!name || !active) {
      toast.error("Nome genérico e princípio ativo são obrigatórios");
      return;
    }

    // ── Aviso de completude ───────────────────────────────────
    const missing: string[] = [];
    if (!drugForm.dosage.trim())   missing.push("posologia");
    if (!drugForm.species.trim())  missing.push("espécies indicadas");
    if (!drugForm.indications.trim()) missing.push("indicações");
    if (missing.length > 0) {
      toast.warning(
        `Dados incompletos: ${missing.join(", ")}. Use a IA para preencher automaticamente.`,
        { duration: 5000 }
      );
    }

    // ── Verificação de duplicata no bulário oficial ───────────
    const { data: existing } = await supabase
      .from("drug_reference")
      .select("id, name")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      toast.info(
        `"${existing.name}" já existe no bulário oficial. Seu cadastro ficará no catálogo particular da sua clínica.`,
        { duration: 6000 }
      );
    }

    // ── Salva no catálogo da clínica ──────────────────────────
    const { error } = await supabase.from("drug_catalog").insert({
      user_id: user.id,
      name,
      active_ingredient: active,
      commercial_name: drugForm.commercial_name || null,
      drug_class: drugForm.drug_class || null,
      species: drugForm.species || null,
      indications: drugForm.indications || null,
      dosage: drugForm.dosage || null,
      contraindications: drugForm.contraindications || null,
      adverse_effects: drugForm.adverse_effects || null,
      interactions: drugForm.interactions || null,
      withdrawal_period: drugForm.withdrawal_period || null,
      source: drugForm.source || null,
      notes: drugForm.notes || null,
      created_by_name: user.email,
    });
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Medicamento salvo no catálogo da sua clínica!");
    setDrugFormOpen(false);
    setDrugForm({ ...emptyForm });
  };

  if (selectedDrug) {
    return <DrugMonograph drug={selectedDrug} onBack={() => setSelectedDrug(null)} isLoggedIn={!!user} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />Bulário Veterinário
        </h1>
        <div className="ml-auto">
          {user ? (
            <DrugForm
              open={drugFormOpen}
              onOpenChange={(o) => { setDrugFormOpen(o); if (!o) setDrugForm({ ...emptyForm }); }}
              form={drugForm}
              setForm={setDrugForm}
              editId={null}
              onSave={handleSaveDrug}
            />
          ) : (
            <Link to="/register">
              <Button size="sm" variant="outline" className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Criar conta para cadastrar
              </Button>
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {drugs.length} medicamentos · Consulte e calcule doses por peso
      </p>

      {/* Tabs: Todos / Favoritos */}
      <Tabs value={showFavorites ? "favorites" : "all"} onValueChange={(v) => setShowFavorites(v === "favorites")}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Pill className="h-3.5 w-3.5" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Favoritos ({favoriteIds.size})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          className="pl-12 h-12 text-base rounded-xl border-2 focus-visible:ring-primary/20"
          placeholder="Buscar medicamento por nome, princípio ativo ou indicação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Classe farmacológica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as classes</SelectItem>
            {classList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSpecies} onValueChange={setFilterSpecies}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Espécie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as espécies</SelectItem>
            {speciesList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterClass !== "all" || filterSpecies !== "all") && (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-destructive/10 h-9 px-3 flex items-center"
            onClick={() => { setFilterClass("all"); setFilterSpecies("all"); }}
          >
            ✕ Limpar filtros
          </Badge>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {showFavorites
          ? `${filtered.length} favorito(s)`
          : filtered.length === drugs.length
            ? `Mostrando todos os ${drugs.length} medicamentos`
            : `${filtered.length} de ${drugs.length} medicamentos`}
      </p>

      {/* Drug list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            {showFavorites ? (
              <>
                <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum favorito ainda</p>
                <p className="text-xs mt-1">Clique no ⭐ ao lado do medicamento para favoritar</p>
              </>
            ) : (
              <>
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum medicamento encontrado</p>
                <p className="text-xs mt-1">Tente outro termo de busca ou ajuste os filtros</p>
              </>
            )}
          </CardContent></Card>
        )}
        {filtered.map((drug) => (
          <Card
            key={drug.id}
            className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            onClick={() => setSelectedDrug(drug)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{drug.name}</span>
                    {drug.drug_class && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        <FlaskConical className="h-2.5 w-2.5 mr-0.5" />
                        {drug.drug_class}
                      </Badge>
                    )}
                    {(drug.dose_min_mg_kg || drug.dose_max_mg_kg) && (
                      <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30">
                        <Calculator className="h-2.5 w-2.5 mr-0.5" />
                        Calculadora
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {drug.commercial_name && <span>{drug.commercial_name} · </span>}
                    {drug.active_ingredient}
                    {drug.species && <span className="ml-2">| {drug.species}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => toggleFavorite(e, drug.id)}
                    className="p-1.5 rounded-full hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    title={favoriteIds.has(drug.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Star
                      className={`h-4 w-4 transition-colors ${
                        favoriteIds.has(drug.id)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40 hover:text-amber-400"
                      }`}
                    />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
