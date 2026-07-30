import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { trackEvent } from "@/lib/trackEvent";
import {
  Brain, Stethoscope, BarChart3, Check, ChevronLeft, ArrowRight,
  Shield, CreditCard, MessageCircle, Lock, X, Sparkles,
  ClipboardList, Calculator, PenLine, FileText, Calendar,
  Package, Users, DollarSign, TrendingUp, Syringe,
} from "lucide-react";

/* ─────────────────────────── constants ─────────────────────────── */

const featureCategories = [
  {
    label: "IA Veterinária",
    icon: Brain,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    items: [
      { icon: Sparkles, text: "Anamnese guiada por IA" },
      { icon: Brain, text: "Diagnóstico diferencial automático" },
      { icon: Calculator, text: "Bulário + calculadora de dose" },
      { icon: PenLine, text: "Assistente de texto clínico" },
    ],
  },
  {
    label: "Clínica Digital",
    icon: Stethoscope,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    items: [
      { icon: ClipboardList, text: "Prontuário eletrônico completo" },
      { icon: FileText, text: "Receituário em PDF profissional" },
      { icon: Calendar, text: "Agenda + lembretes via WhatsApp" },
      { icon: Syringe, text: "Controle de internação" },
    ],
  },
  {
    label: "Gestão",
    icon: BarChart3,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    items: [
      { icon: DollarSign, text: "Financeiro e caixa integrado" },
      { icon: Package, text: "Estoque com rastreio de lotes" },
      { icon: Users, text: "Equipe ilimitada com permissões" },
      { icon: TrendingUp, text: "Relatórios e gráficos gerenciais" },
    ],
  },
];

const trustBadges = [
  { icon: Lock, label: "Dados seguros", sub: "Criptografia SSL/TLS" },
  { icon: X, label: "Sem fidelidade", sub: "Cancele quando quiser" },
  { icon: CreditCard, label: "Sem cartão no trial", sub: "7 dias 100% grátis" },
  { icon: MessageCircle, label: "Suporte via WhatsApp", sub: "Resposta rápida" },
];

const comparisons = [
  { sem: "Planilhas confusas e desorganizadas", com: "Prontuário digital centralizado" },
  { sem: "Esquecer vacinas e retornos", com: "Lembretes automáticos via WhatsApp" },
  { sem: "Receituários escritos à mão", com: "PDF profissional em 1 clique" },
  { sem: "Caixa no papel ou intuição", com: "Financeiro com relatórios visuais" },
  { sem: "Doses calculadas de cabeça", com: "IA sugere dose e redige a prescrição" },
];

const faqs = [
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Não há fidelidade nem multa. Cancele quando quiser diretamente pelo painel, sem burocracia e sem precisar ligar para ninguém.",
  },
  {
    q: "Preciso de cartão de crédito para o trial?",
    a: "Não. Os 7 dias de teste são totalmente gratuitos e não exigem nenhum dado de pagamento. Só cobramos se você decidir continuar.",
  },
  {
    q: "Tem IA mesmo? Como funciona?",
    a: "Sim. Durante a consulta, a IA sugere perguntas de anamnese, lista diagnósticos diferenciais e redige automaticamente a evolução clínica. Você revisa e confirma — o controle sempre é seu.",
  },
  {
    q: "Funciona para múltiplos veterinários?",
    a: "Perfeitamente. O VetPro suporta equipe ilimitada com perfis distintos: proprietário, veterinário e recepcionista, cada um com seu nível de acesso.",
  },
  {
    q: "E se eu quiser meus dados de volta?",
    a: "Seus dados são seus. Você pode exportar prontuários, fichas e relatórios a qualquer momento, inclusive antes de cancelar.",
  },
];

/* ─────────────────────────── component ─────────────────────────── */

