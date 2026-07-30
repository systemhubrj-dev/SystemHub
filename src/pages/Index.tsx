import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/landing/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { trackEvent } from "@/lib/trackEvent";
import {
  ArrowRight, ArrowLeft, Check, Brain, Stethoscope, FileText,
  Calendar, Users, DollarSign, BarChart3, Clock, Bell,
  Building2, UserCheck, Hospital, Zap, ShieldCheck, Sparkles,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "7 dias", label: "Trial 100% grátis" },
  { value: "1 plano", label: "Sem módulos extras" },
  { value: "R$0", label: "Para começar" },
  { value: "WPP", label: "Suporte incluso" },
];

const FEATURE_GROUPS = [
  {
    color: "blue",
    icon: Stethoscope,
    title: "Clínica Digital",
    subtitle: "Tudo para o atendimento",
    items: [
      { icon: FileText,    label: "Prontuário completo com IA" },
      { icon: FileText,    label: "Receituário em PDF profissional" },
      { icon: Clock,       label: "Internação e Hospitalização" },
      { icon: Bell,        label: "Vacinas e lembretes automáticos" },
    ],
  },
  {
    color: "emerald",
    icon: DollarSign,
    title: "Financeiro",
    subtitle: "Controle total do caixa",
    items: [
      { icon: DollarSign,  label: "Controle de caixa diário" },
      { icon: BarChart3,   label: "Contas a pagar e receber" },
      { icon: BarChart3,   label: "Relatórios visuais mensais" },
      { icon: Users,       label: "Comissões por veterinário" },
    ],
  },
  {
    color: "violet",
    icon: Brain,
    title: "Gestão & IA",
    subtitle: "Tecnologia que trabalha por você",
    items: [
      { icon: Brain,       label: "Anamnese assistida por IA" },
      { icon: Sparkles,    label: "Diagnóstico diferencial inteligente" },
      { icon: Calendar,    label: "Agenda + integração WhatsApp" },
      { icon: Users,       label: "Equipe ilimitada com permissões" },
    ],
  },
];

const STEPS = [
  {
    num: "01",
    icon: UserCheck,
    title: "Cadastre sua clínica",
    desc: "Configure seu perfil, adicione veterinários e personalize o sistema em menos de 5 minutos.",
    time: "~5 min",
  },
  {
    num: "02",
    icon: Zap,
    title: "Explore por 7 dias grátis",
    desc: "Acesso completo a todos os recursos: prontuários, financeiro, IA e muito mais. Sem cartão.",
    time: "7 dias",
  },
  {
    num: "03",
    icon: ShieldCheck,
    title: "Assine e continue",
    desc: "R$129,90/mês com tudo incluso. Sem módulos extras, sem pegadinhas. Cancele quando quiser.",
    time: "R$129,90/mês",
  },
];

