import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, FileText, Download, Trash2, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { generateVetDocumentPDF } from "@/lib/vetDocumentPdf";
import { generateVetTermPDF, TERM_LABELS, type TermType } from "@/lib/vetTermsPdf";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { softDeleteRecord } from "@/lib/softDelete";
import { PdfPreview } from "@/components/PdfPreview";

const DOCUMENT_TYPES = [
  { value: "certificado_vacinacao", label: "Certificado de Vacinação" },
  { value: "declaracao_comparecimento", label: "Declaração de Comparecimento" },
  { value: "declaracao_atendimento", label: "Declaração de Atendimento" },
  { value: "atestado_saude", label: "Atestado de Saúde Animal" },
  { value: "atestado_obito", label: "Atestado de Óbito" },
  { value: "encaminhamento_especialista", label: "Encaminhamento para Especialista" },
  { value: "solicitacao_exames", label: "Solicitação de Exames" },
  { value: "gta", label: "Guia de Trânsito Animal (GTA)" },
  { value: "cvi", label: "Certificado Veterinário Internacional (CVI)" },
  { value: "termo_consentimento", label: "Termo de Consentimento Informado" },
  { value: "termo_responsabilidade", label: "Termo de Responsabilidade" },
  { value: "termo_autorizacao_procedimento", label: "Termo de Autorização para Procedimentos" },
  { value: "declaracao_eutanasia", label: "Declaração de Eutanásia" },
  { value: "termo_autorizacao_eutanasia", label: "Termo de Autorização de Eutanásia" },
  { value: "termo_recusa_exames", label: "Termo de Recusa de Exames" },
  { value: "termo_recusa_tratamento", label: "Termo de Recusa de Tratamento" },
  { value: "termo_consentimento_cirurgia", label: "Termo de Consentimento para Cirurgia" },
  { value: "termo_consentimento_anestesia", label: "Termo de Consentimento para Anestesia" },
  { value: "termo_consentimento_internacao", label: "Termo de Consentimento para Internação" },
];

interface Pet { id: string; name: string; species: string | null; breed: string | null; sex: string | null; birth_date: string | null; client_id: string | null; microchip: string | null; }
interface Client { id: string; name: string; cpf: string | null; phone: string | null; address: string | null; }
interface VetDoc { id: string; document_type: string; document_number: number; pet_id: string | null; client_id: string | null; data: any; created_at: string; }

