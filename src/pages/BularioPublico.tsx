import { PublicHeader } from "@/components/PublicHeader";
import { HeroCarousel } from "@/components/HeroCarousel";
import { SocialProofStrip } from "@/components/SocialProofStrip";
import Bulario from "./dashboard/Bulario";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, HeartPulse, Package, Users, BarChart3, Bell, Shield,
  ArrowRight, Check, Pill, Calculator, Zap, BookOpen,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  { icon: Brain, color: "text-violet-500", bg: "bg-violet-500/10", label: "IA veterinária ilimitada", sub: "Anamnese, diagnóstico diferencial, dosagem" },
  { icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-500/10", label: "Prontuário e agenda", sub: "Histórico completo, SOAP, receita digital" },
  { icon: Package, color: "text-amber-500", bg: "bg-amber-500/10", label: "Estoque inteligente", sub: "Lotes, validade, promoções automáticas" },
  { icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", label: "Equipe ilimitada", sub: "Vets, recepcionistas e estoquistas" },
  { icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Financeiro completo", sub: "Caixa, contas a pagar e relatórios" },
  { icon: Bell, color: "text-sky-500", bg: "bg-sky-500/10", label: "Lembretes via WhatsApp", sub: "Vacinas, consultas e retornos" },
];

function FeatureSection({ user }: { user: boolean }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-16 border-t bg-secondary/20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Plano VetPro · R$129,90/mês</Badge>
          <h2 className="text-2xl md:text-3xl font-extrabold">Tudo o que sua clínica precisa</h2>
          <p className="mt-2 text-muted-foreground text-sm max-w-lg mx-auto">
            O bulário é só o começo. Assine e tenha o sistema completo num único plano — sem surpresas.
          </p>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {FEATURES.map(({ icon: Icon, color, bg, label, sub }) => (
            <div key={label} className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 ml-auto" />
            </div>
          ))}
        </div>

        {!user && (
          <div className="mt-10 text-center">
            <Link to="/register">
              <Button size="lg" className="gap-2 font-bold px-8 shadow-lg shadow-primary/25">
                Começar grátis por 7 dias <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">Sem cartão · Cancele quando quiser</p>
          </div>
        )}
      </div>
    </section>
  );
}

function StickyCtaBar({ user }: { user: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (user || !show) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-2xl transition-transform duration-300 ${show ? "translate-y-0" : "translate-y-full"}`}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 max-w-4xl">
        <div className="flex items-center gap-3 min-w-0">
          <Brain className="h-5 w-5 shrink-0 opacity-80" />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">Plano VetPro · R$129,90/mês</p>
            <p className="text-xs opacity-70 truncate">Bulário + IA + Financeiro + Equipe — tudo incluso</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 h-8">
              Entrar
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-bold h-8 gap-1.5">
              Teste grátis <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BularioPublico() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <HeroCarousel user={!!user} />
      <SocialProofStrip />

      {/* Bulário section header */}
      <div className="container mx-auto px-4 pt-10 pb-2 max-w-5xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">Bulário Veterinário</h1>
            <p className="text-xs text-muted-foreground">Consulta gratuita · IA incluída para assinantes</p>
          </div>
          {!user && (
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-3 py-1.5">
                <Pill className="h-3.5 w-3.5" />
                <span>Calcular doses com IA</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pro</Badge>
              </div>
              <Link to="/register">
                <Button size="sm" className="gap-1.5 font-bold">
                  <Zap className="h-3.5 w-3.5" />
                  7 dias grátis
                </Button>
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2 pb-4 border-b">
          <span className="flex items-center gap-1"><Pill className="h-3 w-3" /> Pesquise por nome, classe ou espécie</span>
          <span className="flex items-center gap-1"><Calculator className="h-3 w-3" /> Calculadora de dose inclusa</span>
          <span className="flex items-center gap-1 text-primary font-semibold"><Brain className="h-3 w-3" /> IA disponível para assinantes</span>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-8 flex-1 max-w-5xl">
        <Bulario />
      </main>

      <FeatureSection user={!!user} />

      {/* Footer CTA */}
      {!user && (
        <section className="py-14 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Pronto para modernizar sua clínica?</h2>
            <p className="text-primary-foreground/75 text-sm mb-6">
              R$129,90/mês · Tudo incluso · 7 dias grátis sem cartão
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8 gap-2 shadow-xl">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <StickyCtaBar user={!!user} />

      {/* Bottom padding for sticky bar */}
      {!user && <div className="h-16" />}
    </div>
  );
}
