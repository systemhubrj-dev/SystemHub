import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Stethoscope, FileText, Calendar, Users,
  DollarSign, Bell, BarChart3, Clock, Check, ChevronLeft, ArrowRight
} from "lucide-react";

const recursos = [
  "Prontuário com IA e diagnósticos diferenciais",
  "Receituário digital com PDF profissional",
  "Agenda visual com lembretes automáticos via WhatsApp",
  "Cadastro completo de tutores e animais",
  "Financeiro, caixa e contas a pagar",
  "Controle de estoque e produtos",
  "Internação e hospitalização",
  "Relatórios visuais e gráficos gerenciais",
  "Multi-usuário com controle de permissões",
  "Suporte por e-mail e WhatsApp",
];

const faqs = [
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Não há fidelidade. Você pode cancelar quando quiser diretamente pelo painel, sem burocracia.",
  },
  {
    q: "Preciso de cartão de crédito para o período de teste?",
    a: "Não. O trial de 14 dias é totalmente gratuito e não exige dados de pagamento. Só cobramos se você decidir continuar.",
  },
  {
    q: "Quantos usuários posso cadastrar?",
    a: "O plano VetPro inclui suporte a múltiplos usuários com diferentes níveis de permissão (proprietário, veterinário, recepcionista). Não há limite fixo de usuários no plano atual.",
  },
];

const Planos = () => {
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

        {/* Header */}
        <section className="py-12 text-center container mx-auto px-4 max-w-2xl">
          <Badge variant="secondary" className="mb-4">Plano simples e transparente</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">
            Um plano. <span className="text-primary">Tudo incluso.</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Sem taxas escondidas, sem módulos extras. Tudo o que sua clínica precisa em um único valor mensal.
          </p>
        </section>

        {/* Pricing Card */}
        <section className="pb-16 container mx-auto px-4 max-w-lg">
          <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-xl shadow-primary/10">
            <div className="text-center mb-6">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">VetPro</p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-extrabold text-foreground">R$129,90</span>
                <span className="text-muted-foreground mb-2">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">14 dias grátis · Sem cartão obrigatório</p>
            </div>

            <ul className="space-y-3 mb-8">
              {recursos.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3">
              <Link to="/register">
                <Button size="lg" className="w-full gap-2 font-bold">
                  Começar grátis <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full">
                  Já tenho conta · Entrar
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-20 bg-secondary/30 py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 className="text-2xl font-extrabold text-foreground text-center mb-10">
              Perguntas frequentes
            </h2>
            <div className="space-y-6">
              {faqs.map(({ q, a }) => (
                <div key={q} className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="font-bold text-foreground mb-2">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Planos;
