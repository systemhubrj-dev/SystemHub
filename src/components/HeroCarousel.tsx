import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight, Check } from "lucide-react";

const SLIDES = [
  {
    gradient: "from-[#0a1628]/75 via-[#0f2d5c]/65 to-[#1a56db]/55",
    glowColor: "rgba(96, 165, 250, 0.25)",
    accent: "#60a5fa",
    badge: "✦ Plano único · Tudo incluso · Sem surpresas",
    animal: "🐕",
    image:
      "https://images.unsplash.com/photo-1769117112485-5a6a22c37226?auto=format&fit=crop&w=1600&q=80",
    socialProof: "7 dias grátis · sem cartão",
    socialProofIcon: "🎁",
    title: "R$ 129,90.\nTudo incluso.",
    subtitle:
      "Agenda, prontuário com IA, financeiro e estoque — num plano só, sem letras miúdas.",
    cta: "Teste grátis por 7 dias",
    stats: [
      { value: "7 dias", label: "grátis" },
      { value: "100%", label: "sem cartão" },
      { value: "∞", label: "pacientes" },
    ],
    features: [
      "Agenda & Prontuário",
      "Receituário digital",
      "IA veterinária",
      "Financeiro completo",
    ],
  },
  {
    gradient: "from-[#160a2e]/75 via-[#3b0f6e]/65 to-[#7c3aed]/55",
    glowColor: "rgba(192, 132, 252, 0.25)",
    accent: "#c084fc",
    badge: "✦ Inteligência Artificial Veterinária",
    animal: "🐈",
    image:
      "https://images.unsplash.com/photo-1526509429168-2e43f01f6b81?auto=format&fit=crop&w=1600&q=80",
    socialProof: "+60 medicamentos no bulário",
    socialProofIcon: "⭐",
    title: "IA que trabalha\npor você.",
    subtitle:
      "Anamnese inteligente, diagnóstico diferencial e bulário com IA — o assistente que não tira férias.",
    cta: "Conhecer a IA agora",
    stats: [
      { value: "24h", label: "disponível" },
      { value: "+12", label: "especialidades" },
      { value: "IA", label: "avançada" },
    ],
    features: [
      "Anamnese automatizada",
      "Diagnóstico diferencial",
      "Bulário inteligente",
      "Assistente 24h",
    ],
  },
  {
    gradient: "from-[#041a0e]/95 via-[#065f2b]/90 to-[#059669]/85",
    glowColor: "rgba(52, 211, 153, 0.25)",
    accent: "#34d399",
    badge: "✦ Gestão financeira completa",
    animal: "🏥",
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=80",
    socialProof: "100% online · sem instalar nada",
    socialProofIcon: "💰",
    title: "Controle total.\nZero planilhas.",
    subtitle:
      "Caixa, contas a pagar, estoque com lotes e validade, relatórios avançados — tudo em tempo real.",
    cta: "Quero o controle completo",
    stats: [
      { value: "100%", label: "automatizado" },
      { value: "0", label: "planilhas" },
      { value: "R$", label: "em dia" },
    ],
    features: [
      "Caixa & financeiro",
      "Estoque com validade",
      "Contas a pagar/receber",
      "Relatórios avançados",
    ],
  },
  {
    gradient: "from-[#080e2e]/95 via-[#0f2261]/90 to-[#1d4ed8]/85",
    glowColor: "rgba(147, 197, 253, 0.25)",
    accent: "#93c5fd",
    badge: "✦ Internação & Multi-veterinários",
    animal: "🐾",
    image:
      "https://images.unsplash.com/photo-1582456891658-fc4fe2e66c78?auto=format&fit=crop&w=1600&q=80",
    socialProof: "Setup em menos de 1 hora",
    socialProofIcon: "⚡",
    title: "Para clínicas\nque não param.",
    subtitle:
      "Internação completa com SOAP, lembretes via WhatsApp e agenda online. Multi-veterinários sem custo extra.",
    cta: "Começar agora mesmo",
    stats: [
      { value: "<1h", label: "para ativar" },
      { value: "∞", label: "vets inclusos" },
      { value: "24h", label: "suporte" },
    ],
    features: [
      "Internação SOAP",
      "Lembretes WhatsApp",
      "Agenda online",
      "Multi-veterinários",
    ],
  },
];

interface HeroCarouselProps {
  user: boolean;
}

export function HeroCarousel({ user }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    timerRef.current = setInterval(() => emblaApi?.scrollNext(), 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [emblaApi]);

  return (
    <div className="relative w-full">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className="relative flex-none w-full"
              style={{ minHeight: "210px" }}
            >
              {/* Background image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image})` }}
              />

              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
              />

              {/* Dot pattern */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                  backgroundSize: "32px 32px",
                }}
              />

              {/* Glow blob */}
              <div
                className="absolute top-0 left-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none -translate-x-1/2"
                style={{ background: slide.glowColor, transform: "translate(-50%, -40%)" }}
              />

              {/* Centered content */}
              <div className="relative container mx-auto px-4 py-5 md:py-6 flex flex-col items-center text-center">

                {/* Social proof + badge in one row */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-white/80 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    {slide.socialProofIcon} {slide.socialProof}
                  </span>
                  <span className="inline-flex items-center bg-white/15 text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase">
                    {slide.badge}
                  </span>
                </div>

                {/* Animal + Title inline */}
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span
                    className="text-4xl select-none leading-none"
                    style={{ filter: `drop-shadow(0 0 20px ${slide.accent}88)` }}
                  >
                    {slide.animal}
                  </span>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight whitespace-pre-line text-left">
                    {slide.title}
                  </h2>
                </div>

                {/* Subtitle */}
                <p className="text-sm text-white/60 leading-relaxed max-w-lg mb-4">
                  {slide.subtitle}
                </p>

                {/* CTA + price + feature pills in one row */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {!user && (
                    <Link to="/register">
                      <Button
                        size="sm"
                        className="bg-white text-primary hover:bg-white/92 font-extrabold shadow-xl gap-1.5 px-5 h-9 text-sm"
                      >
                        {slide.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  {user && (
                    <Link to="/dashboard/meu-plano">
                      <Button size="sm" className="bg-white text-primary hover:bg-white/92 font-extrabold gap-1.5 px-5 h-9">
                        Ver meu plano <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  <span className="text-white font-extrabold text-base">R$ 129,90<span className="text-white/40 font-normal text-xs">/mês</span></span>
                  {slide.features.map((f) => (
                    <span
                      key={f}
                      className="hidden md:inline-flex items-center gap-1 bg-white/10 border border-white/20 text-white text-[11px] font-medium px-2.5 py-1 rounded-full"
                    >
                      <Check className="h-2.5 w-2.5 flex-none" style={{ color: slide.accent }} />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2.5 transition-all backdrop-blur-sm z-10"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2.5 transition-all backdrop-blur-sm z-10"
        aria-label="Próximo"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-white w-8" : "bg-white/40 w-2"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
