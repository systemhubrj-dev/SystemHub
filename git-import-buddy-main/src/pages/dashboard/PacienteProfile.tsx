import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Sparkles, Loader2, FileDown, Trash2 } from "lucide-react";
import { useAiGate } from "@/hooks/useAiGate";

interface Patient { id: string; name: string; goal: string | null; birth_date: string | null; sex: string | null; dietary_restrictions?: string; allergies?: string; medical_conditions?: string; notes?: string; }
interface Assessment { id: string; assessment_date: string; weight_kg: number | null; height_cm: number | null; bmi: number | null; body_fat_percent: number | null; notes: string | null; measurements: any; }
interface MealPlan { id: string; title: string; total_kcal: number | null; total_protein_g: number | null; total_carb_g: number | null; total_fat_g: number | null; created_at: string; generated_by_ai: boolean; }
interface MealItem { id: string; meal_name: string; meal_time: string | null; food: string; quantity: string | null; kcal: number | null; protein_g: number | null; carb_g: number | null; fat_g: number | null; ord: number; }

export default function PacienteProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const ownerId = clinicId ?? user?.id ?? "";
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [items, setItems] = useState<Record<string, MealItem[]>>({});
  const [anamnesis, setAnamnesis] = useState<string>("");
  const [anamnesisId, setAnamnesisId] = useState<string | null>(null);

  const [assessOpen, setAssessOpen] = useState(false);
  const [assessForm, setAssessForm] = useState({ weight_kg: "", height_cm: "", body_fat_percent: "", waist_cm: "", hip_cm: "", notes: "" });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitle, setAiTitle] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const { runWithGate } = useAiGate();

  const load = async () => {
    if (!id || !ownerId) return;
    const [{ data: p }, { data: a }, { data: pls }, { data: an }] = await Promise.all([
      supabase.from("patients" as any).select("*").eq("id", id).maybeSingle(),
      supabase.from("patient_assessments" as any).select("*").eq("patient_id", id).order("assessment_date", { ascending: false }),
      supabase.from("meal_plans" as any).select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("nutri_anamnesis" as any).select("*").eq("patient_id", id).order("entry_date", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPatient(p as any);
    setAssessments((a ?? []) as any);
    setPlans((pls ?? []) as any);
    if (pls && pls.length) {
      const ids = (pls as any[]).map((x) => x.id);
      const { data: it } = await supabase.from("meal_plan_items" as any).select("*").in("meal_plan_id", ids).order("ord");
      const grouped: Record<string, MealItem[]> = {};
      (it ?? []).forEach((x: any) => { (grouped[x.meal_plan_id] ??= []).push(x); });
      setItems(grouped);
    }
    if (an) { setAnamnesis(((an as any).notes ?? "") + ""); setAnamnesisId((an as any).id); }
  };

  useEffect(() => { void load(); }, [id, ownerId]);

  const calcBMI = (w: string, h: string) => {
    const wn = Number(w), hn = Number(h) / 100;
    if (!wn || !hn) return null;
    return Number((wn / (hn * hn)).toFixed(1));
  };

  const saveAssessment = async () => {
    if (!ownerId || !id) return;
    const bmi = calcBMI(assessForm.weight_kg, assessForm.height_cm);
    const { error } = await supabase.from("patient_assessments" as any).insert({
      user_id: ownerId, patient_id: id,
      weight_kg: Number(assessForm.weight_kg) || null,
      height_cm: Number(assessForm.height_cm) || null,
      body_fat_percent: Number(assessForm.body_fat_percent) || null,
      bmi,
      measurements: { waist_cm: Number(assessForm.waist_cm) || null, hip_cm: Number(assessForm.hip_cm) || null },
      notes: assessForm.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Avaliação salva");
    setAssessOpen(false);
    setAssessForm({ weight_kg: "", height_cm: "", body_fat_percent: "", waist_cm: "", hip_cm: "", notes: "" });
    void load();
  };

  const saveAnamnesis = async () => {
    if (!ownerId || !id) return;
    if (anamnesisId) {
      await supabase.from("nutri_anamnesis" as any).update({ notes: anamnesis }).eq("id", anamnesisId);
    } else {
      const { data } = await supabase.from("nutri_anamnesis" as any).insert({ user_id: ownerId, patient_id: id, notes: anamnesis }).select("id").maybeSingle();
      setAnamnesisId(((data as any)?.id) ?? null);
    }
    toast.success("Anamnese salva");
  };

  const generateAiPlan = async () => {
    if (!ownerId || !id || !patient) return;
    setAiLoading(true);
    const last = assessments[0];
    const result = await runWithGate("nutri-ai:meal-plan", async () => {
      return await supabase.functions.invoke("nutri-ai", {
        body: {
          mode: "meal_plan",
          patient: {
            name: patient.name, goal: patient.goal, sex: patient.sex,
            birth_date: patient.birth_date,
            restrictions: patient.dietary_restrictions, allergies: patient.allergies,
            conditions: patient.medical_conditions,
            weight_kg: last?.weight_kg, height_cm: last?.height_cm, body_fat: last?.body_fat_percent,
          },
          extra: aiPrompt,
        },
      });
    });
    setAiLoading(false);
    if (!result) return;
    const { data, error } = result as any;
    if (error || !data?.plan) { toast.error("Falha ao gerar plano: " + (error?.message ?? "sem resposta")); return; }
    const plan = data.plan;
    const { data: planRow, error: insErr } = await supabase.from("meal_plans" as any).insert({
      user_id: ownerId, patient_id: id,
      title: aiTitle || plan.title || "Plano alimentar gerado por IA",
      total_kcal: plan.total_kcal ?? null,
      total_protein_g: plan.total_protein_g ?? null,
      total_carb_g: plan.total_carb_g ?? null,
      total_fat_g: plan.total_fat_g ?? null,
      notes: plan.notes ?? null,
      generated_by_ai: true,
    }).select("id").single();
    if (insErr) { toast.error(insErr.message); return; }
    const planId = (planRow as any).id;
    const rows = (plan.items ?? []).map((it: any, idx: number) => ({
      user_id: ownerId, meal_plan_id: planId,
      meal_name: it.meal_name, meal_time: it.meal_time ?? null,
      food: it.food, quantity: it.quantity ?? null,
      kcal: it.kcal ?? null, protein_g: it.protein_g ?? null,
      carb_g: it.carb_g ?? null, fat_g: it.fat_g ?? null, ord: idx,
    }));
    if (rows.length) await supabase.from("meal_plan_items" as any).insert(rows);
    toast.success("Plano gerado!");
    setAiOpen(false); setAiPrompt(""); setAiTitle("");
    void load();
  };

  const deletePlan = async (planId: string) => {
    await supabase.from("meal_plans" as any).delete().eq("id", planId);
    void load();
  };

  const exportPlanPDF = async (plan: MealPlan) => {
    const { downloadReportPDF, fetchCompanyInfo } = await import("@/lib/reportExport");
    const planItems = items[plan.id] ?? [];
    const company = await fetchCompanyInfo(ownerId);
    await downloadReportPDF({
      filename: `plano-alimentar-${patient?.name ?? "paciente"}.pdf`,
      title: plan.title,
      subtitle: `Paciente: ${patient?.name ?? ""}`,
      company,
      summary: [
        { label: "Total kcal", value: String(plan.total_kcal ?? "—") },
        { label: "Proteína (g)", value: String(plan.total_protein_g ?? "—") },
        { label: "Carboidrato (g)", value: String(plan.total_carb_g ?? "—") },
        { label: "Gordura (g)", value: String(plan.total_fat_g ?? "—") },
      ],
      sections: [{
        title: "Refeições",
        headers: ["Refeição", "Horário", "Alimento", "Quantidade", "Kcal", "P", "C", "G"],
        rows: planItems.map((it) => [
          it.meal_name, it.meal_time ?? "", it.food, it.quantity ?? "",
          String(it.kcal ?? ""), String(it.protein_g ?? ""), String(it.carb_g ?? ""), String(it.fat_g ?? ""),
        ]),
      }],
    });
  };

  if (!patient) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate("/dashboard/pacientes")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          <div className="flex gap-2 mt-1">
            {patient.goal && <Badge variant="secondary" className="capitalize">{patient.goal}</Badge>}
            {patient.sex && <Badge variant="outline">{patient.sex}</Badge>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="avaliacoes">
        <TabsList>
          <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          <TabsTrigger value="planos">Planos alimentares</TabsTrigger>
          <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
          <TabsTrigger value="dados">Dados clínicos</TabsTrigger>
        </TabsList>

        <TabsContent value="avaliacoes" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={assessOpen} onOpenChange={setAssessOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova avaliação</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova avaliação antropométrica</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Peso (kg)</Label><Input type="number" step="0.1" value={assessForm.weight_kg} onChange={(e) => setAssessForm({ ...assessForm, weight_kg: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Altura (cm)</Label><Input type="number" step="0.1" value={assessForm.height_cm} onChange={(e) => setAssessForm({ ...assessForm, height_cm: e.target.value })} /></div>
                    <div className="space-y-1"><Label>% Gordura</Label><Input type="number" step="0.1" value={assessForm.body_fat_percent} onChange={(e) => setAssessForm({ ...assessForm, body_fat_percent: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Cintura (cm)</Label><Input type="number" step="0.1" value={assessForm.waist_cm} onChange={(e) => setAssessForm({ ...assessForm, waist_cm: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Quadril (cm)</Label><Input type="number" step="0.1" value={assessForm.hip_cm} onChange={(e) => setAssessForm({ ...assessForm, hip_cm: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea value={assessForm.notes} onChange={(e) => setAssessForm({ ...assessForm, notes: e.target.value })} /></div>
                  <Button onClick={saveAssessment} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Peso</TableHead><TableHead>Altura</TableHead><TableHead>IMC</TableHead><TableHead>%BF</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
              <TableBody>
                {assessments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma avaliação ainda</TableCell></TableRow>}
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.assessment_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{a.weight_kg ?? "—"} kg</TableCell>
                    <TableCell>{a.height_cm ?? "—"} cm</TableCell>
                    <TableCell>{a.bmi ?? "—"}</TableCell>
                    <TableCell>{a.body_fat_percent ?? "—"}%</TableCell>
                    <TableCell className="max-w-xs truncate">{a.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="planos" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Sparkles className="h-4 w-4" /> Gerar com IA</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Gerar plano alimentar com IA</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Título do plano (opcional)</Label><Input value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} placeholder="Ex.: Plano cutting fase 1" /></div>
                  <div className="space-y-1"><Label>Instruções adicionais</Label>
                    <Textarea rows={4} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ex.: paciente vegetariano, prefere refeições rápidas, pratica musculação 4x/semana..." /></div>
                  <p className="text-xs text-muted-foreground">A IA usa os dados do paciente e a última avaliação. Revise e ajuste o plano antes de entregar.</p>
                  <Button onClick={generateAiPlan} disabled={aiLoading} className="w-full gap-2">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {aiLoading ? "Gerando..." : "Gerar plano"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {plans.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum plano alimentar criado ainda.</CardContent></Card>}
          {plans.map((pl) => (
            <Card key={pl.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">{pl.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(pl.created_at).toLocaleDateString("pt-BR")} · {pl.total_kcal ?? "—"} kcal · P {pl.total_protein_g ?? "—"}g · C {pl.total_carb_g ?? "—"}g · G {pl.total_fat_g ?? "—"}g
                    {pl.generated_by_ai && <Badge variant="secondary" className="ml-2 gap-1"><Sparkles className="h-3 w-3" /> IA</Badge>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => exportPlanPDF(pl)}><FileDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deletePlan(pl.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Refeição</TableHead><TableHead>Horário</TableHead><TableHead>Alimento</TableHead><TableHead>Qtde</TableHead><TableHead>Kcal</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(items[pl.id] ?? []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.meal_name}</TableCell>
                        <TableCell>{it.meal_time ?? "—"}</TableCell>
                        <TableCell>{it.food}</TableCell>
                        <TableCell>{it.quantity ?? "—"}</TableCell>
                        <TableCell>{it.kcal ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="anamnese" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Anamnese nutricional</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={14}
                placeholder="Histórico clínico, hábitos alimentares, recordatório 24h, consumo de água, sono, atividade física, exames recentes..."
                value={anamnesis}
                onChange={(e) => setAnamnesis(e.target.value)}
              />
              <Button onClick={saveAnamnesis}>Salvar anamnese</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados">
          <Card>
            <CardContent className="pt-6 space-y-3 text-sm">
              <div><span className="font-semibold">Restrições:</span> {patient.dietary_restrictions || "—"}</div>
              <div><span className="font-semibold">Alergias:</span> {patient.allergies || "—"}</div>
              <div><span className="font-semibold">Condições médicas:</span> {patient.medical_conditions || "—"}</div>
              <div><span className="font-semibold">Observações:</span> {patient.notes || "—"}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