export default function Documentos() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<VetDoc[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [selectedType, setSelectedType] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docObservations, setDocObservations] = useState("");

  const loadData = async () => {
    if (!user) return;
    const [docsRes, petsRes, clientsRes, profileRes] = await Promise.all([
      supabase.from("vet_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("pets").select("id, name, species, breed, sex, birth_date, client_id, microchip").eq("user_id", user.id),
      supabase.from("clients").select("id, name, cpf, phone, address").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setDocs((docsRes.data as VetDoc[]) ?? []);
    setPets((petsRes.data as Pet[]) ?? []);
    setClients((clientsRes.data as Client[]) ?? []);
    setProfile(profileRes.data);
  };

  useEffect(() => { loadData(); }, [user]);

  // Auto-fill client when pet is selected
  useEffect(() => {
    if (selectedPetId) {
      const pet = pets.find(p => p.id === selectedPetId);
      if (pet?.client_id) setSelectedClientId(pet.client_id);
    }
  }, [selectedPetId, pets]);

  const selectedPet = pets.find(p => p.id === selectedPetId);
  const selectedClient = clients.find(c => c.id === selectedClientId);

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "Não informada";
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years > 0) return `${years} ano(s)`;
    return `${months} mês(es)`;
  };

  const handleGenerate = async () => {
    if (!user || !selectedType || !selectedPetId) {
      toast.error("Selecione o tipo de documento e o animal");
      return;
    }

    const docData = {
      vet_name: profile?.display_name || "Não informado",
      vet_crmv: profile?.crmv || "Não informado",
      business_name: profile?.business_name || "",
      business_address: profile?.business_address || "",
      business_phone: profile?.business_phone || "",
      business_cnpj: (profile as any)?.business_cnpj || "",
      logo_url: (profile as any)?.logo_url || null,
      pet_name: selectedPet?.name || "",
      pet_species: selectedPet?.species || "",
      pet_breed: selectedPet?.breed || "",
      pet_sex: selectedPet?.sex || "",
      pet_age: calculateAge(selectedPet?.birth_date || null),
      pet_microchip: selectedPet?.microchip || "",
      client_name: selectedClient?.name || "",
      client_cpf: selectedClient?.cpf || "",
      client_phone: selectedClient?.phone || "",
      client_address: selectedClient?.address || "",
      content: docContent,
      observations: docObservations,
      date: format(new Date(), "dd/MM/yyyy"),
    };

    const { data, error } = await supabase.from("vet_documents").insert({
      user_id: user.id,
      pet_id: selectedPetId,
      client_id: selectedClientId || null,
      document_type: selectedType,
      data: docData,
    }).select().single();

    if (error) { toast.error("Erro ao salvar: " + error.message); return; }

    // Generate PDF
    const typeLabel = DOCUMENT_TYPES.find(t => t.value === selectedType)?.label || selectedType;
    await generateVetDocumentPDF(typeLabel, docData, (data as VetDoc).document_number);

    toast.success("Documento gerado com sucesso!");
    setDialogOpen(false);
    resetForm();
    loadData();
  };

  // Detecta documentos salvos via PetTerms (têm petSnapshot/ownerSnapshot/clinicSnapshot)
  const isTermDoc = (doc: VetDoc) =>
    !!(doc.data && (doc.data.petSnapshot || doc.data.ownerSnapshot || doc.data.clinicSnapshot));

  const buildTermBlob = async (doc: VetDoc): Promise<{ blob: Blob; fileName: string }> => {
    const d: any = doc.data || {};
    const petSnap = d.petSnapshot || {};
    const ownerSnap = d.ownerSnapshot || {};
    const clinicSnap = d.clinicSnapshot || {};
    const fields = d.fields || {};
    const blob = await generateVetTermPDF(
      doc.document_type as TermType,
      clinicSnap,
      petSnap,
      ownerSnap,
      fields,
      { autoDownload: false },
    );
    const safeName = (petSnap.name || "documento").replace(/\s+/g, "_");
    const fileName = `${doc.document_type}_${safeName}_${doc.document_number}.pdf`;
    return { blob, fileName };
  };

  const handleDownload = async (doc: VetDoc) => {
    if (isTermDoc(doc)) {
      const { blob, fileName } = await buildTermBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }
    const typeLabel = DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;
    await generateVetDocumentPDF(typeLabel, doc.data, doc.document_number, "download");
  };

  const [previewDoc, setPreviewDoc] = useState<{ blobUrl: string; blob: Blob; fileName: string } | null>(null);

  const handlePreview = async (doc: VetDoc) => {
    let result: { blobUrl: string; blob: Blob; fileName: string } | undefined;
    if (isTermDoc(doc)) {
      const { blob, fileName } = await buildTermBlob(doc);
      result = { blob, fileName, blobUrl: URL.createObjectURL(blob) };
    } else {
      const typeLabel = DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;
      const r = await generateVetDocumentPDF(typeLabel, doc.data, doc.document_number, "preview");
      if (r) result = r;
    }
    if (result) {
      if (previewDoc?.blobUrl) URL.revokeObjectURL(previewDoc.blobUrl);
      setPreviewDoc(result);
    }
  };

  const closePreview = () => {
    if (previewDoc?.blobUrl) URL.revokeObjectURL(previewDoc.blobUrl);
    setPreviewDoc(null);
  };

  const downloadFromPreview = () => {
    if (!previewDoc) return;
    const a = document.createElement("a");
    a.href = previewDoc.blobUrl;
    a.download = previewDoc.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const [deleteTarget, setDeleteTarget] = useState<VetDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    const { error } = await softDeleteRecord({
      table: "vet_documents",
      recordId: deleteTarget.id,
      recordData: deleteTarget as unknown as Record<string, unknown>,
      userId: user.id,
      reason: "Exclusão manual pelo usuário",
    });
    setDeleting(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Documento movido para a lixeira (60 dias).");
      setDeleteTarget(null);
      loadData();
    }
  };

  const resetForm = () => {
    setSelectedType("");
    setSelectedPetId("");
    setSelectedClientId("");
    setDocContent("");
    setDocObservations("");
  };

  const filtered = docs.filter(d => {
    const matchSearch = d.data?.pet_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.data?.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(d.document_number).includes(search);
    const matchType = filterType === "all" || d.document_type === filterType;
    return matchSearch && matchType;
  });

  const getTypeLabel = (v: string) =>
    DOCUMENT_TYPES.find(t => t.value === v)?.label
    ?? (TERM_LABELS as Record<string, string>)[v]
    ?? v;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Documentos Veterinários</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Documento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Emitir Documento</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de documento *</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Animal *</Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o animal..." /></SelectTrigger>
                  <SelectContent>
                    {pets.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.species})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tutor</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tutor..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedPet && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-sm space-y-1">
                    <p><strong>Animal:</strong> {selectedPet.name} — {selectedPet.species} {selectedPet.breed ? `(${selectedPet.breed})` : ""}</p>
                    <p><strong>Sexo:</strong> {selectedPet.sex || "N/I"} | <strong>Idade:</strong> {calculateAge(selectedPet.birth_date)}</p>
                    {selectedPet.microchip && <p><strong>Microchip:</strong> {selectedPet.microchip}</p>}
                    {selectedClient && (
                      <>
                        <p><strong>Tutor:</strong> {selectedClient.name}</p>
                        <p><strong>CPF:</strong> {selectedClient.cpf || "N/I"}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Conteúdo / Descrição</Label>
                <Textarea rows={4} value={docContent} onChange={e => setDocContent(e.target.value)}
                  placeholder="Descreva o conteúdo técnico do documento..." />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={docObservations} onChange={e => setDocObservations(e.target.value)}
                  placeholder="Observações adicionais..." />
              </div>

              <div className="bg-muted/30 p-3 rounded text-sm space-y-1">
                <p><strong>Veterinário:</strong> {profile?.display_name || "Configure nas configurações"}</p>
                <p><strong>CRMV:</strong> {profile?.crmv || "Configure nas configurações"}</p>
              </div>

              <Button onClick={handleGenerate} className="w-full">
                <FileText className="mr-2 h-4 w-4" />Gerar Documento em PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nº, animal ou tutor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum documento emitido
                </TableCell></TableRow>
              )}
              {filtered.map(doc => {
                const petName = doc.data?.pet_name || pets.find(p => p.id === doc.pet_id)?.name || "—";
                const clientName = doc.data?.client_name || clients.find(c => c.id === doc.client_id)?.name || "—";
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-sm">#{doc.document_number}</TableCell>
                    <TableCell><Badge variant="outline">{getTypeLabel(doc.document_type)}</Badge></TableCell>
                    <TableCell>{petName}</TableCell>
                    <TableCell>{clientName}</TableCell>
                    <TableCell className="text-sm">{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handlePreview(doc)} title="Visualizar PDF">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDownload(doc)} title="Baixar PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(doc)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        itemLabel={deleteTarget ? `o documento #${deleteTarget.document_number} (${getTypeLabel(deleteTarget.document_type)})` : "este documento"}
      />

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-base truncate">{previewDoc?.fileName}</DialogTitle>
            <Button size="sm" variant="outline" onClick={downloadFromPreview} className="mr-8">
              <Download className="h-4 w-4 mr-2" />Baixar
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewDoc && <PdfPreview blob={previewDoc.blob} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
