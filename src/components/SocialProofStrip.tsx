import { useEffect, useState } from "react";
import { Pill, PawPrint, Clock, ShieldCheck, Wifi, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SocialProofStrip() {
  const [drugCount, setDrugCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("drug_reference")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => { if (count !== null) setDrugCount(count); });
  }, []);

  const drugValue = drugCount !== null ? `+${drugCount}` : "...";

  const STATS = [
    {
      icon: Pill,
      value: drugValue,
      label: "medicamentos no bulário",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: PawPrint,
      value: "∞",
      label: "espécies — sem limite",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Clock,
      value: "<1h",
      label: "para começar a usar",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: ShieldCheck,
      value: "7 dias",
      label: "grátis sem cartão",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Wifi,
      value: "100%",
      label: "online, sem instalar",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      icon: Layers,
      value: "1 plano",
      label: "tudo incluso · R$129,90",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="w-full border-y border-border bg-secondary/40">
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:gap-x-10">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="leading-tight">
                  <p className={`text-base font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
