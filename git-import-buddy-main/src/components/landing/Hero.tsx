import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-mockup.jpg";

const benefits = [
  "IA veterinária integrada",
  "Receituário digital",
  "Controle financeiro",
];

const Hero = () => {
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-mesh -z-10" aria-hidden="true" />

      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold animate-fade-in opacity-0" style={{ animationDelay: "0ms" }}>
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              Sistema veterinário com IA
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground animate-fade-in-up opacity-0" style={{ animationDelay: "120ms" }}>
              Sua clínica com{" "}
              <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                IA integrada
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md animate-fade-in-up opacity-0" style={{ animationDelay: "240ms" }}>
              Prontuário inteligente, receituário digital, controle financeiro e assistente veterinário com IA — tudo em um só lugar.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: "360ms" }}>
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="text-primary" />
                  {b}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2 animate-fade-in-up opacity-0" style={{ animationDelay: "480ms" }}>
              <Link to="/register">
                <Button size="lg" className="gap-2 hover-scale btn-shimmer shadow-lg shadow-primary/30">
                  Teste grátis por 7 dias <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="hover-scale">
                  Acessar sistema
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-in opacity-0" style={{ animationDelay: "300ms" }}>
            <div className="absolute -inset-8 bg-gradient-to-br from-primary/25 via-accent/10 to-transparent rounded-[2.5rem] blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
            <img
              src={heroImg}
              alt="Dashboard do System Hub mostrando prontuário e controle financeiro"
              className="relative rounded-2xl shadow-2xl shadow-primary/20 border border-border w-full animate-float"
              width={1280}
              height={800}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
