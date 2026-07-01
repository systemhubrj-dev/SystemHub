import { Check, Sparkles, Brain, Shield, HeartPulse, Package, Users, BarChart3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const features = [
  { icon: HeartPulse, label: "Prontuário, agenda e receita digital" },
  { icon: Brain, label: "IA ilimitada — anamnese, diagnóstico e bulário" },
  { icon: Sparkles, label: "Assistente veterinário por voz e texto" },
  { icon: Package, label: "Estoque com lotes, validade e promoções" },
  { icon: Users, label: "Equipe ilimitada com perfis e permissões" },
  { icon: BarChart3, label: "Financeiro completo e relatórios avançados" },
  { icon: Bell, label: "Lembretes via WhatsApp" },
  { icon: Shield, label: "Suporte prioritário e dados seguros" },
];

const Pricing = () => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="precos" className="py-20 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-50 -z-10" aria-hidden="true" />
      <div className="container mx-auto px-4">

        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Um plano. <span className="text-primary">Tudo incluso.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sem surpresas. Sem travar funcionalidade. Cancele quando quiser.
          </p>
        </div>

        <div
          ref={ref}
          className={`max-w-lg mx-auto transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="relative flex flex-col rounded-2xl border-2 border-primary shadow-2xl shadow-primary/20 bg-gradient-to-br from-primary/5 to-card p-8">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 text-xs font-bold shadow-md whitespace-nowrap">
              Plano VetPro · Mais escolhido
            </Badge>

            <div className="text-center pt-4 pb-6">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                <Brain className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">VetPro</h3>
              <p className="text-sm text-muted-foreground mt-1">Para clínicas e veterinários autônomos</p>
              <div className="mt-5 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">R$ 129,90</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{label}</span>
                  <Check className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />
                </li>
              ))}
            </ul>

            <Link to="/register">
              <Button className="w-full hover-scale" size="lg">
                Começar grátis por 7 dias
              </Button>
            </Link>
            <p className="text-[11px] text-center text-muted-foreground mt-3">
              7 dias grátis · sem cartão · sem compromisso
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Pricing;
