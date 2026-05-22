import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, BedDouble, Clock, AlertTriangle, Activity, Pill, ClipboardCheck, LogOut, ShoppingCart } from "lucide-react";
import { format, differenceInHours } from "date-fns";

interface Pet { id: string; name: string; species: string | null; breed: string | null; client_id: string | null; }
interface Client { id: string; name: string; }
interface Hospitalization { id: string; pet_id: string; client_id: string | null; reason: string; vet_name: string | null; admitted_at: string; discharged_at: string | null; status: string; severity: string; discharge_notes: string | null; }
interface InventoryItem { id: string; name: string; sell_price: number | null; }
interface ServiceItem { id: string; name: string; price: number; }

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Leve", color: "bg-green-100 text-green-800 border-green-300" },
  medium: { label: "Moderado", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  high: { label: "Grave", color: "bg-orange-100 text-orange-800 border-orange-300" },
  critical: { label: "Crítico", color: "bg-red-100 text-red-800 border-red-300" },
};

export default function Internacao() {
  const { user } = useAuth();
  const [hospitalizations, setHospitalizations] = useState<Hospitalization[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHosp, setSelectedHosp] = useState<Hospitalization | null>(null);
  const [dischargeDialog, setDischargeDialog] = useState<Hospitalization | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState("");

  const [formPetId, setFormPetId] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formSeverity, setFormSeverity] = useState("medium");

  const [evoSoap] = useState("evolution");
  const [evoContent, setEvoContent] = useState("");
  const [evoTemp, setEvoTemp] = useState("");
  const [evoHR, setEvoHR] = useState("");
  const [evoRR, setEvoRR] = useState("");
  const [evoPain, setEvoPain] = useState("");
  const [evoGlycemia, setEvoGlycemia] = useState("");
  const [evolutions, setEvolutions] = useState<any[]>([]);

  const [meds, setMeds] = useState<any[]>([]);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");

  const [checks, setChecks] = useState<any[]>([]);
  const [checkType, setCheckType] = useState("medication");
  const [checkDesc, setCheckDesc] = useState("");

  // Hospitalization items
  const [hospItems, setHospItems] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [addItemType, setAddItemType] = useState("product");
  const [addItemId, setAddItemId] = useState("");
  const [addItemQty, setAddItemQty] = useState("1");

  const loadData = async () => {
    if (!user) return;
    const [hospRes, petsRes, clientsRes, profileRes, invRes, svcRes] = await Promise.all([
      supabase.from("hospitalizations").select("*").eq("user_id", user.id).order("admitted_at", { ascending: false }),
      supabase.from("pets").select("id, name, species, breed, client_id").eq("user_id", user.id),
      supabase.from("clients").select("id, name").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("inventory_items").select("id, name, sell_price").eq("user_id", user.id).order("name"),
      supabase.from("services").select("id, name, price").eq("user_id", user.id).eq("active", true).order("name"),
    ]);
    setHospitalizations((hospRes.data as Hospitalization[]) ?? []);
    setPets((petsRes.data as Pet[]) ?? []);
    setClients((clientsRes.data as Client[]) ?? []);
    setProfile(profileRes.data);
    setInventoryItems((invRes.data as InventoryItem[]) ?? []);
    setServiceItems((svcRes.data as ServiceItem[]) ?? []);
  };

  const loadHospDetail = async (hospId: string) => {
    if (!user) return;
    const [evoRes, medRes, checkRes, itemsRes] = await Promise.all([
      supabase.from("hospitalization_evolutions").select("*").eq("hospitalization_id", hospId).order("created_at", { ascending: false }),
      supabase.from("hospitalization_medications").select("*").eq("hospitalization_id", hospId).order("created_at"),
      supabase.from("nursing_checks").select("*").eq("hospitalization_id", hospId).order("created_at", { ascending: false }),
      supabase.from("hospitalization_items" as any).select("*").eq("hospitalization_id", hospId).order("created_at", { ascending: false }),
    ]);
    setEvolutions(evoRes.data ?? []);
    setMeds(medRes.data ?? []);
    setChecks(checkRes.data ?? []);
    setHospItems((itemsRes.data as any[]) ?? []);
  };

  useEffect(() => { loadData(); }, [user]);
  useEffect(() => { if (selectedHosp) loadHospDetail(selectedHosp.id); }, [selectedHosp]);

  const activeHosps = hospitalizations.filter(h => h.status === "active");
  const dischargedHosps = hospitalizations.filter(h => h.status === "discharged");

  const getPetName = (petId: string) => pets.find(p => p.id === petId)?.name ?? "—";
  const getClientName = (clientId: string | null) => clients.find(c => c.id === clientId)?.name ?? "—";

  const handleAdmit = async () => {
    if (!user || !formPetId || !formReason.trim()) { toast.error("Preencha animal e motivo"); return; }
    const pet = pets.find(p => p.id === formPetId);
    const { error } = await supabase.from("hospitalizations").insert({
      user_id: user.id, pet_id: formPetId, client_id: pet?.client_id || null,
      reason: formReason.trim(), vet_name: profile?.display_name || null, severity: formSeverity,
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Internação registrada!");
    setDialogOpen(false); setFormPetId(""); setFormReason(""); setFormSeverity("medium");
    loadData();
  };

  const handleDischarge = async () => {
    if (!dischargeDialog || !user) return;

    // 1) Carrega itens consumidos
    const { data: itemsData } = await supabase
      .from("hospitalization_items" as any)
      .select("*")
      .eq("hospitalization_id", dischargeDialog.id);
    const items = (itemsData as any[]) ?? [];
    const total = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);

    // 2) Atualiza status
    const { error } = await supabase.from("hospitalizations").update({
      status: "discharged", discharged_at: new Date().toISOString(), discharge_notes: dischargeNotes || null,
    } as any).eq("id", dischargeDialog.id);
    if (error) { toast.error("Erro: " + error.message); return; }

    // 3) Baixa estoque dos produtos consumidos (atômico)
    for (const it of items) {
      if (it.item_type === "product" && it.inventory_item_id) {
        const ok = await (supabase.rpc as any)("decrement_stock", {
          p_item_id: it.inventory_item_id,
          p_qty: Number(it.quantity),
        });
        if (ok?.data) {
          await supabase.from("inventory_movements").insert({
            user_id: user.id,
            item_id: it.inventory_item_id,
            type: "exit",
            quantity: Number(it.quantity),
            reason: "Consumo em internação",
            reference_type: "hospitalization",
            reference_id: dischargeDialog.id,
          } as any);
        }
      }
    }

    // 4) Lança receita única em financial_records
    if (total > 0) {
      const pet = pets.find((p) => p.id === dischargeDialog.pet_id);
      await supabase.from("financial_records").insert({
        user_id: user.id,
        type: "income",
        amount: total,
        description: `Internação: ${pet?.name ?? "paciente"}`,
        category: "internacao",
        date: format(new Date(), "yyyy-MM-dd"),
        client_id: dischargeDialog.client_id,
        hospitalization_id: dischargeDialog.id,
      } as any);
    }

    toast.success(total > 0 ? `Alta registrada — R$ ${total.toFixed(2)} lançado nas receitas` : "Alta registrada!");
    setDischargeDialog(null); setDischargeNotes(""); setSelectedHosp(null); loadData();
  };

  const handleAddEvolution = async () => {
    if (!user || !selectedHosp || !evoContent.trim()) { toast.error("Preencha o conteúdo"); return; }
    const { error } = await supabase.from("hospitalization_evolutions").insert({
      user_id: user.id, hospitalization_id: selectedHosp.id, soap_type: evoSoap, content: evoContent.trim(),
      temperature: evoTemp ? parseFloat(evoTemp) : null, heart_rate: evoHR ? parseInt(evoHR) : null,
      respiratory_rate: evoRR ? parseInt(evoRR) : null, pain_level: evoPain ? parseInt(evoPain) : null,
      glycemia: evoGlycemia ? parseFloat(evoGlycemia) : null,
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Evolução registrada!");
    setEvoContent(""); setEvoTemp(""); setEvoHR(""); setEvoRR(""); setEvoPain(""); setEvoGlycemia("");
    loadHospDetail(selectedHosp.id);
  };

  const handleAddMed = async () => {
    if (!user || !selectedHosp || !medName.trim()) { toast.error("Nome do medicamento obrigatório"); return; }
    const { error } = await supabase.from("hospitalization_medications").insert({
      user_id: user.id, hospitalization_id: selectedHosp.id, medication_name: medName.trim(),
      dosage: medDosage || null, frequency: medFreq || null,
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Medicamento adicionado!");
    setMedName(""); setMedDosage(""); setMedFreq("");
    loadHospDetail(selectedHosp.id);
  };

  const handleAdministerMed = async (medId: string) => {
    const { error } = await supabase.from("hospitalization_medications").update({
      administered: true, administered_at: new Date().toISOString(),
    } as any).eq("id", medId);
    if (error) { toast.error("Erro"); return; }
    toast.success("Medicação administrada!");
    if (selectedHosp) loadHospDetail(selectedHosp.id);
  };

  const handleAddCheck = async () => {
    if (!user || !selectedHosp || !checkDesc.trim()) { toast.error("Descrição obrigatória"); return; }
    const { error } = await supabase.from("nursing_checks").insert({
      user_id: user.id, hospitalization_id: selectedHosp.id, check_type: checkType, description: checkDesc.trim(),
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Check adicionado!");
    setCheckDesc(""); loadHospDetail(selectedHosp.id);
  };

  const handleCompleteCheck = async (checkId: string) => {
    const { error } = await supabase.from("nursing_checks").update({
      status: "done", completed_at: new Date().toISOString(),
    } as any).eq("id", checkId);
    if (error) { toast.error("Erro"); return; }
    if (selectedHosp) loadHospDetail(selectedHosp.id);
  };

  const handleAddHospItem = async () => {
    if (!user || !selectedHosp || !addItemId) { toast.error("Selecione um item"); return; }
    const qty = parseFloat(addItemQty) || 1;
    let description = "";
    let unitPrice = 0;
    let inventoryItemId: string | null = null;
    let serviceId: string | null = null;

    if (addItemType === "product") {
      const item = inventoryItems.find(i => i.id === addItemId);
      if (!item) return;
      description = item.name;
      unitPrice = Number(item.sell_price) || 0;
      inventoryItemId = item.id;
    } else {
      const svc = serviceItems.find(s => s.id === addItemId);
      if (!svc) return;
      description = svc.name;
      unitPrice = Number(svc.price) || 0;
      serviceId = svc.id;
    }

    const { error } = await supabase.from("hospitalization_items" as any).insert({
      user_id: user.id, hospitalization_id: selectedHosp.id, item_type: addItemType,
      description, quantity: qty, unit_price: unitPrice, subtotal: qty * unitPrice,
      inventory_item_id: inventoryItemId, service_id: serviceId,
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Item adicionado!");
    setAddItemId(""); setAddItemQty("1");
    loadHospDetail(selectedHosp.id);
  };

  const soapLabels: Record<string, string> = { subjective: "S - Subjetivo", objective: "O - Objetivo", assessment: "A - Avaliação", plan: "P - Plano" };
  const checkTypeLabels: Record<string, string> = { medication: "Medicação", feeding: "Alimentação", fluid: "Fluidoterapia", hygiene: "Higiene" };

  // Detail view
  if (selectedHosp) {
    const pet = pets.find(p => p.id === selectedHosp.pet_id);
    const hoursInternado = differenceInHours(new Date(), new Date(selectedHosp.admitted_at));
    const sev = SEVERITY_CONFIG[selectedHosp.severity] || SEVERITY_CONFIG.medium;
    const hospTotal = hospItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedHosp(null)}>← Voltar</Button>
            <h1 className="text-2xl font-bold">{pet?.name}</h1>
            <Badge className={sev.color}>{sev.label}</Badge>
            <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{hoursInternado}h internado</Badge>
          </div>
          {selectedHosp.status === "active" && (
            <Button variant="destructive" onClick={() => setDischargeDialog(selectedHosp)}>
              <LogOut className="mr-2 h-4 w-4" />Alta hospitalar
            </Button>
          )}
        </div>

        <Card className="bg-muted/30">
          <CardContent className="pt-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><strong>Motivo:</strong> {selectedHosp.reason}</div>
            <div><strong>Veterinário:</strong> {selectedHosp.vet_name || "—"}</div>
            <div><strong>Entrada:</strong> {format(new Date(selectedHosp.admitted_at), "dd/MM/yyyy HH:mm")}</div>
            <div><strong>Tutor:</strong> {getClientName(selectedHosp.client_id)}</div>
          </CardContent>
        </Card>

        <Tabs defaultValue="evolution">
          <TabsList>
            <TabsTrigger value="evolution"><Activity className="h-4 w-4 mr-1" />Evolução</TabsTrigger>
            <TabsTrigger value="medications"><Pill className="h-4 w-4 mr-1" />Medicações</TabsTrigger>
            <TabsTrigger value="items"><ShoppingCart className="h-4 w-4 mr-1" />Serviços/Produtos ({hospItems.length})</TabsTrigger>
            <TabsTrigger value="nursing"><ClipboardCheck className="h-4 w-4 mr-1" />Enfermagem</TabsTrigger>
          </TabsList>

          {/* EVOLUTION TAB */}
          <TabsContent value="evolution" className="space-y-4">
            {selectedHosp.status === "active" && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Nova Evolução</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {/* Seletor SOAP removido — toda nova evolução é registrada como evolução geral */}
                  <Textarea rows={3} value={evoContent} onChange={e => setEvoContent(e.target.value)} placeholder="Descrição clínica..." />
                  <div className="grid grid-cols-5 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Temp (°C)</Label><Input type="number" step="0.1" value={evoTemp} onChange={e => setEvoTemp(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">FC (bpm)</Label><Input type="number" value={evoHR} onChange={e => setEvoHR(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">FR (rpm)</Label><Input type="number" value={evoRR} onChange={e => setEvoRR(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Dor (0-10)</Label><Input type="number" min="0" max="10" value={evoPain} onChange={e => setEvoPain(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Glicemia</Label><Input type="number" value={evoGlycemia} onChange={e => setEvoGlycemia(e.target.value)} /></div>
                  </div>
                  <Button onClick={handleAddEvolution} size="sm">Registrar evolução</Button>
                </CardContent>
              </Card>
            )}

            {evolutions.map((evo: any) => (
              <Card key={evo.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Evolução</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(evo.created_at), "dd/MM HH:mm")}</span>
                  </div>
                  <p className="text-sm mb-2">{evo.content}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    {evo.temperature && <span>🌡️ {evo.temperature}°C</span>}
                    {evo.heart_rate && <span>❤️ {evo.heart_rate} bpm</span>}
                    {evo.respiratory_rate && <span>🫁 {evo.respiratory_rate} rpm</span>}
                    {evo.pain_level != null && <span>😣 Dor: {evo.pain_level}/10</span>}
                    {evo.glycemia && <span>🩸 Glic: {evo.glycemia}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {evolutions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma evolução registrada.</p>}
          </TabsContent>

          {/* MEDICATIONS TAB */}
          <TabsContent value="medications" className="space-y-4">
            {selectedHosp.status === "active" && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Prescrever Medicamento</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Medicamento *</Label><Input value={medName} onChange={e => setMedName(e.target.value)} placeholder="Nome..." /></div>
                    <div className="space-y-1"><Label className="text-xs">Dosagem</Label><Input value={medDosage} onChange={e => setMedDosage(e.target.value)} placeholder="Ex: 10mg/kg" /></div>
                    <div className="space-y-1"><Label className="text-xs">Frequência</Label><Input value={medFreq} onChange={e => setMedFreq(e.target.value)} placeholder="Ex: 8/8h" /></div>
                  </div>
                  <Button onClick={handleAddMed} size="sm">Adicionar</Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {meds.map((med: any) => (
                <Card key={med.id} className={med.administered ? "opacity-60" : ""}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{med.medication_name}</p>
                      <p className="text-xs text-muted-foreground">{med.dosage || ""} {med.frequency ? `— ${med.frequency}` : ""}</p>
                      {med.administered_at && <p className="text-xs text-green-600">Administrado em {format(new Date(med.administered_at), "dd/MM HH:mm")}</p>}
                    </div>
                    {!med.administered && selectedHosp.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleAdministerMed(med.id)}>Administrar</Button>
                    )}
                    {med.administered && <Badge className="bg-green-100 text-green-800">✓ Feito</Badge>}
                  </CardContent>
                </Card>
              ))}
              {meds.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma medicação prescrita.</p>}
            </div>
          </TabsContent>

          {/* ITEMS TAB */}
          <TabsContent value="items" className="space-y-4">
            {selectedHosp.status === "active" && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Adicionar Produto / Serviço</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Select value={addItemType} onValueChange={(v) => { setAddItemType(v); setAddItemId(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Produto</SelectItem>
                        <SelectItem value="service">Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="col-span-2">
                      <Select value={addItemId} onValueChange={setAddItemId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {addItemType === "product"
                            ? inventoryItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name} — R$ {Number(i.sell_price || 0).toFixed(2)}</SelectItem>)
                            : serviceItems.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — R$ {Number(s.price).toFixed(2)}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <Input type="number" min="1" value={addItemQty} onChange={e => setAddItemQty(e.target.value)} placeholder="Qtd" />
                  </div>
                  <Button onClick={handleAddHospItem} size="sm">Adicionar</Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {hospItems.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x R$ {Number(item.unit_price).toFixed(2)} = <strong>R$ {Number(item.subtotal).toFixed(2)}</strong>
                        <span className="ml-2">({item.item_type === "product" ? "Produto" : "Serviço"})</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(item.created_at), "dd/MM HH:mm")}</span>
                  </CardContent>
                </Card>
              ))}
              {hospItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum item registrado.</p>}
              {hospItems.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 text-right">
                    <p className="text-sm font-semibold">Total: R$ {hospTotal.toFixed(2)}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* NURSING TAB */}
          <TabsContent value="nursing" className="space-y-4">
            {selectedHosp.status === "active" && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Novo Check de Enfermagem</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={checkType} onValueChange={setCheckType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(checkTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={checkDesc} onChange={e => setCheckDesc(e.target.value)} placeholder="Descrição..." />
                  </div>
                  <Button onClick={handleAddCheck} size="sm">Adicionar</Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {checks.map((chk: any) => (
                <Card key={chk.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={chk.status === "done"} onCheckedChange={() => chk.status !== "done" && handleCompleteCheck(chk.id)} disabled={chk.status === "done"} />
                      <div>
                        <p className={`text-sm ${chk.status === "done" ? "line-through text-muted-foreground" : "font-medium"}`}>{chk.description}</p>
                        <p className="text-xs text-muted-foreground">{checkTypeLabels[chk.check_type] || chk.check_type} — {format(new Date(chk.created_at), "dd/MM HH:mm")}</p>
                      </div>
                    </div>
                    {chk.completed_at && <span className="text-xs text-green-600">{format(new Date(chk.completed_at), "HH:mm")}</span>}
                  </CardContent>
                </Card>
              ))}
              {checks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum check registrado.</p>}
            </div>
          </TabsContent>
        </Tabs>

        {/* Discharge dialog */}
        <Dialog open={!!dischargeDialog} onOpenChange={o => { if (!o) setDischargeDialog(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Alta Hospitalar</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Paciente: <strong>{pet?.name}</strong></p>
              <div className="space-y-2"><Label>Observações de alta</Label><Textarea rows={4} value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} placeholder="Orientações pós-alta, prescrições..." /></div>
              <Button onClick={handleDischarge} className="w-full">Confirmar alta</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Internação</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Internação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Internação</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Animal *</Label>
                <Select value={formPetId} onValueChange={setFormPetId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{pets.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.species})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Motivo *</Label><Textarea value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="Motivo da internação..." /></div>
              <div className="space-y-2">
                <Label>Gravidade</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdmit} className="w-full">Internar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BedDouble className="h-5 w-5" />Pacientes Internados ({activeHosps.length})</h2>
        {activeHosps.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground"><BedDouble className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum paciente internado</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeHosps.map(h => {
              const sev = SEVERITY_CONFIG[h.severity] || SEVERITY_CONFIG.medium;
              const hours = differenceInHours(new Date(), new Date(h.admitted_at));
              return (
                <Card key={h.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${h.severity === "critical" ? "border-l-red-500" : h.severity === "high" ? "border-l-orange-500" : h.severity === "medium" ? "border-l-yellow-500" : "border-l-green-500"}`}
                  onClick={() => setSelectedHosp(h)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{getPetName(h.pet_id)}</CardTitle>
                      <Badge className={sev.color}>{sev.label}</Badge>
                    </div>
                    <CardDescription>{h.reason}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p><Clock className="h-3 w-3 inline mr-1" />{hours}h internado</p>
                    <p>Tutor: {getClientName(h.client_id)}</p>
                    <p>Vet: {h.vet_name || "—"}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {dischargedHosps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Altas Recentes</h2>
          <div className="space-y-2">
            {dischargedHosps.slice(0, 10).map(h => (
              <Card key={h.id} className="opacity-70 cursor-pointer hover:opacity-100" onClick={() => setSelectedHosp(h)}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{getPetName(h.pet_id)}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {h.reason}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Alta: {h.discharged_at ? format(new Date(h.discharged_at), "dd/MM/yyyy HH:mm") : "—"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}