const PROFILES = [
  {
    icon: Building2,
    title: "Clínicas veterinárias",
    desc: "Sistema completo para equipes de todos os tamanhos.",
    bullets: ["Multi-usuário com controle de acesso", "Financeiro e caixa integrados", "Relatórios consolidados por período"],
  },
  {
    icon: UserCheck,
    title: "Veterinários autônomos",
    desc: "Organize tudo sem depender de secretária.",
    bullets: ["Agenda e prontuário num só lugar", "Receitas digitais em PDF", "IA que sugere diagnósticos"],
  },
  {
    icon: Hospital,
    title: "Hospitais veterinários",
    desc: "Internação, enfermagem e IA em escala.",
    bullets: ["Internação com controle de medicações", "Múltiplos setores e equipes", "Anamnese assistida por IA"],
  },
];

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useReveal(threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBar() {
  const { ref, visible } = useReveal(0.2);
  return (
    <div
      ref={ref}
      className={`border-y border-border bg-secondary/40 py-8 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="container mx-auto px-4 max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl font-extrabold text-primary">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "border-blue-500/30",    badge: "bg-blue-500/10 text-blue-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", badge: "bg-emerald-500/10 text-emerald-500" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "border-violet-500/30",  badge: "bg-violet-500/10 text-violet-500" },
};

function FeatureGroup({ group, delay }: { group: typeof FEATURE_GROUPS[0]; delay: number }) {
  const { ref, visible } = useReveal(0.1);
  const c = colorMap[group.color];
  const Icon = group.icon;
  return (
    <div
      ref={ref}
      className={`rounded-2xl border ${c.border} bg-card p-7 flex flex-col gap-5 transition-all duration-600 hover:shadow-lg hover:shadow-primary/5 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
          <Icon size={24} className={c.text} />
        </div>
        <div>
          <h3 className="font-extrabold text-lg text-foreground">{group.title}</h3>
          <p className="text-sm text-muted-foreground">{group.subtitle}</p>
        </div>
      </div>
      <ul className="space-y-3">
        {group.items.map(({ label }) => (
          <li key={label} className="flex items-center gap-3 text-sm text-foreground/80">
            <span className={`w-5 h-5 rounded-full ${c.bg} flex items-center justify-center shrink-0`}>
              <Check size={12} className={c.text} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({ step, delay }: { step: typeof STEPS[0]; delay: number }) {
  const { ref, visible } = useReveal(0.1);
  const Icon = step.icon;
  return (
    <div
      ref={ref}
      className={`flex flex-col items-center text-center gap-5 transition-all duration-600 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
          <Icon size={28} className="text-white" />
        </div>
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center">
          {parseInt(step.num)}
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1">{step.time}</p>
        <h3 className="font-extrabold text-lg mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px] mx-auto">{step.desc}</p>
      </div>
    </div>
  );
}

function ProfileCard({ profile, delay }: { profile: typeof PROFILES[0]; delay: number }) {
  const { ref, visible } = useReveal(0.1);
  const Icon = profile.icon;
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-border bg-card p-7 flex flex-col gap-4 hover:border-primary/30 hover:shadow-md transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon size={28} className="text-primary" />
      </div>
      <div>
        <h3 className="font-extrabold text-lg mb-1">{profile.title}</h3>
        <p className="text-sm text-muted-foreground">{profile.desc}</p>
      </div>
      <ul className="space-y-2 mt-1">
        {profile.bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-foreground/80">
            <Check size={14} className="text-primary shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0f2d5c] to-primary py-20 md:py-32">
        {/* dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="relative container mx-auto px-4 max-w-3xl text-center">
          <Badge className="mb-5 px-4 py-1.5 text-xs font-semibold tracking-wide bg-white/10 text-white border-white/20 backdrop-blur-sm">
            ✦ Sistema veterinário completo · Plano único R$129,90/mês
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5 leading-tight">
            Conheça o <span className="text-white/80">SystemHub</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
            O sistema de gestão veterinária com IA que une prontuário digital,
            financeiro, agenda e muito mais — tudo num único plano acessível.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" onClick={() => trackEvent("sobre-hero-register")}>
              <Button size="lg" className="gap-2 font-bold bg-white text-primary hover:bg-white/90 w-full sm:w-auto shadow-lg">
                Começar grátis por 7 dias <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/">
              <Button
                size="lg"
                variant="ghost"
                className="gap-2 border border-white/40 text-white hover:bg-white/15 hover:text-white w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar ao Bulário
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <StatBar />

      {/* ── O que está incluso ── */}
      <section className="py-20 border-b">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Tudo no mesmo plano</Badge>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3">
              O que está incluso
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Sem módulos extras. Sem pacotes avulsos. Um plano, acesso total.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURE_GROUPS.map((g, i) => (
              <FeatureGroup key={g.title} group={g} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="py-20 bg-secondary/30 border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-14">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Simples assim</Badge>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3">
              Como funciona
            </h2>
            <p className="text-muted-foreground">Comece a usar hoje. Configure em minutos.</p>
          </div>
          <div className="relative grid md:grid-cols-3 gap-10 md:gap-6">
            {STEPS.map((s, i) => (
              <StepCard key={s.num} step={s} delay={i * 150} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Para quem é ── */}
      <section className="py-20 border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Para quem é</Badge>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3">
              Feito para você
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Do autônomo ao hospital veterinário, o SystemHub se adapta ao seu tamanho.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PROFILES.map((p, i) => (
              <ProfileCard key={p.title} profile={p} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section id="precos" className="py-20 bg-gradient-to-br from-primary to-primary/80">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <Badge className="mb-5 bg-white/15 text-white border-white/20 backdrop-blur-sm">
            VetPro · Plano único
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
            R$129,90
            <span className="text-2xl font-normal text-white/60">/mês</span>
          </h2>
          <p className="text-white/70 text-lg mb-2">Tudo incluso · 7 dias grátis · Sem cartão</p>
          <p className="text-white/50 text-sm mb-8">Cancele quando quiser. Sem fidelidade.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" onClick={() => trackEvent("sobre-cta-register")}>
              <Button size="lg" className="gap-2 font-bold bg-white text-primary hover:bg-white/90 w-full sm:w-auto shadow-xl">
                Começar grátis agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/planos">
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/40 text-white hover:bg-white/15 hover:text-white w-full sm:w-auto"
              >
                Ver detalhes do plano
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {["Sem cartão para o trial", "Cancele a qualquer momento", "Suporte incluso"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-white/60">
                <Check size={12} className="text-white/50" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
