import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Pill, Beaker, Stethoscope, AlertTriangle, Ban, Zap,
  FileText, ChevronLeft, FlaskConical, Shield
} from "lucide-react";
import DoseCalculator from "./DoseCalculator";

export interface DrugReferenceData {
  id: string;
  name: string;
  commercial_name: string | null;
  active_ingredient: string;
  drug_class: string | null;
  species: string | null;
  indications: string | null;
  dosage: string | null;
  contraindications: string | null;
  adverse_effects: string | null;
  interactions: string | null;
  withdrawal_period: string | null;
  dose_min_mg_kg: number | null;
  dose_max_mg_kg: number | null;
  route: string | null;
  frequency: string | null;
  concentration_mg_ml: number | null;
}

interface DrugMonographProps {
  drug: DrugReferenceData;
  onBack: () => void;
}

function Section({ icon: Icon, title, content, variant }: {
  icon: React.ElementType;
  title: string;
  content: string | null;
  variant?: "warning" | "danger";
}) {
  if (!content) return null;
  const colorMap = {
    warning: "text-amber-700 dark:text-amber-400",
    danger: "text-destructive",
  };
  const bgMap = {
    warning: "bg-amber-50 dark:bg-amber-950/20",
    danger: "bg-destructive/5",
  };
  return (
    <div className={`rounded-lg p-3 ${variant ? bgMap[variant] : "bg-muted/50"}`}>
      <div className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${variant ? colorMap[variant] : "text-foreground"}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className={`text-sm leading-relaxed ${variant ? colorMap[variant] : "text-muted-foreground"}`}>
        {content}
      </p>
    </div>
  );
}

export default function DrugMonograph({ drug, onBack }: DrugMonographProps) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Voltar ao bulário
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{drug.name}</CardTitle>
              {drug.commercial_name && (
                <p className="text-sm text-muted-foreground mt-1">{drug.commercial_name}</p>
              )}
            </div>
            <Badge className="bg-primary/10 text-primary shrink-0 text-xs">
              📚 Base oficial
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {drug.drug_class && (
              <Badge variant="secondary" className="text-xs">
                <FlaskConical className="h-3 w-3 mr-1" />
                {drug.drug_class}
              </Badge>
            )}
            {drug.species && (
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {drug.species}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Dose calculator - per species */}
          <DoseCalculator
            drugReferenceId={drug.id}
            drugName={drug.name}
          />

          <Separator />

          {/* Info sections */}
          <div className="grid gap-3">
            <Section icon={Beaker} title="Princípio Ativo" content={drug.active_ingredient} />
            <Section icon={Stethoscope} title="Indicações" content={drug.indications} />
            <Section icon={Pill} title="Posologia" content={drug.dosage} />
            <Section icon={Ban} title="Contraindicações" content={drug.contraindications} variant="danger" />
            <Section icon={AlertTriangle} title="Efeitos Adversos" content={drug.adverse_effects} variant="warning" />
            <Section icon={Zap} title="Interações Medicamentosas" content={drug.interactions} variant="warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
