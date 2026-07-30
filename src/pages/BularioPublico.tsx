import { PublicHeader } from "@/components/PublicHeader";
import { SocialProofStrip } from "@/components/SocialProofStrip";
import Bulario from "./dashboard/Bulario";
import Protocolos from "./dashboard/Protocolos";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, HeartPulse, Package, Users, BarChart3, Bell, Shield,
  ArrowRight, Check, Pill, Calculator, Zap, BookOpen, Star, Quote, ClipboardList,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Footer from "@/components/landing/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { trackEvent } from "@/lib/trackEvent";
import { EmailCapture } from "@/components/EmailCapture";

/* ─── Static Hero ───────────────────────────────────────── */
function StaticHero({ user }: { user: boolean }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: "260px" }}>
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(https://images.unsplash.com/photo-1769117112485-5a6a22c37226?auto=format&fit=crop&w=1600&q=80)" }}
      />
      {/* Gradient overlay — deixa a foto visível */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/80 via-[#0f2d5c]/65 to-[#1a56db]/40" />
      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative container mx-auto px-4 py-10 md:py-14 max-w-3xl">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white/90 text-[11px] font-bold px-3 py-1 rounded-full tracking-widest uppercase mb-4">
          ✦ Plano único · R$129,90 · tudo incluso
        </span>

        {/* Headline */}
        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-3">
          Sua clínica com<br />
          <span className="text-blue-300">IA integrada</span>
        </h1>

        <p className="text-white/70 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
          Bulário gratuito para todos. Prontuário, agenda, financeiro e IA veterinária para quem assina.
          Um plano, sem letras miúdas.
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2 mb-7">
          {["IA veterinária", "Prontuário", "Financeiro", "Estoque", "Equipe"].map((f) => (
            <span key={f} className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
              <Check className="h-2.5 w-2.5 text-blue-300 flex-none" />
              {f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        {!user ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/register" onClick={() => trackEvent("hero-register")}>
              <Button size="lg" className="bg-white text-primary hover:bg-white/92 font-extrabold shadow-xl gap-2 px-6">
                Comece grátis por 7 dias <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login" onClick={() => trackEvent("hero-login")}>
              <Button size="lg" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20">
                Já tenho conta
              </Button>
            </Link>
          </div>
        ) : (
          <Link to="/dashboard">
            <Button size="lg" className="bg-white text-primary hover:bg-white/92 font-extrabold gap-2 px-6">
              Ir para o sistema <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}

        <p className="text-[11px] text-white/40 mt-3">Sem cartão · Cancele quando quiser</p>
      </div>
    </div>
  );
}

/* ─── Testimonials ──────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Dra. Camila Rocha",
    role: "Clínica Veterinária PetCare, SP",
    avatar: "CR",
    color: "bg-violet-500",
    text: "A IA me poupa pelo menos 20 minutos por consulta. A anamnese sai automática e o diagnóstico diferencial já vem sugerido. Nunca mais abri planilha.",
  },
  {
    name: "Dr. Marcos Fontes",
    role: "Médico Veterinário Autônomo, RJ",
    avatar: "MF",
    color: "bg-emerald-500",
    text: "O bulário gratuito já era ótimo. Quando assinei e vi o calculador de dose integrado com o prontuário, foi outro nível. Vale cada centavo dos R$129,90.",
  },
  {
    name: "Ana Beatriz Lima",
    role: "Gestora · Hospital Vet Curitiba",
    avatar: "AB",
    color: "bg-blue-500",
    text: "Tínhamos 3 sistemas diferentes: agenda, financeiro e prontuário. Com o SystemHub unificamos tudo. O fechamento de caixa agora leva 5 minutos.",
  },
];

function Testimonials() {
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
    <section ref={ref} className="py-14 border-t bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
          </div>
          <h2 className="text-2xl font-extrabold">Quem usa, recomenda</h2>
          <p className="text-sm text-muted-foreground mt-1">Veterinários que trocaram planilhas pelo SystemHub</p>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="rounded-2xl border bg-card p-5 space-y-4 hover:shadow-lg transition-shadow"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <Quote className="h-5 w-5 text-primary/30" />
              <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-2 border-t">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────── */
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
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Plano VetPro · R$129,90/mês · tudo incluso</Badge>
          <h2 className="text-2xl md:text-3xl font-extrabold">Além do bulário gratuito</h2>
          <p className="mt-2 text-muted-foreground text-sm max-w-lg mx-auto">
            Assine e tenha o sistema completo — sem surpresas, sem planos intermediários.
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
            <Link to="/register" onClick={() => trackEvent("features-register")}>
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

/* ─── Sticky CTA ────────────────────────────────────────── */
const STICKY_HEIGHT = 64; // px — must match the bar's rendered height

function StickyCtaBar({ user }: { user: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Push page content up so the bar never covers items
  useEffect(() => {
    if (!user && show) {
      document.body.style.paddingBottom = `${STICKY_HEIGHT}px`;
    } else {
      document.body.style.paddingBottom = "";
    }
    return () => { document.body.style.paddingBottom = ""; };
  }, [show, user]);

  if (user) return null;

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
          <Link to="/login" onClick={() => trackEvent("sticky-login")}>
            <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 h-8">
              Entrar
            </Button>
          </Link>
          <Link to="/register" onClick={() => trackEvent("sticky-register")}>
            <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-bold h-8 gap-1.5">
              Teste grátis <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────── */
export default function BularioPublico() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"medicamentos" | "protocolos">("medicamentos");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <StaticHero user={!!user} />
      <SocialProofStrip />

      {/* Bulário + Protocolos section */}
      <div className="container mx-auto px-4 pt-10 pb-2 max-w-5xl">
        {/* Tab toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveTab("medicamentos")}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-left font-bold transition-all border-2 ${
              activeTab === "medicamentos"
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <BookOpen className="h-5 w-5 flex-shrink-0" />
            <div>
              <div className="text-sm leading-tight">Medicamentos</div>
              <div className="text-[10px] font-normal opacity-70 leading-tight">Bulário veterinário</div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("protocolos")}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-left font-bold transition-all border-2 ${
              activeTab === "protocolos"
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <ClipboardList className="h-5 w-5 flex-shrink-0" />
            <div>
              <div className="text-sm leading-tight">Protocolos</div>
              <div className="text-[10px] font-normal opacity-70 leading-tight">Guias clínicos</div>
            </div>
          </button>
        </div>

        {activeTab === "medicamentos" && (
          <>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground pb-4 border-b mb-4">
              <span className="flex items-center gap-1"><Pill className="h-3 w-3" /> Pesquise por nome, classe ou espécie</span>
              {!user && (
                <span className="flex items-center gap-1 text-primary font-semibold">
                  <Calculator className="h-3 w-3" />
                  Calculadora de dose — <Link to="/register" className="underline underline-offset-2">assine para usar</Link>
                </span>
              )}
              {!user && (
                <div className="ml-auto">
                  <Link to="/register">
                    <Button size="sm" className="gap-1.5 font-bold">
                      <Zap className="h-3.5 w-3.5" /> 7 dias grátis
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <main className="container mx-auto px-4 pb-8 flex-1 max-w-5xl">
        {activeTab === "medicamentos" ? <Bulario /> : <Protocolos />}
      </main>

      <Testimonials />
      {!user && <EmailCapture />}
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
                <Button size="lg" variant="ghost" className="border border-white/40 text-white hover:bg-white/15 hover:text-white px-8">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
      <StickyCtaBar user={!!user} />
      <WhatsAppButton watchStickyBar={!user} />
    </div>
  );
}
