import { Check, X, Sparkles, Crown, Building2, Star, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

type Plan = {
  id: "essencial" | "profissional" | "clinica";
  name: string;
  price: string;
  icon: typeof Sparkles;
  description: string;
  popular?: boolean;
  highlight?: string;
  noAi?: boolean;
  basics: string[];
  premium: string[];
  missing: string[];
};

const plans: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    price: "89,90",
    icon: Sparkles,
    description: "Para o veterinário autônomo começar",
    noAi: true,
    basics: [
      "1 usuário · até 200 clientes",
      "Agenda, prontuário e receita digital",
      "Bulário (consulta)",
      "Caixa simples e financeiro básico",
      "Suporte por e-mail",
    ],
    premium: [],
    missing: [
      "IA / Assistente virtual",
      "Internação",
      "Equipe & Acessos",
      "Lembretes WhatsApp",
      "Relatórios avançados",
    ],
  },
  {
    id: "profissional",
    name: "Profissional",
    price: "139,90",
    icon: Crown,
    popular: true,
    highlight: "Mais escolhido",
    description: "Clínicas pequenas e médias com equipe",
    basics: [
      "Clientes ilimitados",
      "Agenda, prontuário e receita digital",
      "Bulário completo",
      "Caixa, financeiro e contas a pagar",
    ],
    premium: [
      "🤖 IA ilimitada (anamnese, diagnóstico, bulário)",
      "💬 Assistente virtual por voz e texto",
      "🏥 Internação completa (SOAP, enfermagem)",
      "📦 Estoque avançado (lotes, validade, promoções)",
      "📊 Relatórios avançados",
      "📱 Lembretes via WhatsApp",
      "👥 Convide até 3 funcionários (recepcionista / estoquista / vet)",
    ],
    missing: ["Multi-unidades", "API", "Marca branca"],
  },
  {
    id: "clinica",
    name: "Clínica IA+",
    price: "199,90",
    icon: Building2,
    highlight: "Para clínicas e hospitais",
    description: "Operação multi-unidade sem limites",
    basics: ["Tudo do Profissional", "Caixa, financeiro e contas a pagar"],
    premium: [
      "♾️ Equipe ilimitada com perfis e permissões",
      "🏢 Multi-unidades em uma só conta",
      "🧠 IA Premium (análise preditiva, exames por imagem)",
      "📈 Dashboard gerencial executivo",
      "🔌 API e integrações",
      "🏷️ Marca branca (sua identidade)",
      "🎓 Onboarding dedicado · Suporte 24h",
    ],
    missing: [],
  },
];

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = plan.icon;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-500 ${
        plan.popular
          ? "border-2 border-primary shadow-2xl shadow-primary/20 md:scale-[1.04] md:-mt-2 bg-gradient-to-br from-primary/5 to-card"
          : "border-border hover:border-primary/40 hover:shadow-xl"
      } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: visible ? `${index * 120}ms` : "0ms" }}
    >
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 text-xs font-bold shadow-md whitespace-nowrap">
          <Star className="h-3 w-3 mr-1 fill-current" />
          {plan.highlight}
        </Badge>
      )}
      {!plan.popular && plan.highlight && (
        <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background whitespace-nowrap">
          {plan.highlight}
        </Badge>
      )}
      {plan.noAi && (
        <Badge
          variant="outline"
          className="absolute top-4 right-4 text-[10px] border-muted-foreground/30 text-muted-foreground"
        >
          Sem IA
        </Badge>
      )}

      <div className="text-center pb-3 pt-6">
        <div
          className={`mx-auto mb-3 w-16 h-16 rounded-2xl flex items-center justify-center ${
            plan.popular
              ? "bg-gradient-to-br from-primary to-primary/60 text-primary-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{plan.description}</p>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-5xl font-extrabold tracking-tight text-foreground">R$ {plan.price}</span>
          <span className="text-muted-foreground text-sm">/mês</span>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {plan.basics.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Inclui
            </p>
            <ul className="space-y-2">
              {plan.basics.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.premium.length > 0 && (
          <div className="pt-3 border-t border-dashed">
            <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2 flex items-center gap-1">
              <Brain className="h-3 w-3" /> Recursos premium
            </p>
            <ul className="space-y-2">
              {plan.premium.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.missing.length > 0 && (
          <div className="pt-3 border-t border-dashed">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Não incluso
            </p>
            <ul className="space-y-1.5">
              {plan.missing.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="pt-6">
        <Link to="/register">
          <Button
            className="w-full hover-scale"
            variant={plan.popular ? "default" : "outline"}
            size="lg"
          >
            Começar agora
          </Button>
        </Link>
        <p className="text-[11px] text-center text-muted-foreground mt-2">
          7 dias grátis · sem cartão
        </p>
      </div>
    </div>
  );
}

const Pricing = () => {
  return (
    <section id="precos" className="py-20 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-50 -z-10" aria-hidden="true" />
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Planos com <span className="text-primary">IA inclusa</span> e preço justo
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sem surpresas. Cancele quando quiser. 7 dias grátis em qualquer plano.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto items-start pt-4">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
