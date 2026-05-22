import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Weight, Syringe, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SpeciesDose {
  species: string;
  dose_min_mg_kg: number | null;
  dose_max_mg_kg: number | null;
  route: string | null;
  frequency: string | null;
  concentration_mg_ml: number | null;
}

interface DoseCalculatorProps {
  drugReferenceId: string;
  drugName: string;
}

export default function DoseCalculator({ drugReferenceId, drugName }: DoseCalculatorProps) {
  const [doses, setDoses] = useState<SpeciesDose[]>([]);
  const [weights, setWeights] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("drug_reference_doses")
      .select("species, dose_min_mg_kg, dose_max_mg_kg, route, frequency, concentration_mg_ml")
      .eq("drug_reference_id", drugReferenceId)
      .order("species")
      .then(({ data }) => {
        if (data && data.length > 0) setDoses(data as SpeciesDose[]);
      });
  }, [drugReferenceId]);

  if (doses.length === 0) return null;

  const formatNum = (n: number) => {
    if (n < 0.01) return n.toFixed(4);
    if (n < 1) return n.toFixed(2);
    return n.toFixed(1);
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Calculator className="h-4 w-4" />
        Calculadora de Dose — {drugName}
      </div>

      <div className="grid gap-4">
        {doses.map((dose) => {
          const weight = weights[dose.species] ?? "";
          const weightNum = parseFloat(weight);
          const hasWeight = !isNaN(weightNum) && weightNum > 0;
          const doseMin = (dose.dose_min_mg_kg ?? dose.dose_max_mg_kg ?? 0) * (hasWeight ? weightNum : 0);
          const doseMax = (dose.dose_max_mg_kg ?? dose.dose_min_mg_kg ?? 0) * (hasWeight ? weightNum : 0);
          const conc = dose.concentration_mg_ml;
          const volMin = conc && conc > 0 ? doseMin / conc : null;
          const volMax = conc && conc > 0 ? doseMax / conc : null;

          return (
            <div key={dose.species} className="bg-background rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Dosagem para {dose.species}</span>
                <div className="flex gap-1.5">
                  {dose.route && <Badge variant="outline" className="text-[10px]">Via: {dose.route}</Badge>}
                  {dose.frequency && <Badge variant="outline" className="text-[10px]">Freq: {dose.frequency}</Badge>}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Recomendado: {dose.dose_min_mg_kg ?? "?"} – {dose.dose_max_mg_kg ?? "?"} mg/kg
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-[180px]">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    Peso (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="Ex: 10"
                    value={weight}
                    onChange={(e) => setWeights((prev) => ({ ...prev, [dose.species]: e.target.value }))}
                    className="mt-1 h-9 text-sm font-semibold"
                  />
                </div>

                {hasWeight && (
                  <div className="flex gap-3 flex-1">
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Dose</div>
                      <div className="text-sm font-bold text-primary">
                        {doseMin === doseMax
                          ? `${formatNum(doseMin)} mg`
                          : `${formatNum(doseMin)} – ${formatNum(doseMax)} mg`}
                      </div>
                    </div>
                    {volMin !== null && volMax !== null && (
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-0.5 justify-center">
                          <Syringe className="h-2.5 w-2.5" /> Volume
                        </div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {volMin === volMax
                            ? `${formatNum(volMin)} mL`
                            : `${formatNum(volMin)} – ${formatNum(volMax)} mL`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Os valores são referências gerais. Ajuste conforme condição clínica, espécie e raça do paciente.
        </span>
      </div>
    </div>
  );
}
