import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface DrugSearchProps {
  search: string;
  setSearch: (s: string) => void;
  filterClass: string;
  setFilterClass: (c: string) => void;
  filterSpecies: string;
  setFilterSpecies: (s: string) => void;
  classList: string[];
  speciesList: string[];
}

export default function DrugSearch({
  search, setSearch, filterClass, setFilterClass, filterSpecies, setFilterSpecies,
  classList, speciesList,
}: DrugSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, princípio ativo, indicação ou classe..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Select value={filterClass} onValueChange={setFilterClass}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Classe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as classes</SelectItem>
          {classList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filterSpecies} onValueChange={setFilterSpecies}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Espécie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as espécies</SelectItem>
          {speciesList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
