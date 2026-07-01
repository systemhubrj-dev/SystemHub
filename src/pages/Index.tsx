import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Stethoscope, FileText, Calendar, Users,
  DollarSign, Bell, BarChart3, Clock, ArrowRight, ChevronLeft
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Anamnese com IA",
    desc: "Assistente clínico que sugere diagnósticos diferenciais com base nos sintomas e histórico do paciente.",
  },
  {
    icon: Stethoscope,
    title: "Prontuário Inteligente",
    desc: "Sistemas, sinais vitais, exame físico e anamnese estruturados — completos e rápidos de preencher.",
  },
  {
    icon: FileText,
    title: "Receituário Digital",
    desc: "Múltiplos medicamentos, via, forma farmacêutica, posologia e PDF profissional com cabeçalho da clínica.",
  },
  {
    icon: Calendar,
    title: "Agenda Visual",
    desc: "Atendimentos organizados por dia/semana, com lembretes automáticos e integração com WhatsApp.",
  },
  {
    icon: Users,
    title: "Cadastro Completo",
    desc: "Tutores, animais, vacinas, exames, internação e histórico financeiro — tudo conectado.",
  },
  {
    icon: DollarSign,
    title: "Financeiro & Caixa",
    desc: "Controle de entradas, saídas, contas a pagar, comissões e fechamento de caixa diário.",
  },
  {
    icon: Bell,
    title: "Lembretes Automáticos",
    desc: "Vacinas, retornos e cobranças disparados via WhatsApp para reduzir faltas e inadimplência.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Visuais",
    desc: "Lucro mensal, anual, evolução de cadastros e produtos mais vendidos em gráficos claros.",
  },
  {
    icon: Clock,
    title: "Internação e Hospitalização",
    desc: "Internação, medicação, controle de enfermagem e itens consumidos em tempo real.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Back link */}
        <div className="container mx-auto px-4 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Bulário
          </Link>
        </div>

        {/* Hero */}
        <section className="py-16 text-center container mx-auto px-4 max-w-3xl">
          <Badge variant="secondary" className="mb-4">Sistema de Gestão Veterinária</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
            O sistema mais completo para sua{" "}
            <span className="text-primary">clínica veterinária</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Prontuário com IA, agenda, financeiro, estoque, lembretes automáticos e muito mais —
            tudo em um único sistema pensado para veterinários.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/register">
              <Button size="lg" className="gap-2 font-bold">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
                Tudo o que sua clínica precisa,{" "}
                <span className="text-primary">com IA de verdade</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Funcionalidades pensadas para o veterinário moderno — sem fricção, sem planilhas.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-card rounded-xl p-6 border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Pronto para modernizar sua clínica?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Plano único · Tudo incluso · Sem surpresas na fatura
          </p>
          <p className="mt-2 text-4xl font-extrabold text-primary">
            R$129,90<span className="text-lg font-medium text-muted-foreground">/mês</span>
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/register">
              <Button size="lg" className="gap-2 font-bold">
                Começar grátis agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/planos">
              <Button size="lg" variant="outline">
                Ver detalhes do plano
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