const Planos = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="flex-1">

        {/* ── Back link ── */}
        <div className="container mx-auto px-4 pt-6 max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Bulário
          </Link>
        </div>

        {/* ── Hero ── */}
        <section className="py-14 text-center container mx-auto px-4 max-w-2xl">
          <Badge variant="secondary" className="mb-5 text-xs font-semibold tracking-wide px-3 py-1">
            Plano simples · Tudo incluso
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
            Um plano.{" "}
            <span className="text-primary">Tudo que você precisa.</span>
          </h1>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto">
            Sem módulos extras, sem surpresas na fatura. Um único valor mensal
            libera todas as ferramentas da sua clínica — da IA ao financeiro.
          </p>
        </section>

        {/* ── Pricing Card ── */}
        <section className="pb-16 container mx-auto px-4 max-w-lg">
          <div className="bg-card border-2 border-primary rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">

            {/* Card header */}
            <div className="bg-primary/5 border-b border-primary/20 px-8 py-5 text-center">
              <Badge className="mb-3 bg-primary/15 text-primary border-primary/30 text-xs font-bold tracking-wider">
                VetPro · Mais escolhido
              </Badge>
              <div className="flex items-end justify-center gap-1">
                <span className="text-2xl font-bold text-muted-foreground mt-1">R$</span>
                <span className="text-6xl font-extrabold text-foreground leading-none">129</span>
                <span className="text-3xl font-extrabold text-foreground mb-1">,90</span>
                <span className="text-muted-foreground mb-2 ml-1">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                🎉 7 dias grátis · Sem cartão de crédito
              </p>
            </div>

            {/* Feature categories */}
            <div className="px-8 py-6 space-y-6">
              {featureCategories.map(({ label, icon: CatIcon, color, bg, border, items }) => (
                <div key={label}>
                  <div className={`inline-flex items-center gap-2 ${bg} ${border} border rounded-full px-3 py-1 mb-3`}>
                    <CatIcon className={`h-3.5 w-3.5 ${color}`} />
                    <span className={`text-xs font-bold ${color}`}>{label}</span>
                  </div>
                  <ul className="space-y-2">
                    {items.map(({ icon: ItemIcon, text }) => (
                      <li key={text} className="flex items-center gap-3 text-sm text-foreground">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                        <span className="flex items-center gap-2">
                          <ItemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="px-8 pb-8 flex flex-col gap-3">
              <Link to="/register" onClick={() => trackEvent("planos-card-register")}>
                <Button size="lg" className="w-full gap-2 font-bold text-base h-12">
                  Começar grátis por 7 dias
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full h-12 text-sm">
                  Já tenho conta · Entrar
                </Button>
              </Link>
              <p className="text-center text-xs text-muted-foreground pt-1">
                Sem fidelidade. Cancele quando quiser.
              </p>
            </div>
          </div>
        </section>

        {/* ── Trust badges ── */}
        <section className="py-10 bg-secondary/40">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trustBadges.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison ── */}
        <section className="py-20 container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
              Sua rotina antes e depois
            </h2>
            <p className="mt-2 text-muted-foreground">
              Veja como o SystemHub transforma o dia a dia da clínica
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Sem SystemHub */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/40 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/40">
                  <X className="h-4 w-4 text-red-500" />
                </div>
                <span className="font-bold text-red-600 dark:text-red-400">Sem SystemHub</span>
              </div>
              <ul className="space-y-3">
                {comparisons.map(({ sem }) => (
                  <li key={sem} className="flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
                    <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    {sem}
                  </li>
                ))}
              </ul>
            </div>

            {/* Com SystemHub */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Com SystemHub</span>
              </div>
              <ul className="space-y-3">
                {comparisons.map(({ com }) => (
                  <li key={com} className="flex items-start gap-2.5 text-sm text-emerald-700 dark:text-emerald-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {com}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 bg-primary/5">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
                Perguntas frequentes
              </h2>
              <p className="mt-2 text-muted-foreground">
                Tire suas dúvidas antes de começar
              </p>
            </div>
            <div className="space-y-4">
              {faqs.map(({ q, a }) => (
                <div
                  key={q}
                  className="bg-card border border-border border-l-4 border-l-primary rounded-xl px-6 py-5"
                >
                  <h3 className="font-bold text-foreground mb-2 text-sm md:text-base">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Final ── */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <Badge className="mb-5 bg-white/20 text-primary-foreground border-white/30 text-xs font-semibold">
              Sem compromisso · Cancele quando quiser
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Comece hoje por R$0
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-3">
              7 dias grátis. Depois, apenas{" "}
              <strong className="text-white">R$129,90/mês</strong> com tudo incluso.
            </p>
            <p className="text-primary-foreground/60 text-sm mb-8">
              Sem cartão de crédito. Sem burocracia. Sem surpresas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" onClick={() => trackEvent("planos-cta-register")}>
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-bold gap-2 h-12 px-8"
                >
                  Criar minha conta grátis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="border border-white/40 text-white hover:bg-white/15 hover:text-white h-12 px-8"
                >
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Planos;
