import { Calendar, Users, DollarSign, Bell, BarChart3, Clock, Brain, Stethoscope, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function FeatureCard({ icon: Icon, title, desc, delay }: any) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`bg-card rounded-xl p-6 border border-border transition-all duration-500 group hover-scale hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:rotate-3 transition-all duration-300">
        <Icon size={22} className="text-primary" />
      </div>
      <h3 className="font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

const Features = () => {
  return (
    <section id="funcionalidades" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Tudo o que sua clínica precisa,{" "}
            <span className="text-primary">com IA de verdade</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Funcionalidades pensadas para o veterinário moderno — sem fricção, sem planilhas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
