import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { softDeleteRecord } from "@/lib/softDelete";
import { Plus, Search, Trash2, Edit, Eye, PawPrint, ChevronsUpDown, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BREEDS_BY_SPECIES } from "@/lib/breedData";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
interface Pet {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  birth_date: string | null;
  neutered: boolean;
  client_id: string | null;
  client_name?: string;
}

interface Client {
  id: string;
  name: string;
}

const defaultForm = {
  name: "", species: "", breed: "", coat: "", color: "", sex: "",
  birth_date: "", neutered: false, microchip: "", restrictions: "", notes: "", client_id: "",
  photo_url: "",
};

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    if (path.startsWith("http")) { setUrl(path); return; }
    supabase.storage.from("pet-attachments").createSignedUrl(path, 3600).then(({ data }) => {
      setUrl(data?.signedUrl ?? null);
    });
  }, [path]);
  return url;
}

export default function Animais() {
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const effectiveUserId = clinicId ?? user?.id ?? "";
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [breedOpen, setBreedOpen] = useState(false);
  const [breedSearch, setBreedSearch] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const formPhotoUrl = useSignedUrl(form.photo_url || null);
  const [petSignedUrls, setPetSignedUrls] = useState<Record<string, string>>({});

  const filteredBreeds = useMemo(() => {
    const breeds = BREEDS_BY_SPECIES[form.species] || [];
    if (!breedSearch) return breeds;
    return breeds.filter(b => b.toLowerCase().includes(breedSearch.toLowerCase()));
  }, [form.species, breedSearch]);
  const loadData = async () => {
    if (!effectiveUserId) return;
    const [petsRes, clientsRes] = await Promise.all([
      supabase.from("pets" as any).select("*").eq("user_id", effectiveUserId).order("name"),
      supabase.from("clients").select("id, name").eq("user_id", effectiveUserId).order("name"),
    ]);
    const clientMap = new Map((clientsRes.data ?? []).map((c: any) => [c.id, c.name]));
    const petsData = ((petsRes.data as any[]) ?? []).map((p) => ({
      ...p,
      client_name: p.client_id ? clientMap.get(p.client_id) ?? "—" : "—",
    }));
    setPets(petsData);
    setClients((clientsRes.data as Client[]) ?? []);
    // Generate signed URLs for pet photos
    const urlMap: Record<string, string> = {};
    await Promise.all(petsData.filter(p => p.photo_url).map(async (p) => {
      if (p.photo_url.startsWith("http")) { urlMap[p.id] = p.photo_url; return; }
      const { data } = await supabase.storage.from("pet-attachments").createSignedUrl(p.photo_url, 3600);
      if (data?.signedUrl) urlMap[p.id] = data.signedUrl;
    }));
    setPetSignedUrls(urlMap);
  };

  useEffect(() => { loadData(); }, [user]);

  const resetForm = () => { setForm(defaultForm); setEditId(null); };

  const handleSave = async () => {
    if (!user || !form.name.trim()) { toast.error("Nome do animal é obrigatório"); return; }

    // Verificação de duplicidade (microchip, ou nome + proprietário)
    const micro = form.microchip.trim();
    const nameNorm = form.name.trim().toLowerCase();
    const dupe = pets.find((p: any) => {
      if (editId && p.id === editId) return false;
      if (micro && p.microchip && String(p.microchip).trim() === micro) return true;
      if (form.client_id && p.client_id === form.client_id && (p.name ?? "").trim().toLowerCase() === nameNorm) return true;
      return false;
    });
    if (dupe) {
      toast.error(
        (dupe as any).microchip && micro && (dupe as any).microchip.trim() === micro
          ? `Animal com este microchip já cadastrado: ${dupe.name}`
          : `Este proprietário já possui um animal chamado "${dupe.name}"`
      );
      return;
    }

    const record: any = {
      user_id: effectiveUserId,
      name: form.name.trim(),
      species: form.species || null,
      breed: form.breed || null,
      coat: form.coat || null,
      color: form.color || null,
      sex: form.sex || null,
      birth_date: form.birth_date || null,
      neutered: form.neutered,
      microchip: form.microchip || null,
      restrictions: form.restrictions || null,
      notes: form.notes || null,
      client_id: form.client_id || null,
      photo_url: form.photo_url || null,
    };
    const { error } = editId
      ? await supabase.from("pets" as any).update(record).eq("id", editId)
      : await supabase.from("pets" as any).insert(record);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(editId ? "Animal atualizado!" : "Animal cadastrado!");
    setDialogOpen(false);
    resetForm();
    loadData();
  };

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    const { error } = await softDeleteRecord({
      table: "pets",
      recordId: deleteTarget.id,
      recordData: deleteTarget as Record<string, unknown>,
      userId: effectiveUserId,
      reason: "Exclusão manual de animal",
    });
    setDeleting(false);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Animal movido para a lixeira (60 dias)."); setDeleteTarget(null); loadData(); }
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name, species: p.species ?? "", breed: p.breed ?? "", coat: p.coat ?? "",
      color: p.color ?? "", sex: p.sex ?? "", birth_date: p.birth_date ?? "",
      neutered: p.neutered ?? false, microchip: p.microchip ?? "",
      restrictions: p.restrictions ?? "", notes: p.notes ?? "", client_id: p.client_id ?? "",
      photo_url: p.photo_url ?? "",
    });
    setEditId(p.id);
    setDialogOpen(true);
  };

  const filtered = pets.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.species?.toLowerCase().includes(search.toLowerCase()) ||
    p.breed?.toLowerCase().includes(search.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PawPrint className="h-6 w-6 text-primary" /> Animais
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo animal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar animal" : "Novo animal"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-20 w-20">
                  {formPhotoUrl ? <AvatarImage src={formPhotoUrl} alt="Foto do animal" /> : null}
                  <AvatarFallback className="text-2xl"><PawPrint className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <Label htmlFor="pet-photo" className="cursor-pointer">
                  <div className="flex items-center gap-1 text-xs text-primary hover:underline">
                    {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    {uploadingPhoto ? "Enviando..." : form.photo_url ? "Trocar foto" : "Adicionar foto (opcional)"}
                  </div>
                </Label>
                <input
                  id="pet-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    setUploadingPhoto(true);
                    const ext = file.name.split(".").pop();
                    const path = `${effectiveUserId}/${Date.now()}.${ext}`;
                    const { error } = await supabase.storage.from("pet-attachments").upload(path, file, { upsert: true });
                    if (error) { toast.error("Erro no upload: " + error.message); setUploadingPhoto(false); return; }
                    const { data: signedData, error: signError } = await supabase.storage.from("pet-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
                    if (signError || !signedData?.signedUrl) { toast.error("Erro ao gerar URL"); setUploadingPhoto(false); return; }
                    // Store the storage path for persistence, use signed URL for preview
                    const storagePath = path;
                    setForm(prev => ({ ...prev, photo_url: storagePath }));
                    setUploadingPhoto(false);
                    toast.success("Foto enviada!");
                  }}
                />
              </div>
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do animal" /></div>
              <div className="space-y-2">
                <Label>Proprietário</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o proprietário" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Espécie</Label>
                  <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Canina">Canina</SelectItem>
                      <SelectItem value="Felina">Felina</SelectItem>
                      <SelectItem value="Ave">Ave</SelectItem>
                      <SelectItem value="Roedor">Roedor</SelectItem>
                      <SelectItem value="Réptil">Réptil</SelectItem>
                      <SelectItem value="Outra">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Raça</Label>
                  <Popover open={breedOpen} onOpenChange={setBreedOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={breedOpen} className="w-full justify-between font-normal">
                        {form.breed || "Selecione ou digite..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Buscar raça..." value={breedSearch} onValueChange={setBreedSearch} />
                        <CommandList>
                          <CommandEmpty>
                            {breedSearch ? (
                              <button
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                onClick={() => { setForm({ ...form, breed: breedSearch }); setBreedOpen(false); setBreedSearch(""); }}
                              >
                                Usar "{breedSearch}"
                              </button>
                            ) : "Digite para buscar"}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredBreeds.map((breed) => (
                              <CommandItem
                                key={breed}
                                value={breed}
                                onSelect={() => { setForm({ ...form, breed }); setBreedOpen(false); setBreedSearch(""); }}
                              >
                                {breed}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Pelagem</Label><Input value={form.coat} onChange={(e) => setForm({ ...form, coat: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cor</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data de nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Microchip</Label><Input value={form.microchip} onChange={(e) => setForm({ ...form, microchip: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.neutered} onCheckedChange={(v) => setForm({ ...form, neutered: v })} />
                <Label>Castrado</Label>
              </div>
              <div className="space-y-2"><Label>Restrições</Label><Input value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} /></div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar animais..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Espécie / Raça</TableHead>
                <TableHead className="hidden md:table-cell">Proprietário</TableHead>
                <TableHead className="hidden lg:table-cell">Sexo</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum animal encontrado</TableCell></TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {petSignedUrls[p.id] ? <AvatarImage src={petSignedUrls[p.id]} /> : null}
                          <AvatarFallback className="text-xs"><PawPrint className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                        {p.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{[p.species, p.breed].filter(Boolean).join(" — ") || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.client_name}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{p.sex ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/animais/${p.id}`)} title="Prontuário"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        itemLabel={deleteTarget ? `o animal "${deleteTarget.name}" e todo o seu histórico` : "este animal"}
      />
    </div>
  );
}
